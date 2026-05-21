'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/useApi'
import Skeleton, { LiveDot } from './Skeleton'
import CountUp from './CountUp'
import LiveStatusBadge from './LiveStatusBadge'

// ── Types ─────────────────────────────────────────────────────────────────────
interface NewsArticle {
  id: number
  title: string
  url: string
  source_name: string
  source_country: string
  source_region: string
  ai_summary?: string
  ai_analysis?: string
  ai_topics?: string[]
  ai_sentiment?: 'positivo' | 'negativo' | 'neutro' | 'mixto'
  ai_relevance: number
  ai_urgency?: string
  ai_spain_impact?: 'ninguno' | 'bajo' | 'medio' | 'alto' | 'critico'
  ai_geo_location?: string
  ai_category?: string
  scraped_at: string
}

interface SentimentMapPoint {
  source_country: string
  source_region: string
  lat: number
  lon: number
  volume: number
  avg_relevance: number
  pos: number
  neg: number
  neu: number
  spain_high: number
}

interface NewsStats {
  total_articles: number
  last_hour?: number
  last_24h: number
  sources_active: number
  regions_active?: number
  avg_relevance?: number
  last_scraped?: string
  catalog: { total_sources: number; by_region: Record<string, number> }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SENTIMENT_COLOR = {
  positivo: '#16A34A',
  negativo: '#DC2626',
  neutro: '#6E6E73',
  mixto: '#A855F7',
} as const

const IMPACT_COLOR = {
  critico: '#991B1B',
  alto: '#DC2626',
  medio: '#D97706',
  bajo: '#0EA5E9',
  ninguno: '#9CA3AF',
} as const

const IMPACT_BG = {
  critico: '#FEE2E2',
  alto: '#FEF3C7',
  medio: '#FFF7ED',
  bajo: '#EFF6FF',
  ninguno: '#F5F5F7',
} as const

const CATEGORY_LABEL: Record<string, string> = {
  politica_interior: 'Política interior',
  politica_exterior: 'Política exterior',
  economia: 'Economía',
  seguridad_defensa: 'Seguridad y defensa',
  justicia: 'Justicia',
  sociedad: 'Sociedad',
  tecnologia: 'Tecnología',
  medioambiente: 'Medio ambiente',
  energia: 'Energía',
  salud: 'Salud',
  otro: 'Otros',
}

function timeAgo(iso?: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'ahora'
  if (ms < 3_600_000) return `hace ${Math.floor(ms / 60_000)}m`
  if (ms < 86_400_000) return `hace ${Math.floor(ms / 3_600_000)}h`
  return `hace ${Math.floor(ms / 86_400_000)}d`
}

// ── World Map (proyección Mercator simplificada) ──────────────────────────────
function WorldSentimentMap({ points }: { points: SentimentMapPoint[] }) {
  const W = 720, H = 360
  const project = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * W
    const latRad = (lat * Math.PI) / 180
    const y = (H / 2) - (W / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + latRad / 2))
    return [x, Math.max(0, Math.min(H, y))]
  }
  return (
 <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', background: '#FAFAFB', borderRadius: 12 }}>
      {/* Subtle graticule */}
      {[-60, -30, 0, 30, 60].map(lat => (
 <line key={lat} x1={0} x2={W} y1={project(lat, 0)[1]} y2={project(lat, 0)[1]} stroke="#ECECEF" strokeWidth={0.5}/>
      ))}
      {[-120, -60, 0, 60, 120].map(lon => (
 <line key={lon} y1={0} y2={H} x1={project(0, lon)[0]} x2={project(0, lon)[0]} stroke="#ECECEF" strokeWidth={0.5}/>
      ))}
      {/* Spain highlight */}
      {(() => { const [x, y] = project(40.4, -3.7); return (
 <circle cx={x} cy={y} r={8} fill="none" stroke="#1F4E8C" strokeWidth={1.5} strokeDasharray="2 2" opacity={0.6}/>
      ) })()}
      {/* Bubbles per country */}
      {points.map((p, i) => {
        const [x, y] = project(p.lat, p.lon)
        const r = Math.min(20, Math.max(3, Math.sqrt(p.volume) * 2))
        const total = p.pos + p.neg + p.neu || 1
        const dominant = p.neg > p.pos && p.neg > p.neu ? 'neg' : p.pos > p.neu ? 'pos' : 'neu'
        const fill = dominant === 'neg' ? '#DC2626' : dominant === 'pos' ? '#16A34A' : '#6E6E73'
        return (
 <g key={i}>
 <circle cx={x} cy={y} r={r} fill={fill} fillOpacity={0.55} stroke={fill} strokeWidth={0.8}>
 <title>{`${p.source_country} · ${p.volume} arts · pos ${p.pos} / neg ${p.neg} / neu ${p.neu}${p.spain_high > 0 ? ' · ' + p.spain_high + ' impacto España alto+' : ''}`}</title>
 </circle>
            {p.spain_high > 0 && (
 <circle cx={x} cy={y} r={r + 2} fill="none" stroke="#DC2626" strokeWidth={1} strokeDasharray="2 2" opacity={0.7}/>
            )}
 </g>
        )
      })}
 </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IntelligenceFeed() {
  const [filter, setFilter] = useState<'spain' | 'global' | 'critical'>('spain')
  const [scraping, setScraping] = useState(false)

  // Stats — refresh cada 30s
  const { data: stats } = useApi<NewsStats>('/api/news/stats', { refreshInterval: 30_000 })

  // Articles según filtro — refresh cada 90s
  const articlesPath = filter === 'critical'
    ? '/api/news/spain-impact?limit=12&hours_back=72'
    : `/api/news/feed?limit=20&hours_back=48&min_relevance=${filter === 'spain' ? 5 : 3}`

  const { data: feedData, source, updatedAt, refresh } =
    useApi<{ articles: NewsArticle[] }>(articlesPath, { refreshInterval: 90_000 })

  const { data: mapData } =
    useApi<{ points: SentimentMapPoint[] }>('/api/news/sentiment-map?hours_back=72', { refreshInterval: 120_000 })

  const { data: topicsData } =
    useApi<{ topics: { topic: string; cnt: number }[] }>('/api/news/topics?hours_back=48&limit=12', { refreshInterval: 120_000 })

  const articles = feedData?.articles ?? []
  const points = mapData?.points ?? []
  const topics = topicsData?.topics ?? []

  const breakdown = useMemo(() => {
    const total = articles.length || 1
    const pos = articles.filter(a => a.ai_sentiment === 'positivo').length
    const neg = articles.filter(a => a.ai_sentiment === 'negativo').length
    const neu = articles.filter(a => a.ai_sentiment === 'neutro').length
    return {
      pos: Math.round((pos / total) * 100),
      neg: Math.round((neg / total) * 100),
      neu: Math.round((neu / total) * 100),
    }
  }, [articles])

  async function triggerScrape() {
    if (scraping) return
    setScraping(true)
    try {
      await fetch('/api/news/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region: 'local_spain', max_sources: 5, use_ollama: true }),
      })
      // dar 2 minutos al backend antes de revalidar
      setTimeout(() => { refresh() }, 30_000)
    } catch {
      // ignore
    } finally {
      setTimeout(() => setScraping(false), 3000)
    }
  }

  return (
 <section style={{ marginTop: 22 }}>
      {/* Header */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
 <div>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
 <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'}/>
            Feed de inteligencia
 </h2>
 <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {stats ? (
 <>
 <CountUp value={stats.total_articles ?? 0}/> noticias analizadas ·{' '}
 <CountUp value={stats.sources_active ?? 0}/> medios activos de {stats?.catalog?.total_sources ?? 414} en catálogo
                {stats.avg_relevance != null && <> · relevancia media <CountUp value={Number(stats.avg_relevance)} decimals={1}/></>}
 </>
            ) : 'Cargando estadísticas...'}
 </p>
 </div>
 <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={90} onRefresh={refresh}/>
 <button
            onClick={triggerScrape}
            disabled={scraping}
            style={{
              background: scraping ? '#F5F5F7' : '#1d1d1f',
              color: scraping ? '#6E6E73' : '#fff',
              border: 'none', padding: '7px 14px', borderRadius: 999,
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              cursor: scraping ? 'wait' : 'pointer', letterSpacing: '0.04em',
              transition: 'all 200ms',
            }}
          >
            {scraping ? 'Analizando…' : 'Iniciar ingesta'}
 </button>
 </div>
 </div>

      {/* Three-column grid: Map | Articles | Topics */}
 <div style={{ display: 'grid', gridTemplateColumns: '6fr 6fr', gap: 18 }}>
        {/* Left: World Map + Sentiment breakdown */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
 <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
                Mapa de sentimiento global
 </h3>
 <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>72h · {points.reduce((s, p) => s + p.volume, 0)} arts</span>
 </div>
            {points.length > 0 ? (
 <WorldSentimentMap points={points}/>
            ) : (
 <Skeleton width="100%" height={200} radius={12}/>
            )}
            {/* Sentiment legend */}
 <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 10, color: 'var(--ink-3)' }}>
 <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: '#16A34A', marginRight: 5, verticalAlign: 'middle' }}/>Positivo</span>
 <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: '#6E6E73', marginRight: 5, verticalAlign: 'middle' }}/>Neutro</span>
 <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: '#DC2626', marginRight: 5, verticalAlign: 'middle' }}/>Negativo</span>
 <span style={{ marginLeft: 'auto' }}>━ ━ Impacto España alto</span>
 </div>
 </div>

          {/* Topics + sentiment breakdown */}
 <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
              Distribución de sentimiento
 </h3>
 <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: '#F5F5F7', marginBottom: 14 }}>
 <div style={{ width: `${breakdown.pos}%`, background: '#16A34A', transition: 'width 600ms ease' }} title={`Positivo ${breakdown.pos}%`}/>
 <div style={{ width: `${breakdown.neu}%`, background: '#9CA3AF', transition: 'width 600ms ease' }} title={`Neutro ${breakdown.neu}%`}/>
 <div style={{ width: `${breakdown.neg}%`, background: '#DC2626', transition: 'width 600ms ease' }} title={`Negativo ${breakdown.neg}%`}/>
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginBottom: 14 }}>
 <span style={{ color: '#16A34A', fontWeight: 600 }}>+ <CountUp value={breakdown.pos}/>%</span>
 <span>= <CountUp value={breakdown.neu}/>%</span>
 <span style={{ color: '#DC2626', fontWeight: 600 }}>− <CountUp value={breakdown.neg}/>%</span>
 </div>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Top temas detectados (PoliteIA)
 </h3>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {topics.length > 0 ? topics.slice(0, 12).map((t, i) => {
                const intensity = Math.min(1, t.cnt / Math.max(1, topics[0].cnt))
                return (
 <span key={i} style={{
                    fontSize: 11, padding: '3px 9px', borderRadius: 999,
                    background: `rgba(31, 78, 140, ${0.06 + intensity * 0.18})`,
                    color: '#1F4E8C', border: '1px solid rgba(31,78,140,0.15)',
                    animation: 'pol-fade-in 320ms ease-out', animationDelay: `${i * 30}ms`, animationFillMode: 'backwards',
                  }}>
                    {t.topic} <span style={{ color: '#6E6E73', fontWeight: 500 }}>· {t.cnt}</span>
 </span>
                )
              }) : (
 <Skeleton width="100%" height={70} radius={6}/>
              )}
 </div>
 </div>
 </div>

        {/* Right: Articles feed */}
 <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
              Feed analizado por PoliteIA
 </h3>
            {/* Filter pills */}
 <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 2 }}>
              {([
                { k: 'spain' as const,    label: 'España' },
                { k: 'global' as const,   label: 'Global' },
                { k: 'critical' as const, label: 'Críticas' },
              ]).map(o => {
                const active = filter === o.k
                return (
 <button key={o.k} onClick={() => setFilter(o.k)} style={{
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#1d1d1f' : '#6E6E73',
                    border: 'none', borderRadius: 999, padding: '4px 11px', fontSize: 11,
                    fontWeight: active ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none', transition: 'all 160ms',
                  }}>{o.label}</button>
                )
              })}
 </div>
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 540, overflowY: 'auto', paddingRight: 4 }}>
            {articles.length > 0 ? articles.map((a, i) => {
              const sent = a.ai_sentiment ?? 'neutro'
              const impact = a.ai_spain_impact ?? 'ninguno'
              return (
 <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{
                  textDecoration: 'none', color: 'inherit',
                  padding: '10px 12px', borderRadius: 10,
                  background: IMPACT_BG[impact],
                  borderLeft: `3px solid ${IMPACT_COLOR[impact]}`,
                  display: 'block',
                  animation: 'pol-fade-in 360ms ease-out', animationDelay: `${i * 30}ms`, animationFillMode: 'backwards',
                  transition: 'transform 160ms, box-shadow 160ms',
                  cursor: 'pointer',
                }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)' }}
                   onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
                >
 <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    {/* Relevance pill */}
 <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em',
                      background: a.ai_relevance >= 8 ? '#FEE2E2' : a.ai_relevance >= 6 ? '#FEF3C7' : '#E0F2FE',
                      color: a.ai_relevance >= 8 ? '#991B1B' : a.ai_relevance >= 6 ? '#92400E' : '#075985',
                      flexShrink: 0,
                    }}>R{a.ai_relevance}</span>
                    {/* Title */}
 <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4, fontWeight: 500, flex: 1 }}>
                      {a.title}
 </div>
 </div>
                  {a.ai_summary && (
 <p style={{ margin: '4px 0 6px', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>
                      {a.ai_summary.length > 180 ? a.ai_summary.slice(0, 180) + '…' : a.ai_summary}
 </p>
                  )}
 <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--ink-4)', flexWrap: 'wrap', alignItems: 'center' }}>
 <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{a.source_name}</span>
 <span>· {a.source_country}</span>
                    {a.ai_category && <span>· {CATEGORY_LABEL[a.ai_category] || a.ai_category}</span>}
 <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* Sentiment dot */}
 <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: SENTIMENT_COLOR[sent] }}/>
 <span style={{ color: SENTIMENT_COLOR[sent], fontWeight: 600 }}>{sent}</span>
                      {impact !== 'ninguno' && impact !== 'bajo' && (
 <span style={{ background: IMPACT_COLOR[impact], color: '#fff', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}>
                          ESP {impact.toUpperCase()}
 </span>
                      )}
 <span>· {timeAgo(a.scraped_at)}</span>
 </span>
 </div>
 </a>
              )
            }) : (
 <>
                {Array.from({ length: 6 }, (_, i) => (
 <Skeleton key={i} height={70} radius={10}/>
                ))}
 <p style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', padding: '8px 0' }}>
                  Sin artículos aún. Pulsa <strong>Iniciar ingesta</strong> para iniciar la ingesta.
 </p>
 </>
            )}
 </div>
 </div>
 </div>
 </section>
  )
}
