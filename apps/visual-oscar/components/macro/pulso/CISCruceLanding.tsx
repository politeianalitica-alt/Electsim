'use client'
/**
 * `<CISCruceLanding cruceId />` · Sprint N4.
 *
 * Landing para un cruce CIS × indicador económico real.
 * Muestra serie CIS (passthrough /api/cis/...) + indicador económico del catálogo
 * + lectura analítica del gap percepción vs realidad.
 *
 * Si el endpoint CIS devuelve vacío (probable en producción), el componente
 * sigue mostrando el indicador económico + la interpretación esperada.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../../app/_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { getHogaresCisCrossing, listHogaresCisCrossings } from '@/lib/macro/hogares-cis'
import { getSubtab } from '@/lib/macro/subtab-registry'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface OverviewResp {
  ok: boolean
  byId: Record<string, PulsoFetchResult>
}

interface CisPoint { period: string; value: number }
interface CisResp {
  ok?: boolean
  series?: CisPoint[]
  data?: CisPoint[]
  rows?: CisPoint[]
  message?: string
}

interface Props { cruceId: string }

export function CISCruceLanding({ cruceId }: Props) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const cruce = getHogaresCisCrossing(cruceId)
  const subtab = getSubtab('hogares-empleo-vivienda')
  const [overview, setOverview] = useState<OverviewResp | null>(null)
  const [cisSeries, setCisSeries] = useState<CisPoint[] | null>(null)
  const [cisError, setCisError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cruce) { setLoading(false); return }
    let alive = true
    const tasks = [
      fetch('/api/macro/hogares-empleo-vivienda/overview', { cache: 'force-cache' })
        .then((r) => r.json())
        .then((j) => { if (alive && j?.ok) setOverview(j as OverviewResp) })
        .catch(() => {}),
      fetch(cruce.cisEndpoint, { cache: 'force-cache' })
        .then((r) => r.json())
        .then((j: CisResp) => {
          if (!alive) return
          const series = j?.series || j?.data || j?.rows || []
          if (Array.isArray(series) && series.length > 0) setCisSeries(series)
          else setCisError(j?.message || 'sin datos CIS disponibles para este tag')
        })
        .catch(() => { if (alive) setCisError('endpoint CIS no disponible') }),
    ]
    Promise.all(tasks).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [cruce])

  if (!cruce) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <AppHeader />
        <main style={{ maxWidth: 1320, margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ color: '#dc2626' }}>Cruce CIS no encontrado</h1>
          <p style={{ color: '#64748b' }}>
            El cruce <code>{cruceId}</code> no está registrado.{' '}
            <Link href="/macro?tab=hogares-empleo-vivienda" style={{ color: '#0F766E' }}>
              Volver a Hogares
            </Link>
          </p>
        </main>
      </div>
    )
  }

  const econ = overview?.byId?.[cruce.economicIndicatorId]
  const econMeta = subtab?.indicators.find((i) => i.id === cruce.economicIndicatorId)
  const lastCis = cisSeries?.[cisSeries.length - 1]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Macro</Link>
          <span>·</span>
          <Link href="/macro?tab=hogares-empleo-vivienda" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Hogares</Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>CIS · {cruce.label}</span>
        </div>

        <header style={{ marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: cruce.accent, textTransform: 'uppercase' }}>
            Cruce percepción × realidad
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
            {cruce.label}
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569', maxWidth: 760, lineHeight: 1.55 }}>
            {cruce.description}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#0f172a', fontStyle: 'italic', maxWidth: 760, fontWeight: 600 }}>
            🔎 {cruce.analyticalQuestion}
          </p>
        </header>

        {loading && (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Cargando serie CIS y indicador económico…
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Dos columnas: CIS vs Económico */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${cruce.accent}`, borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: cruce.accent, textTransform: 'uppercase' }}>
                  Percepción CIS · tag “{cruce.cisProblemTag}”
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  % que cita el problema en barómetro CIS mensual
                </p>
                {lastCis ? (
                  <>
                    <p style={{ margin: '12px 0 0', fontSize: 32, fontWeight: 700, color: cruce.accent, fontVariantNumeric: 'tabular-nums' as any }}>
                      {lastCis.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                      Último dato · {lastCis.period} · serie de {cisSeries?.length || 0} puntos
                    </p>
                  </>
                ) : (
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    {cisError || 'Serie CIS pendiente de carga en producción'}
                  </p>
                )}
                <p style={{ margin: '12px 0 0', fontSize: 10, color: '#94a3b8' }}>
                  Endpoint: <code>{cruce.cisEndpoint}</code>
                </p>
              </section>

              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0F766E', borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0F766E', textTransform: 'uppercase' }}>
                  Indicador económico real
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  {econMeta?.shortLabel || cruce.economicIndicatorId} ({econMeta?.unit || ''})
                </p>
                {econ?.last?.value != null ? (
                  <>
                    <p style={{ margin: '12px 0 0', fontSize: 32, fontWeight: 700, color: '#0F766E', fontVariantNumeric: 'tabular-nums' as any }}>
                      {econ.last.value.toLocaleString('es-ES', { maximumFractionDigits: 2 })}{econMeta?.unit || ''}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                      Último dato · {econ.last.period}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Sin dato económico disponible</p>
                )}
                <Link
                  href={`/macro/hogares-empleo-vivienda/indicator/${cruce.economicIndicatorId}`}
                  style={{ display: 'inline-block', marginTop: 12, fontSize: 11, color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}
                >
                  Ver indicador completo →
                </Link>
              </section>
            </div>

            {/* Lectura analítica del gap */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #7c3aed', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#7c3aed', textTransform: 'uppercase' }}>
                Lectura del desalineamiento
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#0f172a', lineHeight: 1.6 }}>
                <strong>Pregunta crítica:</strong> {cruce.analyticalQuestion}
              </p>
              <p style={{ margin: '12px 0 0', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                <strong>Interpretación esperada:</strong> {cruce.interpretationHint}
              </p>
              <p style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                Nota: análisis Groq por cruce CIS llegará en próxima iteración (requiere endpoint /api/macro/ai/analyze-cis-gap).
                Mientras tanto, la interpretación viene del catálogo hogares-cis.ts curado manualmente.
              </p>
            </section>

            {/* Navegación entre cruces */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0F766E', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0F766E', textTransform: 'uppercase' }}>
                Otros cruces CIS × realidad
              </p>
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {listHogaresCisCrossings().filter((c) => c.id !== cruce.id).map((c) => (
                  <Link
                    key={c.id}
                    href={`/macro/hogares-empleo-vivienda/cis/${c.id}`}
                    style={{ background: '#f8fafc', border: `1px solid ${c.accent}`, borderRadius: 6, padding: '6px 12px', fontSize: 11, color: c.accent, textDecoration: 'none', fontWeight: 600 }}
                  >
                    {c.shortLabel}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default CISCruceLanding
