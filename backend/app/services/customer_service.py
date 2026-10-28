from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, or_, desc, asc
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.sale import Customer, Sale, SaleItem, SaleStatus
from app.models.product import Product
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerDetailResponse,
    CustomerSaleSummary,
    CustomerStatsResponse,
)


class CustomerService:
    @staticmethod
    def _compute_customer_metrics(db: Session, customer_ids: List[int]) -> Dict[int, Dict[str, Any]]:
        """Calcula LTV, quantidade de compras e data da última compra confirmada em lote."""
        if not customer_ids:
            return {}

        # Busca vendas confirmadas agrupadas por customer_id
        stmt = (
            select(
                Sale.customer_id,
                func.coalesce(func.sum(Sale.total_amount), 0).label("total_spent"),
                func.count(Sale.id).label("sales_count"),
                func.max(Sale.created_at).label("last_purchase_date"),
            )
            .where(
                Sale.customer_id.in_(customer_ids),
                Sale.status == SaleStatus.CONFIRMADA,
            )
            .group_by(Sale.customer_id)
        )

        results = db.execute(stmt).all()
        metrics: Dict[int, Dict[str, Any]] = {}
        for row in results:
            metrics[row.customer_id] = {
                "total_spent": Decimal(str(row.total_spent or 0)),
                "sales_count": int(row.sales_count or 0),
                "last_purchase_date": row.last_purchase_date,
            }
        return metrics

    @staticmethod
    def list_customers(
        db: Session,
        search: Optional[str] = None,
        origin_channel: Optional[str] = None,
        tag: Optional[str] = None,
        active_only: bool = False,
        order_by: str = "name",
    ) -> List[CustomerResponse]:
        """Lista clientes com filtros e métricas de compras agregadas."""
        stmt = select(Customer)

        if active_only:
            stmt = stmt.where(Customer.is_active.is_(True))

        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Customer.name).ilike(term),
                    func.lower(Customer.nickname).ilike(term),
                    func.lower(Customer.email).ilike(term),
                    Customer.phone.ilike(term),
                    func.lower(Customer.city).ilike(term),
                    func.lower(Customer.document).ilike(term),
                    func.lower(Customer.tags).ilike(term),
                )
            )

        if origin_channel and origin_channel != "TODOS":
            stmt = stmt.where(Customer.origin_channel == origin_channel)

        if tag and tag != "TODAS":
            stmt = stmt.where(Customer.tags.ilike(f"%{tag.strip()}%"))

        # Ordenação inicial no banco
        if order_by == "recent":
            stmt = stmt.order_by(desc(Customer.created_at))
        else:
            stmt = stmt.order_by(asc(Customer.name))

        customers = list(db.execute(stmt).scalars().all())
        if not customers:
            return []

        # Calcula métricas em lote
        cust_ids = [c.id for c in customers]
        metrics_map = CustomerService._compute_customer_metrics(db, cust_ids)

        output: List[CustomerResponse] = []
        for c in customers:
            m = metrics_map.get(c.id, {"total_spent": Decimal("0.00"), "sales_count": 0, "last_purchase_date": None})
            resp = CustomerResponse(
                id=c.id,
                name=c.name,
                nickname=c.nickname,
                email=c.email,
                phone=c.phone,
                document=c.document,
                city=c.city,
                state=c.state,
                zip_code=c.zip_code,
                address_line=c.address_line,
                neighborhood=c.neighborhood,
                birth_date=c.birth_date,
                origin_channel=c.origin_channel,
                tags=c.tags,
                notes=c.notes,
                is_active=c.is_active,
                created_at=c.created_at,
                updated_at=c.updated_at,
                total_spent=m["total_spent"],
                sales_count=m["sales_count"],
                last_purchase_date=m["last_purchase_date"],
            )
            output.append(resp)

        # Se a ordenação solicitada for por LTV (maior valor gasto)
        if order_by == "ltv":
            output.sort(key=lambda x: x.total_spent, reverse=True)

        return output

    @staticmethod
    def get_customer_by_id(db: Session, customer_id: int) -> Optional[Customer]:
        return db.get(Customer, customer_id)

    @staticmethod
    def get_customer_detail(db: Session, customer_id: int) -> CustomerDetailResponse:
        """Retorna ficha completa do cliente com histórico de vendas e itens."""
        customer = db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado.",
            )

        metrics_map = CustomerService._compute_customer_metrics(db, [customer.id])
        m = metrics_map.get(customer.id, {"total_spent": Decimal("0.00"), "sales_count": 0, "last_purchase_date": None})

        # Busca vendas recentes do cliente
        sales_stmt = (
            select(Sale)
            .where(Sale.customer_id == customer.id)
            .order_by(desc(Sale.created_at))
            .limit(50)
        )
        sales = list(db.execute(sales_stmt).scalars().all())

        recent_sales: List[CustomerSaleSummary] = []
        for s in sales:
            # Resumo de itens
            item_names: List[str] = []
            for it in s.items:
                prod = db.get(Product, it.product_id)
                pname = prod.name if prod else f"Item #{it.product_id}"
                item_names.append(f"{it.quantity:g}x {pname}")

            items_preview = ", ".join(item_names[:3])
            if len(item_names) > 3:
                items_preview += f" (+{len(item_names) - 3} itens)"

            recent_sales.append(
                CustomerSaleSummary(
                    id=s.id,
                    sale_number=s.sale_number,
                    status=s.status.value if hasattr(s.status, "value") else str(s.status),
                    total_amount=s.total_amount,
                    payment_method=s.payment_method,
                    created_at=s.created_at,
                    items_count=len(s.items),
                    items_preview=items_preview or "Sem itens",
                )
            )

        return CustomerDetailResponse(
            id=customer.id,
            name=customer.name,
            nickname=customer.nickname,
            email=customer.email,
            phone=customer.phone,
            document=customer.document,
            city=customer.city,
            state=customer.state,
            zip_code=customer.zip_code,
            address_line=customer.address_line,
            neighborhood=customer.neighborhood,
            birth_date=customer.birth_date,
            origin_channel=customer.origin_channel,
            tags=customer.tags,
            notes=customer.notes,
            is_active=customer.is_active,
            created_at=customer.created_at,
            updated_at=customer.updated_at,
            total_spent=m["total_spent"],
            sales_count=m["sales_count"],
            last_purchase_date=m["last_purchase_date"],
            recent_sales=recent_sales,
        )

    @staticmethod
    def create_customer(db: Session, customer_in: CustomerCreate) -> CustomerResponse:
        """Cadastra um novo cliente."""
        name_clean = customer_in.name.strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O nome do cliente é obrigatório.",
            )

        now = datetime.now(timezone.utc)
        customer = Customer(
            name=name_clean,
            nickname=customer_in.nickname.strip() if customer_in.nickname else None,
            email=customer_in.email,
            phone=customer_in.phone.strip() if customer_in.phone else None,
            document=customer_in.document.strip() if customer_in.document else None,
            city=customer_in.city.strip() if customer_in.city else None,
            state=customer_in.state.strip().upper() if customer_in.state else None,
            zip_code=customer_in.zip_code.strip() if customer_in.zip_code else None,
            address_line=customer_in.address_line.strip() if customer_in.address_line else None,
            neighborhood=customer_in.neighborhood.strip() if customer_in.neighborhood else None,
            birth_date=customer_in.birth_date.strip() if customer_in.birth_date else None,
            origin_channel=customer_in.origin_channel.strip() if customer_in.origin_channel else None,
            tags=customer_in.tags.strip() if customer_in.tags else None,
            notes=customer_in.notes.strip() if customer_in.notes else None,
            is_active=customer_in.is_active,
            created_at=now,
            updated_at=now,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

        return CustomerResponse.model_validate(customer)

    @staticmethod
    def update_customer(db: Session, customer_id: int, customer_in: CustomerUpdate) -> CustomerResponse:
        """Atualiza dados cadastrais de um cliente."""
        customer = db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado.",
            )

        data = customer_in.model_dump(exclude_unset=True)
        for key, value in data.items():
            if isinstance(value, str):
                value = value.strip() or None
            setattr(customer, key, value)

        customer.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(customer)

        # Carrega métricas para o retorno
        metrics_map = CustomerService._compute_customer_metrics(db, [customer.id])
        m = metrics_map.get(customer.id, {"total_spent": Decimal("0.00"), "sales_count": 0, "last_purchase_date": None})

        resp = CustomerResponse.model_validate(customer)
        resp.total_spent = m["total_spent"]
        resp.sales_count = m["sales_count"]
        resp.last_purchase_date = m["last_purchase_date"]
        return resp

    @staticmethod
    def delete_customer(db: Session, customer_id: int) -> None:
        """Exclui cliente ou inativa se houver vendas vinculadas (preserva integridade contábil)."""
        customer = db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado.",
            )

        # Verifica se possui vendas atreladas
        sales_count = db.execute(
            select(func.count(Sale.id)).where(Sale.customer_id == customer.id)
        ).scalar() or 0

        if sales_count > 0:
            # Preserva histórico: inativa o cliente
            customer.is_active = False
            customer.updated_at = datetime.now(timezone.utc)
            db.commit()
        else:
            db.delete(customer)
            db.commit()

    @staticmethod
    def get_customer_stats(db: Session) -> CustomerStatsResponse:
        """Calcula estatísticas agregadas de toda a carteira de clientes do ateliê."""
        total_customers = db.execute(select(func.count(Customer.id))).scalar() or 0
        active_customers = db.execute(
            select(func.count(Customer.id)).where(Customer.is_active.is_(True))
        ).scalar() or 0

        # Vendas confirmadas com cliente vinculado
        confirmed_sales_stmt = select(
            func.coalesce(func.sum(Sale.total_amount), 0).label("revenue"),
            func.count(Sale.id).label("sales_count"),
        ).where(
            Sale.customer_id.is_not(None),
            Sale.status == SaleStatus.CONFIRMADA,
        )
        sales_res = db.execute(confirmed_sales_stmt).first()
        total_revenue = Decimal(str(sales_res.revenue if sales_res else 0))
        sales_count = int(sales_res.sales_count if sales_res else 0)

        # Clientes recorrentes (mais de 1 venda confirmada)
        recurring_subq = (
            select(Sale.customer_id)
            .where(
                Sale.customer_id.is_not(None),
                Sale.status == SaleStatus.CONFIRMADA,
            )
            .group_by(Sale.customer_id)
            .having(func.count(Sale.id) > 1)
            .subquery()
        )
        recurring_count = db.execute(select(func.count()).select_from(recurring_subq)).scalar() or 0

        average_ticket = Decimal("0.00")
        if sales_count > 0:
            average_ticket = (total_revenue / sales_count).quantize(Decimal("0.01"))

        return CustomerStatsResponse(
            total_customers=total_customers,
            active_customers=active_customers,
            recurring_customers=recurring_count,
            total_revenue_from_customers=total_revenue,
            average_ticket=average_ticket,
        )


customer_service = CustomerService()
