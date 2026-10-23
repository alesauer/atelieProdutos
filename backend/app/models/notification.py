from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import String, DateTime, Integer, BigInteger, Text, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NotificationStatus(str, enum.Enum):
    SENT = "SENT"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    MOCK = "MOCK"


class EmailNotificationLog(Base):
    __tablename__ = "email_notification_logs"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    deduplication_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    recipient: Mapped[str] = mapped_column(String(191), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, native_enum=False, length=20),
        nullable=False,
        default=NotificationStatus.SENT,
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("idx_dedup_lookup", "deduplication_key", "sent_at"),
    )
