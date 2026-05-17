'use client'
/**
 * Card de presupuesto municipal · donut SVG procedural.
 */
interface PresupuestoMunicipal {
  presupuesto_total_M: number
  presupuesto_per_capita_eur: number
  composicion: Array<{ capitulo: string; pct: number; importe_M: number; color: string }>
  deuda_viva_M: number | null
  deuda_per_capita_eur: number | null
  ratio_solvencia: string
  año: number
  metodologia: string
  url_oficial: string
}

export function PresupuestoMunicipalCard({ p }: { p: PresupuestoMunicipal }) {
  const colorSolv =
    p.ratio_solvencia === 'sólida' ? '#16A34A' :
    p.ratio_solvencia === 'aceptable' ? '#0EA5E9' :
    p.ratio_solvencia === 'tensa' ? '#F97316' : '#DC2626'

  // Donut SVG
  const cx = 80, cy = 80, r = 55
  let acc = 0
  const arcs = p.composicion.map(c => {
    const start = acc, end = acc + c.pct
    acc = end
    return { ...c, start, end }
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'start' }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {arcs.map((a, i) => {
          const ang1 = (a.start / 100) * 2 * Math.PI - Math.PI / 2
          const ang2 = (a.end / 100) * 2 * Math.PI - Math.PI / 2
          const x1 = cx + r * Math.cos(ang1), y1 = cy + r * Math.sin(ang1)
          const x2 = cx + r * Math.cos(ang2), y2 = cy + r * Math.sin(ang2)
          const large = a.end - a.start > 50 ? 1 : 0
          const path = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${cx} ${cy} Z`
          return <path key={i} d={path} fill={a.color}><title>{a.capitulo}: {a.pct}% · {a.importe_M} M€</title></path>
        })}
        <circle cx={cx} cy={cy} r={32} fill="#fff"/>
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 9.5, fill: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em' }}>PRESUP</text>
        <text x={cx} y={cy + 11} textAnchor="middle" style={{ fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 700, fill: '#1d1d1f' }}>
          {p.presupuesto_total_M >= 100 ? `${p.presupuesto_total_M.toFixed(0)}M` : `${p.presupuesto_total_M.toFixed(1)}M`}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" style={{ fontSize: 8, fill: '#9CA3AF' }}>€/{p.año}</text>
      </svg>

      <div>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 8.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>POR HABITANTE</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#1F4E8C', fontFamily: 'var(--font-display)' }}>
              {p.presupuesto_per_capita_eur.toLocaleString('es-ES')} €
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 8.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>DEUDA / HAB</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: colorSolv, fontFamily: 'var(--font-display)' }}>
              {p.deuda_per_capita_eur?.toLocaleString('es-ES') ?? '—'} €
            </p>
            <p style={{ margin: 0, fontSize: 8.5, color: colorSolv, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.ratio_solvencia}</p>
          </div>
        </div>

        {/* Composición */}
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {p.composicion.map(c => (
            <li key={c.capitulo} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5 }}>
              <span style={{ width: 9, height: 9, background: c.color, borderRadius: 2, flexShrink: 0 }}/>
              <span style={{ color: '#3a3a3d', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.capitulo}</span>
              <span style={{ color: '#6e6e73', fontSize: 9.5 }}>{c.importe_M.toFixed(1)}M</span>
              <span style={{ fontWeight: 700, color: '#1d1d1f', minWidth: 26, textAlign: 'right' }}>{c.pct}%</span>
            </li>
          ))}
        </ul>
      </div>

      <p style={{ gridColumn: '1 / 3', margin: '6px 0 0', fontSize: 9.5, color: '#9CA3AF', fontStyle: 'italic', lineHeight: 1.4 }}>
        {p.metodologia} · <a href={p.url_oficial} target="_blank" rel="noopener noreferrer" style={{ color: '#1F4E8C', fontWeight: 600 }}>Datos oficiales en hacienda.gob.es</a>
      </p>
    </div>
  )
}
