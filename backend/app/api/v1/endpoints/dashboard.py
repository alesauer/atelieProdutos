from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("/metrics")
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Retorna métricas operacionais consolidadas em tempo real para o Dashboard do Ateliê:
    - Status do catálogo e valorização estimada
    - Contadores de estoque zerado e em limite mínimo
    - Movimentações recentes
    - Resumo de vendas e produção dos últimos 30 dias
    - Itens críticos para intervenção rápida
    """
    return DashboardService.get_metrics(db)
