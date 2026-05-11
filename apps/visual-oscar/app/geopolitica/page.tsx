'use client'
import { useState, useMemo } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'
import WorldGeoMap from '@/components/maps/WorldGeoMap'

// ── helpers ───────────────────────────────────────────────────────────────────
function relTime(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 1) return 'ahora'
    if (m < 60) return `hace ${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `hace ${h}h`
    const d = Math.floor(h / 24)
    return `hace ${d}d`
  } catch { return iso?.slice(0, 10) ?? '—' }
}

function riskColor(r: number) {
  if (r >= 70) return '#dc2626'
  if (r >= 50) return '#f59e0b'
  if (r >= 30) return '#3b82f6'
  return '#22c55e'
}
function riskLabel(r: number) {
  if (r >= 70) return 'CRITICO'
  if (r >= 50) return 'ELEVADO'
  if (r >= 30) return 'MODERADO'
  return 'BAJO'
}
function sentColor(s: number) {
  if (s < -0.4) return '#dc2626'
  if (s < -0.1) return '#f59e0b'
  if (s > 0.1)  return '#22c55e'
  return '#64748b'
}
function nivelColor(n: string) {
  if (n === 'CRITICO') return '#dc2626'
  if (n === 'ALTO')    return '#f59e0b'
  if (n === 'MEDIO')   return '#3b82f6'
  return '#22c55e'
}

// ── design tokens ─────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.05)',
}
const CARD_INNER: React.CSSProperties = { padding: '20px 24px' }
const INK1 = '#0f172a'
const INK3 = '#64748b'
const INK4 = '#94a3b8'

// World map now uses real GeoJSON via @/components/maps/WorldGeoMap

// ── types ─────────────────────────────────────────────────────────────────────
interface RiesgoItem {
  code: string; name: string; risk: number; status: string
  delta_7d: number; n_articles_30d: number; avg_sentiment: number
  n_negative: number; structural_risk: number; has_data: boolean
}
interface EventItem {
  date: string | null; country: string; type: string
  title: string; description: string; source?: string | null
  impact: number; spain_impact?: string | null; url?: string | null
}
interface KpiData {
  eventos_criticos_hoy: number
  articulos_internacionales_7d: number
  paises_escalada_7d: number
  conflictos_activos: number
  fuentes_internacionales: number
  impacto_espana_alto_7d: number
  alertas_activas: number
  paises_monitorizados: number
  presencia_activa: number
  alertas_count: { CRITICO: number; ALTO: number; MEDIO: number }
  trend_delta: number
  updated_at: string
}
interface AlertaItem {
  id: string; titulo: string; nivel: string; fecha: string
  paises: string[]; descripcion_corta: string; fuente: string
  confianza_sistema?: number
}
interface OsintItem {
  id: string; titulo: string; fuente: string; fecha: string
  urgencia: number; categoria: string; resumen: string
  relevancia_espana: number
}
interface PresenciaItem {
  id: string; pais: string; iso3: string; lat: number; lon: number
  categoria: string; titulo: string; descripcion: string
  valor: number; unidad: string; score_relevancia: number
  n_articulos_30d: number; last_updated: string
}
interface PresenciaKpis {
  efectivos: number; diaspora: number; inversion_mill_eur: number
  embajadas: number; fuentes_energia: number
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ items, active, onChange }: { items: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 5, background: 'rgba(0,0,0,0.04)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', marginBottom: 24, overflowX: 'auto' }}>
      {items.map((t, i) => (
        <button key={t} onClick={() => onChange(i)} style={{
          border: active === i ? '1px solid rgba(14,165,233,0.22)' : '1px solid transparent',
          background: active === i ? 'rgba(14,165,233,0.10)' : 'transparent',
          color: active === i ? INK1 : INK3,
          borderRadius: 8, padding: '7px 16px',
          fontSize: 11, fontWeight: active === i ? 700 : 500,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>{t}</button>
      ))}
    </div>
  )
}

// ── KPI Strip ────────────────────────────────────────────────────────────────
function KpiStrip({ kpis }: { kpis: KpiData | null }) {
  const items = [
    { label: 'Noticias int. 7d',    value: kpis?.articulos_internacionales_7d ?? '—', accent: '#0ea5e9' },
    { label: 'Alertas activas',     value: kpis?.alertas_activas ?? '—', accent: '#dc2626' },
    { label: 'Países monitorizados',value: kpis?.paises_monitorizados ?? '—', accent: '#6366f1' },
    { label: 'Conflictos activos',  value: kpis?.conflictos_activos ?? '—', accent: '#f59e0b' },
    { label: 'Impacto alto 7d',     value: kpis?.impacto_espana_alto_7d ?? '—', accent: '#ef4444' },
    { label: 'Presencia exterior',  value: kpis?.presencia_activa ?? '—', accent: '#22c55e' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map(({ label, value, accent }) => (
        <div key={label} style={{ ...CARD, ...CARD_INNER, padding: '14px 18px' }}>
          <div style={{ fontSize: 9, color: INK4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: accent, letterSpacing: '-0.03em', fontFamily: 'var(--font-display, inherit)' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

// ── World Map with risk bubbles (uses real GeoJSON + d3-geo) ───────────────────
function WorldMap({ riesgo }: { riesgo: RiesgoItem[] }) {
  return (
    <div style={{ ...CARD, overflow: 'hidden', position: 'relative' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Mapa de riesgo global</span>
        <span style={{ marginLeft: 12, fontSize: 11, color: INK3 }}>Intensidad desde noticias_prensa últimos 30 días · {riesgo.length} países</span>
      </div>
      <WorldGeoMap riesgo={riesgo} highlightISO="ES" />
      <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['#dc2626','CRITICO ≥70'],['#f59e0b','ELEVADO 50-69'],['#3b82f6','MODERADO 30-49'],['#86efac','BAJO <30']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c as string }} />
            <span style={{ fontSize: 10, color: INK3 }}>{l}</span>
          </div>
        ))}
        <span style={{ fontSize: 10, color: INK4, marginLeft: 'auto' }}>Coloración → riesgo · Burbuja → cobertura</span>
      </div>
    </div>
  )
}


// ── Country Risk Table ─────────────────────────────────────────────────────────
function RiesgoTable({ riesgo }: { riesgo: RiesgoItem[] }) {
  return (
    <div style={{ ...CARD, ...CARD_INNER }}>
      <div style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Índice de riesgo por país</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {riesgo.map((item, i) => (
          <div key={item.code} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr 80px 60px 60px',
            gap: 8, alignItems: 'center',
            padding: '9px 0',
            borderBottom: i < riesgo.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
          }}>
            <span style={{ fontSize: 10, color: INK4, fontWeight: 600 }}>{i + 1}</span>
            <div>
              <span style={{ fontWeight: 600, fontSize: 12, color: INK1 }}>{item.name}</span>
              {!item.has_data && <span style={{ marginLeft: 6, fontSize: 9, color: INK4 }}>est.</span>}
            </div>
            {/* Risk bar */}
            <div style={{ position: 'relative', height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${item.risk}%`, background: riskColor(item.risk), borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: riskColor(item.risk), textAlign: 'right' }}>{item.risk}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: riskColor(item.risk), textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>
              {riskLabel(item.risk)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Events Feed ───────────────────────────────────────────────────────────────
function EventsFeed({ events, loading }: { events: EventItem[]; loading: boolean }) {
  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando eventos…</div>
  if (!events.length) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Sin eventos recientes.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map((ev, i) => {
        const impact = ev.spain_impact || ''
        const impactColor = impact === 'critico' || impact === 'alto' ? '#dc2626' : impact === 'medio' ? '#f59e0b' : '#22c55e'
        return (
          <div key={i} style={{ ...CARD, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Impact dot */}
            <div style={{ flexShrink: 0, marginTop: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: impactColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK1, lineHeight: 1.4, marginBottom: 4 }}>
                {ev.url ? (
                  <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: INK1, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1F4E8C')}
                    onMouseLeave={e => (e.currentTarget.style.color = INK1)}>
                    {ev.title}
                  </a>
                ) : ev.title}
              </div>
              {ev.description !== ev.title && (
                <div style={{ fontSize: 11.5, color: INK3, lineHeight: 1.5, marginBottom: 6 }}>{ev.description?.slice(0, 180)}{(ev.description?.length ?? 0) > 180 ? '…' : ''}</div>
              )}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: INK4 }}>{relTime(ev.date)}</span>
                {ev.country && <span style={{ fontSize: 10, color: INK3, fontWeight: 600 }}>{ev.country}</span>}
                {ev.source && <span style={{ fontSize: 10, color: INK4 }}>{ev.source}</span>}
                {ev.type && (
                  <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', color: INK3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {ev.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Alertas Panel ─────────────────────────────────────────────────────────────
function AlertasPanel({ alertas, loading }: { alertas: AlertaItem[]; loading: boolean }) {
  const [filter, setFilter] = useState<string | null>(null)
  const filtered = filter ? alertas.filter(a => a.nivel === filter) : alertas

  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando alertas…</div>

  const counts = { CRITICO: alertas.filter(a => a.nivel === 'CRITICO').length, ALTO: alertas.filter(a => a.nivel === 'ALTO').length, MEDIO: alertas.filter(a => a.nivel === 'MEDIO').length }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[null, 'CRITICO', 'ALTO', 'MEDIO'].map(nivel => (
          <button key={nivel ?? 'all'} onClick={() => setFilter(nivel)} style={{
            border: '1px solid', borderColor: nivel ? nivelColor(nivel) : 'rgba(0,0,0,0.15)',
            background: filter === nivel ? (nivel ? nivelColor(nivel) : '#f1f5f9') : 'white',
            color: filter === nivel && nivel ? 'white' : nivel ? nivelColor(nivel) : INK3,
            borderRadius: 8, padding: '5px 12px', fontSize: 10, fontWeight: 700,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em',
            transition: 'all 150ms',
          }}>
            {nivel ?? 'Todas'} {nivel ? `(${counts[nivel as keyof typeof counts] ?? 0})` : `(${alertas.length})`}
          </button>
        ))}
      </div>

      {!filtered.length && (
        <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>
          Sin alertas{filter ? ` de nivel ${filter}` : ''} en los últimos 14 días.
        </div>
      )}

      {filtered.map((a, i) => (
        <div key={a.id} style={{ ...CARD, padding: '16px 20px', borderLeft: `3px solid ${nivelColor(a.nivel)}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: nivelColor(a.nivel), textTransform: 'uppercase', letterSpacing: '0.09em' }}>{a.nivel}</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK1, marginTop: 2, lineHeight: 1.4 }}>{a.titulo}</div>
            </div>
            <span style={{ fontSize: 10, color: INK4, flexShrink: 0 }}>{relTime(a.fecha)}</span>
          </div>
          <div style={{ fontSize: 12, color: INK3, lineHeight: 1.5, marginBottom: 8 }}>{a.descripcion_corta}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {a.paises?.map((p: string) => (
              <span key={p} style={{ fontSize: 10, background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 7px', color: INK3, fontWeight: 600 }}>{p}</span>
            ))}
            {a.fuente && <span style={{ fontSize: 10, color: INK4 }}>{a.fuente}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Presencia Exterior ─────────────────────────────────────────────────────────
function PresenciaExterior({ presencia, kpis, loading }: { presencia: PresenciaItem[]; kpis: PresenciaKpis | null; loading: boolean }) {
  const CAT_COLORS: Record<string, string> = {
    militar: '#dc2626', energetica: '#f59e0b', empresarial: '#3b82f6',
    diplomatica: '#6366f1', diaspora: '#22c55e',
  }

  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando presencia…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI bar */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { label: 'Efectivos', value: kpis.efectivos.toLocaleString(), accent: '#dc2626' },
            { label: 'Diaspora', value: kpis.diaspora.toLocaleString(), accent: '#22c55e' },
            { label: 'Inversión M€', value: kpis.inversion_mill_eur.toLocaleString(), accent: '#3b82f6' },
            { label: 'Embajadas', value: kpis.embajadas, accent: '#6366f1' },
            { label: 'Fuentes energía', value: kpis.fuentes_energia, accent: '#f59e0b' },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ ...CARD, padding: '12px 16px' }}>
              <div style={{ fontSize: 9, color: INK4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: accent, letterSpacing: '-0.02em' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Presence cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {presencia.map(p => (
          <div key={p.id} style={{ ...CARD, padding: '16px 20px', borderTop: `3px solid ${CAT_COLORS[p.categoria] ?? '#6366f1'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: CAT_COLORS[p.categoria] ?? '#6366f1', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                {p.categoria}
              </span>
              <span style={{ fontSize: 10, color: INK4 }}>{p.n_articulos_30d} art.</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK1, marginBottom: 4 }}>{p.pais}</div>
            <div style={{ fontSize: 11.5, color: INK3, marginBottom: 10, lineHeight: 1.4 }}>{p.titulo}</div>
            <div style={{ fontSize: 10, color: INK4, lineHeight: 1.5 }}>{p.descripcion}</div>
            {/* Relevance bar */}
            <div style={{ marginTop: 10, position: 'relative', height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${p.score_relevancia * 100}%`, background: CAT_COLORS[p.categoria] ?? '#6366f1', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── OSINT Feed ────────────────────────────────────────────────────────────────
function OsintFeed({ osint, loading }: { osint: OsintItem[]; loading: boolean }) {
  const [filter, setFilter] = useState<string | null>(null)
  const countries = useMemo(() => {
    const seen = new Set<string>()
    osint.forEach(o => { if (o.categoria && o.categoria !== 'Internacional') seen.add(o.categoria) })
    return Array.from(seen).sort()
  }, [osint])
  const filtered = filter ? osint.filter(o => o.categoria === filter) : osint

  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando OSINT…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Country filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter(null)} style={{ border: `1px solid ${filter === null ? '#1F4E8C' : 'rgba(0,0,0,0.15)'}`, background: filter === null ? '#1F4E8C' : 'white', color: filter === null ? 'white' : INK3, borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
          Todos ({osint.length})
        </button>
        {countries.slice(0, 12).map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ border: `1px solid ${filter === c ? '#1F4E8C' : 'rgba(0,0,0,0.12)'}`, background: filter === c ? '#1F4E8C' : 'white', color: filter === c ? 'white' : INK3, borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
            {c}
          </button>
        ))}
      </div>

      {!filtered.length && (
        <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Sin señales OSINT{filter ? ` para ${filter}` : ''}.</div>
      )}

      {filtered.slice(0, 40).map((item, i) => (
        <div key={item.id} style={{ ...CARD, padding: '12px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: INK1, lineHeight: 1.4, marginBottom: 4 }}>{item.titulo}</div>
            {item.resumen && item.resumen !== item.titulo && (
              <div style={{ fontSize: 11, color: INK3, lineHeight: 1.5, marginBottom: 6 }}>{item.resumen.slice(0, 160)}…</div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: INK4 }}>{relTime(item.fecha)}</span>
              {item.fuente && <span style={{ fontSize: 10, color: INK3, fontWeight: 600 }}>{item.fuente}</span>}
              {item.categoria && item.categoria !== 'Internacional' && (
                <span style={{ fontSize: 9, background: 'rgba(14,165,233,0.1)', borderRadius: 4, padding: '2px 6px', color: '#0284c7', fontWeight: 700 }}>{item.categoria}</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} style={{ color: n <= item.urgencia ? '#f59e0b' : 'rgba(0,0,0,0.1)', fontSize: 10 }}>●</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeopoliticaPage() {
  const [tab, setTab] = useState(0)

  const { data: kpisRaw, loading: kpisLoading }    = useApi<KpiData>('/api/geopolitica/stats',    { refreshInterval: 120_000 })
  const { data: riesgoRaw, loading: riesgoLoading } = useApi<RiesgoItem[]>('/api/geopolitica/riesgo', { refreshInterval: 180_000 })
  const { data: eventsRaw, loading: eventsLoading } = useApi<{ data: EventItem[] }>('/api/geopolitica/events', { refreshInterval: 60_000 })
  const { data: alertasRaw, loading: alertasLoad }  = useApi<{ data: AlertaItem[] }>('/api/geopolitica/alertas', { refreshInterval: 60_000 })
  const { data: osintRaw, loading: osintLoading }   = useApi<{ data: OsintItem[] }>('/api/geopolitica/osint',   { refreshInterval: 90_000 })
  const { data: presenciaRaw, loading: presLoad }   = useApi<{ data: PresenciaItem[]; kpis: PresenciaKpis }>('/api/geopolitica/presencia', { refreshInterval: 300_000 })

  const kpis     = kpisRaw ?? null
  const riesgo   = Array.isArray(riesgoRaw) ? riesgoRaw : []
  const events   = eventsRaw?.data ?? []
  const alertas  = alertasRaw?.data ?? []
  const osint    = osintRaw?.data ?? []
  const presencia = presenciaRaw?.data ?? []
  const presenciaKpis = presenciaRaw?.kpis ?? null

  return (
    <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh', fontFamily: 'var(--font-body, -apple-system, system-ui, sans-serif)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Page header */}
        <header style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Inteligencia · Geopolítica
          </span>
          <h1 style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 4px', color: '#1d1d1f' }}>
            Monitor Geopolítico
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Riesgo país · Eventos internacionales · Presencia exterior española.
            Datos en tiempo real desde <strong>noticias_prensa</strong> (hoy: {new Date().toLocaleDateString('es-ES')}).
          </p>
        </header>

        {/* KPI strip */}
        <KpiStrip kpis={kpis} />

        {/* Tab bar */}
        <TabBar
          items={['MAPA DE RIESGO', 'EVENTOS', 'ALERTAS', 'SEÑALES OSINT', 'PRESENCIA EXTERIOR']}
          active={tab}
          onChange={setTab}
        />

        {/* Tab 0 — Mapa de riesgo */}
        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
            <WorldMap riesgo={riesgo} />
            {riesgoLoading
              ? <div style={{ ...CARD, ...CARD_INNER, color: INK3 }}>Calculando riesgo…</div>
              : <RiesgoTable riesgo={riesgo.slice(0, 15)} />
            }
          </div>
        )}

        {/* Tab 1 — Eventos */}
        {tab === 1 && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              {events.length} eventos internacionales recientes · ordenados por fecha
            </div>
            <EventsFeed events={events} loading={eventsLoading} />
          </div>
        )}

        {/* Tab 2 — Alertas */}
        {tab === 2 && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              Alertas basadas en negatividad de cobertura noticiosa (sentimiento &lt; -0.1)
            </div>
            <AlertasPanel alertas={alertas} loading={alertasLoad} />
          </div>
        )}

        {/* Tab 3 — OSINT */}
        {tab === 3 && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              {osint.length} señales OSINT · noticias_prensa con keywords geopolíticos · últimos 7 días
            </div>
            <OsintFeed osint={osint} loading={osintLoading} />
          </div>
        )}

        {/* Tab 4 — Presencia exterior */}
        {tab === 4 && (
          <div>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              Presencia española en el exterior calculada desde artículos recientes · cobertura noticiosa como proxy de relevancia
            </div>
            <PresenciaExterior presencia={presencia} kpis={presenciaKpis} loading={presLoad} />
          </div>
        )}

      </main>

      <footer style={{ borderTop: '1px solid var(--hairline, rgba(0,0,0,0.07))', padding: '20px 28px', textAlign: 'center', color: '#94a3b8', fontSize: 11.5 }}>
        Politeia Analítica · Monitor Geopolítico · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
