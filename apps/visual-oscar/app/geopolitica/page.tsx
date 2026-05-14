'use client'
import { useState, useMemo } from 'react'
import AppHeader from '../_components/AppHeader'
import { useApi } from '@/lib/useApi'
import WorldGeoMap from '@/components/maps/WorldGeoMap'
import { COUNTRY_DAFO, type CountryDafo } from '@/lib/country-dafo'

// ── helpers ────────────────────────────────────────────────────────────────
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
function nivelColor(n: string) {
  if (n === 'CRITICO') return '#dc2626'
  if (n === 'ALTO') return '#f59e0b'
  if (n === 'MEDIO') return '#3b82f6'
  return '#94a3b8'
}

// ── design tokens ──────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)',
}
const CARD_INNER: React.CSSProperties = { padding: '18px 22px' }
const INK1 = '#0f172a'
const INK3 = '#64748b'
const INK4 = '#94a3b8'

// ── ISO3 → ISO2 (para el mapa) ────────────────────────────────────────────
const ISO3_TO_ISO2: Record<string, string> = {
  RUS:'RU', UKR:'UA', ISR:'IL', GAZ:'PS', PSE:'PS', IRN:'IR', LBY:'LY', MLI:'ML',
  VEN:'VE', MAR:'MA', DZA:'DZ', MRT:'MR', SEN:'SN', TUN:'TN', EGY:'EG',
  FRA:'FR', DEU:'DE', ITA:'IT', PRT:'PT', GBR:'GB', NLD:'NL', BEL:'BE',
  POL:'PL', SWE:'SE', CHE:'CH', GRC:'GR', USA:'US', CAN:'CA', CHN:'CN',
  JPN:'JP', KOR:'KR', IND:'IN', AUS:'AU', TUR:'TR', SAU:'SA', MEX:'MX',
  BRA:'BR', ARG:'AR', CUB:'CU', CHL:'CL', COL:'CO', PER:'PE', ECU:'EC',
  URY:'UY', BOL:'BO', ZAF:'ZA', NGA:'NG', ESP:'ES',
}

// ── tipos canónicos (forma que consume el UI) ──────────────────────────────
interface RiesgoItem {
  code: string         // ISO2
  iso3?: string
  name: string
  risk: number         // 0-100
  status?: string
  delta_7d?: number
  n_articles_30d?: number
  avg_sentiment?: number
  has_data?: boolean
  interes_espana?: number
  categoria?: string
  lat?: number
  lon?: number
}
interface EventItem {
  date: string | null; country: string; type: string
  title: string; description: string; source?: string | null
  impact: number; spain_impact?: string | null; url?: string | null
}
interface KpiData {
  articulos_internacionales_7d?: number
  alertas_activas?: number
  paises_monitorizados?: number
  conflictos_activos?: number
  impacto_espana_alto_7d?: number
  presencia_activa?: number
  osint_24h?: number
  alertas_count?: { CRITICO: number; ALTO: number; MEDIO: number; BAJO?: number }
  total_articulos?: number
  derived_from_feeds?: boolean
  updated_at?: string
}
interface AlertaItem {
  id: string; titulo: string; nivel: string; fecha: string
  paises: string[]; descripcion_corta: string; fuente: string
}
interface OsintItem {
  id: string; titulo: string; fuente: string; fecha: string
  urgencia: number; categoria: string; resumen: string
  relevancia_espana?: number
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

// ── normalización backend actual → shape canónica ─────────────────────────
type RawRiesgo = {
  pais?: string; nombre?: string; name?: string
  iso?: string; iso3?: string; code?: string
  score?: number; risk?: number
  interes_espana?: number
  lat?: number; lon?: number
  categoria?: string; status?: string
  delta_7d?: number; n_articles_30d?: number; avg_sentiment?: number; has_data?: boolean
}
function normalizeRiesgo(items: RawRiesgo[]): RiesgoItem[] {
  return items.map(r => {
    const iso3 = r.iso3 || (r.iso && r.iso.length === 3 ? r.iso : undefined)
    const iso2 = (r.iso && r.iso.length === 2 ? r.iso : undefined)
                 || (iso3 ? ISO3_TO_ISO2[iso3] : undefined)
                 || r.code
                 || ''
    const risk = typeof r.risk === 'number'
      ? r.risk
      : typeof r.score === 'number'
        ? Math.round(r.score * 10)
        : 0
    return {
      code: iso2,
      iso3,
      name: r.name || r.nombre || r.pais || iso2,
      risk,
      status: r.status || r.categoria,
      delta_7d: r.delta_7d,
      n_articles_30d: r.n_articles_30d,
      avg_sentiment: r.avg_sentiment,
      has_data: r.has_data ?? (typeof r.n_articles_30d === 'number' && r.n_articles_30d > 0),
      interes_espana: r.interes_espana,
      categoria: r.categoria,
      lat: r.lat,
      lon: r.lon,
    }
  }).sort((a, b) => b.risk - a.risk)
}

// ── Tab bar ────────────────────────────────────────────────────────────────
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

// ── KPI Strip (6 tarjetas) ─────────────────────────────────────────────────
function KpiStrip({ kpis, alertasCount, riesgoCount, presenciaCount }: {
  kpis: KpiData | null
  alertasCount: number
  riesgoCount: number
  presenciaCount: number
}) {
  const conflictosActivos = kpis?.conflictos_activos
    ?? kpis?.alertas_count?.CRITICO
    ?? '—'
  const impactoAlto = kpis?.impacto_espana_alto_7d
    ?? ((kpis?.alertas_count?.CRITICO ?? 0) + (kpis?.alertas_count?.ALTO ?? 0) || '—')
  const items = [
    { label: 'Noticias int. 7d',     value: kpis?.articulos_internacionales_7d ?? kpis?.total_articulos ?? '—', accent: '#0ea5e9' },
    { label: 'Alertas activas',      value: kpis?.alertas_activas ?? alertasCount ?? '—', accent: '#dc2626' },
    { label: 'Países monitorizados', value: kpis?.paises_monitorizados ?? riesgoCount ?? '—', accent: '#6366f1' },
    { label: 'Conflictos activos',   value: conflictosActivos, accent: '#f59e0b' },
    { label: 'Impacto alto 7d',      value: impactoAlto, accent: '#ef4444' },
    { label: 'Presencia exterior',   value: kpis?.presencia_activa ?? presenciaCount ?? '—', accent: '#22c55e' },
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

// ── Mapa con burbujas de riesgo (GeoJSON real + d3-geo) ────────────────────
function WorldMap({ riesgo, onCountry }: { riesgo: RiesgoItem[]; onCountry: (code: string, name: string) => void }) {
  return (
    <div style={{ ...CARD, overflow: 'hidden', position: 'relative' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Mapa de riesgo global</span>
        <span style={{ marginLeft: 12, fontSize: 11, color: INK3 }}>Intensidad desde noticias_prensa últimos 30 días · {riesgo.length} países</span>
      </div>
      <WorldGeoMap riesgo={riesgo} highlightISO="ES" onCountryClick={onCountry} />
      <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {[['#dc2626','CRITICO ≥70'],['#f59e0b','ELEVADO 50-69'],['#3b82f6','MODERADO 30-49'],['#86efac','BAJO <30']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c as string }} />
            <span style={{ fontSize: 10, color: INK3 }}>{l}</span>
          </div>
        ))}
        <span style={{ fontSize: 10, color: INK4, marginLeft: 'auto' }}>Coloración → riesgo · Burbuja → cobertura · Click en país para ficha DAFO</span>
      </div>
    </div>
  )
}

// ── Tabla riesgo país ──────────────────────────────────────────────────────
function RiesgoTable({ riesgo, onCountry }: { riesgo: RiesgoItem[]; onCountry: (code: string, name: string) => void }) {
  return (
    <div style={{ ...CARD, ...CARD_INNER }}>
      <div style={{ fontSize: 10, color: INK4, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Índice de riesgo por país</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {riesgo.map((item, i) => {
          const dafo = COUNTRY_DAFO[item.name]
          return (
            <button
              key={`${item.code}-${i}`}
              onClick={() => onCountry(item.code, item.name)}
              style={{
                all: 'unset',
                display: 'grid', gridTemplateColumns: '24px 1fr 80px 60px 60px',
                gap: 8, alignItems: 'center',
                padding: '9px 0',
                borderBottom: i < riesgo.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 10, color: INK4, fontWeight: 600 }}>{i + 1}</span>
              <div>
                <span style={{ fontWeight: 600, fontSize: 12, color: INK1 }}>{item.name}</span>
                {dafo && <span style={{ marginLeft: 6, fontSize: 9, color: '#0ea5e9', fontWeight: 700 }}>DAFO</span>}
                {!item.has_data && <span style={{ marginLeft: 6, fontSize: 9, color: INK4 }}>est.</span>}
              </div>
              <div style={{ position: 'relative', height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${item.risk}%`, background: riskColor(item.risk), borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: riskColor(item.risk), textAlign: 'right' }}>{item.risk}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: riskColor(item.risk), textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'right' }}>
                {riskLabel(item.risk)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── DAFO Drawer (mejora) ───────────────────────────────────────────────────
function DafoDrawer({ country, riesgo, onClose }: {
  country: { code: string; name: string } | null
  riesgo: RiesgoItem[]
  onClose: () => void
}) {
  if (!country) return null
  // Resolve nombre legible (Spanish) buscando el item de riesgo por código primero,
  // ya que el mapa puede devolver nombre inglés ("Morocco") pero DAFO se indexa
  // por nombre español ("Marruecos").
  const item = riesgo.find(r => r.code === country.code) || riesgo.find(r => r.name === country.name)
  const displayName = item?.name || country.name
  const dafo: CountryDafo | undefined = COUNTRY_DAFO[displayName] || COUNTRY_DAFO[country.name]

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', zIndex: 80 }}
      />
      <aside style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(560px, 92vw)', zIndex: 81,
        background: 'white', boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <header style={{ padding: '18px 22px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <span style={{ fontSize: 9, color: INK4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Ficha país · DAFO</span>
            <h2 style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0', color: INK1 }}>
              {displayName}
            </h2>
            {item && (
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor(item.risk) }} />
                  <span style={{ fontSize: 11, color: INK3 }}>Riesgo {item.risk} · {riskLabel(item.risk)}</span>
                </div>
                {typeof item.interes_espana === 'number' && (
                  <span style={{ fontSize: 11, color: INK3 }}>Interés España {item.interes_espana.toFixed(1)}/10</span>
                )}
                {item.categoria && (
                  <span style={{ fontSize: 9, background: 'rgba(14,165,233,0.1)', borderRadius: 4, padding: '2px 6px', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase' }}>
                    {item.categoria}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 22, color: INK4, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </header>

        <div style={{ overflowY: 'auto', padding: '18px 22px 28px', flex: 1 }}>
          {dafo ? (
            <>
              <p style={{ fontSize: 13, color: INK1, lineHeight: 1.55, margin: '0 0 18px', background: 'rgba(14,165,233,0.06)', borderLeft: '3px solid #0ea5e9', padding: '10px 14px', borderRadius: 6 }}>
                {dafo.resumen}
              </p>
              <DafoBlock title="Debilidades" subtitle="Internas (España)" color="#dc2626" items={dafo.debilidades} />
              <DafoBlock title="Amenazas" subtitle="Externas (del país)" color="#f59e0b" items={dafo.amenazas} />
              <DafoBlock title="Fortalezas" subtitle="Internas (España aporta)" color="#22c55e" items={dafo.fortalezas} />
              <DafoBlock title="Oportunidades" subtitle="Externas (a aprovechar)" color="#3b82f6" items={dafo.oportunidades} />
            </>
          ) : (
            <div style={{ fontSize: 13, color: INK3, lineHeight: 1.55, textAlign: 'center', padding: '40px 20px' }}>
              No hay análisis DAFO curado para <strong>{displayName}</strong> aún.
              <br /><br />
              <span style={{ fontSize: 11, color: INK4 }}>Países con DAFO disponible: {Object.keys(COUNTRY_DAFO).length}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function DafoBlock({ title, subtitle, color, items }: { title: string; subtitle: string; color: string; items: string[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.09em' }}>{title}</span>
        <span style={{ fontSize: 10, color: INK4 }}>{subtitle}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 12.5, color: INK1, lineHeight: 1.5, paddingLeft: 14, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, top: 8, width: 6, height: 6, borderRadius: '50%', background: color }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Events Feed ────────────────────────────────────────────────────────────
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
            <div style={{ flexShrink: 0, marginTop: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: impactColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK1, lineHeight: 1.4, marginBottom: 4 }}>
                {ev.url ? (
                  <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ color: INK1, textDecoration: 'none' }}>{ev.title}</a>
                ) : ev.title}
              </div>
              {ev.description && ev.description !== ev.title && (
                <div style={{ fontSize: 11.5, color: INK3, lineHeight: 1.5, marginBottom: 6 }}>{ev.description.slice(0, 180)}{ev.description.length > 180 ? '…' : ''}</div>
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

// ── Alertas Panel ──────────────────────────────────────────────────────────
function AlertasPanel({ alertas, loading }: { alertas: AlertaItem[]; loading: boolean }) {
  const [filter, setFilter] = useState<string | null>(null)
  const filtered = filter ? alertas.filter(a => a.nivel === filter) : alertas
  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando alertas…</div>
  const counts = {
    CRITICO: alertas.filter(a => a.nivel === 'CRITICO').length,
    ALTO:    alertas.filter(a => a.nivel === 'ALTO').length,
    MEDIO:   alertas.filter(a => a.nivel === 'MEDIO').length,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[null, 'CRITICO', 'ALTO', 'MEDIO'].map(nivel => (
          <button key={nivel ?? 'all'} onClick={() => setFilter(nivel)} style={{
            border: '1px solid', borderColor: nivel ? nivelColor(nivel) : 'rgba(0,0,0,0.15)',
            background: filter === nivel ? (nivel ? nivelColor(nivel) : '#f1f5f9') : 'white',
            color: filter === nivel && nivel ? 'white' : nivel ? nivelColor(nivel) : INK3,
            borderRadius: 8, padding: '5px 12px', fontSize: 10, fontWeight: 700,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em',
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
      {filtered.map(a => (
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
            {a.paises?.map(p => (
              <span key={p} style={{ fontSize: 10, background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 7px', color: INK3, fontWeight: 600 }}>{p}</span>
            ))}
            {a.fuente && <span style={{ fontSize: 10, color: INK4 }}>{a.fuente}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Presencia Exterior ─────────────────────────────────────────────────────
function PresenciaExterior({ presencia, kpis, loading }: { presencia: PresenciaItem[]; kpis: PresenciaKpis | null; loading: boolean }) {
  const CAT_COLORS: Record<string, string> = {
    militar: '#dc2626', energetica: '#f59e0b', empresarial: '#3b82f6',
    diplomatica: '#6366f1', diaspora: '#22c55e',
  }
  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando presencia…</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {presencia.map(p => (
          <div key={p.id} style={{ ...CARD, padding: '16px 20px', borderTop: `3px solid ${CAT_COLORS[p.categoria] ?? '#6366f1'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: CAT_COLORS[p.categoria] ?? '#6366f1', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{p.categoria}</span>
              <span style={{ fontSize: 10, color: INK4 }}>{p.n_articulos_30d} art.</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK1, marginBottom: 4 }}>{p.pais}</div>
            <div style={{ fontSize: 11.5, color: INK3, marginBottom: 10, lineHeight: 1.4 }}>{p.titulo}</div>
            <div style={{ fontSize: 10, color: INK4, lineHeight: 1.5 }}>{p.descripcion}</div>
            <div style={{ marginTop: 10, position: 'relative', height: 3, background: 'rgba(0,0,0,0.07)', borderRadius: 2 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${p.score_relevancia * 100}%`, background: CAT_COLORS[p.categoria] ?? '#6366f1', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── OSINT Feed ─────────────────────────────────────────────────────────────
function OsintFeed({ osint, loading }: { osint: OsintItem[]; loading: boolean }) {
  const [filter, setFilter] = useState<string | null>(null)
  const categorias = useMemo(() => {
    const seen = new Set<string>()
    osint.forEach(o => { if (o.categoria && o.categoria !== 'Internacional') seen.add(o.categoria) })
    return Array.from(seen).sort()
  }, [osint])
  const filtered = filter ? osint.filter(o => o.categoria === filter) : osint
  if (loading) return <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Cargando OSINT…</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter(null)} style={{ border: `1px solid ${filter === null ? '#1F4E8C' : 'rgba(0,0,0,0.15)'}`, background: filter === null ? '#1F4E8C' : 'white', color: filter === null ? 'white' : INK3, borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
          Todos ({osint.length})
        </button>
        {categorias.slice(0, 12).map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ border: `1px solid ${filter === c ? '#1F4E8C' : 'rgba(0,0,0,0.12)'}`, background: filter === c ? '#1F4E8C' : 'white', color: filter === c ? 'white' : INK3, borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
            {c}
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div style={{ ...CARD, ...CARD_INNER, color: INK3, fontSize: 13 }}>Sin señales OSINT{filter ? ` para ${filter}` : ''}.</div>
      )}
      {filtered.slice(0, 40).map(item => (
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

// ── Main page ──────────────────────────────────────────────────────────────
export default function GeopoliticaPage() {
  const [tab, setTab] = useState(0)
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null)

  const { data: kpisRaw }                       = useApi<KpiData>('/api/geopolitica/stats',   { refreshInterval: 120_000 })
  const { data: riesgoRaw }                     = useApi<RawRiesgo[] | { data: RawRiesgo[] }>('/api/geopolitica/riesgo', { refreshInterval: 180_000 })
  const { data: eventsRaw, loading: eventsLoading } = useApi<{ data: EventItem[] }>('/api/geopolitica/events',  { refreshInterval: 60_000 })
  const { data: alertasRaw, loading: alertasLoad }  = useApi<{ data: AlertaItem[] }>('/api/geopolitica/alertas', { refreshInterval: 60_000 })
  const { data: osintRaw, loading: osintLoading }   = useApi<{ data: OsintItem[] }>('/api/geopolitica/osint',   { refreshInterval: 90_000 })
  const { data: presenciaRaw, loading: presLoad }   = useApi<{ data: PresenciaItem[]; kpis: PresenciaKpis }>('/api/geopolitica/presencia', { refreshInterval: 300_000 })

  const kpis = (kpisRaw && typeof kpisRaw === 'object') ? (kpisRaw as KpiData) : null
  const riesgoArr: RawRiesgo[] = Array.isArray(riesgoRaw)
    ? riesgoRaw
    : (riesgoRaw && 'data' in riesgoRaw && Array.isArray(riesgoRaw.data) ? riesgoRaw.data : [])
  const riesgo = useMemo(() => normalizeRiesgo(riesgoArr), [riesgoArr])
  const events   = eventsRaw?.data ?? []
  const alertas  = alertasRaw?.data ?? []
  const osint    = osintRaw?.data ?? []
  const presencia = presenciaRaw?.data ?? []
  const presenciaKpis = presenciaRaw?.kpis ?? null

  const today = new Date().toLocaleDateString('es-ES')

  return (
    <div style={{ background: 'var(--bg, #f9fafb)', minHeight: '100vh', fontFamily: 'var(--font-body, -apple-system, system-ui, sans-serif)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>

        <header style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Inteligencia · Geopolítica
          </span>
          <h1 style={{ fontFamily: 'var(--font-display, inherit)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 4px', color: '#1d1d1f' }}>
            Monitor Geopolítico
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Riesgo país · Eventos internacionales · Presencia exterior española.
            Datos en tiempo real desde <strong>noticias_prensa</strong> (hoy: {today}).
          </p>
        </header>

        <KpiStrip
          kpis={kpis}
          alertasCount={alertas.length}
          riesgoCount={riesgo.length}
          presenciaCount={presencia.length}
        />

        <TabBar
          items={['MAPA DE RIESGO', 'EVENTOS', 'ALERTAS', 'SEÑALES OSINT', 'PRESENCIA EXTERIOR']}
          active={tab}
          onChange={setTab}
        />

        {tab === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
            <WorldMap riesgo={riesgo} onCountry={(c, n) => setSelected({ code: c, name: n })} />
            <RiesgoTable riesgo={riesgo.slice(0, 15)} onCountry={(c, n) => setSelected({ code: c, name: n })} />
          </div>
        )}

        {tab === 1 && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              {events.length} eventos internacionales recientes · ordenados por fecha
            </div>
            <EventsFeed events={events} loading={eventsLoading} />
          </div>
        )}

        {tab === 2 && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              Alertas basadas en negatividad de cobertura noticiosa (sentimiento &lt; -0.1)
            </div>
            <AlertasPanel alertas={alertas} loading={alertasLoad} />
          </div>
        )}

        {tab === 3 && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: INK3 }}>
              {osint.length} señales OSINT · noticias_prensa con keywords geopolíticos · últimos 7 días
            </div>
            <OsintFeed osint={osint} loading={osintLoading} />
          </div>
        )}

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

      <DafoDrawer country={selected} riesgo={riesgo} onClose={() => setSelected(null)} />
    </div>
  )
}
