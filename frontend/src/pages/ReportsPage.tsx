import React, { useState, useEffect } from 'react';
import {
  Download,
  Filter,
  RefreshCw,
  Boxes,
  Clock,
  ShoppingBag,
  Hammer,
  BellRing,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  Category,
  StockReportItem,
  MovementReportItem,
  SalesReportResponse,
  ProductionReportResponse,
  NotificationLogItem,
} from '../types';
import { Badge } from '../components/Badge';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'sales' | 'production' | 'notifications'>('stock');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros Comuns
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtros Estoque
  const [stockItemType, setStockItemType] = useState<string>('');
  const [stockCategoryId, setStockCategoryId] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [stockData, setStockData] = useState<StockReportItem[]>([]);

  // Filtros Movimentações
  const [movementType, setMovementType] = useState<string>('');
  const [movementsData, setMovementsData] = useState<MovementReportItem[]>([]);

  // Filtros Vendas
  const [salesStatus, setSalesStatus] = useState<string>('');
  const [salesData, setSalesData] = useState<SalesReportResponse | null>(null);

  // Produção
  const [productionData, setProductionData] = useState<ProductionReportResponse | null>(null);

  // Notificações
  const [notificationLogs, setNotificationLogs] = useState<NotificationLogItem[]>([]);

  // Carrega Categorias
  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
  }, []);

  // Executa Busca conforme a aba ativa
  const fetchCurrentReport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === 'stock') {
        const data = await api.getReportsStock({
          item_type: stockItemType || undefined,
          category_id: stockCategoryId ? Number(stockCategoryId) : undefined,
          low_stock_only: lowStockOnly,
        });
        setStockData(data);
      } else if (activeTab === 'movements') {
        const data = await api.getReportsMovements({
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
          movement_type: movementType || undefined,
        });
        setMovementsData(data);
      } else if (activeTab === 'sales') {
        const data = await api.getReportsSales({
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
          status: salesStatus || undefined,
        });
        setSalesData(data);
      } else if (activeTab === 'production') {
        const data = await api.getReportsProduction({
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
        });
        setProductionData(data);
      } else if (activeTab === 'notifications') {
        const data = await api.getNotificationLogs(50);
        setNotificationLogs(data);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao processar relatório.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentReport();
  }, [activeTab, lowStockOnly]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      if (activeTab === 'stock') {
        await api.downloadReportCsv('stock', {
          item_type: stockItemType,
          category_id: stockCategoryId,
          low_stock_only: lowStockOnly,
        }, 'relatorio_estoque_casaluma.csv');
      } else if (activeTab === 'movements') {
        await api.downloadReportCsv('movements', {
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
          movement_type: movementType,
        }, 'extrato_movimentacoes_casaluma.csv');
      } else if (activeTab === 'sales') {
        await api.downloadReportCsv('sales', {
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
          status: salesStatus,
        }, 'relatorio_vendas_casaluma.csv');
      } else if (activeTab === 'production') {
        await api.downloadReportCsv('production', {
          start_date: startDate ? new Date(startDate).toISOString() : undefined,
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
        }, 'relatorio_producao_casaluma.csv');
      }
    } catch (err: any) {
      alert(`Erro na exportação CSV: ${err.message || 'Falha no download'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  const totalStockValuation = stockData.reduce((acc, item) => acc + (item.valuation || 0), 0);

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Cabeçalho Superior da Página */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.9rem', fontFamily: 'var(--font-serif)', color: 'var(--brand-primary)', margin: 0 }}>
            Relatórios e Auditoria Analítica
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Extratos consolidados, valorização de estoque e exportação em formato CSV padrão Excel.
          </p>
        </div>

        {activeTab !== 'notifications' && (
          <button
            onClick={handleExportCsv}
            disabled={isExporting || isLoading}
            className="btn-primary"
            style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={16} />
            <span>{isExporting ? 'Exportando CSV...' : 'Exportar para CSV'}</span>
          </button>
        )}
      </div>

      {/* Navegação entre Abas de Relatório */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('stock')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'stock' ? '2px solid var(--brand-accent)' : '2px solid transparent',
            color: activeTab === 'stock' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'stock' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <Boxes size={16} />
          <span>Estoque & Valorização</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'movements' ? '2px solid var(--brand-accent)' : '2px solid transparent',
            color: activeTab === 'movements' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'movements' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <Clock size={16} />
          <span>Extrato de Movimentações</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'sales' ? '2px solid var(--brand-accent)' : '2px solid transparent',
            color: activeTab === 'sales' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'sales' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <ShoppingBag size={16} />
          <span>Vendas & Mais Vendidos</span>
        </button>

        <button
          onClick={() => setActiveTab('production')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'production' ? '2px solid var(--brand-accent)' : '2px solid transparent',
            color: activeTab === 'production' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'production' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <Hammer size={16} />
          <span>Produção & Insumos</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'notifications' ? '2px solid var(--brand-accent)' : '2px solid transparent',
            color: activeTab === 'notifications' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'notifications' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <BellRing size={16} />
          <span>Logs de E-mail & Alertas</span>
        </button>
      </div>

      {/* Barra de Filtros Específicos */}
      {activeTab !== 'notifications' && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            padding: '18px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'flex-end',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {/* Filtros de Data (para movimentações, vendas e produção) */}
          {activeTab !== 'stock' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  DATA INICIAL
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field"
                  style={{ width: '150px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  DATA FINAL
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field"
                  style={{ width: '150px' }}
                />
              </div>
            </>
          )}

          {/* Filtros específicos da aba de Estoque */}
          {activeTab === 'stock' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  TIPO DE ITEM
                </label>
                <select
                  value={stockItemType}
                  onChange={(e) => setStockItemType(e.target.value)}
                  className="input-field"
                  style={{ width: '180px' }}
                >
                  <option value="">Todos os tipos</option>
                  <option value="PRODUTO_ACABADO">Produto Acabado</option>
                  <option value="MATERIA_PRIMA">Matéria-Prima</option>
                  <option value="EMBALAGEM">Embalagem</option>
                  <option value="MATERIAL_AUXILIAR">Material Auxiliar</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  CATEGORIA
                </label>
                <select
                  value={stockCategoryId}
                  onChange={(e) => setStockCategoryId(e.target.value)}
                  className="input-field"
                  style={{ width: '180px' }}
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                <input
                  type="checkbox"
                  id="chk-low-stock"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="chk-low-stock" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)', cursor: 'pointer' }}>
                  Apenas Estoque Crítico (Baixo ou Zerado)
                </label>
              </div>
            </>
          )}

          {/* Filtros específicos de Movimentações */}
          {activeTab === 'movements' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                TIPO DE OPERAÇÃO
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="input-field"
                style={{ width: '200px' }}
              >
                <option value="">Todas as operações</option>
                <option value="ENTRADA_INICIAL">Entrada Inicial</option>
                <option value="COMPRA">Compra</option>
                <option value="CONSUMO_PRODUCAO">Consumo Produção</option>
                <option value="ENTRADA_PRODUCAO">Entrada Produção</option>
                <option value="VENDA">Venda</option>
                <option value="AJUSTE_INVENTARIO">Ajuste de Inventário</option>
                <option value="PERDA">Perda / Descarte</option>
                <option value="DEVOLUCAO">Devolução</option>
                <option value="REVERSAO_CANCELAMENTO">Reversão / Estorno</option>
              </select>
            </div>
          )}

          {/* Filtros específicos de Vendas */}
          {activeTab === 'sales' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                STATUS DA VENDA
              </label>
              <select
                value={salesStatus}
                onChange={(e) => setSalesStatus(e.target.value)}
                className="input-field"
                style={{ width: '170px' }}
              >
                <option value="">Todos os status</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={fetchCurrentReport}
              className="btn-secondary"
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Filter size={15} />
              <span>Filtrar</span>
            </button>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="card" style={{ marginBottom: '24px', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', padding: '14px' }}>
          {error}
        </div>
      )}

      {/* Conteúdo Aba 1: Estoque & Valorização */}
      {activeTab === 'stock' && (
        <div>
          {/* Cards de Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="card">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ITENS LISTADOS</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>{stockData.length}</h3>
            </div>
            <div className="card">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>VALORIZAÇÃO ESTIMADA TOTAL</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>{formatCurrency(totalStockValuation)}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                Saldo atual × Custo unitário manual cadastrado
              </span>
            </div>
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    <th style={{ padding: '10px 12px' }}>SKU</th>
                    <th style={{ padding: '10px 12px' }}>ITEM</th>
                    <th style={{ padding: '10px 12px' }}>CATEGORIA</th>
                    <th style={{ padding: '10px 12px' }}>TIPO</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>SALDO ATUAL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>EST. MÍNIMO</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>CUSTO UNIT. (R$)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>VALORIZAÇÃO (R$)</th>
                    <th style={{ padding: '10px 12px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Carregando relatório de estoque...
                      </td>
                    </tr>
                  ) : !stockData.length ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Nenhum item localizado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    stockData.map((item) => (
                      <tr key={item.product_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>{item.sku}</td>
                        <td style={{ padding: '12px', fontWeight: 500 }}>{item.name}</td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.category}</td>
                        <td style={{ padding: '12px', fontSize: '0.82rem' }}>{item.item_type.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                          {item.current_stock} {item.unit}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {item.min_stock} {item.unit}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(item.unit_cost)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--brand-primary)' }}>
                          {formatCurrency(item.valuation)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge
                            variant={item.status === 'ZERADO' ? 'error' : item.status === 'BAIXO' ? 'warning' : 'success'}
                            label={item.status}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: Extrato de Movimentações */}
      {activeTab === 'movements' && (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  <th style={{ padding: '10px 12px' }}>DATA/HORA</th>
                  <th style={{ padding: '10px 12px' }}>SKU</th>
                  <th style={{ padding: '10px 12px' }}>ITEM</th>
                  <th style={{ padding: '10px 12px' }}>OPERAÇÃO</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>QUANTIDADE</th>
                  <th style={{ padding: '10px 12px' }}>RESPONSÁVEL</th>
                  <th style={{ padding: '10px 12px' }}>ORIGEM</th>
                  <th style={{ padding: '10px 12px' }}>JUSTIFICATIVA</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Carregando extrato de movimentações...
                    </td>
                  </tr>
                ) : !movementsData.length ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Nenhuma movimentação localizada para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  movementsData.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{m.created_at}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>{m.sku}</td>
                      <td style={{ padding: '12px', fontWeight: 500 }}>{m.product_name}</td>
                      <td style={{ padding: '12px' }}>
                        <Badge variant="default" label={m.movement_type.replace(/_/g, ' ')} />
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: m.quantity > 0 ? '#276749' : '#c53030',
                        }}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{m.user}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{m.reference || '—'}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{m.justification || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 3: Vendas & Produtos Mais Vendidos */}
      {activeTab === 'sales' && salesData && (
        <div>
          {/* Indicadores de Vendas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>FATURAMENTO CONFIRMADO</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
                {formatCurrency(salesData.summary.total_revenue)}
              </h3>
            </div>
            <div className="card">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>VENDAS CONFIRMADAS</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
                {salesData.summary.confirmed_count} / {salesData.summary.total_sales_count} totais
              </h3>
            </div>
            <div className="card">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TICKET MÉDIO</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
                {formatCurrency(salesData.summary.average_ticket)}
              </h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Lista de Vendas */}
            <div className="card">
              <h4 style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', marginBottom: '14px', fontFamily: 'var(--font-serif)' }}>
                Vendas do Período
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                      <th style={{ padding: '8px' }}>CÓDIGO</th>
                      <th style={{ padding: '8px' }}>CLIENTE</th>
                      <th style={{ padding: '8px' }}>STATUS</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>VALOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!salesData.sales.length ? (
                      <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhuma venda.</td></tr>
                    ) : (
                      salesData.sales.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--brand-primary)' }}>{s.sale_code}</td>
                          <td style={{ padding: '10px 8px' }}>{s.customer_name}</td>
                          <td style={{ padding: '10px 8px' }}><Badge variant="default" label={s.status} /></td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(s.total_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ranking Produtos Mais Vendidos */}
            <div className="card">
              <h4 style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', marginBottom: '14px', fontFamily: 'var(--font-serif)' }}>
                Produtos Mais Vendidos (Faturamento)
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                      <th style={{ padding: '8px' }}>SKU</th>
                      <th style={{ padding: '8px' }}>PRODUTO</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>QTD VENDIDA</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>FATURAMENTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!salesData.top_products.length ? (
                      <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Sem itens vendidos no período.</td></tr>
                    ) : (
                      salesData.top_products.map((p) => (
                        <tr key={p.sku} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--brand-primary)' }}>{p.sku}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 500 }}>{p.name}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{p.quantity}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--brand-primary)' }}>
                            {formatCurrency(p.revenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 4: Produção & Insumos */}
      {activeTab === 'production' && productionData && (
        <div>
          {/* Indicadores de Produção */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>LOTES CONCLUÍDOS</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
                {productionData.summary.completed_orders} / {productionData.summary.total_orders} ordens
              </h3>
            </div>
            <div className="card">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL FABRICADO (PRODUTOS ACABADOS)</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
                {productionData.summary.total_finished_units} unidades
              </h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Ordens */}
            <div className="card">
              <h4 style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', marginBottom: '14px', fontFamily: 'var(--font-serif)' }}>
                Ordens de Fabricação do Período
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                      <th style={{ padding: '8px' }}>ORDEM</th>
                      <th style={{ padding: '8px' }}>PRODUTO</th>
                      <th style={{ padding: '8px' }}>STATUS</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>QTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!productionData.orders.length ? (
                      <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhuma ordem no período.</td></tr>
                    ) : (
                      productionData.orders.map((o) => (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--brand-primary)' }}>{o.order_number}</td>
                          <td style={{ padding: '10px 8px' }}>{o.product_name}</td>
                          <td style={{ padding: '10px 8px' }}><Badge variant="default" label={o.status} /></td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{o.quantity} {o.unit}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insumos Consumidos */}
            <div className="card">
              <h4 style={{ fontSize: '1.1rem', color: 'var(--brand-primary)', marginBottom: '14px', fontFamily: 'var(--font-serif)' }}>
                Consumo Consolidado de Matérias-Primas
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                      <th style={{ padding: '8px' }}>SKU</th>
                      <th style={{ padding: '8px' }}>INSUMO / EMBALAGEM</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>TOTAL CONSUMIDO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!productionData.raw_materials_consumed.length ? (
                      <tr><td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhum insumo consumido.</td></tr>
                    ) : (
                      productionData.raw_materials_consumed.map((m) => (
                        <tr key={m.sku} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--brand-primary)' }}>{m.sku}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 500 }}>{m.name}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#c53030' }}>
                            {m.quantity} {m.unit}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba 5: Logs de Notificação & E-mails */}
      {activeTab === 'notifications' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--brand-primary)', margin: 0 }}>
                Auditoria de E-mails & Alertas Automáticos
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Registro rastreável de notificações enviadas, deduplicadas nas últimas 24h ou falhas capturadas.
              </p>
            </div>
            <button onClick={fetchCurrentReport} className="btn-secondary" style={{ padding: '8px 12px' }}>
              <RefreshCw size={15} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  <th style={{ padding: '10px 12px' }}>DATA/HORA</th>
                  <th style={{ padding: '10px 12px' }}>EVENTO</th>
                  <th style={{ padding: '10px 12px' }}>DESTINATÁRIO</th>
                  <th style={{ padding: '10px 12px' }}>ASSUNTO</th>
                  <th style={{ padding: '10px 12px' }}>STATUS</th>
                  <th style={{ padding: '10px 12px' }}>CHAVE DEDUPLICAÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {!notificationLogs.length ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Nenhum registro de e-mail no histórico.
                    </td>
                  </tr>
                ) : (
                  notificationLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {new Date(log.sent_at).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>{log.event_type}</td>
                      <td style={{ padding: '12px' }}>{log.recipient}</td>
                      <td style={{ padding: '12px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.subject}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge
                          variant={log.status === 'SENT' || log.status === 'MOCK' ? 'success' : log.status === 'SKIPPED' ? 'warning' : 'error'}
                          label={log.status}
                        />
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {log.deduplication_key || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
