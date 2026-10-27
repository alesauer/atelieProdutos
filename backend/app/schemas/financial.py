from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

from app.models.financial import TransactionType, TransactionStatus


# --- Categorias Financeiras ---
class FinancialCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    type: TransactionType = TransactionType.DESPESA
    color: Optional[str] = None
    is_active: bool = True


class FinancialCategoryCreate(FinancialCategoryBase):
    pass


class FinancialCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    type: Optional[TransactionType] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class FinancialCategoryResponse(FinancialCategoryBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Transações Financeiras (Contas a Pagar / Receber / Despesas) ---
class FinancialTransactionBase(BaseModel):
    description: str = Field(..., min_length=2, max_length=200)
    type: TransactionType = TransactionType.DESPESA
    category_id: Optional[int] = None
    amount: Decimal = Field(..., gt=0)
    due_date: date
    payment_date: Optional[date] = None
    status: TransactionStatus = TransactionStatus.PENDENTE
    payment_method: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    notes: Optional[str] = None


class FinancialTransactionCreate(FinancialTransactionBase):
    pass


class FinancialTransactionUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=2, max_length=200)
    type: Optional[TransactionType] = None
    category_id: Optional[int] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    status: Optional[TransactionStatus] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class FinancialTransactionResponse(FinancialTransactionBase):
    id: int
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Relatório Resumido / DRE / Métricas ---
class PaymentMethodStat(BaseModel):
    method: str
    amount: Decimal
    count: int
    percentage: float


class CategoryExpenseStat(BaseModel):
    category_name: str
    color: Optional[str] = None
    amount: Decimal
    percentage: float


class CashFlowPoint(BaseModel):
    date: str
    income: Decimal
    expense: Decimal
    net: Decimal


class DREItem(BaseModel):
    code: str
    label: str
    amount: Decimal
    percentage: float
    is_total: bool = False
    is_negative: bool = False


class FinancialSummaryResponse(BaseModel):
    start_date: str
    end_date: str
    
    # Receitas
    sales_revenue: Decimal
    manual_revenue: Decimal
    total_revenue: Decimal

    # Custos e Lucro Bruto
    total_cpv: Decimal
    gross_profit: Decimal
    gross_margin_pct: float

    # Despesas Operacionais
    paid_expenses: Decimal
    pending_expenses: Decimal
    overdue_expenses: Decimal

    # Resultado Líquido
    net_profit: Decimal
    net_margin_pct: float

    # Contagens
    sales_count: int
    expenses_count: int

    # Detalhamentos
    by_payment_method: List[PaymentMethodStat]
    top_expense_categories: List[CategoryExpenseStat]
    daily_cash_flow: List[CashFlowPoint]
    dre_items: List[DREItem]
