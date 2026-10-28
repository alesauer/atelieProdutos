import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  User,
  Plus,
  Search,
  MessageCircle,
  Mail,
  Edit2,
  Trash2,
  Eye,
  MapPin,
  Tag,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  LayoutGrid,
  List as ListIcon,
  ChevronDown,
  X,
  Sparkles,
  ExternalLink,
  Phone,
  Heart,
  Gift,
} from 'lucide-react';

import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { formatMoney } from '../utils/formatters';
import { formatDateOnly } from '../utils/date';
import type {
  Customer,
  CustomerDetail,
  CustomerFormData,
  CustomerStats,
} from '../types';

interface CustomersPageProps {
  onNavigate?: (tab: string) => void;
}

// Opções de canais de origem
const ORIGIN_CHANNELS = [
  'WhatsApp',
  'Instagram',
  'Shopee',
  'Mercado Livre',
  'Loja Física',
  'Feira de Artesanato',
  'Indicação',
  'Site / E-commerce',
  'Outro',
];

// Sugestões de tags rápidas para ateliê de velas e artesanato
const SUGGESTED_TAGS = [
  'VIP',
  'Recorrente',
  'Lembrancinhas',
  'Presentes',
  'Aromas Florais',
  'Aromas Amadeirados',
  'Aromas Doces',
  'Atacado',
];

// Helper para gerar link do WhatsApp
const getWhatsAppLink = (phone?: string | null, message?: string): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  const baseUrl = `https://wa.me/${digits}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
};

// Templates pré-formatados de WhatsApp
const getWhatsAppTemplates = (customerName: string) => [
  {
    id: 'free',
    label: 'Conversa direta',
    icon: MessageCircle,
    text: `Olá ${customerName}, tudo bem? Aqui é do Ateliê Casa Luma! 🕯️✨`,
  },
  {
    id: 'pos_venda',
    label: 'Agradecimento pós-venda',
    icon: Heart,
    text: `Olá ${customerName}! Passando para agradecer pelo carinho da sua compra na Casa Luma e saber se tudo chegou em perfeito estado e como você esperava! 🕯️✨`,
  },
  {
    id: 'dicas',
    label: 'Dicas de queima & cuidados',
    icon: Sparkles,
    text: `Olá ${customerName}! Preparamos algumas dicas especiais para você aproveitar ao máximo sua vela artesanal da Casa Luma: na primeira queima, deixe a cera derreter até a borda do frasco para evitar efeito túnel. Lembre-se de aparar o pavio em 5mm antes de reacender. Qualquer dúvida estamos à disposição! 🤍🕯️`,
  },
  {
    id: 'aniversario',
    label: 'Parabéns / Aniversário',
    icon: Gift,
    text: `Parabéns, ${customerName}! 🎂✨ A equipe da Casa Luma deseja a você um dia iluminado e repleto de momentos especiais. Preparamos um carinho especial para o seu próximo pedido artesanal! 🎁`,
  },
  {
    id: 'novidades',
    label: 'Novos aromas & coleções',
    icon: Tag,
    text: `Olá ${customerName}! Acabamos de lançar novas criações aromáticas na Casa Luma e lembrei de você! Gostaria de conhecer os novos aromas artesanais? ✨🌿`,
  },
];

export const CustomersPage: React.FC<CustomersPageProps> = ({ onNavigate }) => {
  // Estado dos dados
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [orderBy, setOrderBy] = useState<string>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Popover WhatsApp ativo
  const [activeWhatsAppPopover, setActiveWhatsAppPopover] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Modal 360° Perfil do Cliente
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Modal de Cadastro / Edição
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    document: '',
    city: '',
    state: '',
    zip_code: '',
    address_line: '',
    neighborhood: '',
    birth_date: '',
    origin_channel: 'WhatsApp',
    tags: '',
    notes: '',
    is_active: true,
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveWhatsAppPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carrega clientes e estatísticas
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [customersList, statsData] = await Promise.all([
        api.listCustomers({
          search: searchTerm || undefined,
          origin_channel: selectedChannel !== 'ALL' ? selectedChannel : undefined,
          tag: selectedTag !== 'ALL' ? selectedTag : undefined,
          order_by: orderBy,
        }),
        api.getCustomerStats(),
      ]);
      setCustomers(customersList);
      setStats(statsData);
    } catch (err: any) {
      console.error('Erro ao carregar CRM:', err);
      setError(err?.message || 'Falha ao buscar dados dos clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedChannel, selectedTag, orderBy]);

  // Busca com debounce leve
  useEffect(() => {
    const handler = setTimeout(() => {
      loadData();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Lista única de tags existentes na carteira para o filtro
  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.tags) {
        c.tags.split(',').forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [customers]);

  // Abre modal de criação
  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      nickname: '',
      email: '',
      phone: '',
      document: '',
      city: '',
      state: '',
      zip_code: '',
      address_line: '',
      neighborhood: '',
      birth_date: '',
      origin_channel: 'WhatsApp',
      tags: '',
      notes: '',
      is_active: true,
    });
    setIsFormModalOpen(true);
  };

  // Abre modal de edição
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      nickname: customer.nickname || '',
      email: customer.email || '',
      phone: customer.phone || '',
      document: customer.document || '',
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      address_line: customer.address_line || '',
      neighborhood: customer.neighborhood || '',
      birth_date: customer.birth_date ? customer.birth_date.split('T')[0] : '',
      origin_channel: customer.origin_channel || 'WhatsApp',
      tags: customer.tags || '',
      notes: customer.notes || '',
      is_active: customer.is_active,
    });
    setIsFormModalOpen(true);
  };

  // Salva cadastro (criação ou edição)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    setSavingCustomer(true);
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, formData);
      } else {
        await api.createCustomer(formData);
      }
      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao salvar cliente: ${err.message}`);
    } finally {
      setSavingCustomer(false);
    }
  };

  // Exclusão ou Inativação
  const handleDeleteCustomer = async (customer: Customer) => {
    const confirmMsg = customer.sales_count && customer.sales_count > 0
      ? `O cliente "${customer.name}" possui vendas registradas. Ele será INATIVADO para manter a integridade dos relatórios financeiros. Deseja prosseguir?`
      : `Tem certeza que deseja excluir o cliente "${customer.name}"? Esta ação não pode ser desfeita.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteCustomer(customer.id);
      await loadData();
    } catch (err: any) {
      alert(`Erro ao remover cliente: ${err.message}`);
    }
  };

  // Abre Ficha 360° do Cliente
  const handleOpenDetailModal = async (customerId: number) => {
    setDetailLoading(true);
    setIsDetailModalOpen(true);
    try {
      const detail = await api.getCustomer(customerId);
      setSelectedCustomerDetail(detail);
    } catch (err: any) {
      alert(`Erro ao carregar histórico do cliente: ${err.message}`);
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Formata monograma/iniciais para o avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Cores de canais de origem
  const getChannelBadgeStyle = (channel?: string | null) => {
    switch (channel?.toLowerCase()) {
      case 'whatsapp':
        return { bg: '#e8f7ee', color: '#107c41', border: '#b7ebc6' };
      case 'instagram':
        return { bg: '#fdf0f4', color: '#c13584', border: '#f7c3d7' };
      case 'shopee':
        return { bg: '#fff2eb', color: '#ee4d2d', border: '#ffd2bd' };
      case 'mercado livre':
        return { bg: '#fffbe6', color: '#2d3277', border: '#ffe58f' };
      case 'loja física':
        return { bg: '#f0f4ff', color: '#3b82f6', border: '#c7d7fe' };
      case 'feira de artesanato':
      case 'feira / evento':
        return { bg: '#fbf4ea', color: '#b45309', border: '#fcd9a8' };
      case 'indicação':
        return { bg: '#f3eefc', color: '#7c3aed', border: '#ddd0fc' };
      default:
        return { bg: 'var(--bg-sand-light)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' };
    }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Topo: Título e Botão Novo Cliente */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.1rem',
                fontWeight: 600,
                color: 'var(--brand-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Clientes & Relacionamento (CRM)
            </h1>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-sand-light)',
                color: 'var(--brand-accent)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Ateliê Casa Luma
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px' }}>
            Ficha 360°, histórico de compras, métricas de LTV e contato direto via WhatsApp & E-mail
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => loadData()}
            title="Atualizar dados"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--brand-accent)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(163, 105, 75, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={18} />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Cards de Métricas da Carteira (LTV, Clientes, Recorrência, Ticket Médio) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Card 1: Total Clientes */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-sand-light)',
              color: 'var(--brand-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Total de Clientes
            </div>
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 700,
                color: 'var(--brand-primary)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {stats ? stats.total_customers : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {stats ? `${stats.active_customers} ativos no cadastro` : 'Carregando...'}
            </div>
          </div>
        </div>

        {/* Card 2: Clientes Recorrentes (Fidelidade) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Clientes VIP / Recorrentes
            </div>
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 700,
                color: 'var(--brand-primary)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {stats ? stats.recurring_customers : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              2 ou mais compras realizadas
            </div>
          </div>
        </div>

        {/* Card 3: Faturamento Total da Carteira (LTV Consolidado) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#e8f7ee',
              color: '#107c41',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Faturamento da Carteira
            </div>
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 700,
                color: 'var(--brand-primary)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {stats ? formatMoney(stats.total_revenue_from_customers) : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              LTV total acumulado
            </div>
          </div>
        </div>

        {/* Card 4: Ticket Médio por Cliente */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Ticket Médio por Cliente
            </div>
            <div
              style={{
                fontSize: '1.55rem',
                fontWeight: 700,
                color: 'var(--brand-primary)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {stats ? formatMoney(stats.average_ticket) : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Média gasta por cliente comprador
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Erro caso ocorra */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            marginBottom: '20px',
            fontSize: '0.88rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          {/* Campo de Busca */}
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Buscar por nome, apelido, telefone, e-mail ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 36px 9px 38px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-app)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtro Canal de Origem */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: '0.88rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">Todos os Canais</option>
            {ORIGIN_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>
                Canal: {ch}
              </option>
            ))}
          </select>

          {/* Filtro de Tags */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: '0.88rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">Todas as Tags</option>
            {allAvailableTags.map((tag) => (
              <option key={tag} value={tag}>
                Tag: #{tag}
              </option>
            ))}
          </select>

          {/* Ordenação */}
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: '0.88rem',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="name">Ordem: Nome (A-Z)</option>
            <option value="ltv_desc">Ordem: Maior LTV (Valor Gasto)</option>
            <option value="recent_purchase">Ordem: Compra Mais Recente</option>
            <option value="recent_created">Ordem: Cadastro Mais Recente</option>
          </select>
        </div>

        {/* Alternador de Visualização (Grid vs Tabela) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-sand-light)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setViewMode('grid')}
            title="Visualização em Cartões"
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--brand-accent)' : 'var(--text-secondary)',
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}
          >
            <LayoutGrid size={16} />
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="Visualização em Lista"
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: viewMode === 'table' ? 'var(--bg-surface)' : 'transparent',
              color: viewMode === 'table' ? 'var(--brand-accent)' : 'var(--text-secondary)',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}
          >
            <ListIcon size={16} />
            Tabela
          </button>
        </div>
      </div>

      {/* Exibição dos Clientes (Grid ou Tabela) */}
      {loading ? (
        <div
          style={{
            padding: '80px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <RefreshCw size={28} className="animate-spin" color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Carregando carteira de clientes...</p>
        </div>
      ) : customers.length === 0 ? (
        <div
          style={{
            padding: '70px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-sand-light)',
              color: 'var(--brand-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Users size={32} />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              color: 'var(--brand-primary)',
              margin: '0 0 8px',
            }}
          >
            Nenhum cliente encontrado
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
            {searchTerm || selectedChannel !== 'ALL' || selectedTag !== 'ALL'
              ? 'Tente ajustar os filtros de busca para encontrar o cliente desejado.'
              : 'Comece a cadastrar sua carteira de clientes para registrar preferências, acompanhar compras e enviar mensagens.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--brand-accent)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            Cadastrar Primeiro Cliente
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID DE CARTÕES */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {customers.map((customer) => {
            const channelStyle = getChannelBadgeStyle(customer.origin_channel);
            const waLinkDirect = getWhatsAppLink(customer.phone);
            const emailLink = customer.email ? `mailto:${customer.email}?subject=Ateliê Casa Luma - Contato` : null;
            const hasPurchases = (customer.sales_count || 0) > 0;
            const tagsList = customer.tags ? customer.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

            return (
              <div
                key={customer.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Topo do Card */}
                <div style={{ padding: '20px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Avatar com Monograma */}
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-sand-light)',
                          border: '2px solid var(--brand-accent)',
                          color: 'var(--brand-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                          fontFamily: 'var(--font-serif)',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(customer.name)}
                      </div>

                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '1.08rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {customer.name}
                        </h3>
                        {customer.nickname && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--brand-accent)', fontStyle: 'italic' }}>
                            "{customer.nickname}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge Canal de Origem */}
                    {customer.origin_channel && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: channelStyle.bg,
                          color: channelStyle.color,
                          border: `1px solid ${channelStyle.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {customer.origin_channel}
                      </span>
                    )}
                  </div>

                  {/* Informações de Contato Rápidas */}
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {customer.phone ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <Phone size={14} color="var(--text-muted)" />
                        <span>{customer.phone}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Sem telefone cadastrado
                      </div>
                    )}

                    {customer.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <Mail size={14} color="var(--text-muted)" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {customer.email}
                        </span>
                      </div>
                    )}

                    {customer.city && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <MapPin size={14} />
                        <span>
                          {customer.city}
                          {customer.state ? ` - ${customer.state}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {tagsList.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                      {tagsList.map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--bg-sand-light)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bloco de Métricas de Compras (LTV & Recorrência) */}
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        LTV Total Gasto
                      </div>
                      <div
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: hasPurchases ? 'var(--brand-accent)' : 'var(--text-muted)',
                        }}
                      >
                        {formatMoney(customer.total_spent)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Compras Feitas
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {customer.sales_count || 0} pedido{(customer.sales_count || 0) === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  {customer.last_purchase_date && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      Última compra em {formatDateOnly(customer.last_purchase_date)}
                    </div>
                  )}
                </div>

                {/* Rodapé do Card com Ações Rápidas de WhatsApp, Email e Perfil */}
                <div
                  style={{
                    padding: '12px 18px',
                    borderTop: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-sand-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                  }}
                >
                  {/* Botões de Contato (WhatsApp & Email) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Botão WhatsApp com Dropdown de Mensagens */}
                    {waLinkDirect ? (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setActiveWhatsAppPopover(activeWhatsAppPopover === customer.id ? null : customer.id)}
                          title="Enviar WhatsApp"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #b7ebc6',
                            backgroundColor: '#e8f7ee',
                            color: '#107c41',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <MessageCircle size={15} />
                          WhatsApp
                          <ChevronDown size={13} />
                        </button>

                        {/* Popover de Mensagens de WhatsApp */}
                        {activeWhatsAppPopover === customer.id && (
                          <div
                            ref={popoverRef}
                            style={{
                              position: 'absolute',
                              bottom: 'calc(100% + 8px)',
                              left: 0,
                              width: '270px',
                              backgroundColor: 'var(--bg-surface)',
                              borderRadius: 'var(--radius-md)',
                              boxShadow: 'var(--shadow-lg)',
                              border: '1px solid var(--border-subtle)',
                              padding: '8px',
                              zIndex: 100,
                              animation: 'modalSlideIn 150ms ease-out',
                            }}
                          >
                            <div
                              style={{
                                padding: '6px 8px 8px',
                                borderBottom: '1px solid var(--border-subtle)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Mensagens para {customer.nickname || customer.name.split(' ')[0]}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                              {getWhatsAppTemplates(customer.nickname || customer.name).map((tpl) => {
                                const IconComp = tpl.icon;
                                const link = getWhatsAppLink(customer.phone, tpl.text);
                                return (
                                  <a
                                    key={tpl.id}
                                    href={link || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setActiveWhatsAppPopover(null)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 10px',
                                      borderRadius: 'var(--radius-sm)',
                                      color: 'var(--text-primary)',
                                      textDecoration: 'none',
                                      fontSize: '0.82rem',
                                      transition: 'background-color 0.1s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-sand-light)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    <IconComp size={15} color="var(--brand-accent)" />
                                    <span>{tpl.label}</span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sem Whats</span>
                    )}

                    {/* Botão Email Direto */}
                    {emailLink && (
                      <a
                        href={emailLink}
                        title={`Enviar e-mail para ${customer.email}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <Mail size={15} />
                      </a>
                    )}
                  </div>

                  {/* Ações de Gestão: Ver 360°, Editar, Excluir */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleOpenDetailModal(customer.id)}
                      title="Ver Ficha 360° e Histórico de Compras"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--brand-primary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Eye size={14} />
                      Ficha
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(customer)}
                      title="Editar dados cadastrais"
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => handleDeleteCustomer(customer)}
                      title="Excluir ou inativar cliente"
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fff5f5',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABELA DE CLIENTES */
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-sand-light)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '14px 20px' }}>Cliente</th>
                  <th style={{ padding: '14px 16px' }}>Contato & WhatsApp</th>
                  <th style={{ padding: '14px 16px' }}>Origem & Tags</th>
                  <th style={{ padding: '14px 16px' }}>Localidade</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>LTV Total</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Pedidos</th>
                  <th style={{ padding: '14px 16px' }}>Última Compra</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const channelStyle = getChannelBadgeStyle(customer.origin_channel);
                  const waLink = getWhatsAppLink(customer.phone);
                  const emailLink = customer.email ? `mailto:${customer.email}` : null;
                  const tagsList = customer.tags ? customer.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

                  return (
                    <tr
                      key={customer.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-app)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Cliente (Avatar + Nome + Apelido) */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--bg-sand-light)',
                              color: 'var(--brand-accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              fontFamily: 'var(--font-serif)',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(customer.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {customer.name}
                            </div>
                            {customer.nickname && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--brand-accent)', fontStyle: 'italic' }}>
                                "{customer.nickname}"
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contato & WhatsApp */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {waLink ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#107c41',
                                fontWeight: 500,
                                textDecoration: 'none',
                              }}
                            >
                              <MessageCircle size={14} />
                              {customer.phone}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                          )}

                          {customer.email && (
                            <a
                              href={emailLink || '#'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--text-secondary)',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                              }}
                            >
                              <Mail size={12} />
                              {customer.email}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Origem & Tags */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {customer.origin_channel && (
                            <span
                              style={{
                                display: 'inline-block',
                                width: 'fit-content',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: channelStyle.bg,
                                color: channelStyle.color,
                                border: `1px solid ${channelStyle.border}`,
                              }}
                            >
                              {customer.origin_channel}
                            </span>
                          )}
                          {tagsList.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {tagsList.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '0.7rem',
                                    padding: '1px 6px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-sand-light)',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  #{t}
                                </span>
                              ))}
                              {tagsList.length > 2 && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  +{tagsList.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Localidade */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {customer.city ? `${customer.city}${customer.state ? `/${customer.state}` : ''}` : '—'}
                      </td>

                      {/* LTV Total */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--brand-accent)' }}>
                        {formatMoney(customer.total_spent)}
                      </td>

                      {/* Pedidos */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            backgroundColor: (customer.sales_count || 0) > 1 ? '#fef3c7' : 'var(--bg-app)',
                            color: (customer.sales_count || 0) > 1 ? '#b45309' : 'var(--text-primary)',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                          }}
                        >
                          {customer.sales_count || 0}
                        </span>
                      </td>

                      {/* Última Compra */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {customer.last_purchase_date ? formatDateOnly(customer.last_purchase_date) : '—'}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenDetailModal(customer.id)}
                            title="Ver Histórico & Ficha 360°"
                            style={{
                              padding: '6px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--brand-primary)',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            title="Editar"
                            style={{
                              padding: '6px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            title="Excluir"
                            style={{
                              padding: '6px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fff5f5',
                              color: '#dc2626',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FICHA 360° DO CLIENTE & HISTÓRICO DE COMPRAS                      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedCustomerDetail ? `Ficha 360° - ${selectedCustomerDetail.name}` : 'Perfil do Cliente'}
        subtitle="Dados cadastrais, preferências sensoriais e histórico detalhado de compras"
        maxWidth="840px"
      >
        {detailLoading || !selectedCustomerDetail ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <RefreshCw size={28} className="animate-spin" color="var(--brand-accent)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Carregando dados completos do cliente...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Header com Monograma, Identificação e Botões Rápidos de Ação */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-sand-light)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-surface)',
                    border: '2px solid var(--brand-accent)',
                    color: 'var(--brand-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  {getInitials(selectedCustomerDetail.name)}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                      {selectedCustomerDetail.name}
                    </h2>
                    {selectedCustomerDetail.is_active ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: '#e8f7ee',
                          color: '#107c41',
                        }}
                      >
                        Ativo
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                        }}
                      >
                        Inativo
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {selectedCustomerDetail.nickname && (
                      <span style={{ color: 'var(--brand-accent)', fontStyle: 'italic', marginRight: '8px' }}>
                        "{selectedCustomerDetail.nickname}"
                      </span>
                    )}
                    {selectedCustomerDetail.origin_channel && (
                      <span>Canal: <strong>{selectedCustomerDetail.origin_channel}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações Diretas no Perfil */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getWhatsAppLink(selectedCustomerDetail.phone) && (
                  <a
                    href={getWhatsAppLink(selectedCustomerDetail.phone, `Olá ${selectedCustomerDetail.nickname || selectedCustomerDetail.name}! Tudo bem? Passando para te dar um oi da Casa Luma! 🕯️✨`) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#107c41',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                )}

                {selectedCustomerDetail.email && (
                  <a
                    href={`mailto:${selectedCustomerDetail.email}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                    }}
                  >
                    <Mail size={15} />
                    E-mail
                  </a>
                )}
              </div>
            </div>

            {/* Banner de Métricas Financeiras / LTV */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Gasto (LTV)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-accent)', marginTop: '2px' }}>
                  {formatMoney(selectedCustomerDetail.total_spent)}
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total de Pedidos
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedCustomerDetail.sales_count || 0}
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Ticket Médio
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedCustomerDetail.sales_count && selectedCustomerDetail.sales_count > 0
                    ? formatMoney(Number(selectedCustomerDetail.total_spent || 0) / selectedCustomerDetail.sales_count)
                    : 'R$ 0.00'}
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Última Compra
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px' }}>
                  {selectedCustomerDetail.last_purchase_date
                    ? formatDateOnly(selectedCustomerDetail.last_purchase_date)
                    : 'Nunca comprou'}
                </div>
              </div>
            </div>

            {/* Informações Pessoais, Endereço e Preferências */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Card Dados Cadastrais & Endereço */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <User size={16} color="var(--brand-accent)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Dados & Localização
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Telefone / WhatsApp: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedCustomerDetail.phone || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>E-mail: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedCustomerDetail.email || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>CPF / Documento: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedCustomerDetail.document || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Data de Aniversário: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedCustomerDetail.birth_date ? formatDateOnly(selectedCustomerDetail.birth_date) : 'Não informada'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Localidade: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedCustomerDetail.city
                        ? `${selectedCustomerDetail.city}${selectedCustomerDetail.state ? ` / ${selectedCustomerDetail.state}` : ''}`
                        : 'Não informada'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Card Preferências Sensoriais & Tags */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Heart size={16} color="var(--brand-accent)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Preferências & Notas Sensoriais
                  </span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Tags do Cliente:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedCustomerDetail.tags ? (
                      selectedCustomerDetail.tags.split(',').map((t, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--bg-sand-light)',
                            color: 'var(--brand-accent)',
                            border: '1px solid var(--border-subtle)',
                            fontWeight: 500,
                          }}
                        >
                          #{t.trim()}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Nenhuma tag associada
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Notas & Aromas Favoritos:
                  </div>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-app)',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      minHeight: '60px',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {selectedCustomerDetail.notes || 'Nenhuma observação especial anotada para este cliente.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Histórico Detalhado de Compras */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} color="var(--brand-primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                    Histórico de Pedidos Realizados
                  </h3>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      onNavigate('vendas');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-accent)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Ir para Vendas
                    <ExternalLink size={13} />
                  </button>
                )}
              </div>

              {selectedCustomerDetail.recent_sales && selectedCustomerDetail.recent_sales.length > 0 ? (
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--bg-sand-light)',
                          borderBottom: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                        }}
                      >
                        <th style={{ padding: '10px 14px' }}>Pedido</th>
                        <th style={{ padding: '10px 14px' }}>Data</th>
                        <th style={{ padding: '10px 14px' }}>Itens Comprados</th>
                        <th style={{ padding: '10px 14px' }}>Pagamento</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Valor Total</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomerDetail.recent_sales.map((sale) => (
                        <tr key={sale.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--brand-accent)' }}>
                            {sale.sale_number}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            {formatDateOnly(sale.created_at)}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>
                            {sale.items_preview || `${sale.items_count} item(s)`}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            {sale.payment_method || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {formatMoney(sale.total_amount)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor:
                                  sale.status === 'CONFIRMADA'
                                    ? '#e8f7ee'
                                    : sale.status === 'CANCELADA'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                                color:
                                  sale.status === 'CONFIRMADA'
                                    ? '#107c41'
                                    : sale.status === 'CANCELADA'
                                    ? '#b91c1c'
                                    : '#b45309',
                              }}
                            >
                              {sale.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding: '30px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-subtle)',
                  }}
                >
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Este cliente ainda não possui compras registradas no ateliê.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CADASTRO / EDIÇÃO DE CLIENTE                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCustomer ? 'Editar Dados do Cliente' : 'Cadastrar Novo Cliente'}
        subtitle="Preencha os dados de contato, endereço e preferências para um atendimento personalizado"
        maxWidth="680px"
      >
        <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Seção 1: Identificação Básica */}
          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--brand-accent)',
                marginBottom: '10px',
              }}
            >
              1. Identificação
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariana Silveira"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Como prefere ser chamado(a)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mari"
                  value={formData.nickname || ''}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  CPF / CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.document || ''}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Contato & Canais */}
          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--brand-accent)',
                marginBottom: '10px',
              }}
            >
              2. Contato & Origem
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Canal de Origem
                </label>
                <select
                  value={formData.origin_channel || 'WhatsApp'}
                  onChange={(e) => setFormData({ ...formData, origin_channel: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {ORIGIN_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Tags / Etiquetas (separadas por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="VIP, Aromas Florais, Lembrancinha"
                  value={formData.tags || ''}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Sugestões de tags rápidas */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sugestões rápidas:</span>
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => {
                    const current = formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [];
                    if (!current.includes(tag)) {
                      setFormData({ ...formData, tags: current.length > 0 ? `${formData.tags}, ${tag}` : tag });
                    }
                  }}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-sand-light)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--brand-accent)',
                    cursor: 'pointer',
                  }}
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Seção 3: Localidade (Mais Enxuto: Cidade e UF) */}
          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--brand-accent)',
                marginBottom: '10px',
              }}
            >
              3. Localidade
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  UF (Estado)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="SP"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '8px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Preferências Sensoriais & Observações */}
          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--brand-accent)',
                marginBottom: '10px',
              }}
            >
              4. Preferências Sensoriais & Observações
            </div>

            <textarea
              rows={3}
              placeholder="Ex: Ama aromas cítricos como Bergamota e Alecrim. Não gosta de notas doces como Baunilha. Prefere pavio de algodão."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.88rem',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* Botões do Rodapé */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={savingCustomer}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--brand-accent)',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: savingCustomer ? 'not-allowed' : 'pointer',
                opacity: savingCustomer ? 0.7 : 1,
              }}
            >
              {savingCustomer ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Cliente'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
