# Casa Luma Estoque — Especificação do Projeto para Codex

> **Objetivo deste documento:** orientar o Codex no VS Code a planejar e implementar, em etapas, o sistema de controle de estoque do Ateliê Casa Luma.
>
> **Importante:** não comece a implementar o sistema inteiro automaticamente. Primeiro leia este documento, inspecione o repositório existente e apresente um plano de implementação por etapas para aprovação. Não sobrescreva arquivos existentes sem verificar seu conteúdo e explicar o impacto.

## 1. Visão geral

Desenvolver uma aplicação web empresarial para controlar produtos, matérias-primas, embalagens, materiais auxiliares, estoque, movimentações, produção artesanal, vendas, relatórios e alertas por e-mail.

A aplicação será utilizada inicialmente por um único administrador, mas a estrutura de autenticação e usuários deverá permitir a criação administrativa de outras contas no futuro.

### Objetivos principais

- Manter cadastro centralizado dos itens.
- Registrar entradas, saídas, perdas, devoluções e ajustes com histórico.
- Controlar produção por fichas técnicas (BOM/receitas), permitindo corrigir o consumo real.
- Registrar vendas e baixar estoque ao confirmar a venda.
- Preservar rastreabilidade de operações, cancelamentos e reversões.
- Apresentar dashboard, relatórios e alertas de estoque.
- Oferecer interface responsiva e instalável como PWA.
- Permitir implantação em VPS por Docker Compose.

## 2. Decisões tecnológicas confirmadas

- **Backend:** Python com FastAPI.
- **API:** REST.
- **Autenticação:** JWT.
- **ORM:** SQLAlchemy 2.x, quando apropriado.
- **Banco de dados:** MySQL.
- **Frontend:** React + Vite + TypeScript.
- **PWA:** Web App Manifest, ícones e Service Worker.
- **Infraestrutura:** Docker, Dockerfiles aplicáveis e `docker-compose.yml`.
- **Implantação-alvo:** VPS.
- **E-mail:** serviço externo de envio por API, ainda não escolhido; a integração deve ser configurável.
- **Idioma da interface:** português brasileiro (`pt-BR`).
- **Nome de trabalho:** Casa Luma Estoque. Confirmar antes de fixar o nome visual definitivo.

## 3. Escopo funcional

### 3.1 Cadastro de itens

Implementar cadastro, consulta, edição, ativação/inativação e busca de itens.

Campos propostos:
- SKU/código único.
- Nome (obrigatório).
- Categoria.
- Tipo de item (obrigatório).
- Descrição (opcional).
- Unidade de medida.
- Custo unitário, conforme o tipo.
- Preço de venda, quando aplicável.
- Estoque mínimo.
- Status ativo/inativo.

Tipos iniciais:
- Produto acabado.
- Matéria-prima.
- Embalagem.
- Material auxiliar.

**Fotos dos produtos à venda:** permitir anexar uma ou mais imagens aos produtos acabados destinados à venda. Deve ser possível enviar, visualizar, definir uma imagem principal e remover/substituir imagens, respeitando autorização e validação de arquivos. A interface deve mostrar miniaturas e uma visualização ampliada quando apropriado. As imagens são opcionais; matérias-primas e outros itens também podem ter imagens se isso for útil, mas a prioridade são os produtos à venda.

Não incluir código de barras como requisito inicial. Não criar campos adicionais de domínio sem necessidade clara; registrar sugestões como decisões pendentes.

### 3.1.1 Imagens dos produtos

Implementar anexos de imagens para produtos acabados destinados à venda.

Requisitos:
- Permitir anexar uma ou mais imagens por produto.
- Permitir definir uma imagem principal, ordenar imagens e remover/substituir imagens.
- Exibir miniaturas na listagem/detalhes e visualização maior na tela do produto.
- Validar tipo real do arquivo, extensão, tamanho máximo e dimensões; aceitar formatos comuns e seguros, como JPEG, PNG e WebP. Rejeitar arquivos executáveis e formatos não permitidos.
- Gerar nomes de arquivo únicos e não confiar no nome enviado pelo usuário.
- Não armazenar imagens como strings Base64 no banco. Guardar metadados e referência/localização no banco, mantendo os arquivos em armazenamento próprio.
- Para desenvolvimento local e VPS, usar volume persistente Docker para os arquivos, com configuração por variável de ambiente. Estruturar o serviço de armazenamento para permitir migração futura para armazenamento de objetos, se necessário.
- Proteger operações de upload e exclusão com autenticação e autorização no backend.
- Definir limites de tamanho e quantidade por produto, documentá-los e configurá-los sem valores arbitrariamente grandes.
- Evitar expor caminhos internos do servidor; servir imagens por rotas ou URLs controladas.
- Incluir testes para upload válido, formato/tamanho inválido, acesso não autorizado e exclusão.
- Incluir no README instruções de backup dos arquivos de imagem junto com o banco de dados.

### 3.2 Unidades de medida

Suportar unidades inteiras e fracionadas, com unidade de medida por item. Incluir pelo menos exemplos como `UN`, `KG`, `G`, `L` e `ML`, permitindo adicionar outras unidades conforme necessário.

Validar quantidades e conversões explicitamente. Não misturar unidades incompatíveis sem uma regra de conversão definida.

### 3.3 Estoque e movimentações

O estoque deve ser alterado por operações de negócio rastreáveis. O administrador pode realizar ajuste de inventário, mas deve informar uma justificativa.

Tipos de movimentação previstos:
- Estoque inicial/entrada.
- Entrada por compra ou recebimento.
- Saída manual, quando autorizada.
- Consumo na produção.
- Entrada de produto acabado por produção.
- Saída por venda.
- Perda/descarte.
- Devolução.
- Ajuste de inventário.
- Reversão decorrente de cancelamento.

Requisitos:
- Manter histórico imutável das movimentações confirmadas; corrigir erros por reversões/novas movimentações, não apagando o histórico.
- Registrar item, quantidade, unidade, data/hora, tipo, usuário responsável quando disponível, justificativa/observação e referência à operação de origem.
- Calcular e validar o saldo no backend; nunca confiar no valor enviado pelo frontend.
- Usar transações de banco para operações que alterem mais de um item ou registro.
- Prevenir saldo negativo por padrão.
- Evitar duplicidade em retentativas usando idempotência ou estratégia equivalente nas operações críticas.
- Ajustes manuais devem exigir justificativa.
- Não permitir edição destrutiva de uma movimentação confirmada.

### 3.4 Custo de estoque

Foi escolhida a opção **custo fixo definido manualmente pelo administrador**.

Requisitos:
- Permitir informar e atualizar o custo unitário do item.
- Exibir claramente que se trata de custo cadastrado/manual, não custo médio calculado automaticamente.
- Preservar o histórico de movimentações e, se custos históricos forem armazenados, registrar o custo aplicável no momento da operação.
- Não implementar cálculo automático de custo médio ponderado sem aprovação explícita.
- Os relatórios de valorização devem explicar o cálculo utilizado (saldo atual × custo unitário cadastrado) e suas limitações.

### 3.5 Produção artesanal

Implementar fichas técnicas por produto acabado, com componentes/insumos e quantidades necessárias para produzir uma unidade ou lote definido.

Fluxo escolhido: **rascunho e confirmação da produção**.

Fluxo sugerido:
1. Selecionar produto acabado e quantidade planejada.
2. Calcular consumo previsto conforme ficha técnica.
3. Permitir ajustar quantidades reais consumidas.
4. Registrar perdas ou observações, quando aplicável.
5. Salvar como rascunho sem alterar o estoque.
6. Ao confirmar, validar saldos, descontar insumos e adicionar produto acabado.
7. Registrar todas as movimentações vinculadas à ordem de produção.
8. Confirmar tudo em uma única transação de banco.

Regras:
- Rascunhos não alteram estoque.
- Produção confirmada não pode ser apagada; corrigir por cancelamento/reversão auditável, quando permitido.
- Validar que os componentes e as unidades de medida são compatíveis.
- A confirmação deve falhar integralmente se algum insumo estiver indisponível; não deixar movimentações parciais.
- Fichas técnicas podem mudar ao longo do tempo; guardar na ordem de produção os dados necessários para preservar o consumo efetivamente usado.
- Não presumir que toda produção exige uma ficha técnica completa: definir validações e comunicar claramente o comportamento na interface.

### 3.6 Vendas

Implementar registro manual de vendas com cadastro **opcional** de cliente.

Fluxo escolhido: **rascunho, confirmação e possibilidade de cancelamento com reversão automática do estoque**.

Requisitos:
- Uma venda pode ter zero ou mais itens, conforme regras validadas; não confirmar venda sem itens.
- Informar produtos, quantidades e preços aplicáveis.
- Cliente opcional.
- Rascunho não baixa estoque.
- Confirmação valida saldo e dá baixa em todos os itens em transação única.
- Bloquear estoque insuficiente por padrão.
- Cancelamento de venda confirmada deve criar movimentações de reversão rastreáveis e restaurar saldo, sem apagar o registro original.
- Impedir cancelamento duplicado e baixas duplicadas.
- Guardar preço/custo ou demais valores relevantes como fotografia histórica na venda, evitando que futuras edições de cadastro alterem vendas antigas.
- Não implementar integração com Shopee ou outros marketplaces nesta fase; manter apenas uma arquitetura que possa receber integrações futuras.

### 3.7 Clientes

Cadastro opcional de clientes para associar às vendas. Manter apenas os dados necessários ao uso do sistema. Definir campos mínimos e validações durante a fase de modelagem, sem coletar dados desnecessários.

### 3.8 Dashboard

Apresentar, no mínimo:
- Quantidade de itens ativos cadastrados.
- Itens abaixo ou no limite de estoque mínimo.
- Itens sem estoque.
- Movimentações recentes.
- Resumo de vendas por período, se houver vendas registradas.
- Resumo de produção por período, se houver produção registrada.

Indicadores devem ser calculados com dados reais da API, com estados de carregamento, erro e ausência de dados.

### 3.9 Relatórios

Implementar:
- Estoque atual por item/categoria.
- Itens no estoque mínimo ou abaixo dele.
- Itens sem estoque.
- Histórico de movimentações por período, item e tipo.
- Valorização estimada do estoque.
- Consumo de matérias-primas e histórico de produção.
- Vendas por período.
- Produtos mais vendidos.

Disponibilizar filtros por período e filtros pertinentes a cada relatório. Preparar exportação para CSV; exportação para Excel pode ser adicionada se for simples e consistente. Não apresentar valores estimados como contabilidade oficial.

### 3.10 Alertas por e-mail

O serviço de e-mail ainda não foi escolhido. Criar uma camada de serviço configurável por variáveis de ambiente, sem acoplar a lógica do domínio a um fornecedor específico.

Alertas desejados:
- Item atingiu ou ficou abaixo do estoque mínimo.
- Item sem estoque.
- Outras ocorrências administrativas que sejam configuradas posteriormente.

Também serão necessários e-mails para recuperação de senha e, conforme a implementação de usuários, notificações administrativas.

Requisitos:
- Evitar envio repetitivo de e-mails a cada movimentação; implementar deduplicação, controle de estado ou política equivalente.
- Não bloquear uma operação de estoque confirmada se o provedor de e-mail estiver indisponível; registrar falha e permitir nova tentativa.
- Nunca colocar chaves de API em código, logs ou arquivos versionados.
- Documentar como configurar o fornecedor depois que ele for escolhido.
- Se o serviço não estiver configurado, exibir/documentar esse estado claramente e não alegar que e-mails foram enviados.

### 3.11 Autenticação e usuários

- Login com e-mail e senha.
- Recuperação de senha por fluxo seguro com token/código temporário, expiração e uso único.
- Criação de usuários por administrador; sem cadastro público.
- O uso inicial será de uma conta administrativa, mas a modelagem deve suportar outros usuários.
- Implementar hash de senha com algoritmo apropriado; nunca armazenar senhas em texto puro.
- JWT com algoritmo fixo, expiração explícita e validação de assinatura e claims.
- Segredo JWT exclusivamente por variável de ambiente.
- Proteger endpoints privados no backend; não depender somente de proteção no React.
- Respostas de login e recuperação não devem revelar se determinado e-mail existe.
- Definir política de token no frontend após avaliar os riscos. Não guardar tokens sensíveis em `localStorage` por padrão sem documentar a decisão e os riscos de XSS. Se usar cookies, avaliar `HttpOnly`, `Secure`, `SameSite` e CSRF.
- Configurar CORS com origens explícitas por ambiente; nunca usar `*` com credenciais.

### 3.12 PWA e responsividade

A interface deve funcionar em desktop, tablet e celular.

Desktop:
- Sidebar recolhível.
- Navegação clara.
- Dashboard com cards e tabelas.
- Formulários e filtros bem organizados.

Celular:
- Navegação adaptada à largura da tela.
- Menu compacto ou navegação inferior, conforme avaliação de UX.
- Formulários em uma coluna.
- Cards para indicadores.
- Tabelas adaptadas para leitura móvel.
- Áreas de toque adequadas.
- Feedback visual para carregamento, erros, vazio, validação e sucesso.

PWA:
- Manifest com nome, nome curto, ícones e cores.
- Service Worker.
- Cache de recursos estáticos com estratégia segura de atualização.
- Instruções para instalar em navegadores compatíveis.
- Não simular sucesso de gravações quando estiver offline.
- Não permitir que operações críticas de estoque sejam confirmadas apenas localmente sem validação do servidor.
- Documentar limitações de instalação e suporte por navegador/plataforma.


## 3.13 Design System e diretrizes de UX/UI — referência visual Casa Luma

O usuário forneceu como referência uma página HTML do Ateliê Casa Luma. A aplicação administrativa deve **seguir a linguagem visual dessa referência**, adaptando-a a um sistema de gestão de estoque. Não reproduzir a landing page, suas seções de marketing, depoimentos ou chamadas para o WhatsApp dentro do sistema administrativo.

### Direção visual

- Estética acolhedora, minimalista, artesanal, elegante e contemporânea.
- Paleta neutra e quente, inspirada em cimento, areia, off-white e tons naturais.
- A referência contém `theme-color` `#e9e1d7`; usar esse tom como referência de bege quente, não como única cor da interface.
- Utilizar superfícies claras, cartões discretos, bordas suaves e sombras leves.
- Usar bastante espaço em branco e hierarquia visual clara; evitar excesso de gráficos, cores saturadas, gradientes decorativos e elementos desnecessários.
- Utilizar fotos dos produtos de forma funcional nas listagens e detalhes, mantendo miniaturas consistentes e sem prejudicar a leitura das informações de estoque.
- A cor exata de `primary`, `foreground`, `secondary`, `card` e `muted` não está explicitada no HTML fornecido, pois depende de variáveis CSS da folha de estilos. Não afirmar valores exatos para essas cores sem inspecionar a folha original. Propor uma paleta coerente e documentar os tokens escolhidos antes de finalizar o design system.

### Tipografia

A referência usa as famílias **Cormorant Garamond** e **Manrope**:
- Cormorant Garamond: títulos de página e títulos de seção, com uso moderado para dar personalidade artesanal.
- Manrope: texto corrido, navegação, formulários, tabelas, botões, números e informações operacionais, priorizando legibilidade.
- Se as fontes não estiverem disponíveis localmente, usar fontes equivalentes e fallbacks adequados; não depender de carregamento externo sem necessidade.
- Em tabelas e dados operacionais, priorizar leitura rápida e consistência em vez de estilo editorial.

### Componentes visuais

- Cards com cantos arredondados, aproximadamente na faixa de 16–24 px, e sombras muito discretas.
- Botões e ações com estados claros de hover, foco, pressionado, desabilitado e carregamento.
- Ícones lineares simples, consistentes entre si, sem depender apenas de ícones para comunicar ações.
- Campos de formulário com rótulos visíveis, instruções quando necessárias e erros próximos ao campo.
- Badges discretos para estados de estoque, venda e produção. A cor nunca deve ser o único meio de comunicar o estado; incluir texto ou ícone acessível.
- Modais e diálogos somente quando úteis; preferir páginas ou painéis claros para fluxos complexos.
- Transições curtas e sutis. Respeitar `prefers-reduced-motion` e evitar animações que atrasem tarefas operacionais.

### Aplicação ao layout administrativo

- Desktop: sidebar recolhível, área de conteúdo centralizada, cabeçalho de página com título e ação principal, cards e tabelas bem espaçados.
- Mobile: menu compacto ou navegação adaptada, cartões empilhados, formulários em uma coluna e listas de produtos com foto, nome, SKU e saldo.
- Não transportar para o sistema a navegação de marketing da landing page. Usar navegação própria para Dashboard, Produtos, Estoque, Produção, Vendas, Relatórios e Configurações.
- Na listagem de produtos, mostrar a foto principal em miniatura, nome, SKU, categoria, saldo/unidade, preço quando aplicável e ações. Em telas pequenas, transformar cada linha em um cartão/lista responsiva, ou permitir rolagem horizontal apenas quando necessário.
- Dar destaque contido a alertas importantes (estoque baixo ou zerado), sem tornar a tela visualmente alarmante.
- Priorizar ações frequentes: cadastrar produto, registrar entrada, iniciar produção e registrar venda.
- Preservar contraste suficiente, foco visível, navegação por teclado, rótulos acessíveis e áreas de toque adequadas.

### UX: estados e feedback

Todas as telas devem definir estados:
- carregando;
- sucesso;
- erro recuperável;
- formulário inválido;
- lista vazia;
- pesquisa sem resultados;
- sem conexão com a API;
- operação indisponível enquanto offline;
- confirmação antes de ações sensíveis, como cancelar uma venda ou confirmar produção.

Mensagens devem ser em português brasileiro, objetivas e orientar o próximo passo. Não usar alertas genéricos do navegador como experiência principal. Operações críticas de estoque só podem ser consideradas concluídas após confirmação do backend.

### Processo para validar o visual

1. Criar primeiro os tokens do design system (cores, tipografia, espaçamentos, raios, sombras e foco).
2. Implementar uma estrutura visual navegável com dados de demonstração claramente identificados.
3. Validar inicialmente Dashboard, listagem/cadastro de produtos e movimentações.
4. Conferir a aparência em desktop e em larguras móveis comuns, incluindo formulários, tabelas, fotos e mensagens de erro.
5. Após aprovação do padrão visual, aplicar os mesmos componentes aos módulos de produção, vendas e relatórios.
6. Não declarar que a UX/UI foi validada apenas porque o build passou; registrar quais larguras, fluxos e testes foram realmente verificados.

### Critérios de aceite visual

- A interface remete à identidade artesanal e neutra da referência, mas mantém caráter de painel administrativo.
- Cormorant Garamond e Manrope são usadas com papéis tipográficos consistentes, ou há substituições documentadas.
- Paleta, espaçamentos, botões, campos, cartões, badges e tabelas usam tokens compartilhados.
- Há consistência entre desktop e mobile e nenhuma ação essencial fica inacessível em telas estreitas.
- Fotos dos produtos têm tamanho e recorte consistentes e possuem texto alternativo apropriado.
- Estados de carregamento, erro, vazio, sucesso e operação offline estão contemplados.
- Contraste, foco visível, navegação por teclado e rótulos de formulário são verificados.
- Não há excesso de decoração visual que prejudique a leitura de saldos, custos ou movimentações.

## 4. Segurança e qualidade

- Validar todos os dados no backend com schemas apropriados.
- Usar ORM ou consultas parametrizadas.
- Aplicar autorização em todos os endpoints privados.
- Tratar erros sem expor stack traces ou segredos em produção.
- Armazenar configurações e segredos em variáveis de ambiente.
- Fornecer `.env.example` sem valores reais.
- Incluir `.gitignore` para ambientes virtuais, dependências, caches, arquivos `.env`, builds e dados locais.
- Usar migrações de banco (por exemplo, Alembic) em vez de depender de criação automática de tabelas em produção.
- Considerar índices para SKU, datas de movimentação e chaves de relacionamento.
- Definir tratamento consistente de datas, fuso horário e valores monetários.
- Usar `Decimal`/tipo decimal apropriado para dinheiro; não usar ponto flutuante binário para cálculos monetários.
- Definir convenções de paginação, filtros, erros e serialização entre frontend e backend.
- Não registrar senhas, tokens, segredos ou dados pessoais desnecessários em logs.

## 5. Arquitetura sugerida

Adaptar à complexidade real, evitando abstrações desnecessárias.

```text
casa-luma-estoque/
  backend/
    app/
      api/
      core/
      models/
      schemas/
      services/
      repositories/        # somente se trouxer benefício real
    tests/
    migrations/
    requirements.txt ou pyproject.toml
    .env.example
    Dockerfile
  frontend/
    public/
      icons/
      manifest.webmanifest
    src/
      api/
      components/
      layouts/
      pages/
      routes/
      hooks/
      types/
    package.json
    vite.config.ts
    .env.example
    Dockerfile
  docs/
    arquitetura.md
    modelo-de-dados.md
    api.md
  docker-compose.yml
  .gitignore
  README.md
```

Estrutura inicial de serviços Docker:
- `frontend`: interface React/Vite compilada e servida por um servidor web apropriado.
- `backend`: API FastAPI.
- `db`: MySQL com volume persistente e healthcheck.

Não exponha a porta do MySQL publicamente na VPS por padrão. Persistir dados do banco em volume. Configurar healthchecks e dependência de inicialização de modo robusto. Usar configuração de produção adequada, sem servidor de desenvolvimento Vite exposto como implantação final.

## 6. Modelo de dados inicial a validar

Proponha e documente relacionamentos, restrições, índices e tipos de dados antes de implementar.

Entidades candidatas:
- `users`
- `password_reset_tokens` ou mecanismo equivalente seguro
- `categories`
- `units_of_measure`
- `products` (incluindo tipo de item, SKU e custo/preço)
- `product_images` (metadados, referência do arquivo, imagem principal, ordem e vínculo com produto)
- `stock_movements`
- `production_recipes` / `recipe_items`
- `production_orders` / `production_order_items`
- `customers`
- `sales` / `sale_items`
- `email_notifications` ou tabela de eventos/tentativas de notificação, se necessário

Considerações:
- SKU único.
- Chaves estrangeiras e integridade referencial.
- Quantidades com precisão decimal suficiente para pesos/volumes.
- Valores monetários com tipo decimal.
- Campos de data/hora consistentes.
- Estados explícitos para rascunho, confirmado e cancelado, quando aplicável.
- Movimentações vinculadas à origem (produção, venda, ajuste etc.).
- Garantir que cancelamentos e confirmações sejam idempotentes e transacionais.
- Revisar se receitas precisam de versionamento ou se basta guardar uma cópia dos componentes usados em cada ordem de produção.
- Não criar tabelas extras sem justificar sua necessidade.

## 7. Endpoints REST a planejar

Antes de codificar, produzir uma lista de endpoints com método HTTP, rota, autenticação, entrada, saída e erros esperados.

Áreas candidatas:
- Autenticação: login, logout/revogação quando suportada, usuário atual, recuperação e redefinição de senha.
- Usuários administrativos.
- Categorias e unidades.
- Produtos, incluindo upload, listagem, definição de imagem principal e remoção de imagens.
- Estoque e movimentações.
- Fichas técnicas.
- Ordens de produção: criar rascunho, consultar, atualizar rascunho, confirmar e cancelar/reverter quando permitido.
- Clientes.
- Vendas: criar rascunho, consultar, editar rascunho, confirmar e cancelar.
- Dashboard.
- Relatórios e exportações.
- Configuração/estado de notificações, se necessário.

Não implementar todos os endpoints sem uma matriz de permissões e contratos de API documentados.

## 8. Testes obrigatórios

Criar testes automatizados para regras críticas, incluindo:
- Login válido e inválido.
- Acesso não autenticado a endpoint protegido.
- Autorização de usuário.
- SKU duplicado.
- Entrada e saída de estoque.
- Ajuste de inventário com justificativa.
- Bloqueio de saldo negativo.
- Confirmação de produção: baixa de insumos e entrada do produto acabado na mesma transação.
- Falha de produção sem insumos suficientes, sem alterações parciais.
- Venda em rascunho sem baixa.
- Confirmação de venda com baixa atômica.
- Cancelamento de venda com reversão rastreável.
- Prevenção de confirmação/cancelamento duplicados.
- Alertas sem envio repetitivo indevido.
- Validação de filtros e totais dos relatórios.
- Testes de API e de componentes/fluxos essenciais do frontend.
- Verificação de build do frontend e inicialização dos serviços Docker, quando o ambiente permitir.

Se MySQL for necessário para testar comportamentos específicos, documentar a configuração do ambiente de testes. Não afirmar que os testes foram executados se não foram.

## 9. Documentação e entrega

O projeto deve incluir:
- `README.md` com arquitetura, requisitos, configuração e comandos.
- `docs/arquitetura.md`.
- `docs/modelo-de-dados.md`.
- `docs/api.md` ou documentação equivalente.
- `.env.example` para backend e frontend, conforme necessário.
- Dockerfiles e `docker-compose.yml`.
- Migrações.
- Testes.
- Instruções para criar o primeiro administrador de forma segura.
- Instruções para iniciar, parar, atualizar e fazer backup do banco.
- Limitações conhecidas e decisões pendentes.

Comandos de operação devem ser documentados e revisados para o ambiente escolhido. Não inserir senhas ou chaves reais nos exemplos.

## 10. Critérios de aceite

Considerar o MVP pronto somente quando:
1. Backend e frontend estiverem integrados e executáveis.
2. O MySQL persistir os dados entre reinicializações.
3. Login e endpoints protegidos funcionarem.
4. O cadastro de itens e unidades permitir controlar produtos e insumos.
5. Todas as movimentações confirmadas forem rastreáveis.
6. Ajustes exigirem justificativa.
7. Produção em rascunho não alterar estoque e confirmação alterar insumos e produto acabado atomicamente.
8. Vendas em rascunho não alterarem estoque; confirmação e cancelamento respeitarem as regras de reversão.
9. Dashboard e relatórios utilizarem dados reais.
10. Alertas respeitarem a política de deduplicação e indicarem quando o e-mail não estiver configurado.
11. A interface for responsiva e o PWA tiver manifest e Service Worker funcionando em navegadores compatíveis.
12. Docker Compose, migrações, testes e documentação estiverem incluídos.
13. Nenhum segredo real estiver no repositório.
14. Produtos à venda aceitarem anexos de imagem, com validação segura, persistência em volume e backup documentado.

## 11. Decisões pendentes

Não inventar respostas. Apresentar estas questões antes de fechar a arquitetura/implementação:
- Nome visual definitivo da aplicação (sugestão: Casa Luma Estoque).
- Serviço de e-mail por API.
- Se haverá uma única conta em uso inicialmente ou várias contas ativas desde o começo.
- Limites iniciais para quantidade e tamanho dos arquivos de imagem por produto (propor valores seguros e pedir aprovação).
- Política para estoque negativo (padrão proposto: bloquear).
- Se compras/recebimentos terão módulo próprio ou serão apenas entradas manuais com referência.
- Campos mínimos de clientes.
- Política de cancelamento/reversão de produção.
- Formatos de exportação necessários (CSV inicialmente; Excel opcional).
- URL pública, domínio e estratégia de HTTPS para a VPS.
- Estratégia de backup e retenção.

## 12. Instruções operacionais ao Codex

1. Leia este arquivo por inteiro antes de alterar o repositório.
2. Inspecione a estrutura atual e identifique código existente que possa ser reaproveitado.
3. Apresente um plano por fases e uma lista de dúvidas/decisões pendentes.
4. Não gere o projeto inteiro em uma única etapa sem aprovação.
5. Primeiro produza/atualize os documentos de arquitetura, modelo de dados, contratos da API e critérios de aceite.
6. Após aprovação, implemente por fases pequenas e verificáveis.
7. Ao final de cada fase, execute os testes disponíveis e informe exatamente o que passou, falhou ou não foi executado.
8. Não alegue que uma funcionalidade, teste, build, migração ou implantação funciona sem evidência.
9. Não destrua arquivos ou dados existentes. Antes de operações destrutivas, explicar o impacto e pedir confirmação.
10. Se houver conflito entre o código existente e este documento, descreva o conflito e proponha uma solução antes de alterar componentes importantes.
