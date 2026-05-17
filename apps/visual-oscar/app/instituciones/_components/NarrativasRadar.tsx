'use client'
/**
 * Radar de narrativas IA · 6 ejes temáticos.
 *
 * Mapea las narrativas detectadas (clustering) a 6 ejes doctrinarios:
 * Seguridad · Economía · Salud · Infraestructura · Política interna · Medio ambiente.
 * SVG procedural sin dependencias.
 */
interface Narrativa {
  nombre: string
  fuerza: number
  sentimiento: number
  tono: string
  tags: string[]
}

const EJES = ['Seguridad', 'Economía', 'Salud', 'Infraestructura', 'Política interna', 'Medio ambiente']

const KEYWORDS: Record<string, string[]> = {
  'Seguridad':       ['seguridad', 'delincuencia', 'robo', 'asalto', 'policía', 'guardia civil', 'crimen', 'violencia'],
  'Economía':        ['empleo', 'paro', 'empresa', 'inversión', 'fondos', 'pib', 'mercado', 'industria', 'turismo'],
  'Salud':           ['sanidad', 'hospital', 'medico', 'atencion primaria', 'urgencias', 'salud'],
  'Infraestructura': ['obras', 'transporte', 'metro', 'bus', 'movilidad', 'tren', 'aeropuerto', 'carretera'],
  'Política interna':['gobierno', 'pleno', 'moción', 'alcalde', 'oposición', 'pacto', 'coalición', 'consejo'],
  'Medio ambiente':  ['agua', 'medio ambiente', 'sequía', 'incendio', 'emergencia', 'clima', 'reciclaje', 'limpieza'],
}

function clasificarNarrativa(narr: Narrativa): { eje: string; score: number }[] {
  const texto = (narr.nombre + ' ' + narr.tags.join(' ')).toLowerCase()
  return EJES.map(eje => {
    const kws = KEYWORDS[eje] || []
    const hits = kws.filter(k => texto.includes(k)).length
    return { eje, score: hits * narr.fuerza }
  })
}

export function NarrativasRadarChart({ narrativas }: { narrativas: Narrativa[] }) {
  if (narrativas.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>Sin narrativas suficientes</div>
  }

  // Calcular fuerza acumulada por eje
  const totales: Record<string, number> = Object.fromEntries(EJES.map(e => [e, 0]))
  const sentimientos: Record<string, number[]> = Object.fromEntries(EJES.map(e => [e, []]))
  for (const n of narrativas) {
    const clasif = clasificarNarrativa(n)
    for (const c of clasif) {
      totales[c.eje] += c.score
      if (c.score > 0) sentimientos[c.eje].push(n.sentimiento)
    }
  }

  const maxVal = Math.max(1, ...Object.values(totales))

  // SVG procedural
  const W = 320, H = 320
  const cx = W / 2, cy = H / 2
  const rMax = 110

  const puntos = EJES.map((eje, i) => {
    const angle = (Math.PI * 2 * i) / EJES.length - Math.PI / 2
    const val = totales[eje]
    const r = (val / maxVal) * rMax
    const sent = sentimientos[eje].length > 0
      ? sentimientos[eje].reduce((s, x) => s + x, 0) / sentimientos[eje].length
      : 0
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      labelX: cx + (rMax + 22) * Math.cos(angle),
      labelY: cy + (rMax + 22) * Math.sin(angle),
      angle, eje, valor: val, sentimiento: sent,
    }
  })

  const polygon = puntos.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Anillos */}
        {[25, 50, 75, 100].map(p => (
          <circle key={p} cx={cx} cy={cy} r={(p / 100) * rMax} fill="none" stroke="#ECECEF" strokeWidth={1} strokeDasharray={p === 100 ? '0' : '2,3'}/>
        ))}
        {/* Ejes */}
        {puntos.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + rMax * Math.cos(p.angle)} y2={cy + rMax * Math.sin(p.angle)} stroke="#F5F5F7" strokeWidth={1}/>
        ))}
        {/* Polígono */}
        <polygon points={polygon} fill="#7C3AED30" stroke="#7C3AED" strokeWidth={2}/>
        {/* Puntos */}
        {puntos.map((p, i) => {
          const c = p.sentimiento > 0.15 ? '#16A34A' : p.sentimiento < -0.15 ? '#DC2626' : '#94A3B8'
          return (
            <circle key={i} cx={p.x} cy={p.y} r={5} fill={c} stroke="#fff" strokeWidth={2}>
              <title>{p.eje}: fuerza {p.valor} · sentimiento {p.sentimiento.toFixed(2)}</title>
            </circle>
          )
        })}
        {/* Etiquetas */}
        {puntos.map((p, i) => {
          const dx = Math.cos(p.angle)
          const anchor = Math.abs(dx) < 0.3 ? 'middle' : dx > 0 ? 'start' : 'end'
          return (
            <text key={i} x={p.labelX} y={p.labelY + 3} textAnchor={anchor} style={{ fontSize: 10, fontWeight: 700, fill: '#1d1d1f' }}>
              {p.eje}
            </text>
          )
        })}
      </svg>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {puntos.sort((a, b) => b.valor - a.valor).map(p => {
          const c = p.sentimiento > 0.15 ? '#16A34A' : p.sentimiento < -0.15 ? '#DC2626' : '#94A3B8'
          return (
            <li key={p.eje} style={{ padding: '6px 10px', background: '#FAFAFA', borderRadius: 6, borderLeft: `3px solid ${c}`, fontSize: 11.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{p.eje}</span>
                <span style={{ color: c, fontWeight: 700 }}>{p.valor}</span>
              </div>
              {p.sentimiento !== 0 && (
                <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#6e6e73' }}>
                  Sentimiento medio: {p.sentimiento.toFixed(2)}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
