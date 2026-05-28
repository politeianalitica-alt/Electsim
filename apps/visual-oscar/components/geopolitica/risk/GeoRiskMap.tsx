'use client'
/**
 * <GeoRiskMap /> · Sprint GEO-RP C2
 *
 * Mapa mundial coroplético con IRPC (Índice Riesgo País Compuesto).
 * Diferente al GeoRadarMap del sprint anterior · este usa /api/geopolitica/irpc
 * con dimensiones, EWS flag y top movers integrados.
 *
 * Toggle de capas (esquina sup. derecha):
 *   - IRPC compuesto (default)
 *   - Solo Democracia (V-Dem)
 *   - Solo Seguridad (GDELT WAR_CONFLICT)
 *   - Solo Social (tono GDELT)
 *
 * Click en país → callback onCountryClick(iso3) abre drawer.
 */
import { useEffect, useState } from 'react'
import { projectEquirect } from '@/lib/geopolitica/country-coords'

type Layer = 'irpc' | 'democracia' | 'seguridad' | 'social'

interface CountryIRPC {
  iso3: string; name_es: string; iso2: string
  lat: number; lon: number; region: string
  irpc: number
  dimensions: { institucional: number; democracia: number; seguridad: number; economica: number; social: number }
  raw: { polyarchy: number | null; gdelt_articles_30d?: number; gdelt_tone_value?: number }
  risk_level: 'estable' | 'vigilancia' | 'alerta' | 'crisis'
  alerta_ews: boolean
}

interface Response {
  ok: boolean
  countries: CountryIRPC[]
  summary: { total: number; en_crisis: number; en_alerta: number; regresiones_democraticas: number; ews_activos: number }
}

interface Props {
  onCountryClick?: (iso3: string) => void
}

const W = 720, H = 360

function colorForScore(score: number): string {
  if (score >= 75) return '#7f1d1d'
  if (score >= 55) return '#dc2626'
  if (score >= 30) return '#f59e0b'
  return '#16a34a'
}

function scoreFor(c: CountryIRPC, layer: Layer): number {
  if (layer === 'irpc') return c.irpc
  if (layer === 'democracia') return c.dimensions.democracia
  if (layer === 'seguridad') return c.dimensions.seguridad
  return c.dimensions.social
}

export function GeoRiskMap({ onCountryClick }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<CountryIRPC | null>(null)
  const [layer, setLayer] = useState<Layer>('irpc')

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/irpc', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px', position: 'relative',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            Mapa global IRPC · Índice Riesgo País Compuesto
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
            V-Dem (25%) + GDELT violencia (25%) + GDELT tono (20%) + estrés soberano (15%) + PortWatch (15%) ·
            Pulso animado si EWS activo. Click para drawer.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['irpc', 'democracia', 'seguridad', 'social'] as Layer[]).map((l) => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              style={{
                padding: '4px 8px', borderRadius: 5,
                border: layer === l ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: layer === l ? '#0f172a' : '#fff',
                color: layer === l ? '#fff' : '#475569',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
              }}
            >{l === 'irpc' ? 'IRPC' : l[0].toUpperCase() + l.slice(1)}</button>
          ))}
        </div>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando IRPC mundial…</p>}

      {!loading && data?.ok && (
        <>
          <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{
            display: 'block', background: '#eff6ff', borderRadius: 8,
            border: '1px solid #dbeafe',
          }}>
            {[0, 90, 180, 270, 360].map((x) => (
              <line key={x} x1={(x / 360) * W} y1={0} x2={(x / 360) * W} y2={H} stroke="#cbd5e1" strokeWidth={0.3} strokeDasharray="2 2" />
            ))}
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#94a3b8" strokeWidth={0.5} />

            {data.countries.map((c) => {
              const { x, y } = projectEquirect(c.lat, c.lon, W, H)
              const score = scoreFor(c, layer)
              const fill = colorForScore(score)
              const r = 3 + (score / 100) * 5
              return (
                <g key={c.iso3}>
                  <circle
                    cx={x} cy={y} r={r}
                    fill={fill} opacity={0.85}
                    stroke="#fff" strokeWidth={0.5}
                    onMouseEnter={() => setHover(c)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onCountryClick?.(c.iso3)}
                    style={{ cursor: 'pointer' }}
                  />
                  {c.alerta_ews && (
                    <circle cx={x} cy={y} r={r + 5} fill="none" stroke="#dc2626" strokeWidth={1} opacity={0.7}>
                      <animate attributeName="r" values={`${r + 2};${r + 10};${r + 2}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              )
            })}
          </svg>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center', fontSize: 9, color: '#475569', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Niveles {layer.toUpperCase()}:</span>
            {[
              { label: 'Estable <30', color: '#16a34a' },
              { label: 'Vigilancia 30-55', color: '#f59e0b' },
              { label: 'Alerta 55-75', color: '#dc2626' },
              { label: 'Crisis ≥75', color: '#7f1d1d' },
            ].map((l) => (
              <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: l.color, borderRadius: '50%' }} />
                <span>{l.label}</span>
              </span>
            ))}
            <span style={{ marginLeft: 'auto', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
              {data.summary.en_crisis} crisis · {data.summary.en_alerta} alerta · {data.summary.ews_activos} EWS · {data.summary.total} países
            </span>
          </div>

          {hover && (
            <div style={{
              position: 'absolute', top: 60, right: 20,
              background: '#0f172a', color: '#fff',
              padding: '10px 14px', borderRadius: 8, fontSize: 11, maxWidth: 240,
              pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{hover.name_es}</p>
              <p style={{ margin: '4px 0 0', fontFamily: 'ui-monospace, monospace' }}>
                IRPC <strong style={{ color: colorForScore(hover.irpc) }}>{hover.irpc}</strong> · {hover.risk_level.toUpperCase()}
                {hover.alerta_ews && <span style={{ marginLeft: 6, padding: '1px 6px', background: '#7f1d1d', borderRadius: 3, fontSize: 9 }}>EWS</span>}
              </p>
              <div style={{ marginTop: 6, fontSize: 9, color: '#cbd5e1' }}>
                Inst: {hover.dimensions.institucional} · Dem: {hover.dimensions.democracia} · Seg: {hover.dimensions.seguridad} · Soc: {hover.dimensions.social}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>Click para ficha completa →</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default GeoRiskMap
