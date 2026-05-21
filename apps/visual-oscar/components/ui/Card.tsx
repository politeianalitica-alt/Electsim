'use client';
import { CSSProperties, ReactNode } from 'react';

type CardVariant = 'default' | 'raised' | 'sunken' | 'ghost';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  as?: 'div' | 'section' | 'article' | 'li';
}

const PADDING_MAP: Record<CardPadding, string> = {
  none: '0',
  sm: 'var(--space-3) var(--space-4)',
  md: 'var(--space-5) var(--space-6)',
  lg: 'var(--space-8) var(--space-10)',
};

const VARIANT_STYLES: Record<CardVariant, CSSProperties> = {
  default: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-hairline)',
    boxShadow: 'var(--shadow-sm)',
  },
  raised: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-hairline-soft)',
    boxShadow: 'var(--shadow-md)',
  },
  sunken: {
    background: 'var(--color-surface-sunken)',
    border: '1px solid var(--color-hairline)',
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid var(--color-hairline)',
    boxShadow: 'none',
  },
};

export function Card({ children, variant = 'default', padding = 'md', className, style, onClick, as: Tag = 'div' }: CardProps) {
  const isInteractive = !!onClick;
  return (
 <Tag
      className={className}
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        padding: PADDING_MAP[padding],
        transition: 'box-shadow var(--transition-base), transform var(--transition-base)',
        cursor: isInteractive ? 'pointer' : undefined,
        ...VARIANT_STYLES[variant],
        ...style,
      }}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? 'button' : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
    >
      {children}
 </Tag>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, badge, action }: CardHeaderProps) {
  return (
 <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
 <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
            {title}
 </span>
          {badge}
 </div>
        {subtitle && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>{subtitle}</span>}
 </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
 </div>
  );
}
