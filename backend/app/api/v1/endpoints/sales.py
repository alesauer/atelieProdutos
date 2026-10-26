from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.sale import Sale
from app.schemas.sale import (
    CustomerCreate,
    CustomerResponse,
    SaleCreate,
    SaleResponse,
    SaleItemResponse,
)
from app.services.sale_service import sale_service

router = APIRouter()


def _enrich_sale_response(sale: Sale) -> SaleResponse:
    resp = SaleResponse(
        id=sale.id,
        sale_number=sale.sale_number,
        customer_id=sale.customer_id,
        customer_name=sale.customer.name if sale.customer else None,
        payment_method=sale.payment_method,
        status=sale.status,
        total_amount=sale.total_amount,
        notes=sale.notes,
        confirmed_at=sale.confirmed_at,
        cancelled_at=sale.cancelled_at,
        created_at=sale.created_at,
        items=[
            SaleItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else None,
                product_sku=item.product.sku if item.product else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                unit_cost_snapshot=item.unit_cost_snapshot,
            )
            for item in sale.items
        ],
    )
    return resp


# --- Clientes ---

@router.get("/customers", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return sale_service.list_customers(db, search=search)


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return sale_service.create_customer(db, customer_in)


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui um cliente cadastrado caso não possua histórico de vendas."""
    sale_service.delete_customer(db, customer_id)
    return None


# --- Vendas ---

@router.get("", response_model=List[SaleResponse])
def list_sales(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sales = sale_service.list_sales(db, skip=skip, limit=limit)
    return [_enrich_sale_response(s) for s in sales]


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_draft_sale(
    sale_in: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova venda em modo RASCUNHO (não baixa estoque)."""
    sale = sale_service.create_draft_sale(db, sale_in, user_id=current_user.id)
    return _enrich_sale_response(sale)


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sale = sale_service.get_sale_by_id(db, sale_id)
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venda não encontrada.",
        )
    return _enrich_sale_response(sale)


@router.post("/{sale_id}/confirm", response_model=SaleResponse)
def confirm_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confirma a venda em transação atômica única:
    valida saldo de todos os itens e efetua a baixa de estoque com histórico imutável.
    """
    sale = sale_service.confirm_sale(db, sale_id, user_id=current_user.id)
    return _enrich_sale_response(sale)


@router.post("/{sale_id}/cancel", response_model=SaleResponse)
def cancel_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancela a venda e estorna os produtos de volta ao estoque se já havia sido confirmada."""
    sale = sale_service.cancel_sale(db, sale_id, user_id=current_user.id)
    return _enrich_sale_response(sale)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Exclui uma venda (rascunho ou cancelada)."""
    sale_service.delete_sale(db, sale_id)
    return None
