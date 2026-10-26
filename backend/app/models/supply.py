from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Integer, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProductSupply(Base):
    __tablename__ = "product_supplies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    unit: Mapped[str] = mapped_column(String(20), default="unid", nullable=False)  # gr, kg, ml, l, unid, %, fixo
    base_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), default=Decimal("1.000"), nullable=False
    )
    base_cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0.0000"), nullable=False
    )
    unit_cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0.0000"), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
