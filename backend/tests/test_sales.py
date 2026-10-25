from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from app.models.product import Product


def test_sales_flow_draft_atomic_confirmation_and_reversal(
    client: TestClient, admin_token: str, sample_product: Product
):
    # 1. Cadastrar Cliente opcional
    cust_resp = client.post(
        "/api/v1/sales/customers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Maria Silva", "email": "maria@cliente.com.br", "phone": "11988887777"},
    )
    assert cust_resp.status_code == 201
    customer_id = cust_resp.json()["id"]

    # 2. Criar Venda em RASCUNHO (3 unidades a R$ 45.00 cada = R$ 135.00)
    sale_resp = client.post(
        "/api/v1/sales",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "customer_id": customer_id,
            "notes": "Venda presencial no ateliê",
            "items": [
                {"product_id": sample_product.id, "quantity": "3.000", "unit_price": "45.00"}
            ],
        },
    )
    assert sale_resp.status_code == 201
    sale_data = sale_resp.json()
    sale_id = sale_data["id"]
    assert sale_data["status"] == "RASCUNHO"
    assert Decimal(str(sale_data["total_amount"])) == Decimal("135.00")

    # 3. Validar que a venda em rascunho NÃO alterou o estoque
    bal_resp = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    item = next(b for b in bal_resp.json() if b["product_id"] == sample_product.id)
    assert Decimal(str(item["current_stock"])) == Decimal("0.000")

    # 4. Tentar confirmar a venda SEM saldo em estoque -> DEVE FALHAR
    conf_fail = client.post(
        f"/api/v1/sales/{sale_id}/confirm",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert conf_fail.status_code == 400
    assert "Saldo insuficiente" in conf_fail.json()["detail"]

    # 5. Abastecer o produto no estoque (Entrada de 10 unidades)
    client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": sample_product.id, "quantity": "10.000", "justification": "Entrada Estoque"},
    )

    # 6. Confirmar a venda -> SUCESSO E BAIXA ATÔMICA
    conf_ok = client.post(
        f"/api/v1/sales/{sale_id}/confirm",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert conf_ok.status_code == 200
    assert conf_ok.json()["status"] == "CONFIRMADA"

    # 7. Validar novo saldo: 10 - 3 = 7
    bal_after = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    item_after = next(b for b in bal_after.json() if b["product_id"] == sample_product.id)
    assert Decimal(str(item_after["current_stock"])) == Decimal("7.000")

    # 8. Cancelar a venda confirmada -> ESTORNO RASTREÁVEL
    cancel_resp = client.post(
        f"/api/v1/sales/{sale_id}/cancel",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELADA"

    # Saldo deve ter retornado para 10
    bal_restored = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    item_restored = next(b for b in bal_restored.json() if b["product_id"] == sample_product.id)
    assert Decimal(str(item_restored["current_stock"])) == Decimal("10.000")

    # 9. Tentar excluir cliente que tem vínculo com a venda -> 400
    del_cust_fail = client.delete(
        f"/api/v1/sales/customers/{customer_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_cust_fail.status_code == 400

    # 10. Excluir a venda cancelada -> 204
    del_sale_resp = client.delete(
        f"/api/v1/sales/{sale_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_sale_resp.status_code == 204

    # 11. Agora o cliente não possui mais vendas vinculadas -> 204
    del_cust_ok = client.delete(
        f"/api/v1/sales/customers/{customer_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_cust_ok.status_code == 204


def test_delete_confirmed_sale_forbidden(
    client: TestClient, admin_token: str, sample_product: Product
):
    # Dar estoque
    client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": sample_product.id, "quantity": "5.000", "justification": "Entrada"},
    )

    # Criar e confirmar venda
    sale = client.post(
        "/api/v1/sales",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "items": [{"product_id": sample_product.id, "quantity": "1.000", "unit_price": "20.00"}]
        },
    ).json()

    client.post(
        f"/api/v1/sales/{sale['id']}/confirm",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Exclusão direta de venda confirmada -> 400
    del_fail = client.delete(
        f"/api/v1/sales/{sale['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_fail.status_code == 400

