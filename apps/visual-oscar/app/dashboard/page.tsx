'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { clearTokens, isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import HemicycleAdvanced, { HParty } from '@/components/HemicycleAdvanced'
import BrainBriefing from '@/components/BrainBriefing'
import Sparkline from '@/components/Sparkline'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import CountUp from '@/components/CountUp'
import Skeleton, { LiveDot } from '@/components/Skeleton'
import IntelligenceFeed from '@/components/IntelligenceFeed'
import NarrativesStrip from '@/components/NarrativesStrip'
import type { DashboardHome } from '../api/dashboard/home/route'

// ── Datasets históricos para el toggle del hemiciclo ──────────────────────────
// (los datos de "estimación" vienen del backend, los históricos son fijos)
const HEMI_HISTORICAL: Record<'g2023' | 'g2019', HParty[]> = {
  g2023: [
    { id: 'pp',     name: 'PP',       color: '#1F4E8C', seats: 137 },
    { id: 'psoe',   name: 'PSOE',     color: '#E1322D', seats: 121 },
    { id: 'vox',    name: 'VOX',      color: '#5BA02E', seats: 33 },
    { id: 'sumar',  name: 'Sumar',    color: '#D43F8D', seats: 31 },
    { id: 'erc',    name: 'ERC',      color: '#E8A030', seats: 7 },
    { id: 'junts',  name: 'Junts',    color: '#1FA89B', seats: 7 },
    { id: 'bildu',  name: 'EH Bildu', color: '#3F7A3A', seats: 6 },
    { id: 'pnv',    name: 'PNV',      color: '#7DB94B', seats: 5 },
    { id: 'cc',     name: 'CC',       color: '#F2C43A', seats: 1 },
    { id: 'bng',    name: 'BNG',      color: '#5BB3D9', seats: 1 },
    { id: 'upn',    name: 'UPN',      color: '#0E7D8C', seats: 1 },
  ],
  g2019: [
    { id: 'psoe',   name: 'PSOE',     color: '#E1322D', seats: 120 },
    { id: 'pp',     name: 'PP',       color: '#1F4E8C', seats: 89 },
    { id: 'vox',    name: 'VOX',      color: '#5BA02E', seats: 52 },
    { id: 'up',     name: 'UP',       color: '#D43F8D', seats: 35 },
    { id: 'erc',    name: 'ERC',      color: '#E8A030', seats: 13 },
    { id: 'cs',     name: 'Cs',       color: '#FF8A00', seats: 10 },
    { id: 'junts',  name: 'JxC',      color: '#1FA89B', seats: 8 },
    { id: 'pnv',    name: 'PNV',      color: '#7DB94B', seats: 6 },
    { id: 'bildu',  name: 'EH Bildu', color: '#3F7A3A', seats: 5 },
    { id: 'cc',     name: 'CC',       color: '#F2C43A', seats: 2 },
    { id: 'bng',    name: 'BNG',      color: '#5BB3D9', seats: 1 },
    { id: 'otros',  name: 'Otros',    color: '#C0C0C5', seats: 9 },
  ],
}

const REGION_GRID: Array<Array<{ name: string, display: string, flex: number, height: number }>> = [
  [
    { name: 'Andalucía',         display: 'Andalucía', flex: 2.0, height: 78 },
    { name: 'Cataluña',          display: 'Cataluña',  flex: 1.4, height: 78 },
    { name: 'Madrid',            display: 'Madrid',    flex: 1.4, height: 78 },
  ],
  [
    { name: 'C. Valenciana',     display: 'Valencia',     flex: 1, height: 64 },
    { name: 'Galicia',           display: 'Galicia',      flex: 1, height: 64 },
    { name: 'Castilla y León',   display: 'C. y León',    flex: 1, height: 64 },
  ],
  [
    { name: 'País Vasco',         display: 'P. Vasco',     flex: 1, height: 56 },
    { name: 'Castilla-La Mancha', display: 'C-La Mancha',  flex: 1, height: 56 },
    { name: 'Canarias',           display: 'Canarias',     flex: 1, height: 56 },
    { name: 'Murcia',             display: 'Murcia',       flex: 1, height: 56 },
    { name: 'Asturias',           display: 'Asturias',     flex: 1, height: 56 },
    { name: 'Extremadura',        display: 'Extremad.',    flex: 1, height: 56 },
  ],
  [
    { name: 'Aragón',     display: 'Aragón',    flex: 1, height: 56 },
    { name: 'Baleares',   display: 'Baleares',  flex: 1, height: 56 },
    { name: 'Navarra',    display: 'Navarra',   flex: 1, height: 56 },
    { name: 'La Rioja',   display: 'Rioja',     flex: 1, height: 56 },
    { name: 'Cantabria',  display: 'Cantabria', flex: 1, height: 56 },
  ],
]

const REGION_COLOR = { pp: '#2D4A8A', psoe: '#C53030', mixed: '#888' } as const
const REGION_LABEL = { pp: 'PP', psoe: 'PSOE', mixed: '?' } as const

export default function DashboardPage() {
  const router = useRouter()
  const [hemiDataset, setHemiDataset] = useState<'estimacion' | 'g2023' | 'g2019'>('estimacion')

  // 🔥 Live data del backend con auto-refresh cada 60s
  const { data, source, updatedAt, loading, refresh } = useApi<DashboardHome>(
    '/api/dashboard/home',
    { refreshInterval: 60_000 }
  )

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  // Derivar dataset hemiciclo
  const hemiData: HParty[] = useMemo(() => {
    if (hemiDataset !== 'estimacion') return HEMI_HISTORICAL[hemiDataset]
    if (!data?.parties) return []
    return data.parties.map(p => ({
      id: p.siglas.toLowerCase(),
      name: p.siglas,
      color: p.color,
      seats: p.seats,
    }))
  }, [hemiDataset, data?.parties])

  const isReady = !!data && Array.isArray(data.parties) && data.parties.length > 0
  const maxPct = useMemo(() => {
    const m = data?.parties?.reduce((mx, p) => Math.max(mx, p.pct), 0) ?? 36
    return Math.max(36, Math.ceil(m / 5) * 5)
  }, [data?.parties])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader/>

      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 28px 80px' }}>
        {/* Politeia Briefing AI (BrainBriefing usa /api/briefings/morning) */}
        <BrainBriefing/>

        {/* ── Cabecera con live status ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: '#1d1d1f' }}>
              <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'} />
              Panel ejecutivo
            </h2>
            {data?.fecha_estimacion && (
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                · estimación {new Date(data.fecha_estimacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60} onRefresh={refresh}/>
        </div>

        {/* ── KPIs (4 tarjetas con count-up animado) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
          {(data?.kpis ?? []).map((k, i) => {
            const numeric = typeof k.value === 'number' ? k.value : Number(String(k.value).replace(/[^0-9.-]/g, ''))
            const suffix = typeof k.value === 'string' && k.value.includes('%') ? '%' : ''
            return (
              <div key={k.label} style={{
                background: '#fff', borderRadius: 16, padding: '20px 22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${k.accent}`,
                animation: 'pol-fade-in 320ms ease-out', animationDelay: `${i * 80}ms`, animationFillMode: 'backwards',
                transition: 'box-shadow 200ms',
              }}>
                <p style={{ fontSize: 10.5, color: 'var(--ink-4)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 8px' }}>{k.label}</p>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', color: k.accent, lineHeight: 1 }}>
                  {isReady && !Number.isNaN(numeric) ? (
                    <><CountUp value={numeric}/>{suffix}</>
                  ) : (
                    <Skeleton width={70} height={36} radius={8}/>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '6px 0 0' }}>{k.sub}</p>
              </div>
            )
          })}
          {!data?.kpis && !isReady && [0, 1, 2, 3].map(i => (
            <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <Skeleton width={90} height={11} radius={4} style={{ marginBottom: 12 }}/>
              <Skeleton width={120} height={36} radius={8}/>
              <Skeleton width={140} height={11} radius={4} style={{ marginTop: 8 }}/>
            </div>
          ))}
        </div>

        {/* ── Narrativas activas (extraídas de las noticias por Ollama) ── */}
        <NarrativesStrip/>

        {/* ── Vote bars + Alerts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 18, marginBottom: 20 }}>
          <section style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>
                Intención de voto
              </h2>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#16A34A', background: '#f0fdf4', borderRadius: 999, padding: '3px 10px', border: '1px solid #bbf7d0' }}>
                Media de encuestas · n={data?.parties?.length ?? '—'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {isReady ? data!.parties.map((p, i) => {
                const intel = data?.news_intel?.by_party?.[p.siglas]
                return (
                <div key={p.partido_id} style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr 60px 56px 36px 64px', gap: 10, alignItems: 'center',
                  animation: 'pol-fade-in 360ms ease-out', animationDelay: `${i * 50}ms`, animationFillMode: 'backwards',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{p.siglas}</span>
                  <div style={{ height: 22, background: 'var(--bg-soft)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                    {/* Banda de confianza */}
                    <div style={{
                      position: 'absolute', left: `${(p.ci_inf / maxPct) * 100}%`, width: `${((p.ci_sup - p.ci_inf) / maxPct) * 100}%`,
                      top: 0, bottom: 0, background: `${p.color}20`,
                    }}/>
                    {/* Barra principal */}
                    <div style={{
                      width: `${(p.pct / maxPct) * 100}%`, height: '100%', background: p.color, borderRadius: 5,
                      transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)',
                    }}/>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 600, color: p.color, letterSpacing: '-0.01em' }}>
                    <CountUp value={p.pct} decimals={1}/>%
                  </span>
                  <span style={{ fontSize: 11, color: p.delta > 0 ? '#16A34A' : p.delta < 0 ? '#DC2626' : 'var(--ink-4)', textAlign: 'right', fontWeight: 500 }}>
                    {p.delta > 0 ? '↑' : p.delta < 0 ? '↓' : '·'} {Math.abs(p.delta).toFixed(1)}
                  </span>
                  {/* News mentions sentiment chip */}
                  <span title={intel ? `Menciones 7d: ${intel.mentions} (${intel.pos}+ ${intel.neg}- ${intel.neu}=) · Sentiment ${intel.sent_score}` : 'Sin menciones aún'} style={{
                    fontSize: 9.5, fontWeight: 700, textAlign: 'right',
                    color: !intel ? '#9CA3AF' : intel.sent_score > 0.1 ? '#16A34A' : intel.sent_score < -0.1 ? '#DC2626' : '#6E6E73',
                    letterSpacing: '0.02em',
                  }}>
                    {intel ? `${intel.mentions}📰` : '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'right' }}>{p.seats}e</span>
                </div>
              )}) : Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height={22} radius={5}/>
              ))}
              {data?.news_intel?.total_24h && data.news_intel.total_24h > 0 && (
                <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4, paddingTop: 8, borderTop: '1px dashed var(--hairline)' }}>
                  📊 {data.news_intel.total_24h} noticias analizadas en 24h
                  {data.news_intel.high_impact_count > 0 && <> · <span style={{ color: '#D97706', fontWeight: 600 }}>{data.news_intel.high_impact_count} con alto impacto España</span></>}
                </div>
              )}
            </div>
          </section>

          <section style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>
                Alertas activas
              </h2>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#D97706', background: '#fffbeb', borderRadius: 999, padding: '3px 10px', border: '1px solid #fde68a' }}>
                {data?.alerts?.length ?? 0} alertas
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {isReady && (data!.alerts ?? []).slice(0, 6).map((a, i) => {
                const fromNews = (a as any).from_news === true
                return (
                <div key={a.id} style={{
                  padding: '11px 13px', borderRadius: 11,
                  background: a.type === 'warning' ? '#fffbeb' : a.type === 'ok' ? '#f0fdf4' : '#f0f9ff',
                  borderLeft: `3px solid ${a.type === 'warning' ? '#D97706' : a.type === 'ok' ? '#16A34A' : '#0EA5E9'}`,
                  animation: 'pol-fade-in 360ms ease-out', animationDelay: `${i * 70}ms`, animationFillMode: 'backwards',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                    {a.severidad && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.05em',
                        background: a.severidad === 'CRITICAL' ? '#FEE2E2' : a.severidad === 'HIGH' ? '#FEF3C7' : '#E0F2FE',
                        color: a.severidad === 'CRITICAL' ? '#991B1B' : a.severidad === 'HIGH' ? '#92400E' : '#075985',
                      }}>{a.severidad}</span>
                    )}
                    {fromNews && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.05em',
                        background: '#EFF6FF', color: '#1E40AF',
                      }}>📰 NEWS</span>
                    )}
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45, flex: 1, minWidth: 0 }}>{a.text}</p>
                  </div>
                  {(a as any).summary && (
                    <p style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                      {((a as any).summary as string).slice(0, 140)}
                      {((a as any).summary as string).length > 140 ? '…' : ''}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 10, color: 'var(--ink-4)', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(a as any).source && <span style={{ fontWeight: 600 }}>{(a as any).source}</span>}
                    {a.tipo && <span>· {a.tipo}</span>}
                    {(a as any).urgency && <span>· urgencia {(a as any).urgency}</span>}
                  </div>
                </div>
              )})}
              {!isReady && Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} height={50} radius={11}/>
              ))}
            </div>
          </section>
        </div>

        {/* ── Hemicycle + Macro ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 18, marginBottom: 20 }}>
          <section style={{ background: '#fff', borderRadius: 20, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Hemiciclo</h2>
              <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
                {([
                  { k: 'estimacion' as const, label: 'Estimación' },
                  { k: 'g2023' as const,      label: 'GE 2023' },
                  { k: 'g2019' as const,      label: 'GE 2019' },
                ]).map(o => {
                  const active = hemiDataset === o.k
                  return (
                    <button key={o.k} onClick={() => setHemiDataset(o.k)} style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#1d1d1f' : '#6e6e73',
                      border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 12,
                      fontWeight: active ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 160ms',
                    }}>{o.label}</button>
                  )
                })}
              </div>
            </div>
            {hemiData.length > 0 ? (
              <HemicycleAdvanced parties={hemiData}/>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Skeleton width={300} height={150} radius={150} style={{ borderRadius: '300px 300px 0 0' }}/>
              </div>
            )}
          </section>

          <section onClick={() => router.push('/macro')} style={{ background: '#fff', borderRadius: 20, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF', cursor: 'pointer', transition: 'box-shadow 200ms' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Indicadores macro</h2>
              <span style={{ fontSize: 12, color: '#6e6e73', fontWeight: 500 }}>Ver todos →</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 18px' }}>
              {(data?.macro ?? []).slice(0, 8).map((m, i) => {
                // Para datos de mercado real (live=true), 'good' direction depende del tipo
                const dirGoodMap: Record<string, 'up' | 'down'> = {
                  es: 'up', eu: 'up', fx: 'up', up: 'up',
                  energy: 'down', safehaven: 'up', down: 'down',
                }
                const goodDir = dirGoodMap[m.good] || 'up'
                const isGood = m.dir === goodDir
                const deltaColor = isGood ? '#16A34A' : '#DC2626'
                return (
                  <div key={m.label} style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px', gap: 12, alignItems: 'center',
                    padding: '10px 12px', borderRadius: 12, background: '#FAFAFB', border: '1px solid #ECECEF',
                    animation: 'pol-fade-in 320ms ease-out', animationDelay: `${i * 40}ms`, animationFillMode: 'backwards',
                    position: 'relative',
                  }}>
                    {m.live && (
                      <span style={{
                        position: 'absolute', top: 6, right: 8, fontSize: 8, fontWeight: 700,
                        color: '#16A34A', letterSpacing: '0.06em',
                      }}>● LIVE</span>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#3a3a3d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', color: '#1d1d1f', lineHeight: 1.15 }}>{m.value}</div>
                      <div style={{ fontSize: 11, color: deltaColor, marginTop: 1, fontWeight: 500 }}>{m.dir === 'up' ? '↑' : '↓'} {m.delta}</div>
                    </div>
                    <Sparkline data={m.data} color={deltaColor}/>
                  </div>
                )
              })}
              {!data?.macro && Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} height={56} radius={12}/>
              ))}
            </div>
          </section>
        </div>

        {/* ── Intelligence Feed (414 medios → Ollama → análisis estructurado) ── */}
        <IntelligenceFeed/>

        {/* ── News Pulse + Territory ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 18, marginBottom: 20 }}>
          <section style={{ background: '#fff', borderRadius: 16, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>
                Pulso informativo
              </h2>
              <span style={{ fontSize: 11, color: '#6E6E73', cursor: 'pointer' }} onClick={() => router.push('/medios')}>Ver feed completo →</span>
            </div>
            {data?.news_pulse && data.news_pulse.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.news_pulse.slice(0, 5).map((n, i) => {
                  const sentColor = n.sentiment > 0.2 ? '#16A34A' : n.sentiment < -0.2 ? '#DC2626' : '#6E6E73'
                  const relW = Math.min(100, n.relevance * 100)
                  return (
                    <div key={n.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 80px', gap: 14, padding: '10px 0',
                      borderBottom: '1px solid var(--hairline)',
                      animation: 'pol-fade-in 360ms ease-out', animationDelay: `${i * 60}ms`, animationFillMode: 'backwards',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.4, fontWeight: 500, marginBottom: 4 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink-4)', display: 'flex', gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>{n.source}</span>
                          {n.parties && <span>· {n.parties}</span>}
                          {n.date && <span>· {new Date(n.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                        <div style={{ width: 70, height: 4, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${relW}%`, height: '100%', background: sentColor, transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)' }}/>
                        </div>
                        <span style={{ fontSize: 9.5, color: sentColor, fontWeight: 600, letterSpacing: '0.03em' }}>
                          {n.sentiment > 0.1 ? '+' : ''}{n.sentiment.toFixed(2)} sent
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} height={50} radius={6}/>
                ))}
              </div>
            )}
          </section>

          <section style={{ background: '#fff', borderRadius: 20, padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #ECECEF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>Mapa territorial</h2>
              <span style={{ fontSize: 11, color: '#6E6E73', background: '#F5F5F7', borderRadius: 999, padding: '4px 11px', letterSpacing: '0.06em', fontWeight: 500 }}>17 CC.AA.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REGION_GRID.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 6 }}>
                  {row.map(cell => {
                    const region = data?.regions?.find(r => r.name === cell.name)
                    const lean = (region?.lean ?? 'mixed') as 'pp' | 'psoe' | 'mixed'
                    return (
                      <div
                        key={cell.name}
                        title={region ? `${cell.name} · PP ${region.pp_pct}% · PSOE ${region.psoe_pct}% · Δ ${region.diff > 0 ? '+' : ''}${region.diff}` : cell.name}
                        style={{
                          flex: cell.flex, height: cell.height, background: REGION_COLOR[lean], borderRadius: 8,
                          padding: '8px 12px', color: '#fff',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                          transition: 'background 600ms ease, transform 200ms', cursor: 'help',
                        }}
                      >
                        <div style={{ fontSize: 11.5, fontWeight: 500, opacity: 0.78, letterSpacing: '-0.005em' }}>{cell.display}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.012em', lineHeight: 1 }}>{REGION_LABEL[lean]}</div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Coalition scenarios ── */}
        <section onClick={() => router.push('/escenarios')}
                 style={{ background: '#1d1d1f', borderRadius: 20, padding: '26px 30px', color: '#fff', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>
              <LiveDot color="#5DBC52"/>
              Escenarios de mayoría
            </h2>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>Ver todos →</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {(data?.coalitions ?? []).slice(0, 4).map((s, i) => {
              const numColor = s.viable ? '#5DBC52' : '#F38A19'
              const TOTAL = 350, MAJ = 176
              return (
                <div key={s.id}
                     onClick={(e) => { e.stopPropagation(); router.push(`/escenarios#${s.id}`) }}
                     style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 22, alignItems: 'center', cursor: 'pointer',
                              animation: 'pol-fade-in 360ms ease-out', animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 9, color: 'rgba(255,255,255,0.88)', letterSpacing: '-0.005em' }}>{s.name}</div>
                    <div style={{ position: 'relative', height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 999 }}>
                      <div style={{
                        width: `${Math.min(100, s.seats / TOTAL * 100)}%`, height: '100%',
                        background: s.viable ? 'linear-gradient(90deg, #5DBC52, #2D4A8A)' : '#F38A19',
                        borderRadius: 999, transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)',
                      }}/>
                      <div style={{ position: 'absolute', left: `${MAJ / TOTAL * 100}%`, top: -3, bottom: -3, width: 1.5, background: 'rgba(255,255,255,0.55)', transform: 'translateX(-50%)' }}/>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>
                      <span>{s.n_partidos} partidos</span>
                      {s.es_minima && <span>· coalición mínima</span>}
                      <span>· viabilidad {(s.viability * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.022em', color: numColor, lineHeight: 1, textAlign: 'right' }}>
                    <CountUp value={s.seats}/>
                  </div>
                </div>
              )
            })}
            {!data?.coalitions && Array.from({ length: 3 }, (_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 22, alignItems: 'center' }}>
                <div>
                  <Skeleton width={200} height={13} radius={4} style={{ marginBottom: 9, background: 'rgba(255,255,255,0.10)' }}/>
                  <Skeleton height={7} radius={999} style={{ background: 'rgba(255,255,255,0.10)' }}/>
                </div>
                <Skeleton width={50} height={30} radius={6} style={{ background: 'rgba(255,255,255,0.10)' }}/>
              </div>
            ))}
          </div>
        </section>

        {/* ── Risk strip ── */}
        {data?.risk && (
          <section style={{
            marginTop: 16, background: '#fff', borderRadius: 16, padding: '18px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: data.risk.semaforo === 'rojo' ? '#FEE2E2' : data.risk.semaforo === 'naranja' ? '#FED7AA' : data.risk.semaforo === 'amarillo' ? '#FEF3C7' : '#D1FAE5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
                color: data.risk.semaforo === 'rojo' ? '#991B1B' : data.risk.semaforo === 'naranja' ? '#9A3412' : data.risk.semaforo === 'amarillo' ? '#92400E' : '#065F46',
              }}>
                <CountUp value={data.risk.score} decimals={data.risk.score < 100 ? 1 : 0}/>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Termómetro de Riesgo Político</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                  Semáforo {data.risk.semaforo}
                </div>
                {data.risk.score_news_boost != null && data.risk.score_news_boost > 0 && (
                  <div style={{ fontSize: 10.5, color: '#D97706', marginTop: 4, fontWeight: 500 }}>
                    📰 +{data.risk.score_news_boost} pts por noticias críticas en 24h
                    {data.risk.score_base != null && <> (base {data.risk.score_base.toFixed(1)})</>}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => router.push('/riesgo')} style={{
              background: '#F5F5F7', border: 'none', padding: '8px 16px', borderRadius: 999,
              fontSize: 12, fontWeight: 500, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit',
            }}>Análisis completo →</button>
          </section>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--hairline)', padding: '22px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        <span style={{ marginRight: 12 }}>Politeia Analítica · {new Date().getFullYear()}</span>
        <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={60}/>
      </footer>
    </div>
  )
}
