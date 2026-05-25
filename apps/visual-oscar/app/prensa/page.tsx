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
import {
  MEDIOS_TAB_IDS, getMediosTab, MediosTabId, migrateLegacyTab,
} from '@/lib/medios/sources-matrix'
import {
  SourceMethodologyCard, ConfidenceBadge, MethodologyWarnings,
} from './_components/MethodologyComponents'
import { NarrativeClustersView } from './_components/NarrativeClustersView'
import { LecturaPoliteiaPanel, type LecturaContext } from './_components/LecturaPoliteiaPanel'
import { MapasImpacto } from './_components/MapasImpacto'

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
  // Tabs que necesitan el endpoint /intel (resto autónomas)
  const tabsThatNeedIntel: MediosTabId[] = ['pulso', 'narrativas', 'actores', 'informes']
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

  // Contexto IA por tab · alimenta LecturaPoliteiaPanel con datos estructurados
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
                  <TabExplainerBlock
                    question="¿Qué narrativas existen, qué frame usan, qué bloque las amplifica?"
                    answer="NarrativeClusters auditables con barra ideológica izq/centro/der por narrativa · velocity + acceleration + first_seen · StoryClusters comparados · gaps de cobertura · diferencias de framing entre bloques mediáticos."
                  />
                  <LecturaPoliteiaPanel
                    tabId="narrativas"
                    context={lecturaCtx}
                    title="Lectura Politeia de Narrativas"
                    collapsedByDefault
                  />
                  {data?.narrative_clusters && data.narrative_clusters.length > 0 && (
                    <NarrativeClustersView clusters={data.narrative_clusters} />
                  )}
                  {/* Viralidad full embebida en narrativas (ex-Tab 6) */}
                  {data?.narrative_clusters && data.narrative_clusters.length > 0 ? (
                    <ViralidadStrip clusters={data.narrative_clusters} mode="full" />
                  ) : (
                    <ViralidadDifusion />
                  )}
                  {/* Cobertura ideológica embebida (ex-Tab 5) */}
                  <NarrativesV3View />
                  <StoryClustersView clusters={data?.clusters ?? []} />
                  {(data?.narratives ?? []).length > 0 && (
                    <NarrativesDeepView narratives={data?.narratives ?? []} gaps={data?.gaps ?? []} />
                  )}
                </div>
              )}

              {/* Tab 4 · Actores e impacto · a quién afecta y cómo */}
              {safeActiveTab === 'actores' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Quién aparece, cómo aparece y si le beneficia o perjudica?"
                    answer="No es sólo sentimiento · separa menciones · sentimiento HACIA actor · impacto político (beneficial/harmful/neutral/uncertain) con confianza y razón · rol narrativo · medios que amplifican · temas asociados."
                  />
                  <LecturaPoliteiaPanel
                    tabId="actores"
                    context={lecturaCtx}
                    title="Lectura Politeia de Actores"
                    collapsedByDefault
                  />
                  {/* Figures v2 · sentiment HACIA actor + impacto político */}
                  {data?.figures_v2 && data.figures_v2.length > 0 && <FiguresV2View figures={data.figures_v2} />}
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
                  <MapasImpacto defaultMode="espana" />
                </div>
              )}

              {/* Tab 6 · Desinformación · qué es falso o dudoso */}
              {safeActiveTab === 'desinformacion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Qué claims están verificados o son sospechosos?"
                    answer="Maldita + Newtral + EFE Verifica + Google Fact Check · cada claim con narrativa afectada + actores beneficiados/perjudicados + estado de verificación + Lectura IA."
                  />
                  <LecturaPoliteiaPanel
                    tabId="desinformacion"
                    context={lecturaCtx}
                    title="Lectura Politeia de Desinformación"
                    collapsedByDefault
                  />
                  <DesinformacionLive />
                </div>
              )}

              {/* Tab 7 · Informes & monitores · exportar y monitorizar */}
              {safeActiveTab === 'informes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TabExplainerBlock
                    question="¿Cómo exportar o monitorizar esta inteligencia?"
                    answer="Búsquedas guardadas · monitores · dossiers MD/HTML con metodología y advertencias · plantillas alertas · alertas por aceleración de narrativas (viralidad transversal)."
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

// ──────────────────────────────────────────────────────────────────────
// FiguresV2View · render figuras con sentiment HACIA actor + impacto
// ──────────────────────────────────────────────────────────────────────

function FiguresV2View({ figures }: { figures: NonNullable<IntelResponse['figures_v2']> }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0891b2', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#0891b2', textTransform: 'uppercase' }}>
          ◆ Figuras · sentiment HACIA actor (no plano)
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
          Cada actor con menciones + sentiment hacia él (separado de mention plana) + impacto político
          (beneficial/harmful/neutral/uncertain) calculado por assessSentiment con confianza.
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {figures.slice(0, 15).map((f) => {
          const senPct = (f.avg_sentiment * 100).toFixed(0)
          const senColor = f.avg_sentiment > 0.1 ? '#16a34a' : f.avg_sentiment < -0.1 ? '#dc2626' : '#64748b'
          const dominantImpact = ['beneficial', 'harmful', 'neutral', 'uncertain'].reduce((best, k) => {
            const v = (f as any)[`${k}_count`] || 0
            return v > best.count ? { key: k, count: v } : best
          }, { key: '', count: 0 })
          const impactColor = dominantImpact.key === 'beneficial' ? '#16a34a' : dominantImpact.key === 'harmful' ? '#dc2626' : '#94a3b8'
          return (
            <div key={f.name} style={{
              display: 'grid', gridTemplateColumns: '180px 60px 1fr 120px 90px', gap: 8, alignItems: 'center',
              padding: '6px 10px', background: '#f8fafc', borderRadius: 4, fontSize: 11,
            }}>
              <span style={{ color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: '#475569', fontFamily: 'ui-monospace, monospace', textAlign: 'right' }}>{f.mentions}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {f.beneficial_count > 0 && <span style={{ flex: f.beneficial_count, height: 8, background: '#16a34a', borderRadius: 1 }} title={`beneficial ${f.beneficial_count}`} />}
                {f.harmful_count > 0 && <span style={{ flex: f.harmful_count, height: 8, background: '#dc2626', borderRadius: 1 }} title={`harmful ${f.harmful_count}`} />}
                {f.neutral_count > 0 && <span style={{ flex: f.neutral_count, height: 8, background: '#94a3b8', borderRadius: 1 }} title={`neutral ${f.neutral_count}`} />}
                {f.uncertain_count > 0 && <span style={{ flex: f.uncertain_count, height: 8, background: '#cbd5e1', borderRadius: 1 }} title={`uncertain ${f.uncertain_count}`} />}
              </div>
              <span style={{ fontSize: 9, color: senColor, fontFamily: 'ui-monospace, monospace', fontWeight: 700, textAlign: 'right' }}>
                sentiment {senPct}%
              </span>
              <span style={{ fontSize: 8, color: impactColor, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'right' }}>
                ● {dominantImpact.key || 'n/d'}
              </span>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 9, color: '#64748b' }}>
        Suppress: figuresFromReadings (M2 · assessSentiment) · top {Math.min(15, figures.length)} de {figures.length}.
      </p>
    </section>
  )
}
