from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.item_type import ItemTypeCreate, ItemTypeUpdate, ItemTypeResponse
from app.services.item_type_service import item_type_service

router = APIRouter()


@router.get("", response_model=List[ItemTypeResponse])
def list_item_types(
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista todos os tipos de itens disponíveis (padrões e customizados)."""
    return item_type_service.list_item_types(db, active_only=active_only)


@router.post("", response_model=ItemTypeResponse, status_code=status.HTTP_201_CREATED)
def create_item_type(
    item_type_in: ItemTypeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cadastra um novo tipo de item no ateliê."""
    return item_type_service.create_item_type(db, item_type_in)


@router.get("/{item_type_id}", response_model=ItemTypeResponse)
def get_item_type(
    item_type_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Busca detalhes de um tipo de item pelo ID."""
    item_type = item_type_service.get_by_id(db, item_type_id)
    if not item_type:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tipo de item não encontrado.",
        )
    return item_type


@router.put("/{item_type_id}", response_model=ItemTypeResponse)
def update_item_type(
    item_type_id: int,
    item_type_in: ItemTypeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza informações de um tipo de item."""
    return item_type_service.update_item_type(db, item_type_id, item_type_in)


@router.delete("/{item_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item_type(
    item_type_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Remove um tipo de item customizado que não esteja em uso por produtos."""
    item_type_service.delete_item_type(db, item_type_id)
    return None
