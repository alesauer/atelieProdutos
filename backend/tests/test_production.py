from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.unit import UnitOfMeasure
from app.models.product import Product, ItemType


@pytest.fixture
def production_setup(db: Session, sample_category: Category, sample_unit: UnitOfMeasure):
    # Produto Acabado
    finished = Product(
        sku="VELA-CERA-100",
        name="Vela Pura Cera 100g",
        item_type=ItemType.PRODUTO_ACABADO,
        category_id=sample_category.id,
        unit_id=sample_unit.id,
        unit_cost=10.0,
        sale_price=35.0,
        min_stock=2.0,
        is_active=True,
    )
    # Insumo 1: Cera de Soja (KG)
    cera = Product(
        sku="INS-CERA-SOJA",
        name="Cera de Soja Pura",
        item_type=ItemType.MATERIA_PRIMA,
        category_id=sample_category.id,
        unit_id=sample_unit.id,
        unit_cost=20.0,
        min_stock=1.0,
        is_active=True,
    )
    # Insumo 2: Pavio de Algodão (UN)
    pavio = Product(
        sku="INS-PAVIO-ALG",
        name="Pavio de Algodão 15cm",
        item_type=ItemType.MATERIA_PRIMA,
        category_id=sample_category.id,
        unit_id=sample_unit.id,
        unit_cost=0.5,
        min_stock=10.0,
        is_active=True,
    )
    db.add_all([finished, cera, pavio])
    db.commit()
    return {"finished": finished, "cera": cera, "pavio": pavio}


def test_production_flow_draft_and_atomic_confirmation(
    client: TestClient, admin_token: str, production_setup: dict
):
    finished = production_setup["finished"]
    cera = production_setup["cera"]
    pavio = production_setup["pavio"]

    # 1. Criar Ficha Técnica (Para fazer 1 Vela precisa de 0.100 KG cera e 1 UN pavio)
    recipe_resp = client.post(
        "/api/v1/production/recipes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "product_id": finished.id,
            "name": "Receita Padrão Vela 100g",
            "yield_quantity": "1.000",
            "items": [
                {"component_product_id": cera.id, "standard_quantity": "0.100"},
                {"component_product_id": pavio.id, "standard_quantity": "1.000"},
            ],
        },
    )
    assert recipe_resp.status_code == 201
    recipe_id = recipe_resp.json()["id"]

    # 2. Criar Ordem de Produção em RASCUNHO para 10 velas
    order_resp = client.post(
        "/api/v1/production/orders",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "product_id": finished.id,
            "recipe_id": recipe_id,
            "planned_quantity": "10.000",
            "notes": "Lote matinal de teste",
        },
    )
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    order_id = order_data["id"]
    assert order_data["status"] == "RASCUNHO"
    assert len(order_data["items"]) == 2

    # 3. Validar que o rascunho NÃO alterou o estoque
    bal_resp = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    for b in bal_resp.json():
        if b["product_id"] in [finished.id, cera.id, pavio.id]:
            assert Decimal(str(b["current_stock"])) == Decimal("0.000")

    # 4. Tentar confirmar a ordem SEM ter os insumos em estoque -> DEVE FALHAR ATOMICAMENTE
    conf_fail = client.post(
        f"/api/v1/production/orders/{order_id}/confirm",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert conf_fail.status_code == 400
    assert "Saldo insuficiente" in conf_fail.json()["detail"]

    # 5. Abastecer os insumos no estoque (Compra de 5 KG de cera e 50 pavios)
    client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": cera.id, "quantity": "5.000", "justification": "Compra Cera"},
    )
    client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": pavio.id, "quantity": "50.000", "justification": "Compra Pavios"},
    )

    # 6. Confirmar a ordem com insumos suficientes -> SUCESSO ATÔMICO
    conf_ok = client.post(
        f"/api/v1/production/orders/{order_id}/confirm",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert conf_ok.status_code == 200
    assert conf_ok.json()["status"] == "CONFIRMADA"

    # 7. Validar novo saldo:
    # 10 velas entraram no estoque
    # Cera: 5.000 - (10 * 0.100) = 4.000
    # Pavio: 50 - 10 = 40
    bal_after = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    b_map = {b["product_id"]: Decimal(str(b["current_stock"])) for b in bal_after.json()}
    assert b_map[finished.id] == Decimal("10.000")
    assert b_map[cera.id] == Decimal("4.000")
    assert b_map[pavio.id] == Decimal("40.000")

    # 8. Cancelar a ordem de produção confirmada -> REVERSÃO ATÔMICA RASTREÁVEL
    cancel_resp = client.post(
        f"/api/v1/production/orders/{order_id}/cancel",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELADA"

    # Saldos devem ter voltado ao estado antes da produção
    bal_restored = client.get("/api/v1/stock/balance", headers={"Authorization": f"Bearer {admin_token}"})
    r_map = {b["product_id"]: Decimal(str(b["current_stock"])) for b in bal_restored.json()}
    assert r_map[finished.id] == Decimal("0.000")
    assert r_map[cera.id] == Decimal("5.000")
    assert r_map[pavio.id] == Decimal("50.000")

    # 9. Agora que a ordem está CANCELADA, podemos excluí-la
    del_order_resp = client.delete(
        f"/api/v1/production/orders/{order_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_order_resp.status_code == 204

    # Limpar quaisquer ordens em rascunho criadas automaticamente pelo alerta de estoque
    orders_resp = client.get("/api/v1/production/orders", headers={"Authorization": f"Bearer {admin_token}"})
    for o in orders_resp.json():
        if o["recipe_id"] == recipe_id:
            client.delete(f"/api/v1/production/orders/{o['id']}", headers={"Authorization": f"Bearer {admin_token}"})

    # 10. E agora podemos excluir a receita sem erros
    del_recipe_resp = client.delete(
        f"/api/v1/production/recipes/{recipe_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_recipe_resp.status_code == 204


def test_delete_confirmed_order_forbidden(
    client: TestClient, admin_token: str, production_setup: dict
):
    finished = production_setup["finished"]
    cera = production_setup["cera"]
    pavio = production_setup["pavio"]

    # Dar saldo via stock/entries
    client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": cera.id, "quantity": "5.000", "justification": "Entrada teste"},
    )
    client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": pavio.id, "quantity": "10.000", "justification": "Entrada teste"},
    )

    # Criar receita
    rec = client.post(
        "/api/v1/production/recipes",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "product_id": finished.id,
            "name": "Receita Teste Delete",
            "yield_quantity": "1.000",
            "items": [
                {"component_product_id": cera.id, "standard_quantity": "0.100"},
                {"component_product_id": pavio.id, "standard_quantity": "1.000"},
            ],
        },
    ).json()

    # Criar e confirmar ordem
    ord_resp = client.post(
        "/api/v1/production/orders",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"product_id": finished.id, "recipe_id": rec["id"], "planned_quantity": "2.000"},
    ).json()

    conf_resp = client.post(
        f"/api/v1/production/orders/{ord_resp['id']}/confirm",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert conf_resp.status_code == 200

    # Tentativa de excluir ordem confirmada diretamente -> 400
    del_fail = client.delete(
        f"/api/v1/production/orders/{ord_resp['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_fail.status_code == 400

    # Tentativa de excluir receita com ordem ativa -> 400
    del_rec_fail = client.delete(
        f"/api/v1/production/recipes/{rec['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_rec_fail.status_code == 400


def test_auto_create_draft_orders_for_low_stock(
    client: TestClient, admin_token: str, production_setup: dict, db: Session
):
    from app.services.production_service import production_service

    finished = production_setup["finished"]
    # Saldo atual de 'finished' é 0 (que é <= 5, disparando alerta de produção)
    orders = production_service.auto_create_draft_orders_for_low_stock(db)
    assert len(orders) >= 1
    draft_order = next((o for o in orders if o.product_id == finished.id), None)
    assert draft_order is not None
    assert draft_order.status.value == "RASCUNHO"
    assert "Alerta de Produção" in draft_order.notes
    assert draft_order.planned_quantity >= Decimal("5.000")

    # Segunda chamada não deve duplicar o rascunho
    orders_second_call = production_service.auto_create_draft_orders_for_low_stock(db)
    duplicate = [o for o in orders_second_call if o.product_id == finished.id]
    assert len(duplicate) == 0

