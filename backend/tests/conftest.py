import os
import shutil
import tempfile
from typing import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import get_password_hash, create_access_token
from app.main import app
from app.models.user import User
from app.models.category import Category
from app.models.unit import UnitOfMeasure
from app.models.product import Product, ItemType

# Banco de dados SQLite em memória para execução ultrarrápida dos testes
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_media():
    """Cria e limpa diretório temporário para testes de upload de imagens."""
    temp_dir = tempfile.mkdtemp(prefix="casaluma_test_media_")
    settings.MEDIA_DIR = temp_dir
    os.makedirs(temp_dir, exist_ok=True)
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db: Session) -> User:
    user = User(
        email="admin@casaluma.com.br",
        hashed_password=get_password_hash("admin123"),
        full_name="Administrador Teste",
        is_active=True,
        is_admin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    return create_access_token(data={"sub": str(admin_user.id)})


@pytest.fixture
def regular_user(db: Session) -> User:
    user = User(
        email="operador@casaluma.com.br",
        hashed_password=get_password_hash("operador123"),
        full_name="Operador Ateliê",
        is_active=True,
        is_admin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_token(regular_user: User) -> str:
    return create_access_token(data={"sub": str(regular_user.id)})


@pytest.fixture
def sample_category(db: Session) -> Category:
    cat = Category(name="Velas Artesanais", description="Velas de cera vegetal")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@pytest.fixture
def sample_unit(db: Session) -> UnitOfMeasure:
    unit = UnitOfMeasure(code="UN", name="Unidade", allows_decimals=False)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@pytest.fixture
def sample_product(db: Session, sample_category: Category, sample_unit: UnitOfMeasure) -> Product:
    prod = Product(
        sku="VELA-LAV-01",
        name="Vela Lavanda",
        item_type=ItemType.PRODUTO_ACABADO,
        category_id=sample_category.id,
        unit_id=sample_unit.id,
        unit_cost=15.50,
        sale_price=45.00,
        min_stock=5.0,
        is_active=True,
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod
