'use client'

/**
 * /prensa · Media Intelligence Hub · 10 subtabs.
 *
 * Arquitectura inspirada en NewsWhip + Media Cloud + GDELT:
 *   1. Radar en vivo · titulares + volumen + mapa CCAA + medios activos
 *   2. Búsqueda puntual · investigación libre con NewsAPI (CORE FEATURE)
 *   3. Agenda mediática · ranking temas + evolución 24h/7d/30d
 *   4. Narrativas & frames · clusters narrativos + framings comparados
 *   5. Actores & menciones · personas/partidos/empresas/países
 *   6. Sentimiento & reputación · positivo/negativo por actor/tema/medio
 *   7. Cobertura comparada · misma historia distintos bloques
 *   8. Viralidad & difusión · sortBy=popularity + first movers
 *   9. Desinformación & verificación · RSS fact-checkers + Google Fact Check
 *   10. Informes, alertas & dossiers · monitores, plantillas, exports
 *
 * El feed RSS interno + /api/medios/intel + NewsAPI son fuentes principales.
 * GDELT, Media Cloud, NewsWhip, Google Fact Check Tools llegarán en M-M2/M3.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import { LiveDot } from '@/components/Skeleton'

import FeedTiered from './_components/FeedTiered'
import SentimentMapInteractive from './_components/SentimentMapInteractive'
import NarrativesDeepView from './_components/NarrativesDeepView'
import NarrativesV3View from './_components/NarrativesV3View'
import SentimentDualView from './_components/SentimentDualView'
import StoryClustersView from './_components/StoryClustersView'
import FiguresView from './_components/FiguresView'
import TopicPartyHeatmap from './_components/TopicPartyHeatmap'

import { MediosDrawerProvider } from './_components/MediosDrawerProvider'
import { MediosTabsNav, MediosSourceBadges } from './_components/MediosTabsNav'
import { BusquedaPuntual } from './_components/BusquedaPuntual'
import { ViralidadDifusion } from './_components/ViralidadDifusion'
import { InformesAlertas } from './_components/InformesAlertas'
import { MEDIOS_TAB_IDS, getMediosTab, MediosTabId } from '@/lib/medios/sources-matrix'

import type {
  TieredFeed, NarrativeAnatomy, TopicPartyCell, FigureSentimentDeep,
  StoryCluster, CoverageGap, CompanySentiment, SectorSentiment,
} from '@/lib/news-intel'
import type { CCAARegionStat } from '@/lib/news-aggregator'

interface IntelResponse {
  meta: { updatedAt: string; total: number; hours: number; sources: number }
  feed?: TieredFeed
  narratives?: NarrativeAnatomy[]
  topicparty?: TopicPartyCell[]
  figures?: FigureSentimentDeep[]
  companies?: CompanySentiment[]
  sectors?: SectorSentiment[]
  clusters?: StoryCluster[]
  gaps?: CoverageGap[]
  ccaa?: Record<string, CCAARegionStat>
}

export default function PrensaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [activeTab, setActiveTab] = useUrlState<MediosTabId>('tab', 'radar')
  const safeActiveTab: MediosTabId = (MEDIOS_TAB_IDS as readonly string[]).includes(activeTab)
    ? activeTab
    : 'radar'
  const tab = getMediosTab(safeActiveTab)

  const [hours, setHours] = useState<24 | 48 | 72 | 168>(72)
  const { data, source, loading, refresh, updatedAt } = useApi<IntelResponse>(
    `/api/medios/intel?hours=${hours}&sources=50`,
    { refreshInterval: 300_000 },
  )

  const meta = data?.meta
  const totalArticles = meta?.total ?? 0
  const isFresh = !!updatedAt && Date.now() - new Date(updatedAt).getTime() < 600_000

  return (
    <MediosDrawerProvider>
      <div style={{ background: '#fbfbfd', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
        <AppHeader />
        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '20px 28px 80px' }}>

          {/* ── Hero compacto ─────────────────────────────────────── */}
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
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '6px 0 0', lineHeight: 1.1, maxWidth: 720 }}>
                {tab.description}
              </h1>
              <p style={{ fontSize: 11, opacity: 0.78, margin: '6px 0 0' }}>
                {totalArticles > 0 ? `${totalArticles} noticias · ${meta?.sources ?? '…'} medios analizados` : 'Cargando feed RSS…'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <MediosSourceBadges tab={tab} />
              <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.16)', borderRadius: 999, padding: 3 }}>
                {([24, 48, 72, 168] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setHours(h)}
                    style={{
                      background: hours === h ? '#fff' : 'transparent',
                      color: hours === h ? tab.themeAccent : '#fff',
                      border: 'none',
                      borderRadius: 999,
                      padding: '4px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {h < 168 ? `${h}h` : '7d'}
                  </button>
                ))}
              </div>
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

          {/* ── Sub-nav 10 tabs ──────────────────────────────────── */}
          <MediosTabsNav activeId={safeActiveTab} onTabChange={setActiveTab} />

          {/* ── Contenido por tab ────────────────────────────────── */}
          {loading && !data && safeActiveTab !== 'busqueda' && safeActiveTab !== 'informes' && safeActiveTab !== 'viralidad' && safeActiveTab !== 'desinformacion' ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Agregando feed RSS de 50 medios…</div>
              <div style={{ fontSize: 11 }}>Primera carga puede tardar 8-15 segundos</div>
            </div>
          ) : (
            <>
              {/* Tab 1: Radar en vivo · feed + mapa CCAA inline */}
              {safeActiveTab === 'radar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <FeedTiered feed={data?.feed} />
                  {data?.ccaa && (
                    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
                      <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Mapa de sentimiento regional · CCAA
                      </p>
                      <div style={{ marginTop: 8 }}>
                        <SentimentMapInteractive ccaaData={data.ccaa} />
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Tab 2: Búsqueda puntual · CORE NEW FEATURE */}
              {safeActiveTab === 'busqueda' && <BusquedaPuntual />}

              {/* Tab 3: Agenda · topic ranking */}
              {safeActiveTab === 'agenda' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TopicPartyHeatmap cells={data?.topicparty ?? []} figures={data?.figures ?? []} />
                </div>
              )}

              {/* Tab 4: Narrativas & frames */}
              {safeActiveTab === 'narrativas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <NarrativesV3View />
                  {(data?.narratives ?? []).length > 0 && (
                    <NarrativesDeepView narratives={data?.narratives ?? []} gaps={data?.gaps ?? []} />
                  )}
                </div>
              )}

              {/* Tab 5: Actores & menciones */}
              {safeActiveTab === 'actores' && (
                <FiguresView figures={data?.figures ?? []} />
              )}

              {/* Tab 6: Sentimiento & reputación */}
              {safeActiveTab === 'sentimiento' && (
                <SentimentDualView
                  cells={data?.topicparty ?? []}
                  figures={data?.figures ?? []}
                  companies={data?.companies ?? []}
                  sectors={data?.sectors ?? []}
                />
              )}

              {/* Tab 7: Cobertura comparada */}
              {safeActiveTab === 'cobertura' && (
                <StoryClustersView clusters={data?.clusters ?? []} />
              )}

              {/* Tab 8: Viralidad & difusión */}
              {safeActiveTab === 'viralidad' && <ViralidadDifusion />}

              {/* Tab 9: Desinformación & verificación */}
              {safeActiveTab === 'desinformacion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <section style={{ padding: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, borderLeft: `4px solid ${tab.themeAccent}` }}>
                    <p style={{ fontSize: 11, color: tab.themeAccent, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
                      Desinformación & verificación
                    </p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px', lineHeight: 1.5 }}>
                      Observatorio de claims verificados por fact-checkers ES (Maldita, Newtral, EFE Verifica, Verificat). Google Fact Check Tools API planned.
                    </p>
                    <a
                      href="/prensa/desinformacion"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: tab.themeAccent,
                        color: '#fff',
                        borderRadius: 8,
                        textDecoration: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Abrir observatorio completo →
                    </a>
                  </section>
                </div>
              )}

              {/* Tab 10: Informes, alertas & dossiers */}
              {safeActiveTab === 'informes' && <InformesAlertas />}
            </>
          )}
        </main>
      </div>
    </MediosDrawerProvider>
  )
}
