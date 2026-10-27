import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
  CreditCard,
  Calendar,
  Filter,
  Search,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { formatDateOnly } from '../utils/date';
import type { Sale, Customer, Product } from '../types';

type PeriodOption =
  | 'all'
  | 'today'
  | 'month'
  | 'year'
  | 'specific_day'
  | 'specific_month'
  | 'specific_year'
  | 'custom';

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatQuantity = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};

export const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros de Período, Status e Busca
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [specificDay, setSpecificDay] = useState<string>(formatLocalDate(new Date()));
  const [specificMonth, setSpecificMonth] = useState<string>(formatLocalDate(new Date()).slice(0, 7));
  const [specificYear, setSpecificYear] = useState<number>(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const isFirstRender = useRef(true);

  // Modal Nova Venda
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [customPaymentMethod, setCustomPaymentMethod] = useState<string>('');
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

  const loadSales = async (overrideParams?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }) => {
    setSalesLoading(true);
    try {
      const sStart = overrideParams && 'startDate' in overrideParams ? overrideParams.startDate : startDate;
      const sEnd = overrideParams && 'endDate' in overrideParams ? overrideParams.endDate : endDate;
      const sStatus = overrideParams && 'status' in overrideParams ? overrideParams.status : filterStatus;
      const sSearch = overrideParams && 'search' in overrideParams ? overrideParams.search : searchQuery;

      const sData = await api.listSales({
        start_date: sStart || undefined,
        end_date: sEnd || undefined,
        status: sStatus || undefined,
        search: sSearch ? sSearch.trim() : undefined,
      });
      setSales(sData);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar vendas.');
    } finally {
      setSalesLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sData, cData, pData] = await Promise.all([
        api.listSales({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          status: filterStatus || undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.listCustomers(),
        api.listProducts({ active_only: true }),
      ]);
      setSales(sData);
      setCustomers(cData);
      setProducts(pData);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados do ateliê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      loadSales();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePeriodChange = (option: PeriodOption) => {
    setPeriod(option);
    const now = new Date();
    let newStart = '';
    let newEnd = '';

    if (option === 'all') {
      newStart = '';
      newEnd = '';
    } else if (option === 'today') {
      const today = formatLocalDate(now);
      newStart = today;
      newEnd = today;
    } else if (option === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      newStart = formatLocalDate(start);
      newEnd = formatLocalDate(end);
    } else if (option === 'year') {
      newStart = `${now.getFullYear()}-01-01`;
      newEnd = `${now.getFullYear()}-12-31`;
    } else if (option === 'specific_day') {
      newStart = specificDay;
      newEnd = specificDay;
    } else if (option === 'specific_month') {
      if (specificMonth) {
        const [y, m] = specificMonth.split('-').map(Number);
        newStart = formatLocalDate(new Date(y, m - 1, 1));
        newEnd = formatLocalDate(new Date(y, m, 0));
      }
    } else if (option === 'specific_year') {
      newStart = `${specificYear}-01-01`;
      newEnd = `${specificYear}-12-31`;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
    loadSales({ startDate: newStart, endDate: newEnd });
  };

  const handleSpecificDayChange = (val: string) => {
    setSpecificDay(val);
    setPeriod('specific_day');
    setStartDate(val);
    setEndDate(val);
    loadSales({ startDate: val, endDate: val });
  };

  const handleSpecificMonthChange = (val: string) => {
    setSpecificMonth(val);
    setPeriod('specific_month');
    if (val) {
      const [y, m] = val.split('-').map(Number);
      const start = formatLocalDate(new Date(y, m - 1, 1));
      const end = formatLocalDate(new Date(y, m, 0));
      setStartDate(start);
      setEndDate(end);
      loadSales({ startDate: start, endDate: end });
    }
  };

  const handleSpecificYearChange = (year: number) => {
    setSpecificYear(year);
    setPeriod('specific_year');
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    setStartDate(start);
    setEndDate(end);
    loadSales({ startDate: start, endDate: end });
  };

  const handleCustomStartDateChange = (val: string) => {
    setStartDate(val);
    setPeriod('custom');
    loadSales({ startDate: val });
  };

  const handleCustomEndDateChange = (val: string) => {
    setEndDate(val);
    setPeriod('custom');
    loadSales({ endDate: val });
  };

  const handleStatusChange = (val: string) => {
    setFilterStatus(val);
    loadSales({ status: val });
  };

  const handleResetFilters = () => {
    setPeriod('all');
    setStartDate('');
    setEndDate('');
    setFilterStatus('');
    setSearchQuery('');
    loadSales({ startDate: '', endDate: '', status: '', search: '' });
  };

  const getActiveFilterLabel = () => {
    if (period === 'all') return 'Todas as Vendas';
    if (period === 'today') return `Hoje (${new Date().toLocaleDateString('pt-BR')})`;
    if (period === 'month') {
      const now = new Date();
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return `Mês Atual (${monthNames[now.getMonth()]}/${now.getFullYear()})`;
    }
    if (period === 'year') {
      return `Ano Atual (${new Date().getFullYear()})`;
    }
    if (period === 'specific_day') {
      if (!startDate) return 'Dia Específico';
      const [y, m, d] = startDate.split('-');
      return `Dia ${d}/${m}/${y}`;
    }
    if (period === 'specific_month') {
      if (!specificMonth) return 'Mês Específico';
      const [y, m] = specificMonth.split('-').map(Number);
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return `Mês de ${monthNames[m - 1]}/${y}`;
    }
    if (period === 'specific_year') {
      return `Ano de ${specificYear}`;
    }
    if (period === 'custom') {
      const s = startDate ? startDate.split('-').reverse().join('/') : '';
      const e = endDate ? endDate.split('-').reverse().join('/') : '';
      if (s && e) return `${s} até ${e}`;
      if (s) return `A partir de ${s}`;
      if (e) return `Até ${e}`;
      return 'Período Personalizado';
    }
    return 'Todas as Vendas';
  };

  // Produtos acabados destinados à venda (inclui variações se houver)
  const saleProducts = products.flatMap((p) => {
    if (p.item_type !== 'PRODUTO_ACABADO') return [];
    if (p.variations && p.variations.length > 0) {
      return p.variations.map((v) => ({
        ...p,
        id: v.id,
        sku: v.sku,
        name: `${p.name} - ${v.variation_name || v.color || 'Variação'}`,
        color: v.color || p.color,
        sale_price: v.sale_price !== null && v.sale_price !== undefined ? v.sale_price : p.sale_price,
        unit_cost: v.unit_cost !== null && v.unit_cost !== undefined ? v.unit_cost : p.unit_cost,
        current_stock: v.current_stock,
      }));
    }
    return [p];
  });

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
    setPaymentMethod('Pix');
    setCustomPaymentMethod('');
    setSaleNotes('');
    setSaleItems([
      {
        product_id: saleProducts[0].id,
        quantity: '1',
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
        quantity: '1',
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
      const finalPaymentMethod =
        paymentMethod === 'Outro' ? customPaymentMethod.trim() || 'Outro' : paymentMethod;

      await api.createDraftSale({
        customer_id: selectedCustomerId,
        payment_method: finalPaymentMethod,
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
            Vendas confirmadas ({getActiveFilterLabel()})
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
            {confirmedSales.length} confirmadas no período
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
            Pendentes de confirmação no período
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
            Total da base de clientes
          </span>
        </div>
      </div>

      {/* Barra de Filtros por Período, Status e Busca */}
      <div
        className="card"
        style={{
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Linha 1: Título e Botões Rápidos de Período */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-primary)', marginRight: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Filter size={15} color="var(--brand-accent)" />
              Período:
            </span>

            <button
              type="button"
              className={`btn-sm ${period === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange('all')}
            >
              Todas
            </button>
            <button
              type="button"
              className={`btn-sm ${period === 'today' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange('today')}
            >
              Hoje
            </button>
            <button
              type="button"
              className={`btn-sm ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange('month')}
            >
              Este Mês
            </button>
            <button
              type="button"
              className={`btn-sm ${period === 'year' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange('year')}
            >
              Ano Atual
            </button>

            <span style={{ color: 'var(--border-medium)', margin: '0 2px' }}>|</span>

            <button
              type="button"
              className={`btn-sm ${period === 'specific_day' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange('specific_day')}
            >
              📅 Por Dia
            </button>
            <button
              type="button"
              className={`btn-sm ${period === 'specific_month' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange('specific_month')}
            >
              📆 Por Mês
            </button>
            <button
              type="button"
              className={`btn-sm ${period === 'specific_year' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handlePeriodChange('specific_year')}
            >
              🗓️ Por Ano
            </button>
            <button
              type="button"
              className={`btn-sm ${period === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('custom')}
            >
              ↔️ Personalizado
            </button>
          </div>

          {/* Badge Informativo do Período Ativo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 600,
                backgroundColor: 'var(--bg-sand-light)',
                color: 'var(--brand-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Calendar size={13} color="var(--brand-accent)" />
              {getActiveFilterLabel()} • {sales.length} {sales.length === 1 ? 'venda' : 'vendas'}
            </span>

            <button
              type="button"
              onClick={() => loadSales()}
              className="btn-icon"
              title="Atualizar lista de vendas"
              style={{ width: '32px', height: '32px' }}
              disabled={salesLoading}
            >
              <RefreshCw size={14} className={salesLoading ? 'spinner' : ''} />
            </button>
          </div>
        </div>

        {/* Linha 2: Controles Específicos de Data, Status e Pesquisa */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Seletor do Modo Dia */}
          {period === 'specific_day' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Data:
              </span>
              <input
                type="date"
                style={{ width: '150px', padding: '6px 10px', fontSize: '0.84rem' }}
                value={specificDay}
                onChange={(e) => handleSpecificDayChange(e.target.value)}
              />
            </div>
          )}

          {/* Seletor do Modo Mês */}
          {period === 'specific_month' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Mês:
              </span>
              <input
                type="month"
                style={{ width: '160px', padding: '6px 10px', fontSize: '0.84rem' }}
                value={specificMonth}
                onChange={(e) => handleSpecificMonthChange(e.target.value)}
              />
            </div>
          )}

          {/* Seletor do Modo Ano */}
          {period === 'specific_year' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Ano:
              </span>
              <select
                style={{ width: '120px', padding: '6px 10px', fontSize: '0.84rem' }}
                value={specificYear}
                onChange={(e) => handleSpecificYearChange(Number(e.target.value))}
              >
                {[2023, 2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor Personalizado (De / Até) */}
          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                De:
              </span>
              <input
                type="date"
                style={{ width: '140px', padding: '6px 10px', fontSize: '0.84rem' }}
                value={startDate}
                onChange={(e) => handleCustomStartDateChange(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>até</span>
              <input
                type="date"
                style={{ width: '140px', padding: '6px 10px', fontSize: '0.84rem' }}
                value={endDate}
                onChange={(e) => handleCustomEndDateChange(e.target.value)}
              />
            </div>
          )}

          {/* Filtro de Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              style={{ width: '170px', padding: '6px 10px', fontSize: '0.84rem' }}
              value={filterStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="">Status: Todos</option>
              <option value="CONFIRMADA">Apenas Confirmadas</option>
              <option value="RASCUNHO">Apenas Rascunhos</option>
              <option value="CANCELADA">Apenas Canceladas</option>
            </select>
          </div>

          {/* Barra de Pesquisa */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px' }}>
            <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: '10px' }} />
            <input
              type="text"
              style={{ padding: '6px 10px 6px 30px', fontSize: '0.84rem' }}
              placeholder="Buscar por cliente, pedido, notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Botão Limpar Filtros */}
          {(period !== 'all' || filterStatus !== '' || searchQuery.trim() !== '') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Redefinir filtros para exibir todas as vendas"
            >
              <RotateCcw size={13} />
              Limpar Filtros
            </button>
          )}
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
          {period !== 'all' || filterStatus !== '' || searchQuery.trim() !== '' ? (
            <>
              <Calendar size={42} color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.3rem', color: 'var(--brand-primary)', marginBottom: '4px' }}>
                Nenhuma venda encontrada para o período selecionado
              </h3>
              <p style={{ fontSize: '0.9rem', marginBottom: '18px' }}>
                Não foram encontrados registros para <strong>{getActiveFilterLabel()}</strong>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button onClick={handleResetFilters} className="btn-secondary">
                  <RotateCcw size={16} />
                  <span>Ver Todas as Vendas</span>
                </button>
                <button onClick={handleOpenSaleModal} className="btn-primary">
                  <Plus size={16} />
                  <span>Registrar Nova Venda</span>
                </button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', opacity: salesLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>NÚMERO</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CLIENTE</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>VALOR TOTAL</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PAGAMENTO</th>
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
                    <td style={{ padding: '14px 20px', fontSize: '0.88rem' }}>
                      {s.payment_method ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: 'var(--bg-sand-light)',
                            color: 'var(--brand-primary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          💳 {s.payment_method}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '0.8rem' }}>—</span>
                      )}
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
                      {formatDateOnly(s.created_at)}
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

          {/* Combobox de Forma de Pagamento */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="sale-payment-method" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <CreditCard size={15} color="var(--brand-accent)" />
              <span>Forma de Pagamento</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: paymentMethod === 'Outro' ? '1fr 1fr' : '1fr', gap: '10px' }}>
              <select
                id="sale-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Pix">📱 Pix (Chave / QR Code)</option>
                <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                <option value="Cartão de Débito">💳 Cartão de Débito</option>
                <option value="Dinheiro">💵 Dinheiro (Espécie)</option>
                <option value="Shopee">🛍️ Shopee (Marketplace)</option>
                <option value="Mercado Livre">📦 Mercado Livre</option>
                <option value="Transferência Bancária">🏦 Transferência Bancária (TED/DOC)</option>
                <option value="Boleto Bancário">📄 Boleto Bancário</option>
                <option value="Outro">✏️ Outro (Digitar personalizado)</option>
              </select>

              {paymentMethod === 'Outro' && (
                <input
                  type="text"
                  placeholder="Especifique a forma (ex.: Permuta, Vale, Link...)"
                  value={customPaymentMethod}
                  onChange={(e) => setCustomPaymentMethod(e.target.value)}
                  autoFocus
                />
              )}
            </div>
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
          {selectedSale.payment_method && (
            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Forma de Pagamento:</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-sand-light)',
                  color: 'var(--brand-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                💳 {selectedSale.payment_method}
              </span>
            </div>
          )}

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
                      <td style={{ padding: '8px 12px' }}>{formatQuantity(it.quantity)}</td>
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
