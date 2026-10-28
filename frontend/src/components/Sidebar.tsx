import React, { useState, useEffect } from 'react';
import {
  Package,
  Boxes,
  Hammer,
  ShoppingBag,
  CircleDollarSign,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Download,
  Settings,
  Users,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  userName?: string;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onLogout,
  userName = 'Administrador',
  isMobileOpen,
  onCloseMobile,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  const navItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'produtos', label: 'Produtos & Itens', icon: Package },
    { id: 'estoque', label: 'Estoque & Saldos', icon: Boxes },
    { id: 'producao', label: 'Produção Artesanal', icon: Hammer },
    { id: 'vendas', label: 'Vendas & Pedidos', icon: ShoppingBag },
    { id: 'clientes', label: 'Clientes & CRM', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: CircleDollarSign },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'configuracao', label: 'Configurações', icon: Settings },
  ];

  const content = (
    <aside
      style={{
        width: '260px',
        height: '100vh',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Topo / Logotipo do Ateliê */}
      <div
        style={{
          padding: '28px 24px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-sand-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Sparkles size={16} color="var(--brand-accent)" />
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--brand-accent)',
            }}
          >
            Ateliê Artesanal
          </span>
        </div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            color: 'var(--brand-primary)',
            lineHeight: 1.1,
          }}
        >
          Casa Luma
        </h1>
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            marginTop: '4px',
            letterSpacing: '0.02em',
          }}
        >
          Controle de Estoque & Produção
        </p>
      </div>

      {/* Navegação Principal */}
      <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--bg-sand)' : 'transparent',
                  border: isActive ? '1px solid var(--border-medium)' : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Icon
                  size={19}
                  color={isActive ? 'var(--brand-accent)' : 'var(--text-secondary)'}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Botão de Instalação PWA (quando disponível pelo navegador) */}
      {deferredPrompt && (
        <div style={{ padding: '0 16px 12px' }}>
          <button
            onClick={handleInstallClick}
            className="btn-secondary"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-sand-light)',
              borderColor: 'var(--brand-accent)',
              color: 'var(--brand-primary)',
            }}
          >
            <Download size={14} color="var(--brand-accent)" />
            <span>Instalar Aplicativo</span>
          </button>
        </div>
      )}

      {/* Rodapé da Sidebar / Usuário */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-sand-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <p
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {userName}
          </p>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Administrador
          </span>
        </div>
        <button
          onClick={onLogout}
          title="Sair do sistema"
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Versão Desktop */}
      <div className="desktop-sidebar" style={{ display: 'none' }}>
        {content}
      </div>

      {/* Versão Mobile com Backdrop */}
      {isMobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 99,
          }}
          onClick={onCloseMobile}
        >
          <div
            style={{
              width: '260px',
              height: '100%',
              boxShadow: 'var(--shadow-drawer)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 900px) {
          .desktop-sidebar {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
};
