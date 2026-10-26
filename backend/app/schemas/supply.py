from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SupplyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    category: Optional[str] = Field(None, max_length=50)
    unit: str = Field(default="unid", max_length=20)
    base_quantity: Decimal = Field(default=Decimal("1.000"), gt=0)
    base_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    unit_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None
    is_active: bool = True


class SupplyCreate(SupplyBase):
    pass


class SupplyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    category: Optional[str] = Field(None, max_length=50)
    unit: Optional[str] = Field(None, max_length=20)
    base_quantity: Optional[Decimal] = Field(None, gt=0)
    base_cost: Optional[Decimal] = Field(None, ge=0)
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SupplyResponse(SupplyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
