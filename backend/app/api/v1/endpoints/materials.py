from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.services.product_service import product_service

router = APIRouter()


@router.get("", response_model=List[MaterialResponse])
def list_materials(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista os materiais de produtos cadastrados."""
    return product_service.list_materials(db)


@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    material_in: MaterialCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cadastra um novo material de produto."""
    return product_service.create_material(db, material_in)


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    material_in: MaterialUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza dados de um material existente."""
    mat = product_service.get_material_by_id(db, material_id)
    if not mat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material não encontrado.",
        )
    return product_service.update_material(db, mat, material_in)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui um material de produto."""
    product_service.delete_material(db, material_id)
    return None
