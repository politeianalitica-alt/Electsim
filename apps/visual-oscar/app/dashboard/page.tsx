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

// ── Trends types ─────────────────────────────────────────────────────────────

interface TrendItem {
  id: string; termino: string; fuente: string; rank: number
  score_norm: number; categoria: string | null; es_evento_geo: boolean
  paises_mencionados: string[]; url: string; resumen: string | null
  timestamp: string
}

// ── Static CCAA metadata ──────────────────────────────────────────────────────

type MapTab = 'electoral' | 'narrativa' | 'figuras'

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

export default function DashboardPage() {
  const router = useRouter()
  const [mapTab, setMapTab] = useState<MapTab>('electoral')

  const { data, source, updatedAt, loading, refresh } = useApi<DashboardHome>(
    '/api/dashboard/home',
    { refreshInterval: 60_000 }
  )

  const { data: trendsData, loading: trendsLoading } = useApi<TrendItem[]>(
    '/api/trends',
    { refreshInterval: 120_000 }
  )

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const isReady = !!data && Array.isArray(data.parties) && data.parties.length > 0

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader/>

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 28px 60px' }}>

        {/* Morning briefing */}
        <BrainBriefing/>

        {/* Intelligence centres — single unified section */}
        <section style={{ marginTop: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f' }}>
              Centros de inteligencia
            </h2>
            <span style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              {MODULES.length} módulos · click para abrir
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {MODULES.map(m => (
              <button key={m.href} onClick={() => router.push(m.href)} style={{
                background: '#fff',
                border: m.tag ? `1px solid ${m.accent}22` : '1px solid #ECECEF',
                borderLeft: `3px solid ${m.accent}`,
                borderRadius: 10, padding: '11px 13px', textAlign: 'left', cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.005em', lineHeight: 1.3 }}>{m.label}</span>
                  {m.tag && (
                    <span style={{ fontSize: 8.5, fontWeight: 700, padding: '2px 5px', borderRadius: 999, letterSpacing: '0.05em', background: `${m.accent}18`, color: m.accent, flexShrink: 0, marginLeft: 6 }}>
                      {m.tag}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 10.5, color: '#6e6e73', lineHeight: 1.35 }}>{m.sub}</p>
              </button>
            ))}
          </div>
        </section>

        {/* KPI strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'} />
            Panel ejecutivo
          </h2>
          <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60} onRefresh={refresh}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {(data?.kpis ?? []).map(k => {
            const numeric = typeof k.value === 'number' ? k.value : Number(String(k.value).replace(/[^0-9.-]/g, ''))
            const suffix = typeof k.value === 'string' && k.value.includes('%') ? '%' : ''
            return (
              <div key={k.label} style={{
                background: '#fff', borderRadius: 14, padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${k.accent}`,
              }}>
                <p style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 6px' }}>{k.label}</p>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', color: k.accent, lineHeight: 1 }}>
                  {isReady && !Number.isNaN(numeric)
                    ? <><CountUp value={numeric}/>{suffix}</>
                    : <Skeleton width={60} height={32} radius={6}/>
                  }
                </div>
                <p style={{ fontSize: 10.5, color: 'var(--ink-3)', margin: '5px 0 0' }}>{k.sub}</p>
              </div>
            )
          })}
          {!data?.kpis && !isReady && [0,1,2,3].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <Skeleton width={80} height={10} radius={4} style={{ marginBottom: 10 }}/>
              <Skeleton width={100} height={32} radius={6}/>
            </div>
          ))}
        </div>

        {/* Tendencias ahora */}
        {(() => {
          const CATEGORIA_COLOR: Record<string, string> = {
            geopolitica: '#c42c2c',
            politica:    '#1F4E8C',
            economia:    '#2d8a39',
          }
          const trends = Array.isArray(trendsData) ? trendsData : []
          const geoItems = trends.filter(t => t.es_evento_geo).slice(0, 3)
          const sourcePills = Array.from(new Set(trends.map(t => t.fuente))).slice(0, 5)
          const lastTs = trends.length > 0 ? trends[0].timestamp : null
          const formattedTs = lastTs
            ? new Date(lastTs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            : null

          return (
            <section style={{ marginBottom: 20 }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f' }}>
                  Tendencias ahora
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {formattedTs && (
                    <span style={{ fontSize: 10, color: '#6e6e73', fontWeight: 500 }}>
                      {formattedTs}
                    </span>
                  )}
                  {sourcePills.map(src => (
                    <span key={src} style={{
                      fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                      background: '#F5F5F7', color: '#6e6e73', letterSpacing: '0.03em',
                      border: '1px solid #ECECEF',
                    }}>
                      {src}
                    </span>
                  ))}
                </div>
              </div>

              {/* Horizontal scroll row */}
              {trendsLoading ? (
                <div style={{ display: 'flex', gap: 8, overflowX: 'hidden' }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      minWidth: 200, maxWidth: 240, flexShrink: 0,
                      background: '#fff', borderRadius: 10, padding: '12px 13px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      border: '1px solid #ECECEF', borderLeft: '3px solid #e8e8ed',
                    }}>
                      <Skeleton width={160} height={10} radius={4} style={{ marginBottom: 7 }}/>
                      <Skeleton width={80} height={8} radius={4} style={{ marginBottom: 8 }}/>
                      <Skeleton width={180} height={8} radius={4} style={{ marginBottom: 4 }}/>
                      <Skeleton width={140} height={8} radius={4} style={{ marginBottom: 12 }}/>
                      <Skeleton width={'100%' as unknown as number} height={3} radius={3}/>
                    </div>
                  ))}
                </div>
              ) : trends.length === 0 ? (
                <div style={{
                  background: '#fff', borderRadius: 10, padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #ECECEF',
                  textAlign: 'center', color: '#6e6e73', fontSize: 12,
                }}>
                  Sin tendencias disponibles
                </div>
              ) : (
                <div style={{
                  display: 'flex', gap: 8, overflowX: 'auto',
                  paddingBottom: 4,
                  msOverflowStyle: 'none',
                } as React.CSSProperties}>
                  {trends.map(t => {
                    const accentColor = t.categoria ? (CATEGORIA_COLOR[t.categoria] ?? '#6e6e73') : '#6e6e73'
                    const borderLeft = t.es_evento_geo ? '3px solid #c42c2c' : '3px solid #e8e8ed'
                    return (
                      <div key={t.id}
                        onClick={() => t.url ? window.open(t.url, '_blank', 'noopener,noreferrer') : undefined}
                        style={{
                          minWidth: 200, maxWidth: 240, flexShrink: 0,
                          background: '#fff', borderRadius: 10, padding: '11px 13px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          border: '1px solid #ECECEF', borderLeft,
                          cursor: t.url ? 'pointer' : 'default',
                          display: 'flex', flexDirection: 'column', gap: 5,
                          position: 'relative',
                          transition: 'box-shadow 150ms',
                        }}
                        onMouseEnter={e => { if (t.url) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
                      >
                        {/* Rank + geo badge row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999,
                            background: '#F5F5F7', color: '#6e6e73', letterSpacing: '0.04em',
                          }}>
                            #{t.rank}
                          </span>
                          {t.es_evento_geo && (
                            <span style={{
                              fontSize: 8.5, fontWeight: 700, padding: '1px 5px', borderRadius: 999,
                              background: '#c42c2c18', color: '#c42c2c', letterSpacing: '0.04em',
                            }}>
                              GEO
                            </span>
                          )}
                        </div>

                        {/* Termino */}
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
                          {t.termino}
                        </div>

                        {/* Fuente */}
                        <div style={{ fontSize: 11, color: '#6e6e73', fontWeight: 500 }}>
                          {t.fuente}
                        </div>

                        {/* Resumen */}
                        {t.resumen && (
                          <div style={{
                            fontSize: 12, color: '#444', lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          } as React.CSSProperties}>
                            {t.resumen}
                          </div>
                        )}

                        {/* Country chips */}
                        {t.paises_mencionados && t.paises_mencionados.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {t.paises_mencionados.slice(0, 3).map(p => (
                              <span key={p} style={{
                                fontSize: 9, padding: '1px 5px', borderRadius: 999,
                                background: '#F0F4FF', color: '#1F4E8C', fontWeight: 600,
                                border: '1px solid #dce6ff',
                              }}>
                                {p}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Score bar + link arrow */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
                          <div style={{ flex: 1, height: 3, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, t.score_norm * 100)}%`, height: '100%', background: accentColor, borderRadius: 3 }}/>
                          </div>
                          {t.url && (
                            <span style={{ fontSize: 12, color: '#6e6e73', flexShrink: 0, lineHeight: 1 }}>→</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Geo highlights */}
              {geoItems.length > 0 && !trendsLoading && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${geoItems.length}, 1fr)`, gap: 8, marginTop: 8 }}>
                  {geoItems.map(t => (
                    <div key={`geo-${t.id}`}
                      onClick={() => t.url ? window.open(t.url, '_blank', 'noopener,noreferrer') : undefined}
                      style={{
                        background: '#fff', borderRadius: 10, padding: '13px 15px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        border: '1px solid #f0d0d0', borderLeft: '3px solid #c42c2c',
                        cursor: t.url ? 'pointer' : 'default',
                        transition: 'box-shadow 150ms',
                      }}
                      onMouseEnter={e => { if (t.url) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.01em' }}>
                        {t.termino}
                      </div>
                      {t.resumen && (
                        <div style={{
                          fontSize: 11, color: '#444', lineHeight: 1.4, marginBottom: 6,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        } as React.CSSProperties}>
                          {t.resumen}
                        </div>
                      )}
                      {t.paises_mencionados && t.paises_mencionados.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
                          {t.paises_mencionados.map(p => (
                            <span key={p} style={{
                              fontSize: 9, padding: '1px 5px', borderRadius: 999,
                              background: '#F0F4FF', color: '#1F4E8C', fontWeight: 600,
                              border: '1px solid #dce6ff',
                            }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 500 }}>{t.fuente}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })()}

        {/* News pulse + enriched territory map */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 16 }}>

          {/* Pulso informativo */}
          <section style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
                Pulso informativo
              </h2>
              <button onClick={() => router.push('/medios-narrativa')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#6E6E73', fontFamily: 'inherit' }}>
                Feed completo →
              </button>
            </div>
            {data?.news_pulse && data.news_pulse.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {data.news_pulse.slice(0, 5).map((n, i) => {
                  const sentColor = n.sentiment > 0.2 ? '#16A34A' : n.sentiment < -0.2 ? '#DC2626' : '#6E6E73'
                  return (
                    <div key={n.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 72px', gap: 12, padding: '9px 0',
                      borderBottom: i < 4 ? '1px solid var(--hairline)' : 'none',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.35, fontWeight: 500, marginBottom: 3 }}>{n.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', display: 'flex', gap: 8 }}>
                          <span style={{ fontWeight: 600 }}>{n.source}</span>
                          {n.parties && <span>· {n.parties}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
                        <div style={{ width: 60, height: 3, background: '#F5F5F7', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, n.relevance * 100)}%`, height: '100%', background: sentColor }}/>
                        </div>
                        <span style={{ fontSize: 9, color: sentColor, fontWeight: 600, letterSpacing: '0.02em' }}>
                          {n.sentiment > 0.1 ? '+' : ''}{n.sentiment.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[0,1,2,3,4].map(i => <Skeleton key={i} height={42} radius={6}/>)}
              </div>
            )}
          </section>

          {/* Mapa territorial — enriched */}
          <section style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Header + tab toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
                Mapa territorial
              </h2>
              <div style={{ display: 'flex', background: '#F5F5F7', borderRadius: 8, padding: 2, gap: 1 }}>
                {(['electoral', 'narrativa', 'figuras'] as MapTab[]).map(tab => (
                  <button key={tab} onClick={() => setMapTab(tab)} style={{
                    background: mapTab === tab ? '#fff' : 'transparent',
                    border: 'none', cursor: 'pointer', borderRadius: 6,
                    padding: '3px 8px', fontSize: 10, fontWeight: 600,
                    color: mapTab === tab ? '#1d1d1f' : '#6e6e73',
                    fontFamily: 'inherit', letterSpacing: '0.01em',
                    boxShadow: mapTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    textTransform: 'capitalize',
                    transition: 'all 150ms',
                  }}>
                    {tab === 'electoral' ? 'Electoral' : tab === 'narrativa' ? 'Narrativa' : 'Figuras'}
                  </button>
                ))}
              </div>
            </div>

            {/* Map cells */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {REGION_GRID.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 3 }}>
                  {row.map(cell => {
                    const region = data?.regions?.find(r => r.name === cell.name)

                    if (mapTab === 'narrativa') {
                      const nv = CCAA_NARRATIVA[cell.name]
                      return (
                        <div key={cell.name} onClick={() => router.push(`/mapa?ccaa=${encodeURIComponent(cell.name)}`)}
                          title={`${cell.name} · Narrativa dominante: ${nv?.tema ?? '?'}`}
                          style={{
                            flex: cell.flex, height: cell.height,
                            background: nv ? `${nv.color}e8` : '#6e727888',
                            borderRadius: 6, padding: '5px 7px', color: '#fff',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}>
                          <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}>{cell.display}</div>
                          <div style={{ fontSize: cell.height >= 64 ? 11 : 9.5, fontWeight: 700, lineHeight: 1.1 }}>{nv?.tema ?? '?'}</div>
                        </div>
                      )
                    }

                    if (mapTab === 'figuras') {
                      const fg = CCAA_FIGURA[cell.name]
                      const dirColor = fg?.dir === 'up' ? '#16A34A' : fg?.dir === 'down' ? '#DC2626' : '#6e6e73'
                      const dirArrow = fg?.dir === 'up' ? '↑' : fg?.dir === 'down' ? '↓' : '–'
                      return (
                        <div key={cell.name} onClick={() => router.push('/mapa-actores')}
                          title={`${cell.name} · ${fg?.name ?? '?'} (${fg?.partido ?? '?'})`}
                          style={{
                            flex: cell.flex, height: cell.height,
                            background: '#1c2333',
                            borderRadius: 6, padding: '5px 7px', color: '#fff',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderLeft: `3px solid ${dirColor}`,
                          }}>
                          <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.6 }}>{cell.display}</div>
                          {cell.height >= 52 ? (
                            <div>
                              <div style={{ fontSize: cell.height >= 64 ? 10.5 : 9, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fg?.name ?? '?'}</div>
                              <div style={{ fontSize: 9, color: dirColor, fontWeight: 700 }}>{dirArrow} {fg?.trend}</div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 9, fontWeight: 700, color: dirColor }}>{dirArrow}{fg?.trend}</div>
                          )}
                        </div>
                      )
                    }

                    // Electoral (default)
                    const lean = (region?.lean ?? 'mixed') as 'pp' | 'psoe' | 'mixed'
                    const diff = region?.diff ?? 0
                    const diffColor = diff > 5 ? '#16A34A' : diff > 0 ? '#4ade80' : '#f87171'
                    return (
                      <div key={cell.name} onClick={() => router.push(`/nowcasting?ccaa=${encodeURIComponent(cell.name)}`)}
                        title={region ? `${cell.name} · PP ${region.pp_pct}% · PSOE ${region.psoe_pct}% · dif ${region.diff > 0 ? '+' : ''}${region.diff}` : cell.name}
                        style={{
                          flex: cell.flex, height: cell.height,
                          background: REGION_COLOR[lean], borderRadius: 6,
                          padding: '5px 7px', color: '#fff',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          cursor: 'pointer', transition: 'background 600ms ease',
                        }}>
                        <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.75 }}>{cell.display}</div>
                        {cell.height >= 52 ? (
                          <div>
                            <div style={{ fontSize: cell.height >= 64 ? 14 : 12, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
                              {REGION_LABEL[lean]}
                            </div>
                            {region && (
                              <div style={{ fontSize: 8.5, opacity: 0.75, marginTop: 2, fontWeight: 600 }}>
                                {diff > 0 ? '+' : ''}{Math.round(diff)} esc.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
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
            <div style={{ borderTop: '1px solid #ECECEF', paddingTop: 9 }}>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7 }}>
                Figuras en tendencia
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                {TRENDING_FIGURES.map(f => {
                  const arrow = f.dir === 'up' ? '↑' : '↓'
                  const trendColor = f.dir === 'up' ? '#16A34A' : '#DC2626'
                  return (
                    <button key={f.name} onClick={() => router.push('/mapa-actores')} style={{
                      background: '#F9F9FB', border: 'none', borderRadius: 7,
                      padding: '6px 7px', cursor: 'pointer', fontFamily: 'inherit',
                      textAlign: 'left', transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0F0F5' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F9F9FB' }}>
                      <div style={{ width: '100%', height: 2, background: f.color, borderRadius: 1, marginBottom: 5 }}/>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#1d1d1f', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 8.5, color: '#6e6e73' }}>{f.party}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: trendColor }}>{arrow}{f.trend}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

          </section>

        </div>

      </main>

      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '18px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11 }}>
        Politeia Analítica · {new Date().getFullYear()}
        <span style={{ marginLeft: 16 }}><LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60}/></span>
      </footer>
    </div>
  )
}
