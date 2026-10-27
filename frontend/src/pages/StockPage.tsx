import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  SlidersHorizontal,
  History,
  CheckCircle2,
  Search,
  Loader2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

import { api } from '../api/client';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { formatDateTime } from '../utils/date';
import type { StockBalanceItem, StockMovementItem, Product } from '../types';

const formatQuantity = (val: number | string | undefined | null): string => {
  if (val === null || val === undefined || val === '') return '0.00';
  const num = Number(val);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};

export const StockPage: React.FC = () => {
  const [balances, setBalances] = useState<StockBalanceItem[]>([]);
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'balances' | 'movements'>('balances');
  const [search, setSearch] = useState('');

  // Modais
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

  // Form de Ajuste
  const [adjProductId, setAdjProductId] = useState<number>(0);
  const [adjDelta, setAdjDelta] = useState<string>('');
  const [adjJustification, setAdjJustification] = useState<string>('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Form de Entrada
  const [entryProductId, setEntryProductId] = useState<number>(0);
  const [entryQuantity, setEntryQuantity] = useState<string>('');
  const [entryCost, setEntryCost] = useState<string>('');
  const [entryJustification, setEntryJustification] = useState<string>('');
  const [entrySubmitting, setEntrySubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bData, mData, pData] = await Promise.all([
        api.getStockBalances(),
        api.listStockMovements(),
        api.listProducts({ active_only: true }),
      ]);
      setBalances(bData);
      setMovements(mData);
      setProducts(pData);

      if (pData.length > 0 && !adjProductId) {
        const first = pData[0].variations && pData[0].variations.length > 0 ? pData[0].variations[0].id : pData[0].id;
        setAdjProductId(first);
        setEntryProductId(first);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados do estoque.');
    } finally {
      setLoading(false);
    }
  };

  const selectableProducts = products.flatMap((p) => {
    if (p.variations && p.variations.length > 0) {
      return p.variations.map((v) => ({
        ...p,
        id: v.id,
        sku: v.sku,
        name: `${p.name} - ${v.variation_name || v.color || 'Variação'}`,
      }));
    }
    return [p];
  });

  useEffect(() => {
    loadData();
  }, []);

  const filteredBalances = balances.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = balances.reduce(
    (acc, b) => acc + Number(b.estimated_total_value || 0),
    0
  );
  const lowStockCount = balances.filter(
    (b) => Number(b.current_stock) > 0 && Number(b.current_stock) <= 5
  ).length;
  const zeroStockCount = balances.filter((b) => b.is_zero_stock || Number(b.current_stock) <= 0).length;

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjJustification.trim()) {
      alert('A justificativa é obrigatória para qualquer ajuste de inventário.');
      return;
    }
    setAdjSubmitting(true);
    try {
      await api.createStockAdjustment(adjProductId, adjDelta, adjJustification);
      setIsAdjModalOpen(false);
      setAdjDelta('');
      setAdjJustification('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ajuste.');
    } finally {
      setAdjSubmitting(false);
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrySubmitting(true);
    try {
      await api.createStockEntry(
        entryProductId,
        entryQuantity,
        entryCost ? entryCost : undefined,
        entryJustification
      );
      setIsEntryModalOpen(false);
      setEntryQuantity('');
      setEntryCost('');
      setEntryJustification('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar entrada.');
    } finally {
      setEntrySubmitting(false);
    }
  };

  const handleQuickAdjust = (productId: number) => {
    setAdjProductId(productId);
    setAdjDelta('');
    setAdjJustification('');
    setIsAdjModalOpen(true);
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Cards de Métricas do Estoque */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            VALORIZAÇÃO TOTAL ESTIMADA
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Cálculo: Saldo Atual × Custo Unitário Cadastrado
          </span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ITENS MONITORADOS
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
            {balances.length}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Produtos acabados, matérias-primas e embalagens
          </span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ALERTA DE PRODUÇÃO
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--status-warning-text)' }}>
            {lowStockCount}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Itens com 5 peças ou menos (produção requerida)
          </span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ITENS SEM ESTOQUE
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--status-danger-text)' }}>
            {zeroStockCount}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Saldo zerado ou em falta no ateliê
          </span>
        </div>
      </div>

      {/* Barra de Ações & Navegação de Abas */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('balances')}
            className={activeTab === 'balances' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px' }}
          >
            <Boxes size={16} />
            <span>Saldos em Tempo Real</span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px' }}
          >
            <History size={16} />
            <span>Extrato de Movimentações</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '9px 16px' }}
          >
            <Plus size={16} />
            <span>Entrada por Compra</span>
          </button>
          <button
            onClick={() => setIsAdjModalOpen(true)}
            className="btn-primary"
            style={{ padding: '9px 16px' }}
          >
            <SlidersHorizontal size={16} />
            <span>Ajuste de Inventário</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} className="spin-animation" color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Calculando saldos em estoque...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '24px',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--status-danger-text)',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={28} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 600 }}>{error}</p>
        </div>
      ) : activeTab === 'balances' ? (
        /* Aba de Saldos */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
              <input
                type="text"
                placeholder="Filtrar por item ou SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', paddingRight: '12px', height: '38px' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ITEM / SKU</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TIPO</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CATEGORIA</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SALDO ATUAL</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ESTOQUE MÍN.</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SITUAÇÃO</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CUSTO UNIT.</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>VALOR TOTAL</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((b) => (
                  <tr
                    key={b.product_id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.95rem' }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        {b.sku}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <Badge type={b.item_type} />
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {b.category_name || '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: b.is_zero_stock || Number(b.current_stock) <= 0
                            ? 'var(--status-danger-text)'
                            : Number(b.current_stock) <= 5
                            ? 'var(--status-warning-text)'
                            : 'var(--brand-primary)',
                        }}
                      >
                        {formatQuantity(b.current_stock)}
                      </span>{' '}
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{b.unit_code}</span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {formatQuantity(b.min_stock || 5)} {b.unit_code}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {b.is_zero_stock || Number(b.current_stock) <= 0 ? (
                        <Badge status="zero_stock" />
                      ) : Number(b.current_stock) <= 5 ? (
                        <Badge status="low_stock" />
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--status-active-text)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={14} /> Normal
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      R$ {Number(b.unit_cost).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                      R$ {Number(b.estimated_total_value).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleQuickAdjust(b.product_id)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Aba de Extrato de Movimentações */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DATA / HORA</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ITEM</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>OPERAÇÃO</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>QUANTIDADE</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>JUSTIFICATIVA / NOTAS</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>OPERADOR</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const qty = Number(m.quantity);
                  const isPositive = qty > 0;
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatDateTime(m.created_at)}
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '0.9rem' }}>
                          {m.product_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                          {m.product_sku}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: 'var(--bg-sand-light)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {m.movement_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            color: isPositive ? 'var(--status-active-text)' : 'var(--status-danger-text)',
                          }}
                        >
                          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          {isPositive ? `+${formatQuantity(qty)}` : formatQuantity(qty)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {m.justification || '—'}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                        {m.user_name || 'Sistema'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Ajuste de Inventário */}
      <Modal
        isOpen={isAdjModalOpen}
        onClose={() => setIsAdjModalOpen(false)}
        title="Ajuste Manual de Inventário"
        subtitle="O estoque é imutável. Ajustes manuais exigem justificativa obrigatória para auditoria."
        maxWidth="520px"
      >
        <form onSubmit={handleCreateAdjustment}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="adj-product">Item do Ateliê *</label>
            <select
              id="adj-product"
              value={adjProductId}
              onChange={(e) => setAdjProductId(Number(e.target.value))}
            >
              {selectableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="adj-delta">Diferença de Quantidade (+ ou -) *</label>
            <input
              id="adj-delta"
              type="number"
              step="0.001"
              required
              value={adjDelta}
              onChange={(e) => setAdjDelta(e.target.value)}
              placeholder="Ex.: +5.000 para adicionar ou -2.000 para perda"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
              Insira valor positivo para adicionar saldo ou negativo para baixar. O sistema impede saldo negativo.
            </span>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="adj-just">Justificativa da Auditoria *</label>
            <textarea
              id="adj-just"
              rows={3}
              required
              value={adjJustification}
              onChange={(e) => setAdjJustification(e.target.value)}
              placeholder="Ex.: Quebra de 2 frascos no transporte / Contagem física periódica"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsAdjModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={adjSubmitting} className="btn-primary">
              {adjSubmitting ? 'Gravando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Entrada por Compra */}
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        title="Entrada por Compra / Recebimento"
        subtitle="Registrar aumento de saldo de matéria-prima, embalagem ou produto"
        maxWidth="520px"
      >
        <form onSubmit={handleCreateEntry}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="entry-product">Item do Ateliê *</label>
            <select
              id="entry-product"
              value={entryProductId}
              onChange={(e) => setEntryProductId(Number(e.target.value))}
            >
              {selectableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="entry-qty">Quantidade Recebida *</label>
              <input
                id="entry-qty"
                type="number"
                step="0.001"
                min="0.001"
                required
                value={entryQuantity}
                onChange={(e) => setEntryQuantity(e.target.value)}
                placeholder="Ex.: 25.000"
              />
            </div>
            <div>
              <label htmlFor="entry-cost">Novo Custo Unit. (R$)</label>
              <input
                id="entry-cost"
                type="number"
                step="0.01"
                min="0"
                value={entryCost}
                onChange={(e) => setEntryCost(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="entry-just">Referência da Entrada / Nota Fiscal</label>
            <input
              id="entry-just"
              type="text"
              value={entryJustification}
              onChange={(e) => setEntryJustification(e.target.value)}
              placeholder="Ex.: Compra Fornecedor Soja Verde - NF 44102"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsEntryModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={entrySubmitting} className="btn-primary">
              {entrySubmitting ? 'Gravando...' : 'Dar Entrada no Estoque'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
