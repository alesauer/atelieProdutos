from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.notification import EmailNotificationLog
from app.services.report_service import ReportService
from app.services.email_service import EmailService

router = APIRouter()


@router.get("/stock")
def get_stock_report(
    item_type: Optional[str] = None,
    category_id: Optional[int] = None,
    low_stock_only: bool = False,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Relatório de estoque atual por item/categoria com status de criticidade e valorização estimada.
    Suporta formato JSON e download CSV para Excel.
    """
    data = ReportService.get_stock_report(
        db,
        item_type=item_type,
        category_id=category_id,
        low_stock_only=low_stock_only,
    )

    if format == "csv":
        csv_content = ReportService.export_stock_csv(data)
        filename = f"estoque_casaluma_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return data


@router.get("/movements")
def get_movements_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    product_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Extrato analítico de movimentações com filtros temporais e por operação de negócio.
    """
    data = ReportService.get_movements_report(
        db,
        start_date=start_date,
        end_date=end_date,
        product_id=product_id,
        movement_type=movement_type,
    )

    if format == "csv":
        csv_content = ReportService.export_movements_csv(data)
        filename = f"movimentacoes_casaluma_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return data


@router.get("/sales")
def get_sales_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Relatório de vendas: faturamento consolidado, ticket médio, histórico e ranking de mais vendidos.
    """
    data = ReportService.get_sales_report(
        db,
        start_date=start_date,
        end_date=end_date,
        status=status,
    )

    if format == "csv":
        csv_content = ReportService.export_sales_csv(data)
        filename = f"vendas_casaluma_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return data


@router.get("/production")
def get_production_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Relatório de produção: lotes artesanais finalizados e matérias-primas/embalagens consumidas.
    """
    data = ReportService.get_production_report(
        db,
        start_date=start_date,
        end_date=end_date,
    )

    if format == "csv":
        csv_content = ReportService.export_production_csv(data)
        filename = f"producao_casaluma_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return data


@router.post("/check-alerts")
def trigger_alert_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Varre o estoque atual e dispara notificações de e-mail para itens críticos,
    respeitando a deduplicação de 24 horas.
    """
    results = EmailService.check_and_notify_inventory_alerts(
        db, recipient_email=current_user.email
    )
    return {
        "status": "success",
        "processed_count": len(results),
        "results": results,
    }


@router.get("/notifications-log")
def list_notification_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Lista o histórico recente de e-mails e alertas emitidos ou deduplicados."""
    query = (
        select(EmailNotificationLog)
        .order_by(desc(EmailNotificationLog.sent_at))
        .limit(limit)
    )
    logs = db.execute(query).scalars().all()
    return [
        {
            "id": l.id,
            "event_type": l.event_type,
            "deduplication_key": l.deduplication_key,
            "recipient": l.recipient,
            "subject": l.subject,
            "status": l.status.value,
            "error_message": l.error_message,
            "sent_at": l.sent_at.isoformat(),
        }
        for l in logs
    ]
