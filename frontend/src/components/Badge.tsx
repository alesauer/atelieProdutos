import React from 'react';
import type { ItemType } from '../types';

interface BadgeProps {
  type?: ItemType;
  status?: 'active' | 'inactive' | 'low_stock' | 'zero_stock';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  label?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ type, status, variant, label, children }) => {
  if (type) {
    const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
      PRODUTO_ACABADO: {
        label: 'Produto Acabado',
        bg: '#fbf3ea',
        text: '#824d27',
        border: '#ecd6c5',
      },
      MATERIA_PRIMA: {
        label: 'Matéria-Prima',
        bg: '#eef5ea',
        text: '#2f5b2b',
        border: '#cfe0c7',
      },
      EMBALAGEM: {
        label: 'Embalagem',
        bg: '#eff3f8',
        text: '#2c4e70',
        border: '#ccdae9',
      },
      MATERIAL_AUXILIAR: {
        label: 'Material Auxiliar',
        bg: '#f4f1ed',
        text: '#595045',
        border: '#ddd6cb',
      },
    };

    const c = config[type] || {
      label: label || type.replace(/_/g, ' '),
      bg: '#fbf5ee',
      text: '#6d4c41',
      border: '#e4d5c7',
    };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {c.label}
      </span>
    );
  }

  if (status) {
    const statusConfig = {
      active: { label: 'Ativo', bg: 'var(--status-active-bg)', text: 'var(--status-active-text)', border: 'var(--status-active-border)' },
      inactive: { label: 'Inativo', bg: 'var(--status-neutral-bg)', text: 'var(--status-neutral-text)', border: 'var(--status-neutral-border)' },
      low_stock: { label: 'Alerta de Produção', bg: 'var(--status-warning-bg)', text: 'var(--status-warning-text)', border: 'var(--status-warning-border)' },
      zero_stock: { label: 'Sem Estoque', bg: 'var(--status-danger-bg)', text: 'var(--status-danger-text)', border: 'var(--status-danger-border)' },
    };

    const s = statusConfig[status];
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: s.bg,
          color: s.text,
          border: `1px solid ${s.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: s.text,
          }}
        />
        {s.label}
      </span>
    );
  }

  if (variant) {
    const variantStyles = {
      default: { bg: 'var(--bg-sand-light)', text: 'var(--text-secondary)', border: 'var(--border-subtle)' },
      success: { bg: '#eef5ea', text: '#276749', border: '#cfe0c7' },
      warning: { bg: '#fffaf0', text: '#c05621', border: '#feebc8' },
      error: { bg: '#fff5f5', text: '#c53030', border: '#fed7d7' },
      info: { bg: '#ebf8ff', text: '#2b6cb0', border: '#bee3f8' },
    };

    const v = variantStyles[variant] || variantStyles.default;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: v.bg,
          color: v.text,
          border: `1px solid ${v.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {label || children}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: 'var(--bg-sand-light)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {label || children}
    </span>
  );
};
