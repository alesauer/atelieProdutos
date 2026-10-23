from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.product import Product, ItemType
from app.models.stock import MovementType
from app.models.production import (
    ProductionRecipe,
    ProductionRecipeItem,
    ProductionOrder,
    ProductionOrderItem,
    ProductionOrderStatus,
)
from app.schemas.production import (
    RecipeCreate,
    ProductionOrderCreate,
    ProductionOrderUpdate,
)
from app.services.stock_service import stock_service


class ProductionService:
    # --- Fichas Técnicas (BOM) ---
    @staticmethod
    def create_recipe(db: Session, recipe_in: RecipeCreate) -> ProductionRecipe:
        product = db.get(Product, recipe_in.product_id)
        if not product or product.item_type != ItemType.PRODUTO_ACABADO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uma ficha técnica só pode ser vinculada a um Produto Acabado.",
            )

        existing = db.execute(
            select(ProductionRecipe).where(ProductionRecipe.product_id == recipe_in.product_id)
        ).scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O produto '{product.name}' já possui uma ficha técnica cadastrada.",
            )

        recipe = ProductionRecipe(
            product_id=recipe_in.product_id,
            name=recipe_in.name.strip(),
            yield_quantity=recipe_in.yield_quantity,
            instructions=recipe_in.instructions,
            is_active=True,
        )
        db.add(recipe)
        db.flush()

        for item in recipe_in.items:
            comp = db.get(Product, item.component_product_id)
            if not comp:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insumo ID {item.component_product_id} não encontrado.",
                )
            recipe_item = ProductionRecipeItem(
                recipe_id=recipe.id,
                component_product_id=item.component_product_id,
                standard_quantity=item.standard_quantity,
            )
            db.add(recipe_item)

        db.commit()
        db.refresh(recipe)
        return recipe

    @staticmethod
    def get_recipe_by_id(db: Session, recipe_id: int) -> Optional[ProductionRecipe]:
        return db.get(ProductionRecipe, recipe_id)

    @staticmethod
    def get_recipe_by_product_id(db: Session, product_id: int) -> Optional[ProductionRecipe]:
        return db.execute(
            select(ProductionRecipe).where(ProductionRecipe.product_id == product_id)
        ).scalars().first()

    @staticmethod
    def list_recipes(db: Session) -> List[ProductionRecipe]:
        return list(db.execute(select(ProductionRecipe).order_by(ProductionRecipe.name)).scalars().all())

    # --- Ordens de Produção ---
    @staticmethod
    def create_draft_order(
        db: Session, order_in: ProductionOrderCreate, user_id: Optional[int] = None
    ) -> ProductionOrder:
        """Cria ordem de produção em modo RASCUNHO (não altera o estoque físico)."""
        product = db.get(Product, order_in.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto acabado não encontrado.",
            )

        # Gera número sequencial amigável
        now = datetime.now(timezone.utc)
        order_number = f"OP-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        order = ProductionOrder(
            order_number=order_number,
            product_id=order_in.product_id,
            recipe_id=order_in.recipe_id,
            planned_quantity=order_in.planned_quantity,
            produced_quantity=order_in.planned_quantity,
            status=ProductionOrderStatus.RASCUNHO,
            notes=order_in.notes,
            created_by_user_id=user_id,
        )
        db.add(order)
        db.flush()

        # Se houver itens manuais informados, usa-os
        if order_in.items:
            for it in order_in.items:
                order_item = ProductionOrderItem(
                    production_order_id=order.id,
                    component_product_id=it.component_product_id,
                    planned_quantity=it.planned_quantity,
                    actual_quantity=it.actual_quantity or it.planned_quantity,
                    loss_quantity=it.loss_quantity,
                )
                db.add(order_item)
        elif order_in.recipe_id:
            # Calcula insumos automaticamente da ficha técnica proporcionalmente
            recipe = db.get(ProductionRecipe, order_in.recipe_id)
            if recipe:
                ratio = order_in.planned_quantity / recipe.yield_quantity
                for rit in recipe.items:
                    needed = rit.standard_quantity * ratio
                    order_item = ProductionOrderItem(
                        production_order_id=order.id,
                        component_product_id=rit.component_product_id,
                        planned_quantity=needed,
                        actual_quantity=needed,
                        loss_quantity=Decimal("0.000"),
                    )
                    db.add(order_item)

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def update_draft_order(
        db: Session, order: ProductionOrder, update_in: ProductionOrderUpdate
    ) -> ProductionOrder:
        if order.status != ProductionOrderStatus.RASCUNHO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apenas ordens de produção em Rascunho podem ser modificadas.",
            )

        if update_in.produced_quantity is not None:
            order.produced_quantity = update_in.produced_quantity
        if update_in.notes is not None:
            order.notes = update_in.notes

        if update_in.items is not None:
            # Atualiza itens
            item_map = {item.component_product_id: item for item in order.items}
            for it in update_in.items:
                if it.component_product_id in item_map:
                    target = item_map[it.component_product_id]
                    if it.actual_quantity is not None:
                        target.actual_quantity = it.actual_quantity
                    target.loss_quantity = it.loss_quantity

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def confirm_order(db: Session, order_id: int, user_id: Optional[int] = None) -> ProductionOrder:
        """
        Confirma a ordem de produção em TRANSAÇÃO ATÔMICA:
        1. Valida saldo de todos os insumos.
        2. Debita insumos utilizados e perdas.
        3. Adiciona quantidade do produto acabado.
        4. Falha atomicamente se algum saldo for insuficiente.
        """
        order = db.get(ProductionOrder, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ordem de produção não encontrada.",
            )

        if order.status != ProductionOrderStatus.RASCUNHO:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível confirmar uma ordem com status '{order.status.value}'.",
            )

        # 1. Validação prévia de saldos de TODOS os insumos
        for it in order.items:
            consumed = (it.actual_quantity if it.actual_quantity is not None else it.planned_quantity) + it.loss_quantity
            stock_service.validate_available_stock(
                db, it.component_product_id, consumed, it.component.name if it.component else None
            )

        # 2. Execução das movimentações de insumos (baixa)
        for it in order.items:
            consumed = (it.actual_quantity if it.actual_quantity is not None else it.planned_quantity) + it.loss_quantity
            stock_service.create_movement(
                db,
                product_id=it.component_product_id,
                movement_type=MovementType.CONSUMO_PRODUCAO,
                quantity=-consumed,
                user_id=user_id,
                justification=f"Consumo na produção {order.order_number}",
                reference_type="PRODUCTION_ORDER",
                reference_id=order.id,
            )

        # 3. Execução da movimentação do produto acabado (entrada)
        qty_produced = order.produced_quantity if order.produced_quantity is not None else order.planned_quantity
        stock_service.create_movement(
            db,
            product_id=order.product_id,
            movement_type=MovementType.ENTRADA_PRODUCAO,
            quantity=qty_produced,
            user_id=user_id,
            justification=f"Entrada por produção artesanal {order.order_number}",
            reference_type="PRODUCTION_ORDER",
            reference_id=order.id,
        )

        # 4. Atualização de status da ordem
        order.status = ProductionOrderStatus.CONFIRMADA
        order.confirmed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def cancel_order(db: Session, order_id: int, user_id: Optional[int] = None) -> ProductionOrder:
        """
        Cancela a ordem de produção:
        - Se estiver em Rascunho, apenas cancela.
        - Se estiver Confirmada, estorna o estoque atomicamente via movimentações de reversão.
        """
        order = db.get(ProductionOrder, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ordem de produção não encontrada.",
            )

        if order.status == ProductionOrderStatus.CANCELADA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta ordem de produção já está cancelada.",
            )

        if order.status == ProductionOrderStatus.CONFIRMADA:
            # Reverte entrada do produto acabado
            qty_produced = order.produced_quantity if order.produced_quantity is not None else order.planned_quantity
            stock_service.validate_available_stock(db, order.product_id, qty_produced, order.product.name)

            stock_service.create_movement(
                db,
                product_id=order.product_id,
                movement_type=MovementType.REVERSAO_CANCELAMENTO,
                quantity=-qty_produced,
                user_id=user_id,
                justification=f"Estorno de produção cancelada {order.order_number}",
                reference_type="PRODUCTION_CANCEL",
                reference_id=order.id,
            )

            # Reverte consumo de cada insumo (devolve ao estoque)
            for it in order.items:
                consumed = (it.actual_quantity if it.actual_quantity is not None else it.planned_quantity) + it.loss_quantity
                stock_service.create_movement(
                    db,
                    product_id=it.component_product_id,
                    movement_type=MovementType.REVERSAO_CANCELAMENTO,
                    quantity=consumed,
                    user_id=user_id,
                    justification=f"Estorno de insumo por cancelamento da {order.order_number}",
                    reference_type="PRODUCTION_CANCEL",
                    reference_id=order.id,
                )

        order.status = ProductionOrderStatus.CANCELADA
        order.cancelled_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def list_orders(db: Session, skip: int = 0, limit: int = 100) -> List[ProductionOrder]:
        stmt = select(ProductionOrder).order_by(ProductionOrder.created_at.desc()).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_order_by_id(db: Session, order_id: int) -> Optional[ProductionOrder]:
        return db.get(ProductionOrder, order_id)


production_service = ProductionService()
