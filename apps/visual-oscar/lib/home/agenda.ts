/**
 * Agenda del día / próximos hitos para el inicio.
 *
 * No hay backend de calendario conectado, así que derivamos los hitos
 * recurrentes de la actividad institucional española a partir de la fecha
 * actual (p. ej. Consejo de Ministros los martes, sesión de control los
 * miércoles). Son orientativos → se marcan como DEMO en la UI.
 */

export type AgendaKind = 'consejo' | 'pleno' | 'control' | 'datos' | 'mercados'

export interface AgendaItem {
  date: string // ISO yyyy-mm-dd
  dateLabel: string // "hoy", "mañana", "mié 11 jun"
  title: string
  kind: AgendaKind
  accent: string
}

const KIND_ACCENT: Record<AgendaKind, string> = {
  consejo: '#1F4E8C',
  pleno: '#7C3AED',
  control: '#0F766E',
  datos: '#16A34A',
  mercados: '#B45309',
}

/** Próxima fecha (>= hoy) cuyo día de la semana sea `dow` (0=dom … 6=sáb). */
function nextDow(now: Date, dow: number): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const delta = (dow - d.getDay() + 7) % 7
  d.setDate(d.getDate() + delta)
  return d
}

function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function label(now: Date, d: Date): string {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((d.getTime() - base.getTime()) / 86_400_000)
  if (diff <= 0) return 'hoy'
  if (diff === 1) return 'mañana'
  return d
    .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace('.', '')
}

/** Devuelve los próximos hitos ordenados por fecha (máx. `limit`). */
export function getAgendaItems(now: Date, limit = 5): AgendaItem[] {
  const seed: Array<{ date: Date; title: string; kind: AgendaKind }> = [
    { date: nextDow(now, 2), title: 'Consejo de Ministros', kind: 'consejo' },
    { date: nextDow(now, 3), title: 'Sesión de control al Gobierno', kind: 'control' },
    { date: nextDow(now, 3), title: 'Pleno del Congreso', kind: 'pleno' },
    { date: nextDow(now, 4), title: 'Publicación BOE · disposiciones', kind: 'datos' },
    { date: nextDow(now, 5), title: 'Cierre semanal de mercados (IBEX 35)', kind: 'mercados' },
    { date: nextDow(now, 1), title: 'Actualización de sondeos (tracking)', kind: 'datos' },
  ]
  return seed
    .map((s) => ({
      date: iso(s.date),
      dateLabel: label(now, s.date),
      title: s.title,
      kind: s.kind,
      accent: KIND_ACCENT[s.kind],
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}
