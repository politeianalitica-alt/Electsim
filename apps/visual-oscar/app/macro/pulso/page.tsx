'use client'
/**
 * `/macro/pulso` · Landing v3 del subtab Pulso macro.
 *
 * Estructura:
 *   1. Hero ejecutivo IA (lectura tab-level)
 *   2. Termómetro 0-100 con breakdown
 *   3. Family KPI grid (18 indicadores)
 *   4. Alertas activas (umbrales rotos)
 *   5. Calendario próximos releases
 *   6. Link de regreso a /macro
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { HeroEjecutivo } from '@/components/macro/pulso/HeroEjecutivo'
import { TermometroPulso } from '@/components/macro/pulso/TermometroPulso'
import { FamilyKpiGrid } from '@/components/macro/pulso/FamilyKpiGrid'
import { CalendarioReleases } from '@/components/macro/pulso/CalendarioReleases'
import { AlertasMacro } from '@/components/macro/pulso/AlertasMacro'
import {
  PULSO_INDICATORS,
  PULSO_FAMILY_META,
  type PulsoFamily,
  type PulsoIndicatorMeta,
} from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface FamilyGroup {
  meta: typeof PULSO_FAMILY_META[PulsoFamily]
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

export default function PulsoLandingPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/macro/pulso/overview', { cache: 'force-cache' })
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
  }, [])

  const labelMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const ind of PULSO_INDICATORS) m[ind.id] = ind.shortLabel || ind.label
    return m
  }, [])

  // Construye lista de signals para el hero IA (compacto)
  const signalsForHero = useMemo(() => {
    if (!overview) return []
    return PULSO_INDICATORS.map((ind) => {
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
  }, [overview])

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
          <span style={{ color: '#0f172a', fontWeight: 600 }}>Pulso macro</span>
          {overview && (
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
              {overview.coverage.live}/{overview.coverage.total} fuentes live · datos {new Date(overview.generated_at).toLocaleString('es-ES')}
            </span>
          )}
        </div>

        {/* Header */}
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
            Pulso macro · España
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', maxWidth: 760 }}>
            Diagnóstico transversal del estado macroeconómico: PIB, demanda, empleo, precios, sector exterior y
            proyecciones IMF · {PULSO_INDICATORS.length} indicadores live con análisis IA opcional por gráfica.
          </p>
        </header>

        {loading && (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Cargando indicadores macro live…
          </div>
        )}

        {error && !loading && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
            Error cargando overview: {error}
          </div>
        )}

        {overview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Hero IA */}
            <HeroEjecutivo
              tabSlug="pulso-macro"
              tabLabel="Pulso macro"
              termometroScore={overview.termometro.score}
              signals={signalsForHero}
              loading={loading}
            />

            {/* Termómetro */}
            <TermometroPulso
              score={overview.termometro.score}
              bySignal={overview.termometro.bySignal}
              labelMap={labelMap}
            />

            {/* Alertas */}
            <AlertasMacro byId={overview.byId} catalog={PULSO_INDICATORS} />

            {/* Family grid */}
            <FamilyKpiGrid byFamily={overview.byFamily} />

            {/* Calendario */}
            <CalendarioReleases />

            {/* Footer / fuentes */}
            <footer
              style={{
                marginTop: 14,
                padding: '14px 0',
                borderTop: '1px solid #e5e7eb',
                fontSize: 10,
                color: '#94a3b8',
              }}
            >
              Fuentes: INE WSTempus (CNT, IPC, EPA), IMF DataMapper (WEO 132 indicadores), Eurostat
              SDMX-JSON, BCE SDW, BIS. Datos live. Análisis IA Groq GPT-OSS con cascade Anthropic. Las
              lecturas IA no son recomendaciones de inversión.
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}
