from datetime import datetime, timezone
from decimal import Decimal
import enum
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Integer, BigInteger, Numeric, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MovementType(str, enum.Enum):
    ENTRADA_INICIAL = "ENTRADA_INICIAL"
    COMPRA = "COMPRA"
    SAIDA_MANUAL = "SAIDA_MANUAL"
    CONSUMO_PRODUCAO = "CONSUMO_PRODUCAO"
    ENTRADA_PRODUCAO = "ENTRADA_PRODUCAO"
    VENDA = "VENDA"
    PERDA = "PERDA"
    DEVOLUCAO = "DEVOLUCAO"
    AJUSTE_INVENTARIO = "AJUSTE_INVENTARIO"
    REVERSAO_CANCELAMENTO = "REVERSAO_CANCELAMENTO"


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    product_id: Mapped[int] = mapped_column(

        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    movement_type: Mapped[MovementType] = mapped_column(
        Enum(MovementType, native_enum=False, length=30),
        nullable=False,
        index=True,
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False
    )  # Positivo para entradas, negativo para saídas
    unit_cost_at_moment: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0.0000"), nullable=False
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    justification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)
    reference_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    product = relationship("Product")
    user = relationship("User")
