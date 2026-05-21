'use client'
/**
 * `<NewsApiHeadlinesPanel />` · NewsAPI headlines en tiempo real.
 *
 * Para /medios-narrativa. Tabs:
 *  - Spain top: top-headlines country=es
 *  - World top: top-headlines language=en
 *  - España elecciones: everything q="España elecciones"
 *  - Política ES: everything q="política España gobierno"
 */
import { useEffect, useState } from 'react'

interface Article {
  title: string
  description: string | null
  url: string
  image: string | null
  source: string
  author: string | null
  published: string
}
interface NewsData {
  ok: boolean
  data_quality?: { source_type: string; source_name: string }
  total_results?: number
  n_items?: number
  items?: Article[]
}

type Tab = 'spain' | 'world' | 'elections' | 'politics'
const TAB_QUERIES: Record<Tab, { url: string; label: string }> = {
  spain:     { url: '/api/newsapi/top-spain?pageSize=20',                                 label: 'España' },
  world:     { url: '/api/newsapi/top-world?pageSize=20',                                 label: 'Mundo' },
  elections: { url: '/api/newsapi/everything?q=España+elecciones&language=es&pageSize=20',label: 'Elecciones ES' },
  politics:  { url: '/api/newsapi/everything?q=Sánchez+OR+Feijóo+OR+Abascal&language=es&pageSize=20', label: 'Líderes ES' },
}

const ACCENT = '#dc2626'

function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (isNaN(ms) || ms < 0) return ''
  const h = ms / 3600_000
  if (h < 1) return `hace ${Math.round(h * 60)} min`
  if (h < 24) return `hace ${Math.round(h)}h`
  return `hace ${Math.round(h / 24)}d`
}

export function NewsApiHeadlinesPanel() {
  const [tab, setTab] = useState<Tab>('spain')
  const [data, setData] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(TAB_QUERIES[tab].url, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: NewsData) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [tab])

  const isLive = data?.data_quality?.source_type === 'live'
  const items = (data?.items || []).slice(0, 20)

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: ACCENT, fontWeight: 700, margin: 0 }}>
            NEWSAPI · HEADLINES EN TIEMPO REAL
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            top-headlines + búsqueda libre · cache 30 min · {data?.total_results ?? '—'} resultados totales
          </p>
        </div>
        {isLive ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fee2e2', color: '#991b1b', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            NewsAPI no disponible
          </span>
        )}
      </header>

      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(Object.entries(TAB_QUERIES) as [Tab, { url: string; label: string }][]).map(([k, meta]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: tab === k ? ACCENT : '#e5e7eb',
              background: tab === k ? '#fef2f2' : '#fff',
              color: tab === k ? ACCENT : '#475569',
              fontWeight: tab === k ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando NewsAPI…</p>}

      {!loading && !isLive && (
        <div style={{ padding: 10, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>NewsAPI no disponible</strong> · NEWSAPI_KEY no configurada o rate-limited (free tier 100 req/día).
        </div>
      )}

      {!loading && isLive && items.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {items.map((a, i) => (
            <li
              key={i}
              style={{
                borderBottom: '1px solid #f1f5f9',
                padding: '8px 0',
                display: 'grid',
                gridTemplateColumns: a.image ? '60px 1fr' : '1fr',
                gap: 10,
              }}
            >
              {a.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={a.image}
                  alt=""
                  style={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 4, background: '#f1f5f9' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textDecoration: 'none', lineHeight: 1.3 }}
                >
                  {a.title}
                </a>
                <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>
                  <strong style={{ color: ACCENT }}>{a.source}</strong>
                  {a.author && ` · ${a.author}`}
                  {' · '}
                  {timeAgo(a.published)}
                </p>
                {a.description && (
                  <p style={{ fontSize: 11, color: '#475569', margin: '4px 0 0', lineHeight: 1.4 }}>
                    {a.description.slice(0, 200)}{a.description.length > 200 && '…'}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · NewsAPI ·{' '}
        <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          newsapi.org →
        </a>
      </p>
    </section>
  )
}

export default NewsApiHeadlinesPanel
