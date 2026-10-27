from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
import uuid
from sqlalchemy import select, func
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
            color=order_in.color,
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
        if update_in.color is not None:
            order.color = update_in.color
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
    def auto_create_draft_orders_for_low_stock(db: Session) -> List[ProductionOrder]:
        """
        Gera automaticamente rascunhos de ordens de produção artesanal para qualquer
        produto acabado ativo cujo saldo em estoque esteja em nível de alerta (<= 5 peças).
        Não duplica caso já exista uma ordem em rascunho aberta para o mesmo produto.
        """
        products = list(
            db.execute(
                select(Product).where(
                    Product.is_active == True,
                    Product.item_type == "PRODUTO_ACABADO",
                )
            ).scalars().all()
        )

        created_orders: List[ProductionOrder] = []
        now = datetime.now(timezone.utc)

        for p in products:
            # Se for produto pai que possui variações ativas, avaliamos cada variação
            if p.variations and len(p.variations) > 0:
                target_items = [v for v in p.variations if v.is_active]
            else:
                target_items = [p]

            for item in target_items:
                curr_stock = stock_service.get_product_balance(db, item.id)

                # Regra de Alerta de Produção: estoque atual <= 5 peças
                if curr_stock <= Decimal("5.000"):
                    # Verifica se já existe ordem em RASCUNHO pendente para este item
                    existing_draft = db.execute(
                        select(ProductionOrder).where(
                            ProductionOrder.product_id == item.id,
                            ProductionOrder.status == ProductionOrderStatus.RASCUNHO,
                        )
                    ).scalars().first()

                    if existing_draft:
                        continue

                    # Localiza ficha técnica (pelo ID do item ou do pai)
                    recipe = db.execute(
                        select(ProductionRecipe).where(
                            ProductionRecipe.product_id == item.id,
                            ProductionRecipe.is_active == True,
                        )
                    ).scalars().first()

                    if not recipe and item.parent_id:
                        recipe = db.execute(
                            select(ProductionRecipe).where(
                                ProductionRecipe.product_id == item.parent_id,
                                ProductionRecipe.is_active == True,
                            )
                        ).scalars().first()

                    planned_qty = (
                        recipe.yield_quantity
                        if recipe and recipe.yield_quantity and recipe.yield_quantity > 0
                        else Decimal("5.000")
                    )
                    if planned_qty < Decimal("5.000"):
                        planned_qty = Decimal("5.000")

                    order_color = item.color or (p.color if item.parent_id else None)
                    order_number = f"OP-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

                    order = ProductionOrder(
                        order_number=order_number,
                        product_id=item.id,
                        recipe_id=recipe.id if recipe else None,
                        color=order_color,
                        planned_quantity=planned_qty,
                        produced_quantity=planned_qty,
                        status=ProductionOrderStatus.RASCUNHO,
                        notes=(
                            f"Rascunho criado automaticamente por Alerta de Produção "
                            f"(Estoque atual: {curr_stock:.2f} <= 5.00 peças)."
                        ),
                    )
                    db.add(order)
                    db.flush()

                    if recipe and recipe.yield_quantity and recipe.yield_quantity > 0:
                        ratio = planned_qty / recipe.yield_quantity
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

                    created_orders.append(order)

        if created_orders:
            db.commit()
            for o in created_orders:
                db.refresh(o)

        return created_orders

    @staticmethod
    def list_orders(db: Session, skip: int = 0, limit: int = 100) -> List[ProductionOrder]:
        try:
            ProductionService.auto_create_draft_orders_for_low_stock(db)
        except Exception:
            pass
        stmt = select(ProductionOrder).order_by(ProductionOrder.created_at.desc()).offset(skip).limit(limit)
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_order_by_id(db: Session, order_id: int) -> Optional[ProductionOrder]:
        return db.get(ProductionOrder, order_id)

    @staticmethod
    def delete_recipe(db: Session, recipe_id: int) -> None:
        recipe = ProductionService.get_recipe_by_id(db, recipe_id)
        if not recipe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ficha técnica não encontrada.",
            )
        active_orders = db.execute(
            select(func.count(ProductionOrder.id)).where(
                ProductionOrder.recipe_id == recipe_id,
                ProductionOrder.status != ProductionOrderStatus.CANCELADA,
            )
        ).scalar() or 0
        if active_orders > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível excluir esta ficha técnica pois existem {active_orders} ordem(ns) de produção vinculada(s) a ela.",
            )
        db.delete(recipe)
        db.commit()

    @staticmethod
    def delete_order(db: Session, order_id: int) -> None:
        order = ProductionService.get_order_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ordem de produção não encontrada.",
            )
        if order.status == ProductionOrderStatus.CONFIRMADA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta ordem de produção está confirmada com estoque movimentado. Cancele a ordem primeiro para estornar o estoque antes de excluí-la.",
            )
        db.delete(order)
        db.commit()


production_service = ProductionService()
