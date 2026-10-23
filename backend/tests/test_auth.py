import pytest
from fastapi.testclient import TestClient
from app.models.user import User


def test_login_success(client: TestClient, admin_user: User):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": admin_user.email, "password": "admin123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == admin_user.email
    assert data["user"]["is_admin"] is True


def test_login_wrong_password(client: TestClient, admin_user: User):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": admin_user.email, "password": "senha_errada"},
    )
    assert response.status_code == 401
    assert "E-mail ou senha incorretos" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "naoexiste@casaluma.com.br", "password": "senha"},
    )
    assert response.status_code == 401
    assert "E-mail ou senha incorretos" in response.json()["detail"]


def test_get_me_authenticated(client: TestClient, admin_token: str, admin_user: User):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == admin_user.id
    assert data["email"] == admin_user.email


def test_get_me_unauthenticated(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_admin_create_user(client: TestClient, admin_token: str):
    response = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "novo@casaluma.com.br",
            "password": "senha_segura_123",
            "full_name": "Novo Integrante",
            "is_active": True,
            "is_admin": False,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "novo@casaluma.com.br"
    assert data["is_admin"] is False


def test_regular_user_cannot_create_user(client: TestClient, user_token: str):
    response = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "email": "hacker@casaluma.com.br",
            "password": "senha",
            "full_name": "Hacker",
            "is_active": True,
            "is_admin": True,
        },
    )
    assert response.status_code == 403
