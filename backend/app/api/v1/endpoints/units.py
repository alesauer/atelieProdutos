from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.unit import UnitCreate, UnitUpdate, UnitResponse
from app.services.product_service import product_service

router = APIRouter()


@router.get("", response_model=List[UnitResponse])
def list_units(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista unidades de medida disponíveis (UN, KG, G, L, ML, etc.)."""
    return product_service.list_units(db)


@router.post("", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(
    unit_in: UnitCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Adiciona nova unidade de medida ao sistema."""
    return product_service.create_unit(db, unit_in)


@router.put("/{unit_id}", response_model=UnitResponse)
def update_unit(
    unit_id: int,
    unit_in: UnitUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza dados de uma unidade de medida."""
    unit = product_service.get_unit_by_id(db, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidade de medida não encontrada.",
        )
    return product_service.update_unit(db, unit, unit_in)


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Remove uma unidade de medida cadastrada caso não possua produtos associados."""
    product_service.delete_unit(db, unit_id)
    return None

