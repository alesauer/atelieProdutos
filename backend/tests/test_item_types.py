from fastapi.testclient import TestClient
from app.models.unit import UnitOfMeasure


def test_list_item_types_seeds_defaults(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/item-types",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 4
    codes = [item["code"] for item in data]
    assert "PRODUTO_ACABADO" in codes
    assert "MATERIA_PRIMA" in codes
    assert "EMBALAGEM" in codes
    assert "MATERIAL_AUXILIAR" in codes


def test_create_custom_item_type(client: TestClient, admin_token: str, sample_unit: UnitOfMeasure):
    response = client.post(
        "/api/v1/item-types",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Acessório Decorativo",
            "code": "ACESSORIO_DECORATIVO",
            "description": "Porta-velas, bandejas e abafadores artesanais",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Acessório Decorativo"
    assert data["code"] == "ACESSORIO_DECORATIVO"
    assert data["is_system"] is False

    # Testa criação de produto usando esse novo tipo customizado
    prod_resp = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "ACESS-001",
            "name": "Bandeja de Concreto Oval",
            "item_type": "ACESSORIO_DECORATIVO",
            "unit_id": sample_unit.id,
            "unit_cost": 15.50,
            "sale_price": 45.00,
            "min_stock": 2,
        },
    )
    assert prod_resp.status_code == 201
    prod_data = prod_resp.json()
    assert prod_data["item_type"] == "ACESSORIO_DECORATIVO"
