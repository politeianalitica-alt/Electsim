'use client'
/**
 * Proyecciones presupuestarias 2026-2030 con tres trayectorias:
 *   - Tendencial (CAGR observado)
 *   - Objetivo 2% OTAN
 *   - Objetivo 5% OTAN (compromiso 2024)
 *
 * SVG procedural, sin Recharts (más control y menos JS).
 */
import type { ProyeccionPresupuesto } from '@/lib/defense/analisis-defensa'

export function BudgetProjectionChart({ proy }: { proy: ProyeccionPresupuesto }) {
  if (proy.serieHistorica.length === 0) return <div style={{ color: '#86868b', fontSize: 12 }}>Sin datos</div>

  const allData = [
    ...proy.serieHistorica.map(p => ({ year: p.year, valor: p.valor, esProyeccion: false, tipo: 'historica' })),
    ...proy.proyecciones.map(p => ({ year: p.year, valor: p.tendencial, esProyeccion: true, tipo: 'tendencial' })),
  ]
  const proyecciones2 = proy.proyecciones.map(p => ({ year: p.year, valor: p.objetivo2, tipo: 'obj2' }))
  const proyecciones5 = proy.proyecciones.map(p => ({ year: p.year, valor: p.objetivo5, tipo: 'obj5' }))

  const W = 760, H = 240, P = 40
  const minY = 0
  const maxY = 6.2
  const minX = allData[0].year
  const maxX = allData[allData.length - 1].year

  const xScale = (y: number) => P + ((y - minX) / (maxX - minX)) * (W - 2 * P)
  const yScale = (v: number) => P + (1 - (v - minY) / (maxY - minY)) * (H - 2 * P)

  // Path histórica + tendencial
  const pathTendencial = allData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.year).toFixed(1)},${yScale(d.valor).toFixed(1)}`).join(' ')
  // Path objetivo 2
  const ultimoHist = proy.serieHistorica[proy.serieHistorica.length - 1]
  const pathObj2 = `M${xScale(ultimoHist.year).toFixed(1)},${yScale(ultimoHist.valor).toFixed(1)} ` +
    proyecciones2.map(d => `L${xScale(d.year).toFixed(1)},${yScale(d.valor).toFixed(1)}`).join(' ')
  const pathObj5 = `M${xScale(ultimoHist.year).toFixed(1)},${yScale(ultimoHist.valor).toFixed(1)} ` +
    proyecciones5.map(d => `L${xScale(d.year).toFixed(1)},${yScale(d.valor).toFixed(1)}`).join(' ')

  const lastTendencialYear = proy.proyecciones[proy.proyecciones.length - 1]
  const ultimoTendencial = lastTendencialYear?.tendencial || 0

  return (
    <div>
      {/* HEADER MÉTRICAS CLAVE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <Metric label="CAGR ÚLTIMOS 4 AÑOS" value={`${proy.cagr > 0 ? '+' : ''}${proy.cagr}%`} color={proy.cagr > 5 ? '#16A34A' : proy.cagr > 0 ? '#0EA5E9' : '#DC2626'}/>
        <Metric label="BRECHA 2%" value={`${proy.brechaActual2pct > 0 ? '+' : ''}${proy.brechaActual2pct} pp`} color={proy.brechaActual2pct <= 0 ? '#16A34A' : '#F97316'}/>
        <Metric label="BRECHA 5%" value={`${proy.brechaActual5pct} pp`} color="#DC2626"/>
        <Metric label="ALCANCE 2% (tendencial)" value={proy.fechaAlcance2pct ? String(proy.fechaAlcance2pct) : 'No alcanzado'} color={proy.fechaAlcance2pct && proy.fechaAlcance2pct <= 2030 ? '#16A34A' : '#F97316'}/>
      </div>

      {/* GRÁFICO */}
      <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ display: 'block', background: '#FAFAFB', borderRadius: 8 }}>
        {/* Grid horizontal */}
        {[0, 1, 2, 3, 4, 5, 6].map(v => (
          <g key={v}>
            <line x1={P} x2={W - P} y1={yScale(v)} y2={yScale(v)} stroke="#ECECEF" strokeWidth={0.6}/>
            <text x={P - 6} y={yScale(v) + 3} textAnchor="end" style={{ fontSize: 9, fill: '#9CA3AF' }}>{v}%</text>
          </g>
        ))}
        {/* Línea 2% */}
        <line x1={P} x2={W - P} y1={yScale(2)} y2={yScale(2)} stroke="#DC2626" strokeWidth={1} strokeDasharray="6,3"/>
        <text x={W - P - 4} y={yScale(2) - 4} textAnchor="end" style={{ fontSize: 9, fill: '#DC2626', fontWeight: 700 }}>2% OTAN clásico</text>
        {/* Línea 5% */}
        <line x1={P} x2={W - P} y1={yScale(5)} y2={yScale(5)} stroke="#7C3AED" strokeWidth={1} strokeDasharray="6,3"/>
        <text x={W - P - 4} y={yScale(5) - 4} textAnchor="end" style={{ fontSize: 9, fill: '#7C3AED', fontWeight: 700 }}>5% OTAN 2024</text>

        {/* Área sombreada proyección tendencial */}
        <path d={`${pathTendencial.split(' ').slice(-(proy.proyecciones.length + 1) * 2).join(' ')} L${xScale(maxX).toFixed(1)},${H - P} L${xScale(ultimoHist.year).toFixed(1)},${H - P} Z`}
              fill="#52525810" stroke="none"/>

        {/* Trayectoria al 2% */}
        <path d={pathObj2} fill="none" stroke="#DC2626" strokeWidth={2} strokeDasharray="4,3" opacity={0.7}/>
        {/* Trayectoria al 5% */}
        <path d={pathObj5} fill="none" stroke="#7C3AED" strokeWidth={2} strokeDasharray="4,3" opacity={0.7}/>

        {/* Línea histórica + tendencial */}
        <path d={pathTendencial} fill="none" stroke="#1d1d1f" strokeWidth={2.5}/>

        {/* Línea vertical separando hist/proy */}
        <line x1={xScale(ultimoHist.year)} x2={xScale(ultimoHist.year)} y1={P} y2={H - P} stroke="#9CA3AF" strokeWidth={1} strokeDasharray="2,3"/>
        <text x={xScale(ultimoHist.year)} y={P - 4} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 700 }}>← histórico · proyección →</text>

        {/* Puntos */}
        {allData.map((d) => (
          <circle key={d.year} cx={xScale(d.year)} cy={yScale(d.valor)} r={d.esProyeccion ? 2.5 : 3.5} fill={d.esProyeccion ? '#525258' : '#1d1d1f'} stroke="#fff" strokeWidth={d.esProyeccion ? 0.5 : 1}>
            <title>{d.year}: {d.valor.toFixed(2)}% PIB {d.esProyeccion ? '(proyección)' : ''}</title>
          </circle>
        ))}

        {/* Etiquetas X */}
        {allData.filter((_, i) => i % 3 === 0 || i === allData.length - 1).map(d => (
          <text key={d.year} x={xScale(d.year)} y={H - P + 14} textAnchor="middle" style={{ fontSize: 9, fill: '#86868b' }}>{d.year}</text>
        ))}

        {/* Label último valor proyectado */}
        {lastTendencialYear && (
          <g>
            <circle cx={xScale(lastTendencialYear.year)} cy={yScale(ultimoTendencial)} r={5} fill="#1d1d1f"/>
            <text x={xScale(lastTendencialYear.year)} y={yScale(ultimoTendencial) - 10} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: '#1d1d1f' }}>
              {ultimoTendencial.toFixed(2)}%
            </text>
          </g>
        )}
      </svg>

      {/* LEYENDA */}
      <div style={{ display: 'flex', gap: 18, fontSize: 11, marginTop: 12, flexWrap: 'wrap' }}>
        <Legend color="#1d1d1f" label="Serie histórica + tendencial (CAGR)"/>
        <Legend color="#DC2626" label="Trayectoria objetivo 2% en 5 años" dashed/>
        <Legend color="#7C3AED" label="Trayectoria objetivo 5% en 10 años" dashed/>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 11.5, color: '#3a3a3d', lineHeight: 1.5, padding: 10, background: '#FAFAFB', borderRadius: 8, borderLeft: '3px solid #1d1d1f' }}>
        <strong>Interpretación:</strong> A tasa de crecimiento actual ({proy.cagr > 0 ? '+' : ''}{proy.cagr}% anual),
        España alcanzaría el 2% PIB en <strong>{proy.fechaAlcance2pct || '> 2030'}</strong> y
        el 5% en <strong>{proy.fechaAlcance5pct || '> 2030'}</strong>.
        Para cumplir el compromiso OTAN del 2% en 2030 sería necesario sostener un crecimiento anual del{' '}
        <strong>{((Math.pow(2.0 / (proy.serieHistorica[proy.serieHistorica.length - 1]?.valor || 1.5), 1 / 5) - 1) * 100).toFixed(1)}%</strong>.
      </p>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 8 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 18, height: 2, background: color, borderRadius: 1, position: 'relative' }}>
        {dashed && (
          <span style={{
            position: 'absolute', inset: 0,
            background: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)`,
          }}/>
        )}
      </span>
      <span style={{ color: '#3a3a3d', fontWeight: 500 }}>{label}</span>
    </span>
  )
}
