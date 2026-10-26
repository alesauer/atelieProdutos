from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from app.models.sale import SaleStatus


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    document: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    document: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal
    unit_cost_snapshot: Decimal

    model_config = ConfigDict(from_attributes=True)


class SaleCreate(BaseModel):
    customer_id: Optional[int] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    items: List[SaleItemCreate] = Field(..., min_length=1)


class SaleUpdate(BaseModel):
    customer_id: Optional[int] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[SaleItemCreate]] = None


class SaleResponse(BaseModel):
    id: int
    sale_number: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    payment_method: Optional[str] = None
    status: SaleStatus
    total_amount: Decimal
    notes: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    items: List[SaleItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
