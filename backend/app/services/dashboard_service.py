from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, desc

from app.models.product import Product
from app.models.stock import StockMovement
from app.models.sale import Sale, SaleStatus
from app.models.production import ProductionOrder, ProductionOrderStatus


class DashboardService:
    """
    Consolidador analítico de métricas operacionais para o Dashboard do Ateliê Casa Luma.
    Calcula saldos em tempo real, itens críticos, valorização estimada e histórico recente.
    """

    @classmethod
    def get_metrics(cls, db: Session) -> Dict[str, Any]:
        # 1. Carrega todos os produtos ativos com unidades e categorias
        products = db.execute(
            select(Product).where(Product.is_active == True)
        ).scalars().all()

        total_active_items = len(products)
        items_low_stock = 0
        items_zero_stock = 0
        total_valuation = Decimal("0.00")

        critical_items: List[Dict[str, Any]] = []

        # 2. Calcula saldos por item
        for prod in products:
            movements = db.execute(
                select(StockMovement.quantity).where(StockMovement.product_id == prod.id)
            ).scalars().all()
            balance = sum(movements, Decimal("0.000"))

            # Valorização: saldo atual × custo unitário cadastrado
            unit_cost = prod.unit_cost or Decimal("0.00")
            if balance > Decimal("0.000"):
                total_valuation += (balance * unit_cost)

            # Checagem de criticidade
            min_stk = prod.min_stock or Decimal("0.000")
            is_zero = balance <= Decimal("0.000")
            is_low = not is_zero and (balance <= min_stk)

            if is_zero:
                items_zero_stock += 1
                critical_items.append({
                    "id": prod.id,
                    "sku": prod.sku,
                    "name": prod.name,
                    "item_type": getattr(prod.item_type, "value", str(prod.item_type)),
                    "unit": prod.unit.code if prod.unit else "un",
                    "current_stock": float(balance),
                    "min_stock": float(min_stk),
                    "status": "ZERO",
                })
            elif is_low:
                items_low_stock += 1
                critical_items.append({
                    "id": prod.id,
                    "sku": prod.sku,
                    "name": prod.name,
                    "item_type": getattr(prod.item_type, "value", str(prod.item_type)),
                    "unit": prod.unit.code if prod.unit else "un",
                    "current_stock": float(balance),
                    "min_stock": float(min_stk),
                    "status": "LOW",
                })

        # 3. Movimentações Recentes (últimas 10)
        recent_movements_query = (
            select(StockMovement)
            .order_by(desc(StockMovement.created_at))
            .limit(10)
        )
        recent_movements_db = db.execute(recent_movements_query).scalars().all()
        recent_movements = []
        for m in recent_movements_db:
            recent_movements.append({
                "id": m.id,
                "product_id": m.product_id,
                "product_name": m.product.name if m.product else "Item Desconhecido",
                "product_sku": m.product.sku if m.product else "",
                "movement_type": m.movement_type.value,
                "quantity": float(m.quantity),
                "unit": m.product.unit.code if (m.product and m.product.unit) else "un",
                "created_at": m.created_at.isoformat(),
                "justification": m.justification,
            })

        # 4. Resumo de Vendas nos últimos 30 dias
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        confirmed_sales = db.execute(
            select(Sale).where(
                and_(
                    Sale.status == SaleStatus.CONFIRMADA,
                    Sale.confirmed_at >= thirty_days_ago,
                )
            )
        ).scalars().all()

        total_sales_revenue = sum((s.total_amount for s in confirmed_sales), Decimal("0.00"))
        confirmed_sales_count = len(confirmed_sales)

        draft_sales_count = db.execute(
            select(func.count(Sale.id)).where(Sale.status == SaleStatus.RASCUNHO)
        ).scalar_one()

        # 5. Resumo de Produção nos últimos 30 dias
        completed_orders = db.execute(
            select(ProductionOrder).where(
                and_(
                    ProductionOrder.status == ProductionOrderStatus.CONFIRMADA,
                    ProductionOrder.confirmed_at >= thirty_days_ago,
                )
            )
        ).scalars().all()

        completed_production_count = len(completed_orders)
        total_units_produced = sum((o.planned_quantity for o in completed_orders), Decimal("0.000"))

        draft_orders_count = db.execute(
            select(func.count(ProductionOrder.id)).where(ProductionOrder.status == ProductionOrderStatus.RASCUNHO)
        ).scalar_one()

        return {
            "catalog": {
                "total_active_items": total_active_items,
                "items_low_stock": items_low_stock,
                "items_zero_stock": items_zero_stock,
                "total_valuation": float(round(total_valuation, 2)),
            },
            "critical_items": critical_items[:15],
            "recent_movements": recent_movements,
            "sales_summary": {
                "confirmed_count_30d": confirmed_sales_count,
                "revenue_30d": float(round(total_sales_revenue, 2)),
                "draft_pending_count": draft_sales_count,
            },
            "production_summary": {
                "completed_count_30d": completed_production_count,
                "units_produced_30d": float(total_units_produced),
                "draft_pending_count": draft_orders_count,
            },
        }
