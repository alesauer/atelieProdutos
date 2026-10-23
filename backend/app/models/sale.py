from datetime import datetime, timezone
from decimal import Decimal
import enum
from typing import Optional, List
from sqlalchemy import String, DateTime, ForeignKey, Integer, Numeric, Text, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class SaleStatus(str, enum.Enum):
    RASCUNHO = "RASCUNHO"
    CONFIRMADA = "CONFIRMADA"
    CANCELADA = "CANCELADA"


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(191), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    document: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    sales = relationship("Sale", back_populates="customer")


class Sale(Base, TimestampMixin):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sale_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    customer_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[SaleStatus] = mapped_column(
        Enum(SaleStatus, native_enum=False, length=20),
        default=SaleStatus.RASCUNHO,
        nullable=False,
        index=True,
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0.00"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    customer = relationship("Customer", back_populates="sales")
    created_by = relationship("User")
    items = relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan",
    )


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    unit_cost_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0.0000"), nullable=False
    )

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")
