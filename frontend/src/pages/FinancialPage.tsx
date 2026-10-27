import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Tag,
  Trash2,
  Edit2,
  ArrowUpRight,
  PieChart,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { api } from '../api/client';
import type {
  FinancialCategory,
  FinancialTransaction,
  FinancialSummary,
  FinancialType,
  FinancialStatus,
} from '../types';
import { Modal } from '../components/Modal';

type PeriodOption = 'today' | '7days' | 'month' | 'last_month' | 'year' | 'custom';

export const FinancialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'cashflow' | 'categories'>('overview');
  const [period, setPeriod] = useState<PeriodOption>('month');

  // Datas de Início e Fim
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Estados de dados
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros da aba de Despesas
  const [filterType, setFilterType] = useState<string>('DESPESA');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal de Transação (Nova / Edição)
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [transType, setTransType] = useState<FinancialType>('DESPESA');
  const [transDescription, setTransDescription] = useState('');
  const [transAmountRaw, setTransAmountRaw] = useState('0'); // em centavos
  const [transCategoryId, setTransCategoryId] = useState<number | ''>('');
  const [transDueDate, setTransDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [transPaymentDate, setTransPaymentDate] = useState<string>('');
  const [transStatus, setTransStatus] = useState<FinancialStatus>('PENDENTE');
  const [transPaymentMethod, setTransPaymentMethod] = useState<string>('Pix');
  const [transNotes, setTransNotes] = useState('');
  const [savingTrans, setSavingTrans] = useState(false);

  // Modal de Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<FinancialType>('DESPESA');
  const [catColor, setCatColor] = useState('#8d5b4c');
  const [savingCategory, setSavingCategory] = useState(false);

  // Paleta de cores para categorias
  const colorPalette = ['#8d5b4c', '#c97a63', '#ee4d2d', '#4a7c59', '#3b82f6', '#8b5cf6', '#eab308', '#0d9488', '#6b7280'];

  // Atualiza datas com base no seletor de período
  const handlePeriodChange = (option: PeriodOption) => {
    setPeriod(option);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (option === 'today') {
      start = now;
      end = now;
    } else if (option === '7days') {
      start.setDate(now.getDate() - 7);
      end = now;
    } else if (option === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (option === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (option === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }

    if (option !== 'custom') {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // Carrega resumo e dados
  const loadFinancialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, catData, transData] = await Promise.all([
        api.getFinancialSummary({ start_date: startDate, end_date: endDate }),
        api.getFinancialCategories(),
        api.getFinancialTransactions({ start_date: startDate, end_date: endDate }),
      ]);
      setSummary(sumData);
      setCategories(catData);
      setTransactions(transData);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [startDate, endDate]);

  // Formatação de Moeda
  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Formatação de Data DD/MM/AAAA
  const formatDateBR = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Máscara monetária RTL (centavos)
  const formatCentsToCurrency = (digits: string) => {
    const cleanDigits = digits.replace(/\D/g, '');
    const num = (parseInt(cleanDigits, 10) || 0) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '');
    setTransAmountRaw(clean || '0');
  };

  // Abre Modal de Nova Transação
  const handleOpenNewTransaction = (type: FinancialType = 'DESPESA') => {
    setEditingTransaction(null);
    setTransType(type);
    setTransDescription('');
    setTransAmountRaw('0');
    setTransDueDate(new Date().toISOString().split('T')[0]);
    setTransPaymentDate('');
    setTransStatus('PENDENTE');
    setTransPaymentMethod('Pix');
    setTransNotes('');
    const firstCat = categories.find((c) => c.type === type);
    setTransCategoryId(firstCat ? firstCat.id : '');
    setIsTransModalOpen(true);
  };

  // Abre Modal de Edição
  const handleOpenEditTransaction = (t: FinancialTransaction) => {
    setEditingTransaction(t);
    setTransType(t.type);
    setTransDescription(t.description);
    const cents = Math.round(Number(t.amount || 0) * 100).toString();
    setTransAmountRaw(cents);
    setTransDueDate(t.due_date);
    setTransPaymentDate(t.payment_date || '');
    setTransStatus(t.status);
    setTransPaymentMethod(t.payment_method || 'Pix');
    setTransCategoryId(t.category_id || '');
    setTransNotes(t.notes || '');
    setIsTransModalOpen(true);
  };

  // Salva Transação
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transDescription.trim()) {
      alert('Informe a descrição do lançamento.');
      return;
    }
    const amountVal = (parseInt(transAmountRaw, 10) || 0) / 100;
    if (amountVal <= 0) {
      alert('Informe um valor maior que zero.');
      return;
    }

    setSavingTrans(true);
    try {
      const payload: Partial<FinancialTransaction> = {
        description: transDescription.trim(),
        type: transType,
        amount: amountVal,
        due_date: transDueDate,
        payment_date: transStatus === 'PAGO' ? (transPaymentDate || transDueDate) : null,
        status: transStatus,
        payment_method: transPaymentMethod,
        category_id: transCategoryId ? Number(transCategoryId) : null,
        notes: transNotes.trim() || null,
      };

      if (editingTransaction) {
        await api.updateFinancialTransaction(editingTransaction.id, payload);
      } else {
        await api.createFinancialTransaction(payload);
      }
      setIsTransModalOpen(false);
      await loadFinancialData();
    } catch (err: any) {
      alert(err?.message || 'Falha ao salvar lançamento.');
    } finally {
      setSavingTrans(false);
    }
  };

  // Alterna status (Pago <-> Pendente)
  const handleToggleStatus = async (t: FinancialTransaction) => {
    const target: FinancialStatus = t.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
    try {
      await api.toggleFinancialTransactionStatus(t.id, target);
      await loadFinancialData();
    } catch (err: any) {
      alert(err?.message || 'Falha ao atualizar status.');
    }
  };

  // Excluir lançamento
  const handleDeleteTransaction = async (t: FinancialTransaction) => {
    if (!window.confirm(`Tem certeza que deseja excluir o lançamento "${t.description}"?`)) {
      return;
    }
    try {
      await api.deleteFinancialTransaction(t.id);
      await loadFinancialData();
    } catch (err: any) {
      alert(err?.message || 'Falha ao excluir lançamento.');
    }
  };

  // Salvar nova categoria
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert('Informe o nome da categoria.');
      return;
    }
    setSavingCategory(true);
    try {
      await api.createFinancialCategory({
        name: catName.trim(),
        type: catType,
        color: catColor,
      });
      setIsCategoryModalOpen(false);
      setCatName('');
      const updatedCats = await api.getFinancialCategories();
      setCategories(updatedCats);
    } catch (err: any) {
      alert(err?.message || 'Falha ao criar categoria.');
    } finally {
      setSavingCategory(false);
    }
  };

  // Filtragem local das transações
  const filteredTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions.filter((t) => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (filterCategory !== 'ALL' && String(t.category_id) !== filterCategory) return false;
      if (filterStatus === 'PENDENTE' && t.status !== 'PENDENTE') return false;
      if (filterStatus === 'PAGO' && t.status !== 'PAGO') return false;
      if (filterStatus === 'OVERDUE') {
        if (t.status !== 'PENDENTE' || t.due_date >= today) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesCat = t.category_name?.toLowerCase().includes(q);
        const matchesPm = t.payment_method?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat && !matchesPm) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterStatus, filterCategory, searchTerm]);

  // Contas vencidas
  const overdueTransactions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions.filter((t) => t.type === 'DESPESA' && t.status === 'PENDENTE' && t.due_date < today);
  }, [transactions]);

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto' }}>
      {error && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger-text)',
            border: '1px solid var(--status-danger-border)',
            marginBottom: '16px',
            fontSize: '0.88rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Top Header com Título e Ações Rápidas */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--brand-primary)', margin: 0, fontFamily: 'var(--font-serif)' }}>
            Controle Financeiro & DRE
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Acompanhe o faturamento, custos de produção, despesas e o lucro líquido real do ateliê
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleOpenNewTransaction('RECEITA')}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowUpRight size={16} color="#15803d" /> + Receita Avulsa
          </button>
          <button
            onClick={() => handleOpenNewTransaction('DESPESA')}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> + Nova Despesa
          </button>
        </div>
      </div>

      {/* Barra de Filtro de Período Rápido */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '6px' }}>
            Período:
          </span>
          <button
            type="button"
            className={`btn-sm ${period === 'today' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handlePeriodChange('today')}
          >
            Hoje
          </button>
          <button
            type="button"
            className={`btn-sm ${period === '7days' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handlePeriodChange('7days')}
          >
            Últimos 7 dias
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
            className={`btn-sm ${period === 'last_month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handlePeriodChange('last_month')}
          >
            Mês Passado
          </button>
          <button
            type="button"
            className={`btn-sm ${period === 'year' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handlePeriodChange('year')}
          >
            Ano Atual
          </button>
        </div>

        {/* Inputs de Data Personalizada */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="var(--text-tertiary)" />
            <input
              type="date"
              className="input"
              style={{ padding: '4px 10px', fontSize: '0.84rem', width: '135px' }}
              value={startDate}
              onChange={(e) => {
                setPeriod('custom');
                setStartDate(e.target.value);
              }}
            />
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>até</span>
            <input
              type="date"
              className="input"
              style={{ padding: '4px 10px', fontSize: '0.84rem', width: '135px' }}
              value={endDate}
              onChange={(e) => {
                setPeriod('custom');
                setEndDate(e.target.value);
              }}
            />
          </div>
          <button
            onClick={loadFinancialData}
            className="btn-icon"
            title="Atualizar dados"
            style={{ padding: '6px' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '3px solid var(--brand-accent)' : '3px solid transparent',
            color: activeTab === 'overview' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <PieChart size={16} /> Visão Geral & DRE
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'expenses' ? '3px solid var(--brand-accent)' : '3px solid transparent',
            color: activeTab === 'expenses' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Wallet size={16} /> Contas a Pagar / Despesas
          {overdueTransactions.length > 0 && (
            <span
              style={{
                backgroundColor: 'var(--status-danger-bg)',
                color: 'var(--status-danger-text)',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
                border: '1px solid var(--status-danger-border)',
              }}
            >
              {overdueTransactions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('cashflow')}
          style={{
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'cashflow' ? '3px solid var(--brand-accent)' : '3px solid transparent',
            color: activeTab === 'cashflow' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={16} /> Fluxo de Caixa Diário
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'categories' ? '3px solid var(--brand-accent)' : '3px solid transparent',
            color: activeTab === 'categories' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Tag size={16} /> Categorias
        </button>
      </div>

      {/* --- ABA 1: VISÃO GERAL & DRE --- */}
      {activeTab === 'overview' && summary && (
        <div>
          {/* Grid de KPIs Superiores */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {/* Faturamento Total */}
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #15803d' }}>
              <span style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                Faturamento Total
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--brand-primary)', margin: '4px 0' }}>
                {formatCurrency(summary.total_revenue)}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {summary.sales_count} {summary.sales_count === 1 ? 'venda confirmada' : 'vendas confirmadas'}
              </span>
            </div>

            {/* CPV - Custo dos Insumos */}
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #c97a63' }}>
              <span style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                Custo de Produção (CPV)
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#c97a63', margin: '4px 0' }}>
                {formatCurrency(summary.total_cpv)}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Matérias-primas e embalagens
              </span>
            </div>

            {/* Lucro Bruto */}
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #0d9488' }}>
              <span style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                Lucro Bruto (Margem)
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0d9488', margin: '4px 0' }}>
                {formatCurrency(summary.gross_profit)}
              </div>
              <span style={{ fontSize: '0.78rem', color: '#0d9488', fontWeight: 600 }}>
                Margem: {summary.gross_margin_pct.toFixed(2)}%
              </span>
            </div>

            {/* Despesas Pagas */}
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #ee4d2d' }}>
              <span style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                Despesas Pagas
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ee4d2d', margin: '4px 0' }}>
                {formatCurrency(summary.paid_expenses)}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {summary.expenses_count} despesas registradas
              </span>
            </div>

            {/* Lucro Líquido Real */}
            <div
              className="card"
              style={{
                padding: '16px 20px',
                borderLeft: Number(summary.net_profit) >= 0 ? '4px solid #15803d' : '4px solid #b91c1c',
                backgroundColor: Number(summary.net_profit) >= 0 ? '#f0fdf4' : '#fef2f2',
              }}
            >
              <span
                style={{
                  fontSize: '0.76rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: Number(summary.net_profit) >= 0 ? '#15803d' : '#b91c1c',
                }}
              >
                Lucro Líquido Real
              </span>
              <div
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: Number(summary.net_profit) >= 0 ? '#15803d' : '#b91c1c',
                  margin: '4px 0',
                }}
              >
                {formatCurrency(summary.net_profit)}
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: Number(summary.net_profit) >= 0 ? '#15803d' : '#b91c1c',
                }}
              >
                Margem Líquida: {summary.net_margin_pct.toFixed(2)}%
              </span>
            </div>

            {/* Contas Pendentes */}
            <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #eab308' }}>
              <span style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                Contas a Pagar Pendentes
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
                {formatCurrency(summary.pending_expenses)}
              </div>
              <span style={{ fontSize: '0.78rem', color: Number(summary.overdue_expenses) > 0 ? '#b91c1c' : 'var(--text-secondary)', fontWeight: Number(summary.overdue_expenses) > 0 ? 700 : 400 }}>
                {Number(summary.overdue_expenses) > 0
                  ? `⚠️ ${formatCurrency(summary.overdue_expenses)} em atraso!`
                  : 'Nenhuma conta em atraso'}
              </span>
            </div>
          </div>

          {/* DRE e Estatísticas em Duas Colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', alignItems: 'start' }}>
            {/* Coluna Esquerda: DRE Gerencial */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-serif)' }}>
                    Demonstrativo de Resultado (DRE Gerencial)
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Período: {formatDateBR(summary.start_date)} até {formatDateBR(summary.end_date)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.dre_items.map((item, idx) => {
                  const isTotal = item.is_total;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: isTotal ? '10px 14px' : '8px 12px',
                        backgroundColor: isTotal ? 'var(--bg-sand-light)' : 'transparent',
                        borderRadius: 'var(--radius-xs)',
                        borderTop: isTotal ? '1px solid var(--border-medium)' : 'none',
                        fontWeight: isTotal ? 700 : 500,
                        fontSize: isTotal ? '0.92rem' : '0.86rem',
                        color: isTotal ? 'var(--brand-primary)' : 'var(--text-primary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                          {item.code}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span
                          style={{
                            fontWeight: isTotal ? 800 : 600,
                            color: item.is_negative ? '#b91c1c' : (isTotal && Number(item.amount) >= 0 ? '#15803d' : 'inherit'),
                          }}
                        >
                          {item.is_negative && '- '}
                          {formatCurrency(item.amount)}
                        </span>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-tertiary)',
                            minWidth: '48px',
                            textAlign: 'right',
                          }}
                        >
                          {item.percentage.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna Direita: Distribuição por Forma de Pagamento e Despesas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Formas de Pagamento */}
              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                  Receitas por Forma de Pagamento
                </h4>
                {summary.by_payment_method.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', margin: 0 }}>Nenhuma venda com forma de pagamento registrada no período.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {summary.by_payment_method.map((pm, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{pm.method} ({pm.count})</span>
                          <span><strong>{formatCurrency(pm.amount)}</strong> ({pm.percentage.toFixed(2)}%)</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--border-subtle)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, Math.max(0, pm.percentage))}%`,
                              backgroundColor: 'var(--brand-accent)',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Categorias de Despesas */}
              <div className="card" style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--brand-primary)', fontWeight: 700 }}>
                  Despesas por Categoria
                </h4>
                {summary.top_expense_categories.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', margin: 0 }}>Nenhuma despesa cadastrada no período.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {summary.top_expense_categories.map((cat, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color || '#8d5b4c' }} />
                            {cat.category_name}
                          </span>
                          <span><strong>{formatCurrency(cat.amount)}</strong> ({cat.percentage.toFixed(2)}%)</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--border-subtle)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, Math.max(0, cat.percentage))}%`,
                              backgroundColor: cat.color || '#8d5b4c',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA 2: CONTAS A PAGAR / DESPESAS --- */}
      {activeTab === 'expenses' && (
        <div>
          {/* Alerta de Contas em Atraso */}
          {overdueTransactions.length > 0 && (
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger-border)',
                color: 'var(--status-danger-text)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertTriangle size={18} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                Atenção: Existem <strong>{overdueTransactions.length} contas em atraso</strong> aguardando pagamento.
              </span>
            </div>
          )}

          {/* Filtros da Tabela de Despesas */}
          <div
            className="card"
            style={{
              padding: '14px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
              {/* Tipo (Despesa / Receita / Todas) */}
              <select
                className="input"
                style={{ width: '130px', fontSize: '0.84rem' }}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="DESPESA">💸 Despesas</option>
                <option value="RECEITA">💰 Receitas</option>
                <option value="ALL">Todas</option>
              </select>

              {/* Status */}
              <select
                className="input"
                style={{ width: '140px', fontSize: '0.84rem' }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">Status: Todos</option>
                <option value="PENDENTE">⏳ Pendentes</option>
                <option value="PAGO">✅ Pagos</option>
                <option value="OVERDUE">⚠️ Vencidas / Atraso</option>
              </select>

              {/* Categoria */}
              <select
                className="input"
                style={{ width: '180px', fontSize: '0.84rem' }}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="ALL">Categoria: Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Busca por texto */}
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar descrição, fornecedor ou forma..."
                  style={{ paddingLeft: '32px', fontSize: '0.84rem', width: '100%' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={() => handleOpenNewTransaction('DESPESA')}
              className="btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Nova Despesa
            </button>
          </div>

          {/* Tabela de Lançamentos */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-sand-light)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>VENCIMENTO</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>DESCRIÇÃO</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>CATEGORIA</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>VALOR</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>FORMA PAGTO</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        Nenhum lançamento financeiro encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => {
                      const today = new Date().toISOString().split('T')[0];
                      const isOverdue = t.status === 'PENDENTE' && t.due_date < today;
                      const isDueToday = t.status === 'PENDENTE' && t.due_date === today;

                      return (
                        <tr
                          key={t.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: isOverdue ? '#fff5f5' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, color: isOverdue ? '#b91c1c' : 'var(--text-primary)' }}>
                              {formatDateBR(t.due_date)}
                            </div>
                            {isOverdue && (
                              <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 700, display: 'block' }}>
                                Atrasada
                              </span>
                            )}
                            {isDueToday && (
                              <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 700, display: 'block' }}>
                                Vence Hoje
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{t.description}</div>
                            {t.notes && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                {t.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                backgroundColor: 'var(--bg-sand-light)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.category_color || '#8d5b4c' }} />
                              {t.category_name || 'Sem Categoria'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: 700 }}>
                            <span style={{ color: t.type === 'RECEITA' ? '#15803d' : '#b91c1c' }}>
                              {t.type === 'RECEITA' ? '+ ' : '- '}
                              {formatCurrency(t.amount)}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                            {t.payment_method || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Clique para alternar entre Pendente e Pago"
                            >
                              {t.status === 'PAGO' ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    backgroundColor: '#e8f9ee',
                                    color: '#15803d',
                                    border: '1px solid #a3e9b9',
                                  }}
                                >
                                  <CheckCircle size={12} /> Pago
                                </span>
                              ) : isOverdue ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--status-danger-bg)',
                                    color: 'var(--status-danger-text)',
                                    border: '1px solid var(--status-danger-border)',
                                  }}
                                >
                                  <AlertTriangle size={12} /> Vencida
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    backgroundColor: '#fef3c7',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                  }}
                                >
                                  <Clock size={12} /> Pendente
                                </span>
                              )}
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleOpenEditTransaction(t)}
                                title="Editar Lançamento"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleDeleteTransaction(t)}
                                title="Excluir Lançamento"
                                style={{ color: 'var(--status-danger-text)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA 3: FLUXO DE CAIXA DIÁRIO --- */}
      {activeTab === 'cashflow' && summary && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sand-light)' }}>
            <h3 style={{ margin: 0, fontSize: '1.08rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-serif)' }}>
              Extrato Diário de Entradas e Saídas
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Consolidado de vendas confirmadas e despesas operacionais realizadas por dia
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--text-secondary)' }}>DATA</th>
                  <th style={{ padding: '12px 20px', fontWeight: 700, color: '#15803d' }}>ENTRADAS (+)</th>
                  <th style={{ padding: '12px 20px', fontWeight: 700, color: '#b91c1c' }}>SAÍDAS (-)</th>
                  <th style={{ padding: '12px 20px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>SALDO LÍQUIDO DO DIA</th>
                </tr>
              </thead>
              <tbody>
                {summary.daily_cash_flow.map((point, idx) => {
                  const inc = Number(point.income);
                  const exp = Number(point.expense);
                  const net = Number(point.net);

                  if (inc === 0 && exp === 0) return null; // omite dias sem movimento

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{formatDateBR(point.date)}</td>
                      <td style={{ padding: '12px 20px', color: inc > 0 ? '#15803d' : 'var(--text-tertiary)', fontWeight: inc > 0 ? 700 : 400 }}>
                        {inc > 0 ? `+ ${formatCurrency(inc)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 20px', color: exp > 0 ? '#b91c1c' : 'var(--text-tertiary)', fontWeight: exp > 0 ? 700 : 400 }}>
                        {exp > 0 ? `- ${formatCurrency(exp)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#15803d' : '#b91c1c' }}>
                        {formatCurrency(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ABA 4: CATEGORIAS FINANCEIRAS --- */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-serif)' }}>
                Categorias Financeiras
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Organize e classifique suas despesas operacionais e fontes de receita
              </p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Nova Categoria
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {categories.map((c) => (
              <div
                key={c.id}
                className="card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: `4px solid ${c.color || '#8d5b4c'}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--brand-primary)' }}>{c.name}</div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: c.type === 'RECEITA' ? '#15803d' : '#b91c1c',
                      textTransform: 'uppercase',
                    }}
                  >
                    {c.type}
                  </span>
                </div>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: c.color || '#8d5b4c' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Nova / Editar Transação */}
      <Modal
        isOpen={isTransModalOpen}
        onClose={() => setIsTransModalOpen(false)}
        title={editingTransaction ? 'Editar Lançamento Financeiro' : transType === 'DESPESA' ? 'Nova Despesa / Conta a Pagar' : 'Nova Receita Avulsa'}
        subtitle="Preencha os dados do lançamento financeiro do ateliê"
        maxWidth="540px"
      >
        <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Seletor de Tipo (Despesa / Receita) */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setTransType('DESPESA')}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                border: transType === 'DESPESA' ? '2px solid #b91c1c' : '1px solid var(--border-medium)',
                backgroundColor: transType === 'DESPESA' ? '#fef2f2' : 'transparent',
                color: transType === 'DESPESA' ? '#b91c1c' : 'var(--text-secondary)',
              }}
            >
              💸 Despesa (Saída)
            </button>
            <button
              type="button"
              onClick={() => setTransType('RECEITA')}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                border: transType === 'RECEITA' ? '2px solid #15803d' : '1px solid var(--border-medium)',
                backgroundColor: transType === 'RECEITA' ? '#f0fdf4' : 'transparent',
                color: transType === 'RECEITA' ? '#15803d' : 'var(--text-secondary)',
              }}
            >
              💰 Receita (Entrada)
            </button>
          </div>

          {/* Descrição */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
              Descrição do Lançamento *
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              placeholder="Ex: Compra de 50kg de cimento, Conta de energia, etc."
              value={transDescription}
              onChange={(e) => setTransDescription(e.target.value)}
              required
            />
          </div>

          {/* Valor com Máscara Monetária RTL */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Valor (R$) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
                  R$
                </span>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', paddingLeft: '34px', fontWeight: 700, textAlign: 'right' }}
                  value={formatCentsToCurrency(transAmountRaw)}
                  onChange={handleAmountChange}
                  required
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Categoria Financeira
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={transCategoryId}
                onChange={(e) => setTransCategoryId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecione...</option>
                {categories
                  .filter((c) => c.type === transType)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Vencimento e Forma de Pagamento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Data de Vencimento *
              </label>
              <input
                type="date"
                className="input"
                style={{ width: '100%' }}
                value={transDueDate}
                onChange={(e) => setTransDueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Forma de Pagamento
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={transPaymentMethod}
                onChange={(e) => setTransPaymentMethod(e.target.value)}
              >
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Transferência">Transferência / TED</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          {/* Status (Pendente / Pago) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Status do Lançamento
              </label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={transStatus}
                onChange={(e) => {
                  const s = e.target.value as FinancialStatus;
                  setTransStatus(s);
                  if (s === 'PAGO' && !transPaymentDate) {
                    setTransPaymentDate(transDueDate || new Date().toISOString().split('T')[0]);
                  }
                }}
              >
                <option value="PENDENTE">⏳ Pendente (A Pagar / Receber)</option>
                <option value="PAGO">✅ Pago / Realizado</option>
                <option value="CANCELADO">❌ Cancelado</option>
              </select>
            </div>

            {transStatus === 'PAGO' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={transPaymentDate}
                  onChange={(e) => setTransPaymentDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
              Observações / Fornecedor / Anotações
            </label>
            <textarea
              className="input"
              rows={2}
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="Número de nota fiscal, fornecedor, observações adicionais..."
              value={transNotes}
              onChange={(e) => setTransNotes(e.target.value)}
            />
          </div>

          {/* Botões do Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsTransModalOpen(false)}
              disabled={savingTrans}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingTrans}>
              {savingTrans ? 'Salvando...' : editingTransaction ? 'Salvar Alterações' : 'Cadastrar Lançamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nova Categoria */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Nova Categoria Financeira"
        subtitle="Crie categorias para organizar suas despesas e receitas"
        maxWidth="460px"
      >
        <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
              Nome da Categoria *
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%' }}
              placeholder="Ex: Fretes & Correios, Ferramentas, etc."
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
              Tipo de Categoria *
            </label>
            <select
              className="input"
              style={{ width: '100%' }}
              value={catType}
              onChange={(e) => setCatType(e.target.value as FinancialType)}
            >
              <option value="DESPESA">💸 Despesa (Saída)</option>
              <option value="RECEITA">💰 Receita (Entrada)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Cor de Identificação
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {colorPalette.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setCatColor(color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: catColor === color ? '3px solid var(--brand-primary)' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transform: catColor === color ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsCategoryModalOpen(false)}
              disabled={savingCategory}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingCategory}>
              {savingCategory ? 'Criando...' : 'Salvar Categoria'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default FinancialPage;
