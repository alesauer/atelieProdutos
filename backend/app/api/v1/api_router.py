from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    categories,
    units,
    colors,
    materials,
    supplies,
    item_types,
    products,
    stock,
    production,
    sales,
    customers,
    financial,
    dashboard,
    reports,
    system,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(users.router, prefix="/users", tags=["Usuários"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categorias"])
api_router.include_router(units.router, prefix="/units", tags=["Unidades de Medida"])
api_router.include_router(colors.router, prefix="/colors", tags=["Cores dos Produtos"])
api_router.include_router(materials.router, prefix="/materials", tags=["Materiais dos Produtos"])
api_router.include_router(supplies.router, prefix="/supplies", tags=["Insumos & Matérias-Primas"])
api_router.include_router(item_types.router, prefix="/item-types", tags=["Tipos de Itens"])
api_router.include_router(products.router, prefix="/products", tags=["Produtos & Itens"])
api_router.include_router(stock.router, prefix="/stock", tags=["Estoque & Movimentações"])
api_router.include_router(production.router, prefix="/production", tags=["Produção Artesanal"])
api_router.include_router(sales.router, prefix="/sales", tags=["Vendas & Pedidos"])
api_router.include_router(customers.router, prefix="/customers", tags=["Clientes & CRM"])
api_router.include_router(financial.router, prefix="/financial", tags=["Financeiro & DRE"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Relatórios & Notificações"])
api_router.include_router(system.router, prefix="/system", tags=["Sistema & Configurações"])


