from datetime import datetime, timezone
from decimal import Decimal
import enum
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Numeric, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class ItemType(str, enum.Enum):
    PRODUTO_ACABADO = "PRODUTO_ACABADO"
    MATERIA_PRIMA = "MATERIA_PRIMA"
    EMBALAGEM = "EMBALAGEM"
    MATERIAL_AUXILIAR = "MATERIAL_AUXILIAR"


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    item_type: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    unit_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("units_of_measure.id", ondelete="RESTRICT"), nullable=False
    )
    unit_cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0.0000"), nullable=False
    )
    cost_breakdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sales_links: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    material: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sale_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    weight: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 3), nullable=True
    )
    min_stock: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), default=Decimal("0.000"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_kit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Subprodutos e Variações estilo Shopee
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True
    )
    variation_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relacionamentos
    category = relationship("Category", back_populates="products")
    unit = relationship("UnitOfMeasure", back_populates="products")
    images = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.display_order",
    )
    parent = relationship("Product", remote_side=[id], back_populates="variations")
    variations = relationship(
        "Product",
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Product.id",
    )
    kit_items = relationship(
        "ProductKitItem",
        foreign_keys="[ProductKitItem.kit_product_id]",
        back_populates="kit_product",
        cascade="all, delete-orphan",
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    product = relationship("Product", back_populates="images")


class ProductKitItem(Base, TimestampMixin):
    __tablename__ = "product_kit_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kit_product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    component_product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), default=Decimal("1.000"), nullable=False
    )

    kit_product = relationship("Product", foreign_keys=[kit_product_id], back_populates="kit_items")
    component_product = relationship("Product", foreign_keys=[component_product_id])
