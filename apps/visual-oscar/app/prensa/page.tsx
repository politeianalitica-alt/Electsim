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
import { NarrativeClustersView } from './_components/NarrativeClustersView'

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
  // Sprint M2 · narrativas auditables + figuras v2 + resumen lecturas
  narrative_clusters?: Array<{
    id: string
    title: string
    short_summary: string
    frame_type: string
    main_topic: string
    secondary_topics: string[]
    articles: string[]
    representative_titles: string[]
    first_seen: string
    last_seen: string
    velocity_score: number
    acceleration_score: number
    reach_estimate: number
    source_diversity?: { warnings?: string[]; ideological_balance_score?: number }
    ideological_spread: { left: number; center: number; right: number; balanced: boolean }
    territorial_spread: string[]
    dominant_actors: string[]
    benefited_actors: string[]
    harmed_actors: string[]
    emotional_register: string
    controversy_score: number
    confidence: { overall: number; reasons: string[] }
    why_this_is_a_narrative: string
    evidence: Array<{ title: string; medium: string; url: string; ideology: string }>
  }>
  readings_summary?: {
    n_readings: number
    dominant_frames: Array<{ frame: string; count: number }>
    avg_controversy: number
    avg_political_risk: number
    avg_confidence: number
    top_beneficiaries: Array<{ actor: string; count: number }>
    top_affected: Array<{ actor: string; count: number }>
    action_verbs: Array<{ verb: string; count: number }>
  }
}

type BalanceMode = 'audience' | 'pluralism' | 'regional' | 'ideological' | 'crisis'

// Sprint M2 · explainer por tab · responde "¿a qué pregunta sirve esta tab?"
function TabExplainerBlock({ question, answer }: { question: string; answer: string }) {
  return (
    <section style={{
      background: '#f8fafc',
      border: '1px solid #e5e7eb',
      borderLeft: '3px solid #0891b2',
      borderRadius: 8,
      padding: '10px 14px',
    }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#0891b2', textTransform: 'uppercase' }}>
        ◆ Esta tab responde
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
        {question}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
        {answer}
      </p>
    </section>
  )
}

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
              {/* Tab 1 · Pulso de medios · responde "qué está dominando la agenda ahora" */}
              {safeActiveTab === 'pulso' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué está dominando ahora mismo la agenda mediática?"
                    answer="Narrativas auditables emergentes del cruce ACLED+UCDP+RSS+GDELT, feed por tiers nacionales/europeos/regionales y heatmap topic × partido."
                  />
                  {data?.narrative_clusters && data.narrative_clusters.length > 0 && (
                    <NarrativeClustersView clusters={data.narrative_clusters} />
                  )}
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

              {/* Tab 2 · Búsqueda puntual · responde "qué se ha publicado sobre X" */}
              {safeActiveTab === 'busqueda' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué se ha publicado sobre X tema o actor?"
                    answer="Búsqueda libre NewsAPI everything con filtros booleanos + dominios + fechas · timeline · fuentes · actores · comparación ideológica · lectura IA basada en datos estructurados."
                  />
                  <BusquedaPuntual />
                </div>
              )}

              {/* Tab 3 · Mapa global · responde "qué eventos externos generan narrativas para España" */}
              {safeActiveTab === 'mapa-global' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué eventos externos están generando narrativas con relevancia para España?"
                    answer="World map ACLED+GDELT por categoría · cada país/evento con volumen mediático + severidad + relevancia España + frame dominante + confianza + explicación."
                  />
                  <MapaNarrativasGlobal />
                </div>
              )}

              {/* Tab 4 · Actores & sentimiento · responde "quién aparece y si le beneficia" */}
              {safeActiveTab === 'actores-sentimiento' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Quién aparece, cómo aparece y si le beneficia o perjudica?"
                    answer="Sentiment HACIA cada actor separado de mention plana · impacto político (beneficial/harmful/neutral/uncertain) con confianza y razón."
                  />
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

              {/* Tab 5 · Cobertura ideológica · responde "cómo cambia el framing por bloque" */}
              {safeActiveTab === 'cobertura-ideologica' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Cómo cambia el framing según el bloque mediático?"
                    answer="Cada narrativa muestra su barra ideológica izq/centro/der · si está balanceada o sesgada · diff de frames y actores enfatizados por cada bloque."
                  />
                  {data?.narrative_clusters && data.narrative_clusters.length > 0 && (
                    <NarrativeClustersView clusters={data.narrative_clusters} />
                  )}
                  <NarrativesV3View />
                  <StoryClustersView clusters={data?.clusters ?? []} />
                </div>
              )}

              {/* Tab 6 · Viralidad · responde "qué historias se propagan más rápido" */}
              {safeActiveTab === 'viralidad' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué historias se están propagando más rápido?"
                    answer="Velocity + acceleration + first_seen + first_movers + replication path · señales de aceleración multi-fuente con NewsAPI sortBy=popularity."
                  />
                  <ViralidadDifusion />
                </div>
              )}

              {/* Tab 7 · Análisis IA Groq · responde "qué lectura ejecutiva produce Politeia" */}
              {safeActiveTab === 'analisis-ia' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué lectura ejecutiva produce Politeia sobre el conjunto?"
                    answer="IA recibe ArticleReading + NarrativeCluster + SourceMethodology + Confidence (no sólo titulares) y produce briefing ejecutivo + hallazgos + riesgo framing + qué vigilar."
                  />
                  <AnalisisGroq />
                </div>
              )}

              {/* Tab 8 · Desinformación · responde "qué claims son sospechosos" */}
              {safeActiveTab === 'desinformacion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué claims están verificados o son sospechosos?"
                    answer="Maldita + Newtral + EFE Verifica + Google Fact Check · cada claim con narrativa afectada + actores beneficiados/perjudicados."
                  />
                  <DesinformacionLive />
                </div>
              )}

              {/* Tab 9 · Regional · responde "qué CCAA concentran tensión" */}
              {safeActiveTab === 'regional' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué CCAA concentran tensión mediática y política?"
                    answer="Separa origen del medio · territorio mencionado · territorio afectado · regional_signal_score = volumen + negatividad + relevancia institucional/electoral + diversidad fuentes."
                  />
                  <IntelRegional />
                </div>
              )}

              {/* Tab 10 · Informes · responde "cómo exportar y monitorizar" */}
              {safeActiveTab === 'informes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Cómo exportar o monitorizar esta inteligencia?"
                    answer="Búsquedas guardadas · monitores · dossier MD/HTML export con metodología incluida y advertencias auditables · plantillas alertas."
                  />
                  <InformesAlertas />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </MediosDrawerProvider>
  )
}
