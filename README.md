# Casa Luma Estoque

Sistema corporativo de gestão de estoque, controle de produção artesanal, vendas e emissão de relatórios analíticos, desenvolvido especificamente para as operações do **Ateliê Casa Luma**.

---

## 1. Visão Geral e Arquitetura

O sistema adota uma arquitetura em camadas com separação clara entre cliente, servidor de API e banco de dados relacional:

- **Backend:** Python 3.11+ com FastAPI, SQLAlchemy 2.0 (ORM tipado), Pydantic v2 e Alembic para migrações.
- **Frontend:** React 19 + TypeScript com Vite e suporte a PWA (Progressive Web App).
- **Design System:** Estética artesanal, minimalista e acolhedora em tons de areia/off-white (baseada no `#e9e1d7`), utilizando as famílias tipográficas **Cormorant Garamond** (títulos) e **Manrope** (dados operacionais).
- **Banco de Dados:** MySQL 8.x persistido em volume Docker.
- **Armazenamento de Mídias:** Fotos de produtos armazenadas no filesystem sob volume Docker seguro (nunca Base64 no banco de dados).
- **Infraestrutura:** Docker e Docker Compose prontos para implantação em VPS Linux.

---

## 2. Documentação Técnica Detalhada

Toda a especificação da solução está documentada na pasta `docs/`:

- [docs/arquitetura.md](docs/arquitetura.md): Princípios de arquitetura, padrões transacionais, fluxo de mídias e serviços desacoplados.
- [docs/modelo-de-dados.md](docs/modelo-de-dados.md): Dicionário completo de tabelas, tipos de dados, chaves estrangeiras, índices e diagrama ER.
- [docs/api.md](docs/api.md): Contratos dos endpoints REST, formatos de payload JSON, autenticação JWT e tratamento de erros.
- [casa_luma_estoque_spec_codex.md](casa_luma_estoque_spec_codex.md): Especificação funcional e requisitos de negócio originais.

---

## 3. Estrutura de Diretórios

```text
casa-luma-estoque/
├── backend/          # API FastAPI, modelos SQLAlchemy, serviços e testes
├── frontend/         # SPA React/Vite com TypeScript, Design System e PWA
├── docs/             # Documentação técnica e especificações
├── docker-compose.yml# Orquestração dos serviços (db, backend, frontend)
├── .gitignore        # Arquivos ignorados pelo controle de versão
└── README.md         # Guia geral de execução e desenvolvimento
```

---

## 4. Roteiro de Implementação em Fases

- [x] **Fase 1: Documentação Técnica, Modelagem e Versionamento**
  - [x] Inicialização do repositório Git com `.gitignore` completo.
  - [x] Especificação de arquitetura técnica (`docs/arquitetura.md`).
  - [x] Modelagem do banco relacional e diagrama ER (`docs/modelo-de-dados.md`).
  - [x] Definição de contratos da API REST (`docs/api.md`).
- [x] **Fase 2: Infraestrutura Base & Ambiente Docker**
  - [x] Arquivo `docker-compose.yml` com serviços `db` (MySQL), `backend` e `frontend`.
  - [x] Arquivos `.env.example` com todas as chaves documentadas.
  - [x] Scaffolding e build validado do frontend (Vite + React + TS).
  - [x] Estrutura e Dockerfile do backend FastAPI com healthcheck.
- [x] **Fase 3: Backend — Autenticação, Usuários e Cadastro de Itens**
  - [x] Modelos SQLAlchemy 2.0 e configuração do Alembic.
  - [x] Autenticação JWT com endpoints de login, recuperação de senha e gestão de usuários.
  - [x] CRUD de Categorias, Unidades de Medida e Produtos (com validação de SKU único).
  - [x] Serviço de upload, validação MIME e persistência de fotos dos produtos.
  - [x] 17 testes automatizados com `pytest` cobrindo autenticação, produtos e imagens.
- [ ] **Fase 4: Frontend — Design System e Cadastros Iniciais**
  - [ ] Configuração de tokens CSS baseados na identidade Casa Luma (Cormorant Garamond + Manrope).
  - [ ] Layout responsivo com sidebar e telas de autenticação e produtos.
- [ ] **Fase 5: Estoque, Produção Artesanal e Vendas**
  - [ ] Motor de movimentações imutáveis com bloqueio de saldo negativo.
  - [ ] Fichas técnicas e ordens de produção com confirmação transacional atômica.
  - [ ] Módulo de vendas com cliente opcional e cancelamento com reversão rastreável.
- [ ] **Fase 6: Dashboard, Relatórios, Notificações e PWA**
  - [ ] Métricas em tempo real e relatórios com exportação para CSV.
  - [ ] Serviço de alerta por e-mail com deduplicação.
  - [ ] Manifest e Service Worker para PWA instalável.
- [ ] **Fase 7: Testes Automatizados e Homologação**
  - [ ] Cobertura de testes automatizados com `pytest`.
  - [ ] Validação de builds de produção e roteiro de backup.

---

## 5. Como Executar

### 5.1 Com Docker Compose (Produção / VPS)
```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env

# 2. Iniciar os containers em segundo plano
docker compose up -d --build

# 3. Verificar status dos serviços
docker compose ps
```

### 5.2 Em Desenvolvimento Local
**Backend:**
```bash
cd backend
python -m venv .venv
# Ativar venv: .venv\Scripts\activate (Windows) ou source .venv/bin/activate (Linux/Mac)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

