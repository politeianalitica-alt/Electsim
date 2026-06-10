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

import FeedTiered from './_components/FeedTiered'
// Sprint G15 FASE C · gráfico de importancia temática arriba del feed en Pulso
import TopicImportanceChart, { type TopicImportanceItem } from './_components/TopicImportanceChart'
// Sprint G15 FASE D4 · workbench unificado de narrativas (reemplaza apilamiento)
import NarrativesFramingWorkbench, { type WorkbenchNarrative } from './_components/NarrativesFramingWorkbench'
// NarrativesDeepView, NarrativesV3View, SentimentDualView, StoryClustersView ya no se usan
// (sustituidos por NarrativesFramingWorkbench en narrativas y TendenciasImpactoView en tendencias).
// Se conservan en _components/ para evitar romper rutas legacy y por si se reusan en informes.
import TopicPartyHeatmap from './_components/TopicPartyHeatmap'
// Sprint 0.5 · observabilidad UI del pipeline canónico
import { PipelineHealthBadge } from './_components/PipelineHealthBadge'
import { SourceStatusPanel } from './_components/SourceStatusPanel'

import { MediosDrawerProvider } from './_components/MediosDrawerProvider'
// MediosTabsNav (barra de tabs interna) eliminado: los 6 tabs ahora viven en el
// subnav global del módulo "Medios" (AppHeader), evitando la barra duplicada.
// Se conserva MediosSourceBadges (se usa en el hero).
import { MediosSourceBadges } from './_components/MediosTabsNav'
import MediosHero from '@/components/medios/MediosHero'
import MapaNoticiasEspana from '@/components/medios/MapaNoticiasEspana'
import { BusquedaPuntual } from './_components/BusquedaPuntual'
import { ViralidadDifusion } from './_components/ViralidadDifusion'
// InformesAlertas ya no se importa aquí · vive embebido dentro de MapaMediosView.
import { MapaMediosView } from './_components/MapaMediosView'
// Observatorio de Información eliminado de /prensa (reorg medios 2026) · su función
// (verificaciones, bulos, fact-check) vive en la entrada de menú Desinformación →
// /desinformacion. ObservatorioInformacionView se conserva en _components/ por si se reusa.
import { GdeltGlobalPanel } from './_components/GdeltGlobalPanel'
import {
  MEDIOS_TAB_IDS, getMediosTab, MediosTabId, migrateLegacyTab,
} from '@/lib/medios/sources-matrix'
import {
  SourceMethodologyCard, MethodologyWarnings,
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
// Sprint G15-FIX C2 · tipo real del cluster · necesario para pasar al MapasImpacto
// sin el cast `as any` que tapaba shape mismatch entre IntelResponse y el lib.
import type { NarrativeCluster } from '@/lib/medios/media-methodology'

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

// Sprint G15-FIX C2 · shape REAL que devuelve buildNarrativeClustersDetailed
// (lib/medios/media-methodology.ts). Define los campos básicos del cluster
// + los 7 campos D3 ampliados (key_messages, topic_tags, channels,
// target_audiences, supporting_news, impact_summary, trend) como opcionales.
// Mantenemos la definición inline (en lugar de importar NarrativeCluster del
// lib) para no acoplar page.tsx con la implementación interna · pero el shape
// es 1:1 compatible: page.tsx puede pasar directo a NarrativesFramingWorkbench
// sin cast.
interface NarrativeClusterShape {
  id: string
  title: string
  short_summary: string
  frame_type: string
  main_topic: string
  secondary_topics: string[]
  dominant_sector?: string | null
  sector_label?: string | null
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
  // Campos D3 ampliados (Sprint G15)
  key_messages?: string[]
  topic_tags?: string[]
  channels?: Array<{ channel: string; weight: number; examples: string[] }>
  target_audiences?: Array<{ label: string; reason: string; confidence: number }>
  supporting_news?: Array<{
    title: string
    medium: string
    url: string
    ideology: string
    published_at: string | null
  }>
  impact_summary?: { benefited: string[]; harmed: string[]; uncertain: string[] }
  trend?: {
    velocity_score: number
    velocity_confidence: number
    acceleration_score: number
    acceleration_confidence: number
    label: 'emergente' | 'estable' | 'acelerando' | 'en retroceso'
  }
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
  narrative_clusters?: NarrativeClusterShape[]
  // Sprint G15-FIX C2 · emerging_signals · clusters de 2 artículos o sin
  // señal fuerte que el endpoint separa de narrative_clusters cuando incluye
  // `narrative_clusters` en el query string. Sirven para mostrar "señales
  // que vigilar" sin etiquetar como narrativa.
  emerging_signals?: NarrativeClusterShape[]
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
          {/* Sprint Q-C.1 · "velocity 0.5 art/h" + "first_movers" eran jerga interna */}
          Narrativas con más de 0,5 artículos/hora o que han acelerado +10% respecto a la ventana anterior (24 h vs 24 h previas). Incluye los medios que arrancaron la ola.
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
  // El setter ya no se usa aquí: la navegación entre tabs la hace el subnav del
  // header (links a /prensa?tab=…). La página solo LEE el tab del query.
  const [activeTab] = useUrlState<MediosTabId>('tab', 'pulso')
  const safeActiveTab: MediosTabId = migrateLegacyTab(activeTab)
  const tab = getMediosTab(safeActiveTab)

  const [hours, setHours] = useState<24 | 48 | 72 | 168>(72)
  const [balanceMode, setBalanceMode] = useUrlState<BalanceMode>('balance', 'pluralism')
  const [showMethodology, setShowMethodology] = useState(false)
  // Sprint G15 FASE B · IDs renombrados: actores→tendencias · informes→mapa-medios.
  // Tabs que necesitan el endpoint /intel (resto autónomas):
  // - mapa-medios va a /api/medios (catálogo), no a /intel
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

          {/* Hero · cabecera limpia con KPIs en vivo + mini-mapa de España (CCAA) */}
          <MediosHero
            accent={tab.themeAccent}
            fresh={isFresh}
            eyebrow={`Inteligencia de medios · Tab ${tab.number}/6 · ${tab.label}`}
            badge={source === 'mock'
              ? <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 999, fontSize: 9, fontWeight: 700 }}>DEMO</span>
              : undefined}
            title={tab.question}
            subtitle={needsIntel && totalArticles > 0 && methodology?.copy_for_hero ? methodology.copy_for_hero : tab.description}
            kpis={needsIntel ? [
              { label: 'Noticias', value: totalArticles || '…', color: tab.themeAccent },
              { label: 'Medios', value: `${methodology?.selected_sources ?? meta?.sources ?? '…'}`, sub: `de ${methodology?.catalog_total ?? '?'}` },
              ...(_meta?.confidence !== undefined ? [{ label: 'Confianza', value: `${Math.round(_meta.confidence * 100)}%` }] : []),
            ] : []}
            mapLabel="Noticias por comunidad"
            map={needsIntel ? <MapaNoticiasEspana data={data?.ccaa} colorHigh={tab.themeAccent} /> : undefined}
            actions={
              <>
                {needsIntel && (
                  <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
                    {([24, 48, 72, 168] as const).map((h) => (
                      <button key={h} onClick={() => setHours(h)} style={{
                        background: hours === h ? '#fff' : 'transparent', color: hours === h ? tab.themeAccent : '#6e6e73',
                        border: 'none', borderRadius: 999, padding: '4px 11px', fontSize: 11, fontWeight: hours === h ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: hours === h ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      }}>{h < 168 ? `${h}h` : '7d'}</button>
                    ))}
                  </div>
                )}
                {needsIntel && (
                  <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
                    {([
                      { id: 'pluralism',  label: 'plural',     title: 'Equilibra catálogo por pluralidad editorial (todos los espectros).' },
                      { id: 'audience',   label: 'audiencia',  title: 'Pondera por audiencia mensual del medio.' },
                      { id: 'regional',   label: 'regional',   title: 'Sobreexpone medios regionales y locales.' },
                      { id: 'ideological',label: 'ideológico', title: 'Pondera por distancia ideológica entre medios.' },
                      { id: 'crisis',     label: 'crisis',     title: 'Prioriza medios con mayor cobertura del topic.' },
                    ] as const).map((m) => (
                      <button key={m.id} onClick={() => setBalanceMode(m.id)} title={m.title} style={{
                        background: balanceMode === m.id ? '#fff' : 'transparent', color: balanceMode === m.id ? tab.themeAccent : '#6e6e73',
                        border: 'none', borderRadius: 999, padding: '4px 10px', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.4, textTransform: 'uppercase',
                        boxShadow: balanceMode === m.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      }}>{m.label}</button>
                    ))}
                  </div>
                )}
                {needsIntel && _meta?.confidence !== undefined && (
                  <button onClick={() => setShowMethodology(!showMethodology)} style={{
                    background: '#F5F5F7', color: '#3a3a3d', border: 'none', padding: '5px 11px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{showMethodology ? '× metodología' : '◆ metodología'}</button>
                )}
                <MediosSourceBadges tab={tab} />
                {updatedAt && (
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>
                    hace {Math.max(1, Math.round((Date.now() - new Date(updatedAt).getTime()) / 60_000))} min ·{' '}
                    <button onClick={refresh} style={{ background: 'transparent', border: 'none', color: tab.themeAccent, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 10 }}>↻ refrescar</button>
                  </span>
                )}
              </>
            }
          />

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

          {/* Sprint 0.5 · observabilidad pipeline canónico (badge + fuentes) */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <PipelineHealthBadge />
            <SourceStatusPanel />
          </div>

          {/* Sub-nav de los 6 tabs: ahora vive en el subnav global del módulo
              "Medios" (AppHeader). Aquí ya no se renderiza para evitar duplicado. */}

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
                  {/* Sprint Q-C.1 · ANTES enumeraba componentes técnicos
                      ("feed por tiers", "topic × partido", "Lectura IA con todo lo
                      anterior"). AHORA responde la pregunta del analista. */}
                  <TabExplainerBlock
                    question="¿Qué está dominando ahora mismo la agenda?"
                    answer="Las narrativas dominantes y los titulares por ámbito (nacional, europeo, regional, local), qué temas concentra cada partido y qué historias están acelerando ahora. Análisis IA opcional."
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

              {/* Tab 2 · Búsqueda · qué se publicó sobre X
                  Sprint G15-FIX C3 · ahora muestra arriba LecturaPoliteiaPanel con
                  contexto general del pulso actual (colapsado por defecto, no consume
                  tokens si el usuario no lo abre). La Lectura IA per-query
                  específica vive dentro de BusquedaPuntual y se mantiene intacta. */}
              {safeActiveTab === 'busqueda' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué se ha publicado sobre X tema o actor?"
                    answer="Investigación libre NewsAPI everything con filtros booleanos + dominios + fechas · timeline + picos de cobertura · actores · narrativas · comparación ideológica · dossier export · Lectura IA por búsqueda."
                  />
                  <LecturaPoliteiaPanel
                    tabId="busqueda"
                    context={lecturaCtx}
                    title="Lectura Politeia · contexto general del pulso"
                    collapsedByDefault
                  />
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
                    // Sprint G15-FIX C2 · narrative_clusters ya incluye los campos
                    // D3 ampliados en IntelResponse (NarrativeClusterShape) — el cast
                    // se reduce a un solo `as` porque WorkbenchNarrative requiere los
                    // campos D3 también opcionales. Shape compatible 1:1.
                    narratives={data?.narrative_clusters as WorkbenchNarrative[] | undefined}
                    emergingSignals={
                      data?.emerging_signals as WorkbenchNarrative[] | undefined
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
                  {/* Sprint Q-C.1 · header sin `narrative attribution` ni `regional_signal_score`
                      (eran nombres de campo internos). La metodología detallada ya vive bien
                      explicada en MapasImpacto.tsx:76-78. */}
                  <TabExplainerBlock
                    question="¿Dónde tiene impacto político esta cobertura?"
                    answer="Modo España: distingue origen del medio, territorio mencionado y territorio afectado políticamente. Modo Global: severidad, exposición de España y frame dominante por país."
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
                    // Sprint G15-FIX C2 · NarrativeClusterShape ya tiene los campos D3
                    // ampliados opcionales · el cast se reduce a un solo `as` porque el
                    // tipo MapasImpacto importa NarrativeCluster del lib (mismas shape
                    // optionals). En runtime los objetos contienen exactamente esos campos.
                    narrativeClusters={data?.narrative_clusters as any as NarrativeCluster[]}
                    actorImpacts={data?.actor_impacts ?? []}
                  />
                </div>
              )}

              {/* Tab "Observatorio de Información" eliminado (reorg medios 2026) ·
                  su función vive en la entrada de menú Desinformación → /desinformacion. */}

              {/* Tab 6 · Mapa de medios · Sprint G15 FASE H · MapaMediosView reemplaza
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
