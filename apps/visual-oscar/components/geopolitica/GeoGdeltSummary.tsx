'use client'
/**
 * `<GeoGdeltSummary />` · Sprint G11.
 *
 * Aprovecha el endpoint `/api/gdelt/summary` (GDELT Summary API · 1 call
 * devuelve todo) para mostrar exploración completa por query:
 *   - n_articles + timeline volume últimos 30d
 *   - tone promedio + evolución temporal
 *   - top images (visual content más compartido)
 *   - top domains (medios que más cubren)
 *   - GKG · personas, organizaciones, locations, themes, keywords detectados
 *
 * Replaces el patrón de hacer 4 calls separados (articles + timeline + tone +
 * sources) por 1 call rico al endpoint Summary. Selector de query libre +
 * timespan para que el analista explore en vivo.
 */
import { useEffect, useState } from 'react'

interface Article {
  title: string
  url: string
  domain: string
  language: string
  sourcecountry: string
  seendate: string
}

interface GkgEntity {
  name: string
  count: number
}

interface Resp {
  ok: boolean
  query?: string
  timespan?: string
  summary?: {
    n_articles: number
    articles: Article[]
    timeline_volume: Array<{ date: string; value: number }>
    timeline_tone: Array<{ date: string; value: number }>
    avg_tone: number | null
    top_images: Array<{ url: string; count: number }>
    top_shared_images: Array<{ url: string; count: number }>
    top_domains: Array<{ name: string; count: number }>
    top_sharers: Array<{ name: string; count: number }>
    top_persons: GkgEntity[]
    top_organizations: GkgEntity[]
    top_locations: GkgEntity[]
    top_themes: GkgEntity[]
    top_keywords: GkgEntity[]
  }
  methodology?: string
  error?: string
}

const TIMESPAN_OPTIONS = [
  { v: '24h',  l: '24 horas' },
  { v: '3d',   l: '3 días' },
  { v: '7d',   l: '7 días' },
  { v: '14d',  l: '2 semanas' },
  { v: '1mon', l: '1 mes' },
]

const QUERY_PRESETS = [
  { v: 'Ukraine',                    l: 'Ucrania' },
  { v: 'Gaza OR Palestine',          l: 'Gaza · Palestina' },
  { v: 'Sudan',                      l: 'Sudán' },
  { v: 'Sahel OR Mali OR Niger',     l: 'Sahel' },
  { v: 'China AND Taiwan',           l: 'China · Taiwán' },
  { v: 'Iran',                       l: 'Irán' },
  { v: 'NATO',                       l: 'OTAN' },
  { v: 'European Union',             l: 'Unión Europea' },
  { v: 'Spain',                      l: 'España' },
  { v: 'Morocco',                    l: 'Marruecos' },
]

export function GeoGdeltSummary({ defaultQuery = 'Ukraine', defaultTimespan = '7d' }: { defaultQuery?: string; defaultTimespan?: string }) {
  const [query, setQuery] = useState(defaultQuery)
  const [timespan, setTimespan] = useState(defaultTimespan)
  const [queryInput, setQueryInput] = useState(defaultQuery)
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'entities' | 'media' | 'articles'>('entities')

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/gdelt/summary?query=${encodeURIComponent(query)}&timespan=${timespan}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [query, timespan])

  const s = data?.summary
  const toneColor = s?.avg_tone !== null && s?.avg_tone !== undefined
    ? (s.avg_tone <= -3 ? '#dc2626' : s.avg_tone <= -1 ? '#f97316' : s.avg_tone >= 3 ? '#16a34a' : s.avg_tone >= 1 ? '#84cc16' : '#94a3b8')
    : '#94a3b8'

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderLeft: '4px solid #0f766e',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0f766e', textTransform: 'uppercase' }}>
              ◆ GDELT Summary · Exploración global por tema
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
              1 call al Summary API devuelve articleList + timeline + tone + top images +
              GKG entities (personas, orgs, locations, themes). NLP propia de GDELT sobre
              cobertura global 65+ idiomas.
            </p>
          </div>
        </div>

        {/* Selector de query · presets + custom + timespan */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={query}
            onChange={(e) => { setQuery(e.target.value); setQueryInput(e.target.value) }}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              fontSize: 11,
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#0f172a',
            }}
          >
            {QUERY_PRESETS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <form onSubmit={(e) => { e.preventDefault(); setQuery(queryInput) }} style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="o query libre..."
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                fontSize: 11,
                padding: '4px 8px',
                width: 180,
                color: '#0f172a',
              }}
            />
            <button type="submit" style={{
              background: '#0f766e',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 10px',
              cursor: 'pointer',
              letterSpacing: 0.4,
            }}>BUSCAR</button>
          </form>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>·</span>
          <select
            value={timespan}
            onChange={(e) => setTimespan(e.target.value)}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              fontSize: 11,
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#0f172a',
            }}
          >
            {TIMESPAN_OPTIONS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando GDELT Summary…</p>}

      {data?.ok && s && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 14 }}>
            <Kpi label="Artículos cargados" value={String(s.n_articles)} color="#0f766e" />
            <Kpi label="Tono medio (-10 a +10)" value={s.avg_tone !== null ? s.avg_tone.toFixed(2) : '—'} color={toneColor} />
            <Kpi label="Top domains" value={String(s.top_domains.length)} color="#475569" />
            <Kpi label="GKG entidades" value={String(s.top_persons.length + s.top_organizations.length + s.top_locations.length)} color="#7c3aed" />
          </div>

          {/* Mini timeline volume con SVG simple */}
          {s.timeline_volume.length > 1 && (
            <div style={{ marginBottom: 14, padding: 10, background: '#f8fafc', borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                Volumen de cobertura · últimos {s.timeline_volume.length} puntos
              </p>
              <SparkBars data={s.timeline_volume.map((p) => p.value)} color="#0f766e" />
            </div>
          )}

          {/* Tabs · entities / media / articles */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid #e5e7eb' }}>
            {(['entities', 'media', 'articles'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#0f766e' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#64748b',
                  border: 'none',
                  borderRadius: '4px 4px 0 0',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  letterSpacing: 0.4,
                }}
              >
                {tab === 'entities' ? 'GKG ENTITIES' : tab === 'media' ? 'TOP MEDIOS' : 'ARTÍCULOS'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'entities' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <EntityList title="PERSONAS" items={s.top_persons} color="#dc2626" />
              <EntityList title="ORGANIZACIONES" items={s.top_organizations} color="#1e40af" />
              <EntityList title="UBICACIONES" items={s.top_locations} color="#16a34a" />
              <EntityList title="THEMES (GKG)" items={s.top_themes} color="#7c3aed" />
              <EntityList title="KEYWORDS" items={s.top_keywords.slice(0, 20)} color="#f97316" />
            </div>
          )}

          {activeTab === 'media' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6 }}>TOP DOMAINS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 280, overflowY: 'auto' }}>
                  {s.top_domains.slice(0, 15).map((d, i) => (
                    <div key={`${d.name}-${i}`} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: 8,
                      padding: '4px 8px', background: '#f8fafc', borderRadius: 3, fontSize: 10,
                    }}>
                      <span style={{ color: '#0f172a' }}>{d.name}</span>
                      <span style={{ color: '#0f766e', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.5, marginBottom: 6 }}>TOP SHARERS (social)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 280, overflowY: 'auto' }}>
                  {s.top_sharers.slice(0, 15).map((d, i) => (
                    <div key={`${d.name}-${i}`} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: 8,
                      padding: '4px 8px', background: '#f8fafc', borderRadius: 3, fontSize: 10,
                    }}>
                      <span style={{ color: '#0f172a' }}>{d.name}</span>
                      <span style={{ color: '#7c3aed', fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'articles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
              {s.articles.map((a, i) => (
                <a key={`${a.url}-${i}`} href={a.url} target="_blank" rel="noopener noreferrer" style={{
                  padding: 8, background: '#f8fafc', borderLeft: '3px solid #0f766e', borderRadius: 3,
                  textDecoration: 'none', color: 'inherit', transition: 'background 0.15s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdfa' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a', flex: 1 }}>{a.title}</span>
                    <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>{a.seendate?.slice(0, 8)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 9, color: '#475569' }}>
                    {a.domain} · {a.sourcecountry || '?'} · {a.language || '?'}
                  </p>
                </a>
              ))}
            </div>
          )}

          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            {data.methodology}
          </p>
        </>
      )}

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#dc2626' }}>GDELT Summary no disponible · {data.error}</p>
      )}
    </section>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 8, background: '#f8fafc', borderRadius: 4, border: '1px solid #e5e7eb' }}>
      <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

function EntityList({ title, items, color }: { title: string; items: GkgEntity[]; color: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color, letterSpacing: 0.5, marginBottom: 6 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 240, overflowY: 'auto' }}>
        {items.length === 0 && <p style={{ fontSize: 10, color: '#94a3b8' }}>—</p>}
        {items.map((it, i) => (
          <div key={`${it.name}-${i}`} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 8,
            padding: '3px 6px', background: '#f8fafc', borderRadius: 3, fontSize: 10,
          }}>
            <span style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
            <span style={{ color, fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{it.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SparkBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const width = 100
  const height = 36
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {data.map((v, i) => {
        const x = (i / data.length) * width
        const w = (width / data.length) * 0.8
        const h = (v / max) * height
        const y = height - h
        return <rect key={i} x={x} y={y} width={w} height={h} fill={color} opacity={0.7} />
      })}
    </svg>
  )
}

export default GeoGdeltSummary
