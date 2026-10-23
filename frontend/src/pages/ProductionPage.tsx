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
} from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import type { ProductionOrder, Recipe, Product } from '../types';

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
  const [orderPlannedQty, setOrderPlannedQty] = useState<string>('1.000');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Modal Nova Receita
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeProductId, setRecipeProductId] = useState<number>(0);
  const [recipeName, setRecipeName] = useState<string>('');
  const [recipeYield, setRecipeYield] = useState<string>('1.000');
  const [recipeInstructions, setRecipeInstructions] = useState<string>('');
  const [recipeItems, setRecipeItems] = useState<{ component_product_id: number; standard_quantity: string }[]>([]);
  const [submittingRecipe, setSubmittingRecipe] = useState(false);

  // Modal Detalhes da Ordem
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [oData, rData, pData] = await Promise.all([
        api.listProductionOrders(),
        api.listRecipes(),
        api.listProducts({ active_only: true }),
      ]);
      setOrders(oData);
      setRecipes(rData);
      setProducts(pData);

      const finishedProds = pData.filter((p) => p.item_type === 'PRODUTO_ACABADO');
      if (finishedProds.length > 0 && !orderProductId) {
        setOrderProductId(finishedProds[0].id);
        setRecipeProductId(finishedProds[0].id);
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

  const finishedProducts = products.filter((p) => p.item_type === 'PRODUTO_ACABADO');
  const rawMaterials = products.filter((p) => p.item_type !== 'PRODUTO_ACABADO');

  // Ao selecionar o produto na nova ordem, tenta auto-selecionar a receita vinculada
  const handleProductChangeInOrder = (prodId: number) => {
    setOrderProductId(prodId);
    const foundRecipe = recipes.find((r) => r.product_id === prodId);
    setOrderRecipeId(foundRecipe ? foundRecipe.id : null);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOrder(true);
    try {
      await api.createDraftOrder({
        product_id: orderProductId,
        recipe_id: orderRecipeId,
        planned_quantity: orderPlannedQty,
        notes: orderNotes,
      });
      setIsOrderModalOpen(false);
      setOrderNotes('');
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
                        {o.product_name}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '0.9rem' }}>
                        {Number(o.planned_quantity).toFixed(3)}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '0.9rem', fontWeight: 600 }}>
                        {o.produced_quantity ? Number(o.produced_quantity).toFixed(3) : '—'}
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
                        {new Date(o.created_at).toLocaleDateString('pt-BR')}
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
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-accent)' }}>
                    Rende: {Number(r.yield_quantity).toFixed(0)} un
                  </span>
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
                        <span style={{ fontWeight: 600 }}>{Number(it.standard_quantity).toFixed(3)} {it.component_unit}</span>
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
                      <td style={{ padding: '8px 12px' }}>{Number(it.planned_quantity).toFixed(3)} {it.component_unit}</td>
                      <td style={{ padding: '8px 12px' }}>{Number(it.actual_quantity || it.planned_quantity).toFixed(3)} {it.component_unit}</td>
                      <td style={{ padding: '8px 12px' }}>{Number(it.loss_quantity).toFixed(3)} {it.component_unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
    </div>
  );
};
