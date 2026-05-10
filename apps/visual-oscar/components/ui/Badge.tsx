'use client';
import { CSSProperties, ReactNode } from 'react';
import { PARTY_COLORS, SEVERITY_COLORS, type SeverityLevel } from '@/lib/tokens';

type BadgeVariant = 'party' | 'severity' | 'status' | 'neutral' | 'accent';
type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  party?: string;
  severity?: SeverityLevel;
  status?: 'success' | 'danger' | 'warn' | 'info';
  size?: BadgeSize;
  dot?: boolean;
  style?: CSSProperties;
}

const SIZE_MAP: Record<BadgeSize, CSSProperties> = {
  xs: { fontSize: 'var(--text-xs)', padding: '1px 6px', borderRadius: 'var(--radius-full)' },
  sm: { fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-full)' },
  md: { fontSize: 'var(--text-sm)', padding: '3px 10px', borderRadius: 'var(--radius-full)' },
};

export function Badge({ children, variant = 'neutral', party, severity, status, size = 'sm', dot = false, style }: BadgeProps) {
  let bg = 'var(--color-surface-raised)';
  let color = 'var(--color-ink-3)';
  let border = '1px solid var(--color-hairline)';

  if (variant === 'party' && party) {
    const hex = PARTY_COLORS[party] ?? PARTY_COLORS.OTROS;
    bg = hex + '18'; color = hex; border = `1px solid ${hex}30`;
  } else if (variant === 'severity' && severity) {
    const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
    const hex = SEVERITY_COLORS[severity][isDark ? 'dark' : 'light'];
    bg = hex + '14'; color = hex; border = `1px solid ${hex}28`;
  } else if (variant === 'status' && status) {
    const map = {
      success: { bg: 'var(--color-success-subtle)', color: 'var(--color-success)', border: '1px solid rgba(45,138,57,0.2)' },
      danger:  { bg: 'var(--color-danger-subtle)',  color: 'var(--color-danger)',  border: '1px solid rgba(196,44,44,0.2)' },
      warn:    { bg: 'var(--color-warn-subtle)',    color: 'var(--color-warn)',    border: '1px solid rgba(217,119,6,0.2)' },
      info:    { bg: 'var(--color-info-subtle)',    color: 'var(--color-info)',    border: '1px solid rgba(0,113,227,0.2)' },
    };
    ({ bg, color, border } = map[status]);
  } else if (variant === 'accent') {
    bg = 'var(--color-accent-subtle)'; color = 'var(--color-accent-text)'; border = '1px solid rgba(0,113,227,0.15)';
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: dot ? '5px' : undefined, fontWeight: 500, whiteSpace: 'nowrap', background: bg, color, border, ...SIZE_MAP[size], ...style }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />}
      {children}
    </span>
  );
}
