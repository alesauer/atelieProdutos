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


class KitItemBase(BaseModel):
    component_product_id: int
    quantity: Decimal = Field(default=Decimal("1.000"), gt=0)


class KitItemCreate(KitItemBase):
    pass


class KitComponentProductInfo(BaseModel):
    id: int
    sku: str
    name: str
    unit_cost: Decimal
    sale_price: Optional[Decimal] = None
    weight: Optional[Decimal] = None
    color: Optional[str] = None
    material: Optional[str] = None
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class KitItemResponse(KitItemBase):
    id: int
    kit_product_id: int
    component_product: Optional[KitComponentProductInfo] = None

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
    size: Optional[str] = Field(None, max_length=50)
    material: Optional[str] = Field(None, max_length=100)
    sale_price: Optional[Decimal] = Field(default=None, ge=0)
    weight: Optional[Decimal] = Field(default=None, ge=0)
    min_stock: Decimal = Field(default=Decimal("0.000"), ge=0)
    is_active: bool = True
    is_kit: bool = False
    parent_id: Optional[int] = None
    variation_name: Optional[str] = Field(None, max_length=100)


class VariationCreate(BaseModel):
    id: Optional[int] = None
    sku: Optional[str] = Field(None, max_length=50)
    variation_name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    size: Optional[str] = Field(None, max_length=50)
    material: Optional[str] = Field(None, max_length=100)
    sale_price: Optional[Decimal] = Field(default=None, ge=0)
    unit_cost: Optional[Decimal] = Field(default=None, ge=0)
    weight: Optional[Decimal] = Field(default=None, ge=0)
    min_stock: Decimal = Field(default=Decimal("0.000"), ge=0)
    initial_stock: Decimal = Field(default=Decimal("0.000"), ge=0)
    current_stock: Optional[Decimal] = None



class ProductCreate(ProductBase):
    kit_items: Optional[List[KitItemCreate]] = None
    variations: Optional[List[VariationCreate]] = None


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
    size: Optional[str] = Field(None, max_length=50)
    material: Optional[str] = Field(None, max_length=100)
    sale_price: Optional[Decimal] = Field(None, ge=0)
    weight: Optional[Decimal] = Field(None, ge=0)
    min_stock: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None
    is_kit: Optional[bool] = None
    parent_id: Optional[int] = None
    variation_name: Optional[str] = Field(None, max_length=100)
    kit_items: Optional[List[KitItemCreate]] = None
    variations: Optional[List[VariationCreate]] = None


class ProductVariationResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    images: List[ProductImageResponse] = []
    primary_image_url: Optional[str] = None
    current_stock: Decimal = Field(default=Decimal("0.000"))

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    unit: Optional[UnitResponse] = None
    images: List[ProductImageResponse] = []
    primary_image_url: Optional[str] = None
    current_stock: Decimal = Field(default=Decimal("0.000"))
    variations: List[ProductVariationResponse] = []
    kit_items: List[KitItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class LinkVariationRequest(BaseModel):
    child_id: int
    variation_name: Optional[str] = Field(None, max_length=100)


class ImageReorderItem(BaseModel):
    image_id: int
    display_order: int


class ImageReorderRequest(BaseModel):
    items: List[ImageReorderItem]
