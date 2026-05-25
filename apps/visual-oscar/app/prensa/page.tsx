'use client'

/**
 * /prensa · Media Intelligence Hub · 10 subtabs · iteración 2.
 *
 *  1. Pulso de medios       · feed RSS + GDELT + agenda topics (merge ex-Radar/Agenda)
 *  2. Búsqueda puntual      · NewsAPI rich search + Lectura IA + dossier
 *  3. Mapa global narrativas · world map ACLED+GDELT por categoría (NUEVO)
 *  4. Actores & sentimiento · figuras + empresas + sentimiento (merge ex-Actores+Sentimiento)
 *  5. Cobertura ideológica  · story clusters izq vs der (ex-Cobertura)
 *  6. Viralidad & difusión  · popularity + first-movers
 *  7. Análisis IA · Groq    · razonamiento LLM sobre contexto live (NUEVO)
 *  8. Desinformación        · Google Fact Check + RSS fact-checkers (integrado)
 *  9. Inteligencia regional · CCAA (NUEVO/extraído del mapa antiguo)
 *  10. Informes & alertas   · monitores + dossier + lectura
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import { LiveDot } from '@/components/Skeleton'

import FeedTiered from './_components/FeedTiered'
import NarrativesDeepView from './_components/NarrativesDeepView'
import NarrativesV3View from './_components/NarrativesV3View'
import SentimentDualView from './_components/SentimentDualView'
import StoryClustersView from './_components/StoryClustersView'
import TopicPartyHeatmap from './_components/TopicPartyHeatmap'

import { MediosDrawerProvider } from './_components/MediosDrawerProvider'
import { MediosTabsNav, MediosSourceBadges } from './_components/MediosTabsNav'
import { BusquedaPuntual } from './_components/BusquedaPuntual'
import { ViralidadDifusion } from './_components/ViralidadDifusion'
import { InformesAlertas } from './_components/InformesAlertas'
import { DesinformacionLive } from './_components/DesinformacionLive'
import { GdeltGlobalPanel } from './_components/GdeltGlobalPanel'
import { MapaNarrativasGlobal } from './_components/MapaNarrativasGlobal'
import { AnalisisGroq } from './_components/AnalisisGroq'
import { IntelRegional } from './_components/IntelRegional'
import { MEDIOS_TAB_IDS, getMediosTab, MediosTabId } from '@/lib/medios/sources-matrix'
import { SourceMethodologyCard, ConfidenceBadge, MethodologyWarnings } from './_components/MethodologyComponents'

import type {
  TieredFeed, NarrativeAnatomy, TopicPartyCell, FigureSentimentDeep,
  StoryCluster, CoverageGap, CompanySentiment, SectorSentiment,
} from '@/lib/news-intel'
import type { CCAARegionStat } from '@/lib/news-aggregator'

interface ApiMeta {
  source: string
  ts: string
  latency_ms: number
  warnings: string[]
  methodology_version: string
  sources_requested?: number
  sources_used?: number
  articles_read?: number
  confidence?: number
}

interface IntelResponse {
  meta: { updatedAt: string; total: number; hours: number; sources: number }
  _meta?: ApiMeta
  feed?: TieredFeed
  narratives?: NarrativeAnatomy[]
  topicparty?: TopicPartyCell[]
  figures?: FigureSentimentDeep[]
  companies?: CompanySentiment[]
  sectors?: SectorSentiment[]
  clusters?: StoryCluster[]
  gaps?: CoverageGap[]
  ccaa?: Record<string, CCAARegionStat>
  source_methodology?: {
    selected_sources: number
    eligible_sources: number
    catalog_total: number
    balance_mode: string
    ideological_distribution: Record<string, number>
    territorial_distribution: Record<string, number>
    media_type_distribution: Record<string, number>
    group_distribution: Array<{ group: string; count: number; share: number }>
    ccaa_distribution: Array<{ ccaa: string; count: number }>
    ideological_balance_score: number
    territorial_balance_score: number
    type_balance_score: number
    credibility_avg: number
    audience_total_M: number
    warnings: string[]
    copy_for_hero?: string
  }
}

type BalanceMode = 'audience' | 'pluralism' | 'regional' | 'ideological' | 'crisis'

export default function PrensaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [activeTab, setActiveTab] = useUrlState<MediosTabId>('tab', 'pulso')
  const safeActiveTab: MediosTabId = (MEDIOS_TAB_IDS as readonly string[]).includes(activeTab)
    ? activeTab
    : 'pulso'
  const tab = getMediosTab(safeActiveTab)

  const [hours, setHours] = useState<24 | 48 | 72 | 168>(72)
  // Sprint M1 · 100 fuentes + balance_mode pluralism por defecto + toggle metodología
  const [balanceMode, setBalanceMode] = useUrlState<BalanceMode>('balance', 'pluralism')
  const [showMethodology, setShowMethodology] = useState(false)
  const tabsThatNeedIntel: MediosTabId[] = ['pulso', 'actores-sentimiento', 'cobertura-ideologica']
  const needsIntel = tabsThatNeedIntel.includes(safeActiveTab)
  const { data, source, loading, refresh, updatedAt } = useApi<IntelResponse>(
    `/api/medios/intel?hours=${hours}&sources=${needsIntel ? 100 : 0}&balance_mode=${balanceMode}`,
    { refreshInterval: needsIntel ? 300_000 : 0 },
  )

  const meta = data?.meta
  const _meta = data?._meta
  const methodology = data?.source_methodology
  const totalArticles = meta?.total ?? 0
  const isFresh = !!updatedAt && Date.now() - new Date(updatedAt).getTime() < 600_000

  return (
    <MediosDrawerProvider>
      <div style={{ background: '#fbfbfd', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
        <AppHeader />
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '20px 28px 80px' }}>

          {/* Hero compacto */}
          <section
            style={{
              background: `linear-gradient(135deg, ${tab.themeAccent}EE 0%, ${tab.themeAccent}AA 100%)`,
              borderRadius: 14,
              padding: '16px 22px',
              marginBottom: 14,
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.14, textTransform: 'uppercase', opacity: 0.86, margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                <LiveDot color={isFresh ? '#86efac' : '#fde68a'} />
                <span>MEDIOS · INTELLIGENCE · Tab {tab.number} · {tab.label}</span>
                {source === 'mock' && <span style={{ background: 'rgba(255,255,255,0.20)', padding: '1px 8px', borderRadius: 999 }}>DEMO</span>}
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 0', lineHeight: 1.1, maxWidth: 760 }}>
                {tab.description}
              </h1>
              {needsIntel && (
                <p style={{ fontSize: 11, opacity: 0.86, margin: '6px 0 0' }}>
                  {totalArticles > 0
                    ? (methodology?.copy_for_hero
                        ? `${totalArticles} noticias · ${methodology.copy_for_hero}`
                        : `${totalArticles} noticias · ${methodology?.selected_sources ?? meta?.sources ?? '…'}/${methodology?.catalog_total ?? '?'} medios analizados (modo "${balanceMode}")`)
                    : 'Cargando feed RSS…'}
                </p>
              )}
              {needsIntel && _meta?.confidence !== undefined && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <ConfidenceBadge value={_meta.confidence} label="confianza muestra" size="xs" reasons={_meta.warnings} />
                  <button
                    onClick={() => setShowMethodology(!showMethodology)}
                    style={{
                      background: 'rgba(255,255,255,0.16)',
                      color: '#fff', border: 'none',
                      padding: '3px 10px', borderRadius: 4,
                      fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.4,
                      fontFamily: 'inherit',
                    }}
                  >
                    {showMethodology ? '× ocultar metodología' : '◆ ver metodología'}
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <MediosSourceBadges tab={tab} />
              {needsIntel && (
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.16)', borderRadius: 999, padding: 3 }}>
                  {([24, 48, 72, 168] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setHours(h)}
                      style={{
                        background: hours === h ? '#fff' : 'transparent',
                        color: hours === h ? tab.themeAccent : '#fff',
                        border: 'none', borderRadius: 999, padding: '4px 12px',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {h < 168 ? `${h}h` : '7d'}
                    </button>
                  ))}
                </div>
              )}
              {needsIntel && (
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.16)', borderRadius: 999, padding: 3 }}>
                  {(['pluralism', 'audience', 'regional', 'ideological', 'crisis'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setBalanceMode(m)}
                      title={`Balance · ${m}`}
                      style={{
                        background: balanceMode === m ? '#fff' : 'transparent',
                        color: balanceMode === m ? tab.themeAccent : '#fff',
                        border: 'none', borderRadius: 999, padding: '3px 10px',
                        fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      {m === 'pluralism' ? 'plural' : m.slice(0, 6)}
                    </button>
                  ))}
                </div>
              )}
              {updatedAt && (
                <span style={{ fontSize: 10, opacity: 0.78 }}>
                  Actualizado hace {Math.max(1, Math.round((Date.now() - new Date(updatedAt).getTime()) / 60_000))} min
                  {' · '}
                  <button onClick={refresh} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 10 }}>
                    ↻ refrescar
                  </button>
                </span>
              )}
            </div>
          </section>

          {/* Sprint M1 · Metodología de fuentes (colapsable) */}
          {showMethodology && methodology && (
            <div style={{ marginBottom: 14 }}>
              <SourceMethodologyCard data={methodology} />
            </div>
          )}
          {needsIntel && !showMethodology && methodology && methodology.warnings.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <MethodologyWarnings warnings={methodology.warnings} title="Sesgo de muestra detectado" />
            </div>
          )}

          {/* Sub-nav 10 tabs */}
          <MediosTabsNav activeId={safeActiveTab} onTabChange={setActiveTab} />

          {/* Contenido */}
          {loading && !data && needsIntel ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Agregando feed RSS de 50 medios…</div>
              <div style={{ fontSize: 11 }}>Primera carga puede tardar 8-15 segundos</div>
            </div>
          ) : (
            <>
              {/* Tab 1 · Pulso de medios · feed + GDELT + topic heatmap (NO mapa CCAA, ya está en Tab 9) */}
              {safeActiveTab === 'pulso' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <FeedTiered feed={data?.feed} />
                  <GdeltGlobalPanel query="Spain" />
                  {data?.topicparty && data.topicparty.length > 0 && (
                    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
                      <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Agenda mediática · topic × partido heatmap
                      </p>
                      <div style={{ marginTop: 8 }}>
                        <TopicPartyHeatmap cells={data.topicparty} figures={data.figures ?? []} />
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Tab 2 · Búsqueda puntual */}
              {safeActiveTab === 'busqueda' && <BusquedaPuntual />}

              {/* Tab 3 · Mapa global narrativas (NUEVO) */}
              {safeActiveTab === 'mapa-global' && <MapaNarrativasGlobal />}

              {/* Tab 4 · Actores & sentimiento (merge ex-Actores + Sentimiento) */}
              {safeActiveTab === 'actores-sentimiento' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <SentimentDualView
                    cells={data?.topicparty ?? []}
                    figures={data?.figures ?? []}
                    companies={data?.companies ?? []}
                    sectors={data?.sectors ?? []}
                  />
                  {(data?.narratives ?? []).length > 0 && (
                    <NarrativesDeepView narratives={data?.narratives ?? []} gaps={data?.gaps ?? []} />
                  )}
                </div>
              )}

              {/* Tab 5 · Cobertura ideológica */}
              {safeActiveTab === 'cobertura-ideologica' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <NarrativesV3View />
                  <StoryClustersView clusters={data?.clusters ?? []} />
                </div>
              )}

              {/* Tab 6 · Viralidad */}
              {safeActiveTab === 'viralidad' && <ViralidadDifusion />}

              {/* Tab 7 · Análisis IA Groq (NUEVO) */}
              {safeActiveTab === 'analisis-ia' && <AnalisisGroq />}

              {/* Tab 8 · Desinformación */}
              {safeActiveTab === 'desinformacion' && <DesinformacionLive />}

              {/* Tab 9 · Regional CCAA (extraído del mapa antiguo, ahora autocontenido) */}
              {safeActiveTab === 'regional' && <IntelRegional />}

              {/* Tab 10 · Informes */}
              {safeActiveTab === 'informes' && <InformesAlertas />}
            </>
          )}
        </main>
      </div>
    </MediosDrawerProvider>
  )
}
