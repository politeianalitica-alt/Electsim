'use client'
/**
 * `<SubtabContent subtabSlug overrideLabel? showHeader? />` · cuerpo compartido
 * entre `<SubtabLanding>` (standalone deep-link page) y el render INLINE en
 * `app/macro/page.tsx?tab={slug}` (Sprint L F1).
 *
 * Si `showHeader=true` añade el bloque h1+description+freshness. Si es false
 * (modo inline dentro de MacroShell), omite el header porque MacroShell ya
 * pinta su propio hero ejecutivo arriba.
 *
 * Hooks idénticos a los de SubtabLanding:
 *  - Overview fetch desde `/api/macro/{slug}/overview`
 *  - Hexmap data Eurostat NUTS2 con selector de métrica
 *  - Hero IA, Termómetro, RadarChart, Alertas, FamilyKpiGrid, Calendario,
 *    bloques sectoriales/activos condicionales, Hexmap CCAA, DatosGobRadar.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { HeroEjecutivo } from './HeroEjecutivo'
import { DomainHero } from './DomainHero'
// Sprint N5: TermometroPulso retirado del body (redundante con PressureBar del hero superior).
// import { TermometroPulso } from './TermometroPulso'
import { FamilyKpiGrid } from './FamilyKpiGrid'
import { CalendarioReleases } from './CalendarioReleases'
import { AlertasMacro } from './AlertasMacro'
import { DatosGobRadar } from './DatosGobRadar'
import { MercadosEnrichmentBlock } from './MercadosEnrichmentBlock'
import { HogaresExtrasBlock } from './HogaresExtrasBlock'
import { TrendsTable } from './TrendsTable'
import { SourcesFooter } from './SourcesFooter'
import { PeerComparisonBlock } from './PeerComparisonBlock'
import { InsightsBlock } from './InsightsBlock'
import { RadarChart } from '../charts/RadarChart'
import { Treemap } from '../charts/Treemap'
import { CCAAHexmap } from '../charts/CCAAHexmap'
import { SECTOR_CATALOG } from '@/lib/macro/sector-catalog'
import { COMPANY_CATALOG } from '@/lib/macro/company-catalog'
import { ASSET_CATALOG } from '@/lib/macro/asset-catalog'
import { listCCAA, getCCAAByNuts2 } from '@/lib/macro/ccaa-catalog'
import { getSubtab, FAMILY_META, type SubtabConfig } from '@/lib/macro/subtab-registry'
import type { PulsoIndicatorMeta, PulsoFamily } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface FamilyGroup {
  meta: typeof FAMILY_META[PulsoFamily]
  indicators: { id: string; meta: PulsoIndicatorMeta; data: PulsoFetchResult }[]
}

interface OverviewResponse {
  ok: boolean
  generated_at: string
  termometro: { score: number; bySignal: { id: string; vote: number; reason: string }[] }
  coverage: { total: number; live: number; stale: number; missing: number }
  byId: Record<string, PulsoFetchResult>
  byFamily: Record<string, FamilyGroup>
}

interface Props {
  subtabSlug: string
  overrideLabel?: string
  /** Si true, renderiza header h1+desc dentro del body. Default true (standalone). */
  showHeader?: boolean
}

export function SubtabContent({ subtabSlug, overrideLabel, showHeader = true }: Props) {
  const config = getSubtab(subtabSlug) as SubtabConfig | undefined
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ccaaData, setCcaaData] = useState<{ id: string; value: number | null; tooltipLabel?: string }[]>(
    () =>
      listCCAA().map((c) => ({
        id: c.id,
        value: c.gdpShare,
        tooltipLabel: c.label,
      }))
  )
  const [ccaaMetric, setCcaaMetric] = useState<'gdpShare' | 'gdp_per_capita' | 'unemployment'>('gdpShare')

  useEffect(() => {
    if (!config) {
      setError('subtab_no_encontrado')
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    fetch(`/api/macro/${subtabSlug}/overview`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (!j?.ok) {
          setError(j?.error || 'overview_failed')
          return
        }
        setOverview(j as OverviewResponse)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [subtabSlug, config])

  useEffect(() => {
    if (ccaaMetric === 'gdpShare') {
      setCcaaData(
        listCCAA().map((c) => ({ id: c.id, value: c.gdpShare, tooltipLabel: c.label }))
      )
      return
    }
    let alive = true
    fetch(`/api/eurostat/regions-nuts2?metric=${ccaaMetric}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive || !j?.ok) return
        const mapped = (j.regions || [])
          .map((r: { nuts2: string; value: number | null }) => {
            const ccaa = getCCAAByNuts2(r.nuts2)
            return ccaa ? { id: ccaa.id, value: r.value, tooltipLabel: ccaa.label } : null
          })
          .filter(Boolean) as { id: string; value: number | null; tooltipLabel?: string }[]
        const byId: Record<string, { id: string; value: number | null; tooltipLabel?: string }> = {}
        for (const m of mapped) byId[m.id] = m
        setCcaaData(
          listCCAA().map((c) => byId[c.id] || { id: c.id, value: null, tooltipLabel: c.label })
        )
      })
      .catch(() => {
        setCcaaData(
          listCCAA().map((c) => ({ id: c.id, value: c.gdpShare, tooltipLabel: c.label }))
        )
      })
    return () => {
      alive = false
    }
  }, [ccaaMetric])

  const labelMap = useMemo(() => {
    if (!config) return {}
    const m: Record<string, string> = {}
    for (const ind of config.indicators) m[ind.id] = ind.shortLabel || ind.label
    return m
  }, [config])

  const signalsForHero = useMemo(() => {
    if (!overview || !config) return []
    return config.indicators.map((ind) => {
      const d = overview.byId[ind.id]
      return {
        id: ind.id,
        family: ind.family,
        label: ind.label,
        unit: ind.unit,
        lastValue: d?.last?.value ?? null,
        lastPeriod: d?.last?.period ?? null,
        source: ind.source,
        sourceCode: ind.sourceCode,
        threshold: ind.threshold,
        status: d?.status ?? 'missing',
      }
    })
  }, [overview, config])

  if (!config) {
    return (
      <div style={{ padding: 30, color: '#dc2626' }}>
        Subtab <code>{subtabSlug}</code> no está registrado.{' '}
        <Link href="/macro" style={{ color: '#0F766E' }}>Volver a Macro</Link>
      </div>
    )
  }

  const label = overrideLabel ?? config.label

  return (
    <>
      {showHeader && (
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
            {label} · España
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', maxWidth: 760 }}>
            {config.description} · {config.indicators.length} indicadores live con análisis IA automático por gráfica.
          </p>
          {overview && (
            <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8' }}>
              {overview.coverage.live}/{overview.coverage.total} fuentes live · datos {new Date(overview.generated_at).toLocaleString('es-ES')}
            </p>
          )}
        </header>
      )}

      {loading && (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Cargando indicadores live…
        </div>
      )}

      {error && !loading && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
          Error cargando overview: {error}
        </div>
      )}

      {overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Sprint N7.2 · Toolbar con export CSV */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', fontSize: 11 }}>
            <a
              href={`/api/macro/export-csv/${subtabSlug}`}
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: '#fff',
                border: `1px solid ${config.accent}`,
                color: config.accent,
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 11,
              }}
              title={`Descarga ${config.indicators.length} indicadores como CSV (metadatos + series temporales)`}
            >
              ⬇ Exportar CSV · {config.indicators.length} indicadores
            </a>
          </div>

          <HeroEjecutivo
            tabSlug={subtabSlug}
            tabLabel={label}
            termometroScore={overview.termometro.score}
            signals={signalsForHero}
            loading={loading}
          />

          {/* Sprint M F1 · DomainHero específico por subtab (visual identity propia) */}
          <DomainHero subtabSlug={subtabSlug} byId={overview.byId} accent={config.accent} />

          {/* Sprint N9 · Insights automáticos · titulares accionables sin IA */}
          <InsightsBlock
            indicators={config.indicators}
            byId={overview.byId}
            subtabSlug={subtabSlug}
            accent={config.accent}
            termometroScore={overview.termometro.score}
            coverage={overview.coverage}
          />

          {/* Sprint N5 (2026-05-23): TermometroPulso retirado del body porque
              el score ya se muestra en el hero superior con barra horizontal
              (PressureBar) + el RadarChart de abajo visualiza la descomposición
              de las 8 señales. Decisión del usuario: "no me gusta el termómetro".
              Conservado el RadarChart porque ofrece una vista visual distinta. */}

          {/* Tabla de tendencias compacta · toda la matriz en una vista escaneable */}
          <TrendsTable
            indicators={config.indicators}
            byId={overview.byId}
            accent={config.accent}
            subtabSlug={subtabSlug}
          />

          {overview.termometro.bySignal.length >= 4 && (
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${config.accent}`, borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: config.accent, textTransform: 'uppercase' }}>
                Radar de dimensiones · top {Math.min(overview.termometro.bySignal.length, 8)} indicadores
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                Vista compuesta · cada eje normalizado 0-100 según semáforo del umbral. Centro = score global.
              </p>
              <div style={{ marginTop: 12 }}>
                <RadarChart
                  accent={config.accent}
                  centerValue={overview.termometro.score}
                  centerLabel="SCORE"
                  data={overview.termometro.bySignal.slice(0, 8).map((s) => ({
                    id: s.id,
                    label: labelMap[s.id] || s.id,
                    value: s.vote,
                  }))}
                />
              </div>
            </section>
          )}

          <AlertasMacro byId={overview.byId} catalog={config.indicators} subtabSlug={subtabSlug} />
          <FamilyKpiGrid byFamily={overview.byFamily} subtabSlug={subtabSlug} />

          {/* Sprint N8 · Comparativa España vs peers UE (DE/FR/IT/PT/EA20) */}
          <PeerComparisonBlock subtabSlug={subtabSlug} accent={config.accent} />

          <CalendarioReleases />

          {subtabSlug === 'empresas-beneficios' && (
            <>
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${config.accent}`, borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: config.accent, textTransform: 'uppercase' }}>
                  Composición sectorial · {SECTOR_CATALOG.length} sectores · click → detalle
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  Tamaño = peso aproximado sobre PIB · color por sector
                </p>
                <div style={{ marginTop: 12 }}>
                  <Treemap
                    data={SECTOR_CATALOG.map((s) => ({
                      id: s.id,
                      label: s.label,
                      value: s.gdpShare,
                      href: `/macro/empresas-beneficios/sector/${s.id}`,
                    }))}
                    width={760}
                    height={320}
                    unit="% PIB"
                    formatValue={(v) => `${v.toFixed(1)}% PIB`}
                  />
                </div>
              </section>

              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${config.accent}`, borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: config.accent, textTransform: 'uppercase' }}>
                  Cotizadas tractoras · {COMPANY_CATALOG.length} empresas IBEX core
                </p>
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                  {COMPANY_CATALOG.map((c) => (
                    <Link
                      key={c.id}
                      href={`/macro/empresas-beneficios/company/${c.id}`}
                      style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#0f172a', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {c.shortName}
                      <span style={{ display: 'block', fontSize: 9, color: '#64748b', fontWeight: 400 }}>{c.sector}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Sprint N1 · bloques enriquecidos heredados del legacy MercadosActivosTab */}
          {subtabSlug === 'mercados-activos' && <MercadosEnrichmentBlock />}

          {/* Sprint N4 · Hogares profundo · Segments sociales + cruces CIS */}
          {subtabSlug === 'hogares-empleo-vivienda' && <HogaresExtrasBlock />}

          {subtabSlug === 'mercados-activos' && (
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${config.accent}`, borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: config.accent, textTransform: 'uppercase' }}>
                Activos financieros · {ASSET_CATALOG.length} con análisis IA por activo
              </p>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                {ASSET_CATALOG.map((a) => (
                  <Link
                    key={a.id}
                    href={`/macro/mercados-activos/asset/${a.id}`}
                    style={{ display: 'block', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 10, textDecoration: 'none', color: '#0f172a' }}
                  >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{a.shortLabel}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>{a.assetClass.replace('_', ' ')}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Mapa hexagonal CCAA · vista territorial 19 regiones · datos live Eurostat */}
          <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${config.accent}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: config.accent, textTransform: 'uppercase' }}>
                  Distribución territorial · 19 CCAA · click → análisis regional
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  {ccaaMetric === 'gdpShare' && 'Color = peso aproximado sobre PIB nacional.'}
                  {ccaaMetric === 'gdp_per_capita' && 'Color = PIB per cápita por NUTS2 · Eurostat nama_10r_2gdp.'}
                  {ccaaMetric === 'unemployment' && 'Color = tasa de paro 15-74y por NUTS2 · Eurostat lfst_r_lfu3rt.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(
                  [
                    ['gdpShare', '% PIB'],
                    ['gdp_per_capita', 'PIB pc'],
                    ['unemployment', 'Paro %'],
                  ] as const
                ).map(([key, lbl]) => (
                  <button
                    key={key}
                    onClick={() => setCcaaMetric(key)}
                    style={{
                      fontSize: 10,
                      padding: '4px 10px',
                      border: `1px solid ${ccaaMetric === key ? config.accent : '#e5e7eb'}`,
                      background: ccaaMetric === key ? config.accent : '#fff',
                      color: ccaaMetric === key ? '#fff' : '#475569',
                      fontWeight: 600,
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <CCAAHexmap
                accent={config.accent}
                unit={ccaaMetric === 'unemployment' ? '%' : ccaaMetric === 'gdp_per_capita' ? '€' : '% PIB'}
                formatValue={(v) =>
                  ccaaMetric === 'gdp_per_capita'
                    ? v.toLocaleString('es-ES', { maximumFractionDigits: 0 })
                    : v.toFixed(1)
                }
                hrefFor={(id) => `/macro/${subtabSlug}/region/${id}`}
                data={ccaaData}
              />
            </div>
          </section>

          <DatosGobRadar subtabSlug={subtabSlug} />

          {/* Sprint N5 · Footer de fuentes activas · audit completo del subtab */}
          <SourcesFooter indicators={config.indicators} byId={overview.byId} accent={config.accent} />

          <footer style={{ marginTop: 14, padding: '14px 0', borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#94a3b8' }}>
            Datos live cacheados 30min · Análisis IA Gemini 2.0 Flash Lite (primario) → Groq llama-3.3-70b (fallback) · server-side.
            Las lecturas IA no son recomendaciones de inversión.
          </footer>
        </div>
      )}
    </>
  )
}

export default SubtabContent
