'use client'
/**
 * <GasTtfStructure /> · Energía v3 · E7 (Gas profundo)
 *
 * Estructura temporal del TTF (hub europeo del gas). REGLA CLAVE del sprint: si
 * NO hay curva de futuros con datos reales, NO se inventa contango/backwardation.
 * Las APIs gratuitas configuradas (Alpha Vantage / Yahoo) NO publican la forward
 * curve del TTF; por tanto este componente:
 *   - Si recibe una `forwardCurve` con datos reales (prop opcional, hoy ausente),
 *     dibuja la curva y deriva contango/backwardation del propio dato.
 *   - Si NO la recibe, NO infiere estructura de plazos. Muestra la TENDENCIA
 *     reciente del TTF spot (pendiente cualitativa sobre la serie histórica que
 *     ya trae GasView) + una nota cualitativa, y marca explícitamente que la
 *     curva forward no tiene fuente conectada (empty-state honesto).
 *
 * No hace fetch propio: recibe la serie spot del TTF que GasView ya pide a
 * `/api/energia/commodities?category=gas`. Cero emojis · Unicode.
 */
import { useMemo } from 'react'
import type { EnergyCommoditySeries } from '@/lib/energia/types'

const GAS = '#1D4ED8'
const TTF_COLOR = '#7C3AED'

/** Punto de una eventual curva de futuros real (no disponible hoy). */
export interface TtfForwardPoint {
  /** Etiqueta del vencimiento (ej. 'M+1', 'Q4-26', 'Cal-27'). */
  label: string
  /** Precio del contrato en €/MWh. */
  price: number
}

interface GasTtfStructureProps {
  /** Serie spot del TTF (la que ya fetchea GasView). */
  ttf: EnergyCommoditySeries | null
  /**
   * Curva de futuros REAL, si algún día se conecta una fuente (ICE/EEX). Si se
   * omite, NO se infiere estructura de plazos (no se inventa contango).
   */
  forwardCurve?: TtfForwardPoint[]
  loading?: boolean
}

export function GasTtfStructure({ ttf, forwardCurve, loading }: GasTtfStructureProps) {
  // Tendencia cualitativa sobre la serie spot (NO es estructura de plazos).
  // El hook va ANTES de cualquier return temprano (rules-of-hooks).
  const trend = useMemo(() => deriveSpotTrend(ttf), [ttf])

  if (loading) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Cargando estructura temporal del TTF…</div>
  }

  const hasForward = Array.isArray(forwardCurve) && forwardCurve.length >= 2

  return (
    <div>
      {hasForward ? (
        <ForwardCurveView curve={forwardCurve as TtfForwardPoint[]} spot={ttf?.latest ?? null} />
      ) : (
        <NoForwardCurve ttf={ttf} trend={trend} />
      )}
    </div>
  )
}

export default GasTtfStructure

// ─── Caso REAL: curva de futuros disponible (hoy ausente) ────────────────────
function ForwardCurveView({ curve, spot }: { curve: TtfForwardPoint[]; spot: number | null }) {
  const first = curve[0].price
  const last = curve[curve.length - 1].price
  const structure = last > first * 1.005 ? 'contango' : last < first * 0.995 ? 'backwardation' : 'plana'
  const structColor = structure === 'contango' ? '#DC2626' : structure === 'backwardation' ? '#16A34A' : '#6e6e73'
  const max = Math.max(...curve.map((p) => p.price))
  const min = Math.min(...curve.map((p) => p.price))
  const range = max - min || 1

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        {spot != null && <Metric label="Spot" value={`${spot.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €/MWh`} />}
        <Metric label="Estructura" value={structure} color={structColor} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, padding: '0 4px' }}>
        {curve.map((p) => {
          const h = 18 + ((p.price - min) / range) * 110
          return (
            <div key={p.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>
                {p.price.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
              </span>
              <div style={{ width: '100%', height: h, background: TTF_COLOR, borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
              <span style={{ fontSize: 9, color: '#86868b' }}>{p.label}</span>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Curva de futuros del TTF. <strong>Contango</strong>: los vencimientos lejanos cotizan por
        encima del spot (incentiva almacenar). <strong>Backwardation</strong>: lo contrario (escasez
        inmediata).
      </p>
    </div>
  )
}

// ─── Caso HONESTO: sin curva → tendencia spot + nota cualitativa ─────────────
function NoForwardCurve({
  ttf,
  trend,
}: {
  ttf: EnergyCommoditySeries | null
  trend: SpotTrend | null
}) {
  return (
    <div>
      {trend ? (
        <>
          <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <Metric
              label="TTF spot"
              value={ttf?.latest != null ? `${ttf.latest.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${ttf.unit}` : '—'}
            />
            <Metric label="Tendencia 30d" value={trend.label} color={trend.color} />
            {trend.changePct != null && (
              <Metric label="Variación 30d" value={`${trend.changePct >= 0 ? '+' : ''}${trend.changePct.toFixed(1)}%`} color={trend.color} />
            )}
          </div>
          <Sparkline series={ttf!.series} color={TTF_COLOR} />
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5, marginBottom: 12 }}>
          Sin serie spot del TTF suficiente para calcular tendencia ahora. El TTF (€/MWh) no se expone
          en las APIs gratuitas configuradas (Alpha Vantage / Yahoo); cuando la serie aparezca se
          mostrará aquí su tendencia reciente.
        </div>
      )}

      {/* Empty-state honesto de la forward curve */}
      <div
        style={{
          marginTop: 4,
          padding: '12px 14px',
          border: '1px dashed #CBD5E1',
          borderRadius: 10,
          background: '#F8FAFC',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94A3B8' }}>◐</span> Curva de futuros · sin fuente conectada
        </div>
        <p style={{ margin: 0, fontSize: 10.5, color: '#64748B', lineHeight: 1.55 }}>
          No se muestra estructura de plazos (contango/backwardation) porque <strong>requiere la curva
          de futuros real</strong> del TTF (ICE/EEX), que no está disponible en las APIs gratuitas
          configuradas. Para no inducir a error, no se infiere contango a partir del spot: arriba solo
          se muestra la tendencia reciente del precio al contado, que es un dato distinto de la
          estructura de plazos. Al conectar una fuente de futuros, este panel pasará a dibujar la curva
          y a derivar la estructura de su propio dato.
        </p>
      </div>
    </div>
  )
}

// ─── Tendencia cualitativa sobre la serie spot (NO estructura de plazos) ─────
interface SpotTrend {
  label: string
  color: string
  changePct: number | null
}

function deriveSpotTrend(ttf: EnergyCommoditySeries | null): SpotTrend | null {
  if (!ttf || !Array.isArray(ttf.series) || ttf.series.length < 2) return null
  const chg = ttf.change_30d ?? ttf.change_7d ?? null
  if (chg == null) {
    return { label: 'sin variación de referencia', color: '#6e6e73', changePct: null }
  }
  let label = 'estable'
  let color = '#6e6e73'
  if (chg >= 8) {
    label = 'al alza'
    color = '#DC2626'
  } else if (chg >= 2) {
    label = 'ligera alza'
    color = '#D97706'
  } else if (chg <= -8) {
    label = 'a la baja'
    color = '#16A34A'
  } else if (chg <= -2) {
    label = 'ligera baja'
    color = '#16A34A'
  }
  return { label, color, changePct: chg }
}

// ─── Sparkline minimalista (sin reutilizar el LineChart de GasView) ──────────
function Sparkline({ series, color }: { series: Array<{ date: string; value: number }>; color: string }) {
  const pts = series.filter((p) => Number.isFinite(p.value))
  if (pts.length < 2) return null
  const W = 1080
  const H = 90
  const P = 6
  const vals = pts.map((p) => p.value)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const range = max - min || 1
  const n = pts.length
  const x = (i: number) => P + (i / Math.max(1, n - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - (v - min) / range) * (H - 2 * P)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={line} fill="none" stroke={color} strokeWidth={2} />
      <circle cx={x(n - 1)} cy={y(pts[n - 1].value)} r={3.5} fill={color} />
    </svg>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)', color: color ?? GAS, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}
