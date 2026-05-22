'use client'
/**
 * `<SubtabLanding subtabSlug="..." />` · Landing genérico reutilizado por
 * todos los subtabs v3 (`pulso-macro`, `regimen-monetario`, `margen-fiscal`,
 * `riesgo-sistemico`).
 *
 * Cargado por:
 *   - app/macro/pulso/page.tsx (subtabSlug="pulso-macro")
 *   - app/macro/regimen-monetario/page.tsx
 *   - app/macro/margen-fiscal/page.tsx
 *   - app/macro/riesgo-sistemico/page.tsx
 *
 * Consume:
 *   - GET /api/macro/{subtab}/overview
 *   - Hero IA via POST /api/macro/ai/analyze-tab
 *   - Calendario via /api/macro/releases (compartido entre subtabs)
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../../app/_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { HeroEjecutivo } from './HeroEjecutivo'
import { TermometroPulso } from './TermometroPulso'
import { FamilyKpiGrid } from './FamilyKpiGrid'
import { CalendarioReleases } from './CalendarioReleases'
import { AlertasMacro } from './AlertasMacro'
import { DatosGobRadar } from './DatosGobRadar'
import { RadarChart } from '../charts/RadarChart'
import { Treemap } from '../charts/Treemap'
import { SECTOR_CATALOG } from '@/lib/macro/sector-catalog'
import { COMPANY_CATALOG } from '@/lib/macro/company-catalog'
import { ASSET_CATALOG } from '@/lib/macro/asset-catalog'
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
  /** Si se proporciona, override del label. Útil cuando ya existe slug pero quieres rebrandear. */
  overrideLabel?: string
}

export function SubtabLanding({ subtabSlug, overrideLabel }: Props) {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const config = getSubtab(subtabSlug) as SubtabConfig | undefined
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <AppHeader />
        <main style={{ maxWidth: 1320, margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ color: '#dc2626' }}>Subtab no encontrado</h1>
          <p style={{ color: '#64748b' }}>
            El subtab <code>{subtabSlug}</code> no está registrado.{' '}
            <Link href="/macro" style={{ color: '#0F766E' }}>
              Volver a Macro
            </Link>
          </p>
        </main>
      </div>
    )
  }

  const label = overrideLabel ?? config.label

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>
            ← Macro
          </Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{label}</span>
          {overview && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
              {overview.coverage.live}/{overview.coverage.total} fuentes live · datos {new Date(overview.generated_at).toLocaleString('es-ES')}
            </span>
          )}
        </div>

        {/* Header */}
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
            {label} · España
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', maxWidth: 760 }}>
            {config.description} · {config.indicators.length} indicadores live con análisis IA opcional por gráfica.
          </p>
        </header>

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
            <HeroEjecutivo
              tabSlug={subtabSlug}
              tabLabel={label}
              termometroScore={overview.termometro.score}
              signals={signalsForHero}
              loading={loading}
            />

            <TermometroPulso
              score={overview.termometro.score}
              bySignal={overview.termometro.bySignal}
              labelMap={labelMap}
            />

            {/* Radar 5+ dimensiones · si hay al menos 4 señales con voto */}
            {overview.termometro.bySignal.length >= 4 && (
              <section
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderLeft: `4px solid ${config.accent}`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
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

            <CalendarioReleases />

            {/* Bloque sectorial · sólo en empresas-beneficios */}
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
                        style={{
                          background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '6px 10px',
                          fontSize: 11, color: '#0f172a', textDecoration: 'none', fontWeight: 600,
                        }}
                      >
                        {c.shortName}
                        <span style={{ display: 'block', fontSize: 9, color: '#64748b', fontWeight: 400 }}>{c.sector}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Bloque activos · sólo en mercados-activos */}
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
                      style={{
                        display: 'block', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 10,
                        textDecoration: 'none', color: '#0f172a',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{a.shortLabel}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>{a.assetClass.replace('_', ' ')}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <DatosGobRadar subtabSlug={subtabSlug} />

            <footer
              style={{
                marginTop: 14,
                padding: '14px 0',
                borderTop: '1px solid #e5e7eb',
                fontSize: 10,
                color: '#94a3b8',
              }}
            >
              Fuentes: INE WSTempus, IMF DataMapper (WEO), Eurostat SDMX-JSON, BCE SDW, BIS, datos.gob.es.
              Datos live cacheados 30min. Análisis IA Groq GPT-OSS con cascade Anthropic. Las lecturas IA no
              son recomendaciones de inversión.
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}

export default SubtabLanding
