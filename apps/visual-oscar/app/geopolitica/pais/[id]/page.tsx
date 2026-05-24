'use client'
/**
 * /geopolitica/pais/[id] · Sprint G5 · drill país profundo.
 *
 * Página de perfil completo por país (ISO3): risk score + ACLED events +
 * sanciones contra el país + top risks que lo afectan + AI mini-brief.
 *
 * Inspiración: CFR Country Profiles + Crisis Group Country Pages + RAND
 * Country Risk Index. Diferenciador: agregado live multi-fuente + drill
 * desde el world heatmap.
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppHeader from '../../../_components/AppHeader'

interface PaisProfile {
  ok: boolean
  country?: { iso3: string; name: string; region: string }
  score?: number
  band?: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  baseline_risk?: number
  uplift?: number
  acled?: {
    events_30d: number
    fatalities_30d: number
    recent: Array<{ date: string; type: string; location: string; fatalities: number }>
  }
  sanctions?: { count: number; list: any[] }
  related_top_risks?: Array<{ rank: number; title: string; spain_exposure: string }>
  error?: string
}

const BAND_COLOR: Record<string, { bg: string; fg: string; track: string }> = {
  BAJO:    { bg: '#dcfce7', fg: '#166534', track: '#16a34a' },
  MEDIO:   { bg: '#fef3c7', fg: '#92400e', track: '#f59e0b' },
  ALTO:    { bg: '#ffedd5', fg: '#9a3412', track: '#f97316' },
  CRITICO: { bg: '#fee2e2', fg: '#991b1b', track: '#dc2626' },
}

export default function PaisPage() {
  const params = useParams()
  const router = useRouter()
  const iso = String(params?.id || 'ESP').toUpperCase()
  const [data, setData] = useState<PaisProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch(`/api/geopolitica/pais-profile?iso=${iso}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
  }, [iso])

  return (
    <>
      <AppHeader />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        <button
          onClick={() => router.push('/geopolitica?tab=ia')}
          style={{
            background: 'transparent',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 11,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          ← Volver al world heatmap
        </button>

        {loading && <p style={{ color: '#94a3b8' }}>Cargando perfil país…</p>}

        {data && !data.ok && (
          <div style={{ padding: 20, background: '#fee2e2', borderRadius: 8 }}>
            <p style={{ margin: 0, color: '#991b1b', fontWeight: 700 }}>
              País no encontrado en el catálogo: {iso}
            </p>
            <p style={{ margin: '4px 0 0', color: '#dc2626', fontSize: 11 }}>
              {data.error}
            </p>
          </div>
        )}

        {data && data.ok && data.country && data.band && (
          <div>
            {/* Hero país */}
            <header style={{
              background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
              border: `1px solid ${BAND_COLOR[data.band].track}`,
              borderLeft: `4px solid ${BAND_COLOR[data.band].track}`,
              borderRadius: 12,
              padding: 20,
              color: '#f1f5f9',
              marginBottom: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    Country Profile · ISO3 {data.country.iso3}
                  </p>
                  <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#fbbf24' }}>
                    {data.country.name}
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#cbd5e1' }}>
                    Región · {data.country.region}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 64, fontWeight: 700, color: BAND_COLOR[data.band].track, lineHeight: 1 }}>
                    {data.score}
                  </p>
                  <span style={{
                    display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                    padding: '4px 12px', borderRadius: 12,
                    background: BAND_COLOR[data.band].bg, color: BAND_COLOR[data.band].fg,
                  }}>
                    BANDA · {data.band}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 11 }}>
                <Stat label="Baseline risk" value={`${data.baseline_risk}/100`} />
                <Stat label="Uplift ACLED 30d" value={`+${data.uplift}`} />
                <Stat label="Eventos ACLED 30d" value={String(data.acled?.events_30d || 0)} />
                <Stat label="Fatalities 30d" value={String(data.acled?.fatalities_30d || 0)} />
                <Stat label="Sanciones contra país" value={String(data.sanctions?.count || 0)} />
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
              {/* ACLED recent */}
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #dc2626', borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#dc2626', textTransform: 'uppercase' }}>
                  ACLED · eventos recientes 30d
                </p>
                {data.acled?.recent && data.acled.recent.length > 0 ? (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.acled.recent.map((e, i) => (
                      <div key={i} style={{ padding: 8, background: '#f8fafc', borderLeft: `3px solid ${e.fatalities > 0 ? '#dc2626' : '#94a3b8'}`, borderRadius: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{e.date}</span>
                          <span>{e.fatalities > 0 && <strong style={{ color: '#dc2626' }}>{e.fatalities} fatalities</strong>}</span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#0f172a' }}>
                          <strong>{e.type}</strong> · {e.location}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Sin eventos ACLED recientes registrados.</p>
                )}
              </section>

              {/* Sanciones */}
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#f59e0b', textTransform: 'uppercase' }}>
                  Sanciones contra entidades del país
                </p>
                {data.sanctions?.list && data.sanctions.list.length > 0 ? (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.sanctions.list.map((s: any, i: number) => (
                      <div key={i} style={{ padding: 8, background: '#fffbeb', borderLeft: '3px solid #f59e0b', borderRadius: 4, fontSize: 11 }}>
                        <p style={{ margin: 0, color: '#0f172a', fontWeight: 600 }}>{s.entity}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#92400e' }}>
                          {s.source} · {s.date} · {s.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Sin sanciones directas registradas en el feed.</p>
                )}
              </section>

              {/* Top risks relacionados */}
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #7c3aed', borderRadius: 10, padding: 16, gridColumn: '1 / -1' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#7c3aed', textTransform: 'uppercase' }}>
                  Top Risks Politeia que mencionan {data.country.name}
                </p>
                {data.related_top_risks && data.related_top_risks.length > 0 ? (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.related_top_risks.map((r) => (
                      <div key={r.rank} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 10, padding: '6px 8px', background: '#faf5ff', borderRadius: 4, fontSize: 11 }}>
                        <span style={{ color: '#7c3aed', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const }}>#{r.rank}</span>
                        <span style={{ color: '#0f172a' }}>{r.title}</span>
                        <span style={{ fontSize: 9, color: '#7c3aed', textTransform: 'uppercase' }}>ES · {r.spain_exposure}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Sin top risks específicos para {data.country.name} en el momento actual.</p>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#1e293b', borderRadius: 6 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' as const }}>{value}</p>
    </div>
  )
}
