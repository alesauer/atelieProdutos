from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerDetailResponse,
    CustomerStatsResponse,
)
from app.services.customer_service import customer_service

router = APIRouter()


@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = None,
    origin_channel: Optional[str] = None,
    tag: Optional[str] = None,
    active_only: bool = False,
    order_by: str = "name",
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista todos os clientes com filtros de busca, tags, canal e métricas de compras."""
    return customer_service.list_customers(
        db,
        search=search,
        origin_channel=origin_channel,
        tag=tag,
        active_only=active_only,
        order_by=order_by,
    )


@router.get("/stats", response_model=CustomerStatsResponse)
def get_customer_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retorna métricas consolidadas da carteira de clientes (LTV total, ticket médio, etc.)."""
    return customer_service.get_customer_stats(db)


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer_detail(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retorna os dados completos e o histórico de compras de um cliente específico."""
    return customer_service.get_customer_detail(db, customer_id)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Cadastra um novo cliente no CRM."""
    return customer_service.create_customer(db, customer_in)


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atualiza dados cadastrais e notas de um cliente."""
    return customer_service.update_customer(db, customer_id, customer_in)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Remove cliente ou o inativa caso já possua vendas registradas."""
    customer_service.delete_customer(db, customer_id)
    return None
