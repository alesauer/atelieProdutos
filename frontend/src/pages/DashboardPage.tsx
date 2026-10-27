import React, { useState, useEffect } from 'react';
import {
  Package,
  Boxes,
  Hammer,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BellRing,
  RefreshCw,
  FileBarChart2,
  ChevronRight,
  Info,
  Clock,
} from 'lucide-react';
import { api } from '../api/client';
import type { DashboardMetrics } from '../types';
import { Badge } from '../components/Badge';
import { formatDateTime } from '../utils/date';

const formatQuantity = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar métricas operacionais.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleTriggerAlertCheck = async () => {
    try {
      setIsCheckingAlerts(true);
      setAlertFeedback(null);
      const res = await api.triggerStockAlertCheck();
      setAlertFeedback(`Verificação concluída: ${res.processed_count} alertas avaliados/enviados.`);
      setTimeout(() => setAlertFeedback(null), 5000);
    } catch (err: any) {
      setAlertFeedback(`Erro ao checar alertas: ${err.message || 'Falha no servidor'}`);
    } finally {
      setIsCheckingAlerts(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const formatDate = (isoString: string) => {
    return formatDateTime(isoString);
  };

  const getMovementTypeBadgeVariant = (type: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (type) {
      case 'ENTRADA_INICIAL':
      case 'COMPRA':
      case 'ENTRADA_PRODUCAO':
      case 'DEVOLUCAO':
        return 'success';
      case 'CONSUMO_PRODUCAO':
      case 'VENDA':
        return 'default';
      case 'PERDA':
      case 'SAIDA_MANUAL':
        return 'error';
      case 'AJUSTE_INVENTARIO':
        return 'warning';
      case 'REVERSAO_CANCELAMENTO':
        return 'info';
      default:
        return 'default';
    }
  };

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
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
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
              Visão Geral do Ateliê
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
              Ateliê Casa Luma — Gestão Integrada
            </h2>
            <p
              style={{
                fontSize: '0.98rem',
                color: 'var(--text-secondary)',
                maxWidth: '680px',
                lineHeight: 1.55,
              }}
            >
              Acompanhamento contínuo de matérias-primas botânicas, formulações artesanais,
              lotes de produção, faturamento e alertas de reposição.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleTriggerAlertCheck}
              disabled={isCheckingAlerts}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              title="Disparar verificação de estoque baixo e envio de e-mails"
            >
              <BellRing size={15} style={{ animation: isCheckingAlerts ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isCheckingAlerts ? 'Verificando...' : 'Verificar Alertas'}</span>
            </button>
            <button
              onClick={fetchMetrics}
              className="btn-secondary"
              style={{ padding: '8px 12px' }}
              title="Atualizar dados"
            >
              <RefreshCw size={15} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {alertFeedback && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-sand-light)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.86rem',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #e1d6c8',
            }}
          >
            <Info size={16} />
            <span>{alertFeedback}</span>
          </div>
        )}

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
            <span>Livro-Razão & Estoque</span>
          </button>
          <button
            onClick={() => onNavigate('producao')}
            className="btn-secondary"
            style={{ padding: '10px 18px' }}
          >
            <Hammer size={16} />
            <span>Ordens de Produção</span>
          </button>
          <button
            onClick={() => onNavigate('vendas')}
            className="btn-secondary"
            style={{ padding: '10px 18px' }}
          >
            <ShoppingBag size={16} />
            <span>Registrar Venda</span>
          </button>
          <button
            onClick={() => onNavigate('relatorios')}
            className="btn-secondary"
            style={{ padding: '10px 18px' }}
          >
            <FileBarChart2 size={16} />
            <span>Relatórios & CSV</span>
          </button>
        </div>
      </div>

      {/* Tratamento de Erro */}
      {error && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            backgroundColor: 'var(--status-error-bg)',
            borderColor: 'var(--status-error-border)',
            color: 'var(--status-error-text)',
            padding: '16px',
          }}
        >
          <p style={{ fontWeight: 600 }}>{error}</p>
          <button
            onClick={fetchMetrics}
            className="btn-secondary"
            style={{ marginTop: '10px', fontSize: '0.85rem' }}
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Cards de Métricas Chave */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Card 1: Itens Ativos */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ITENS ATIVOS NO CATÁLOGO
              </span>
              <h3 style={{ fontSize: '2.1rem', marginTop: '6px', color: 'var(--brand-primary)', fontFamily: 'var(--font-sans)' }}>
                {isLoading ? '...' : metrics?.catalog.total_active_items ?? 0}
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
            Produtos acabados, matérias-primas e embalagens
          </p>
        </div>

        {/* Card 2: Estoque Crítico */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ALERTAS DE ESTOQUE
              </span>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'baseline', marginTop: '6px' }}>
                <span style={{ fontSize: '2.1rem', fontWeight: 700, color: '#c05621' }}>
                  {isLoading ? '...' : metrics?.catalog.items_low_stock ?? 0}
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '4px' }}>
                    alerta (≤ 5)
                  </span>
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c53030' }}>
                  / {isLoading ? '...' : metrics?.catalog.items_zero_stock ?? 0}
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '4px' }}>
                    zerados
                  </span>
                </span>
              </div>
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
            Itens exigindo compra ou nova ordem de fabricação
          </p>
        </div>

        {/* Card 3: Valorização Estimada */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                VALORIZAÇÃO ESTIMADA DO ESTOQUE
              </span>
              <h3 style={{ fontSize: '2.1rem', marginTop: '6px', color: 'var(--brand-primary)', fontFamily: 'var(--font-sans)' }}>
                {isLoading ? '...' : formatCurrency(metrics?.catalog.total_valuation ?? 0)}
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
            Cálculo transparente: Saldo atual × Custo unitário cadastrado
          </p>
        </div>
      </div>

      {/* Grid Principal: Itens Críticos + Resumos de Vendas e Produção */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* Painel: Itens em Alerta de Estoque */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--brand-primary)', margin: 0 }}>
              Itens em Nível Crítico
            </h3>
            <button
              onClick={() => onNavigate('estoque')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-accent)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Ver Estoque</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Carregando itens críticos...
            </div>
          ) : !metrics?.critical_items.length ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-sand-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              <CheckCircle2 size={32} style={{ color: '#276749', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Nenhum item em nível crítico</p>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Todos os produtos e insumos estão dentro da margem segura.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {metrics.critical_items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: item.status === 'ZERO' ? '#fff5f5' : '#fffaf0',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {item.sku}
                      </span>
                      <Badge
                        variant={item.status === 'ZERO' ? 'error' : 'warning'}
                        label={item.status === 'ZERO' ? 'ESGOTADO' : 'ESTOQUE BAIXO'}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: 'var(--brand-primary)',
                        margin: '2px 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Saldo: <strong>{formatQuantity(item.current_stock)} {item.unit}</strong> (Alerta: ≤ 5.00)
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate('estoque')}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    Ajustar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel: Atividades e Desempenho (30 dias) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card Vendas Recentes */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} style={{ color: 'var(--brand-accent)' }} />
                <h4 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--brand-primary)' }}>
                  Vendas dos Últimos 30 Dias
                </h4>
              </div>
              <button
                onClick={() => onNavigate('vendas')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-accent)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Ver Vendas
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>
                  FATURAMENTO CONFIRMADO
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {isLoading ? '...' : formatCurrency(metrics?.sales_summary.revenue_30d ?? 0)}
                </span>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>
                  PEDIDOS CONFIRMADOS
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {isLoading ? '...' : metrics?.sales_summary.confirmed_count_30d ?? 0}
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '4px' }}>
                    vendas
                  </span>
                </span>
              </div>
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Rascunhos em aberto: <strong>{metrics?.sales_summary.draft_pending_count ?? 0} pedidos</strong>
            </div>
          </div>

          {/* Card Produção Recente */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hammer size={18} style={{ color: 'var(--brand-accent)' }} />
                <h4 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--brand-primary)' }}>
                  Produção dos Últimos 30 Dias
                </h4>
              </div>
              <button
                onClick={() => onNavigate('producao')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-accent)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Ver Ordens
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>
                  LOTES CONCLUÍDOS
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {isLoading ? '...' : metrics?.production_summary.completed_count_30d ?? 0}
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '4px' }}>
                    ordens
                  </span>
                </span>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>
                  UNIDADES PRODUZIDAS
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {isLoading ? '...' : metrics?.production_summary.units_produced_30d ?? 0}
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '4px' }}>
                    itens
                  </span>
                </span>
              </div>
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Ordens em rascunho: <strong>{metrics?.production_summary.draft_pending_count ?? 0} lotes</strong>
            </div>
          </div>

        </div>
      </div>

      {/* Painel Inferior: Últimas Movimentações */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: 'var(--brand-accent)' }} />
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--brand-primary)', margin: 0 }}>
              Últimas Movimentações de Estoque
            </h3>
          </div>
          <button
            onClick={() => onNavigate('estoque')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand-accent)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Extrato Completo</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Carregando movimentações recentes...
          </div>
        ) : !metrics?.recent_movements.length ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Nenhuma movimentação registrada até o momento.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  <th style={{ padding: '10px 12px' }}>DATA/HORA</th>
                  <th style={{ padding: '10px 12px' }}>SKU</th>
                  <th style={{ padding: '10px 12px' }}>ITEM</th>
                  <th style={{ padding: '10px 12px' }}>OPERAÇÃO</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>QUANTIDADE</th>
                  <th style={{ padding: '10px 12px' }}>MOTIVO / JUSTIFICATIVA</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recent_movements.map((mov) => (
                  <tr
                    key={mov.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDate(mov.created_at)}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--brand-primary)', whiteSpace: 'nowrap' }}>
                      {mov.product_sku}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {mov.product_name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={getMovementTypeBadgeVariant(mov.movement_type)}
                        label={mov.movement_type.replace(/_/g, ' ')}
                      />
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: mov.quantity > 0 ? '#276749' : '#c53030',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {mov.quantity > 0 ? `+${formatQuantity(mov.quantity)}` : formatQuantity(mov.quantity)} {mov.unit}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {mov.justification || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
