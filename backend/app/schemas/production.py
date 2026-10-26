from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.production import ProductionOrderStatus


class RecipeItemSchema(BaseModel):
    component_product_id: int
    standard_quantity: Decimal = Field(..., gt=0)


class RecipeItemResponse(RecipeItemSchema):
    id: int
    component_name: Optional[str] = None
    component_sku: Optional[str] = None
    component_unit: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RecipeCreate(BaseModel):
    product_id: int
    name: str = Field(..., min_length=2, max_length=120)
    yield_quantity: Decimal = Field(default=Decimal("1.000"), gt=0)
    instructions: Optional[str] = None
    items: List[RecipeItemSchema] = []


class RecipeResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    name: str
    yield_quantity: Decimal
    instructions: Optional[str] = None
    is_active: bool
    items: List[RecipeItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProductionOrderItemCreate(BaseModel):
    component_product_id: int
    planned_quantity: Decimal = Field(..., gt=0)
    actual_quantity: Optional[Decimal] = Field(None, ge=0)
    loss_quantity: Decimal = Field(default=Decimal("0.000"), ge=0)


class ProductionOrderItemResponse(BaseModel):
    id: int
    component_product_id: int
    component_name: Optional[str] = None
    component_unit: Optional[str] = None
    planned_quantity: Decimal
    actual_quantity: Optional[Decimal] = None
    loss_quantity: Decimal

    model_config = ConfigDict(from_attributes=True)


class ProductionOrderCreate(BaseModel):
    product_id: int
    recipe_id: Optional[int] = None
    color: Optional[str] = None
    planned_quantity: Decimal = Field(..., gt=0)
    notes: Optional[str] = None
    items: Optional[List[ProductionOrderItemCreate]] = None


class ProductionOrderUpdate(BaseModel):
    produced_quantity: Optional[Decimal] = Field(None, gt=0)
    color: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[ProductionOrderItemCreate]] = None


class ProductionOrderResponse(BaseModel):
    id: int
    order_number: str
    product_id: int
    product_name: Optional[str] = None
    recipe_id: Optional[int] = None
    color: Optional[str] = None
    planned_quantity: Decimal
    produced_quantity: Optional[Decimal] = None
    status: ProductionOrderStatus
    notes: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    items: List[ProductionOrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
