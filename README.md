# Casa Luma Estoque

Sistema corporativo de gestão de estoque, controle de produção artesanal, vendas e emissão de relatórios analíticos, desenvolvido sob medida para as operações do **Ateliê Casa Luma**.

---

## 1. Visão Geral e Arquitetura

O sistema adota uma arquitetura em camadas com separação clara entre cliente, servidor de API e banco de dados relacional:

- **Backend:** Python 3.12+ com FastAPI, SQLAlchemy 2.0 (ORM tipado com `Mapped` e `mapped_column`), Pydantic v2 e Alembic para controle de migrações.
- **Frontend:** React 19 + TypeScript com Vite e suporte completo a PWA (Progressive Web App instalável).
- **Design System:** Estética artesanal, minimalista e acolhedora em tons de areia e bege quente (baseada na referência `#e9e1d7`), utilizando as famílias tipográficas **Cormorant Garamond** (títulos) e **Manrope** (dados operacionais).
- **Banco de Dados:** MySQL 8.x persistido em volume Docker (`casaluma_db_data`).
- **Armazenamento de Mídias:** Fotos de produtos armazenadas no filesystem sob volume Docker seguro (`casaluma_media_data`), com validação de tipo MIME binário real (`puremagic`) e integridade (`Pillow`) — nunca Base64 no banco.
- **Infraestrutura:** Docker e Docker Compose prontos para implantação em VPS Linux com proxy reverso Nginx Alpine.

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
├── backend/          # API FastAPI, modelos SQLAlchemy, serviços e 29 testes pytest
├── frontend/         # SPA React/Vite com TypeScript, Design System e PWA
├── docs/             # Documentação técnica e especificações arquiteturais
├── scripts/          # Scripts de backup e restore automatizados (Linux/Bash e Windows/PS)
├── docker-compose.yml# Orquestração de containers (db, backend, frontend)
├── .gitignore        # Arquivos ignorados pelo controle de versão
└── README.md         # Guia geral de execução e desenvolvimento
```

---

## 4. Roteiro de Implementação em Fases (100% Concluído)

- [x] **Fase 1: Documentação Técnica, Modelagem e Versionamento**
  - [x] Repositório Git com `.gitignore` completo.
  - [x] Especificação de arquitetura técnica (`docs/arquitetura.md`).
  - [x] Modelagem do banco relacional e diagrama ER (`docs/modelo-de-dados.md`).
  - [x] Definição de contratos da API REST (`docs/api.md`).
- [x] **Fase 2: Infraestrutura Base & Ambiente Docker**
  - [x] Arquivo `docker-compose.yml` com serviços `db` (MySQL), `backend` e `frontend`.
  - [x] Arquivos `.env.example` com todas as chaves documentadas.
  - [x] Scaffolding e build validado do frontend (Vite + React + TS).
  - [x] Estrutura e Dockerfile do backend FastAPI com healthcheck.
- [x] **Fase 3: Backend — Autenticação, Usuários e Cadastro de Itens**
  - [x] Modelos SQLAlchemy 2.0 e configuração do banco.
  - [x] Autenticação JWT com endpoints de login, recuperação de senha e gestão de usuários.
  - [x] CRUD de Categorias, Unidades de Medida e Produtos (com validação de SKU único).
  - [x] Serviço de upload, validação MIME e persistência de fotos dos produtos em disco.
  - [x] Script seguro CLI para criação do primeiro admin: `create_initial_admin.py`.
- [x] **Fase 4: Frontend — Design System e Cadastros Iniciais**
  - [x] Design System completo em `index.css` (paleta `#e9e1d7`, Cormorant Garamond + Manrope).
  - [x] Layout responsivo com sidebar recolhível no desktop e drawer no mobile.
  - [x] Autenticação com persistência segura do token JWT.
  - [x] Catálogo de produtos com busca, filtros de tipo/categoria, modais e galeria de fotos.
- [x] **Fase 5: Estoque, Produção Artesanal e Vendas**
  - [x] Motor de movimentações imutáveis com bloqueio de saldo negativo e livro-razão auditável.
  - [x] Fichas técnicas (BOM) e ordens de produção em rascunho com confirmação e estorno atômicos.
  - [x] Módulo de vendas com cliente opcional, cálculo histórico e cancelamento com reversão de estoque.
  - [x] Telas completas no frontend (`StockPage`, `ProductionPage`, `SalesPage`).
- [x] **Fase 6: Dashboard, Relatórios, Notificações e PWA**
  - [x] Métricas em tempo real e consolidação de itens críticos no `DashboardPage`.
  - [x] 4 abas analíticas em `ReportsPage` com exportação para CSV formatado para Excel (`UTF-8 com BOM`).
  - [x] Serviço de alerta e notificação por e-mail com múltiplos drivers (`log`, `mock`, `smtp`) e deduplicação de 24h.
  - [x] Web App Manifest, ícones botânicos minimalistas e Service Worker com integridade offline para PWA instalável.
- [x] **Fase 7: Homologação Final, Backup e Entrega**
  - [x] Scripts automatizados de backup e restauração (`scripts/backup.sh`, `scripts/restore.sh`, `scripts/backup.ps1`, `scripts/restore.ps1`).
  - [x] 29 testes automatizados com `pytest` aprovados (100% de sucesso).
  - [x] Build de produção compilado em TypeScript estrito (0 warnings / 0 erros).
  - [x] Homologação completa contra todos os critérios de aceite da especificação.

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

# 4. Criar o primeiro usuário Administrador no container backend
docker compose exec backend python -m app.scripts.create_initial_admin
```

O sistema estará acessível em:
- **Aplicação Web / PWA:** `http://localhost` (ou o domínio apontado para a VPS)
- **API REST & Swagger Docs:** `http://localhost:8000/api/v1/docs`

---

### 5.2 Em Desenvolvimento Local

**Backend:**
```bash
cd backend
python -m venv .venv

# No Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# No Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt

# Criar o primeiro administrador
python -m app.scripts.create_initial_admin

# Iniciar servidor FastAPI
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 6. Rotinas de Backup e Restauração

O sistema inclui scripts para cópia integral tanto do **Banco de Dados MySQL** quanto dos **Arquivos de Fotos de Produtos**:

### 6.1 Executando Backup
**No Linux / VPS:**
```bash
chmod +x scripts/backup.sh
./scripts/backup.sh ./backups
```
*Dica para VPS: Adicione no crontab (`crontab -e`) para execução diária:*
```cron
0 3 * * * /caminho/casaluma/scripts/backup.sh /var/backups/casaluma >> /var/log/casaluma-backup.log 2>&1
```

**No Windows (PowerShell):**
```powershell
.\scripts\backup.ps1 -BackupDir .\backups
```

Cada backup gera uma subpasta carimbada no formato `YYYYMMDD_HHMMSS` contendo:
- `database_YYYYMMDD_HHMMSS.sql.gz`: Dump transacional completo do MySQL.
- `media_YYYYMMDD_HHMMSS.tar.gz`: Todas as imagens dos produtos originais e miniaturas.
- `manifest.json`: Metadados e timestamp do backup.

### 6.2 Executando Restauração (Restore)
**No Linux / VPS:**
```bash
chmod +x scripts/restore.sh
./scripts/restore.sh ./backups/20261023_180000
```

**No Windows (PowerShell):**
```powershell
.\scripts\restore.ps1 -BackupPath .\backups\20261023_180000
```

---

## 7. Execução dos Testes Automatizados

O backend conta com **29 testes automatizados** com banco SQLite em memória isolado:

```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```

Cobertura dos testes:
- `test_auth.py`: Login JWT, hash bcrypt, expiração de tokens, recuperação de senha e proteção de rotas privadas.
- `test_products.py`: CRUD de itens, unicidade de SKU e vinculação com categorias e unidades.
- `test_images.py`: Upload, validação de formato e MIME real (`puremagic`), integridade com Pillow e exclusão segura.
- `test_stock.py`: Livro-razão imutável, cálculo de saldo em tempo real, prevenção estrita de saldo negativo e ajustes manuais com justificativa.
- `test_production.py`: Fichas técnicas (BOM), rascunho de ordem, confirmação atômica e cancelamento com reversão rastreável.
- `test_sales.py`: Registro de venda em rascunho, confirmação atômica com baixa no estoque e cancelamento com estorno.
- `test_dashboard_reports.py`: Métricas consolidadas, geração de CSV para Excel e deduplicação diária de alertas por e-mail.

---

## 8. Licença e Direitos

Projeto desenvolvido com exclusividade para o **Ateliê Casa Luma**. Todos os direitos reservados.
