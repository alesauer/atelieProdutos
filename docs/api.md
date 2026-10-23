# Casa Luma Estoque — Contratos e Especificação da API REST

Este documento define as convenções, padrões de resposta, tratamento de erros e a listagem exaustiva de endpoints da API REST do **Casa Luma Estoque**.

---

## 1. Padrões Globais da API

- **Base URL:** `/api/v1`
- **Formato de Dados:** `application/json; charset=utf-8` (exceto uploads multipart)
- **Autenticação:** Bearer Token no cabeçalho HTTP:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Padrão de Resposta de Erro:**
  ```json
  {
    "detail": "Descrição clara do erro em português (pt-BR)",
    "code": "CODIGO_DE_ERRO",
    "fields": [
      {
        "field": "nome_do_campo",
        "message": "Mensagem específica de validação"
      }
    ]
  }
  ```
- **Paginação Padronizada:**
  Para listagens com paginação, os parâmetros de consulta são `page` (padrão `1`) e `page_size` (padrão `20`, máx `100`).
  Envelope de retorno:
  ```json
  {
    "items": [...],
    "total": 142,
    "page": 1,
    "page_size": 20,
    "total_pages": 8
  }
  ```

---

## 2. Matriz de Endpoints

### 2.1 Autenticação e Recuperação de Senha

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/login` | Não | Autentica e-mail/senha, retornando access token JWT |
| `GET` | `/api/v1/auth/me` | Sim | Retorna os dados do usuário autenticado |
| `POST` | `/api/v1/auth/recover-password` | Não | Solicita envio de link/código de recuperação de senha |
| `POST` | `/api/v1/auth/reset-password` | Não | Redefine a senha utilizando token temporário de uso único |

#### Exemplo: `POST /api/v1/auth/login`
**Request:**
```json
{
  "email": "admin@casaluma.com.br",
  "password": "senha_segura"
}
```
**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@casaluma.com.br",
    "full_name": "Administrador Casa Luma",
    "is_admin": true
  }
}
```

---

### 2.2 Usuários (Administração)

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/users` | Sim (Admin) | Lista usuários do sistema |
| `POST` | `/api/v1/users` | Sim (Admin) | Cria um novo usuário interno |
| `GET` | `/api/v1/users/{id}` | Sim (Admin) | Detalha usuário por ID |
| `PUT` | `/api/v1/users/{id}` | Sim (Admin) | Atualiza dados e permissões do usuário |
| `PUT` | `/api/v1/users/{id}/status` | Sim (Admin) | Ativa ou desativa a conta do usuário |

---

### 2.3 Categorias e Unidades de Medida

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/categories` | Sim | Lista categorias ativas ou todas |
| `POST` | `/api/v1/categories` | Sim | Cria nova categoria |
| `PUT` | `/api/v1/categories/{id}` | Sim | Atualiza nome/descrição da categoria |
| `GET` | `/api/v1/units` | Sim | Lista unidades de medida (UN, KG, G, L, ML) |
| `POST` | `/api/v1/units` | Sim | Adiciona nova unidade de medida permitida |

---

### 2.4 Produtos e Fotos

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/products` | Sim | Lista produtos com filtros (`type`, `category_id`, `search`, `low_stock`) |
| `POST` | `/api/v1/products` | Sim | Cadastra novo item (produto acabado, insumo, etc.) |
| `GET` | `/api/v1/products/{id}` | Sim | Detalhes do item, fotos e saldo atual computado |
| `PUT` | `/api/v1/products/{id}` | Sim | Atualiza dados cadastrais, custo fixo e preço de venda |
| `PUT` | `/api/v1/products/{id}/status` | Sim | Ativa/desativa produto |
| `POST` | `/api/v1/products/{id}/images` | Sim | Upload de foto para produto acabado (`multipart/form-data`) |
| `GET` | `/api/v1/products/{id}/images` | Sim | Lista fotos anexadas ao produto |
| `PUT` | `/api/v1/products/{id}/images/{image_id}/primary` | Sim | Define imagem como foto de capa principal |
| `PUT` | `/api/v1/products/{id}/images/reorder` | Sim | Reordena a sequência de exibição das fotos |
| `DELETE` | `/api/v1/products/{id}/images/{image_id}` | Sim | Remove arquivo de imagem do storage e do banco |
| `GET` | `/api/v1/media/{filename}` | Sim | Acesso protegido às mídias armazenadas |

#### Exemplo: `POST /api/v1/products`
**Request:**
```json
{
  "sku": "VELA-LAV-180",
  "name": "Vela Aromática de Lavanda 180g",
  "description": "Cera de coco e essência pura de lavanda francesa",
  "item_type": "PRODUTO_ACABADO",
  "category_id": 2,
  "unit_id": 1,
  "unit_cost": "18.5000",
  "sale_price": "55.00",
  "min_stock": "10.000"
}
```

---

### 2.5 Estoque e Movimentações

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/stock/balance` | Sim | Retorna saldo atual computado de todos os itens ativos |
| `GET` | `/api/v1/stock/balance/{product_id}` | Sim | Retorna saldo e valorização de um item específico |
| `GET` | `/api/v1/stock/movements` | Sim | Histórico de movimentações com filtros por data, item e tipo |
| `POST` | `/api/v1/stock/adjustments` | Sim | Realiza ajuste manual de inventário (**justificativa obrigatória**) |
| `POST` | `/api/v1/stock/entries` | Sim | Registra entrada de estoque por compra ou recebimento avulso |

#### Exemplo: `POST /api/v1/stock/adjustments`
**Request:**
```json
{
  "product_id": 4,
  "quantity_delta": "-2.000",
  "justification": "Frasco quebrado durante manuseio no ateliê"
}
```

---

### 2.6 Fichas Técnicas (Receitas / BOM)

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/recipes` | Sim | Lista fichas técnicas cadastradas |
| `POST` | `/api/v1/recipes` | Sim | Cria nova ficha técnica com seus insumos e proporções |
| `GET` | `/api/v1/recipes/{id}` | Sim | Detalha a ficha técnica e componentes |
| `PUT` | `/api/v1/recipes/{id}` | Sim | Atualiza componentes, rendimento e proporções |
| `GET` | `/api/v1/recipes/product/{product_id}` | Sim | Busca ficha técnica vinculada a um produto acabado |

---

### 2.7 Ordens de Produção

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/production-orders` | Sim | Lista ordens de produção (`RASCUNHO`, `CONFIRMADA`, `CANCELADA`) |
| `POST` | `/api/v1/production-orders` | Sim | Cria ordem de produção em modo **Rascunho** (não altera estoque) |
| `GET` | `/api/v1/production-orders/{id}` | Sim | Detalha ordem e insumos previstos/reais |
| `PUT` | `/api/v1/production-orders/{id}` | Sim | Edita rascunho da ordem (ajuste de consumo real e perdas) |
| `POST` | `/api/v1/production-orders/{id}/confirm` | Sim | **Confirmação atômica:** valida saldo de insumos, debita insumos e credita produto acabado na mesma transação |
| `POST` | `/api/v1/production-orders/{id}/cancel` | Sim | Cancela rascunho ou reverte produção confirmada criando estornos |

---

### 2.8 Clientes

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/customers` | Sim | Lista clientes cadastrados com busca por nome/documento |
| `POST` | `/api/v1/customers` | Sim | Cadastra novo cliente (opcional) |
| `GET` | `/api/v1/customers/{id}` | Sim | Detalha cliente e histórico de compras |
| `PUT` | `/api/v1/customers/{id}` | Sim | Atualiza cadastro do cliente |

---

### 2.9 Vendas

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/sales` | Sim | Lista vendas com filtros por período e status |
| `POST` | `/api/v1/sales` | Sim | Cria registro de venda em **Rascunho** (não baixa estoque) |
| `GET` | `/api/v1/sales/{id}` | Sim | Detalha venda e itens |
| `PUT` | `/api/v1/sales/{id}` | Sim | Atualiza itens, quantidades ou cliente do rascunho |
| `POST` | `/api/v1/sales/{id}/confirm` | Sim | **Confirmação atômica:** valida saldo disponível e dá baixa no estoque de todos os itens |
| `POST` | `/api/v1/sales/{id}/cancel` | Sim | Cancela venda confirmada gerando movimentações de estorno |

---

### 2.10 Dashboard e Relatórios

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/dashboard/metrics` | Sim | Resumo consolidado: itens ativos, em estoque mínimo, zerados, vendas e produções recentes |
| `GET` | `/api/v1/reports/stock` | Sim | Relatório de estoque atual por categoria (`?format=json` ou `?format=csv`) |
| `GET` | `/api/v1/reports/movements` | Sim | Extrato detalhado de movimentações por período (`?format=csv`) |
| `GET` | `/api/v1/reports/sales` | Sim | Faturamento, itens mais vendidos e margem bruta estimada |
| `GET` | `/api/v1/reports/production` | Sim | Histórico de consumo de matérias-primas e lotes produzidos |

---

### 2.11 Sistema e Verificação de Saúde

| Método | Rota | Autenticado | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/health` | Não | Healthcheck da API e conectividade com o banco MySQL |
