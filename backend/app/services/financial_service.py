from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.financial import (
    FinancialCategory,
    FinancialTransaction,
    TransactionType,
    TransactionStatus,
)
from app.models.sale import Sale, SaleItem, SaleStatus
from app.schemas.financial import (
    FinancialCategoryCreate,
    FinancialCategoryUpdate,
    FinancialCategoryResponse,
    FinancialTransactionCreate,
    FinancialTransactionUpdate,
    FinancialTransactionResponse,
    FinancialSummaryResponse,
    PaymentMethodStat,
    CategoryExpenseStat,
    CashFlowPoint,
    DREItem,
)


DEFAULT_CATEGORIES = [
    # Despesas
    {"name": "Insumos & Matérias-Primas", "type": TransactionType.DESPESA, "color": "#8d5b4c"},
    {"name": "Embalagens & Envios", "type": TransactionType.DESPESA, "color": "#c97a63"},
    {"name": "Taxas de Marketplaces (Shopee)", "type": TransactionType.DESPESA, "color": "#ee4d2d"},
    {"name": "Ferramentas & Moldes", "type": TransactionType.DESPESA, "color": "#65594f"},
    {"name": "Infraestrutura (Energia/Internet)", "type": TransactionType.DESPESA, "color": "#4a7c59"},
    {"name": "Marketing & Fotos", "type": TransactionType.DESPESA, "color": "#3b82f6"},
    {"name": "Impostos & Tarifas (MEI/DAS)", "type": TransactionType.DESPESA, "color": "#eab308"},
    {"name": "Pró-Labore & Retiradas", "type": TransactionType.DESPESA, "color": "#8b5cf6"},
    {"name": "Outras Despesas", "type": TransactionType.DESPESA, "color": "#9ca3af"},
    # Receitas
    {"name": "Vendas de Produtos", "type": TransactionType.RECEITA, "color": "#15803d"},
    {"name": "Encomendas Personalizadas", "type": TransactionType.RECEITA, "color": "#0d9488"},
    {"name": "Cursos & Workshops", "type": TransactionType.RECEITA, "color": "#6366f1"},
    {"name": "Outras Receitas", "type": TransactionType.RECEITA, "color": "#6b7280"},
]


class FinancialService:
    @staticmethod
    def seed_default_categories(db: Session) -> None:
        """Cria categorias financeiras padrão caso a tabela esteja vazia."""
        count = db.execute(select(func.count(FinancialCategory.id))).scalar() or 0
        if count == 0:
            for cat_data in DEFAULT_CATEGORIES:
                db.add(FinancialCategory(**cat_data))
            db.commit()

    # --- Categorias ---
    @staticmethod
    def list_categories(
        db: Session,
        type: Optional[TransactionType] = None,
        only_active: bool = True,
    ) -> List[FinancialCategory]:
        FinancialService.seed_default_categories(db)
        query = select(FinancialCategory)
        if only_active:
            query = query.where(FinancialCategory.is_active == True)
        if type:
            query = query.where(FinancialCategory.type == type)
        query = query.order_by(FinancialCategory.name.asc())
        return list(db.execute(query).scalars().all())

    @staticmethod
    def create_category(db: Session, cat_in: FinancialCategoryCreate) -> FinancialCategory:
        existing = db.execute(
            select(FinancialCategory).where(FinancialCategory.name == cat_in.name.strip())
        ).scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma categoria financeira com o nome '{cat_in.name}'.",
            )
        category = FinancialCategory(
            name=cat_in.name.strip(),
            type=cat_in.type,
            color=cat_in.color or "#8d5b4c",
            is_active=cat_in.is_active,
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def update_category(db: Session, cat_id: int, cat_in: FinancialCategoryUpdate) -> FinancialCategory:
        category = db.get(FinancialCategory, cat_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoria financeira não encontrada.",
            )
        if cat_in.name is not None and cat_in.name.strip() != category.name:
            dup = db.execute(
                select(FinancialCategory).where(
                    FinancialCategory.name == cat_in.name.strip(),
                    FinancialCategory.id != cat_id,
                )
            ).scalars().first()
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outra categoria com o nome '{cat_in.name}'.",
                )
            category.name = cat_in.name.strip()
        if cat_in.type is not None:
            category.type = cat_in.type
        if cat_in.color is not None:
            category.color = cat_in.color
        if cat_in.is_active is not None:
            category.is_active = cat_in.is_active

        db.commit()
        db.refresh(category)
        return category

    # --- Transações ---
    @staticmethod
    def list_transactions(
        db: Session,
        type: Optional[TransactionType] = None,
        status_filter: Optional[TransactionStatus] = None,
        category_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[FinancialTransactionResponse]:
        query = select(FinancialTransaction).order_by(
            FinancialTransaction.due_date.desc(), FinancialTransaction.id.desc()
        )
        if type:
            query = query.where(FinancialTransaction.type == type)
        if status_filter:
            query = query.where(FinancialTransaction.status == status_filter)
        if category_id:
            query = query.where(FinancialTransaction.category_id == category_id)
        if start_date:
            query = query.where(FinancialTransaction.due_date >= start_date)
        if end_date:
            query = query.where(FinancialTransaction.due_date <= end_date)
        if search:
            query = query.where(FinancialTransaction.description.ilike(f"%{search}%"))

        transactions = list(db.execute(query.offset(skip).limit(limit)).scalars().all())

        results = []
        for t in transactions:
            results.append(
                FinancialTransactionResponse(
                    id=t.id,
                    description=t.description,
                    type=t.type,
                    category_id=t.category_id,
                    category_name=t.category.name if t.category else None,
                    category_color=t.category.color if t.category else None,
                    amount=t.amount,
                    due_date=t.due_date,
                    payment_date=t.payment_date,
                    status=t.status,
                    payment_method=t.payment_method,
                    reference_type=t.reference_type,
                    reference_id=t.reference_id,
                    notes=t.notes,
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                )
            )
        return results

    @staticmethod
    def create_transaction(
        db: Session,
        trans_in: FinancialTransactionCreate,
        user_id: Optional[int] = None,
    ) -> FinancialTransactionResponse:
        payment_date = trans_in.payment_date
        # Se for marcado como PAGO e não tiver data de pagamento, define hoje
        if trans_in.status == TransactionStatus.PAGO and not payment_date:
            payment_date = date.today()

        trans = FinancialTransaction(
            description=trans_in.description.strip(),
            type=trans_in.type,
            category_id=trans_in.category_id,
            amount=trans_in.amount,
            due_date=trans_in.due_date,
            payment_date=payment_date,
            status=trans_in.status,
            payment_method=trans_in.payment_method,
            reference_type=trans_in.reference_type or "MANUAL",
            reference_id=trans_in.reference_id,
            notes=trans_in.notes,
            created_by_user_id=user_id,
        )
        db.add(trans)
        db.commit()
        db.refresh(trans)

        return FinancialTransactionResponse(
            id=trans.id,
            description=trans.description,
            type=trans.type,
            category_id=trans.category_id,
            category_name=trans.category.name if trans.category else None,
            category_color=trans.category.color if trans.category else None,
            amount=trans.amount,
            due_date=trans.due_date,
            payment_date=trans.payment_date,
            status=trans.status,
            payment_method=trans.payment_method,
            reference_type=trans.reference_type,
            reference_id=trans.reference_id,
            notes=trans.notes,
            created_at=trans.created_at,
            updated_at=trans.updated_at,
        )

    @staticmethod
    def update_transaction(
        db: Session,
        trans_id: int,
        trans_in: FinancialTransactionUpdate,
    ) -> FinancialTransactionResponse:
        trans = db.get(FinancialTransaction, trans_id)
        if not trans:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lançamento financeiro não encontrado.",
            )

        if trans_in.description is not None:
            trans.description = trans_in.description.strip()
        if trans_in.type is not None:
            trans.type = trans_in.type
        if trans_in.category_id is not None:
            trans.category_id = trans_in.category_id
        if trans_in.amount is not None:
            trans.amount = trans_in.amount
        if trans_in.due_date is not None:
            trans.due_date = trans_in.due_date
        if trans_in.payment_date is not None:
            trans.payment_date = trans_in.payment_date
        if trans_in.status is not None:
            trans.status = trans_in.status
            if trans.status == TransactionStatus.PAGO and not trans.payment_date:
                trans.payment_date = date.today()
        if trans_in.payment_method is not None:
            trans.payment_method = trans_in.payment_method
        if trans_in.notes is not None:
            trans.notes = trans_in.notes

        db.commit()
        db.refresh(trans)

        return FinancialTransactionResponse(
            id=trans.id,
            description=trans.description,
            type=trans.type,
            category_id=trans.category_id,
            category_name=trans.category.name if trans.category else None,
            category_color=trans.category.color if trans.category else None,
            amount=trans.amount,
            due_date=trans.due_date,
            payment_date=trans.payment_date,
            status=trans.status,
            payment_method=trans.payment_method,
            reference_type=trans.reference_type,
            reference_id=trans.reference_id,
            notes=trans.notes,
            created_at=trans.created_at,
            updated_at=trans.updated_at,
        )

    @staticmethod
    def toggle_status(
        db: Session,
        trans_id: int,
        target_status: TransactionStatus,
        payment_date: Optional[date] = None,
    ) -> FinancialTransactionResponse:
        trans = db.get(FinancialTransaction, trans_id)
        if not trans:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lançamento financeiro não encontrado.",
            )
        trans.status = target_status
        if target_status == TransactionStatus.PAGO:
            trans.payment_date = payment_date or date.today()
        elif target_status == TransactionStatus.PENDENTE:
            trans.payment_date = None

        db.commit()
        db.refresh(trans)

        return FinancialTransactionResponse(
            id=trans.id,
            description=trans.description,
            type=trans.type,
            category_id=trans.category_id,
            category_name=trans.category.name if trans.category else None,
            category_color=trans.category.color if trans.category else None,
            amount=trans.amount,
            due_date=trans.due_date,
            payment_date=trans.payment_date,
            status=trans.status,
            payment_method=trans.payment_method,
            reference_type=trans.reference_type,
            reference_id=trans.reference_id,
            notes=trans.notes,
            created_at=trans.created_at,
            updated_at=trans.updated_at,
        )

    @staticmethod
    def delete_transaction(db: Session, trans_id: int) -> None:
        trans = db.get(FinancialTransaction, trans_id)
        if not trans:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lançamento financeiro não encontrado.",
            )
        db.delete(trans)
        db.commit()

    # --- Resumo Financeiro, DRE e Fluxo de Caixa ---
    @staticmethod
    def get_summary(
        db: Session,
        start_date: date,
        end_date: date,
    ) -> FinancialSummaryResponse:
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())
        today = date.today()

        # 1. Vendas confirmadas no período
        sales_query = select(Sale).where(
            Sale.status == SaleStatus.CONFIRMADA,
            or_(
                and_(Sale.confirmed_at >= start_dt, Sale.confirmed_at <= end_dt),
                and_(Sale.confirmed_at.is_(None), Sale.created_at >= start_dt, Sale.created_at <= end_dt),
            ),
        )
        sales = list(db.execute(sales_query).scalars().all())

        sales_revenue = Decimal("0.00")
        total_cpv = Decimal("0.00")
        payment_methods_map: Dict[str, Dict[str, Any]] = {}

        for s in sales:
            amt = Decimal(str(s.total_amount or "0.00"))
            sales_revenue += amt

            pm = (s.payment_method or "Não Informado").strip()
            if pm not in payment_methods_map:
                payment_methods_map[pm] = {"amount": Decimal("0.00"), "count": 0}
            payment_methods_map[pm]["amount"] += amt
            payment_methods_map[pm]["count"] += 1

            for item in s.items:
                qty = Decimal(str(item.quantity or "0.00"))
                cost = Decimal(str(item.unit_cost_snapshot or "0.00"))
                total_cpv += qty * cost

        # 2. Transações manuais (Receitas e Despesas)
        trans_query = select(FinancialTransaction).where(
            FinancialTransaction.due_date >= start_date,
            FinancialTransaction.due_date <= end_date,
        )
        transactions = list(db.execute(trans_query).scalars().all())

        manual_revenue = Decimal("0.00")
        paid_expenses = Decimal("0.00")
        pending_expenses = Decimal("0.00")
        overdue_expenses = Decimal("0.00")
        expenses_by_cat: Dict[str, Dict[str, Any]] = {}
        daily_map: Dict[str, Dict[str, Decimal]] = {}

        # Inicializa dias do período para fluxo contínuo
        curr = start_date
        while curr <= end_date:
            d_str = curr.strftime("%Y-%m-%d")
            daily_map[d_str] = {"income": Decimal("0.00"), "expense": Decimal("0.00")}
            curr += timedelta(days=1)

        # Adiciona vendas no fluxo diário
        for s in sales:
            sale_date = (s.confirmed_at or s.created_at).strftime("%Y-%m-%d")
            if sale_date in daily_map:
                daily_map[sale_date]["income"] += Decimal(str(s.total_amount or "0.00"))

        expenses_count = 0
        for t in transactions:
            t_amt = Decimal(str(t.amount or "0.00"))
            t_due = t.due_date.strftime("%Y-%m-%d")

            if t.type == TransactionType.RECEITA:
                if t.status == TransactionStatus.PAGO:
                    manual_revenue += t_amt
                    if t_due in daily_map:
                        daily_map[t_due]["income"] += t_amt
                    pm = (t.payment_method or "Outros").strip()
                    if pm not in payment_methods_map:
                        payment_methods_map[pm] = {"amount": Decimal("0.00"), "count": 0}
                    payment_methods_map[pm]["amount"] += t_amt
                    payment_methods_map[pm]["count"] += 1
            elif t.type == TransactionType.DESPESA:
                expenses_count += 1
                if t.status == TransactionStatus.PAGO:
                    paid_expenses += t_amt
                    pay_str = (t.payment_date or t.due_date).strftime("%Y-%m-%d")
                    if pay_str in daily_map:
                        daily_map[pay_str]["expense"] += t_amt
                elif t.status == TransactionStatus.PENDENTE:
                    pending_expenses += t_amt
                    if t.due_date < today:
                        overdue_expenses += t_amt

                # Agrupamento por categoria de despesa (considera todas exceto canceladas)
                if t.status != TransactionStatus.CANCELADO:
                    cat_name = t.category.name if t.category else "Sem Categoria"
                    cat_color = t.category.color if t.category else "#8d5b4c"
                    if cat_name not in expenses_by_cat:
                        expenses_by_cat[cat_name] = {"amount": Decimal("0.00"), "color": cat_color}
                    expenses_by_cat[cat_name]["amount"] += t_amt

        total_revenue = sales_revenue + manual_revenue
        gross_profit = total_revenue - total_cpv
        gross_margin_pct = float(round((gross_profit / total_revenue) * 100, 1)) if total_revenue > 0 else 0.0

        net_profit = gross_profit - paid_expenses
        net_margin_pct = float(round((net_profit / total_revenue) * 100, 1)) if total_revenue > 0 else 0.0

        # Montagem dos percentuais de pagamento
        by_payment_method: List[PaymentMethodStat] = []
        for method, data in payment_methods_map.items():
            pct = float(round((data["amount"] / total_revenue) * 100, 1)) if total_revenue > 0 else 0.0
            by_payment_method.append(
                PaymentMethodStat(
                    method=method,
                    amount=data["amount"],
                    count=data["count"],
                    percentage=pct,
                )
            )
        by_payment_method.sort(key=lambda x: x.amount, reverse=True)

        # Montagem das categorias de despesas
        total_exp_group = sum((d["amount"] for d in expenses_by_cat.values()), Decimal("0.00"))
        top_expense_categories: List[CategoryExpenseStat] = []
        for cname, d in expenses_by_cat.items():
            pct = float(round((d["amount"] / total_exp_group) * 100, 1)) if total_exp_group > 0 else 0.0
            top_expense_categories.append(
                CategoryExpenseStat(
                    category_name=cname,
                    color=d["color"],
                    amount=d["amount"],
                    percentage=pct,
                )
            )
        top_expense_categories.sort(key=lambda x: x.amount, reverse=True)

        # Montagem do fluxo diário
        daily_cash_flow: List[CashFlowPoint] = []
        for d_str, vals in sorted(daily_map.items()):
            daily_cash_flow.append(
                CashFlowPoint(
                    date=d_str,
                    income=vals["income"],
                    expense=vals["expense"],
                    net=vals["income"] - vals["expense"],
                )
            )

        # DRE Gerencial
        dre_items: List[DREItem] = [
            DREItem(
                code="1.0",
                label="Receita Bruta de Vendas (Pedidos Confirmados)",
                amount=sales_revenue,
                percentage=float(round((sales_revenue / total_revenue) * 100, 1)) if total_revenue > 0 else 0.0,
            ),
            DREItem(
                code="1.1",
                label="Outras Receitas Operacionais",
                amount=manual_revenue,
                percentage=float(round((manual_revenue / total_revenue) * 100, 1)) if total_revenue > 0 else 0.0,
            ),
            DREItem(
                code="(=)",
                label="RECEITA BRUTA TOTAL",
                amount=total_revenue,
                percentage=100.0 if total_revenue > 0 else 0.0,
                is_total=True,
            ),
            DREItem(
                code="2.0",
                label="(-) Custo das Matérias-Primas e Embalagens Vendidas (CPV)",
                amount=total_cpv,
                percentage=float(round((total_cpv / total_revenue) * 100, 1)) if total_revenue > 0 else 0.0,
                is_negative=True,
            ),
            DREItem(
                code="(=)",
                label="LUCRO BRUTO / MARGEM DE CONTRIBUIÇÃO",
                amount=gross_profit,
                percentage=gross_margin_pct,
                is_total=True,
            ),
            DREItem(
                code="3.0",
                label="(-) Despesas Operacionais Realizadas",
                amount=paid_expenses,
                percentage=float(round((paid_expenses / total_revenue) * 100, 1)) if total_revenue > 0 else 0.0,
                is_negative=True,
            ),
            DREItem(
                code="(=)",
                label="LUCRO LÍQUIDO DO PERÍODO",
                amount=net_profit,
                percentage=net_margin_pct,
                is_total=True,
            ),
        ]

        return FinancialSummaryResponse(
            start_date=start_date.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d"),
            sales_revenue=sales_revenue,
            manual_revenue=manual_revenue,
            total_revenue=total_revenue,
            total_cpv=total_cpv,
            gross_profit=gross_profit,
            gross_margin_pct=gross_margin_pct,
            paid_expenses=paid_expenses,
            pending_expenses=pending_expenses,
            overdue_expenses=overdue_expenses,
            net_profit=net_profit,
            net_margin_pct=net_margin_pct,
            sales_count=len(sales),
            expenses_count=expenses_count,
            by_payment_method=by_payment_method,
            top_expense_categories=top_expense_categories,
            daily_cash_flow=daily_cash_flow,
            dre_items=dre_items,
        )


financial_service = FinancialService()
