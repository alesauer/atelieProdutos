import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.core.config import settings
from app.models.notification import EmailNotificationLog, NotificationStatus
from app.models.product import Product
from app.models.stock import StockMovement
from app.models.user import User

logger = logging.getLogger("casaluma.email")


class EmailService:
    """
    Camada de serviço de e-mail desacoplada e configurável por variáveis de ambiente.
    Suporta drivers 'log', 'mock' e 'smtp'.
    Implementa controle rígido de deduplicação na tabela email_notification_logs.
    Garante que falhas de e-mail não bloqueiem as transações de estoque do ateliê.
    """

    mock_outbox: List[Dict[str, Any]] = []

    @classmethod
    def _is_deduplicated(
        cls,
        db: Session,
        dedup_key: str,
        window_hours: int = 24,
    ) -> bool:
        if not dedup_key:
            return False

        since = datetime.now(timezone.utc) - timedelta(hours=window_hours)
        query = select(EmailNotificationLog).where(
            and_(
                EmailNotificationLog.deduplication_key == dedup_key,
                EmailNotificationLog.status.in_([NotificationStatus.SENT, NotificationStatus.MOCK]),
                EmailNotificationLog.sent_at >= since,
            )
        )
        existing = db.execute(query).scalar_one_or_none()
        return existing is not None

    @classmethod
    def send_email(
        cls,
        db: Session,
        event_type: str,
        recipient: str,
        subject: str,
        body_text: str,
        deduplication_key: Optional[str] = None,
        dedup_window_hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Dispara e-mail respeitando a política de deduplicação e o driver configurado.
        Falhas de conexão ou autenticação são capturadas e registradas sem lançar exceção.
        """
        # 1. Checagem de deduplicação
        if deduplication_key and cls._is_deduplicated(db, deduplication_key, dedup_window_hours):
            logger.info(
                f"[EmailService] Alerta ignorado por deduplicação. Evento: {event_type}, Chave: {deduplication_key}"
            )
            log_entry = EmailNotificationLog(
                event_type=event_type,
                deduplication_key=deduplication_key,
                recipient=recipient,
                subject=subject,
                status=NotificationStatus.SKIPPED,
                error_message="Alerta deduplicado nas últimas 24 horas",
            )
            db.add(log_entry)
            db.commit()
            return {"status": "SKIPPED", "detail": "Alerta já enviado recentemente."}

        driver = settings.EMAIL_DRIVER.lower()
        status = NotificationStatus.SENT
        error_msg: Optional[str] = None

        try:
            if driver == "mock":
                cls.mock_outbox.append({
                    "event_type": event_type,
                    "recipient": recipient,
                    "subject": subject,
                    "body": body_text,
                    "deduplication_key": deduplication_key,
                    "sent_at": datetime.now(timezone.utc),
                })
                status = NotificationStatus.MOCK
                logger.info(f"[EmailService:MOCK] Enviado para {recipient}: {subject}")

            elif driver == "smtp":
                if not settings.SMTP_HOST:
                    raise ValueError("SMTP_HOST não configurado no ambiente.")
                
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = settings.EMAIL_FROM
                msg["To"] = recipient
                msg.attach(MIMEText(body_text, "plain", "utf-8"))

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                    if settings.SMTP_PORT in (587, 465):
                        server.starttls()
                    if settings.SMTP_USER and settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
                
                logger.info(f"[EmailService:SMTP] E-mail enviado com sucesso para {recipient}")

            else:
                # Driver default 'log'
                logger.info(
                    f"\n--- [ATELIÊ CASA LUMA - NOTIFICAÇÃO E-MAIL] ---\n"
                    f"Para: {recipient}\n"
                    f"Assunto: {subject}\n"
                    f"Tipo: {event_type}\n"
                    f"Chave Deduplicação: {deduplication_key}\n"
                    f"Corpo:\n{body_text}\n"
                    f"--------------------------------------------------"
                )
                status = NotificationStatus.SENT

        except Exception as exc:
            status = NotificationStatus.FAILED
            error_msg = str(exc)
            logger.error(f"[EmailService] Falha ao despachar e-mail para {recipient}: {exc}")

        # Registra auditoria na tabela
        log_entry = EmailNotificationLog(
            event_type=event_type,
            deduplication_key=deduplication_key,
            recipient=recipient,
            subject=subject,
            status=status,
            error_message=error_msg,
        )
        db.add(log_entry)
        db.commit()

        return {
            "status": status.value,
            "recipient": recipient,
            "event_type": event_type,
            "error": error_msg,
        }

    @classmethod
    def notify_low_stock(
        cls,
        db: Session,
        product: Product,
        current_stock: Decimal,
        recipient_email: str,
    ) -> Dict[str, Any]:
        """Notifica quando um item atinge ou fica abaixo do estoque mínimo."""
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        dedup_key = f"STOCK_LOW:{product.id}:{today_str}"
        subject = f"[Casa Luma Alerta] Estoque baixo: {product.name} ({product.sku})"

        body = (
            f"Olá Administrador do Ateliê Casa Luma,\n\n"
            f"O item '{product.name}' (SKU: {product.sku}) atingiu o limite de estoque mínimo cadastrado.\n\n"
            f"- Saldo Atual: {current_stock} {product.unit.code if product.unit else 'un'}\n"
            f"- Estoque Mínimo Definido: {product.min_stock} {product.unit.code if product.unit else 'un'}\n"
            f"- Tipo de Item: {product.item_type.value}\n\n"
            f"Por favor, verifique a necessidade de emitir compra ou abrir uma nova Ordem de Produção.\n\n"
            f"Ateliê Casa Luma — Gestão de Estoque"
        )

        return cls.send_email(
            db=db,
            event_type="STOCK_LOW",
            recipient=recipient_email,
            subject=subject,
            body_text=body,
            deduplication_key=dedup_key,
        )

    @classmethod
    def notify_zero_stock(
        cls,
        db: Session,
        product: Product,
        recipient_email: str,
    ) -> Dict[str, Any]:
        """Notifica quando um item zera completamente o estoque."""
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        dedup_key = f"STOCK_ZERO:{product.id}:{today_str}"
        subject = f"[Casa Luma URGENTE] Estoque zerado: {product.name} ({product.sku})"

        body = (
            f"Atenção Administrador do Ateliê Casa Luma,\n\n"
            f"O item '{product.name}' (SKU: {product.sku}) está totalmente esgotado (saldo 0).\n\n"
            f"- Tipo de Item: {product.item_type.value}\n"
            f"- Estoque Mínimo Recomendado: {product.min_stock} {product.unit.code if product.unit else 'un'}\n\n"
            f"Ações urgentes podem ser necessárias para evitar pausas na produção artesanal ou cancelamento de pedidos.\n\n"
            f"Ateliê Casa Luma — Gestão de Estoque"
        )

        return cls.send_email(
            db=db,
            event_type="STOCK_ZERO",
            recipient=recipient_email,
            subject=subject,
            body_text=body,
            deduplication_key=dedup_key,
        )

    @classmethod
    def check_and_notify_inventory_alerts(
        cls,
        db: Session,
        recipient_email: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Varre todos os itens ativos do ateliê, calcula o saldo real e emite alertas
        respeitando a deduplicação diária.
        """
        if not recipient_email:
            # Obtém e-mail do primeiro admin ativo ou o remetente padrão
            admin_user = db.execute(
                select(User).where(User.role == "ADMIN", User.is_active == True)
            ).scalars().first()
            recipient_email = admin_user.email if admin_user else settings.EMAIL_FROM

        products = db.execute(
            select(Product).where(Product.is_active == True)
        ).scalars().all()

        results = []
        for prod in products:
            # Cálculo de saldo
            movements = db.execute(
                select(StockMovement.quantity).where(StockMovement.product_id == prod.id)
            ).scalars().all()
            total_stock = sum(movements, Decimal("0.000"))

            if total_stock <= Decimal("0.000"):
                res = cls.notify_zero_stock(db, prod, recipient_email)
                results.append({"product_id": prod.id, "sku": prod.sku, "alert": "ZERO", "result": res})
            elif prod.min_stock and total_stock <= prod.min_stock:
                res = cls.notify_low_stock(db, prod, total_stock, recipient_email)
                results.append({"product_id": prod.id, "sku": prod.sku, "alert": "LOW", "result": res})

        return results
