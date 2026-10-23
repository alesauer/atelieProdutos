import { useState, useEffect } from 'react';
import { api } from './api/client';
import type { User } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderTab } from './pages/PlaceholderTab';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('casaluma_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [currentTab, setCurrentTab] = useState<string>('produtos');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('casaluma:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('casaluma:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const getPageInfo = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Painel Geral', subtitle: 'Métricas e visão geral do ateliê' };
      case 'produtos':
        return { title: 'Catálogo de Itens', subtitle: 'Produtos acabados, matérias-primas e embalagens' };
      case 'estoque':
        return { title: 'Estoque & Movimentações', subtitle: 'Livro-razão e ajustes de inventário' };
      case 'producao':
        return { title: 'Produção Artesanal', subtitle: 'Ordens de fabricação e fichas técnicas (BOM)' };
      case 'vendas':
        return { title: 'Vendas & Pedidos', subtitle: 'Registro e baixa de estoque de pedidos' };
      case 'relatorios':
        return { title: 'Relatórios Analíticos', subtitle: 'Extratos, valorização e exportação CSV' };
      default:
        return { title: 'Casa Luma Estoque', subtitle: '' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Sidebar Lateral */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLogout={handleLogout}
        userName={currentUser.full_name}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Conteúdo Principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main style={{ flex: 1 }}>
          {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
          {currentTab === 'produtos' && <ProductsPage />}
          {currentTab === 'estoque' && (
            <PlaceholderTab
              title="Estoque & Movimentações"
              phase="Fase 5 — Próxima Etapa"
              description="Controle imutável de entradas, saídas, perdas e ajustes com justificativa obrigatória e prevenção de saldo negativo."
              features={[
                'Registro de movimentações rastreáveis com fotografia de custo unitário',
                'Ajuste manual de inventário exigindo justificativa formal',
                'Bloqueio estrito de saldo negativo por padrão',
                'Histórico imutável para auditoria',
              ]}
            />
          )}
          {currentTab === 'producao' && (
            <PlaceholderTab
              title="Produção Artesanal & Fichas Técnicas"
              phase="Fase 5 — Próxima Etapa"
              description="Criação de fichas técnicas (BOM) e execução de ordens de fabricação com fluxo em duas etapas (rascunho e confirmação atômica)."
              features={[
                'Fichas técnicas com componentes e rendimento padrão',
                'Ordem de produção em rascunho sem alterar estoque',
                'Ajuste fino de consumo real e perdas na bancada',
                'Confirmação atômica: baixa de insumos e entrada do produto acabado em transação única',
              ]}
            />
          )}
          {currentTab === 'vendas' && (
            <PlaceholderTab
              title="Vendas & Pedidos"
              phase="Fase 5 — Próxima Etapa"
              description="Registro manual de vendas com cliente opcional e baixa automática de estoque na confirmação."
              features={[
                'Cadastro opcional de compradores e histórico',
                'Venda em rascunho sem impacto no estoque físico',
                'Confirmação com validação de saldo e baixa atômica',
                'Cancelamento de venda com estorno rastreável automático',
              ]}
            />
          )}
          {currentTab === 'relatorios' && (
            <PlaceholderTab
              title="Relatórios & Alertas"
              phase="Fase 6 — Etapa Seguinte"
              description="Extratos analíticos de estoque, consumo de matéria-prima, vendas por período e exportação para CSV."
              features={[
                'Relatório de valorização estimada (saldo × custo cadastrado)',
                'Exportação em formato CSV padrão',
                'Notificações por e-mail para estoque mínimo e zerado',
                'Deduplicação de alertas para evitar envios repetitivos',
              ]}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
