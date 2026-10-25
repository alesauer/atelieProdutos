import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.models.product import Product


def _create_test_image_bytes(format="PNG", size=(100, 100), color=(200, 150, 100)) -> bytes:
    """Gera bytes de uma imagem real em memória para testes."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_upload_valid_product_image(client: TestClient, admin_token: str, sample_product: Product):
    img_bytes = _create_test_image_bytes(format="PNG")

    response = client.post(
        f"/api/v1/products/{sample_product.id}/images",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("foto_vela.png", img_bytes, "image/png")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["product_id"] == sample_product.id
    assert data["original_filename"] == "foto_vela.png"
    assert data["is_primary"] is True  # Primeira imagem é automaticamente primária
    assert "url" in data

    # Validar que a imagem aparece nos detalhes do produto
    prod_resp = client.get(
        f"/api/v1/products/{sample_product.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert prod_resp.status_code == 200
    prod_data = prod_resp.json()
    assert len(prod_data["images"]) == 1
    assert prod_data["primary_image_url"] == data["url"]


def test_upload_invalid_file_extension(client: TestClient, admin_token: str, sample_product: Product):
    response = client.post(
        f"/api/v1/products/{sample_product.id}/images",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("malicioso.exe", b"fake binary content", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "Formato de arquivo não suportado" in response.json()["detail"]


def test_upload_fake_image_content(client: TestClient, admin_token: str, sample_product: Product):
    # Extensão .png mas conteúdo é texto simples
    fake_png = b"isto nao eh uma imagem valida"
    response = client.post(
        f"/api/v1/products/{sample_product.id}/images",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("teste_falso.png", fake_png, "image/png")},
    )
    assert response.status_code == 400


def test_set_primary_and_delete_image(client: TestClient, admin_token: str, sample_product: Product):
    img1_bytes = _create_test_image_bytes(format="JPEG", color=(255, 0, 0))
    img2_bytes = _create_test_image_bytes(format="PNG", color=(0, 255, 0))

    # Upload 1
    resp1 = client.post(
        f"/api/v1/products/{sample_product.id}/images",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("foto1.jpg", img1_bytes, "image/jpeg")},
    )
    img1_id = resp1.json()["id"]

    # Upload 2
    resp2 = client.post(
        f"/api/v1/products/{sample_product.id}/images",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("foto2.png", img2_bytes, "image/png")},
    )
    img2_id = resp2.json()["id"]

    # Tornar img2 a foto principal
    set_prim_resp = client.put(
        f"/api/v1/products/{sample_product.id}/images/{img2_id}/primary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert set_prim_resp.status_code == 200
    assert set_prim_resp.json()["is_primary"] is True

    # Excluir img2
    del_resp = client.delete(
        f"/api/v1/products/{sample_product.id}/images/{img2_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 204

    # Verificar que restou apenas 1 imagem e que voltou a ser a principal
    prod_resp = client.get(
        f"/api/v1/products/{sample_product.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    images = prod_resp.json()["images"]
    assert len(images) == 1
    assert images[0]["id"] == img1_id
    assert images[0]["is_primary"] is True


def test_upload_product_images_batch(client: TestClient, admin_token: str, sample_product: Product):
    img1 = _create_test_image_bytes(format="JPEG", color=(100, 100, 200))
    img2 = _create_test_image_bytes(format="PNG", color=(200, 100, 100))

    response = client.post(
        f"/api/v1/products/{sample_product.id}/images/batch",
        headers={"Authorization": f"Bearer {admin_token}"},
        files=[
            ("files", ("foto_batch_1.jpg", img1, "image/jpeg")),
            ("files", ("foto_batch_2.png", img2, "image/png")),
        ],
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 2
    assert data[0]["original_filename"] == "foto_batch_1.jpg"
    assert data[1]["original_filename"] == "foto_batch_2.png"


def test_max_images_limit_per_product(client: TestClient, admin_token: str, sample_product: Product):
    # Upload 10 imagens com sucesso
    for i in range(10):
        img_bytes = _create_test_image_bytes(format="JPEG", color=(i * 20, 100, 150))
        resp = client.post(
            f"/api/v1/products/{sample_product.id}/images",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": (f"foto_{i+1}.jpg", img_bytes, "image/jpeg")},
        )
        assert resp.status_code == 201, f"Falha no upload da foto {i+1}: {resp.text}"

    # Verificar que o produto possui 10 imagens
    prod_resp = client.get(
        f"/api/v1/products/{sample_product.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert len(prod_resp.json()["images"]) == 10

    # Tentar upload da 11ª imagem (deve falhar por limite atingido)
    extra_img = _create_test_image_bytes(format="PNG", color=(255, 255, 255))
    overflow_resp = client.post(
        f"/api/v1/products/{sample_product.id}/images",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("foto_11.png", extra_img, "image/png")},
    )
    assert overflow_resp.status_code == 400
    assert "Limite de imagens atingido" in overflow_resp.json()["detail"]
    assert "10 fotos" in overflow_resp.json()["detail"]


