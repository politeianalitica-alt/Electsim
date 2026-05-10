'use client';
import { CSSProperties, ReactNode } from 'react';
import { Card } from './Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  chart?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
}

export function MetricCard({ label, value, unit, delta, deltaLabel, chart, action, style }: MetricCardProps) {
  const deltaColor = delta === undefined ? 'var(--color-ink-4)' : delta > 0 ? 'var(--color-success)' : delta < 0 ? 'var(--color-danger)' : 'var(--color-ink-4)';
  const deltaSign = delta !== undefined && delta > 0 ? '+' : '';

  return (
    <Card variant="default" padding="md" style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {action}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)', margin: 'var(--space-2) 0 var(--space-1)' }}>
        <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
        </span>
        {unit && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-4)', fontWeight: 500 }}>{unit}</span>}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          {delta !== undefined && <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: deltaColor, fontVariantNumeric: 'tabular-nums' }}>{deltaSign}{delta?.toFixed(1)}%</span>}
          {deltaLabel && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-5)' }}>{deltaLabel}</span>}
        </div>
      )}
      {chart && <div style={{ marginTop: 'var(--space-3)' }}>{chart}</div>}
    </Card>
  );
}
