import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  actions,
}) => {
  return (
    <header
      style={{
        padding: '20px 28px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onOpenMobileMenu}
          className="mobile-menu-btn"
          aria-label="Abrir Menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-sand-light)',
            color: 'var(--brand-primary)',
          }}
        >
          <Menu size={20} />
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
              style={{
                fontSize: '1.65rem',
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                color: 'var(--brand-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h2>
          </div>
          {subtitle && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {actions}
      </div>

      <style>{`
        @media (min-width: 900px) {
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
