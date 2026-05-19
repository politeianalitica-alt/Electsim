'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import BrainBriefing from '@/components/BrainBriefing'
import CountUp from '@/components/CountUp'
import Skeleton, { LiveDot } from '@/components/Skeleton'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import type { DashboardHome } from '../api/dashboard/home/route'
import './dashboard.css'

// ── Trends types ─────────────────────────────────────────────────────────────

interface TrendItem {
  id: string; termino: string; fuente: string; rank: number
  score_norm: number; categoria: string | null; es_evento_geo: boolean
  paises_mencionados: string[]; url: string; resumen: string | null
  timestamp: string
}

// ── Static CCAA metadata ──────────────────────────────────────────────────────

type MapTab = 'electoral' | 'narrativa' | 'figuras'

const BACKEND_NAME_MAP: Record<string, string> = {
  'C. Valenciana':   'Comunidad Valenciana',
  'C-La Mancha':     'Castilla-La Mancha',
  'Castilla y León': 'Castilla y León',
  'País Vasco':      'País Vasco',
  'La Rioja':        'La Rioja',
}

const REGION_GRID: Array<Array<{ name: string; display: string; flex: number; height: number }>> = [
  [
    { name: 'Andalucía',          display: 'Andalucía',   flex: 2.0, height: 64 },
    { name: 'Cataluña',           display: 'Cataluña',    flex: 1.4, height: 64 },
    { name: 'Madrid',             display: 'Madrid',      flex: 1.4, height: 64 },
  ],
  [
    { name: 'C. Valenciana',      display: 'Valencia',    flex: 1, height: 52 },
    { name: 'Galicia',            display: 'Galicia',     flex: 1, height: 52 },
    { name: 'Castilla y León',    display: 'C. y León',   flex: 1, height: 52 },
    { name: 'País Vasco',         display: 'P. Vasco',    flex: 1, height: 52 },
    { name: 'Castilla-La Mancha', display: 'C-La Mancha', flex: 1, height: 52 },
  ],
  [
    { name: 'Canarias',    display: 'Canarias',  flex: 1, height: 44 },
    { name: 'Murcia',      display: 'Murcia',    flex: 1, height: 44 },
    { name: 'Asturias',    display: 'Asturias',  flex: 1, height: 44 },
    { name: 'Aragón',      display: 'Aragón',    flex: 1, height: 44 },
    { name: 'Baleares',    display: 'Baleares',  flex: 1, height: 44 },
    { name: 'Extremadura', display: 'Extremad.', flex: 1, height: 44 },
    { name: 'Navarra',     display: 'Navarra',   flex: 1, height: 44 },
    { name: 'La Rioja',    display: 'Rioja',     flex: 1, height: 44 },
    { name: 'Cantabria',   display: 'Cantabria', flex: 1, height: 44 },
  ],
]

const REGION_COLOR = { pp: '#2D4A8A', psoe: '#C53030', mixed: '#6e7278' } as const
const REGION_LABEL = { pp: 'PP', psoe: 'PSOE', mixed: '?' } as const

const CCAA_NARRATIVA: Record<string, { tema: string; color: string }> = {
  'Andalucía':          { tema: 'Economía',       color: '#2d8a39' },
  'Cataluña':           { tema: 'Identidad',      color: '#D97706' },
  'Madrid':             { tema: 'Gestión',         color: '#1F4E8C' },
  'C. Valenciana':      { tema: 'Infraestructura', color: '#0E7490' },
  'Galicia':            { tema: 'Demografía',      color: '#7C3AED' },
  'Castilla y León':    { tema: 'Despoblación',    color: '#b25000' },
  'País Vasco':         { tema: 'Concierto Fiscal',color: '#0F766E' },
  'Castilla-La Mancha': { tema: 'Agua',            color: '#0070D1' },
  'Canarias':           { tema: 'Migración',       color: '#C01818' },
  'Murcia':             { tema: 'Agua',            color: '#0070D1' },
  'Asturias':           { tema: 'Industria',       color: '#525258' },
  'Aragón':             { tema: 'Energía',         color: '#D97706' },
  'Baleares':           { tema: 'Turismo',         color: '#0E7490' },
  'Extremadura':        { tema: 'Empleo',          color: '#2d8a39' },
  'Navarra':            { tema: 'Fiscal',          color: '#0F766E' },
  'La Rioja':           { tema: 'Agricultura',     color: '#2d8a39' },
  'Cantabria':          { tema: 'Industria',       color: '#525258' },
}

const CCAA_FIGURA: Record<string, { name: string; partido: string; trend: string; dir: 'up' | 'down' | 'flat' }> = {
  'Andalucía':          { name: 'Moreno Bonilla',  partido: 'PP',   trend: '+1.2', dir: 'up'   },
  'Cataluña':           { name: 'S. Illa',          partido: 'PSC',  trend: '+2.1', dir: 'up'   },
  'Madrid':             { name: 'I. D. Ayuso',      partido: 'PP',   trend: '-0.4', dir: 'down' },
  'C. Valenciana':      { name: 'C. Mazón',         partido: 'PP',   trend: '-1.8', dir: 'down' },
  'Galicia':            { name: 'A. Rueda',         partido: 'PP',   trend: '+0.5', dir: 'up'   },
  'Castilla y León':    { name: 'A. Mañueco',       partido: 'PP',   trend: '0.0',  dir: 'flat' },
  'País Vasco':         { name: 'I. Pradales',      partido: 'PNV',  trend: '+0.8', dir: 'up'   },
  'Castilla-La Mancha': { name: 'E. García-Page',   partido: 'PSOE', trend: '+0.3', dir: 'up'   },
  'Canarias':           { name: 'F. Clavijo',       partido: 'CC',   trend: '-0.6', dir: 'down' },
  'Murcia':             { name: 'F. López Miras',   partido: 'PP',   trend: '+0.2', dir: 'up'   },
  'Asturias':           { name: 'A. Barbón',        partido: 'PSOE', trend: '+1.0', dir: 'up'   },
  'Aragón':             { name: 'J. L. Lambán',     partido: 'PP',   trend: '-0.3', dir: 'down' },
  'Baleares':           { name: 'M. Prohens',       partido: 'PP',   trend: '+0.7', dir: 'up'   },
  'Extremadura':        { name: 'M. G. Vara',       partido: 'PP',   trend: '0.0',  dir: 'flat' },
  'Navarra':            { name: 'M. I. Garrido',    partido: 'UPN',  trend: '+0.4', dir: 'up'   },
  'La Rioja':           { name: 'G. Gonzalo',       partido: 'PP',   trend: '+0.6', dir: 'up'   },
  'Cantabria':          { name: 'M. Á. Revilla',    partido: 'PRC',  trend: '-0.2', dir: 'down' },
}

const TRENDING_FIGURES = [
  { name: 'P. Sánchez',  party: 'PSOE',  trend: '+2.1', dir: 'up'   as const, color: '#C53030' },
  { name: 'A. Feijóo',   party: 'PP',    trend: '-0.8', dir: 'down' as const, color: '#2D4A8A' },
  { name: 'Y. Díaz',     party: 'SUMAR', trend: '+1.3', dir: 'up'   as const, color: '#BF3F7E' },
  { name: 'S. Abascal',  party: 'VOX',   trend: '-1.5', dir: 'down' as const, color: '#63BE21' },
]

// ── Module grid (single unified section) ──────────────────────────────────────

const MODULES = [
  { href: '/coaliciones',         label: 'Hub electoral',         sub: '8 tabs · Adversario · Voto blando',    accent: '#5B21B6', tag: 'NUEVO'     },
  { href: '/mapa-actores',        label: 'Mapa de actores',       sub: 'Grafo · Dossier · Cuadrante ideológico', accent: '#1F4E8C', tag: 'EXPANDIDO' },
  { href: '/riesgo',              label: 'Risk Index',             sub: 'Señales · simulador · escenarios',     accent: '#c42c2c', tag: 'EXPANDIDO' },
  { href: '/medios-narrativa',    label: 'Medios y narrativa',     sub: '487 fuentes · ciclo de vida narrativo',accent: '#b25000', tag: 'EXPANDIDO' },
  { href: '/monitor-legislativo', label: 'Monitor legislativo',   sub: 'BOE · Congreso · Senado · timeline',   accent: '#0F766E', tag: 'NUEVO'     },
  { href: '/briefing',            label: 'Briefing diario',        sub: 'PDF · archivo histórico · digest',     accent: '#2d8a39', tag: 'EXPANDIDO' },
  { href: '/geopolitica',         label: 'Geopolítica',            sub: 'Live ticker · OSINT · presencia España',accent: '#0E7490', tag: 'NUEVO'    },
  { href: '/workspaces',          label: 'Workspaces',             sub: 'KPIs · briefings archivados',          accent: '#7C3AED', tag: 'NUEVO'     },
  { href: '/nowcasting',          label: 'Intención de voto',      sub: 'Encuestas · nowcast · partidos',       accent: '#0070D1', tag: ''          },
  { href: '/escenarios',          label: 'Mayorías y coaliciones', sub: "Escenarios de mayoría · D'Hondt",      accent: '#8B5CF6', tag: ''          },
  { href: '/macro',               label: 'Indicadores macro',      sub: 'PIB · deuda · mercados en tiempo real',accent: '#16A34A', tag: ''          },
  { href: '/alertas',             label: 'Alertas activas',        sub: 'Señales críticas · detección escaladas',accent: '#D97706', tag: ''         },
]

/** Converts whatever the backend sends in news_pulse.parties to a display string.
 *  Backend can return a string "PP, PSOE", an array of strings ["PP","PSOE"],
 *  or an array of objects [{partido:'PP',pct:0.5},...] — all are safe here. */
function sanitizeParties(raw: unknown): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return raw.map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        return String(o.partido ?? o.siglas ?? o.nombre ?? o.id ?? '')
      }
      return String(item)
    }).filter(Boolean).join(', ')
  }
  return ''
}

export default function DashboardPage() {
  const router = useRouter()
  const [mapTab, setMapTab] = useState<MapTab>('electoral')

  const { data, source, updatedAt, loading, refresh } = useApi<DashboardHome>(
    '/api/dashboard/home',
    { refreshInterval: 60_000 }
  )

  const { data: trendsRaw, loading: trendsLoading } = useApi<{ items?: TrendItem[]; source?: string; timestamp?: string } | TrendItem[]>(
    '/api/trends',
    { refreshInterval: 120_000 }
  )

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const isReady = !!data && Array.isArray(data.parties) && data.parties.length > 0

  return (
    <div className="dash-root">
      <AppHeader/>

      <main className="dash-main">

        {/* Morning briefing */}
        <BrainBriefing/>

        {/* ═══════════════ PANEL EJECUTIVO ═══════════════
           Bloque destacado · KPIs principales + risk + macro + alertas.
           Layout interno:
             [ Risk Hero (1.2fr) | KPIs 2x2 (1fr × 2) ]
             [ Macro strip (4 cols con sparklines) ]
             [ Alertas críticas (chips inline) ]
        */}
        <section className="dash-panel">
          {/* Section header */}
          <div className="dash-panel-head">
            <div className="dash-panel-head-left">
              <h2 className="dash-panel-title">
                <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'} />
                Panel ejecutivo
              </h2>
              <span className="dash-panel-eyebrow">
                Estado del sistema · vista consolidada
              </span>
            </div>
            <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60} onRefresh={refresh}/>
          </div>

          {/* Row 1: Risk hero (left) + KPIs grid 2x2 (right) */}
          <div className="dash-row1">

            {/* Risk hero card */}
            {(() => {
              const risk = data?.risk
              const score = risk?.score ?? 0
              const semaforo = (risk?.semaforo ?? 'verde').toLowerCase()
              const semColor = semaforo === 'rojo' ? '#DC2626' : semaforo === 'ambar' || semaforo === 'amarillo' ? '#D97706' : '#16A34A'
              const semLabel = semaforo === 'rojo' ? 'Rojo' : semaforo === 'ambar' || semaforo === 'amarillo' ? 'Ámbar' : 'Verde'
              return (
                <div className="dash-risk-hero" onClick={() => router.push('/riesgo')}
                  style={{ borderLeft: `4px solid ${semColor}` }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div>
                    <p className="dash-risk-label">
                      Risk Index
                    </p>
                    <div className="dash-risk-value-row">
                      <span className="dash-risk-value" style={{ color: semColor }}>
                        {isReady ? <CountUp value={score}/> : <Skeleton width={70} height={40} radius={6}/>}
                      </span>
                      <span className="dash-risk-scale">/100</span>
                    </div>
                  </div>
                  <div>
                    <div className="dash-risk-pill" style={{ background: `${semColor}14`, border: `1px solid ${semColor}33` }}>
                      <span className="dash-risk-pill-dot" style={{ background: semColor }}/>
                      <span className="dash-risk-pill-label" style={{ color: semColor }}>{semLabel}</span>
                    </div>
                    <p className="dash-risk-foot">
                      Tensión política y económica · click para detalle
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* KPIs grid 2x2 */}
            <div className="dash-kpi-grid">
              {(data?.kpis ?? []).slice(0, 4).map(k => {
                const numeric = typeof k.value === 'number' ? k.value : Number(String(k.value).replace(/[^0-9.-]/g, ''))
                const suffix = typeof k.value === 'string' && k.value.includes('%') ? '%' : ''
                return (
                  <div key={k.label} className="dash-kpi-card" style={{ borderLeft: `3px solid ${k.accent}` }}>
                    <p className="dash-kpi-label">{k.label}</p>
                    <div className="dash-kpi-value" style={{ color: k.accent }}>
                      {isReady && !Number.isNaN(numeric)
                        ? <><CountUp value={numeric}/>{suffix}</>
                        : <Skeleton width={50} height={26} radius={4}/>
                      }
                    </div>
                    <p className="dash-kpi-sub">{k.sub}</p>
                  </div>
                )
              })}
              {!data?.kpis && !isReady && [0,1,2,3].map(i => (
                <div key={i} className="dash-kpi-skel">
                  <Skeleton width={70} height={9} radius={3} style={{ marginBottom: 8 }}/>
                  <Skeleton width={70} height={26} radius={4}/>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Macro strip (4 cols con sparklines) */}
          {data?.macro && data.macro.length > 0 && (
            <div className="dash-macro-strip" style={{ gridTemplateColumns: `repeat(${Math.min(4, data.macro.length)}, 1fr)` }}>
              {data.macro.slice(0, 4).map(m => {
                const goodIsUp = m.good === 'up'
                const isPositiveDir = m.dir === 'up'
                const isGood = goodIsUp ? isPositiveDir : !isPositiveDir
                const trendColor = isGood ? '#16A34A' : '#DC2626'
                const data_arr = Array.isArray(m.data) && m.data.length > 1 ? m.data : []
                const min = data_arr.length ? Math.min(...data_arr) : 0
                const max = data_arr.length ? Math.max(...data_arr) : 1
                const range = max - min || 1
                const w = 80, h = 22
                const points = data_arr.map((v, i) => {
                  const x = (i / (data_arr.length - 1)) * w
                  const y = h - ((v - min) / range) * h
                  return `${x},${y}`
                }).join(' ')
                return (
                  <div key={m.label} className="dash-macro-card" onClick={() => router.push('/macro')}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#D6D6DA' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#ECECEF' }}
                  >
                    <div className="dash-macro-mid">
                      <p className="dash-macro-label">{m.label}</p>
                      <div className="dash-macro-value-row">
                        <span className="dash-macro-value">{m.value}</span>
                        <span className="dash-macro-delta" style={{ color: trendColor }}>
                          {isPositiveDir ? '↑' : '↓'} {m.delta}
                        </span>
                      </div>
                    </div>
                    {data_arr.length > 1 && (
                      <svg className="dash-macro-spark" width={w} height={h}>
                        <polyline points={points} fill="none" stroke={trendColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Row 3: Alertas críticas (chips inline) */}
          {data?.alerts && data.alerts.length > 0 && (
            <div className="dash-alerts-strip">
              <span className="dash-alerts-label">
                Alertas
              </span>
              <div className="dash-alerts-row">
                {data.alerts.slice(0, 4).map(a => {
                  const aColor = a.type === 'warning' ? '#D97706' : a.type === 'ok' ? '#16A34A' : '#1F4E8C'
                  const aIcon = a.type === 'warning' ? '⚠' : a.type === 'ok' ? '✓' : 'ℹ'
                  return (
                    <span key={a.id} className="dash-alert-chip" onClick={() => router.push('/alertas')}
                      style={{ background: `${aColor}10`, color: aColor, border: `1px solid ${aColor}33` }}
                      title={a.text}>
                      <span className="dash-alert-icon">{aIcon}</span>
                      {a.text}
                    </span>
                  )
                })}
                <button className="dash-alerts-more" onClick={() => router.push('/alertas')}>
                  Ver todas →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Tendencias ahora */}
        {(() => {
          const CATEGORIA_COLOR: Record<string, string> = {
            geopolitica: '#c42c2c',
            politica:    '#1F4E8C',
            economia:    '#2d8a39',
          }
          // API returns { items: TrendItem[] } OR a plain TrendItem[] — normalise both
          const trends: TrendItem[] = Array.isArray(trendsRaw)
            ? (trendsRaw as TrendItem[])
            : ((trendsRaw as { items?: TrendItem[] })?.items ?? [])
          const geoItems = trends.filter(t => t.es_evento_geo).slice(0, 3)
          const sourcePills = Array.from(new Set(trends.map(t => t.fuente))).slice(0, 5)
          const lastTs = trends.length > 0 ? trends[0].timestamp : null
          const formattedTs = lastTs
            ? new Date(lastTs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            : null

          return (
            <section className="dash-trends-section">
              {/* Section header */}
              <div className="dash-trends-head">
                <h2 className="dash-trends-title">
                  Tendencias ahora
                </h2>
                <div className="dash-trends-head-right">
                  {formattedTs && (
                    <span className="dash-trends-ts">
                      {formattedTs}
                    </span>
                  )}
                  {sourcePills.map(src => (
                    <span key={src} className="dash-trends-source-pill">
                      {src}
                    </span>
                  ))}
                </div>
              </div>

              {/* Horizontal scroll row */}
              {trendsLoading ? (
                <div className="dash-trends-scroll--hidden">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="dash-trend-skel">
                      <Skeleton width={160} height={10} radius={4} style={{ marginBottom: 7 }}/>
                      <Skeleton width={80} height={8} radius={4} style={{ marginBottom: 8 }}/>
                      <Skeleton width={180} height={8} radius={4} style={{ marginBottom: 4 }}/>
                      <Skeleton width={140} height={8} radius={4} style={{ marginBottom: 12 }}/>
                      <Skeleton width={'100%' as unknown as number} height={3} radius={3}/>
                    </div>
                  ))}
                </div>
              ) : trends.length === 0 ? (
                <div className="dash-trends-empty">
                  Sin tendencias disponibles
                </div>
              ) : (
                <div className="dash-trends-scroll">
                  {trends.map(t => {
                    const accentColor = t.categoria ? (CATEGORIA_COLOR[t.categoria] ?? '#6e6e73') : '#6e6e73'
                    const borderLeft = t.es_evento_geo ? '3px solid #c42c2c' : '3px solid #e8e8ed'
                    return (
                      <div key={t.id} className="dash-trend-card"
                        onClick={() => t.url ? window.open(t.url, '_blank', 'noopener,noreferrer') : undefined}
                        style={{ borderLeft, cursor: t.url ? 'pointer' : 'default' }}
                        onMouseEnter={e => { if (t.url) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
                      >
                        {/* Rank + geo badge row */}
                        <div className="dash-trend-head-row">
                          <span className="dash-trend-rank">
                            #{t.rank}
                          </span>
                          {t.es_evento_geo && (
                            <span className="dash-trend-geo-badge">
                              GEO
                            </span>
                          )}
                        </div>

                        {/* Termino */}
                        <div className="dash-trend-termino">
                          {t.termino}
                        </div>

                        {/* Fuente */}
                        <div className="dash-trend-fuente">
                          {t.fuente}
                        </div>

                        {/* Resumen */}
                        {t.resumen && (
                          <div className="dash-trend-resumen">
                            {t.resumen}
                          </div>
                        )}

                        {/* Country chips */}
                        {t.paises_mencionados && t.paises_mencionados.length > 0 && (
                          <div className="dash-trend-countries">
                            {t.paises_mencionados.slice(0, 3).map(p => (
                              <span key={p} className="dash-country-chip">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Score bar + link arrow */}
                        <div className="dash-trend-foot">
                          <div className="dash-trend-score-track">
                            <div className="dash-trend-score-fill" style={{ width: `${Math.min(100, t.score_norm * 100)}%`, background: accentColor }}/>
                          </div>
                          {t.url && (
                            <span className="dash-trend-arrow">→</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Geo highlights */}
              {geoItems.length > 0 && !trendsLoading && (
                <div className="dash-geo-grid" style={{ gridTemplateColumns: `repeat(${geoItems.length}, 1fr)` }}>
                  {geoItems.map(t => (
                    <div key={`geo-${t.id}`} className="dash-geo-card"
                      onClick={() => t.url ? window.open(t.url, '_blank', 'noopener,noreferrer') : undefined}
                      style={{ cursor: t.url ? 'pointer' : 'default' }}
                      onMouseEnter={e => { if (t.url) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
                    >
                      <div className="dash-geo-titulo">
                        {t.termino}
                      </div>
                      {t.resumen && (
                        <div className="dash-geo-resumen">
                          {t.resumen}
                        </div>
                      )}
                      {t.paises_mencionados && t.paises_mencionados.length > 0 && (
                        <div className="dash-geo-countries">
                          {t.paises_mencionados.map(p => (
                            <span key={p} className="dash-country-chip">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="dash-geo-fuente">{t.fuente}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })()}

        {/* News pulse + enriched territory map */}
        <div className="dash-mid-grid">

          {/* Pulso informativo */}
          <section className="dash-news-section">
            <div className="dash-news-head">
              <h2 className="dash-news-title">
                Pulso informativo
              </h2>
              <button className="dash-news-more-btn" onClick={() => router.push('/medios-narrativa')}>
                Feed completo →
              </button>
            </div>
            {data?.news_pulse && data.news_pulse.length > 0 ? (
              <div className="dash-news-list">
                {data.news_pulse.slice(0, 5).map((n, i) => {
                  const sentColor = n.sentiment > 0.2 ? '#16A34A' : n.sentiment < -0.2 ? '#DC2626' : '#6E6E73'
                  return (
                    <div key={n.id} className={`dash-news-row${i < 4 ? ' dash-news-row--bordered' : ''}`}>
                      <div className="dash-news-row-left">
                        <div className="dash-news-row-title">{n.title}</div>
                        <div className="dash-news-row-meta">
                          <span className="dash-news-row-source">{n.source}</span>
                          {sanitizeParties(n.parties) && <span>· {sanitizeParties(n.parties)}</span>}
                        </div>
                      </div>
                      <div className="dash-news-row-right">
                        {/* Source badge */}
                        <span className="dash-news-row-badge" style={{ background: `${sentColor}18`, color: sentColor }}>
                          {n.source}
                        </span>
                        {/* Bi-directional sentiment bar */}
                        <div className="dash-sent-bar">
                          {/* Center divider */}
                          <div className="dash-sent-bar-divider"/>
                          {/* Negative fill (left of center) */}
                          {n.sentiment < 0 && (
                            <div className="dash-sent-bar-neg" style={{ width: `${Math.min(50, Math.abs(n.sentiment) * 50)}%` }}/>
                          )}
                          {/* Positive fill (right of center) */}
                          {n.sentiment > 0 && (
                            <div className="dash-sent-bar-pos" style={{ width: `${Math.min(50, n.sentiment * 50)}%` }}/>
                          )}
                        </div>
                        {/* Relevance + sentiment label */}
                        <div className="dash-news-row-rel">
                          <span className="dash-news-row-rel-num">
                            rel {(n.relevance * 100).toFixed(0)}%
                          </span>
                          <span className="dash-news-row-sent" style={{ color: sentColor }}>
                            {n.sentiment > 0 ? '+' : ''}{n.sentiment.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="dash-skel-list">
                {[0,1,2,3,4].map(i => <Skeleton key={i} height={42} radius={6}/>)}
              </div>
            )}
          </section>

          {/* Mapa territorial — enriched */}
          <section className="dash-map-section">

            {/* Header + tab toggle */}
            <div className="dash-map-head">
              <h2 className="dash-map-title">
                Mapa territorial
              </h2>
              <div className="dash-map-tabs">
                {(['electoral', 'narrativa', 'figuras'] as MapTab[]).map(tab => (
                  <button key={tab} onClick={() => setMapTab(tab)} className={`dash-map-tab${mapTab === tab ? ' dash-map-tab--active' : ''}`}>
                    {tab === 'electoral' ? 'Electoral' : tab === 'narrativa' ? 'Narrativa' : 'Figuras'}
                  </button>
                ))}
              </div>
            </div>

            {/* Map cells */}
            <div className="dash-map-grid">
              {REGION_GRID.map((row, ri) => (
                <div key={ri} className="dash-map-row">
                  {row.map(cell => {
                    const region = data?.regions?.find(r => r.name === cell.name || r.name === BACKEND_NAME_MAP[cell.name])

                    if (mapTab === 'narrativa') {
                      const nv = CCAA_NARRATIVA[cell.name]
                      return (
                        <div key={cell.name} className="dash-map-cell" onClick={() => router.push(`/mapa?ccaa=${encodeURIComponent(cell.name)}`)}
                          title={`${cell.name} · Narrativa dominante: ${nv?.tema ?? '?'}`}
                          style={{
                            flex: cell.flex, height: cell.height,
                            background: nv ? `${nv.color}e8` : '#6e727888',
                          }}>
                          <div className="dash-map-cell-display--narrativa">{cell.display}</div>
                          <div className={`dash-map-narrativa-tema ${cell.height >= 64 ? 'dash-map-narrativa-tema--lg' : 'dash-map-narrativa-tema--sm'}`}>{nv?.tema ?? '?'}</div>
                        </div>
                      )
                    }

                    if (mapTab === 'figuras') {
                      const fg = CCAA_FIGURA[cell.name]
                      const dirColor = fg?.dir === 'up' ? '#16A34A' : fg?.dir === 'down' ? '#DC2626' : '#6e6e73'
                      const dirArrow = fg?.dir === 'up' ? '↑' : fg?.dir === 'down' ? '↓' : '–'
                      return (
                        <div key={cell.name} className="dash-map-cell dash-map-cell--figuras" onClick={() => router.push('/mapa-actores')}
                          title={`${cell.name} · ${fg?.name ?? '?'} (${fg?.partido ?? '?'})`}
                          style={{
                            flex: cell.flex, height: cell.height,
                            borderLeft: `3px solid ${dirColor}`,
                          }}>
                          <div className="dash-map-cell-display--figuras">{cell.display}</div>
                          {cell.height >= 52 ? (
                            <div>
                              <div className={`dash-map-figura-name ${cell.height >= 64 ? 'dash-map-figura-name--lg' : 'dash-map-figura-name--sm'}`}>{fg?.name ?? '?'}</div>
                              <div className="dash-map-figura-trend" style={{ color: dirColor }}>{dirArrow} {fg?.trend}</div>
                            </div>
                          ) : (
                            <div className="dash-map-figura-trend" style={{ color: dirColor }}>{dirArrow}{fg?.trend}</div>
                          )}
                        </div>
                      )
                    }

                    // Electoral (default)
                    const lean = (region?.lean ?? 'mixed') as 'pp' | 'psoe' | 'mixed'
                    const diff = region?.diff ?? 0
                    return (
                      <div key={cell.name} className="dash-map-cell dash-map-cell--electoral" onClick={() => router.push(`/nowcasting?ccaa=${encodeURIComponent(cell.name)}`)}
                        title={region ? `${cell.name} · PP ${region.pp_pct}% · PSOE ${region.psoe_pct}% · dif ${region.diff > 0 ? '+' : ''}${region.diff}` : cell.name}
                        style={{
                          flex: cell.flex, height: cell.height,
                          background: REGION_COLOR[lean],
                        }}>
                        <div className="dash-map-cell-display">{cell.display}</div>
                        {region && cell.height >= 52 ? (
                          <div>
                            <div className="dash-map-electoral-lean dash-map-electoral-lean--big">
                              {lean === 'pp' ? 'PP' : lean === 'psoe' ? 'PSOE' : 'MIXTO'}
                            </div>
                            <div className="dash-map-electoral-pct">
                              PP {region.pp_pct.toFixed(1)}% · PSOE {region.psoe_pct.toFixed(1)}%
                            </div>
                            <div className="dash-map-electoral-bar">
                              <div className="dash-map-electoral-bar-pp" style={{ flex: region.pp_pct }}/>
                              <div className="dash-map-electoral-bar-psoe" style={{ flex: region.psoe_pct }}/>
                              <div className="dash-map-electoral-bar-otros" style={{ flex: Math.max(0, 100 - region.pp_pct - region.psoe_pct) }}/>
                            </div>
                          </div>
                        ) : cell.height >= 52 ? (
                          <div>
                            <div className={`dash-map-electoral-label-md ${cell.height >= 64 ? 'dash-map-electoral-label-md--64' : 'dash-map-electoral-label-md--52'}`}>
                              {REGION_LABEL[lean]}
                            </div>
                            {diff !== 0 && (
                              <div className="dash-map-electoral-diff">
                                {diff > 0 ? '+' : ''}{Math.round(diff)} esc.
                              </div>
                            )}
                          </div>
                        ) : region ? (
                          // Small cell with real data: label + proportional bar
                          <div>
                            <div className="dash-map-electoral-label-sm">
                              {lean === 'pp' ? 'PP' : lean === 'psoe' ? 'PSOE' : 'MX'}
                            </div>
                            <div className="dash-map-electoral-bar--thin">
                              <div className="dash-map-electoral-bar-pp" style={{ flex: region.pp_pct }}/>
                              <div className="dash-map-electoral-bar-psoe" style={{ flex: region.psoe_pct }}/>
                              <div className="dash-map-electoral-bar-otros" style={{ flex: Math.max(0, 100 - region.pp_pct - region.psoe_pct) }}/>
                            </div>
                          </div>
                        ) : (
                          <div className="dash-map-electoral-label-xs">
                            {REGION_LABEL[lean]}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Trending figures strip */}
            <div className="dash-trending-figs-wrap">
              <div className="dash-trending-figs-label">
                Figuras en tendencia
              </div>
              <div className="dash-trending-figs-grid">
                {TRENDING_FIGURES.map(f => {
                  const arrow = f.dir === 'up' ? '↑' : '↓'
                  const trendColor = f.dir === 'up' ? '#16A34A' : '#DC2626'
                  return (
                    <button key={f.name} className="dash-trending-fig-btn" onClick={() => router.push('/mapa-actores')}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F0F0F5' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F9F9FB' }}>
                      <div className="dash-trending-fig-accent" style={{ background: f.color }}/>
                      <div className="dash-trending-fig-name">{f.name}</div>
                      <div className="dash-trending-fig-meta">
                        <span className="dash-trending-fig-party">{f.party}</span>
                        <span className="dash-trending-fig-trend" style={{ color: trendColor }}>{arrow}{f.trend}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

          </section>

        </div>

        {/* ═══════════════ CENTROS DE INTELIGENCIA ═══════════════
           Navegación principal · 12 módulos. Va al final porque es navegación,
           no contenido en vivo (los KPIs y tendencias se ven antes).
        */}
        <section className="dash-modules-section">
          <div className="dash-modules-head">
            <h2 className="dash-modules-title">
              Centros de inteligencia
            </h2>
            <span className="dash-modules-meta">
              {MODULES.length} módulos · click para abrir
            </span>
          </div>
          <div className="dash-modules-grid">
            {MODULES.map(m => (
              <button key={m.href} className="dash-module-btn" onClick={() => router.push(m.href)}
                style={{
                  border: m.tag ? `1px solid ${m.accent}22` : '1px solid #ECECEF',
                  borderLeft: `3px solid ${m.accent}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div className="dash-module-head">
                  <span className="dash-module-label">{m.label}</span>
                  {m.tag && (
                    <span className="dash-module-tag" style={{ background: `${m.accent}18`, color: m.accent }}>
                      {m.tag}
                    </span>
                  )}
                </div>
                <p className="dash-module-sub">{m.sub}</p>
              </button>
            ))}
          </div>
        </section>

      </main>

      <footer className="dash-footer">
        Politeia Analítica · {new Date().getFullYear()}
        <span className="dash-footer-badge"><LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60}/></span>
      </footer>
    </div>
  )
}
