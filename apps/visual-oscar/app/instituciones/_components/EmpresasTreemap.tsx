'use client'
/**
 * Treemap procedural simple para sectores empresariales.
 * Algoritmo squarified treemap simplificado.
 */
interface Sector {
  sector: string
  empresas: number
  pct: number
  color: string
}

export function EmpresasTreemap({ sectores }: { sectores: Sector[] }) {
  if (sectores.length === 0) return null

  // Algoritmo simple slice & dice
  const W = 600, H = 200
  const total = sectores.reduce((s, x) => s + x.empresas, 0)

  // Disposición en filas alternadas para evitar todo en una columna
  const rects: Array<{ x: number; y: number; w: number; h: number; sector: Sector }> = []
  let cursorX = 0, cursorY = 0
  let rowW = 0, rowH = 0
  const targetRowH = H / 2

  // Para mejor visualización, dividimos en dos filas
  const items = [...sectores].sort((a, b) => b.empresas - a.empresas)

  // Calcular cuántos van en cada fila para equilibrar
  let suma = 0
  const half = total / 2
  let cortePos = items.length
  for (let i = 0; i < items.length; i++) {
    suma += items[i].empresas
    if (suma >= half) { cortePos = i + 1; break }
  }

  const fila1 = items.slice(0, cortePos)
  const fila2 = items.slice(cortePos)
  const total1 = fila1.reduce((s, x) => s + x.empresas, 0)
  const total2 = fila2.reduce((s, x) => s + x.empresas, 0)

  // Fila 1
  let x = 0
  for (const s of fila1) {
    const w = (s.empresas / total1) * W
    rects.push({ x, y: 0, w, h: targetRowH, sector: s })
    x += w
  }
  // Fila 2
  x = 0
  for (const s of fila2) {
    const w = total2 > 0 ? (s.empresas / total2) * W : 0
    rects.push({ x, y: targetRowH, w, h: H - targetRowH, sector: s })
    x += w
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', borderRadius: 6, overflow: 'hidden' }}>
      {rects.map((r, i) => {
        const showLabel = r.w > 50 && r.h > 30
        return (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.w - 1} height={r.h - 1} fill={r.sector.color} stroke="#fff" strokeWidth={1}>
              <title>{r.sector.sector}: {r.sector.empresas.toLocaleString('es-ES')} empresas ({r.sector.pct}%)</title>
            </rect>
            {showLabel && (
              <>
                <text x={r.x + 6} y={r.y + 14} style={{ fontSize: 10, fontWeight: 700, fill: '#fff' }}>
                  {r.sector.sector.length > 22 ? r.sector.sector.slice(0, 21) + '…' : r.sector.sector}
                </text>
                <text x={r.x + 6} y={r.y + 28} style={{ fontSize: 9, fill: 'rgba(255,255,255,0.85)' }}>
                  {r.sector.empresas.toLocaleString('es-ES')} · {r.sector.pct.toFixed(1)}%
                </text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
