import csv
import io
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, desc, func

from app.models.product import Product, ItemType
from app.models.category import Category
from app.models.stock import StockMovement, MovementType
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.production import ProductionOrder, ProductionOrderItem, ProductionOrderStatus


class ReportService:
    """
    Motor analítico e gerador de relatórios corporativos com exportação para CSV
    formatado com UTF-8 BOM e delimitador compatível com Excel e LibreOffice.
    """

    @classmethod
    def get_stock_report(
        cls,
        db: Session,
        item_type: Optional[str] = None,
        category_id: Optional[int] = None,
        low_stock_only: bool = False,
    ) -> List[Dict[str, Any]]:
        query = select(Product).where(Product.is_active == True)
        if item_type:
            query = query.where(Product.item_type == item_type)
        if category_id:
            query = query.where(Product.category_id == category_id)

        products = db.execute(query).scalars().all()
        report_data = []

        for prod in products:
            movements = db.execute(
                select(StockMovement.quantity).where(StockMovement.product_id == prod.id)
            ).scalars().all()
            balance = sum(movements, Decimal("0.000"))
            min_stk = prod.min_stock or Decimal("0.000")
            unit_cost = prod.unit_cost or Decimal("0.00")
            valuation = balance * unit_cost if balance > Decimal("0.000") else Decimal("0.00")

            if balance <= Decimal("0.000"):
                status = "ZERADO"
            elif min_stk and balance <= min_stk:
                status = "BAIXO"
            else:
                status = "NORMAL"

            if low_stock_only and status == "NORMAL":
                continue

            report_data.append({
                "product_id": prod.id,
                "sku": prod.sku,
                "name": prod.name,
                "category": prod.category.name if prod.category else "Sem Categoria",
                "item_type": getattr(prod.item_type, "value", str(prod.item_type)),
                "unit": prod.unit.code if prod.unit else "un",
                "current_stock": float(balance),
                "min_stock": float(min_stk),
                "unit_cost": float(round(unit_cost, 2)),
                "valuation": float(round(valuation, 2)),
                "status": status,
            })

        # Ordena alfabeticamente por nome
        report_data.sort(key=lambda x: x["name"])
        return report_data

    @classmethod
    def export_stock_csv(cls, data: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        # Escreve BOM UTF-8 para compatibilidade perfeita no Excel
        output.write("\ufeff")
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

        writer.writerow([
            "SKU",
            "Nome do Item",
            "Categoria",
            "Tipo",
            "Unidade",
            "Saldo Atual",
            "Estoque Mínimo",
            "Custo Unitário (R$)",
            "Valorização Estimada (R$)",
            "Status",
        ])

        for row in data:
            writer.writerow([
                row["sku"],
                row["name"],
                row["category"],
                row["item_type"],
                row["unit"],
                f"{row['current_stock']:.3f}".replace(".", ","),
                f"{row['min_stock']:.3f}".replace(".", ","),
                f"{row['unit_cost']:.2f}".replace(".", ","),
                f"{row['valuation']:.2f}".replace(".", ","),
                row["status"],
            ])

        return output.getvalue()

    @classmethod
    def get_movements_report(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        product_id: Optional[int] = None,
        movement_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = select(StockMovement).order_by(desc(StockMovement.created_at))

        if start_date:
            query = query.where(StockMovement.created_at >= start_date)
        if end_date:
            query = query.where(StockMovement.created_at <= end_date)
        if product_id:
            query = query.where(StockMovement.product_id == product_id)
        if movement_type:
            query = query.where(StockMovement.movement_type == movement_type)

        movements = db.execute(query).scalars().all()
        results = []

        for m in movements:
            results.append({
                "id": m.id,
                "created_at": m.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "sku": m.product.sku if m.product else "",
                "product_name": m.product.name if m.product else "Desconhecido",
                "movement_type": m.movement_type.value,
                "quantity": float(m.quantity),
                "unit": m.product.unit.code if (m.product and m.product.unit) else "un",
                "unit_cost": float(m.unit_cost_at_moment or 0.0),
                "user": m.user.full_name if m.user else "Sistema",
                "reference": f"{m.reference_type or ''} #{m.reference_id or ''}".strip(),
                "justification": m.justification or "",
            })

        return results

    @classmethod
    def export_movements_csv(cls, data: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        output.write("\ufeff")
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

        writer.writerow([
            "ID",
            "Data e Hora",
            "SKU",
            "Item",
            "Tipo Movimentação",
            "Quantidade",
            "Unidade",
            "Custo Unitário no Momento (R$)",
            "Responsável",
            "Referência Origem",
            "Justificativa / Motivo",
        ])

        for row in data:
            writer.writerow([
                row["id"],
                row["created_at"],
                row["sku"],
                row["product_name"],
                row["movement_type"],
                f"{row['quantity']:.3f}".replace(".", ","),
                row["unit"],
                f"{row['unit_cost']:.2f}".replace(".", ","),
                row["user"],
                row["reference"],
                row["justification"],
            ])

        return output.getvalue()

    @classmethod
    def get_sales_report(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        query = select(Sale).order_by(desc(Sale.created_at))

        if start_date:
            query = query.where(Sale.created_at >= start_date)
        if end_date:
            query = query.where(Sale.created_at <= end_date)
        if status:
            query = query.where(Sale.status == status)

        sales = db.execute(query).scalars().all()

        total_revenue = Decimal("0.00")
        confirmed_count = 0
        sales_list = []
        product_sales_map: Dict[int, Dict[str, Any]] = {}

        for s in sales:
            if s.status == SaleStatus.CONFIRMADA:
                total_revenue += s.total_amount
                confirmed_count += 1

                # Consolida produtos mais vendidos
                for item in s.items:
                    pid = item.product_id
                    if pid not in product_sales_map:
                        product_sales_map[pid] = {
                            "sku": item.product.sku if item.product else "",
                            "name": item.product.name if item.product else "Item Desconhecido",
                            "total_quantity": Decimal("0.000"),
                            "total_revenue": Decimal("0.00"),
                        }
                    product_sales_map[pid]["total_quantity"] += item.quantity
                    product_sales_map[pid]["total_revenue"] += item.total_price

            sales_list.append({
                "id": s.id,
                "sale_code": s.sale_number,
                "created_at": s.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "status": s.status.value,
                "customer_name": s.customer.name if s.customer else (s.notes or "Consumidor Final"),
                "total_items": len(s.items),
                "total_amount": float(round(s.total_amount, 2)),
            })

        top_products = [
            {
                "sku": v["sku"],
                "name": v["name"],
                "quantity": float(v["total_quantity"]),
                "revenue": float(round(v["total_revenue"], 2)),
            }
            for v in product_sales_map.values()
        ]
        top_products.sort(key=lambda x: x["revenue"], reverse=True)

        return {
            "summary": {
                "total_sales_count": len(sales),
                "confirmed_count": confirmed_count,
                "total_revenue": float(round(total_revenue, 2)),
                "average_ticket": float(round(total_revenue / confirmed_count, 2)) if confirmed_count > 0 else 0.0,
            },
            "sales": sales_list,
            "top_products": top_products[:10],
        }

    @classmethod
    def export_sales_csv(cls, sales_data: Dict[str, Any]) -> str:
        output = io.StringIO()
        output.write("\ufeff")
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

        writer.writerow(["RESUMO DE VENDAS"])
        writer.writerow(["Vendas Totais", sales_data["summary"]["total_sales_count"]])
        writer.writerow(["Vendas Confirmadas", sales_data["summary"]["confirmed_count"]])
        writer.writerow(["Faturamento Total (R$)", f"{sales_data['summary']['total_revenue']:.2f}".replace(".", ",")])
        writer.writerow(["Ticket Médio (R$)", f"{sales_data['summary']['average_ticket']:.2f}".replace(".", ",")])
        writer.writerow([])

        writer.writerow(["LISTAGEM DE VENDAS"])
        writer.writerow(["Código", "Data/Hora", "Status", "Cliente", "Itens", "Total (R$)"])
        for s in sales_data["sales"]:
            writer.writerow([
                s["sale_code"],
                s["created_at"],
                s["status"],
                s["customer_name"],
                s["total_items"],
                f"{s['total_amount']:.2f}".replace(".", ","),
            ])

        writer.writerow([])
        writer.writerow(["PRODUTOS MAIS VENDIDOS"])
        writer.writerow(["SKU", "Produto", "Quantidade Vendida", "Faturamento Acumulado (R$)"])
        for p in sales_data["top_products"]:
            writer.writerow([
                p["sku"],
                p["name"],
                f"{p['quantity']:.3f}".replace(".", ","),
                f"{p['revenue']:.2f}".replace(".", ","),
            ])

        return output.getvalue()

    @classmethod
    def get_production_report(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        query = select(ProductionOrder).order_by(desc(ProductionOrder.created_at))

        if start_date:
            query = query.where(ProductionOrder.created_at >= start_date)
        if end_date:
            query = query.where(ProductionOrder.created_at <= end_date)

        orders = db.execute(query).scalars().all()

        orders_list = []
        raw_materials_consumed: Dict[int, Dict[str, Any]] = {}
        completed_count = 0
        total_finished_produced = Decimal("0.000")

        for o in orders:
            if o.status == ProductionOrderStatus.CONFIRMADA:
                completed_count += 1
                total_finished_produced += o.planned_quantity

                for item in o.items:
                    cid = item.component_product_id
                    if cid not in raw_materials_consumed:
                        raw_materials_consumed[cid] = {
                            "sku": item.component.sku if item.component else "",
                            "name": item.component.name if item.component else "Insumo",
                            "unit": item.component.unit.code if (item.component and item.component.unit) else "un",
                            "total_consumed": Decimal("0.000"),
                        }
                    raw_materials_consumed[cid]["total_consumed"] += (item.actual_quantity or Decimal("0.000"))

            orders_list.append({
                "id": o.id,
                "order_number": o.order_number,
                "created_at": o.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "status": o.status.value,
                "product_name": o.product.name if o.product else "Desconhecido",
                "product_sku": o.product.sku if o.product else "",
                "quantity": float(o.planned_quantity),
                "unit": o.product.unit.code if (o.product and o.product.unit) else "un",
                "notes": o.notes or "",
            })

        consumed_materials = [
            {
                "sku": v["sku"],
                "name": v["name"],
                "unit": v["unit"],
                "quantity": float(v["total_consumed"]),
            }
            for v in raw_materials_consumed.values()
        ]
        consumed_materials.sort(key=lambda x: x["quantity"], reverse=True)

        return {
            "summary": {
                "total_orders": len(orders),
                "completed_orders": completed_count,
                "total_finished_units": float(total_finished_produced),
            },
            "orders": orders_list,
            "raw_materials_consumed": consumed_materials,
        }

    @classmethod
    def export_production_csv(cls, prod_data: Dict[str, Any]) -> str:
        output = io.StringIO()
        output.write("\ufeff")
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

        writer.writerow(["RESUMO DE PRODUÇÃO"])
        writer.writerow(["Ordens Totais", prod_data["summary"]["total_orders"]])
        writer.writerow(["Ordens Concluídas", prod_data["summary"]["completed_orders"]])
        writer.writerow(["Total de Produtos Acabados Fabricados", f"{prod_data['summary']['total_finished_units']:.3f}".replace(".", ",")])
        writer.writerow([])

        writer.writerow(["ORDENS DE FABRICAÇÃO"])
        writer.writerow(["Ordem #", "Data Criação", "Status", "Produto Acabado", "SKU", "Quantidade", "Unidade", "Observações"])
        for o in prod_data["orders"]:
            writer.writerow([
                o["order_number"],
                o["created_at"],
                o["status"],
                o["product_name"],
                o["product_sku"],
                f"{o['quantity']:.3f}".replace(".", ","),
                o["unit"],
                o["notes"],
            ])

        writer.writerow([])
        writer.writerow(["MATÉRIAS-PRIMAS E EMBALAGENS CONSUMIDAS"])
        writer.writerow(["SKU", "Componente/Insumo", "Unidade", "Quantidade Consumida"])
        for m in prod_data["raw_materials_consumed"]:
            writer.writerow([
                m["sku"],
                m["name"],
                m["unit"],
                f"{m['quantity']:.3f}".replace(".", ","),
            ])

        return output.getvalue()
