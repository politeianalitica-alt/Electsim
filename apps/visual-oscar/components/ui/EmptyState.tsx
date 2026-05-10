'use client';
import { CSSProperties, ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  compact?: boolean;
  style?: CSSProperties;
}

export function EmptyState({ icon, title, message, action, compact, style }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: compact ? 'var(--space-6)' : 'var(--space-12) var(--space-8)', gap: 'var(--space-3)', ...style }}>
      {icon && <div style={{ color: 'var(--color-ink-5)', marginBottom: 'var(--space-1)', opacity: 0.6 }}>{icon}</div>}
      <span style={{ fontSize: compact ? 'var(--text-sm)' : 'var(--text-base)', fontWeight: 600, color: 'var(--color-ink-3)' }}>{title}</span>
      {message && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-5)', maxWidth: '32ch', lineHeight: 1.4 }}>{message}</span>}
      {action}
    </div>
  );
}
