from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, categories, units, products

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(users.router, prefix="/users", tags=["Usuários"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categorias"])
api_router.include_router(units.router, prefix="/units", tags=["Unidades de Medida"])
api_router.include_router(products.router, prefix="/products", tags=["Produtos & Itens"])
