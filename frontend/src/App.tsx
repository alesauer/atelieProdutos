import { useState, useEffect } from 'react';
import { api } from './api/client';
import type { User } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { DashboardPage } from './pages/DashboardPage';
import { StockPage } from './pages/StockPage';
import { ProductionPage } from './pages/ProductionPage';
import { SalesPage } from './pages/SalesPage';
import { CustomersPage } from './pages/CustomersPage';
import { FinancialPage } from './pages/FinancialPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

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
      case 'clientes':
        return { title: 'Clientes & CRM', subtitle: 'Ficha 360°, histórico de compras, métricas de LTV e relacionamento' };
      case 'financeiro':
        return { title: 'Controle Financeiro', subtitle: 'DRE, fluxo de caixa, receitas e contas a pagar' };
      case 'relatorios':
        return { title: 'Relatórios Analíticos', subtitle: 'Extratos, valorização e exportação CSV' };
      case 'configuracao':
        return { title: 'Configurações do Ateliê', subtitle: 'Categorias, unidades de medida e cadastros auxiliares' };
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
          {currentTab === 'estoque' && <StockPage />}
          {currentTab === 'producao' && <ProductionPage />}
          {currentTab === 'vendas' && <SalesPage onNavigate={setCurrentTab} />}
          {currentTab === 'clientes' && <CustomersPage onNavigate={setCurrentTab} />}
          {currentTab === 'financeiro' && <FinancialPage />}
          {currentTab === 'relatorios' && <ReportsPage />}
          {currentTab === 'configuracao' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
