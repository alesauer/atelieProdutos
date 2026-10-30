from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.product import Product
from app.models.stock import StockMovement, MovementType
from app.schemas.stock import StockBalanceResponse, StockMovementResponse


class StockService:
    @staticmethod
    def get_product_balance(db: Session, product_id: int) -> Decimal:
        """Calcula o saldo atual em estoque com base no somatório das movimentações imutáveis."""
        stmt = select(func.coalesce(func.sum(StockMovement.quantity), Decimal("0.000"))).where(
            StockMovement.product_id == product_id
        )
        balance = db.execute(stmt).scalar()
        return Decimal(str(balance)) if balance is not None else Decimal("0.000")

    @staticmethod
    def validate_available_stock(
        db: Session, product_id: int, required_quantity: Decimal, product_name: Optional[str] = None
    ) -> Decimal:
        """Garante que há saldo disponível, prevenindo saldo negativo."""
        current_balance = StockService.get_product_balance(db, product_id)
        if current_balance < required_quantity:
            name_str = f"'{product_name}' " if product_name else f"ID {product_id} "
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Saldo insuficiente para o item {name_str}(Saldo atual: {current_balance}, Requerido: {required_quantity}). Operação bloqueada para evitar saldo negativo.",
            )
        return current_balance

    @staticmethod
    def create_movement(
        db: Session,
        product_id: int,
        movement_type: MovementType,
        quantity: Decimal,
        unit_cost_at_moment: Optional[Decimal] = None,
        user_id: Optional[int] = None,
        justification: Optional[str] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[int] = None,
    ) -> StockMovement:
        """
        Cria registro imutável no livro-razão de movimentações.
        Previne saldo negativo em saídas de estoque.
        """
        product = db.get(Product, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto ID {product_id} não encontrado.",
            )

        # Se for saída (quantidade negativa), validar saldo
        if quantity < 0:
            required = abs(quantity)
            StockService.validate_available_stock(db, product_id, required, product.name)

        # Se custo não for informado explicitamente, usa a fotografia do custo cadastrado
        cost = unit_cost_at_moment if unit_cost_at_moment is not None else product.unit_cost

        movement = StockMovement(
            product_id=product_id,
            movement_type=movement_type,
            quantity=quantity,
            unit_cost_at_moment=cost,
            user_id=user_id,
            justification=justification,
            reference_type=reference_type,
            reference_id=reference_id,
        )
        db.add(movement)
        return movement

    @staticmethod
    def create_adjustment(
        db: Session,
        product_id: int,
        delta: Decimal,
        justification: str,
        user_id: Optional[int] = None,
    ) -> StockMovement:
        """Realiza ajuste manual de inventário exigindo justificativa obrigatória."""
        if not justification or len(justification.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A justificativa é obrigatória para qualquer ajuste manual de inventário.",
            )

        movement = StockService.create_movement(
            db,
            product_id=product_id,
            movement_type=MovementType.AJUSTE_INVENTARIO,
            quantity=delta,
            user_id=user_id,
            justification=justification.strip(),
            reference_type="MANUAL_ADJUSTMENT",
        )
        db.commit()
        db.refresh(movement)
        return movement

    @staticmethod
    def create_entry(
        db: Session,
        product_id: int,
        quantity: Decimal,
        unit_cost: Optional[Decimal] = None,
        justification: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> StockMovement:
        """Registra entrada avulsa por compra ou recebimento de insumos."""
        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A quantidade para entrada de estoque deve ser maior que zero.",
            )

        product = db.get(Product, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto não encontrado.",
            )

        # Atualiza o custo unitário fixo cadastrado se informado um novo
        if unit_cost is not None and unit_cost >= 0:
            product.unit_cost = unit_cost

        movement = StockService.create_movement(
            db,
            product_id=product_id,
            movement_type=MovementType.COMPRA,
            quantity=quantity,
            unit_cost_at_moment=unit_cost,
            user_id=user_id,
            justification=justification,
            reference_type="PURCHASE_ENTRY",
        )
        db.commit()
        db.refresh(movement)
        return movement

    @staticmethod
    def list_movements(
        db: Session,
        product_id: Optional[int] = None,
        movement_type: Optional[MovementType] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[StockMovementResponse]:
        stmt = select(StockMovement)
        if product_id:
            stmt = stmt.where(StockMovement.product_id == product_id)
        if movement_type:
            stmt = stmt.where(StockMovement.movement_type == movement_type)

        movements = list(
            db.execute(stmt.order_by(StockMovement.created_at.desc()).offset(skip).limit(limit)).scalars().all()
        )

        results = []
        for m in movements:
            resp = StockMovementResponse.model_validate(m)
            if m.product:
                resp.product_name = m.product.name
                resp.product_sku = m.product.sku
                resp.product_color = m.product.color
                resp.product_variation_name = m.product.variation_name
            if m.user:
                resp.user_name = m.user.full_name
            results.append(resp)
        return results

    @staticmethod
    def list_balances(db: Session) -> List[StockBalanceResponse]:
        """Calcula o saldo consolidado de todos os itens ativos."""
        try:
            from app.services.production_service import production_service
            production_service.auto_create_draft_orders_for_low_stock(db)
        except Exception:
            pass

        products = list(db.execute(select(Product).order_by(Product.name)).scalars().all())

        balances: List[StockBalanceResponse] = []
        for p in products:
            # Se for produto Pai com variações, não o exibimos no saldo físico de estoque,
            # pois o estoque real é gerenciado nas variações filhas.
            # Isso evita que o produto pai e suas variações pareçam duplicados na listagem de estoque.
            if p.variations and len(p.variations) > 0:
                continue

            curr_stock = round(StockService.get_product_balance(db, p.id), 2)
            # Regra de estoque mínimo padronizada em 5 peças para Alerta de Produção
            min_stock = Decimal("5.00")
            unit_cost = round(Decimal(str(p.unit_cost)), 2)

            is_zero = curr_stock <= Decimal("0.00")
            is_low = curr_stock <= Decimal("5.00") and not is_zero
            est_value = round(curr_stock * unit_cost, 2) if curr_stock > 0 else Decimal("0.00")

            has_vars = False
            vars_count = 0

            balances.append(
                StockBalanceResponse(
                    product_id=p.id,
                    sku=p.sku,
                    name=p.name,
                    item_type=p.item_type,
                    category_name=p.category.name if p.category else None,
                    unit_code=p.unit.code if p.unit else "UN",
                    current_stock=curr_stock,
                    min_stock=min_stock,
                    is_low_stock=is_low,
                    is_zero_stock=is_zero,
                    unit_cost=unit_cost,
                    estimated_total_value=est_value,
                    parent_id=p.parent_id,
                    has_variations=has_vars,
                    variations_count=vars_count,
                    variation_name=p.variation_name,
                    color=p.color,
                    size=p.size,
                )
            )
        return balances


stock_service = StockService()
