from datetime import datetime, date, timezone
from decimal import Decimal
import enum
from typing import Optional
from sqlalchemy import String, Date, DateTime, ForeignKey, Integer, Numeric, Text, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class TransactionType(str, enum.Enum):
    RECEITA = "RECEITA"
    DESPESA = "DESPESA"


class TransactionStatus(str, enum.Enum):
    PENDENTE = "PENDENTE"
    PAGO = "PAGO"
    CANCELADO = "CANCELADO"


class FinancialCategory(Base):
    __tablename__ = "financial_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, native_enum=False, length=20),
        default=TransactionType.DESPESA,
        nullable=False,
        index=True,
    )
    color: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    transactions = relationship("FinancialTransaction", back_populates="category")


class FinancialTransaction(Base, TimestampMixin):
    __tablename__ = "financial_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    description: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, native_enum=False, length=20),
        nullable=False,
        index=True,
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("financial_categories.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus, native_enum=False, length=20),
        default=TransactionStatus.PENDENTE,
        nullable=False,
        index=True,
    )
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    category = relationship("FinancialCategory", back_populates="transactions")
    created_by = relationship("User")
