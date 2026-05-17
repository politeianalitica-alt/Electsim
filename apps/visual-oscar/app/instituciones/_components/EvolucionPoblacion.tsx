'use client'
/**
 * Evolución poblacional SVG · serie histórica padrón municipal.
 */
interface PuntoPoblacion { año: number; poblacion: number; variacion_pct?: number }
interface SerieHistoricaPoblacion {
  puntos: PuntoPoblacion[]
  añoMin: number; añoMax: number
  poblacionMin: number; poblacionMax: number
  cagr_pct: number; variacionTotal_pct: number
  banda: string
}

export function EvolucionPoblacionChart({ serie }: { serie: SerieHistoricaPoblacion }) {
  if (serie.puntos.length === 0) return null

  const W = 640, H = 200, P = 40
  const colorBanda =
    serie.cagr_pct >= 1.5 ? '#16A34A' :
    serie.cagr_pct >= 0.3 ? '#0EA5E9' :
    serie.cagr_pct >= -0.3 ? '#9CA3AF' :
    serie.cagr_pct >= -1.0 ? '#F97316' :
                             '#DC2626'

  const padPob = (serie.poblacionMax - serie.poblacionMin) * 0.1 || serie.poblacionMin * 0.02
  const yMin = Math.max(0, serie.poblacionMin - padPob)
  const yMax = serie.poblacionMax + padPob
  const xScale = (a: number) => P + ((a - serie.añoMin) / (serie.añoMax - serie.añoMin || 1)) * (W - 2 * P)
  const yScale = (p: number) => P + (1 - (p - yMin) / (yMax - yMin)) * (H - 2 * P)

  const linePath = serie.puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.año).toFixed(1)},${yScale(p.poblacion).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${xScale(serie.añoMax).toFixed(1)},${H - P} L${xScale(serie.añoMin).toFixed(1)},${H - P} Z`

  const yTicks = 4
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yMax - yMin) * (i / yTicks))

  const últimoVar = serie.puntos[serie.puntos.length - 1].variacion_pct ?? 0

  return (
    <div>
      {/* Header con KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
        <KPI label="POBLACIÓN ACTUAL" value={serie.puntos[serie.puntos.length - 1].poblacion.toLocaleString('es-ES')} color="#1d1d1f"/>
        <KPI label={`VAR. ${serie.añoMax - serie.añoMin}A`} value={`${serie.variacionTotal_pct > 0 ? '+' : ''}${serie.variacionTotal_pct}%`} color={serie.variacionTotal_pct > 0 ? '#16A34A' : '#DC2626'}/>
        <KPI label="CAGR ANUAL" value={`${serie.cagr_pct > 0 ? '+' : ''}${serie.cagr_pct}%`} color={colorBanda}/>
        <KPI label="ÚLT. AÑO" value={`${últimoVar > 0 ? '+' : ''}${últimoVar.toFixed(2)}%`} color={últimoVar > 0 ? '#16A34A' : '#DC2626'}/>
      </div>

      {/* SVG */}
      <svg width="100%" viewBox={`0 0 ${W} ${H + 25}`} style={{ display: 'block', background: '#FAFAFB', borderRadius: 8 }}>
        {/* Grid horizontal */}
        {tickValues.map((v, i) => (
          <g key={i}>
            <line x1={P} x2={W - P} y1={yScale(v)} y2={yScale(v)} stroke="#ECECEF" strokeWidth={0.6}/>
            <text x={P - 6} y={yScale(v) + 3} textAnchor="end" style={{ fontSize: 8.5, fill: '#9CA3AF' }}>
              {Math.round(v).toLocaleString('es-ES')}
            </text>
          </g>
        ))}
        {/* Área */}
        <path d={areaPath} fill={`${colorBanda}25`} stroke="none"/>
        {/* Línea */}
        <path d={linePath} fill="none" stroke={colorBanda} strokeWidth={2}/>
        {/* Puntos */}
        {serie.puntos.map(p => (
          <circle key={p.año} cx={xScale(p.año)} cy={yScale(p.poblacion)} r={2.5} fill={colorBanda} stroke="#fff" strokeWidth={1}>
            <title>{p.año}: {p.poblacion.toLocaleString('es-ES')} hab</title>
          </circle>
        ))}
        {/* Etiquetas X */}
        {serie.puntos.filter((_, i) => i === 0 || i === serie.puntos.length - 1 || i % Math.ceil(serie.puntos.length / 6) === 0).map(p => (
          <text key={p.año} x={xScale(p.año)} y={H - P + 16} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>{p.año}</text>
        ))}
      </svg>

      <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#3a3a3d', padding: 8, background: `${colorBanda}10`, borderLeft: `3px solid ${colorBanda}`, borderRadius: 6 }}>
        <strong style={{ color: colorBanda, textTransform: 'capitalize' }}>{serie.banda}</strong> ·
        Población {serie.variacionTotal_pct > 0 ? 'aumentó' : 'disminuyó'} un {Math.abs(serie.variacionTotal_pct)}% entre {serie.añoMin} y {serie.añoMax}.
        A ritmo CAGR actual ({serie.cagr_pct > 0 ? '+' : ''}{serie.cagr_pct}%/año), la población se {serie.cagr_pct > 0 ? 'duplicaría' : 'reduciría a la mitad'} en {serie.cagr_pct !== 0 ? Math.round(Math.abs(70 / serie.cagr_pct)) : '—'} años.
      </p>
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '7px 10px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 6 }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
