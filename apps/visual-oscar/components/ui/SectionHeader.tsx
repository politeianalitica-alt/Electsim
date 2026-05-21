'use client';
import { CSSProperties, ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  border?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

const SIZE_CONFIG = {
  sm: { title: 'var(--text-sm)',  sub: 'var(--text-xs)',  mb: 'var(--space-3)' },
  md: { title: 'var(--text-lg)',  sub: 'var(--text-sm)',  mb: 'var(--space-5)' },
  lg: { title: 'var(--text-xl)', sub: 'var(--text-base)', mb: 'var(--space-8)' },
};

export function SectionHeader({ title, subtitle, eyebrow, action, border = false, size = 'md', style }: SectionHeaderProps) {
  const cfg = SIZE_CONFIG[size];
  return (
 <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: cfg.mb, paddingBottom: border ? 'var(--space-3)' : undefined, borderBottom: border ? '1px solid var(--color-hairline)' : undefined, ...style }}>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {eyebrow && <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-accent-text)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{eyebrow}</span>}
 <h2 style={{ fontSize: cfg.title, fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', lineHeight: 1.2, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: cfg.sub, color: 'var(--color-ink-4)', margin: 0, lineHeight: 1.4 }}>{subtitle}</p>}
 </div>
      {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
 </div>
  );
}
