'use client';
import { CSSProperties } from 'react';

interface DividerProps {
  label?: string;
  margin?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

const MARGIN = { sm: 'var(--space-3)', md: 'var(--space-5)', lg: 'var(--space-8)' };

export function Divider({ label, margin = 'md', style }: DividerProps) {
  if (label) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: `${MARGIN[margin]} 0`, ...style }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-hairline)' }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-hairline)' }} />
      </div>
    );
  }
  return <hr style={{ border: 'none', borderTop: '1px solid var(--color-hairline)', margin: `${MARGIN[margin]} 0`, ...style }} />;
}
