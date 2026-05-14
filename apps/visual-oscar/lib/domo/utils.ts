import type { AlertRule, DomoStatus } from '@/types/domo'
import { STATUS_COLORS } from './constants'

// ─── Formateo ────────────────────────────────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3_600_000) {
    const m = Math.floor(ms / 60_000)
    const s = Math.floor((ms % 60_000) / 1000)
    return `${m}m ${s}s`
  }
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('es-ES')
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return iso.slice(0, 10) }
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ─── Status helpers ──────────────────────────────────────────────────────────
export function getStatusColor(status: DomoStatus | string): string {
  return (STATUS_COLORS as Record<string, string>)[status] ?? 'var(--color-muted, #6b7280)'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // sync
    connected:    'Conectado',
    error:        'Error',
    syncing:      'Sincronizando',
    idle:         'Inactivo',
    paused:       'Pausado',
    // run
    running:      'Ejecutando',
    success:      'Completado',
    queued:       'En cola',
    pending:      'Pendiente',
    cancelled:    'Cancelado',
    // alert
    ok:           'OK',
    triggered:    'Disparada',
    silenced:     'Silenciada',
    // pipeline / dataset
    active:       'Activo',
    draft:        'Borrador',
    ready:        'Listo',
    building:     'Construyendo',
    stale:        'Desactualizado',
    empty:        'Vacío',
    // quality
    passing:      'Pasando',
    failing:      'Fallando',
    warning:      'Advertencia',
    skipped:      'Saltado',
    // connection extras
    disconnected: 'Desconectado',
    testing:      'Probando',
  }
  return labels[status] ?? status
}

// ─── Tiempo relativo ─────────────────────────────────────────────────────────
export function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH   = Math.floor(diffMs / 3_600_000)
  const diffD   = Math.floor(diffMs / 86_400_000)
  if (diffMs < 0)        return 'pendiente'
  if (diffMin < 1)       return 'ahora mismo'
  if (diffMin < 60)      return `hace ${diffMin}min`
  if (diffH < 24)        return `hace ${diffH}h`
  if (diffD < 7)         return `hace ${diffD}d`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ─── IDs ─────────────────────────────────────────────────────────────────────
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Quality scores ──────────────────────────────────────────────────────────
export function qualityScoreColor(score: number): string {
  if (score >= 80) return 'var(--color-success, #22c55e)'
  if (score >= 60) return 'var(--color-warning, #f59e0b)'
  return 'var(--color-danger, #ef4444)'
}

export function qualityScoreLabel(score: number): string {
  if (score >= 80) return 'Buena'
  if (score >= 60) return 'Media'
  return 'Baja'
}

// ─── Alert helpers ───────────────────────────────────────────────────────────
export function isAlertActive(alert: AlertRule): boolean {
  return alert.status === 'active' || alert.status === 'triggered'
}

// ─── Query string builder ────────────────────────────────────────────────────
export function buildQueryString(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) q.set(k, String(v))
  }
  return q.toString()
}

// ─── Truncate ────────────────────────────────────────────────────────────────
export function truncate(text: string, max: number): string {
  if (!text || text.length <= max) return text
  return text.slice(0, max) + '...'
}

// ─── Schedule humanizado ─────────────────────────────────────────────────────
export function scheduleLabel(schedule: string): string {
  const map: Record<string, string> = {
    realtime:     'Tiempo real',
    every_5min:   'Cada 5 min',
    every_15min:  'Cada 15 min',
    hourly:       'Cada hora',
    daily:        'Diario',
    weekly:       'Semanal',
    manual:       'Manual',
  }
  return map[schedule] ?? schedule
}
