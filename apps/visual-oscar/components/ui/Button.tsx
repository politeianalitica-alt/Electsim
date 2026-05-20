'use client';
import { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: CSSProperties;
}

const SIZE_MAP: Record<ButtonSize, CSSProperties> = {
  xs: { fontSize: 'var(--text-xs)', padding: '3px 8px',   gap: '4px', borderRadius: 'var(--radius-sm)' },
  sm: { fontSize: 'var(--text-xs)', padding: '5px 12px',  gap: '5px', borderRadius: 'var(--radius-sm)' },
  md: { fontSize: 'var(--text-sm)', padding: '7px 16px',  gap: '6px', borderRadius: 'var(--radius-md)' },
  lg: { fontSize: 'var(--text-base)', padding: '10px 22px', gap: '8px', borderRadius: 'var(--radius-md)' },
};

const VARIANT_MAP: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: 'var(--color-accent)',         color: '#ffffff',                     border: '1px solid transparent',              fontWeight: 600 },
  secondary: { background: 'var(--color-surface-raised)', color: 'var(--color-ink)',             border: '1px solid var(--color-hairline)',     fontWeight: 500 },
  ghost:     { background: 'transparent',                 color: 'var(--color-ink-3)',           border: '1px solid transparent',              fontWeight: 500 },
  danger:    { background: 'var(--color-danger-subtle)',  color: 'var(--color-danger)',          border: '1px solid rgba(196,44,44,0.2)',       fontWeight: 600 },
  text:      { background: 'transparent',                 color: 'var(--color-accent-text)',     border: 'none',                               fontWeight: 500, padding: '0' },
};

export function Button({ children, variant = 'secondary', size = 'sm', icon, iconEnd, loading, fullWidth, style, disabled, ...rest }: ButtonProps) {
  return (
 <button
      {...rest}
      disabled={disabled || loading}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'all var(--transition-fast)', whiteSpace: 'nowrap', lineHeight: 1, width: fullWidth ? '100%' : undefined, fontFamily: 'var(--font-text)', ...SIZE_MAP[size], ...VARIANT_MAP[variant], ...style }}
    >
      {loading ? <span style={{ width: 12, height: 12, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} /> : icon}
      {children}
      {!loading && iconEnd}
 </button>
  );
}
