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
