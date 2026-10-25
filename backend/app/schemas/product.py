from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.product import ItemType
from app.schemas.category import CategoryResponse
from app.schemas.unit import UnitResponse


class ProductImageResponse(BaseModel):
    id: int
    product_id: int
    file_path: str
    original_filename: str
    file_size: int
    mime_type: str
    is_primary: bool
    display_order: int
    created_at: datetime
    url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    item_type: str = Field(..., min_length=2, max_length=50)
    category_id: Optional[int] = None
    unit_id: int
    unit_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    cost_breakdown: Optional[str] = None
    sales_links: Optional[str] = None
    color: Optional[str] = Field(None, max_length=50)
    sale_price: Optional[Decimal] = Field(default=None, ge=0)
    min_stock: Decimal = Field(default=Decimal("0.000"), ge=0)
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, min_length=2, max_length=50)
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    item_type: Optional[str] = Field(None, min_length=2, max_length=50)
    category_id: Optional[int] = None
    unit_id: Optional[int] = None
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    cost_breakdown: Optional[str] = None
    sales_links: Optional[str] = None
    color: Optional[str] = Field(None, max_length=50)
    sale_price: Optional[Decimal] = Field(None, ge=0)
    min_stock: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    unit: Optional[UnitResponse] = None
    images: List[ProductImageResponse] = []
    primary_image_url: Optional[str] = None
    current_stock: Decimal = Field(default=Decimal("0.000"))

    model_config = ConfigDict(from_attributes=True)


class ImageReorderItem(BaseModel):
    image_id: int
    display_order: int


class ImageReorderRequest(BaseModel):
    items: List[ImageReorderItem]
