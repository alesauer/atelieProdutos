import React from 'react';
import {
  Package,
  Boxes,
  Hammer,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';


interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Banner de Boas-vindas com Estética Artesanal */}
      <div
        className="card"
        style={{
          marginBottom: '28px',
          background: 'linear-gradient(135deg, #fbf3ea 0%, #f4ede3 100%)',
          border: '1px solid #e5dacd',
          padding: '32px',
        }}
      >
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--brand-accent)',
            display: 'block',
            marginBottom: '6px',
          }}
        >
          Visão Geral Operacional
        </span>
        <h2
          style={{
            fontSize: '2.1rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            color: 'var(--brand-primary)',
            marginBottom: '8px',
          }}
        >
          Bem-vindo ao Ateliê Casa Luma
        </h2>
        <p
          style={{
            fontSize: '0.98rem',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            lineHeight: 1.55,
          }}
        >
          Painel de controle unificado para rastrear matérias-primas botânicas, formulações artesanais,
          embalagens, estoque e pedidos.
        </p>

        {/* Ações Rápidas */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={() => onNavigate('produtos')}
            className="btn-primary"
            style={{ padding: '10px 18px' }}
          >
            <Package size={16} />
            <span>Gerenciar Catálogo</span>
          </button>
          <button
            onClick={() => onNavigate('estoque')}
            className="btn-secondary"
            style={{ padding: '10px 18px' }}
          >
            <Boxes size={16} />
            <span>Consultar Estoque</span>
          </button>
          <button
            onClick={() => onNavigate('producao')}
            className="btn-secondary"
            style={{ padding: '10px 18px' }}
          >
            <Hammer size={16} />
            <span>Nova Produção</span>
          </button>
          <button
            onClick={() => onNavigate('vendas')}
            className="btn-secondary"
            style={{ padding: '10px 18px' }}
          >
            <ShoppingBag size={16} />
            <span>Registrar Venda</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                STATUS DO CATÁLOGO
              </span>
              <h3 style={{ fontSize: '2rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
                Catálogo Ativo
              </h3>
            </div>
            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--status-active-bg)',
                color: 'var(--status-active-text)',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Itens cadastrados com fotos e unidades configuradas
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ALERTAS DE ESTOQUE
              </span>
              <h3 style={{ fontSize: '2rem', marginTop: '4px', color: 'var(--brand-accent)' }}>
                Monitorado
              </h3>
            </div>
            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--status-warning-bg)',
                color: 'var(--status-warning-text)',
              }}
            >
              <AlertTriangle size={22} />
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Limite mínimo configurado individualmente por item
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                VALORIZAÇÃO ESTIMADA
              </span>
              <h3 style={{ fontSize: '2rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
                Custo Manual
              </h3>
            </div>
            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-sand-light)',
                color: 'var(--brand-primary)',
              }}
            >
              <TrendingUp size={22} />
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Cálculo transparente: Saldo × Custo Unitário Cadastrado
          </p>
        </div>
      </div>
    </div>
  );
};
