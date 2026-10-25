from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
import uuid
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.product import Product
from app.models.stock import MovementType
from app.models.sale import Customer, Sale, SaleItem, SaleStatus
from app.schemas.sale import CustomerCreate, CustomerUpdate, SaleCreate, SaleUpdate
from app.services.stock_service import stock_service


class SaleService:
    # --- Clientes ---
    @staticmethod
    def create_customer(db: Session, customer_in: CustomerCreate) -> Customer:
        customer = Customer(
            name=customer_in.name.strip(),
            email=customer_in.email,
            phone=customer_in.phone,
            document=customer_in.document,
            notes=customer_in.notes,
            is_active=customer_in.is_active,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def list_customers(db: Session, search: Optional[str] = None) -> List[Customer]:
        stmt = select(Customer)
        if search:
            stmt = stmt.where(Customer.name.ilike(f"%{search.strip()}%"))
        return list(db.execute(stmt.order_by(Customer.name)).scalars().all())

    @staticmethod
    def get_customer_by_id(db: Session, customer_id: int) -> Optional[Customer]:
        return db.get(Customer, customer_id)

    # --- Vendas ---
    @staticmethod
    def create_draft_sale(
        db: Session, sale_in: SaleCreate, user_id: Optional[int] = None
    ) -> Sale:
        """Cria registro de venda em modo RASCUNHO (não baixa estoque)."""
        if not sale_in.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A venda deve conter pelo menos um item.",
            )

        now = datetime.now(timezone.utc)
        sale_number = f"VD-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        total_amount = Decimal("0.00")
        sale_items_to_add = []

        for it in sale_in.items:
            product = db.get(Product, it.product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Produto ID {it.product_id} não encontrado.",
                )

            item_total = it.quantity * it.unit_price
            total_amount += item_total

            sale_item = SaleItem(
                product_id=it.product_id,
                quantity=it.quantity,
                unit_price=it.unit_price,
                total_price=item_total,
                unit_cost_snapshot=product.unit_cost,
            )
            sale_items_to_add.append(sale_item)

        sale = Sale(
            sale_number=sale_number,
            customer_id=sale_in.customer_id,
            status=SaleStatus.RASCUNHO,
            total_amount=total_amount,
            notes=sale_in.notes,
            created_by_user_id=user_id,
        )
        db.add(sale)
        db.flush()

        for s_item in sale_items_to_add:
            s_item.sale_id = sale.id
            db.add(s_item)

        db.commit()
        db.refresh(sale)
        return sale

    @staticmethod
    def confirm_sale(db: Session, sale_id: int, user_id: Optional[int] = None) -> Sale:
        """
        Confirma a venda em TRANSAÇÃO ATÔMICA:
        1. Valida saldo disponível de TODOS os produtos da venda.
        2. Debita estoque de cada item com registro rastreável.
        3. Atualiza status para CONFIRMADA.
        4. Falha atomicamente se algum saldo for insuficiente.
        """
        sale = db.get(Sale, sale_id)
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Venda não encontrada.",
            )

        if sale.status != SaleStatus.RASCUNHO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível confirmar uma venda com status '{sale.status.value}'.",
            )

        # 1. Validação de saldos
        for it in sale.items:
            stock_service.validate_available_stock(
                db, it.product_id, it.quantity, it.product.name if it.product else None
            )

        # 2. Baixa de estoque
        for it in sale.items:
            stock_service.create_movement(
                db,
                product_id=it.product_id,
                movement_type=MovementType.VENDA,
                quantity=-it.quantity,
                unit_cost_at_moment=it.unit_cost_snapshot,
                user_id=user_id,
                justification=f"Baixa por venda confirmada {sale.sale_number}",
                reference_type="SALE",
                reference_id=sale.id,
            )

        sale.status = SaleStatus.CONFIRMADA
        sale.confirmed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(sale)
        return sale

    @staticmethod
    def cancel_sale(db: Session, sale_id: int, user_id: Optional[int] = None) -> Sale:
        """
        Cancela venda:
        - Se Rascunho, apenas marca CANCELADA.
        - Se Confirmada, estorna os itens de volta ao estoque via movimentações de reversão rastreáveis.
        """
        sale = db.get(Sale, sale_id)
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Venda não encontrada.",
            )

        if sale.status == SaleStatus.CANCELADA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta venda já está cancelada.",
            )

        if sale.status == SaleStatus.CONFIRMADA:
            # Estorna cada item devolvendo ao estoque
            for it in sale.items:
                stock_service.create_movement(
                    db,
                    product_id=it.product_id,
                    movement_type=MovementType.REVERSAO_CANCELAMENTO,
                    quantity=it.quantity,
                    unit_cost_at_moment=it.unit_cost_snapshot,
                    user_id=user_id,
                    justification=f"Estorno por cancelamento da venda {sale.sale_number}",
                    reference_type="SALE_CANCEL",
                    reference_id=sale.id,
                )

        sale.status = SaleStatus.CANCELADA
        sale.cancelled_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(sale)
        return sale

    @staticmethod
    def list_sales(db: Session, skip: int = 0, limit: int = 100) -> List[Sale]:
        stmt = select(Sale).order_by(Sale.created_at.desc()).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_sale_by_id(db: Session, sale_id: int) -> Optional[Sale]:
        return db.get(Sale, sale_id)

    @staticmethod
    def delete_customer(db: Session, customer_id: int) -> None:
        customer = SaleService.get_customer_by_id(db, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado.",
            )
        sales_count = db.execute(
            select(func.count(Sale.id)).where(Sale.customer_id == customer_id)
        ).scalar() or 0
        if sales_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível excluir o cliente '{customer.name}' pois existem {sales_count} venda(s) associada(s) a ele.",
            )
        db.delete(customer)
        db.commit()

    @staticmethod
    def delete_sale(db: Session, sale_id: int) -> None:
        sale = SaleService.get_sale_by_id(db, sale_id)
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Venda não encontrada.",
            )
        if sale.status == SaleStatus.CONFIRMADA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta venda está confirmada com baixa no estoque. Cancele a venda primeiro para estornar os produtos ao estoque antes de excluí-la.",
            )
        db.delete(sale)
        db.commit()


sale_service = SaleService()
