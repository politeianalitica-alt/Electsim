'use client'
/**
 * <GeoSignalFeed /> · Sprint GEO-RADAR C2
 *
 * Feed cronológico de señales tempranas tipadas últimas 6h.
 * Cada señal lleva categoría, país (si identificado), título, fuente, tono, hora.
 *
 * Consume /api/geopolitica/senales.
 * Click en señal → callback opcional con iso3 (para abrir drawer país).
 */
import { useEffect, useState } from 'react'

interface Signal {
  type: 'violencia' | 'tension_diplomatica' | 'protesta' | 'cambio_gobierno' | 'desastre_humanitario' | 'otro'
  type_label: string
  type_color: string
  iso3: string | null
  country_name: string | null
  title: string
  source_domain: string
  source_country?: string
  url: string
  datetime: string
  tone: number
  language: string
}
interface Response {
  ok: boolean
  signals: Signal[]
  counts_by_type: Record<string, number>
  _meta?: { sources: string[]; window_hours: number }
}

interface Props {
  onCountryClick?: (iso3: string) => void
  limit?: number
  filterType?: Signal['type'] | null
}

export function GeoSignalFeed({ onCountryClick, limit = 30, filterType = null }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<Signal['type'] | null>(filterType)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/senales', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const filtered = activeFilter
    ? data?.signals.filter((s) => s.type === activeFilter)
    : data?.signals

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            Señales tempranas · últimas 6h
          </h3>
          {data?.signals && (
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {filtered?.length ?? 0} {activeFilter ? '/ ' + data.signals.length : ''} señales
            </span>
          )}
        </div>
        {data?.counts_by_type && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <FilterChip
              label={`Todas (${data.signals.length})`}
              active={activeFilter === null}
              onClick={() => setActiveFilter(null)}
              color="#0f172a"
            />
            {Object.entries(data.counts_by_type).filter(([, n]) => n > 0).map(([type, n]) => (
              <FilterChip
                key={type}
                label={`${typeLabel(type)} (${n})`}
                active={activeFilter === type}
                onClick={() => setActiveFilter(activeFilter === type ? null : type as Signal['type'])}
                color={typeColor(type)}
              />
            ))}
          </div>
        )}
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando señales GDELT…</p>}

      {!loading && filtered && filtered.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          {activeFilter ? `Sin señales del tipo "${typeLabel(activeFilter)}"` : 'Sin señales tipo conflicto en las últimas 6h'}
        </p>
      )}

      {!loading && filtered && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.slice(0, limit).map((s) => (
            <SignalRow key={s.url} signal={s} onCountryClick={onCountryClick} />
          ))}
        </div>
      )}

      {data?._meta?.sources && (
        <p style={{ margin: '10px 0 0', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
          Fuentes: {data._meta.sources.join(' · ')} · ventana {data._meta.window_hours}h
        </p>
      )}
    </section>
  )
}

function SignalRow({ signal, onCountryClick }: { signal: Signal; onCountryClick?: (iso3: string) => void }) {
  const hasCountry = !!signal.iso3
  const isClickable = hasCountry && !!onCountryClick
  return (
    <div
      onClick={() => isClickable && onCountryClick!(signal.iso3!)}
      style={{
        padding: '8px 10px', background: '#fff', borderRadius: 6,
        borderLeft: `3px solid ${signal.type_color}`, border: '1px solid #f1f5f9',
        cursor: isClickable ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 2 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: signal.type_color, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {signal.type_label}
        </span>
        {hasCountry && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#0f172a' }}>
            · {signal.country_name}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
          {timeAgo(signal.datetime)}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: '#0f172a', lineHeight: 1.3 }}>
        {signal.title}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#94a3b8' }}>
        <span>{signal.source_domain}</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', color: signal.tone < -3 ? '#dc2626' : signal.tone > 3 ? '#16a34a' : '#94a3b8' }}>
          tono {signal.tone > 0 ? '+' : ''}{signal.tone.toFixed(1)}
        </span>
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 8px', borderRadius: 6,
        border: active ? `1px solid ${color}` : '1px solid #e2e8f0',
        background: active ? color : '#fff',
        color: active ? '#fff' : '#475569',
        fontSize: 10, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >{label}</button>
  )
}

function typeLabel(t: string): string {
  return ({
    violencia: 'Violencia',
    tension_diplomatica: 'Tensión',
    protesta: 'Protesta',
    cambio_gobierno: 'Gobierno',
    desastre_humanitario: 'Humanitario',
  } as any)[t] || t
}
function typeColor(t: string): string {
  return ({
    violencia: '#dc2626',
    tension_diplomatica: '#ea580c',
    protesta: '#eab308',
    cambio_gobierno: '#2563eb',
    desastre_humanitario: '#737373',
  } as any)[t] || '#94a3b8'
}
function timeAgo(iso: string): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `hace ${h}h`
  return `hace ${m}min`
}

export default GeoSignalFeed
