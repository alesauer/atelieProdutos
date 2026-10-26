from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.supply import SupplyCreate, SupplyUpdate, SupplyResponse
from app.services.product_service import product_service

router = APIRouter()


@router.get("", response_model=List[SupplyResponse])
def list_supplies(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista os insumos e matérias-primas de produção cadastrados."""
    return product_service.list_supplies(db)


@router.post("", response_model=SupplyResponse, status_code=status.HTTP_201_CREATED)
def create_supply(
    supply_in: SupplyCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cadastra um novo insumo / matéria-prima de produção."""
    return product_service.create_supply(db, supply_in)


@router.put("/{supply_id}", response_model=SupplyResponse)
def update_supply(
    supply_id: int,
    supply_in: SupplyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza dados e custos de um insumo existente."""
    sup = product_service.get_supply_by_id(db, supply_id)
    if not sup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insumo não encontrado.",
        )
    return product_service.update_supply(db, sup, supply_in)


@router.delete("/{supply_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supply(
    supply_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui um insumo de produção."""
    product_service.delete_supply(db, supply_id)
    return None
