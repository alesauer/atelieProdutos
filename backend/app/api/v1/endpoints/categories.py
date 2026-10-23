from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.product_service import product_service

router = APIRouter()


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista todas as categorias cadastradas."""
    return product_service.list_categories(db, active_only=active_only)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cadastra uma nova categoria."""
    return product_service.create_category(db, category_in)


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_in: CategoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza dados de uma categoria."""
    category = product_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada.",
        )
    return product_service.update_category(db, category, category_in)
