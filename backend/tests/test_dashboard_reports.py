from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.product import Product, ItemType
from app.models.category import Category
from app.models.unit import UnitOfMeasure
from app.models.stock import StockMovement, MovementType
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.production import ProductionOrder, ProductionOrderItem, ProductionOrderStatus
from app.services.email_service import EmailService


def test_dashboard_metrics_empty(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/dashboard/metrics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "catalog" in data
    assert "critical_items" in data
    assert "recent_movements" in data
    assert "sales_summary" in data
    assert "production_summary" in data
    assert data["catalog"]["total_active_items"] == 0


def test_dashboard_metrics_with_stock_and_critical_items(
    client: TestClient,
    admin_token: str,
    db: Session,
    sample_product: Product,
    sample_category: Category,
    sample_unit: UnitOfMeasure,
):
    # Produto 1 (sample_product): Saldo 2 (Abaixo do min_stock=5) -> Deve estar em critical_items (LOW)
    m1 = StockMovement(
        product_id=sample_product.id,
        movement_type=MovementType.ENTRADA_INICIAL,
        quantity=Decimal("2.000"),
        unit_cost_at_moment=Decimal("15.5000"),
    )
    db.add(m1)

    # Produto 2: Saldo 0 -> Deve estar em critical_items (ZERO)
    prod2 = Product(
        sku="CERA-SOJA-01",
        name="Cera de Soja",
        item_type=ItemType.MATERIA_PRIMA,
        category_id=sample_category.id,
        unit_id=sample_unit.id,
        unit_cost=Decimal("25.00"),
        min_stock=Decimal("10.0"),
        is_active=True,
    )
    db.add(prod2)
    db.commit()

    response = client.get(
        "/api/v1/dashboard/metrics",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["catalog"]["total_active_items"] == 2
    assert data["catalog"]["items_low_stock"] == 1
    assert data["catalog"]["items_zero_stock"] == 1
    # Valorização: 2 * 15.50 = 31.00
    assert data["catalog"]["total_valuation"] == 31.00
    assert len(data["recent_movements"]) >= 1


def test_stock_report_json_and_csv(
    client: TestClient,
    admin_token: str,
    db: Session,
    sample_product: Product,
):
    # JSON
    res_json = client.get(
        "/api/v1/reports/stock?format=json",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_json.status_code == 200
    items = res_json.json()
    assert len(items) == 1
    assert items[0]["sku"] == sample_product.sku
    assert items[0]["status"] == "ZERADO"

    # CSV
    res_csv = client.get(
        "/api/v1/reports/stock?format=csv",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "attachment; filename=" in res_csv.headers["content-disposition"]
    # Verifica cabeçalho do CSV
    assert "SKU;Nome do Item;Categoria" in res_csv.text
    assert sample_product.sku in res_csv.text


def test_movements_report_json_and_csv(
    client: TestClient,
    admin_token: str,
    db: Session,
    sample_product: Product,
):
    m = StockMovement(
        product_id=sample_product.id,
        movement_type=MovementType.COMPRA,
        quantity=Decimal("10.000"),
        unit_cost_at_moment=Decimal("15.5000"),
        justification="NF 12345",
    )
    db.add(m)
    db.commit()

    # JSON
    res_json = client.get(
        "/api/v1/reports/movements?format=json",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_json.status_code == 200
    movs = res_json.json()
    assert len(movs) >= 1
    assert movs[0]["sku"] == sample_product.sku
    assert movs[0]["justification"] == "NF 12345"

    # CSV
    res_csv = client.get(
        "/api/v1/reports/movements?format=csv",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_csv.status_code == 200
    assert "NF 12345" in res_csv.text


def test_sales_and_production_reports(
    client: TestClient,
    admin_token: str,
    db: Session,
    sample_product: Product,
):
    # Registra uma venda confirmada
    sale = Sale(
        sale_number="VD-TEST-001",
        status=SaleStatus.CONFIRMADA,
        total_amount=Decimal("90.00"),
    )
    db.add(sale)
    db.flush()

    sale_item = SaleItem(
        sale_id=sale.id,
        product_id=sample_product.id,
        quantity=Decimal("2.000"),
        unit_price=Decimal("45.00"),
        total_price=Decimal("90.00"),
    )
    db.add(sale_item)

    # Registra uma ordem de produção confirmada
    order = ProductionOrder(
        order_number="OP-TEST-001",
        status=ProductionOrderStatus.CONFIRMADA,
        product_id=sample_product.id,
        planned_quantity=Decimal("5.000"),
    )
    db.add(order)
    db.commit()

    # Relatório de vendas
    res_sales = client.get(
        "/api/v1/reports/sales?format=json",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_sales.status_code == 200
    s_data = res_sales.json()
    assert s_data["summary"]["total_revenue"] == 90.00
    assert len(s_data["top_products"]) == 1
    assert s_data["top_products"][0]["sku"] == sample_product.sku

    # Relatório de produção
    res_prod = client.get(
        "/api/v1/reports/production?format=json",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_prod.status_code == 200
    p_data = res_prod.json()
    assert p_data["summary"]["completed_orders"] == 1
    assert p_data["summary"]["total_finished_units"] == 5.0


def test_email_service_deduplication(
    client: TestClient,
    admin_token: str,
    db: Session,
    sample_product: Product,
):
    # Configura driver como mock para inspecionar outbox
    settings.EMAIL_DRIVER = "mock"
    EmailService.mock_outbox.clear()

    # 1º disparo de alerta de estoque zerado
    res1 = EmailService.notify_zero_stock(db, sample_product, "admin@casaluma.com.br")
    assert res1["status"] in ["MOCK", "SENT"]
    assert len(EmailService.mock_outbox) == 1

    # 2º disparo imediato para o mesmo produto no mesmo dia -> DEVE DEDUPLICAR (status SKIPPED)
    res2 = EmailService.notify_zero_stock(db, sample_product, "admin@casaluma.com.br")
    assert res2["status"] == "SKIPPED"
    # Não adicionou outro e-mail na caixa de saída
    assert len(EmailService.mock_outbox) == 1

    # Consulta endpoint de log de notificações
    res_logs = client.get(
        "/api/v1/reports/notifications-log",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_logs.status_code == 200
    logs = res_logs.json()
    assert len(logs) >= 2  # O primeiro SENT/MOCK e o segundo SKIPPED
