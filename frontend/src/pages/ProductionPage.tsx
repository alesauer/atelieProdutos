import React, { useState, useEffect } from 'react';
import {
  Hammer,
  Plus,
  BookOpen,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
  Palette,
} from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDateOnly } from '../utils/date';
import type { ProductionOrder, Recipe, Product, ProductColor } from '../types';

const formatQuantity = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};

export const ProductionPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'orders' | 'recipes'>('orders');

  // Modal Nova Ordem
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderProductId, setOrderProductId] = useState<number>(0);
  const [orderRecipeId, setOrderRecipeId] = useState<number | null>(null);
  const [orderColor, setOrderColor] = useState<string>('');
  const [orderPlannedQty, setOrderPlannedQty] = useState<string>('1');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Cores cadastradas e Modal Rápido de Criação de Cor
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [isQuickColorModalOpen, setIsQuickColorModalOpen] = useState(false);
  const [quickColorName, setQuickColorName] = useState('');
  const [quickColorHex, setQuickColorHex] = useState('#d1d5db');
  const [savingQuickColor, setSavingQuickColor] = useState(false);
  const [quickColorError, setQuickColorError] = useState<string | null>(null);

  // Modal Nova Receita
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeProductId, setRecipeProductId] = useState<number>(0);
  const [recipeName, setRecipeName] = useState<string>('');
  const [recipeYield, setRecipeYield] = useState<string>('1');
  const [recipeInstructions, setRecipeInstructions] = useState<string>('');
  const [recipeItems, setRecipeItems] = useState<{ component_product_id: number; standard_quantity: string }[]>([]);
  const [submittingRecipe, setSubmittingRecipe] = useState(false);

  // Modal Detalhes da Ordem
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [oData, rData, pData, cData] = await Promise.all([
        api.listProductionOrders(),
        api.listRecipes(),
        api.listProducts({ active_only: true }),
        api.listColors(),
      ]);
      setOrders(oData);
      setRecipes(rData);
      setProducts(pData);
      setColors(cData);

      const finishedProds = pData.filter((p) => p.item_type === 'PRODUTO_ACABADO');
      if (finishedProds.length > 0 && !orderProductId) {
        setOrderProductId(finishedProds[0].id);
        setRecipeProductId(finishedProds[0].id);
        if (finishedProds[0].color) {
          setOrderColor(finishedProds[0].color);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar ordens de produção.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const finishedProducts = products.flatMap((p) => {
    if (p.item_type !== 'PRODUTO_ACABADO') return [];
    if (p.variations && p.variations.length > 0) {
      return p.variations.map((v) => ({
        ...p,
        id: v.id,
        sku: v.sku,
        name: `${p.name} - ${v.variation_name || v.color || 'Variação'}`,
        color: v.color || p.color,
        current_stock: v.current_stock,
      }));
    }
    return [p];
  });
  const rawMaterials = products.filter((p) => p.item_type !== 'PRODUTO_ACABADO');

  // Ao selecionar o produto na nova ordem, tenta auto-selecionar a receita e cor vinculadas
  const handleProductChangeInOrder = (prodId: number) => {
    setOrderProductId(prodId);
    const foundRecipe = recipes.find((r) => r.product_id === prodId);
    setOrderRecipeId(foundRecipe ? foundRecipe.id : null);
    const foundProd = finishedProducts.find((p) => p.id === prodId) || products.find((p) => p.id === prodId);
    if (foundProd && foundProd.color) {
      setOrderColor(foundProd.color);
    }
  };

  const handleSaveQuickColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickColorName.trim()) {
      setQuickColorError('Informe o nome da cor.');
      return;
    }
    setSavingQuickColor(true);
    setQuickColorError(null);
    try {
      const created = await api.createColor(quickColorName.trim(), quickColorHex);
      setColors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setOrderColor(created.name);
      setIsQuickColorModalOpen(false);
      setQuickColorName('');
      setQuickColorHex('#d1d5db');
    } catch (err: any) {
      setQuickColorError(err.message || 'Erro ao cadastrar cor.');
    } finally {
      setSavingQuickColor(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOrder(true);
    try {
      await api.createDraftOrder({
        product_id: orderProductId,
        recipe_id: orderRecipeId,
        color: orderColor || null,
        planned_quantity: orderPlannedQty,
        notes: orderNotes,
      });
      setIsOrderModalOpen(false);
      setOrderNotes('');
      setOrderColor('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar ordem de produção.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleConfirmOrder = async (orderId: number) => {
    if (
      !confirm(
        'Confirmar produção agora? Os insumos serão debitados e o produto acabado adicionado ao estoque em transação atômica única.'
      )
    ) {
      return;
    }
    try {
      await api.confirmOrder(orderId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar produção.');
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (
      !confirm(
        'Deseja realmente cancelar esta ordem de produção? Se já confirmada, as movimentações serão estornadas automaticamente.'
      )
    ) {
      return;
    }
    try {
      await api.cancelOrder(orderId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar ordem.');
    }
  };

  const handleDeleteOrder = async (orderId: number, orderNumber: string) => {
    if (!confirm(`Deseja realmente excluir permanentemente a ordem de produção "${orderNumber}"?`)) return;
    try {
      await api.deleteProductionOrder(orderId);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir ordem de produção.');
    }
  };

  const handleDeleteRecipe = async (recipeId: number, recipeName: string) => {
    if (!confirm(`Deseja realmente excluir permanentemente a ficha técnica "${recipeName}"?`)) return;
    try {
      await api.deleteRecipe(recipeId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir ficha técnica.');
    }
  };

  // Gerenciamento dos itens da nova receita
  const handleAddRecipeItem = () => {
    if (rawMaterials.length === 0) return;
    setRecipeItems([
      ...recipeItems,
      { component_product_id: rawMaterials[0].id, standard_quantity: '0.100' },
    ]);
  };

  const handleRemoveRecipeItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recipeItems.length === 0) {
      alert('Adicione pelo menos um insumo à ficha técnica.');
      return;
    }
    setSubmittingRecipe(true);
    try {
      await api.createRecipe({
        product_id: recipeProductId,
        name: recipeName,
        yield_quantity: recipeYield,
        instructions: recipeInstructions,
        items: recipeItems,
      });
      setIsRecipeModalOpen(false);
      setRecipeName('');
      setRecipeInstructions('');
      setRecipeItems([]);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar ficha técnica.');
    } finally {
      setSubmittingRecipe(false);
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Cards de Métricas de Produção */}
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
            ORDENS REGISTRADAS
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
            {orders.length}
          </h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            EM RASCUNHO (PLANEJADAS)
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--brand-accent)' }}>
            {orders.filter((o) => o.status === 'RASCUNHO').length}
          </h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            CONFIRMADAS (PRODUZIDAS)
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--status-active-text)' }}>
            {orders.filter((o) => o.status === 'CONFIRMADA').length}
          </h3>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            FICHAS TÉCNICAS (BOM)
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
            {recipes.length}
          </h3>
        </div>
      </div>

      {/* Barra de Ações & Abas */}
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
            onClick={() => setActiveTab('orders')}
            className={activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px' }}
          >
            <Hammer size={16} />
            <span>Ordens de Produção</span>
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={activeTab === 'recipes' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px' }}
          >
            <BookOpen size={16} />
            <span>Fichas Técnicas (BOM)</span>
          </button>
        </div>

        <div>
          {activeTab === 'orders' ? (
            <button onClick={() => setIsOrderModalOpen(true)} className="btn-primary">
              <Plus size={16} />
              <span>Nova Ordem de Produção</span>
            </button>
          ) : (
            <button onClick={() => setIsRecipeModalOpen(true)} className="btn-primary">
              <Plus size={16} />
              <span>Nova Ficha Técnica</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} className="spin-animation" color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Carregando dados da produção...</p>
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
      ) : activeTab === 'orders' ? (
        /* Aba de Ordens de Produção */
        orders.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <Hammer size={42} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.3rem', color: 'var(--brand-primary)', marginBottom: '4px' }}>
              Nenhuma ordem de produção iniciada
            </h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '18px' }}>
              Crie uma ordem em rascunho para calcular o consumo de insumos antes de produzir.
            </p>
            <button onClick={() => setIsOrderModalOpen(true)} className="btn-secondary">
              <Plus size={16} />
              <span>Criar Primeira Ordem</span>
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ORDEM</th>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PRODUTO ACABADO</th>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PLANEJADO</th>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PRODUZIDO</th>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>STATUS</th>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DATA</th>
                    <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-primary)' }}>
                        {o.order_number}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div>{o.product_name}</div>
                        {o.color && (
                          <div style={{ marginTop: '4px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '1px 8px',
                                borderRadius: '10px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                backgroundColor: '#f3e8ff',
                                color: '#6b21a8',
                                border: '1px solid #e9d5ff',
                              }}
                            >
                              🎨 {o.color}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '0.9rem' }}>
                        {formatQuantity(o.planned_quantity)}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '0.9rem', fontWeight: 600 }}>
                        {o.produced_quantity ? formatQuantity(o.produced_quantity) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor:
                              o.status === 'CONFIRMADA'
                                ? 'var(--status-active-bg)'
                                : o.status === 'RASCUNHO'
                                ? 'var(--status-warning-bg)'
                                : 'var(--status-danger-bg)',
                            color:
                              o.status === 'CONFIRMADA'
                                ? 'var(--status-active-text)'
                                : o.status === 'RASCUNHO'
                                ? 'var(--status-warning-text)'
                                : 'var(--status-danger-text)',
                          }}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatDateOnly(o.created_at)}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          >
                            <FileText size={14} /> Detalhes
                          </button>
                          {o.status === 'RASCUNHO' && (
                            <button
                              onClick={() => handleConfirmOrder(o.id)}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                            >
                              <CheckCircle2 size={14} /> Confirmar
                            </button>
                          )}
                          {o.status !== 'CANCELADA' && (
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              className="btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--status-danger-text)' }}
                              title="Cancelar e reverter estoque"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(o.id, o.order_number)}
                            className="btn-secondary"
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.78rem',
                              color: 'var(--status-danger-text)',
                            }}
                            title="Excluir ordem permanentemente"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Aba de Fichas Técnicas */
        recipes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <BookOpen size={42} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.3rem', color: 'var(--brand-primary)', marginBottom: '4px' }}>
              Nenhuma ficha técnica cadastrada
            </h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '18px' }}>
              Cadastre a composição padrão (BOM) dos seus produtos artesanais para cálculo automático de insumos.
            </p>
            <button onClick={() => setIsRecipeModalOpen(true)} className="btn-secondary">
              <Plus size={16} />
              <span>Criar Primeira Ficha</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {recipes.map((r) => (
              <div key={r.id} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                    {r.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-accent)' }}>
                      Rende: {formatQuantity(r.yield_quantity)} un
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecipe(r.id, r.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--status-danger-text)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Excluir ficha técnica"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '14px' }}>
                  Produto: {r.product_name}
                </p>

                <div style={{ backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Composição do Lote ({r.items.length} insumos):
                  </span>
                  <ul style={{ listStyle: 'none', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {r.items.map((it) => (
                      <li key={it.id} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{it.component_name}</span>
                        <span style={{ fontWeight: 600 }}>{formatQuantity(it.standard_quantity)} {it.component_unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {r.instructions && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {r.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Nova Ordem de Produção */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Nova Ordem de Produção"
        subtitle="A ordem será criada em Rascunho sem alterar o estoque físico até a confirmação"
        maxWidth="540px"
      >
        <form onSubmit={handleCreateOrder}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="order-product">Produto Acabado a Fabricar *</label>
            <select
              id="order-product"
              value={orderProductId}
              onChange={(e) => handleProductChangeInOrder(Number(e.target.value))}
            >
              {finishedProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="order-qty">Quantidade Planejada *</label>
              <input
                id="order-qty"
                type="number"
                step="0.001"
                min="0.001"
                required
                value={orderPlannedQty}
                onChange={(e) => setOrderPlannedQty(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="order-recipe">Ficha Técnica Base</label>
              <select
                id="order-recipe"
                value={orderRecipeId || ''}
                onChange={(e) => setOrderRecipeId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Sem ficha automática</option>
                {recipes
                  .filter((r) => r.product_id === orderProductId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Combobox de Cor do Produto com Botão "+" para Adicionar Nova Cor */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="order-color" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={15} color="var(--brand-accent)" />
                <span>Cor do Produto / Produção</span>
              </label>
              {orderColor && (
                <button
                  type="button"
                  onClick={() => setOrderColor('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Limpar cor
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <select
                  id="order-color"
                  value={orderColor}
                  onChange={(e) => setOrderColor(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Selecione uma cor (ou neutro/padrão)</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickColorName('');
                  setQuickColorHex('#d1d5db');
                  setQuickColorError(null);
                  setIsQuickColorModalOpen(true);
                }}
                className="btn-secondary"
                style={{
                  padding: '8px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                }}
                title="Cadastrar nova cor para produção"
              >
                <Plus size={16} />
                <span>Nova Cor</span>
              </button>
            </div>
            {orderColor && (
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {(() => {
                  const activeCol = colors.find((c) => c.name.toLowerCase() === orderColor.toLowerCase());
                  return activeCol?.hex_code ? (
                    <span
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: activeCol.hex_code,
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                    />
                  ) : null;
                })()}
                <span>Cor selecionada para esta OP: <strong>{orderColor}</strong></span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="order-notes">Notas / Lote do Ateliê</label>
            <textarea
              id="order-notes"
              rows={2}
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Ex.: Lote artesanal de primavera, cura estimada de 48h..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsOrderModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={submittingOrder} className="btn-primary">
              {submittingOrder ? 'Criando Rascunho...' : 'Criar Ordem em Rascunho'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalhes da Ordem de Produção */}
      {selectedOrder && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          title={`Ordem ${selectedOrder.order_number}`}
          subtitle={`Produto: ${selectedOrder.product_name} | Status: ${selectedOrder.status}`}
          maxWidth="600px"
        >
          {selectedOrder.color && (
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cor da Produção:</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: '#f3e8ff',
                  color: '#6b21a8',
                  border: '1px solid #e9d5ff',
                }}
              >
                🎨 {selectedOrder.color}
              </span>
            </div>
          )}

          {selectedOrder.notes && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: 'var(--bg-sand-light)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Notas / Lote:</span>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{selectedOrder.notes}</p>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '8px' }}>
              Insumos e Matérias-Primas do Lote:
            </h4>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-sand-light)' }}>
                    <th style={{ padding: '8px 12px' }}>Insumo</th>
                    <th style={{ padding: '8px 12px' }}>Previsto</th>
                    <th style={{ padding: '8px 12px' }}>Real Consumido</th>
                    <th style={{ padding: '8px 12px' }}>Perda</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{it.component_name}</td>
                      <td style={{ padding: '8px 12px' }}>{formatQuantity(it.planned_quantity)} {it.component_unit}</td>
                      <td style={{ padding: '8px 12px' }}>{formatQuantity(it.actual_quantity || it.planned_quantity)} {it.component_unit}</td>
                      <td style={{ padding: '8px 12px' }}>{formatQuantity(it.loss_quantity)} {it.component_unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => handleDeleteOrder(selectedOrder.id, selectedOrder.order_number)}
              className="btn-secondary"
              style={{
                color: 'var(--status-danger-text)',
                borderColor: 'var(--status-danger-border, #f5c2c7)',
                backgroundColor: 'var(--status-danger-bg, #f8d7da)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={15} /> Excluir Ordem
            </button>
            <button onClick={() => setSelectedOrder(null)} className="btn-secondary">
              Fechar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Nova Ficha Técnica */}
      <Modal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        title="Nova Ficha Técnica (BOM)"
        subtitle="Defina a receita mestre e a proporção de insumos para fabricar o produto"
        maxWidth="620px"
      >
        <form onSubmit={handleCreateRecipe}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="rec-product">Produto Acabado *</label>
            <select
              id="rec-product"
              value={recipeProductId}
              onChange={(e) => setRecipeProductId(Number(e.target.value))}
            >
              {finishedProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="rec-name">Nome da Receita *</label>
              <input
                id="rec-name"
                type="text"
                required
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="Ex.: Receita Mestre Vela Lavanda 180g"
              />
            </div>
            <div>
              <label htmlFor="rec-yield">Rendimento Padrão *</label>
              <input
                id="rec-yield"
                type="number"
                step="0.001"
                min="0.001"
                required
                value={recipeYield}
                onChange={(e) => setRecipeYield(e.target.value)}
              />
            </div>
          </div>

          {/* Lista de Insumos da Receita */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0 }}>Insumos da Composição ({recipeItems.length})</label>
              <button
                type="button"
                onClick={handleAddRecipeItem}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                + Adicionar Insumo
              </button>
            </div>

            {recipeItems.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                Clique em "+ Adicionar Insumo" para compor a receita.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recipeItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr auto',
                      gap: '10px',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-sand-light)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <select
                      value={item.component_product_id}
                      onChange={(e) => {
                        const updated = [...recipeItems];
                        updated[idx].component_product_id = Number(e.target.value);
                        setRecipeItems(updated);
                      }}
                    >
                      {rawMaterials.map((rm) => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name} ({rm.unit?.code})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                      value={item.standard_quantity}
                      onChange={(e) => {
                        const updated = [...recipeItems];
                        updated[idx].standard_quantity = e.target.value;
                        setRecipeItems(updated);
                      }}
                      placeholder="Qtd."
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveRecipeItem(idx)}
                      style={{ color: 'var(--status-danger-text)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="rec-inst">Modo de Preparo / Instruções</label>
            <textarea
              id="rec-inst"
              rows={2}
              value={recipeInstructions}
              onChange={(e) => setRecipeInstructions(e.target.value)}
              placeholder="Ex.: Aquecer a cera a 70°C, misturar a essência suavemente..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsRecipeModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={submittingRecipe} className="btn-primary">
              {submittingRecipe ? 'Salvando...' : 'Salvar Ficha Técnica'}
            </button>
          </div>
        </form>
      </Modal>
      {/* Modal Rápido de Cadastro de Nova Cor */}
      <Modal
        isOpen={isQuickColorModalOpen}
        onClose={() => setIsQuickColorModalOpen(false)}
        title="Cadastrar Nova Cor"
        subtitle="Adicione uma nova tonalidade ao catálogo de cores do ateliê"
        maxWidth="440px"
      >
        <form onSubmit={handleSaveQuickColor}>
          {quickColorError && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--status-danger-bg)',
                color: 'var(--status-danger-text)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '0.85rem',
              }}
            >
              {quickColorError}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="quick-color-name">Nome da Cor *</label>
            <input
              id="quick-color-name"
              type="text"
              required
              placeholder="Ex.: Marmorizado Branco e Cinza, Bege, Lavanda..."
              value={quickColorName}
              onChange={(e) => setQuickColorName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="quick-color-hex">Cor Visual / Amostra Hex</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                id="quick-color-hex"
                type="color"
                value={quickColorHex}
                onChange={(e) => setQuickColorHex(e.target.value)}
                style={{ width: '48px', height: '38px', padding: '2px', cursor: 'pointer' }}
              />
              <input
                type="text"
                placeholder="#d1d5db"
                value={quickColorHex}
                onChange={(e) => setQuickColorHex(e.target.value)}
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsQuickColorModalOpen(false)}
              className="btn-secondary"
              disabled={savingQuickColor}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingQuickColor}>
              {savingQuickColor ? 'Salvando...' : 'Salvar e Selecionar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
