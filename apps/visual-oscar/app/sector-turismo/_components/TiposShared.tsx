'use client'
/**
 * <TiposShared /> · Turismo v3 · Sprint T7 · primitivas de la vista "Tipos de turismo"
 *
 * Lenguaje visual compartido por TODOS los paneles por tipo de turismo
 * (sol&playa, urbano, rural, cruceros, cultural, MICE, salud, deportivo,
 * gastronómico, religioso, idiomático, shopping). Una sola implementación para:
 *
 *   - <TiposPanelHeader />  · cabecera de panel (glyph + título + bajada +
 *     etiqueta LIVE/CURADO honesta + chips de fuente).
 *   - <TiposStatGrid />     · fila de KPIs compactos (label · valor · unit · foot),
 *     degrada a '—' (CLAUDE.md: nunca se inventan cifras).
 *   - <TiposFicha />        · tarjeta de contexto CURADO con fuente + fecha
 *     obligatorias (trazabilidad) y métricas opcionales.
 *   - <TiposBar />          · barras horizontales con recharts (ranking).
 *   - <TiposNote />         · nota de metodología / degradación al pie.
 *   - helpers: useEnvelope() (fetch del envelope {ok,data,...}), fmt(), pct().
 *
 * Cero emojis · Unicode geométrico (CLAUDE.md §0.5). Degradación honesta: si una
 * fuente cae, el panel lo dice y sigue mostrando lo que tenga.
 */
import { useEffect, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const ACCENT = '#0EA5E9'
export const ACCENT_DARK = '#075985'

// ─────────────────────────────────────────────────────────────────────────
// Envelope contract + fetch hook
// ─────────────────────────────────────────────────────────────────────────

export interface Envelope<T> {
  ok: boolean
  data: T | null
  error?: string
  fetched_at?: string
  source_url?: string
  partial?: boolean
}

export type LoadState = 'idle' | 'loading' | 'ok' | 'error'

/**
 * Descarga un endpoint que responde el envelope Politeia `{ ok, data, ... }`.
 * NUNCA lanza: ante fallo de red/JSON devuelve `{ data:null, state:'error' }`.
 * `enabled=false` deja el hook inerte (para lazy-mount por sección).
 */
export function useEnvelope<T>(url: string | null, enabled = true) {
  const [data, setData] = useState<T | null>(null)
  const [env, setEnv] = useState<Envelope<T> | null>(null)
  const [state, setState] = useState<LoadState>('idle')
  const acRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled || !url) return
    let alive = true
    const ac = new AbortController()
    acRef.current = ac
    setState('loading')
    fetch(url, { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Envelope<T>>) : null))
      .then((j) => {
        if (!alive) return
        if (j && j.ok && j.data != null) {
          setData(j.data)
          setEnv(j)
          setState('ok')
        } else {
          setData(j?.data ?? null)
          setEnv(j)
          setState(j ? 'error' : 'error')
        }
      })
      .catch(() => {
        if (!alive) return
        setState('error')
      })
    return () => {
      alive = false
      ac.abort()
    }
  }, [url, enabled])

  return { data, env, state }
}

// ─────────────────────────────────────────────────────────────────────────
// Formato
// ─────────────────────────────────────────────────────────────────────────

/** Formatea número es-ES; null/undefined → '—'. */
export function fmt(v: number | null | undefined, decimals?: number): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const d = decimals != null ? decimals : Math.abs(v) >= 100 ? 0 : 1
  return v.toLocaleString('es-ES', { maximumFractionDigits: d })
}

/** Compacta a millones/miles con sufijo. null → '—'. */
export function fmtCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })}k`
  return v.toLocaleString('es-ES', { maximumFractionDigits: 0 })
}

/** % con signo. null → '—'. */
export function pct(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = v > 0 ? '+' : ''
  return `${s}${v.toLocaleString('es-ES', { maximumFractionDigits: decimals })}%`
}

// ─────────────────────────────────────────────────────────────────────────
// <TiposPanelHeader /> · cabecera de panel por tipo
// ─────────────────────────────────────────────────────────────────────────

export type DataKind = 'live' | 'curado' | 'mixto'

interface PanelHeaderProps {
  glyph: string
  title: string
  desc: string
  /** live = endpoint con dato vivo · curado = fichas datadas · mixto = ambos. */
  kind: DataKind
  /** Etiqueta de degradación cuando un endpoint live cayó (opcional). */
  degraded?: boolean
  /** Chips de fuente (organismo + dataset). */
  fuentes?: string[]
}

const KIND_BADGE: Record<DataKind, { label: string; bg: string; color: string; border: string }> = {
  live: { label: '◉ DATO VIVO', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  curado: { label: '◍ CURADO + DATADO', bg: '#F5F5F7', color: '#52525B', border: '#E4E4E7' },
  mixto: { label: '◉ VIVO + CURADO', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
}

export function TiposPanelHeader({ glyph, title, desc, kind, degraded, fuentes }: PanelHeaderProps) {
  const badge = KIND_BADGE[kind]
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ fontSize: 22, color: ACCENT, lineHeight: 1 }}>
          {glyph}
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#1d1d1f',
          }}
        >
          {title}
        </h2>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.06em',
            padding: '3px 8px',
            borderRadius: 999,
            background: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}
        >
          {badge.label}
        </span>
        {degraded && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '3px 8px',
              borderRadius: 999,
              background: '#FFF7ED',
              color: '#C2410C',
              border: '1px solid #FED7AA',
            }}
          >
            ! FUENTE PARCIAL
          </span>
        )}
      </div>
      <p style={{ margin: '8px 0 0', maxWidth: 720, fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.5 }}>
        {desc}
      </p>
      {fuentes && fuentes.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {fuentes.map((f) => (
            <span
              key={f}
              style={{
                fontSize: 10,
                padding: '3px 9px',
                background: '#F5F5F7',
                color: '#6e6e73',
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// <TiposStatGrid /> · fila de KPIs compactos (superficie clara)
// ─────────────────────────────────────────────────────────────────────────

export interface Stat {
  label: string
  value: string
  foot?: string
  /** Color del número (default accent). */
  color?: string
}

export function TiposStatGrid({ items, loading }: { items: Stat[]; loading?: boolean }) {
  const cols = Math.min(4, Math.max(2, items.length || 1))
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
        {Array.from({ length: items.length || cols }).map((_, i) => (
          <div key={i} style={{ height: 74, background: '#F5F5F7', border: '1px solid #ECECEF', borderRadius: 12 }} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {items.map((s) => (
        <div
          key={s.label}
          style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: '11px 13px' }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#86868b',
              marginBottom: 4,
            }}
          >
            {s.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: s.color ?? ACCENT_DARK,
              lineHeight: 1.05,
            }}
          >
            {s.value}
          </div>
          {s.foot && <div style={{ fontSize: 9.5, color: '#86868b', marginTop: 3 }}>{s.foot}</div>}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// <TiposFicha /> · tarjeta de contexto CURADO con fuente + fecha (obligatorias)
// ─────────────────────────────────────────────────────────────────────────

export interface FichaMetric {
  label: string
  value: string
}

export interface FichaProps {
  titulo: string
  /** Métricas datadas (cifras públicas verificables). */
  metrics?: FichaMetric[]
  /** Cuerpo de contexto (1-3 frases). */
  cuerpo?: string
  /** Fuente del dato (organismo). OBLIGATORIA para curado. */
  fuente: string
  /** Fecha de referencia del dato (año o YYYY-MM). OBLIGATORIA. */
  fecha: string
  /** URL pública del organismo (opcional, abre nueva pestaña). */
  url?: string
}

export function TiposFicha({ titulo, metrics, cuerpo, fuente, fecha, url }: FichaProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
        {titulo}
      </div>
      {metrics && metrics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: metrics.length > 2 ? '1fr 1fr' : '1fr', gap: 6 }}>
          {metrics.map((m) => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: ACCENT_DARK, lineHeight: 1.1 }}>
                {m.value}
              </span>
              <span style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      )}
      {cuerpo && <p style={{ margin: 0, fontSize: 11.5, color: '#52525B', lineHeight: 1.5 }}>{cuerpo}</p>}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
        <span
          style={{
            fontSize: 9.5,
            color: '#6e6e73',
            background: '#F8FAFC',
            border: '1px solid #ECECEF',
            borderRadius: 999,
            padding: '2px 8px',
          }}
        >
          {fuente} · {fecha}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              color: ACCENT_DARK,
              textDecoration: 'none',
              borderBottom: `1px solid ${ACCENT}`,
            }}
          >
            fuente ↗
          </a>
        )}
      </div>
    </div>
  )
}

/** Grid responsive de fichas curadas. */
export function TiposFichaGrid({ children, min = 240 }: { children: React.ReactNode; min?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 10 }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// <TiposBar /> · ranking en barras horizontales (recharts)
// ─────────────────────────────────────────────────────────────────────────

export interface BarDatum {
  name: string
  value: number
  /** Color override por barra (opcional). */
  color?: string
}

export function TiposBar({
  data,
  unit,
  height,
  formatValue,
}: {
  data: BarDatum[]
  unit?: string
  height?: number
  formatValue?: (v: number) => string
}) {
  const valid = data.filter((d) => Number.isFinite(d.value))
  if (!valid.length) {
    return <div style={{ color: '#86868b', fontSize: 12, padding: 20, textAlign: 'center' }}>Sin datos disponibles</div>
  }
  const h = height ?? Math.max(160, valid.length * 26 + 20)
  const fv = formatValue ?? ((v: number) => fmtCompact(v))
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={valid} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10.5, fill: '#3a3a3d' }}
          tickLine={false}
          axisLine={false}
          width={132}
        />
        <Tooltip
          cursor={{ fill: 'rgba(14,165,233,0.06)' }}
          formatter={(v: number | string) => [`${fv(Number(v))}${unit ? ` ${unit}` : ''}`, '']}
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #ECECEF' }}
          labelStyle={{ fontWeight: 700, color: '#1d1d1f' }}
        />
        <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={15} label={{ position: 'right', fontSize: 9.5, fill: '#6e6e73', formatter: (v: number) => fv(Number(v)) }}>
          {valid.map((d, i) => (
            <Cell key={i} fill={d.color ?? ACCENT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// <TiposNote /> · nota al pie (metodología / degradación)
// ─────────────────────────────────────────────────────────────────────────

export function TiposNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '12px 0 0',
        fontSize: 10.5,
        color: '#86868b',
        lineHeight: 1.5,
        borderTop: '1px solid #F0F0F1',
        paddingTop: 10,
      }}
    >
      {children}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// <TiposErrorState /> · degradación cuando el endpoint live cae del todo
// ─────────────────────────────────────────────────────────────────────────

export function TiposErrorState({ fuente }: { fuente: string }) {
  return (
    <div
      style={{
        background: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 12,
        padding: '14px 16px',
        fontSize: 12,
        color: '#92400E',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ fontWeight: 700 }}>Dato no disponible.</strong> La fuente en vivo ({fuente}) no
      respondió en este momento. No se muestran cifras estimadas (degradación honesta). Reintenta en unos
      minutos.
    </div>
  )
}

/** Tarjeta-sección blanca contenedora (mismo lenguaje que Panel). */
export function TiposCard({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      {children}
    </section>
  )
}
