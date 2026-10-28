from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    nickname: Optional[str] = Field(None, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    document: Optional[str] = Field(None, max_length=20)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)
    zip_code: Optional[str] = Field(None, max_length=15)
    address_line: Optional[str] = Field(None, max_length=255)
    neighborhood: Optional[str] = Field(None, max_length=100)
    birth_date: Optional[str] = Field(None, max_length=20)
    origin_channel: Optional[str] = Field(None, max_length=60)
    tags: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    is_active: bool = True


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    nickname: Optional[str] = Field(None, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    document: Optional[str] = Field(None, max_length=20)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)
    zip_code: Optional[str] = Field(None, max_length=15)
    address_line: Optional[str] = Field(None, max_length=255)
    neighborhood: Optional[str] = Field(None, max_length=100)
    birth_date: Optional[str] = Field(None, max_length=20)
    origin_channel: Optional[str] = Field(None, max_length=60)
    tags: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerSaleSummary(BaseModel):
    id: int
    sale_number: str
    status: str
    total_amount: Decimal
    payment_method: Optional[str] = None
    created_at: datetime
    items_count: int = 0
    items_preview: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_spent: Decimal = Decimal("0.00")
    sales_count: int = 0
    last_purchase_date: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CustomerDetailResponse(CustomerResponse):
    recent_sales: List[CustomerSaleSummary] = []


class CustomerStatsResponse(BaseModel):
    total_customers: int = 0
    active_customers: int = 0
    recurring_customers: int = 0
    total_revenue_from_customers: Decimal = Decimal("0.00")
    average_ticket: Decimal = Decimal("0.00")
