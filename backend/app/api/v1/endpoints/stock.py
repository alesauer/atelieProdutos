from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.stock import MovementType, StockMovement
from app.schemas.stock import (
    StockAdjustmentCreate,
    StockEntryCreate,
    StockMovementResponse,
    StockBalanceResponse,
)
from app.services.stock_service import stock_service

router = APIRouter()


@router.get("/balance", response_model=List[StockBalanceResponse])
def get_stock_balances(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retorna saldo atual consolidado de todos os itens cadastrados."""
    return stock_service.list_balances(db)


@router.get("/movements", response_model=List[StockMovementResponse])
def list_stock_movements(
    product_id: Optional[int] = None,
    movement_type: Optional[MovementType] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retorna histórico de movimentações com filtros por item e tipo de operação."""
    return stock_service.list_movements(
        db, product_id=product_id, movement_type=movement_type, skip=skip, limit=limit
    )


@router.post("/adjustments", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def create_stock_adjustment(
    adj_in: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Realiza ajuste manual de inventário.
    A justificativa é OBRIGATÓRIA para fins de auditoria.
    """
    mov = stock_service.create_adjustment(
        db,
        product_id=adj_in.product_id,
        delta=adj_in.quantity_delta,
        justification=adj_in.justification,
        user_id=current_user.id,
    )
    resp = StockMovementResponse.model_validate(mov)
    if mov.product:
        resp.product_name = mov.product.name
        resp.product_sku = mov.product.sku
    resp.user_name = current_user.full_name
    return resp


@router.post("/entries", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def create_stock_entry(
    entry_in: StockEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra entrada manual de estoque por compra ou recebimento avulso de insumos."""
    mov = stock_service.create_entry(
        db,
        product_id=entry_in.product_id,
        quantity=entry_in.quantity,
        unit_cost=entry_in.unit_cost,
        justification=entry_in.justification,
        user_id=current_user.id,
    )
    resp = StockMovementResponse.model_validate(mov)
    if mov.product:
        resp.product_name = mov.product.name
        resp.product_sku = mov.product.sku
    resp.user_name = current_user.full_name
    return resp


@router.delete("/movements/{movement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui um registro individual de movimentação do extrato de estoque."""
    movement = db.get(StockMovement, movement_id)
    if not movement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de movimentação não encontrado.",
        )
    db.delete(movement)
    db.commit()
    return None
