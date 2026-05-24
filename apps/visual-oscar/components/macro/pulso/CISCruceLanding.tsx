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
  // Sprint N12 · empty state shape del endpoint cis/problemas
  indicator?: string
  activation_steps?: string[]
  avance_url?: string
  microdata_portal?: string
  methodology?: string
}

interface CisCatalogItem {
  id: string
  title: string
  issued: string | null
  modified: string | null
  distribution_urls: string[]
}
interface CisCatalogResp {
  ok: boolean
  n_items?: number
  items?: CisCatalogItem[]
}

interface Props { cruceId: string }

export function CISCruceLanding({ cruceId }: Props) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const cruce = getHogaresCisCrossing(cruceId)
  const subtab = getSubtab('hogares-empleo-vivienda')
  const [overview, setOverview] = useState<OverviewResp | null>(null)
  const [cisSeries, setCisSeries] = useState<CisPoint[] | null>(null)
  const [cisMeta, setCisMeta] = useState<CisResp | null>(null)
  const [cisCatalog, setCisCatalog] = useState<CisCatalogItem[] | null>(null)
  const [cisError, setCisError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cruce) { setLoading(false); return }
    let alive = true
    // Sprint N12 · 3 fetches paralelos:
    //  1. overview del subtab (para el indicador económico cruzado)
    //  2. cis/problemas?tag=... (suele devolver empty state didáctico de CIS)
    //  3. cis/catalogo (timeline real de barómetros vía CKAN datos.gob.es)
    const tasks = [
      fetch('/api/macro/hogares-empleo-vivienda/overview', { cache: 'force-cache' })
        .then((r) => r.json())
        .then((j) => { if (alive && j?.ok) setOverview(j as OverviewResp) })
        .catch(() => {}),
      fetch(cruce.cisEndpoint, { cache: 'force-cache' })
        .then((r) => r.json())
        .then((j: CisResp) => {
          if (!alive) return
          setCisMeta(j) // guardar metadata aunque sea empty state
          const series = j?.series || j?.data || j?.rows || []
          if (Array.isArray(series) && series.length > 0) setCisSeries(series)
          else setCisError(j?.message || 'CIS no expone serie numérica vía API · ver catálogo de barómetros publicados')
        })
        .catch(() => { if (alive) setCisError('endpoint CIS no disponible') }),
      fetch('/api/cis/catalogo', { cache: 'force-cache' })
        .then((r) => r.json())
        .then((j: CisCatalogResp) => {
          if (alive && j?.ok && Array.isArray(j.items)) setCisCatalog(j.items.slice(0, 8))
        })
        .catch(() => {}),
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
            ⌕ {cruce.analyticalQuestion}
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
                {/* Sprint N12 · Activación didáctica del empty state CIS */}
                {!lastCis && cisMeta?.activation_steps && (
                  <details style={{ marginTop: 10, fontSize: 10, color: '#64748b' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                      ¿Por qué no hay serie numérica? · Cómo activar
                    </summary>
                    <ol style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                      {cisMeta.activation_steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                    {cisMeta.methodology && (
                      <p style={{ margin: '8px 0 0', fontStyle: 'italic', color: '#94a3b8' }}>
                        Metodología: {cisMeta.methodology}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      {cisMeta.avance_url && (
                        <a href={cisMeta.avance_url} target="_blank" rel="noopener noreferrer" style={{ color: cruce.accent, fontWeight: 600 }}>
                          Avance PDF →
                        </a>
                      )}
                      {cisMeta.microdata_portal && (
                        <a href={cisMeta.microdata_portal} target="_blank" rel="noopener noreferrer" style={{ color: cruce.accent, fontWeight: 600 }}>
                          Microdato CSV/SPSS →
                        </a>
                      )}
                    </div>
                  </details>
                )}
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

            {/* Sprint N12 · Catálogo real de barómetros CIS publicados (CKAN datos.gob.es) */}
            {cisCatalog && cisCatalog.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${cruce.accent}`, borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: cruce.accent, textTransform: 'uppercase' }}>
                  Últimos {cisCatalog.length} barómetros CIS publicados · vía CKAN datos.gob.es
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  Timeline real de publicaciones. Click en cualquiera abre el dataset oficial con distribución PDF + microdato CSV/SPSS.
                </p>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cisCatalog.map((item) => {
                    const dateLabel = (item.modified || item.issued || '').slice(0, 10)
                    const primaryUrl = item.distribution_urls[0] || item.id
                    return (
                      <a
                        key={item.id}
                        href={primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '90px 1fr auto',
                          gap: 12,
                          alignItems: 'center',
                          padding: '8px 10px',
                          background: '#f8fafc',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          textDecoration: 'none',
                          fontSize: 11,
                          color: '#0f172a',
                        }}
                      >
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: '#64748b' }}>
                          {dateLabel || '—'}
                        </span>
                        <span style={{ color: '#0f172a', fontWeight: 500 }}>{item.title}</span>
                        <span style={{ fontSize: 9, color: cruce.accent, fontWeight: 700 }}>
                          {item.distribution_urls.length > 0 ? `${item.distribution_urls.length} archivo${item.distribution_urls.length > 1 ? 's' : ''} →` : 'ficha →'}
                        </span>
                      </a>
                    )
                  })}
                </div>
              </section>
            )}

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
