import pytest
from decimal import Decimal
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


def test_delete_product_with_stock_movement_succeeds(client: TestClient, admin_token: str, sample_product: Product):
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

    # Excluir produto mesmo com histórico de movimentações
    del_resp = client.delete(
        f"/api/v1/products/{sample_product.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 204

    # Verificar que o produto foi removido
    get_resp = client.get(
        f"/api/v1/products/{sample_product.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get_resp.status_code == 404



def test_create_and_update_product_color(client: TestClient, admin_token: str, sample_category, sample_unit):
    # Criar produto com cor
    response = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "VELA-LAVANDA-ROXA",
            "name": "Vela Aromática Lavanda Francesa",
            "color": "Lavanda",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "20.0000",
            "sale_price": "55.00",
            "min_stock": "5.000",
        },
    )
    assert response.status_code == 201
    prod_data = response.json()
    assert prod_data["color"] == "Lavanda"

    # Atualizar cor do produto
    prod_id = prod_data["id"]
    upd_resp = client.put(
        f"/api/v1/products/{prod_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"color": "Lavanda Suave"},
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["color"] == "Lavanda Suave"


def test_delete_unit_of_measure(client: TestClient, admin_token: str, sample_unit: UnitOfMeasure, sample_product: Product):
    # 1. Tentar excluir unidade em uso pelo sample_product -> 400
    del_fail = client.delete(
        f"/api/v1/units/{sample_unit.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_fail.status_code == 400
    assert "Não é possível excluir a unidade" in del_fail.json()["detail"]

    # 2. Criar uma nova unidade sem produtos vinculados
    create_resp = client.post(
        "/api/v1/units",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"code": "MLX", "name": "Mililitro Extra", "allows_decimals": True},
    )
    assert create_resp.status_code == 201
    unit_id = create_resp.json()["id"]

    # 3. Excluir a unidade não utilizada -> 204
    del_ok = client.delete(
        f"/api/v1/units/{unit_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_ok.status_code == 204


def test_create_and_update_product_kit(client: TestClient, admin_token: str, sample_category, sample_unit):
    # 1. Criar dois produtos componentes avulsos
    p1_resp = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "ITEM-KIT-A",
            "name": "Vela Canela 150g",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "15.00",
            "sale_price": "40.00",
            "min_stock": "2.000",
        },
    )
    assert p1_resp.status_code == 201
    p1 = p1_resp.json()

    p2_resp = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "ITEM-KIT-B",
            "name": "Home Spray Alecrim 200ml",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "20.00",
            "sale_price": "50.00",
            "min_stock": "2.000",
        },
    )
    assert p2_resp.status_code == 201
    p2 = p2_resp.json()

    # 2. Criar Produto que É Kit composto por 2 Velas e 1 Spray
    kit_resp = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "KIT-PRESENTE-LUXO",
            "name": "Kit Presente Aromas de Luxo",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "50.00",
            "sale_price": "119.90",
            "min_stock": "0.000",
            "is_kit": True,
            "kit_items": [
                {"component_product_id": p1["id"], "quantity": "2.000"},
                {"component_product_id": p2["id"], "quantity": "1.000"},
            ],
        },
    )
    assert kit_resp.status_code == 201
    kit_data = kit_resp.json()
    assert kit_data["is_kit"] is True
    assert len(kit_data["kit_items"]) == 2
    comp_ids = [ki["component_product_id"] for ki in kit_data["kit_items"]]
    assert p1["id"] in comp_ids
    assert p2["id"] in comp_ids

    # 3. Atualizar o Kit (mudar para apenas 1 Vela e 2 Sprays)
    kit_id = kit_data["id"]
    upd_resp = client.put(
        f"/api/v1/products/{kit_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sale_price": "129.90",
            "kit_items": [
                {"component_product_id": p1["id"], "quantity": "1.000"},
                {"component_product_id": p2["id"], "quantity": "2.000"},
            ],
        },
    )
    assert upd_resp.status_code == 200
    upd_data = upd_resp.json()
    assert len(upd_data["kit_items"]) == 2
    for ki in upd_data["kit_items"]:
        if ki["component_product_id"] == p1["id"]:
            assert Decimal(str(ki["quantity"])) == Decimal("1.000")
        if ki["component_product_id"] == p2["id"]:
            assert Decimal(str(ki["quantity"])) == Decimal("2.000")


def test_create_and_update_product_with_variations(
    client: TestClient, admin_token: str, sample_category: Category, sample_unit: UnitOfMeasure
):
    # 1. Cadastrar produto com 2 variações (com cor, tamanho, preço e estoque inicial)
    resp = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "VELA-VAR-TEST",
            "name": "Vela Aromática Teste Variação",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "15.0000",
            "sale_price": "45.00",
            "color": "Lavanda",
            "size": "Padrão",
            "variations": [
                {
                    "variation_name": "Lavanda 100g",
                    "color": "Lavanda",
                    "size": "100g",
                    "sale_price": "39.90",
                    "unit_cost": "12.0000",
                    "initial_stock": "10.000",
                    "min_stock": "2.000",
                },
                {
                    "variation_name": "Lavanda 200g",
                    "color": "Lavanda",
                    "size": "200g",
                    "sale_price": "59.90",
                    "unit_cost": "18.0000",
                    "initial_stock": "5.000",
                    "min_stock": "2.000",
                },
            ],
        },
    )
    assert resp.status_code == 201, resp.text
    prod_data = resp.json()
    assert len(prod_data["variations"]) == 2
    var1 = prod_data["variations"][0]
    var2 = prod_data["variations"][1]
    assert var1["size"] == "100g"
    assert var2["size"] == "200g"
    assert float(var1["current_stock"]) == 10.0
    assert float(var2["current_stock"]) == 5.0
    # O estoque do produto pai deve ser a soma das variações
    assert float(prod_data["current_stock"]) == 15.0

    # 2. Atualizar produto adicionando mais 1 variação
    parent_id = prod_data["id"]
    upd_resp = client.put(
        f"/api/v1/products/{parent_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "variations": [
                {
                    "sku": var1["sku"],
                    "variation_name": var1["variation_name"],
                    "color": var1["color"],
                    "size": var1["size"],
                    "sale_price": "42.00",
                    "unit_cost": "12.0000",
                },
                {
                    "variation_name": "Lavanda 350g",
                    "color": "Lavanda",
                    "size": "350g",
                    "sale_price": "89.90",
                    "unit_cost": "28.0000",
                    "initial_stock": "4.000",
                },
            ],
        },
    )
    assert upd_resp.status_code == 200, upd_resp.text
    upd_data = upd_resp.json()
    assert len(upd_data["variations"]) == 3
    # Exclusão em cascata deve funcionar sem erros de chave estrangeira
    del_resp = client.delete(
        f"/api/v1/products/{parent_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 204


def test_delete_product_keep_variations(
    client: TestClient, admin_token: str, sample_category: Category, sample_unit: UnitOfMeasure
):
    # Criar produto pai com 2 variações
    resp = client.post(
        "/api/v1/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "sku": "PJ-PARENT-01",
            "name": "Porta Joia Teste Pai",
            "item_type": "PRODUTO_ACABADO",
            "category_id": sample_category.id,
            "unit_id": sample_unit.id,
            "unit_cost": "15.00",
            "variations": [
                {
                    "sku": "PJ-VAR-BRANCO",
                    "variation_name": "Branco",
                    "color": "Branco",
                    "sale_price": "35.00",
                    "unit_cost": "15.00",
                    "initial_stock": "5.000",
                },
                {
                    "sku": "PJ-VAR-CINZA",
                    "variation_name": "Cinza",
                    "color": "Cinza",
                    "sale_price": "35.00",
                    "unit_cost": "15.00",
                    "initial_stock": "3.000",
                },
            ],
        },
    )
    assert resp.status_code == 201
    parent_id = resp.json()["id"]
    var_ids = [v["id"] for v in resp.json()["variations"]]
    assert len(var_ids) == 2

    # Excluir apenas o pai mantendo as variações
    del_resp = client.delete(
        f"/api/v1/products/{parent_id}?keep_variations=true",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 204

    # Pai não existe mais
    check_parent = client.get(
        f"/api/v1/products/{parent_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert check_parent.status_code == 404

    # As variações continuam existindo e agora são produtos avulsos (parent_id is null)
    for v_id in var_ids:
        check_var = client.get(
            f"/api/v1/products/{v_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert check_var.status_code == 200
        assert check_var.json()["parent_id"] is None


