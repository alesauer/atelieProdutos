import React, { useState } from 'react';
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import type { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@casaluma.com.br');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await api.login(email, password);
      onLoginSuccess(resp.user);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg-app)',
        backgroundImage: 'radial-gradient(#e9e1d7 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho do Card */}
        <div
          style={{
            padding: '36px 32px 28px',
            backgroundColor: 'var(--bg-sand-light)',
            borderBottom: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={14} color="var(--brand-accent)" />
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--brand-accent)',
              }}
            >
              Ateliê Casa Luma
            </span>
          </div>

          <h1
            style={{
              fontSize: '2.1rem',
              fontFamily: 'var(--font-serif)',
              color: 'var(--brand-primary)',
              fontWeight: 600,
              lineHeight: 1.15,
            }}
          >
            Acesso ao Sistema
          </h1>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              marginTop: '6px',
            }}
          >
            Gestão integrada de estoque, produção e vendas
          </p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger-border)',
                color: 'var(--status-danger-text)',
                fontSize: '0.88rem',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="login-email">E-mail Corporativo</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@casaluma.com.br"
                style={{ paddingLeft: '40px' }}
              />
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="login-password">Senha de Acesso</label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                style={{ paddingLeft: '40px' }}
              />
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '13px 20px',
              fontSize: '0.98rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Ateliê</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
