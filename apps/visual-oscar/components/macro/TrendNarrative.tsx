'use client'
/**
 * `<TrendNarrative />` · Card explicativa auto-generada de tendencia.
 *
 * Computa: dirección (subiendo/bajando/estable), momentum (acelerando/decelerando),
 * Δ vs 1y ago, vs media 5y, vs forecast IMF (si disponible), umbral académico.
 * Devuelve narrative text en español + iconos.
 *
 * NO usa LLM · es heurística determinista para que no haya costes ni latencia.
 */

interface Point { period: string; value: number | null }

interface Props {
  series: Point[]                  // serie temporal ordenada
  label: string                    // ej. "PIB volumen YoY"
  unit?: string                    // ej. "%", "€"
  forecast?: Point[]               // serie forecast opcional (IMF)
  threshold?: { amber?: number; red?: number; goodAbove?: boolean }
  benchmark?: { label: string; value: number } // ej. UE-27 media
  accent?: string
  decimals?: number
}

function fmt(v: number | null, unit: string, d: number): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v > 0 && unit === '%' ? '+' : ''
  return `${sign}${v.toFixed(d)}${unit}`
}

export function TrendNarrative({
  series,
  label,
  unit = '%',
  forecast,
  threshold,
  benchmark,
  accent = '#0f766e',
  decimals = 1,
}: Props) {
  const valid = (series || []).filter((p) => p.value != null && Number.isFinite(p.value)) as { period: string; value: number }[]
  if (valid.length < 2) {
    return (
      <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6, fontSize: 11, color: '#94a3b8' }}>
        Tendencia · datos insuficientes para análisis ({valid.length} puntos)
      </div>
    )
  }

  const last = valid[valid.length - 1]
  const prev = valid[valid.length - 2]
  const yoyIdx = valid.findIndex((p) => p.period === last.period) - 4 // ~1 año si trimestral
  const yoyPoint = yoyIdx >= 0 ? valid[yoyIdx] : null
  const oneYearAgo = yoyPoint || valid[Math.max(0, valid.length - 13)] // o 12 meses si mensual

  // Media 5y (~60 mensuales o 20 trimestrales)
  const longHist = valid.slice(-Math.min(20, valid.length))
  const avgLong = longHist.reduce((s, p) => s + p.value, 0) / longHist.length

  // Momentum: cambio entre últimos 3 puntos
  const last3 = valid.slice(-3)
  const momentum = last3.length === 3
    ? (last3[2].value - last3[0].value) / 2 // pendiente media
    : null

  const directionDelta = last.value - (prev?.value ?? last.value)
  let direction: 'sube' | 'baja' | 'estable' = 'estable'
  if (Math.abs(directionDelta) > 0.05) direction = directionDelta > 0 ? 'sube' : 'baja'

  let momentumLabel = ''
  if (momentum != null) {
    if (Math.abs(momentum) < 0.1) momentumLabel = 'estable'
    else if (momentum > 0 && direction === 'sube') momentumLabel = 'aceleración alcista'
    else if (momentum > 0 && direction === 'baja') momentumLabel = 'frenando caída'
    else if (momentum < 0 && direction === 'baja') momentumLabel = 'aceleración bajista'
    else if (momentum < 0 && direction === 'sube') momentumLabel = 'pérdida de impulso'
  }

  const deltaVsAvg = last.value - avgLong
  const deltaVsYoy = oneYearAgo ? last.value - oneYearAgo.value : null
  const deltaVsBenchmark = benchmark ? last.value - benchmark.value : null

  // Forecast info
  const fcFiltered = (forecast || []).filter((p) => p.value != null && Number.isFinite(p.value)) as { period: string; value: number }[]
  const fcLast = fcFiltered[fcFiltered.length - 1]
  const fcDelta = fcLast ? fcLast.value - last.value : null

  // Threshold
  let thresholdNote: string | null = null
  let thresholdColor = '#64748b'
  if (threshold) {
    const v = last.value
    const goodAbove = threshold.goodAbove ?? true
    const amber = threshold.amber
    const red = threshold.red
    if (amber != null && red != null) {
      if (goodAbove) {
        if (v < red) { thresholdNote = `Por debajo del umbral crítico ${red}${unit}`; thresholdColor = '#dc2626' }
        else if (v < amber) { thresholdNote = `Por debajo del umbral de alerta ${amber}${unit}`; thresholdColor = '#f59e0b' }
        else { thresholdNote = `Dentro del rango saludable`; thresholdColor = '#16a34a' }
      } else {
        if (v > red) { thresholdNote = `Por encima del umbral crítico ${red}${unit}`; thresholdColor = '#dc2626' }
        else if (v > amber) { thresholdNote = `Por encima del umbral de alerta ${amber}${unit}`; thresholdColor = '#f59e0b' }
        else { thresholdNote = `Dentro del rango saludable`; thresholdColor = '#16a34a' }
      }
    }
  }

  const arrow = direction === 'sube' ? '↑' : direction === 'baja' ? '↓' : '→'
  const arrowColor = direction === 'sube' ? '#16a34a' : direction === 'baja' ? '#dc2626' : '#64748b'

  // Build narrative
  const narrative: string[] = []
  narrative.push(`${label} se sitúa en **${fmt(last.value, unit, decimals)}** (${last.period}), ${direction === 'estable' ? 'sin variación significativa' : `${direction === 'sube' ? 'al alza' : 'a la baja'} ${fmt(directionDelta, unit, decimals)} vs ${prev?.period || 'anterior'}`}${momentumLabel ? `, con ${momentumLabel}` : ''}.`)
  if (deltaVsYoy != null) {
    narrative.push(`Frente a hace ~1 año (${oneYearAgo?.period}): **${fmt(deltaVsYoy, unit, decimals)}**${Math.abs(deltaVsYoy) > Math.abs(deltaVsAvg) * 1.5 ? ' (cambio anual mayor que el patrón histórico)' : ''}.`)
  }
  narrative.push(`Media de los últimos ${longHist.length} períodos: ${fmt(avgLong, unit, decimals)} · desviación vs media: ${fmt(deltaVsAvg, unit, decimals)}.`)
  if (benchmark && deltaVsBenchmark != null) {
    narrative.push(`vs **${benchmark.label}** (${fmt(benchmark.value, unit, decimals)}): ${deltaVsBenchmark > 0 ? 'por encima' : 'por debajo'} en ${fmt(Math.abs(deltaVsBenchmark), unit, decimals)}.`)
  }
  if (fcLast && fcDelta != null) {
    narrative.push(`Forecast IMF a ${fcLast.period}: **${fmt(fcLast.value, unit, decimals)}** (${fcDelta > 0 ? 'expansión' : 'contracción'} esperada de ${fmt(Math.abs(fcDelta), unit, decimals)}).`)
  }

  // Parse markdown bold
  const renderText = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**')
        ? <strong key={i} style={{ color: '#0f172a', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>,
    )

  return (
    <div style={{
      padding: 12,
      background: '#f8fafc',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          ↗ Lectura de tendencia
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: arrowColor, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {arrow} {direction.toUpperCase()}
          {thresholdNote && (
            <span style={{ fontSize: 10, padding: '2px 8px', background: thresholdColor + '22', color: thresholdColor, borderRadius: 999, fontWeight: 600 }}>
              {thresholdNote}
            </span>
          )}
        </span>
      </div>

      {/* KPI grid · 4 cifras clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10, fontSize: 11 }}>
        <Kpi label="Último" value={fmt(last.value, unit, decimals)} period={last.period} accent={accent} />
        <Kpi label="Δ período" value={fmt(directionDelta, unit, decimals)} accent={directionDelta >= 0 ? '#16a34a' : '#dc2626'} />
        {deltaVsYoy != null && <Kpi label="Δ YoY" value={fmt(deltaVsYoy, unit, decimals)} accent={deltaVsYoy >= 0 ? '#16a34a' : '#dc2626'} />}
        {fcLast && <Kpi label="Forecast" value={fmt(fcLast.value, unit, decimals)} period={fcLast.period} accent="#7c3aed" />}
      </div>

      <p style={{ fontSize: 12, color: '#334155', margin: 0, lineHeight: 1.6 }}>
        {narrative.map((n, i) => (
          <span key={i} style={{ display: 'block', marginBottom: 4 }}>{renderText(n)}</span>
        ))}
      </p>
    </div>
  )
}

function Kpi({ label, value, period, accent }: { label: string; value: string; period?: string; accent: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
      <p style={{ fontSize: 8, color: '#94a3b8', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: accent, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {period && <p style={{ fontSize: 8, color: '#94a3b8', margin: '1px 0 0' }}>{period}</p>}
    </div>
  )
}

export default TrendNarrative
