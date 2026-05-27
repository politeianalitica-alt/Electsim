'use client'
/**
 * <EsiosEmisionesChart /> · Sprint ESIOS-DEEP S2
 *
 * Muestra la correlación entre el % de generación renovable y el factor
 * de emisión CO2 del sistema eléctrico (gCO2/kWh) en las últimas 24h.
 *
 * Dos paneles:
 *   1. Dual-axis chart 24h: línea verde % renovable + línea roja gCO2/kWh
 *   2. KPI strip: gCO2/kWh ahora · media 24h · mínimo histórico 24h · máximo
 *
 * Visualiza la regla "más renovable → menos emisiones".
 * Consume /api/esios/mix (ya trae agregados.porcentaje_renovable y
 * agregados.emisiones_co2). Pide series 24h adicional vía /api/esios/indicator.
 *
 * Sin libs de charting · todo SVG inline.
 */
import { useEffect, useState } from 'react'

interface IndicatorPoint { value: number; datetime: string }
interface IndicatorMeta { slug: string; label: string; short: string; unit: string; frequency: string }
interface IndicatorResp {
  ok: boolean
  error?: string
  indicator?: { id: number; name: string; values: IndicatorPoint[] }
  meta?: IndicatorMeta
}

export function EsiosEmisionesChart() {
  const [emisiones, setEmisiones] = useState<IndicatorResp | null>(null)
  const [renovable, setRenovable] = useState<IndicatorResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/esios/indicator/emisiones_co2?hours=24', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/esios/indicator/porcentaje_renovable?hours=24', { cache: 'force-cache' }).then((r) => r.json()),
    ])
      .then(([e, r]) => { if (alive) { setEmisiones(e); setRenovable(r) } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '18px 20px',
    }}>
      <header style={{ marginBottom: 14 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
          letterSpacing: '-0.01em', margin: 0, color: '#1d1d1f',
        }}>
          Emisiones CO2 vs renovables · correlación 24h
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6e6e73' }}>
          A más renovable, menos emisiones. Factor CO2 del sistema (gCO2/kWh) y % renovable
          en eje dual. Fuente ESIOS · horario.
        </p>
      </header>

      {loading && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cargando series ESIOS…</p>}

      {!loading && emisiones && !emisiones.ok && emisiones.error === 'no_key' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b',
          borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e',
        }}>
          <strong>! Configuración pendiente</strong> · ESIOS_API_KEY no está en Vercel env vars.
        </div>
      )}

      {!loading && emisiones?.ok && renovable?.ok && emisiones.indicator && renovable.indicator && (
        <>
          <EmisionesKpis points={emisiones.indicator.values} />
          <DualAxisChart
            emisiones={emisiones.indicator.values}
            renovable={renovable.indicator.values}
          />
          <Correlation
            emisiones={emisiones.indicator.values}
            renovable={renovable.indicator.values}
          />
        </>
      )}
    </section>
  )
}

function EmisionesKpis({ points }: { points: IndicatorPoint[] }) {
  if (points.length === 0) return null
  const last = points[points.length - 1]
  const vals = points.map((p) => p.value)
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
      gap: 10, marginBottom: 12,
    }}>
      <Kpi label="Ahora" value={`${Math.round(last.value)} g/kWh`} sub={last.datetime.slice(11, 16) + 'h'} accent="#dc2626" />
      <Kpi label="Media 24h" value={`${Math.round(avg)} g/kWh`} accent="#0891b2" />
      <Kpi label="Mín 24h" value={`${Math.round(min)} g/kWh`} accent="#16a34a" sub="hora más limpia" />
      <Kpi label="Máx 24h" value={`${Math.round(max)} g/kWh`} accent="#dc2626" sub="hora más sucia" />
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div style={{
      padding: '10px 12px', background: '#fff', borderRadius: 8,
      borderLeft: `3px solid ${accent}`, border: '1px solid #f1f5f9',
    }}>
      <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'ui-monospace, monospace', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>{sub}</p>}
    </div>
  )
}

function DualAxisChart({
  emisiones, renovable,
}: { emisiones: IndicatorPoint[]; renovable: IndicatorPoint[] }) {
  if (emisiones.length < 2 || renovable.length < 2) return null

  const w = 720, h = 200, padL = 40, padR = 40, padT = 16, padB = 22
  const innerW = w - padL - padR
  const innerH = h - padT - padB

  const eVals = emisiones.map((p) => p.value)
  const rVals = renovable.map((p) => p.value)
  const eMin = Math.min(...eVals)
  const eMax = Math.max(...eVals)
  const eRange = eMax - eMin || 1
  const rMin = 0  // % siempre desde 0
  const rMax = Math.max(100, ...rVals)
  const rRange = rMax - rMin || 1

  // Asumimos que emisiones y renovable están alineados por hora (24 puntos cada uno)
  const n = Math.max(emisiones.length, renovable.length)
  const xOf = (i: number) => padL + (i / Math.max(1, n - 1)) * innerW

  const ePath = emisiones.map((p, i) => {
    const x = xOf(i)
    const y = padT + innerH - ((p.value - eMin) / eRange) * innerH
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const rPath = renovable.map((p, i) => {
    const x = xOf(i)
    const y = padT + innerH - ((p.value - rMin) / rRange) * innerH
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        {/* grid */}
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={padL} y1={padT + innerH * t} x2={w - padR} y2={padT + innerH * t} stroke="#f1f5f9" strokeWidth={1} />
        ))}
        {/* eje Y izquierdo · emisiones */}
        {[0, 0.5, 1].map((t) => {
          const v = eMax - eRange * t
          return (
            <text key={t} x={padL - 4} y={padT + innerH * t + 3} fontSize={9} fill="#dc2626" textAnchor="end" fontFamily="ui-monospace, monospace">
              {Math.round(v)}
            </text>
          )
        })}
        {/* eje Y derecho · renovable */}
        {[0, 0.5, 1].map((t) => {
          const v = rMax - rRange * t
          return (
            <text key={t} x={w - padR + 4} y={padT + innerH * t + 3} fontSize={9} fill="#16a34a" textAnchor="start" fontFamily="ui-monospace, monospace">
              {Math.round(v)}%
            </text>
          )
        })}
        {/* paths */}
        <path d={ePath} fill="none" stroke="#dc2626" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d={rPath} fill="none" stroke="#16a34a" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        {/* x ticks */}
        {emisiones.length > 0 && [0, Math.floor(emisiones.length / 2), emisiones.length - 1].map((i) => (
          <text key={i} x={xOf(i)} y={h - 6} fontSize={8} fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {emisiones[i].datetime.slice(11, 16)}
          </text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 10, color: '#475569' }}>
        <Legend color="#dc2626" label="Emisiones gCO2/kWh (izq)" />
        <Legend color="#16a34a" label="% renovable (der)" />
      </div>
    </div>
  )
}

function Correlation({
  emisiones, renovable,
}: { emisiones: IndicatorPoint[]; renovable: IndicatorPoint[] }) {
  const n = Math.min(emisiones.length, renovable.length)
  if (n < 5) return null
  const e = emisiones.slice(-n).map((p) => p.value)
  const r = renovable.slice(-n).map((p) => p.value)
  const eMean = e.reduce((s, v) => s + v, 0) / n
  const rMean = r.reduce((s, v) => s + v, 0) / n
  let num = 0, eD = 0, rD = 0
  for (let i = 0; i < n; i++) {
    num += (e[i] - eMean) * (r[i] - rMean)
    eD += (e[i] - eMean) ** 2
    rD += (r[i] - rMean) ** 2
  }
  const denom = Math.sqrt(eD * rD)
  if (denom === 0) return null
  const corr = num / denom
  const r2 = corr * corr
  return (
    <p style={{ margin: '12px 0 0', fontSize: 11, color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
      Correlación Pearson (24h): <strong style={{ color: corr < -0.5 ? '#16a34a' : corr < 0 ? '#475569' : '#dc2626', fontFamily: 'ui-monospace, monospace' }}>r = {corr.toFixed(2)}</strong>
      {' '} · r² = {r2.toFixed(2)}
      {' '} · {corr < -0.5 ? 'fuerte correlación negativa · más renovable, menos emisiones (esperado)' : corr < 0 ? 'correlación negativa moderada' : 'correlación débil · revisar mix'}
    </p>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-block', width: 10, height: 2, background: color }} />
      <span>{label}</span>
    </span>
  )
}

export default EsiosEmisionesChart
