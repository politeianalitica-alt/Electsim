'use client'
/**
 * <PetroleoCrackSpread /> · Energía v3 · E6 (Petróleo profundo)
 *
 * Crack spread (margen bruto de refino): lo que gana, por barril, una refinería
 * al convertir crudo en producto terminado, antes de costes operativos. Se
 * calcula con las series que la vista YA tiene cargadas (gasolina RBOB, diésel /
 * heating oil y Brent), sin pedir nada nuevo al servidor.
 *
 * ── Unidades (la pega que PetroleoView documentaba sin resolver) ──────────────
 *   Gasolina y diésel cotizan en USD/galón; el crudo en USD/barril.
 *   1 barril = 42 galones → para comparar hay que escalar el producto a barriles.
 *
 *     crack_producto ($/bbl) = producto ($/gal) × 42 − crudo ($/bbl)
 *
 *   Mostramos tres márgenes:
 *     · Gasolina crack  = gasolina×42 − Brent
 *     · Diésel crack    = diésel×42 − Brent
 *     · 3-2-1 crack     = (2·gasolina + 1·diésel)×42 − 3·Brent, todo ÷ 3
 *       (la proporción 3-2-1 — 3 barriles de crudo → 2 de gasolina + 1 de
 *        destilado — es el proxy estándar del margen de refino simple en EE. UU.)
 *
 * La evolución dibuja el 3-2-1 alineando las tres series por fecha común.
 * Degradación honesta (CLAUDE.md): si falta alguna serie, empty-state con la
 * razón. Cero emojis · Unicode (⇡ ⇣). No toca catalog.ts/types.ts/shared.
 */
import { useMemo } from 'react'
import type { EnergyCommoditySeries } from '@/lib/energia/types'

const OIL = '#0F766E'
const GAL_PER_BBL = 42

interface CrackPoint {
  date: string
  gasoline: number
  diesel: number
  blend321: number
}

/** Alinea gasolina/diésel/Brent por fecha común y calcula los tres cracks ($/bbl). */
export function buildCrackSeries(
  gasolina: EnergyCommoditySeries | null,
  diesel: EnergyCommoditySeries | null,
  brent: EnergyCommoditySeries | null,
): CrackPoint[] {
  if (!gasolina || !diesel || !brent) return []
  const dByDate = new Map(diesel.series.map((p) => [p.date, p.value]))
  const bByDate = new Map(brent.series.map((p) => [p.date, p.value]))
  const out: CrackPoint[] = []
  for (const g of gasolina.series) {
    const d = dByDate.get(g.date)
    const b = bByDate.get(g.date)
    if (d == null || b == null) continue
    if (!Number.isFinite(g.value) || !Number.isFinite(d) || !Number.isFinite(b)) continue
    const gasoline = g.value * GAL_PER_BBL - b
    const dieselCrack = d * GAL_PER_BBL - b
    const blend321 = (2 * g.value * GAL_PER_BBL + d * GAL_PER_BBL - 3 * b) / 3
    out.push({ date: g.date, gasoline, diesel: dieselCrack, blend321 })
  }
  return out
}

export function PetroleoCrackSpread({
  gasolina,
  diesel,
  brent,
}: {
  gasolina: EnergyCommoditySeries | null
  diesel: EnergyCommoditySeries | null
  brent: EnergyCommoditySeries | null
}) {
  const crack = useMemo(() => buildCrackSeries(gasolina, diesel, brent), [gasolina, diesel, brent])

  if (crack.length < 2) {
    const missing: string[] = []
    if (!gasolina || gasolina.series.length < 2) missing.push('gasolina (RBOB)')
    if (!diesel || diesel.series.length < 2) missing.push('diésel (heating oil)')
    if (!brent || brent.series.length < 2) missing.push('Brent')
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        Crack spread no disponible: requiere las tres series alineadas por fecha
        {missing.length ? ` (falta(n): ${missing.join(', ')})` : ''}. Brent suele venir de Alpha
        Vantage (spot EIA) y los refinados de Yahoo (NYMEX), que pueden no compartir suficientes
        fechas comunes; se conecta en cuanto coinciden en el calendario diario.
      </div>
    )
  }

  const last = crack[crack.length - 1]
  const avg321 = crack.reduce((s, p) => s + p.blend321, 0) / crack.length
  const blendSeries = crack.map((p) => ({ date: p.date, value: p.blend321 }))

  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#3a3a3d', lineHeight: 1.5 }}>
        <strong>Margen bruto de refino</strong>: lo que gana una refinería por barril al transformar
        crudo en producto terminado, antes de costes operativos.
      </p>

      {/* Los tres márgenes actuales */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
        <Metric label="3-2-1 crack (actual)" value={fmtUsdBbl(last.blend321)} highlight color={crackColor(last.blend321)} />
        <Metric label="Gasolina crack" value={fmtUsdBbl(last.gasoline)} color={crackColor(last.gasoline)} />
        <Metric label="Diésel crack" value={fmtUsdBbl(last.diesel)} color={crackColor(last.diesel)} />
        <Metric label="3-2-1 medio periodo" value={fmtUsdBbl(avg321)} />
      </div>

      <CrackChart series={blendSeries} />

      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Cálculo propio sobre las series ya cargadas: producto (USD/gal) × 42 − Brent (USD/bbl), con 1
        barril = 42 galones. El 3-2-1 = (2·gasolina + 1·diésel)·42 − 3·Brent, ÷ 3 (proxy estándar del
        margen de refino simple en EE. UU.). RBOB y heating oil son los mejores proxies públicos
        gratuitos de gasolina y diésel; usamos Brent como crudo de referencia europeo. Un margen alto
        anima a refinar más (más oferta de carburante); márgenes negativos llevan a recortar carga.
      </p>
    </div>
  )
}

export default PetroleoCrackSpread

// ─── Helpers locales ─────────────────────────────────────────────────────────
function fmtUsdBbl(v: number): string {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)} $/bbl`
}
function crackColor(v: number): string {
  return v >= 0 ? '#16A34A' : '#DC2626'
}

function Metric({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)', color: highlight ? color ?? OIL : color ?? '#1d1d1f', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function CrackChart({ series }: { series: Array<{ date: string; value: number }> }) {
  const pts = series.filter((p) => Number.isFinite(p.value))
  if (pts.length < 2) return <div style={{ fontSize: 12, color: '#86868b' }}>Serie insuficiente.</div>

  const W = 1080, H = 200, P = 12
  const vals = pts.map((p) => p.value)
  let max = Math.max(...vals, 0)
  let min = Math.min(...vals, 0)
  const pad = (max - min) * 0.08 || 1
  max += pad
  min -= pad
  const range = max - min || 1
  const n = pts.length
  const x = (i: number) => P + (i / Math.max(1, n - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - (v - min) / range) * (H - 2 * P)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const zeroY = y(0)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" strokeWidth={1} />
      ))}
      <line x1={P} x2={W - P} y1={zeroY} y2={zeroY} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 4" />
      <path d={line} fill="none" stroke={OIL} strokeWidth={2} />
      {pts.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.value)} r={5} fill="transparent" style={{ cursor: 'crosshair' }}>
          <title>{p.date}: {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)} $/bbl (3-2-1)</title>
        </circle>
      ))}
      <text x={x(0)} y={H + 12} textAnchor="start" style={{ fontSize: 9, fill: '#86868b' }}>{pts[0].date}</text>
      <text x={x(n - 1)} y={H + 12} textAnchor="end" style={{ fontSize: 9, fill: '#86868b' }}>{pts[n - 1].date}</text>
    </svg>
  )
}
