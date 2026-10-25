import pytest
from fastapi.testclient import TestClient
from app.models.category import Category
from app.models.unit import UnitOfMeasure
from app.models.product import Product


def test_create_category(client: TestClient, admin_token: str):
    response = client.post(
        "/api/v1/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Aromaterapia", "description": "Óleos e difusores"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Aromaterapia"
    assert data["id"] is not None


def test_list_categories_seeds_initial_categories(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    names = [c["name"] for c in data]
    assert "Kit" in names
    assert "Peças Individuais" in names
    assert "Peças Únicas" in names


def test_create_unit(client: TestClient, admin_token: str):
    response = client.post(
        "/api/v1/units",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"code": "KG", "name": "Quilograma", "allows_decimals": True},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "KG"
    assert data["allows_decimals"] is True


def test_create_product(client: TestClient, admin_token: str, sample_category: Category, sample_unit: UnitOfMeasure):
    response = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "VELA-BAUNILHA-180",
            "name": "Vela Baunilha Nobre 180g",
            "description": "Cera vegetal com notas doces de baunilha de Madagascar",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "18.0000",
            "sale_price": "52.00",
            "min_stock": "8.000",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["sku"] == "VELA-BAUNILHA-180"
    assert data["name"] == "Vela Baunilha Nobre 180g"
    assert data["category"]["id"] == sample_category.id
    assert data["unit"]["id"] == sample_unit.id


def test_create_product_duplicate_sku(client: TestClient, admin_token: str, sample_product: Product):
    response = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": sample_product.sku,  # SKU idêntico
            "name": "Outro Produto com Mesmo SKU",
            "item_type": "PRODUTO_ACABADO",
            "unit_id": sample_product.unit_id,
            "unit_cost": "10.0000",
            "min_stock": "1.000",
        },
    )
    assert response.status_code == 400
    assert "já está em uso" in response.json()["detail"]


def test_list_products_and_search(client: TestClient, admin_token: str, sample_product: Product):
    # Buscar por nome parcial
    response = client.get(
        "/api/v1/products?search=lavanda",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["sku"] == sample_product.sku

    # Buscar por algo inexistente
    response_empty = client.get(
        "/api/v1/products?search=inexistente_xyz",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response_empty.status_code == 200
    assert len(response_empty.json()) == 0


def test_toggle_product_status(client: TestClient, admin_token: str, sample_product: Product):
    response = client.put(
        f"/api/v1/products/{sample_product.id}/status?is_active=false",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_create_and_update_product_cost_breakdown(
    client: TestClient, admin_token: str, sample_category: Category, sample_unit: UnitOfMeasure
):
    breakdown_json = '[{"id":"1","name":"Cera de Coco","quantity":2,"unit_cost":12.5,"total":25.0}]'
    # Create product with cost breakdown
    response = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "VELA-COCO-200",
            "name": "Vela Coco 200g",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "25.0000",
            "cost_breakdown": breakdown_json,
            "min_stock": "5.000",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["cost_breakdown"] == breakdown_json
    product_id = data["id"]

    # Update cost breakdown
    updated_breakdown = '[{"id":"1","name":"Cera de Coco","quantity":3,"unit_cost":12.5,"total":37.5}]'
    update_response = client.put(
        f"/api/v1/products/{product_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "unit_cost": "37.5000",
            "cost_breakdown": updated_breakdown,
        },
    )
    assert update_response.status_code == 200
    updated_data = update_response.json()
    assert updated_data["cost_breakdown"] == updated_breakdown
    assert float(updated_data["unit_cost"]) == 37.5


def test_create_and_update_product_sales_links(
    client: TestClient, admin_token: str, sample_category: Category, sample_unit: UnitOfMeasure
):
    links_json = '[{"id":"1","platform":"Mercado Livre","url":"https://mercadolivre.com.br/anuncio-123"},{"id":"2","platform":"Shopee","url":"https://shopee.com.br/produto-456"}]'
    # Create product with marketplace sales links
    response = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "VELA-MARKETPLACE-1",
            "name": "Vela Multicanal 200g",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "15.0000",
            "sales_links": links_json,
            "min_stock": "2.000",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["sales_links"] == links_json
    product_id = data["id"]

    # Update sales links
    updated_links = '[{"id":"1","platform":"Elo7","url":"https://elo7.com.br/artesanato-789"}]'
    update_response = client.put(
        f"/api/v1/products/{product_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sales_links": updated_links,
        },
    )
    assert update_response.status_code == 200
    updated_data = update_response.json()
    assert updated_data["sales_links"] == updated_links


def test_delete_product_success(client: TestClient, admin_token: str, sample_category: Category, sample_unit: UnitOfMeasure):
    # Criar produto para exclusão
    response = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "ITEM-TEMP-EXCLUIR",
            "name": "Item Temporario Para Excluir",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "10.0000",
            "min_stock": "1.000",
        },
    )
    assert response.status_code == 201
    product_id = response.json()["id"]

    # Excluir produto
    del_resp = client.delete(
        f"/api/v1/products/{product_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 204

    # Verificar que não existe mais
    get_resp = client.get(
        f"/api/v1/products/{product_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get_resp.status_code == 404


def test_delete_product_with_stock_movement_fails(client: TestClient, admin_token: str, sample_product: Product):
    # Registrar movimentação de estoque
    entry_resp = client.post(
        "/api/v1/stock/entries",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "product_id": sample_product.id,
            "quantity": "5.000",
            "unit_cost": "10.0000",
            "justification": "Entrada de teste",
        },
    )
    assert entry_resp.status_code == 201

    # Tentar excluir produto com histórico de estoque
    del_resp = client.delete(
        f"/api/v1/products/{sample_product.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 400
    assert "Não é possível excluir" in del_resp.json()["detail"]
    assert "movimentação(ões) de estoque associadas" in del_resp.json()["detail"]


