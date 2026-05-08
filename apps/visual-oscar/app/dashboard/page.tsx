'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import BrainBriefing from '@/components/BrainBriefing'
import CountUp from '@/components/CountUp'
import Skeleton, { LiveDot } from '@/components/Skeleton'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import { IconNews } from '@/components/Icon'
import type { DashboardHome } from '../api/dashboard/home/route'

const REGION_GRID: Array<Array<{ name: string, display: string, flex: number, height: number }>> = [
  [
    { name: 'Andalucía',         display: 'Andalucía', flex: 2.0, height: 64 },
    { name: 'Cataluña',          display: 'Cataluña',  flex: 1.4, height: 64 },
    { name: 'Madrid',            display: 'Madrid',    flex: 1.4, height: 64 },
  ],
  [
    { name: 'C. Valenciana',     display: 'Valencia',     flex: 1, height: 52 },
    { name: 'Galicia',           display: 'Galicia',      flex: 1, height: 52 },
    { name: 'Castilla y León',   display: 'C. y León',    flex: 1, height: 52 },
    { name: 'País Vasco',        display: 'P. Vasco',     flex: 1, height: 52 },
    { name: 'Castilla-La Mancha',display: 'C-La Mancha',  flex: 1, height: 52 },
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

const REGION_COLOR = { pp: '#2D4A8A', psoe: '#C53030', mixed: '#888' } as const
const REGION_LABEL = { pp: 'PP', psoe: 'PSOE', mixed: '?' } as const

// Sections removed from home → NavigationCards
const NAV_CARDS = [
  { href: '/riesgo',              label: 'Risk Index',            sub: 'Composición · señales · escenarios', accent: '#c42c2c' },
  { href: '/medios-narrativa',    label: 'Narrativas activas',    sub: 'Clusters · velocidad · sesgo', accent: '#b25000' },
  { href: '/nowcasting',          label: 'Intención de voto',     sub: 'Encuestas · nowcast · partidos', accent: '#1F4E8C' },
  { href: '/escenarios',          label: 'Mayorías y coaliciones',sub: 'Escenarios de mayoría · D\'Hondt', accent: '#5B21B6' },
  { href: '/coaliciones',         label: 'Hub electoral',         sub: 'Adversario · voto blando · analogías', accent: '#0F766E' },
  { href: '/macro',               label: 'Indicadores macro',     sub: 'PIB · deuda · mercados en tiempo real', accent: '#2d8a39' },
  { href: '/mapa-actores',        label: 'Figuras públicas',      sub: 'Dossier · grafo · cuadrante ideológico', accent: '#7C3AED' },
  { href: '/monitor-legislativo', label: 'Producción legislativa',sub: 'BOE · Congreso · Senado · timeline', accent: '#0E7490' },
  { href: '/mapa',                label: 'Geografía debates',     sub: 'Noticias por CCAA · mapa narrativo', accent: '#0F766E' },
  { href: '/alertas',             label: 'Alertas activas',       sub: 'Señales críticas · detección escaladas', accent: '#D97706' },
  { href: '/geopolitica',         label: 'Geopolítica',           sub: 'Teatro global · OSINT · presencia España', accent: '#0E7490' },
  { href: '/prensa',              label: 'Feed de inteligencia',  sub: '414 medios · Ollama · análisis NLP', accent: '#525258' },
]

export default function DashboardPage() {
  const router = useRouter()

  const { data, source, updatedAt, loading, refresh } = useApi<DashboardHome>(
    '/api/dashboard/home',
    { refreshInterval: 60_000 }
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

        {/* Intelligence centres */}
        <section style={{ marginTop: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f' }}>
              Centros de inteligencia
            </h2>
            <span style={{ fontSize: 10.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              16 módulos · click para abrir
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { href: '/coaliciones',         label: 'Hub electoral',       sub: '8 tabs · Adversario · Voto blando · Analogías', accent: '#5B21B6', tag: 'NUEVO' },
              { href: '/mapa-actores',        label: 'Mapa de actores',     sub: 'Mapa · Grafo de relaciones · Dossier ideológico', accent: '#1F4E8C', tag: 'EXPANDIDO' },
              { href: '/riesgo',              label: 'Risk Index',           sub: 'Composición + simulador por señal + escenarios', accent: '#c42c2c', tag: 'EXPANDIDO' },
              { href: '/medios-narrativa',    label: 'Medios y narrativa',   sub: '487 fuentes · ciclo de vida narrativo', accent: '#b25000', tag: 'EXPANDIDO' },
              { href: '/monitor-legislativo', label: 'Monitor legislativo',  sub: 'Mapa territorial · 14 normas geo', accent: '#0F766E', tag: 'NUEVO' },
              { href: '/briefing',            label: 'Briefing diario',      sub: 'Descarga PDF · archivo histórico', accent: '#2d8a39', tag: 'EXPANDIDO' },
              { href: '/geopolitica',         label: 'Geopolítica',          sub: 'Live ticker · factores · riesgos cuantificados', accent: '#0E7490', tag: 'NUEVO' },
              { href: '/workspaces',          label: 'Workspaces',           sub: 'KPIs por workspace · briefings archivados', accent: '#7C3AED', tag: 'NUEVO' },
            ].map((m, i) => (
              <button key={m.href} onClick={() => router.push(m.href)} style={{
                background: '#fff', border: '1px solid #ECECEF', borderLeft: `3px solid ${m.accent}`,
                borderRadius: 12, padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.005em' }}>{m.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, letterSpacing: '0.06em', background: `${m.accent}15`, color: m.accent }}>{m.tag}</span>
                </div>
                <p style={{ margin: 0, fontSize: 10.5, color: '#6e6e73', lineHeight: 1.4 }}>{m.sub}</p>
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
          {(data?.kpis ?? []).map((k, i) => {
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

        {/* Module shortcuts (sections moved off home) */}
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 10px', color: '#1d1d1f' }}>
            Análisis en detalle
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {NAV_CARDS.map(m => (
              <button key={m.href} onClick={() => router.push(m.href)} style={{
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 10,
                padding: '11px 13px', textAlign: 'left', cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'flex-start', gap: 10,
                transition: 'box-shadow 160ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.07)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
                <span style={{ width: 4, height: 36, borderRadius: 2, background: m.accent, flexShrink: 0, marginTop: 2 }}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                  <div style={{ fontSize: 10.5, color: '#6e6e73', lineHeight: 1.35 }}>{m.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* News pulse + territory map */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 16 }}>

          {/* Pulso informativo (5 items compact) */}
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
                        <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.35, fontWeight: 500, marginBottom: 3 }}>
                          {n.title}
                        </div>
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

          {/* Mapa territorial (compact) */}
          <section style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Mapa territorial</h2>
              <span style={{ fontSize: 10.5, color: '#6E6E73', background: '#F5F5F7', borderRadius: 999, padding: '3px 9px', fontWeight: 500 }}>17 CC.AA.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {REGION_GRID.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 4 }}>
                  {row.map(cell => {
                    const region = data?.regions?.find(r => r.name === cell.name)
                    const lean = (region?.lean ?? 'mixed') as 'pp' | 'psoe' | 'mixed'
                    return (
                      <div
                        key={cell.name}
                        title={region ? `${cell.name} · PP ${region.pp_pct}% · PSOE ${region.psoe_pct}%` : cell.name}
                        style={{
                          flex: cell.flex, height: cell.height, background: REGION_COLOR[lean], borderRadius: 6,
                          padding: '6px 8px', color: '#fff',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          transition: 'background 600ms ease', cursor: 'help',
                        }}
                      >
                        <div style={{ fontSize: 9.5, fontWeight: 500, opacity: 0.75, letterSpacing: '-0.005em' }}>{cell.display}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>{REGION_LABEL[lean]}</div>
                      </div>
                    )
                  })}
                </div>
              ))}
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
