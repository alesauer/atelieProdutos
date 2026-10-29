from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

from app.models.product import ItemType
from app.models.stock import MovementType


class StockAdjustmentCreate(BaseModel):
    product_id: int
    quantity_delta: Decimal = Field(..., description="Diferença a ajustar (+ ou -)")
    justification: str = Field(..., min_length=3, description="Justificativa obrigatória para auditoria")


class StockEntryCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(..., gt=0, description="Quantidade a dar entrada")
    unit_cost: Optional[Decimal] = Field(None, ge=0, description="Custo unitário na compra/entrada")
    justification: Optional[str] = Field(None, description="Nota fiscal ou referência de compra")


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    movement_type: MovementType
    quantity: Decimal
    unit_cost_at_moment: Decimal
    justification: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    user_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StockBalanceResponse(BaseModel):
    product_id: int
    sku: str
    name: str
    item_type: str
    category_name: Optional[str] = None
    unit_code: str
    current_stock: Decimal
    min_stock: Decimal
    is_low_stock: bool
    is_zero_stock: bool
    unit_cost: Decimal
    estimated_total_value: Decimal
    parent_id: Optional[int] = None
    has_variations: bool = False
    variations_count: int = 0
    variation_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

