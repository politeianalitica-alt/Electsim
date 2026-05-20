import type { CommodityCategory, CommoditySignal, TrendDirection } from '@/types/commodities'

export const CATEGORIES: { value: CommodityCategory; label: string; emoji?: string }[] = [
  { value: 'grains', label: 'Granos' },
  { value: 'oils', label: 'Aceites' },
  { value: 'dairy', label: 'Lácteos' },
  { value: 'softs', label: 'Softs' },
  { value: 'meat', label: 'Carnes' },
  { value: 'energy', label: 'Energía' },
  { value: 'metals', label: 'Metales' },
  { value: 'freight', label: 'Fletes' },
]

export const CATEGORY_COLORS: Record<CommodityCategory, { fg: string; bg: string }> = {
  grains: { fg: '#92400e', bg: '#fef3c7' },
  oils: { fg: '#a16207', bg: '#fef9c3' },
  dairy: { fg: '#1e40af', bg: '#dbeafe' },
  softs: { fg: '#9333ea', bg: '#f3e8ff' },
  meat: { fg: '#b91c1c', bg: '#fee2e2' },
  energy: { fg: '#7c2d12', bg: '#fed7aa' },
  metals: { fg: '#374151', bg: '#e5e7eb' },
  freight: { fg: '#0e7490', bg: '#cffafe' },
}

export function trendOf(changePct: number | null | undefined): TrendDirection {
  if (changePct == null) return 'flat'
  if (changePct > 0.05) return 'up'
  if (changePct < -0.05) return 'down'
  return 'flat'
}

export function trendArrow(t: TrendDirection): string {
  return t === 'up' ? '▲' : t === 'down' ? '▼' : '→'
}

export function trendColor(t: TrendDirection): string {
  return t === 'up' ? '#16a34a' : t === 'down' ? '#dc2626' : '#9ca3af'
}

export const SIGNAL_LABELS: Record<CommoditySignal, string> = {
  compra_fuerte: 'COMPRA FUERTE',
  compra: 'COMPRA',
  neutro: 'NEUTRO',
  venta: 'VENTA',
  venta_fuerte: 'VENTA FUERTE',
}

export function signalColor(s: CommoditySignal): { fg: string; bg: string } {
  switch (s) {
    case 'compra_fuerte':
      return { fg: '#065f46', bg: '#a7f3d0' }
    case 'compra':
      return { fg: '#166534', bg: '#bbf7d0' }
    case 'venta':
      return { fg: '#991b1b', bg: '#fecaca' }
    case 'venta_fuerte':
      return { fg: '#7f1d1d', bg: '#fca5a5' }
    default:
      return { fg: '#374151', bg: '#e5e7eb' }
  }
}

export function fmtPrice(value: number | null | undefined, currency?: string | null): string {
  if (value == null) return '—'
  const cur = currency ?? ''
  if (Math.abs(value) >= 1000) {
    return `${value.toLocaleString('es-ES', { maximumFractionDigits: 0 })} ${cur}`
  }
  return `${value.toLocaleString('es-ES', { maximumFractionDigits: 4 })} ${cur}`
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}
