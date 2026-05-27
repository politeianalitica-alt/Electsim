'use client'

/**
 * /prensa · Media Intelligence Hub · Sprint M3 · 7 tabs como FLUJO ANALÍTICO.
 *
 * Reorganización (anterior 10 tabs → 7 tabs):
 *
 *   1. Pulso                · ¿Qué pasa AHORA?
 *   2. Búsqueda             · ¿Qué se publicó sobre X?
 *   3. Narrativas & framing · ¿Qué narrativas se forman + cómo, por quién?
 *   4. Actores e impacto    · ¿A quién afecta y cómo?
 *   5. Mapas de impacto     · ¿Dónde impacta? España/CCAA + Global
 *   6. Desinformación       · ¿Qué es falso o dudoso?
 *   7. Informes & monitores · ¿Qué guardo/exporto/monitorizo?
 *
 * Capas transversales (no son tabs):
 *   - <ViralidadStrip />        · "historias que aceleran" inline en Pulso/Narrativas/Búsqueda/Informes
 *   - <LecturaPoliteiaPanel />  · IA reusable en cualquier tab con contexto estructurado
 *
 * URLs legacy: migrateLegacyTab() en sources-matrix mapea
 *   viralidad      → narrativas
 *   analisis-ia    → pulso
 *   cobertura-ideologica → narrativas
 *   mapa-global    → mapas
 *   regional       → mapas
 *   actores-sentimiento → actores
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import { LiveDot } from '@/components/Skeleton'

import FeedTiered from './_components/FeedTiered'
// Sprint G15 FASE C · gráfico de importancia temática arriba del feed en Pulso
import TopicImportanceChart, { type TopicImportanceItem } from './_components/TopicImportanceChart'
// Sprint G15 FASE D4 · workbench unificado de narrativas (reemplaza apilamiento)
import NarrativesFramingWorkbench, { type WorkbenchNarrative } from './_components/NarrativesFramingWorkbench'
// NarrativesDeepView, NarrativesV3View, SentimentDualView, StoryClustersView ya no se usan
// (sustituidos por NarrativesFramingWorkbench en narrativas y TendenciasImpactoView en tendencias).
// Se conservan en _components/ para evitar romper rutas legacy y por si se reusan en informes.
import TopicPartyHeatmap from './_components/TopicPartyHeatmap'

import { MediosDrawerProvider } from './_components/MediosDrawerProvider'
import { MediosTabsNav, MediosSourceBadges } from './_components/MediosTabsNav'
import { BusquedaPuntual } from './_components/BusquedaPuntual'
import { ViralidadDifusion } from './_components/ViralidadDifusion'
// InformesAlertas ya no se importa aquí · vive embebido dentro de MapaMediosView.
import { MapaMediosView } from './_components/MapaMediosView'
// DesinformacionLive ya no se importa aquí · ahora vive embebido en ObservatorioInformacionView.
import { ObservatorioInformacionView } from './_components/ObservatorioInformacionView'
import { GdeltGlobalPanel } from './_components/GdeltGlobalPanel'
import {
  MEDIOS_TAB_IDS, getMediosTab, MediosTabId, migrateLegacyTab,
} from '@/lib/medios/sources-matrix'
import {
  SourceMethodologyCard, ConfidenceBadge, MethodologyWarnings,
} from './_components/MethodologyComponents'
import { NarrativeClustersView } from './_components/NarrativeClustersView'
import { TendenciasImpactoView } from './_components/TendenciasImpactoView'
import { LecturaPoliteiaPanel, type LecturaContext } from './_components/LecturaPoliteiaPanel'
import { MapasImpacto } from './_components/MapasImpacto'
import {
  MetodologiaConfianzaPanel, FramingComparisonPanel,
  CoverageGapsPanel, FollowupQueriesPanel,
} from './_components/AnalysisPanels'
// ActoresImpactoPanel ya no se usa aquí · TendenciasImpactoView lo reemplaza.

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
  // Sprint M4 FASE B · mismo análisis que NewsAPI search
  framing_comparison?: Array<{
    bucket: string
    count: number
    dominant_topics: { topic: string; count: number }[]
    dominant_frames: { frame: string; count: number }[]
    actors_emphasized: { actor: string; mentions: number }[]
    actors_omitted: string[]
    average_tone: number
    controversy_score: number
    representative_titles: string[]
    distinctive_terms: { term: string; lift: number }[]
    interpretation: string
  }>
  actor_impacts?: Array<{
    actor: string
    mentions: number
    dominant_impact: 'beneficial' | 'harmful' | 'neutral' | 'uncertain'
    beneficial: number
    harmful: number
    neutral: number
    uncertain: number
    sample_reasons: string[]
  }>
  coverage_gaps?: Array<{ topic: string; total_mentions: number; interpretation: string }>
  methodology_confidence?: { overall: number; reasons: string[] }
  analysis_warnings?: Array<{ level: 'info' | 'warning' | 'critical'; category: string; message: string; evidence?: string }>
  suggested_followup_queries?: Array<{ query: string; reason: string; expected_focus: string }>
  figures_v2?: Array<{
    name: string
    mentions: number
    avg_sentiment: number
    avg_confidence: number
    beneficial_count: number
    harmful_count: number
    neutral_count: number
    uncertain_count: number
    top_frames: Array<{ frame: string; count: number }>
    top_mediums: Array<{ medium: string; count: number }>
  }>
}

type BalanceMode = 'audience' | 'pluralism' | 'regional' | 'ideological' | 'crisis'

// Mini explainer · pregunta + respuesta arriba de cada tab
function TabExplainerBlock({ question, answer }: { question: string; answer: string }) {
  return (
    <section style={{
      background: '#f8fafc', border: '1px solid #e5e7eb', borderLeft: '3px solid #0891b2',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#0891b2', textTransform: 'uppercase' }}>
        ◆ Esta tab responde
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>{question}</p>
      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{answer}</p>
    </section>
  )
}

// Strip "historias que aceleran" · capa transversal de viralidad
function ViralidadStrip({ clusters, mode = 'compact' }: {
  clusters: NonNullable<IntelResponse['narrative_clusters']>
  mode?: 'compact' | 'full'
}) {
  const accelerating = (clusters || [])
    .filter((c) => c.acceleration_score >= 0.1 || c.velocity_score >= 0.5)
    .sort((a, b) => b.acceleration_score - a.acceleration_score)
    .slice(0, mode === 'compact' ? 5 : 12)
  if (accelerating.length === 0) {
    if (mode === 'compact') return null
    return <ViralidadDifusion />
  }
  return (
    <section style={{
      background: '#fff', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b',
      borderRadius: 10, padding: 14,
    }}>
      <header style={{ marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#b45309', textTransform: 'uppercase' }}>
          ◆ Historias que aceleran · viralidad
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#475569' }}>
          Narrativas con velocity ≥ 0.5 art/h o aceleración ≥ +10% vs ventana anterior · first_movers ya integrados.
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {accelerating.map((c) => {
          const accel = c.acceleration_score
          const color = accel >= 0.5 ? '#dc2626' : accel >= 0.1 ? '#f59e0b' : '#64748b'
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center',
              padding: '6px 10px', background: '#fffbeb', borderRadius: 4, fontSize: 11,
            }}>
              <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title}
              </span>
              <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                {c.velocity_score >= 1 ? `${c.velocity_score.toFixed(1)} art/h` : `${(c.velocity_score * 24).toFixed(1)} art/día`}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>
                {accel >= 0 ? '↑' : '↓'} {Math.abs(accel * 100).toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function PrensaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Sprint M3 · estado con migración legacy automática
  const [activeTab, setActiveTab] = useUrlState<MediosTabId>('tab', 'pulso')
  const safeActiveTab: MediosTabId = migrateLegacyTab(activeTab)
  const tab = getMediosTab(safeActiveTab)

  const [hours, setHours] = useState<24 | 48 | 72 | 168>(72)
  const [balanceMode, setBalanceMode] = useUrlState<BalanceMode>('balance', 'pluralism')
  const [showMethodology, setShowMethodology] = useState(false)
  // Sprint G15 FASE B · IDs renombrados: actores→tendencias · desinformacion→
  // observatorio-informacion · informes→mapa-medios.
  // Tabs que necesitan el endpoint /intel (resto autónomas):
  // - mapa-medios va a /api/medios (catálogo), no a /intel
  // - observatorio-informacion va a sus propios endpoints (factcheck + desinformacion)
  // - busqueda usa NewsAPI por demanda dentro de BusquedaPuntual
  //
  // Sprint G15-FIX C1 · mapas SÍ necesita el intel para alimentar MapasImpacto
  // con narrative_clusters + actor_impacts por territorio. Antes con sources=0
  // el endpoint devolvía vacío y MapasImpacto quedaba sin contexto.
  const tabsThatNeedIntel: MediosTabId[] = ['pulso', 'narrativas', 'tendencias', 'mapas']
  const needsIntel = tabsThatNeedIntel.includes(safeActiveTab)
  // Sprint G15 FASE C · pulso necesita topic_importance · resto no para no inflar.
  const includeTopicImportance = safeActiveTab === 'pulso'
  // Sprint G15-FIX C1 · cuando needsIntel pedimos SIEMPRE el set completo de
  // campos (era acotado solo a pulso antes y tendencias/narrativas/mapas
  // recibían un subset que dejaba TendenciasImpactoView, MapasImpacto y
  // NarrativesFramingWorkbench sin actor_impacts, framing_comparison,
  // readings_summary, coverage_gaps, analysis_warnings, methodology_confidence,
  // followup_queries, topicparty, figures, clusters).
  const INCLUDE_FULL = 'feed,narratives,topicparty,figures,companies,sectors,clusters,gaps,ccaa,methodology,narrative_clusters,figures_v2,readings_summary,framing_comparison,actor_impacts,coverage_gaps,analysis_warnings,methodology_confidence,followup_queries'
  const includeQuery = needsIntel
    ? `&include=${INCLUDE_FULL}${includeTopicImportance ? ',topic_importance' : ''}`
    : ''
  const { data, source, loading, refresh, updatedAt } = useApi<IntelResponse>(
    `/api/medios/intel?hours=${hours}&sources=${needsIntel ? 100 : 0}&balance_mode=${balanceMode}${includeQuery}`,
    { refreshInterval: needsIntel ? 300_000 : 0 },
  )

  const meta = data?.meta
  const _meta = data?._meta
  const methodology = data?.source_methodology
  const totalArticles = meta?.total ?? 0
  const isFresh = !!updatedAt && Date.now() - new Date(updatedAt).getTime() < 600_000

  // Contexto IA por tab · alimenta LecturaPoliteiaPanel con datos estructurados
  // Sprint M4 FASE B · ahora incluye framing + actor_impacts + warnings + gaps
  function buildLecturaContext(): LecturaContext {
    const ctx: LecturaContext = {
      n_articles: totalArticles,
      top_sources: [],
      actors: (data?.figures_v2 ?? data?.figures ?? []).slice(0, 8).map((f: any) => ({
        name: f.name, mentions: f.mentions, sentiment: f.avg_sentiment ?? f.sentiment ?? 0,
      })),
      narratives: (data?.narrative_clusters ?? []).slice(0, 6).map((n) => ({ frame: n.frame_type, count: n.articles.length })),
      topics: (data?.narrative_clusters ?? []).slice(0, 8).map((n) => ({ label: n.main_topic, count: n.articles.length })),
      sample_titles: (data?.narrative_clusters ?? []).flatMap((n) => n.representative_titles.slice(0, 2)).slice(0, 12),
      readings_summary: data?.readings_summary,
      source_methodology: methodology
        ? {
            selected_sources: methodology.selected_sources,
            balance_mode: methodology.balance_mode,
            ideological_balance_score: methodology.ideological_balance_score,
            warnings: methodology.warnings,
          }
        : undefined,
    }
    // Sprint M4 FASE B · pasar contexto enriquecido como any (LecturaContext typed sólo
    // los campos base; el endpoint lectura ya entiende los extra y construye prompt rich)
    ;(ctx as any).narrative_clusters = data?.narrative_clusters
    ;(ctx as any).framing_comparison = data?.framing_comparison
    ;(ctx as any).actor_impacts = data?.actor_impacts
    ;(ctx as any).analysis_warnings = data?.analysis_warnings
    ;(ctx as any).coverage_gaps = data?.coverage_gaps
    return ctx
  }
  const lecturaCtx = buildLecturaContext()

  return (
    <MediosDrawerProvider>
      <div style={{ background: '#fbfbfd', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
        <AppHeader />
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '20px 28px 80px' }}>

          {/* Hero compacto */}
          <section style={{
            background: `linear-gradient(135deg, ${tab.themeAccent}EE 0%, ${tab.themeAccent}AA 100%)`,
            borderRadius: 14, padding: '16px 22px', marginBottom: 14, color: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.14, textTransform: 'uppercase', opacity: 0.86, margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                <LiveDot color={isFresh ? '#86efac' : '#fde68a'} />
                <span>MEDIOS · INTELLIGENCE · Tab {tab.number}/7 · {tab.label}</span>
                {source === 'mock' && <span style={{ background: 'rgba(255,255,255,0.20)', padding: '1px 8px', borderRadius: 999 }}>DEMO</span>}
              </p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 0', lineHeight: 1.1, maxWidth: 820 }}>
                {tab.question}
              </h1>
              <p style={{ fontSize: 11, opacity: 0.78, margin: '4px 0 0', maxWidth: 880 }}>
                {tab.description}
              </p>
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
                      background: 'rgba(255,255,255,0.16)', color: '#fff', border: 'none',
                      padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.4, fontFamily: 'inherit',
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
                    <button key={h} onClick={() => setHours(h)} style={{
                      background: hours === h ? '#fff' : 'transparent', color: hours === h ? tab.themeAccent : '#fff',
                      border: 'none', borderRadius: 999, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{h < 168 ? `${h}h` : '7d'}</button>
                  ))}
                </div>
              )}
              {needsIntel && (
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.16)', borderRadius: 999, padding: 3 }}>
                  {(['pluralism', 'audience', 'regional', 'ideological', 'crisis'] as const).map((m) => (
                    <button key={m} onClick={() => setBalanceMode(m)} title={`Balance · ${m}`} style={{
                      background: balanceMode === m ? '#fff' : 'transparent', color: balanceMode === m ? tab.themeAccent : '#fff',
                      border: 'none', borderRadius: 999, padding: '3px 10px',
                      fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.4, textTransform: 'uppercase',
                    }}>
                      {m === 'pluralism' ? 'plural' : m.slice(0, 6)}
                    </button>
                  ))}
                </div>
              )}
              {updatedAt && (
                <span style={{ fontSize: 10, opacity: 0.78 }}>
                  Actualizado hace {Math.max(1, Math.round((Date.now() - new Date(updatedAt).getTime()) / 60_000))} min · {' '}
                  <button onClick={refresh} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 10 }}>↻ refrescar</button>
                </span>
              )}
            </div>
          </section>

          {/* Metodología (colapsable) */}
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

          {/* Sub-nav 7 tabs */}
          <MediosTabsNav activeId={safeActiveTab} onTabChange={setActiveTab} />

          {/* Contenido */}
          {loading && !data && needsIntel ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Agregando feed RSS de 100 medios…</div>
              <div style={{ fontSize: 11 }}>Primera carga puede tardar 8-15 segundos</div>
            </div>
          ) : (
            <>
              {/* Tab 1 · Pulso · qué pasa AHORA */}
              {safeActiveTab === 'pulso' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué está dominando ahora mismo la agenda?"
                    answer="Narrativas auditables emergentes · feed por tiers nacional/europeo/regional/local · agenda topic × partido · historias que aceleran · contexto GDELT global · Lectura IA con todo lo anterior."
                  />
                  {/* Sprint M4 FASE B · metodología + confianza + warnings (mismo motor que NewsAPI search) */}
                  {(data?.methodology_confidence || data?.analysis_warnings) && (
                    <MetodologiaConfianzaPanel
                      totalResults={totalArticles}
                      nArticles={data?.readings_summary?.n_readings ?? totalArticles}
                      confidence={data?.methodology_confidence}
                      balanceIdeo={methodology?.ideological_balance_score}
                      balanceTerr={methodology?.territorial_balance_score}
                      latencyMs={_meta?.latency_ms}
                      warnings={data?.analysis_warnings}
                      providerLabel="RSS · 100 medios"
                    />
                  )}
                  {/* Lectura IA transversal · colapsada por defecto · receive contexto estructurado */}
                  <LecturaPoliteiaPanel
                    tabId="pulso"
                    context={lecturaCtx}
                    title="Lectura Politeia del Pulso"
                    collapsedByDefault
                  />
                  {data?.narrative_clusters && data.narrative_clusters.length > 0 && (
                    <NarrativeClustersView clusters={data.narrative_clusters} />
                  )}
                  {data?.narrative_clusters && data.narrative_clusters.length > 0 && (
                    <ViralidadStrip clusters={data.narrative_clusters} mode="compact" />
                  )}
                  {/* Sprint G15 FASE C · gráfico de importancia temática arriba del feed.
                      Combina tags reales del RSS (Fase A2/A3) + detectCategory(text). */}
                  <TopicImportanceChart
                    topics={(data as IntelResponse & { topic_importance?: TopicImportanceItem[] })?.topic_importance}
                    loading={loading && !data}
                  />
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

              {/* Tab 2 · Búsqueda · qué se publicó sobre X */}
              {safeActiveTab === 'busqueda' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué se ha publicado sobre X tema o actor?"
                    answer="Investigación libre NewsAPI everything con filtros booleanos + dominios + fechas · timeline + picos de cobertura · actores · narrativas · comparación ideológica · dossier export · Lectura IA por búsqueda."
                  />
                  {/* La Lectura IA dentro de BusquedaPuntual ya existe (LecturaPoliteia legacy). */}
                  <BusquedaPuntual />
                </div>
              )}

              {/* Tab 3 · Narrativas & framing · qué narrativas existen y cómo, por quién */}
              {safeActiveTab === 'narrativas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Sprint G15 FASE D4 · workbench unificado · reemplaza apilamiento de
                      7 componentes (FramingComparisonPanel + CoverageGapsPanel +
                      NarrativeClustersView + ViralidadStrip + NarrativesV3View +
                      StoryClustersView + NarrativesDeepView). Toda la info clave
                      en una sola vista con KPIs, filtros, cards expandibles y
                      separación narrative_clusters vs emerging_signals. */}
                  <TabExplainerBlock
                    question="¿Qué narrativas se están formando y cómo se encuadran?"
                    answer="Workbench único · cada narrativa es topic + frame + mensaje repetido + actores + medios/canales + ventana temporal + evidencia suficiente. NO un tema, NO un frame suelto. Mínimo 3 artículos en ≥2 medios distintos y al menos una señal fuerte."
                  />
                  <LecturaPoliteiaPanel
                    tabId="narrativas"
                    context={lecturaCtx}
                    title="Lectura Politeia de Narrativas"
                    collapsedByDefault
                  />
                  <NarrativesFramingWorkbench
                    narratives={data?.narrative_clusters as unknown as WorkbenchNarrative[] | undefined}
                    emergingSignals={
                      (data as IntelResponse & { emerging_signals?: WorkbenchNarrative[] })?.emerging_signals
                    }
                    loading={loading && !data}
                  />
                </div>
              )}

              {/* Tab 4 · Tendencias e impacto · Sprint G15 FASE E · unificado en TendenciasImpactoView.
                  Reemplaza el render legacy (ActoresImpactoPanel + FiguresV2View + SentimentDualView).
                  Cuatro dimensiones (figuras · empresas · sectores · territorios) con la misma rejilla
                  beneficial/harmful/neutral/uncertain + sumario ejecutivo + botones Investigar/Dossier. */}
              {safeActiveTab === 'tendencias' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Quién aparece, cómo aparece y si le beneficia o perjudica?"
                    answer="No es sólo sentimiento · separa menciones · sentimiento HACIA actor · impacto político (beneficial/harmful/neutral/uncertain) con confianza y razón · rol narrativo · medios que amplifican · temas asociados. Cuatro dimensiones: figuras y partidos · empresas IBEX35 · sectores · territorios."
                  />
                  <LecturaPoliteiaPanel
                    tabId="actores"
                    context={lecturaCtx}
                    title="Lectura Politeia · Tendencias e impacto"
                    collapsedByDefault
                  />
                  <TendenciasImpactoView
                    actorImpacts={data?.actor_impacts ?? []}
                    figuresV2={data?.figures_v2 ?? []}
                    companies={data?.companies ?? []}
                    sectors={data?.sectors ?? []}
                    narrativeClusters={data?.narrative_clusters ?? []}
                    onInvestigate={(name, kind) => {
                      // Navega a la tab Búsqueda con la query pre-cargada
                      const params = new URLSearchParams(window.location.search)
                      params.set('tab', 'busqueda')
                      params.set('q', name)
                      router.push(`/prensa?${params.toString()}`)
                    }}
                    onCreateDossier={(name, kind) => {
                      // Atajo: lleva a búsqueda con autoexec + abre exportar dossier
                      const params = new URLSearchParams(window.location.search)
                      params.set('tab', 'busqueda')
                      params.set('q', name)
                      params.set('autoexec', '1')
                      params.set('dossier', '1')
                      router.push(`/prensa?${params.toString()}`)
                    }}
                  />
                </div>
              )}

              {/* Tab 5 · Mapas de impacto · dónde impacta (España + Global) */}
              {safeActiveTab === 'mapas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Dónde impacta? España/CCAA + Global con narrative attribution"
                    answer="Modo ESPAÑA · separa CCAA del medio vs mencionada vs afectada políticamente con regional_signal_score. Modo GLOBAL · país/evento con severidad + narrativa + relevancia ES + fuente + confianza."
                  />
                  <LecturaPoliteiaPanel
                    tabId="mapas"
                    context={lecturaCtx}
                    title="Lectura Politeia de Mapas"
                    collapsedByDefault
                  />
                  {/* Sprint G15-FIX C1+C3 · MapasImpacto ahora recibe los datos
                      del intel (narrative_clusters + actor_impacts) para enriquecer
                      el panel lateral de cada CCAA con narrativas en ese territorio y
                      actores locales en tendencia. Props son opcionales por backward-compat. */}
                  <MapasImpacto
                    defaultMode="espana"
                    ccaaData={data?.ccaa}
                    // Cast necesario · el tipo inline `narrative_clusters` declarado en
                    // IntelResponse (page.tsx L138-176) es más estrecho que el
                    // NarrativeCluster ampliado de media-methodology.ts. Los datos del
                    // endpoint SÍ contienen los campos extra (key_messages, target_audiences,
                    // channels, etc.) porque buildNarrativeClustersDetailed los emite ·
                    // en C2 unificamos la fuente del tipo y este cast desaparece.
                    narrativeClusters={(data?.narrative_clusters ?? []) as any}
                    actorImpacts={data?.actor_impacts ?? []}
                  />
                </div>
              )}

              {/* Tab 6 · Observatorio de Información · Sprint G15 FASE G · ObservatorioInformacionView
                  reemplaza el render mínimo de DesinformacionLive solo. Ahora incluye:
                    - Sumario agregado EFE+Newtral+Maldita (KPIs + tendencia 7d vs 7d previos)
                    - Top temas con desinformación
                    - Actores más perjudicados (con tendencia)
                    - Buscador puntual Google Fact Check (DesinformacionLive embebido)
                    - Link al observatorio dedicado /prensa/desinformacion */}
              {safeActiveTab === 'observatorio-informacion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué claims, bulos, operaciones informativas o patrones de desinformación están activos?"
                    answer="Verificaciones recientes + claims + bulos + sin contexto + tendencia temporal + actores afectados + conexión con narrativas activas. Google Fact Check integrado como buscador interno."
                  />
                  <LecturaPoliteiaPanel
                    tabId="desinformacion"
                    context={lecturaCtx}
                    title="Lectura Politeia · Observatorio de Información"
                    collapsedByDefault
                  />
                  <ObservatorioInformacionView />
                </div>
              )}

              {/* Tab 7 · Mapa de medios · Sprint G15 FASE H · MapaMediosView reemplaza
                  el render legacy (sólo InformesAlertas). Ahora la tab muestra:
                    - Sumario panorama mediático (6 KPIs)
                    - Concentración por grupo (top 12 grupos empresariales)
                    - Distribución ideológica (5 buckets)
                    - Distribución territorial (scope_level)
                    - Catálogo filtrable con ficha lateral por medio
                    - Monitores guardados (InformesAlertas conservado embebido al final)
                  Alertas por aceleración + followups se conservan arriba como contexto. */}
              {safeActiveTab === 'mapa-medios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Cómo es el panorama mediático y cómo monitorizar esta inteligencia?"
                    answer="Catálogo de medios curado + concentración por grupo empresarial + distribución ideológica/territorial + ficha por medio. Más monitores guardados, alertas por aceleración de narrativas (viralidad transversal) y followups sugeridos."
                  />
                  <LecturaPoliteiaPanel
                    tabId="informes"
                    context={lecturaCtx}
                    title="Lectura Politeia ejecutiva"
                    collapsedByDefault
                  />
                  {/* Alertas por aceleración (transversal viralidad) */}
                  {data?.narrative_clusters && data.narrative_clusters.length > 0 && (
                    <ViralidadStrip clusters={data.narrative_clusters} mode="compact" />
                  )}
                  {/* Sprint M4 FASE B · followup queries · guarda como monitores */}
                  {data?.suggested_followup_queries && data.suggested_followup_queries.length > 0 && (
                    <FollowupQueriesPanel
                      followups={data.suggested_followup_queries}
                      onRun={(q) => router.push(`/prensa?tab=busqueda&q=${encodeURIComponent(q)}`)}
                    />
                  )}
                  <MapaMediosView />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </MediosDrawerProvider>
  )
}

// ──────────────────────────────────────────────────────────────────────
// FiguresV2View · eliminado en Sprint G15 FASE E
// La lógica de sentiment HACIA actor + impacto político (beneficial/harmful/neutral/uncertain)
// ahora vive en `<TendenciasImpactoView />` (tab tendencias), que la unifica con
// empresas, sectores y territorios bajo la misma rejilla y sumario ejecutivo.
// ──────────────────────────────────────────────────────────────────────
