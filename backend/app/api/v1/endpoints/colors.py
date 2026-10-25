from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.color import ColorCreate, ColorUpdate, ColorResponse
from app.services.product_service import product_service

router = APIRouter()


@router.get("", response_model=List[ColorResponse])
def list_colors(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista as cores de produtos cadastradas."""
    return product_service.list_colors(db)


@router.post("", response_model=ColorResponse, status_code=status.HTTP_201_CREATED)
def create_color(
    color_in: ColorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cadastra uma nova cor de produto."""
    return product_service.create_color(db, color_in)


@router.put("/{color_id}", response_model=ColorResponse)
def update_color(
    color_id: int,
    color_in: ColorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza dados de uma cor existente."""
    color = product_service.get_color_by_id(db, color_id)
    if not color:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cor não encontrada.",
        )
    return product_service.update_color(db, color, color_in)


@router.delete("/{color_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_color(
    color_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui uma cor de produto."""
    product_service.delete_color(db, color_id)
    return None
