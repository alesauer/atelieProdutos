import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

import { api } from '../api/client';
import { Modal } from '../components/Modal';
import type { Sale, Customer, Product } from '../types';

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Nova Venda
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [saleItems, setSaleItems] = useState<{ product_id: number; quantity: string; unit_price: string }[]>([]);
  const [submittingSale, setSubmittingSale] = useState(false);

  // Modal Novo Cliente
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Modal Detalhes
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sData, cData, pData] = await Promise.all([
        api.listSales(),
        api.listCustomers(),
        api.listProducts({ active_only: true }),
      ]);
      setSales(sData);
      setCustomers(cData);
      setProducts(pData);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar vendas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Produtos acabados destinados à venda
  const saleProducts = products.filter((p) => p.item_type === 'PRODUTO_ACABADO');

  // Cálculo de faturamento total confirmado
  const confirmedSales = sales.filter((s) => s.status === 'CONFIRMADA');
  const totalRevenue = confirmedSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

  // Abertura do modal de venda
  const handleOpenSaleModal = () => {
    if (saleProducts.length === 0) {
      alert('Nenhum produto acabado cadastrado para venda.');
      return;
    }
    setSelectedCustomerId(null);
    setSaleNotes('');
    setSaleItems([
      {
        product_id: saleProducts[0].id,
        quantity: '1.000',
        unit_price: String(saleProducts[0].sale_price || '0.00'),
      },
    ]);
    setIsSaleModalOpen(true);
  };

  const handleAddSaleItem = () => {
    if (saleProducts.length === 0) return;
    setSaleItems([
      ...saleItems,
      {
        product_id: saleProducts[0].id,
        quantity: '1.000',
        unit_price: String(saleProducts[0].sale_price || '0.00'),
      },
    ]);
  };

  const handleRemoveSaleItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const handleProductChangeInItem = (index: number, productId: number) => {
    const targetProd = saleProducts.find((p) => p.id === productId);
    const updated = [...saleItems];
    updated[index].product_id = productId;
    if (targetProd && targetProd.sale_price) {
      updated[index].unit_price = String(targetProd.sale_price);
    }
    setSaleItems(updated);
  };

  const calculateSaleTotal = () => {
    return saleItems.reduce((acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleItems.length === 0) {
      alert('Adicione pelo menos um item à venda.');
      return;
    }
    setSubmittingSale(true);
    try {
      await api.createDraftSale({
        customer_id: selectedCustomerId,
        notes: saleNotes,
        items: saleItems,
      });
      setIsSaleModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar venda.');
    } finally {
      setSubmittingSale(false);
    }
  };

  const handleConfirmSale = async (saleId: number) => {
    if (!confirm('Confirmar venda agora? O estoque será debitado em transação atômica única.')) {
      return;
    }
    try {
      await api.confirmSale(saleId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar venda.');
    }
  };

  const handleCancelSale = async (saleId: number) => {
    if (
      !confirm(
        'Deseja cancelar esta venda? Se já havia sido confirmada, os itens serão estornados automaticamente de volta ao estoque.'
      )
    ) {
      return;
    }
    try {
      await api.cancelSale(saleId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar venda.');
    }
  };

  const handleDeleteSale = async (saleId: number, saleNumber: string) => {
    if (!confirm(`Deseja realmente excluir permanentemente a venda "${saleNumber}"?`)) return;
    try {
      await api.deleteSale(saleId);
      if (selectedSale?.id === saleId) {
        setSelectedSale(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir venda.');
    }
  };

  const handleDeleteCustomer = async (customerId: number, customerName: string) => {
    if (!confirm(`Deseja realmente excluir o cliente "${customerName}"?`)) return;
    try {
      await api.deleteCustomer(customerId);
      if (selectedCustomerId === customerId) {
        setSelectedCustomerId(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cliente.');
    }
  };

  const handleCreateQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createCustomer({
        name: newCustName,
        email: newCustEmail ? newCustEmail : undefined,
        phone: newCustPhone ? newCustPhone : undefined,
      });
      setCustomers([...customers, created]);
      setSelectedCustomerId(created.id);
      setIsCustomerModalOpen(false);
      setNewCustName('');
      setNewCustEmail('');
      setNewCustPhone('');
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar cliente.');
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Cards de Métricas de Vendas */}
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
            FATURAMENTO CONFIRMADO
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--brand-accent)' }}>
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Vendas confirmadas com baixa efetiva
          </span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            TOTAL DE VENDAS
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
            {sales.length}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            {confirmedSales.length} confirmadas
          </span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            EM RASCUNHO (PENDENTES)
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--status-warning-text)' }}>
            {sales.filter((s) => s.status === 'RASCUNHO').length}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Não alteram estoque físico até a confirmação
          </span>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            CLIENTES CADASTRADOS
          </span>
          <h3 style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--brand-primary)' }}>
            {customers.length}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            Compradores com histórico associado
          </span>
        </div>
      </div>

      {/* Barra de Ações */}
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
          <ShoppingBag size={20} color="var(--brand-accent)" />
          <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
            Registro e Controle de Vendas do Ateliê
          </span>
        </div>

        <button onClick={handleOpenSaleModal} className="btn-primary">
          <Plus size={16} />
          <span>Registrar Nova Venda</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={32} className="spin-animation" color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Carregando vendas...</p>
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
      ) : sales.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <ShoppingBag size={42} color="var(--text-tertiary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.3rem', color: 'var(--brand-primary)', marginBottom: '4px' }}>
            Nenhuma venda registrada ainda
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '18px' }}>
            Inicie uma venda em rascunho com cliente opcional e dê baixa automática no estoque ao confirmar.
          </p>
          <button onClick={handleOpenSaleModal} className="btn-secondary">
            <Plus size={16} />
            <span>Registrar Primeira Venda</span>
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>NÚMERO</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CLIENTE</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>VALOR TOTAL</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ITENS</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>STATUS</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DATA</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-primary)' }}>
                      {s.sale_number}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {s.customer_name || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Consumidor Final</span>}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--brand-accent)', fontSize: '0.98rem' }}>
                      R$ {Number(s.total_amount).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {s.items.length} {s.items.length === 1 ? 'item' : 'itens'}
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
                            s.status === 'CONFIRMADA'
                              ? 'var(--status-active-bg)'
                              : s.status === 'RASCUNHO'
                              ? 'var(--status-warning-bg)'
                              : 'var(--status-danger-bg)',
                          color:
                            s.status === 'CONFIRMADA'
                              ? 'var(--status-active-text)'
                              : s.status === 'RASCUNHO'
                              ? 'var(--status-warning-text)'
                              : 'var(--status-danger-text)',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(s.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedSale(s)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        >
                          <FileText size={14} /> Detalhes
                        </button>
                        {s.status === 'RASCUNHO' && (
                          <button
                            onClick={() => handleConfirmSale(s.id)}
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          >
                            <CheckCircle2 size={14} /> Confirmar
                          </button>
                        )}
                        {s.status !== 'CANCELADA' && (
                          <button
                            onClick={() => handleCancelSale(s.id)}
                            className="btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--status-danger-text)' }}
                            title="Cancelar e estornar estoque"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSale(s.id, s.sale_number)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--status-danger-text)' }}
                          title="Excluir venda permanentemente"
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
      )}

      {/* Modal Nova Venda */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        title="Registrar Nova Venda"
        subtitle="Vendas em rascunho não baixam o estoque até serem confirmadas"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateSale}>
          {/* Seleção de Cliente */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Cliente (Opcional)</label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                style={{ fontSize: '0.78rem', color: 'var(--brand-accent)', fontWeight: 600 }}
              >
                + Cadastrar Novo Cliente
              </button>
            </div>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Consumidor Final (Sem cadastro)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Linhas de Produtos da Venda */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0 }}>Produtos da Venda ({saleItems.length})</label>
              <button
                type="button"
                onClick={handleAddSaleItem}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                + Adicionar Item
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {saleItems.map((item, idx) => {
                const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                      gap: '8px',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-sand-light)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <select
                      value={item.product_id}
                      onChange={(e) => handleProductChangeInItem(idx, Number(e.target.value))}
                    >
                      {saleProducts.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      required
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...saleItems];
                        updated[idx].quantity = e.target.value;
                        setSaleItems(updated);
                      }}
                      placeholder="Qtd."
                    />

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unit_price}
                      onChange={(e) => {
                        const updated = [...saleItems];
                        updated[idx].unit_price = e.target.value;
                        setSaleItems(updated);
                      }}
                      placeholder="Preço R$"
                    />

                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--brand-primary)', textAlign: 'right' }}>
                      R$ {lineTotal.toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSaleItem(idx)}
                      style={{ color: 'var(--status-danger-text)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-sand)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Total Geral da Venda:</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--brand-accent)' }}>
              R$ {calculateSaleTotal().toFixed(2)}
            </span>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="sale-notes">Observações / Canal da Venda</label>
            <textarea
              id="sale-notes"
              rows={2}
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
              placeholder="Ex.: Feira artesanal presencial / WhatsApp / Retirada no ateliê..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsSaleModalOpen(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={submittingSale} className="btn-primary">
              {submittingSale ? 'Gravando...' : 'Salvar Venda em Rascunho'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Rápido de Novo Cliente */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Cadastrar Cliente Rápido"
        subtitle="Dados básicos para associação da venda"
        maxWidth="440px"
      >
        <form onSubmit={handleCreateQuickCustomer}>
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="cust-name">Nome Completo *</label>
            <input
              id="cust-name"
              type="text"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="Ex.: Maria Fernandes"
            />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="cust-phone">WhatsApp / Telefone</label>
            <input
              id="cust-phone"
              type="text"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="cust-email">E-mail</label>
            <input
              id="cust-email"
              type="email"
              value={newCustEmail}
              onChange={(e) => setNewCustEmail(e.target.value)}
              placeholder="maria@exemplo.com"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="btn-secondary">
              Voltar
            </button>
            <button type="submit" className="btn-primary">
              Salvar Cliente
            </button>
          </div>
        </form>

        {/* Lista de Clientes com Opção de Exclusão */}
        {customers.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Clientes Cadastrados ({customers.length})
            </h5>
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {customers.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-sand-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{c.name}</span>
                    {c.phone && <span style={{ color: 'var(--text-tertiary)', marginLeft: '6px', fontSize: '0.75rem' }}>({c.phone})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(c.id, c.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--status-danger-text)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                    title="Excluir este cliente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Detalhes da Venda */}
      {selectedSale && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSale(null)}
          title={`Venda ${selectedSale.sale_number}`}
          subtitle={`Cliente: ${selectedSale.customer_name || 'Consumidor Final'} | Total: R$ ${Number(selectedSale.total_amount).toFixed(2)}`}
          maxWidth="600px"
        >
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '8px' }}>
              Produtos Vendidos:
            </h4>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-sand-light)' }}>
                    <th style={{ padding: '8px 12px' }}>Produto</th>
                    <th style={{ padding: '8px 12px' }}>Qtd.</th>
                    <th style={{ padding: '8px 12px' }}>Preço Unit.</th>
                    <th style={{ padding: '8px 12px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{it.product_name}</td>
                      <td style={{ padding: '8px 12px' }}>{Number(it.quantity).toFixed(0)}</td>
                      <td style={{ padding: '8px 12px' }}>R$ {Number(it.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>R$ {Number(it.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedSale.notes && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              <strong>Notas:</strong> {selectedSale.notes}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => handleDeleteSale(selectedSale.id, selectedSale.sale_number)}
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
              <Trash2 size={15} /> Excluir Venda
            </button>
            <button onClick={() => setSelectedSale(null)} className="btn-secondary">
              Fechar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
