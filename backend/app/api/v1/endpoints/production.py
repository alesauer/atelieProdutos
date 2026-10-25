from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.production import ProductionOrder, ProductionRecipe
from app.schemas.production import (
    RecipeCreate,
    RecipeResponse,
    RecipeItemResponse,
    ProductionOrderCreate,
    ProductionOrderUpdate,
    ProductionOrderResponse,
    ProductionOrderItemResponse,
)
from app.services.production_service import production_service

router = APIRouter()


def _enrich_recipe_response(recipe: ProductionRecipe) -> RecipeResponse:
    resp = RecipeResponse(
        id=recipe.id,
        product_id=recipe.product_id,
        product_name=recipe.product.name if recipe.product else None,
        name=recipe.name,
        yield_quantity=recipe.yield_quantity,
        instructions=recipe.instructions,
        is_active=recipe.is_active,
        items=[
            RecipeItemResponse(
                id=item.id,
                component_product_id=item.component_product_id,
                component_name=item.component.name if item.component else None,
                component_sku=item.component.sku if item.component else None,
                component_unit=item.component.unit.code if item.component and item.component.unit else None,
                standard_quantity=item.standard_quantity,
            )
            for item in recipe.items
        ],
    )
    return resp


def _enrich_order_response(order: ProductionOrder) -> ProductionOrderResponse:
    resp = ProductionOrderResponse(
        id=order.id,
        order_number=order.order_number,
        product_id=order.product_id,
        product_name=order.product.name if order.product else None,
        recipe_id=order.recipe_id,
        planned_quantity=order.planned_quantity,
        produced_quantity=order.produced_quantity,
        status=order.status,
        notes=order.notes,
        confirmed_at=order.confirmed_at,
        cancelled_at=order.cancelled_at,
        created_at=order.created_at,
        items=[
            ProductionOrderItemResponse(
                id=item.id,
                component_product_id=item.component_product_id,
                component_name=item.component.name if item.component else None,
                component_unit=item.component.unit.code if item.component and item.component.unit else None,
                planned_quantity=item.planned_quantity,
                actual_quantity=item.actual_quantity,
                loss_quantity=item.loss_quantity,
            )
            for item in order.items
        ],
    )
    return resp


# --- Fichas Técnicas ---

@router.get("/recipes", response_model=List[RecipeResponse])
def list_recipes(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    recipes = production_service.list_recipes(db)
    return [_enrich_recipe_response(r) for r in recipes]


@router.post("/recipes", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(
    recipe_in: RecipeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    recipe = production_service.create_recipe(db, recipe_in)
    return _enrich_recipe_response(recipe)


@router.get("/recipes/{recipe_id}", response_model=RecipeResponse)
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    recipe = production_service.get_recipe_by_id(db, recipe_id)
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ficha técnica não encontrada.",
        )
    return _enrich_recipe_response(recipe)


@router.get("/recipes/product/{product_id}", response_model=RecipeResponse)
def get_recipe_by_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    recipe = production_service.get_recipe_by_product_id(db, product_id)
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este produto não possui ficha técnica cadastrada.",
        )
    return _enrich_recipe_response(recipe)


@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui uma ficha técnica de produto."""
    production_service.delete_recipe(db, recipe_id)
    return None


# --- Ordens de Produção ---

@router.get("/orders", response_model=List[ProductionOrderResponse])
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    orders = production_service.list_orders(db, skip=skip, limit=limit)
    return [_enrich_order_response(o) for o in orders]


@router.post("/orders", response_model=ProductionOrderResponse, status_code=status.HTTP_201_CREATED)
def create_draft_order(
    order_in: ProductionOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova ordem de produção em modo Rascunho (não altera o estoque físico)."""
    order = production_service.create_draft_order(db, order_in, user_id=current_user.id)
    return _enrich_order_response(order)


@router.get("/orders/{order_id}", response_model=ProductionOrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    order = production_service.get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ordem de produção não encontrada.",
        )
    return _enrich_order_response(order)


@router.put("/orders/{order_id}", response_model=ProductionOrderResponse)
def update_draft_order(
    order_id: int,
    update_in: ProductionOrderUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Permite ajustar o consumo real e perdas na bancada antes da confirmação."""
    order = production_service.get_order_by_id(db, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ordem de produção não encontrada.",
        )
    updated = production_service.update_draft_order(db, order, update_in)
    return _enrich_order_response(updated)


@router.post("/orders/{order_id}/confirm", response_model=ProductionOrderResponse)
def confirm_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confirma a produção em transação atômica única:
    valida saldo de todos os insumos, dá baixa no consumo/perdas e credita o produto acabado.
    """
    order = production_service.confirm_order(db, order_id, user_id=current_user.id)
    return _enrich_order_response(order)


@router.post("/orders/{order_id}/cancel", response_model=ProductionOrderResponse)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancela a ordem de produção e estorna o estoque se já havia sido confirmada."""
    order = production_service.cancel_order(db, order_id, user_id=current_user.id)
    return _enrich_order_response(order)


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui uma ordem de produção (rascunho ou cancelada)."""
    production_service.delete_order(db, order_id)
    return None
