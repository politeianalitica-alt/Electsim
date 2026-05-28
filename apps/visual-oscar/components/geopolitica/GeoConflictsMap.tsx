'use client'
/**
 * <GeoConflictsMap /> · Sprint GEO-RADAR C3
 *
 * Mapa mundial focalizado en países con conflicto activo. Cada país es un
 * círculo dimensionado por intensidad (events_30d). Color según tono medio
 * GDELT. Click → callback para abrir drawer de detalle.
 *
 * Consume /api/geopolitica/conflictos-activos.
 */
import { useEffect, useState } from 'react'
import { projectEquirect } from '@/lib/geopolitica/country-coords'

interface Conflict {
  iso3: string; name_es: string; iso2: string
  lat: number; lon: number; region: string
  intensity: 1 | 2 | 3 | 4 | 5
  intensity_baseline?: 1 | 2 | 3 | 4 | 5
  events_30d: number; events_7d: number
  trend: 'subida' | 'estable' | 'bajada'
  avg_tone: number
  top_themes: string[]
  top_sources: string[]
  // ── Nuevos campos UCDP/PRIO (FIX-A3) ─────────────────────────────
  conflict_label?: string
  conflict_type?: 'state-based' | 'non-state' | 'one-sided'
  start_year?: number
  actors?: string[]
  fatalities_year_est?: number
  notes?: string
  has_gdelt_signal?: boolean
  source?: 'ucdp-baseline' | 'ucdp+gdelt' | 'gdelt-only'
}
interface Response {
  ok: boolean
  conflicts: Conflict[]
  total_with_signal: number
  summary?: {
    total_conflicts: number
    total_with_gdelt_signal: number
    total_events_30d: number
    total_fatalities_year_est: number
    by_intensity: Record<string, number>
    gdelt_available: boolean
  }
  _meta?: { sources: Array<{ name: string; role: string }>; method: string; capa_b_status?: string }
}

interface Props {
  onConflictClick?: (iso3: string) => void
}

const W = 720, H = 320

function colorForTone(tone: number): string {
  if (tone < -6) return '#7f1d1d'
  if (tone < -3) return '#dc2626'
  if (tone < 0) return '#ea580c'
  if (tone < 3) return '#f59e0b'
  return '#737373'
}

export function GeoConflictsMap({ onConflictClick }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<Conflict | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/conflictos-activos', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '14px 18px', position: 'relative',
    }}>
      <header style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Mapa de conflictos activos · UCDP/PRIO + GDELT enrichment
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          Top 30 conflictos UCDP estructurales (Ucrania, Sudán, Myanmar, Gaza, Yemen, RDC, Sahel...) +
          enriquecimiento GDELT táctico (volumen 30d, tono, tendencia). Click para drawer detalle.
        </p>
        {data?.summary && (
          <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
            {data.summary.total_conflicts} conflictos UCDP · {data.summary.total_with_gdelt_signal} con señal GDELT 30d ·
            ~{Math.round(data.summary.total_fatalities_year_est / 1000)}k muertes/año estimadas
            {data._meta?.capa_b_status === 'rate-limited' && (
              <span style={{ marginLeft: 8, color: '#f59e0b' }}>· GDELT rate-limited (seed UCDP íntegro)</span>
            )}
          </p>
        )}
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando conflictos activos…</p>}

      {!loading && data?.ok && (
        <>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{
            display: 'block', background: '#0f172a', borderRadius: 8,
          }}>
            {/* Continentes esquemáticos · líneas guía */}
            {[0, 90, 180, 270, 360].map((x) => (
              <line key={x} x1={(x / 360) * W} y1={0} x2={(x / 360) * W} y2={H} stroke="#1e293b" strokeWidth={0.3} />
            ))}
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#334155" strokeWidth={0.5} />

            {/* Conflictos */}
            {data.conflicts.map((c) => {
              const { x, y } = projectEquirect(c.lat, c.lon, W, H)
              const r = 4 + c.intensity * 3   // 7-19 px
              const color = colorForTone(c.avg_tone)
              return (
                <g key={c.iso3}>
                  {/* Halo pulsante para intensidad 4-5 */}
                  {c.intensity >= 4 && (
                    <circle cx={x} cy={y} r={r + 6} fill="none" stroke={color} strokeWidth={1} opacity={0.4}>
                      <animate attributeName="r" values={`${r + 2};${r + 12};${r + 2}`} dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={x} cy={y} r={r}
                    fill={color} opacity={0.8}
                    stroke="#fff" strokeWidth={1}
                    onMouseEnter={() => setHover(c)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onConflictClick?.(c.iso3)}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Trend arrow micro */}
                  {c.trend === 'subida' && (
                    <text x={x + r + 2} y={y - r} fontSize={9} fill="#dc2626" fontWeight={700}>↑</text>
                  )}
                  {c.trend === 'bajada' && (
                    <text x={x + r + 2} y={y - r} fontSize={9} fill="#16a34a" fontWeight={700}>↓</text>
                  )}
                </g>
              )
            })}
          </svg>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center', fontSize: 9, color: '#475569', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Tono GDELT:</span>
            {[
              { label: '<-6 hostil extremo', color: '#7f1d1d' },
              { label: '-6 a -3 hostil', color: '#dc2626' },
              { label: '-3 a 0 negativo', color: '#ea580c' },
              { label: '0 a +3 neutro', color: '#f59e0b' },
            ].map((l) => (
              <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: l.color, borderRadius: '50%' }} />
                <span>{l.label}</span>
              </span>
            ))}
            <span style={{ marginLeft: 'auto', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {data.conflicts.length} conflictos · {data.total_with_signal} países con señal
            </span>
          </div>

          {hover && (
            <div style={{
              position: 'absolute', top: 60, right: 20,
              background: '#0f172a', color: '#fff',
              padding: '12px 14px', borderRadius: 8, fontSize: 11, maxWidth: 320,
              pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{hover.name_es}</p>
              {hover.conflict_label && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#fbbf24', fontWeight: 600 }}>
                  {hover.conflict_label}
                </p>
              )}
              <p style={{ margin: '6px 0 0', fontFamily: 'ui-monospace, monospace' }}>
                {'★'.repeat(hover.intensity)}{'☆'.repeat(5 - hover.intensity)}
                {hover.conflict_type && (
                  <span style={{ marginLeft: 6, fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {hover.conflict_type}
                  </span>
                )}
              </p>
              {hover.actors && hover.actors.length > 0 && (
                <p style={{ margin: '4px 0 0', fontSize: 10, color: '#cbd5e1' }}>
                  <span style={{ color: '#94a3b8' }}>Actores: </span>
                  {hover.actors.slice(0, 3).join(' · ')}
                </p>
              )}
              {hover.fatalities_year_est !== undefined && hover.fatalities_year_est > 0 && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#fca5a5' }}>
                  ~{hover.fatalities_year_est.toLocaleString('es-ES')} muertes/año
                  {hover.start_year && <span style={{ color: '#94a3b8' }}> · desde {hover.start_year}</span>}
                </p>
              )}
              {hover.events_30d > 0 ? (
                <>
                  <p style={{ margin: '6px 0 0', fontSize: 10, color: '#cbd5e1' }}>
                    GDELT: <strong>{hover.events_30d} arts 30d</strong> · tono {hover.avg_tone}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#cbd5e1' }}>
                    Tendencia: <strong style={{ color: hover.trend === 'subida' ? '#dc2626' : hover.trend === 'bajada' ? '#16a34a' : '#94a3b8' }}>{hover.trend}</strong>
                    {' '}({hover.events_7d} arts 7d)
                  </p>
                </>
              ) : (
                <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                  GDELT sin señal 30d (rate-limit o censura informativa)
                </p>
              )}
              <p style={{ margin: '6px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>Click para drawer detalle →</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default GeoConflictsMap
