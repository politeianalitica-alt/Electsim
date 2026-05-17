'use client'
/**
 * Supply Chain Network · SVG procedural.
 *
 * Visualiza la red de relaciones programa ↔ empresa para todos los programas
 * cargados. Layout: programas en círculo central, empresas en órbita externa
 * agrupadas por país, conexiones coloreadas por rol (prime / tier1 / tier2).
 *
 * Sin D3 ni librerías externas — todo es trigonometría.
 */
interface Empresa {
  nombre: string
  pais: string
  rol: string                  // prime / tier1 / tier2 / tier3
  participacion_pct?: number
  segmento: string
}

interface ProgramaLite {
  id: string
  nombre: string
  nombre_corto: string
  estado: string
  tipo: string
  paises: string[]
  bandera_emoji: string
  empresas: Empresa[]
}

const PAIS_COLOR: Record<string, string> = {
  'ESP': '#DC2626', 'FRA': '#1F4E8C', 'DEU': '#F59E0B', 'GBR': '#7C3AED',
  'ITA': '#0EA5E9', 'USA': '#1F4E8C', 'POL': '#16A34A', 'NLD': '#F97316',
  'BEL': '#FFCC00', 'NOR': '#5B21B6', 'EU': '#0EA5E9',
}
const ROL_COLOR: Record<string, string> = {
  'prime': '#1d1d1f',
  'tier1': '#1F4E8C',
  'tier2': '#7C3AED',
  'tier3': '#9CA3AF',
}
const ESTADO_COLOR: Record<string, string> = {
  'activo': '#16A34A',
  'en_riesgo': '#F97316',
  'retrasado': '#DC2626',
  'completado': '#9CA3AF',
}

export function SupplyChainGraph({ programas }: { programas: ProgramaLite[] }) {
  const W = 880, H = 520
  const cx = W / 2, cy = H / 2
  const rProgramas = 100   // radio del círculo de programas
  const rEmpresas = 220    // radio del círculo de empresas
  const rOuter = 245       // labels país

  // Filtra programas válidos
  const progValidos = programas.filter(p => p.empresas && p.empresas.length > 0)
  const N = progValidos.length
  if (N === 0) return <div style={{ color: '#86868b', fontSize: 12, padding: 20, textAlign: 'center' }}>Sin programas con empresas asociadas</div>

  // Programas en círculo interno
  const progPos = progValidos.map((p, i) => {
    const a = (Math.PI * 2 * i) / N - Math.PI / 2
    return { ...p, x: cx + rProgramas * Math.cos(a), y: cy + rProgramas * Math.sin(a) }
  })

  // Recopilar empresas únicas (algunas se repiten en varios programas)
  const empresasUnicas = new Map<string, { nombre: string; pais: string; rolMax: string; programas: Array<{ idx: number; rol: string }> }>()
  progValidos.forEach((p, pi) => {
    for (const e of p.empresas) {
      const key = `${e.nombre}|${e.pais}`
      if (!empresasUnicas.has(key)) {
        empresasUnicas.set(key, { nombre: e.nombre, pais: e.pais, rolMax: e.rol, programas: [] })
      }
      const u = empresasUnicas.get(key)!
      u.programas.push({ idx: pi, rol: e.rol })
      // Promover rolMax si encontramos uno superior
      const order = ['tier3', 'tier2', 'tier1', 'prime']
      if (order.indexOf(e.rol) > order.indexOf(u.rolMax)) u.rolMax = e.rol
    }
  })

  // Agrupar por país para ordenar
  const empresasArr = Array.from(empresasUnicas.values())
  // Orden: agrupar por pais, dentro por nº conexiones desc
  empresasArr.sort((a, b) => {
    if (a.pais !== b.pais) return a.pais.localeCompare(b.pais)
    return b.programas.length - a.programas.length
  })

  const M = empresasArr.length
  const empresaPos = empresasArr.map((e, i) => {
    const a = (Math.PI * 2 * i) / M - Math.PI / 2
    return { ...e, x: cx + rEmpresas * Math.cos(a), y: cy + rEmpresas * Math.sin(a), labelX: cx + rOuter * Math.cos(a), labelY: cy + rOuter * Math.sin(a), angle: a }
  })

  // KPIs agregados
  const totalConexiones = empresasArr.reduce((s, e) => s + e.programas.length, 0)
  const empresasMultiPrograma = empresasArr.filter(e => e.programas.length > 1).length
  const porPais: Record<string, number> = {}
  for (const e of empresasArr) porPais[e.pais] = (porPais[e.pais] || 0) + 1
  const porRol: Record<string, number> = {}
  for (const e of empresasArr) porRol[e.rolMax] = (porRol[e.rolMax] || 0) + 1

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
        <KPI label="EMPRESAS DISTINTAS" value={String(empresasArr.length)} color="#1d1d1f"/>
        <KPI label="CONEXIONES TOTALES" value={String(totalConexiones)} color="#1F4E8C"/>
        <KPI label="MULTI-PROGRAMA" value={`${empresasMultiPrograma} (${empresasArr.length > 0 ? Math.round((empresasMultiPrograma / empresasArr.length) * 100) : 0}%)`} color="#7C3AED"/>
        <KPI label="PRIMES IDENTIFICADOS" value={String(porRol.prime || 0)} color="#16A34A"/>
        <KPI label="PAÍSES INVOLUCRADOS" value={String(Object.keys(porPais).length)} color="#F97316"/>
      </div>

      {/* SVG */}
      <div style={{ background: '#FAFAFB', borderRadius: 12, padding: 8 }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {/* Conexiones */}
          {progPos.map((p, pi) => p.empresas.map((e, ei) => {
            const epIdx = empresaPos.findIndex(x => x.nombre === e.nombre && x.pais === e.pais)
            if (epIdx < 0) return null
            const ep = empresaPos[epIdx]
            const color = ROL_COLOR[e.rol] || '#9CA3AF'
            const opacity = e.rol === 'prime' ? 0.6 : e.rol === 'tier1' ? 0.35 : 0.18
            return <line key={`${pi}-${ei}`} x1={p.x} y1={p.y} x2={ep.x} y2={ep.y} stroke={color} strokeWidth={e.rol === 'prime' ? 1.5 : 0.8} opacity={opacity}/>
          }))}

          {/* Nodos empresa */}
          {empresaPos.map((e, i) => {
            const r = 4 + Math.min(6, e.programas.length * 1.5)
            const color = PAIS_COLOR[e.pais] || '#9CA3AF'
            return (
              <g key={i}>
                <circle cx={e.x} cy={e.y} r={r} fill={color} stroke="#fff" strokeWidth={1.5}>
                  <title>{e.nombre} ({e.pais}) · {e.programas.length} programa(s) · rol {e.rolMax}</title>
                </circle>
              </g>
            )
          })}

          {/* Etiquetas empresa */}
          {empresaPos.map((e, i) => {
            const dx = Math.cos(e.angle)
            const anchor = Math.abs(dx) < 0.3 ? 'middle' : dx > 0 ? 'start' : 'end'
            // Rotación para no encimar
            return (
              <text key={i} x={e.labelX} y={e.labelY + 3} textAnchor={anchor} style={{ fontSize: 9, fill: '#3a3a3d', fontWeight: e.programas.length > 1 ? 700 : 500 }}>
                {e.nombre.length > 18 ? e.nombre.slice(0, 17) + '…' : e.nombre}
              </text>
            )
          })}

          {/* Nodos programa */}
          {progPos.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={11} fill={ESTADO_COLOR[p.estado] || '#525258'} stroke="#fff" strokeWidth={2}>
                <title>{p.nombre} · estado {p.estado}</title>
              </circle>
              <text x={p.x} y={p.y + 3.5} textAnchor="middle" style={{ fontSize: 8.5, fill: '#fff', fontWeight: 700 }}>
                {p.nombre_corto.slice(0, 5)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* LEYENDA */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 11 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>NODOS EMPRESA (POR PAÍS)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(porPais).sort((a, b) => b[1] - a[1]).map(([pais, n]) => (
              <span key={pais} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: PAIS_COLOR[pais] || '#9CA3AF' }}/>
                <span style={{ color: '#3a3a3d' }}>{pais} · {n}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>CONEXIONES (POR ROL)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(ROL_COLOR).map(([rol, color]) => (
              <span key={rol} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 14, height: 2, background: color }}/>
                <span style={{ color: '#3a3a3d', textTransform: 'capitalize' }}>{rol} ({porRol[rol] || 0})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top empresas multi-programa */}
      <div style={{ marginTop: 14 }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          EMPRESAS CRÍTICAS · MAYOR EXPOSICIÓN A PROGRAMAS
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
          {empresasArr.filter(e => e.programas.length > 1).sort((a, b) => b.programas.length - a.programas.length).slice(0, 8).map(e => (
            <div key={e.nombre + e.pais} style={{ padding: '7px 10px', background: '#fff', border: '1px solid #ECECEF', borderRadius: 6, borderLeft: `3px solid ${PAIS_COLOR[e.pais] || '#9CA3AF'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f' }}>{e.nombre}</span>
                <span style={{ fontSize: 9, color: '#6e6e73', fontWeight: 600 }}>{e.pais}</span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
                {e.programas.length} programas · rol top: <strong style={{ color: ROL_COLOR[e.rolMax] }}>{e.rolMax}</strong>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '8px 10px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 8 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  )
}
