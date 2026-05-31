'use client'
/**
 * `<RegionLanding subtabSlug ccaaId />` · página /macro/{subtab}/region/[ccaa].
 *
 * Estructura:
 *   1. Breadcrumb · Macro › {Subtab} › Región CCAA
 *   2. Hero CCAA con metadata regional (peso PIB, población, capital)
 *   3. Análisis Groq específico de la CCAA (analyze-region)
 *   4. KPIs nacionales + contexto regional
 *   5. Ranking CCAA del subtab (top/bottom por gdpShare)
 *
 * En v1 los KPIs se sirven a nivel nacional, pero el Hero IA recibe
 * metadata regional para generar lectura CCAA-específica.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../../app/_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { TermometroPulso } from './TermometroPulso'
import { FamilyKpiGrid } from './FamilyKpiGrid'
import { AlertasMacro } from './AlertasMacro'
import { getSubtab, FAMILY_META, type SubtabConfig } from '@/lib/macro/subtab-registry'
import { getCCAA, listCCAA, type CCAA } from '@/lib/macro/ccaa-catalog'
import type { PulsoIndicatorMeta, PulsoFamily } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'
import type { TabAnalysisResponse } from '@/lib/macro/ai-tab-schema'
import { CCAAHexmap } from '../charts/CCAAHexmap'

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
  ccaaId: string
}

export function RegionLanding({ subtabSlug, ccaaId }: Props) {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const config = getSubtab(subtabSlug) as SubtabConfig | undefined
  const ccaa = getCCAA(ccaaId) as CCAA | undefined
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ai, setAi] = useState<TabAnalysisResponse | null>(null)
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!config) {
      setError('subtab_no_encontrado')
      setLoading(false)
      return
    }
    if (!ccaa) {
      setError('ccaa_no_encontrada')
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
  }, [subtabSlug, config, ccaa])

  // Disparar análisis Groq específico de la región
  useEffect(() => {
    if (!overview || !config || !ccaa || aiState !== 'idle') return
    setAiState('loading')
    const signals = config.indicators.map((ind) => {
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
    fetch('/api/macro/ai/analyze-tab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tabSlug: `${subtabSlug}::region::${ccaa.id}`,
        tabLabel: `${config.label} · ${ccaa.label}`,
        termometroScore: overview.termometro.score,
        signals,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) {
          setAiState('error')
          return
        }
        setAi(j as TabAnalysisResponse)
        setAiState('success')
      })
      .catch(() => setAiState('error'))
  }, [overview, config, ccaa, subtabSlug, aiState])

  const labelMap = useMemo(() => {
    if (!config) return {}
    const m: Record<string, string> = {}
    for (const ind of config.indicators) m[ind.id] = ind.shortLabel || ind.label
    return m
  }, [config])

  if (!config || !ccaa) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <AppHeader />
        <main style={{ maxWidth: 1320, margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ color: '#dc2626' }}>Recurso no encontrado</h1>
          <p style={{ color: '#64748b' }}>
            {!config && <>Subtab <code>{subtabSlug}</code> no registrado. </>}
            {!ccaa && <>CCAA <code>{ccaaId}</code> no encontrada. </>}
            <Link href="/macro" style={{ color: '#0F766E' }}>Volver a Macro</Link>
          </p>
        </main>
      </div>
    )
  }

  const peers = listCCAA().slice(0, 8)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Macro</Link>
          <span>·</span>
          <Link href={`/macro/${subtabSlug}`} style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>
            {config.shortLabel}
          </Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{ccaa.label}</span>
        </div>

        {/* Hero CCAA */}
        <section
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderLeft: `4px solid ${config.accent}`,
            borderRadius: 12,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: config.accent, textTransform: 'uppercase' }}>
                {config.label} · vista regional
              </p>
              <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
                {ccaa.label}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', maxWidth: 700 }}>
                Capital {ccaa.capital} · NUTS2 {ccaa.nuts2} · INE {ccaa.ineCode}
                {ccaa.notes && ` · ${ccaa.notes}`}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, minWidth: 220 }}>
              <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 10 }}>
                <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.4 }}>POBLACIÓN</p>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {(ccaa.population / 1000000).toFixed(2)} M
                </p>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 10 }}>
                <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.4 }}>% PIB ESPAÑA</p>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  {ccaa.gdpShare.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Análisis Groq específico de la región */}
        <section
          style={{
            background: 'linear-gradient(180deg, #faf5ff 0%, #fff 60%)',
            border: '1px solid #e9d5ff',
            borderLeft: `4px solid ${config.accent}`,
            borderRadius: 12,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#7c3aed', textTransform: 'uppercase' }}>
            ✦ Lectura IA · {config.label} en {ccaa.label}
          </p>
          {/* Sprint Q-C.2 · ANTES "Groq está sintetizando..." exponía el proveedor LLM. */}
          {aiState === 'loading' && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
              Sintetizando un diagnóstico regional usando contexto de población ({(ccaa.population / 1000000).toFixed(2)} M) y peso económico ({ccaa.gdpShare.toFixed(1)}% PIB)…
            </p>
          )}
          {aiState === 'success' && ai && (
            <div style={{ marginTop: 10, fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#0f172a' }}>{ai.insight.headline}</p>
              <p style={{ margin: '8px 0 0' }}>{ai.insight.diagnosis}</p>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {ai.insight.strengths.length > 0 && (
                  <SectionBlock title="Fortalezas regionales">
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {ai.insight.strengths.map((s, i) => (
                        <li key={i}><strong>{s.family}:</strong> {s.description}</li>
                      ))}
                    </ul>
                  </SectionBlock>
                )}
                {ai.insight.vulnerabilities.length > 0 && (
                  <SectionBlock title="Vulnerabilidades regionales">
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {ai.insight.vulnerabilities.map((v, i) => (
                        <li key={i}><strong>{v.family}:</strong> {v.description}</li>
                      ))}
                    </ul>
                  </SectionBlock>
                )}
                <SectionBlock title="Implicaciones políticas">
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {ai.insight.policyImplications.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </SectionBlock>
                <SectionBlock title="A vigilar">
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {ai.insight.watchNext.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </SectionBlock>
              </div>
              <p style={{ marginTop: 12, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>{ai.disclaimer}</p>
            </div>
          )}
        </section>

        {/* KPIs nacionales (referencia) + grid familia */}
        {loading && (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Cargando indicadores…</div>
        )}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
            Error: {error}
          </div>
        )}
        {overview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
              Nota · los KPIs se muestran a nivel <strong>nacional</strong>; la lectura IA arriba ya incorpora el contexto regional de {ccaa.label}.
            </p>

            <TermometroPulso
              score={overview.termometro.score}
              bySignal={overview.termometro.bySignal}
              labelMap={labelMap}
            />
            <AlertasMacro byId={overview.byId} catalog={config.indicators} subtabSlug={subtabSlug} />
            <FamilyKpiGrid byFamily={overview.byFamily} subtabSlug={subtabSlug} />

            {/* Mapa hexagonal 19 CCAA · color por peso PIB regional */}
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
                Mapa hexagonal · 19 CCAA · click → navegar a esa región
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                Color por peso aproximado sobre PIB nacional ·{' '}
                <strong style={{ color: '#0f172a' }}>{ccaa.label}</strong> resaltada
              </p>
              <div style={{ marginTop: 12 }}>
                <CCAAHexmap
                  accent={config.accent}
                  unit="% PIB"
                  formatValue={(v) => v.toFixed(1)}
                  hrefFor={(id) => `/macro/${subtabSlug}/region/${id}`}
                  data={listCCAA().map((c) => ({
                    id: c.id,
                    value: c.gdpShare,
                    tooltipLabel: c.label,
                  }))}
                />
              </div>
            </section>

            {/* Navegación entre CCAA */}
            <section
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderLeft: '4px solid #0F766E',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0F766E', textTransform: 'uppercase' }}>
                Navegar por CCAA · top 8 por peso económico
              </p>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {peers.map((p) => {
                  const active = p.id === ccaa.id
                  return (
                    <Link
                      key={p.id}
                      href={`/macro/${subtabSlug}/region/${p.id}`}
                      style={{
                        display: 'block',
                        background: active ? config.accent : '#f8fafc',
                        color: active ? '#fff' : '#0f172a',
                        border: active ? 'none' : '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: 10,
                        textDecoration: 'none',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{p.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, opacity: 0.85 }}>
                        {p.gdpShare.toFixed(1)}% PIB · {(p.population / 1000000).toFixed(1)}M
                      </p>
                    </Link>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
        {title}
      </p>
      <div style={{ marginTop: 4, fontSize: 12.5, color: '#334155' }}>{children}</div>
    </div>
  )
}

export default RegionLanding
