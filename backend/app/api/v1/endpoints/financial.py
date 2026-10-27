from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.financial import TransactionType, TransactionStatus
from app.schemas.financial import (
    FinancialCategoryCreate,
    FinancialCategoryUpdate,
    FinancialCategoryResponse,
    FinancialTransactionCreate,
    FinancialTransactionUpdate,
    FinancialTransactionResponse,
    FinancialSummaryResponse,
)
from app.services.financial_service import financial_service

router = APIRouter()


@router.get("/summary", response_model=FinancialSummaryResponse)
def get_financial_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o resumo financeiro consolidado:
    - Receita Bruta (Vendas Confirmadas + Outras Receitas)
    - CPV (Custo das Matérias-Primas e Embalagens)
    - Lucro Bruto e Margem (%)
    - Despesas Operacionais (Pagas, Pendentes e Atrasadas)
    - Lucro Líquido
    - Estatísticas por Forma de Pagamento e DRE Gerencial
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        # Padrão: primeiro dia do mês atual
        start_date = end_date.replace(day=1)

    return financial_service.get_summary(db=db, start_date=start_date, end_date=end_date)


@router.get("/categories", response_model=List[FinancialCategoryResponse])
def list_financial_categories(
    type: Optional[TransactionType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista as categorias financeiras de receitas e despesas."""
    return financial_service.list_categories(db=db, type=type)


@router.post("/categories", response_model=FinancialCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_financial_category(
    cat_in: FinancialCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova categoria financeira."""
    return financial_service.create_category(db=db, cat_in=cat_in)


@router.put("/categories/{cat_id}", response_model=FinancialCategoryResponse)
def update_financial_category(
    cat_id: int,
    cat_in: FinancialCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma categoria financeira existente."""
    return financial_service.update_category(db=db, cat_id=cat_id, cat_in=cat_in)


@router.get("/transactions", response_model=List[FinancialTransactionResponse])
def list_financial_transactions(
    type: Optional[TransactionType] = None,
    status_filter: Optional[TransactionStatus] = Query(None, alias="status"),
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista as transações financeiras (contas a pagar / despesas / outras receitas)."""
    return financial_service.list_transactions(
        db=db,
        type=type,
        status_filter=status_filter,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post("/transactions", response_model=FinancialTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_financial_transaction(
    trans_in: FinancialTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo lançamento financeiro (despesa ou receita avulsa)."""
    return financial_service.create_transaction(db=db, trans_in=trans_in, user_id=current_user.id)


@router.put("/transactions/{trans_id}", response_model=FinancialTransactionResponse)
def update_financial_transaction(
    trans_id: int,
    trans_in: FinancialTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza os dados de um lançamento financeiro."""
    return financial_service.update_transaction(db=db, trans_id=trans_id, trans_in=trans_in)


@router.patch("/transactions/{trans_id}/status", response_model=FinancialTransactionResponse)
def toggle_financial_transaction_status(
    trans_id: int,
    status_target: TransactionStatus = Query(..., alias="status"),
    payment_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alterna o status de um lançamento (ex: marcar como PAGO ou PENDENTE)."""
    return financial_service.toggle_status(
        db=db,
        trans_id=trans_id,
        target_status=status_target,
        payment_date=payment_date,
    )


@router.delete("/transactions/{trans_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_financial_transaction(
    trans_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exclui um lançamento financeiro."""
    financial_service.delete_transaction(db=db, trans_id=trans_id)
    return None
