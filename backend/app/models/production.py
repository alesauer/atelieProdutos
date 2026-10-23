from datetime import datetime, timezone
from decimal import Decimal
import enum
from typing import Optional, List
from sqlalchemy import String, DateTime, ForeignKey, Integer, Numeric, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class ProductionOrderStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    CONFIRMADA = "CONFIRMADA"
    CANCELADA = "CANCELADA"


class ProductionRecipe(Base, TimestampMixin):
    __tablename__ = "production_recipes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    yield_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), default=Decimal("1.000"), nullable=False
    )
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    product = relationship("Product")
    items = relationship(
        "ProductionRecipeItem",
        back_populates="recipe",
        cascade="all, delete-orphan",
    )


class ProductionRecipeItem(Base):
    __tablename__ = "production_recipe_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recipe_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("production_recipes.id", ondelete="CASCADE"), nullable=False
    )
    component_product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    standard_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False
    )

    recipe = relationship("ProductionRecipe", back_populates="items")
    component = relationship("Product")


class ProductionOrder(Base, TimestampMixin):
    __tablename__ = "production_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    recipe_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("production_recipes.id", ondelete="SET NULL"), nullable=True
    )
    planned_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False
    )
    produced_quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 3), nullable=True
    )
    status: Mapped[ProductionOrderStatus] = mapped_column(
        Enum(ProductionOrderStatus, native_enum=False, length=20),
        default=ProductionOrderStatus.RASCUNHO,
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    product = relationship("Product")
    recipe = relationship("ProductionRecipe")
    created_by = relationship("User")
    items = relationship(
        "ProductionOrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )


class ProductionOrderItem(Base):
    __tablename__ = "production_order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    production_order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("production_orders.id", ondelete="CASCADE"), nullable=False
    )
    component_product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    planned_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False
    )
    actual_quantity: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 3), nullable=True
    )
    loss_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), default=Decimal("0.000"), nullable=False
    )

    order = relationship("ProductionOrder", back_populates="items")
    component = relationship("Product")
