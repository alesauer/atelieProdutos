from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from app.models.product import Product


def test_stock_entry_and_balance(client: TestClient, admin_token: str, sample_product: Product):
    # Saldo inicial é 0
    resp_init = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp_init.status_code == 200
    balances = resp_init.json()
    item = next(b for b in balances if b["product_id"] == sample_product.id)
    assert Decimal(str(item["current_stock"])) == Decimal("0.000")

    # Registrar entrada de 20 unidades
    entry_resp = client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "product_id": sample_product.id,
            "quantity": "20.000",
            "unit_cost": "16.0000",
            "justification": "Compra NF 1023",
        },
    )
    assert entry_resp.status_code == 201
    assert entry_resp.json()["movement_type"] == "COMPRA"

    # Saldo agora deve ser 20
    resp_after = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    item_after = next(b for b in resp_after.json() if b["product_id"] == sample_product.id)
    assert Decimal(str(item_after["current_stock"])) == Decimal("20.000")


def test_stock_adjustment_with_justification(client: TestClient, admin_token: str, sample_product: Product):
    # Dar entrada de 10
    client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": sample_product.id, "quantity": "10.000", "justification": "Estoque Inicial"},
    )

    # Ajuste manual de -2 com justificativa
    adj_resp = client.post(
        "/api/v1/stock/adjustments",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "product_id": sample_product.id,
            "quantity_delta": "-2.000",
            "justification": "Frasco trincado durante montagem",
        },
    )
    assert adj_resp.status_code == 201
    assert adj_resp.json()["justification"] == "Frasco trincado durante montagem"

    # Saldo final deve ser 8
    resp = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    item = next(b for b in resp.json() if b["product_id"] == sample_product.id)
    assert Decimal(str(item["current_stock"])) == Decimal("8.000")


def test_stock_adjustment_without_justification_fails(client: TestClient, admin_token: str, sample_product: Product):
    adj_resp = client.post(
        "/api/v1/stock/adjustments",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "product_id": sample_product.id,
            "quantity_delta": "5.000",
            "justification": "",  # Vazia
        },
    )
    assert adj_resp.status_code == 422 or adj_resp.status_code == 400


def test_negative_stock_is_blocked(client: TestClient, admin_token: str, sample_product: Product):
    # Saldo atual é 0. Tentar subtrair 5 deve falhar
    adj_resp = client.post(
        "/api/v1/stock/adjustments",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "product_id": sample_product.id,
            "quantity_delta": "-5.000",
            "justification": "Tentativa de saída sem saldo",
        },
    )
    assert adj_resp.status_code == 400
    assert "Saldo insuficiente" in adj_resp.json()["detail"]


def test_stock_balance_excludes_parent_with_variations(
    client: TestClient, admin_token: str, sample_product: Product
):
    # Cadastrar um produto com variações
    prod_resp = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "GARRAF-01",
            "name": "Garrafinha",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_product.category_id,
            "unit_id": sample_product.unit_id,
            "unit_cost": "15.0000",
            "sale_price": "25.00",
            "has_variations": True,
            "variations": [
                {
                    "variation_name": "Branco",
                    "sku": "GARRAF-01-BRANCO",
                    "color": "Branco",
                    "initial_stock": "10.000",
                },
                {
                    "variation_name": "Cinza",
                    "sku": "GARRAF-01-CINZA",
                    "color": "Cinza",
                    "initial_stock": "5.000",
                },
            ],
        },
    )
    assert prod_resp.status_code == 201

    # Consultar saldos de estoque
    resp = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    items = resp.json()

    # O produto pai ('GARRAF-01') NÃO deve aparecer na listagem de estoque para não gerar duplicidade
    assert not any(item["sku"] == "GARRAF-01" for item in items)

    # Cada variação filha deve aparecer individualmente com seu respectivo saldo
    var_branco = next((item for item in items if item["sku"] == "GARRAF-01-BRANCO"), None)
    assert var_branco is not None
    assert Decimal(str(var_branco["current_stock"])) == Decimal("10.000")

    var_cinza = next((item for item in items if item["sku"] == "GARRAF-01-CINZA"), None)
    assert var_cinza is not None
    assert Decimal(str(var_cinza["current_stock"])) == Decimal("5.000")

