'use client'

/**
 * /prensa — Pulso de Prensa · Hub completo de análisis de medios.
 *
 * 6 pestañas estructuradas:
 *   1. Feed inteligente · multi-tier (nacional/europeo/regional/local)
 *   2. Mapa · sentimiento regional clickable con drill por CCAA
 *   3. Narrativas · anatomía profunda (audiencia, canales, mensajes, objetivos)
 *   4. Sentimiento · topic × party heatmap + impacto en figuras
 *   5. Figuras · análisis sentiment por persona pública con tendencia
 *   6. Cobertura · story clusters comparando el mismo evento por medios
 *
 * Todo conectado a /api/medios/intel (consolidado) + /api/medios/ccaa (drill).
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import { LiveDot } from '@/components/Skeleton'
import FeedTiered from './_components/FeedTiered'
import SentimentMapInteractive from './_components/SentimentMapInteractive'
import NarrativesDeepView from './_components/NarrativesDeepView'
import SentimentDualView from './_components/SentimentDualView'
import StoryClustersView from './_components/StoryClustersView'
import type { TieredFeed, NarrativeAnatomy, TopicPartyCell, FigureSentimentDeep, StoryCluster, CoverageGap, CompanySentiment, SectorSentiment } from '@/lib/news-intel'
import type { CCAARegionStat } from '@/lib/news-aggregator'

interface IntelResponse {
  meta:       { updatedAt: string; total: number; hours: number; sources: number }
  feed?:      TieredFeed
  narratives?: NarrativeAnatomy[]
  topicparty?: TopicPartyCell[]
  figures?:    FigureSentimentDeep[]
  companies?:  CompanySentiment[]
  sectors?:    SectorSentiment[]
  clusters?:   StoryCluster[]
  gaps?:       CoverageGap[]
  ccaa?:       Record<string, CCAARegionStat>
}

type Tab = 'feed' | 'mapa' | 'narrativas' | 'sentimiento' | 'cobertura'

const TABS: Array<{ id: Tab; label: string; glyph: string; description: string }> = [
  { id: 'feed',         label: 'Feed inteligente', glyph: '⊞', description: 'Multi-tier + categorías temáticas dinámicas' },
  { id: 'mapa',         label: 'Mapa',             glyph: '◉', description: 'Sentimiento regional con drill provincial + figuras y empresas por CCAA' },
  { id: 'narrativas',   label: 'Narrativas',       glyph: '✦', description: 'Anatomía: audiencia, canales, mensajes, objetivos, figuras, empresas' },
  { id: 'sentimiento',  label: 'Sentimiento',      glyph: '◐', description: 'Vista política (partidos × temas) y vista empresarial (IBEX/sectores)' },
  { id: 'cobertura',    label: 'Cobertura',        glyph: '◫', description: 'Misma historia, distintos framings ideológicos' },
]

export default function PrensaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<Tab>('feed')
  const [hours, setHours] = useState<24 | 48 | 72 | 168>(72)
  const { data, source, loading, refresh, updatedAt } = useApi<IntelResponse>(
    `/api/medios/intel?hours=${hours}&sources=50`,
    { refreshInterval: 300_000 },
  )

  const meta = data?.meta
  const totalArticles = meta?.total ?? 0
  const isFresh = !!updatedAt && Date.now() - new Date(updatedAt).getTime() < 600_000

  return (
    <div style={{ background: 'var(--bg, #fbfbfd)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section style={{
          background: 'linear-gradient(135deg,#1F4E8C 0%,#0B2447 100%)',
          borderRadius: 22, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.78, margin: '0 0 6px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <LiveDot color={isFresh ? '#10b981' : '#f59e0b'} />
              <span>PULSO DE PRENSA · INTELIGENCIA DE MEDIOS</span>
              {source === 'mock' && <span style={{ background: 'rgba(245,158,11,0.20)', padding: '1px 8px', borderRadius: 999 }}>DEMO</span>}
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {totalArticles > 0 ? totalArticles : '…'} noticias · {meta?.sources ?? '…'} medios
              {' '}
              <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>analizadas en las últimas {hours}h</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.72, margin: 0, lineHeight: 1.5, maxWidth: 580 }}>
              Feed multi-tier, mapa interactivo, anatomía de narrativas, sentimiento por partido y figura, cobertura comparada. Todo derivado del agregador RSS en tiempo real.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, position: 'relative' }}>
            {(data?.feed?.counts ? Object.entries(data.feed.counts) : []).map(([tier, n]) => (
              <div key={tier} style={{
                textAlign: 'center', padding: '12px 8px 10px', borderRadius: 12,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{n}</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.74, marginTop: 5, textTransform: 'uppercase' }}>{tier}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Controles globales ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ventana:</span>
          <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 999, padding: 3, border: '1px solid #ECECEF' }}>
            {([24, 48, 72, 168] as const).map(h => (
              <button key={h} onClick={() => setHours(h)} style={{
                background: hours === h ? '#1F4E8C' : 'transparent',
                color:      hours === h ? '#fff'    : '#3a3a3d',
                border: 'none', borderRadius: 999, padding: '5px 12px',
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {h < 168 ? `${h}h` : '7d'}
              </button>
            ))}
          </div>

          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#6e6e73' }}>
            {loading ? 'Cargando…' :
              updatedAt ? `Actualizado hace ${Math.max(1, Math.round((Date.now() - new Date(updatedAt).getTime()) / 60_000))} min` : '—'}
            <button onClick={refresh} style={{
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 8, padding: '5px 10px',
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#3a3a3d',
            }}>↻ Refrescar</button>
          </span>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ECECEF', marginBottom: 18, overflowX: 'auto' }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} title={t.description} style={{
                background: 'transparent',
                color: active ? '#1F4E8C' : '#6e6e73',
                border: 0,
                borderBottom: active ? '2px solid #1F4E8C' : '2px solid transparent',
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: -1,
              }}>
                <span style={{ fontSize: 14, color: active ? '#1F4E8C' : '#9ca3af' }}>{t.glyph}</span>
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* ── Contenido por pestaña ────────────────────────────────── */}
        {loading && !data ? (
          <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Agregando feed RSS de 50 medios…</div>
            <div style={{ fontSize: 12 }}>Primera carga puede tardar 8-15 segundos</div>
          </div>
        ) : (
          <>
            {tab === 'feed'        && <FeedTiered feed={data?.feed} />}
            {tab === 'mapa'        && <SentimentMapInteractive ccaaData={data?.ccaa} />}
            {tab === 'narrativas'  && <NarrativesDeepView narratives={data?.narratives ?? []} gaps={data?.gaps ?? []} />}
            {tab === 'sentimiento' && <SentimentDualView
                                        cells={data?.topicparty ?? []}
                                        figures={data?.figures ?? []}
                                        companies={data?.companies ?? []}
                                        sectors={data?.sectors ?? []} />}
            {tab === 'cobertura'   && <StoryClustersView clusters={data?.clusters ?? []} />}
          </>
        )}
      </main>
    </div>
  )
}
