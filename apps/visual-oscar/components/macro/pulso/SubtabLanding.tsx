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

            <AlertasMacro byId={overview.byId} catalog={config.indicators} subtabSlug={subtabSlug} />

            <FamilyKpiGrid byFamily={overview.byFamily} subtabSlug={subtabSlug} />

            <CalendarioReleases />

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
