import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PlaceholderTabProps {
  title: string;
  phase: string;
  description: string;
  features: string[];
}

export const PlaceholderTab: React.FC<PlaceholderTabProps> = ({
  title,
  phase,
  description,
  features,
}) => {
  return (
    <div style={{ padding: '36px 28px', maxWidth: '880px', margin: '0 auto' }}>
      <div
        className="card"
        style={{
          padding: '40px 32px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            backgroundColor: 'var(--bg-sand-light)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--brand-accent)',
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '16px',
          }}
        >
          <Sparkles size={16} />
          <span>{phase}</span>
        </div>

        <h2
          style={{
            fontSize: '2rem',
            fontFamily: 'var(--font-serif)',
            color: 'var(--brand-primary)',
            marginBottom: '10px',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            maxWidth: '560px',
            margin: '0 auto 28px',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>

        <div
          style={{
            textAlign: 'left',
            maxWidth: '500px',
            margin: '0 auto',
            backgroundColor: 'var(--bg-sand-light)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '12px',
            }}
          >
            Funcionalidades previstas para este módulo:
          </span>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {features.map((feat, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.92rem',
                  color: 'var(--text-primary)',
                }}
              >
                <ArrowRight size={14} color="var(--brand-accent)" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
