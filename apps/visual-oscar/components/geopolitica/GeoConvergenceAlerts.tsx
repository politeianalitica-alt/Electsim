'use client'
/**
 * `<GeoConvergenceAlerts />` · Sprint G8.
 *
 * El feature analítico estrella: detecta países donde MÚLTIPLES capas de
 * datos convergen en señal de riesgo elevado al mismo tiempo. Replica lo
 * que un senior intel analyst hace manualmente: cruzar ACLED + UCDP +
 * ReliefWeb + Travel Advisory + baseline en una vista única.
 *
 * Output: top países por convergence_score con descomposición de signals
 * por capa. Click país → drill profundo /geopolitica/pais/[iso3].
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Signal { source: string; level: 'HIGH' | 'CRITICAL'; detail: string }
interface Alert {
  iso3: string
  iso2: string
  name: string
  region: string
  convergence_score: number
  signal_count: number
  critical_count: number
  band: string
  signals: Signal[]
}

interface Resp {
  ok: boolean
  n_countries_analyzed?: number
  n_flagged?: number
  summary?: { triple_convergencia: number; doble_convergencia: number; senal_unica: number }
  alerts?: Alert[]
  methodology?: string
  inspiration?: string
  error?: string
}

const BAND_COLOR: Record<string, { bg: string; track: string; fg: string }> = {
  'TRIPLE CONVERGENCIA': { bg: '#7f1d1d', track: '#7f1d1d', fg: '#fff' },
  'DOBLE CONVERGENCIA':  { bg: '#dc2626', track: '#dc2626', fg: '#fff' },
  'SEÑAL ÚNICA':         { bg: '#f59e0b', track: '#f59e0b', fg: '#fff' },
  'NORMAL':              { bg: '#94a3b8', track: '#94a3b8', fg: '#fff' },
}

const SOURCE_COLOR: Record<string, string> = {
  ACLED:      '#dc2626',
  UCDP:       '#7c3aed',
  ReliefWeb:  '#0ea5e9',
  Travel:     '#f97316',
  Baseline:   '#64748b',
}

export function GeoConvergenceAlerts() {
  const router = useRouter()
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/convergence', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: 'linear-gradient(180deg, #1a0e0e 0%, #0f172a 100%)',
      border: '1px solid #7f1d1d',
      borderLeft: '4px solid #dc2626',
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
    }}>
      <header style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#fca5a5', textTransform: 'uppercase' }}>
          ◆ Convergencia multi-source · alertas analíticas
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Países donde 2+ capas (ACLED táctico · UCDP estructural · ReliefWeb humanitario ·
          Travel consular · Baseline) muestran riesgo elevado al mismo tiempo. El equivalente
          al cross-source check que hace un senior intel analyst.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Calculando convergencia…</p>}

      {data?.ok && (
        <>
          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 }}>
            <Stat label="Países analizados" value={String(data.n_countries_analyzed ?? 0)} color="#94a3b8" />
            <Stat label="Triple convergencia" value={String(data.summary?.triple_convergencia ?? 0)} color="#fca5a5" />
            <Stat label="Doble convergencia" value={String(data.summary?.doble_convergencia ?? 0)} color="#f59e0b" />
            <Stat label="Señal única" value={String(data.summary?.senal_unica ?? 0)} color="#cbd5e1" />
          </div>

          {/* Lista de alertas */}
          {data.alerts && data.alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
              {data.alerts.map((a) => {
                const bc = BAND_COLOR[a.band] || BAND_COLOR.NORMAL
                return (
                  <button
                    key={a.iso3}
                    onClick={() => router.push(`/geopolitica/pais/${a.iso3}`)}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      background: '#1e293b',
                      border: `1px solid ${bc.track}40`,
                      borderLeft: `4px solid ${bc.track}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      color: '#f1f5f9',
                      transition: 'background 0.15s, transform 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{a.name}</span>
                        <span style={{ fontSize: 9, color: '#64748b', letterSpacing: 0.5 }}>ISO3 {a.iso3} · {a.region}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: bc.bg,
                          color: bc.fg,
                          letterSpacing: 0.5,
                        }}>
                          {a.band}
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: bc.track, fontFamily: 'ui-monospace, monospace' }}>
                          {a.convergence_score}
                        </span>
                      </div>
                    </div>
                    {/* Signals por capa */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {a.signals.map((s, i) => {
                        const sc = SOURCE_COLOR[s.source] || '#94a3b8'
                        return (
                          <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 60px 1fr',
                            gap: 8,
                            fontSize: 10,
                            padding: '3px 6px',
                            borderRadius: 3,
                            background: '#0f172a',
                          }}>
                            <span style={{ color: sc, fontWeight: 700, letterSpacing: 0.4 }}>{s.source}</span>
                            <span style={{
                              fontSize: 8,
                              padding: '1px 4px',
                              borderRadius: 2,
                              background: s.level === 'CRITICAL' ? '#dc2626' : '#f59e0b',
                              color: '#fff',
                              fontWeight: 700,
                              textAlign: 'center',
                            }}>{s.level}</span>
                            <span style={{ color: '#cbd5e1' }}>{s.detail}</span>
                          </div>
                        )
                      })}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin convergencias detectadas en este momento (todos los países con &lt;3 puntos de score).</p>
          )}

          <p style={{ margin: '14px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: 10, lineHeight: 1.5 }}>
            {data.methodology} · <em>{data.inspiration}</em>
          </p>
        </>
      )}

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#fca5a5' }}>
          Convergencia no disponible · {data.error}
        </p>
      )}
    </section>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 8, background: '#0f172a', borderRadius: 4, border: '1px solid #1e293b' }}>
      <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

export default GeoConvergenceAlerts
