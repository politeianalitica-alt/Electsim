'use client'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'

// Grafo de relaciones de actores políticos · v2
// Mejoras visuales y de UX sobre el diseño handoff:
//   · Zoom (+/-/reset) y pan con arrastre del fondo
//   · Anti-collision para separar nodos que se solapan
//   · Sombras suaves bajo cada nodo + halo glow al hacer foco
//   · Hover: escala suave + tooltip flotante con cargo y partido
//   · Buscador para localizar un actor por nombre y enfocarlo
//   · Iniciales en blanco dentro de cada nodo grande
//   · Etiqueta tipo chip con fondo blanco redondeado debajo del nodo
//   · Fondo con grilla de puntos sutil
//   · Animaciones suaves (200 ms) en transiciones

interface Actor {
  id: string
  nombre?: string
  nombre_completo?: string
  partido?: string
  cargo?: string
  cargo_actual?: string
  ejeX?: number
  ejeY?: number
  cat?: string
  color?: string
  inf?: number
  score_influencia?: number
}

interface Props {
  actors?: Actor[]
  /** Máximo de actores en la vista inicial. Default 50. */
  maxActors?: number
}

// ───────── Categorías y colores ─────────
const CAT_LABEL: Record<string, string> = {
  gobierno: 'Gobierno', oposicion: 'Oposición', parlamento: 'Parlamento',
  autonomico: 'Autonómico', municipal: 'Municipal', institucion: 'Institución',
  patronal: 'Patronal', sindicato: 'Sindicato', mediatico: 'Medios', europa: 'Europa',
}
const CAT_COLOR: Record<string, string> = {
  gobierno:'#E1322D', oposicion:'#1F4E8C', parlamento:'#5B21B6',
  autonomico:'#0F766E', municipal:'#0EA5E9', institucion:'#7C3AED',
  patronal:'#0E7490', sindicato:'#A02525', mediatico:'#525258', europa:'#0F766E',
}

const PARTY_BLOCK: Record<string, 'izq' | 'der' | 'centro' | 'institucion'> = {
  PSOE:'izq', PSC:'izq','PSC-PSOE':'izq', Sumar:'izq', Podemos:'izq',
  ERC:'izq','EH Bildu':'izq', BNG:'izq', Compromís:'izq',
  PP:'der', VOX:'der', UPN:'der',
  PNV:'centro','EAJ-PNV':'centro', Junts:'centro', JxCat:'centro', CC:'centro',
  'Casa Real':'institucion', CGPJ:'institucion', TC:'institucion', TS:'institucion', Fiscalía:'institucion',
  BdE:'institucion', BEI:'institucion',
  CEOE:'der', CEPYME:'der', ATA:'der',
  CCOO:'izq', UGT:'izq',
  Medios:'institucion', Independiente:'institucion',
}

interface InferredLink { a: string; b: string; val: number; label: string }

function inferLinks(visible: Actor[]): InferredLink[] {
  const out: InferredLink[] = []
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const link = pairScore(visible[i], visible[j])
      if (link && Math.abs(link.val) >= 30) {
        out.push({ a: visible[i].id, b: visible[j].id, val: link.val, label: link.label })
      }
    }
  }
  out.sort((x, y) => Math.abs(y.val) - Math.abs(x.val))
  return out.slice(0, 90)
}

function pairScore(a: Actor, b: Actor): { val: number; label: string } | null {
  const pa = a.partido || 'Independiente'
  const pb = b.partido || 'Independiente'
  if (pa === pb && pa !== 'Independiente' && pa !== 'Medios') return { val: 78, label: 'Compañeros de partido' }
  const ba = PARTY_BLOCK[pa], bb = PARTY_BLOCK[pb]
  if (!ba || !bb) return null
  if (ba === bb && (ba === 'izq' || ba === 'der')) return { val: 42, label: 'Bloque ideológico afín' }
  if ((ba === 'izq' && bb === 'der') || (ba === 'der' && bb === 'izq')) return { val: -58, label: 'Bloques enfrentados' }
  const ca = a.cat, cb = b.cat
  if ((ca === 'gobierno' && cb === 'oposicion') || (ca === 'oposicion' && cb === 'gobierno')) return { val: -45, label: 'Gobierno ↔ oposición' }
  if ((ba === 'institucion' && (pb === 'PP' || pb === 'PSOE')) || (bb === 'institucion' && (pa === 'PP' || pa === 'PSOE'))) {
    return { val: 35, label: 'Diálogo formal' }
  }
  return null
}

const nameOf  = (a: Actor): string => a.nombre_completo || a.nombre || a.id
const shortName = (a: Actor): string => {
  const n = nameOf(a)
  const parts = n.split(/\s+/)
  return parts.length === 1 ? n : `${parts[0][0]}. ${parts[1]}`
}
const initialsOf = (a: Actor): string => {
  const parts = nameOf(a).split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
const infOf = (a: Actor): number => a.score_influencia ?? a.inf ?? 50

// Anti-collision · empuja nodos que se solapan (1 pasada simple)
function antiCollide(positions: Record<string, [number, number]>, radii: Record<string, number>): Record<string, [number, number]> {
  const ids = Object.keys(positions)
  const result: Record<string, [number, number]> = {}
  for (const id of ids) result[id] = [...positions[id]] as [number, number]
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = result[ids[i]], b = result[ids[j]]
        const minDist = (radii[ids[i]] + radii[ids[j]]) + 6
        const dx = b[0] - a[0], dy = b[1] - a[1]
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        if (dist < minDist) {
          const overlap = (minDist - dist) / 2
          const ux = dx / dist, uy = dy / dist
          a[0] -= ux * overlap; a[1] -= uy * overlap
          b[0] += ux * overlap; b[1] += uy * overlap
        }
      }
    }
  }
  return result
}

export default function RelacionesGrafo({ actors = [], maxActors = 60 }: Props) {
  const [focus, setFocus] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pos' | 'neg'>('all')
  const [showLabels, setShowLabels] = useState(true)
  const [filterCat, setFilterCat] = useState<string>('Todas')
  const [searchQuery, setSearchQuery] = useState('')

  // Zoom / pan
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ x0: number; y0: number; pan0: { x: number; y: number } } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const W = 1100, H = 700
  const cx = W / 2, cy = H / 2

  const visibleActors = useMemo(() => {
    let pool = actors
    if (filterCat !== 'Todas') pool = pool.filter(a => CAT_LABEL[a.cat || ''] === filterCat)
    return [...pool].sort((x, y) => infOf(y) - infOf(x)).slice(0, maxActors)
  }, [actors, filterCat, maxActors])

  const allLinks = useMemo(() => inferLinks(visibleActors), [visibleActors])

  // Posicionamiento + anti-collision
  const posMap = useMemo(() => {
    const padding = 70
    const initial: Record<string, [number, number]> = {}
    const radii: Record<string, number> = {}
    visibleActors.forEach(a => {
      const ejeX = a.ejeX ?? 0
      const ejeY = a.ejeY ?? 0
      const x = padding + ((ejeX + 100) / 200) * (W - 2 * padding)
      const y = padding + ((100 - ejeY) / 200) * (H - 2 * padding)
      const hash = a.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
      const jx = ((hash % 17) - 8) * 1.5
      const jy = (((hash * 7) % 13) - 6) * 1.5
      initial[a.id] = [x + jx, y + jy]
      radii[a.id] = 12 + Math.sqrt(infOf(a)) * 1.4
    })
    return antiCollide(initial, radii)
  }, [visibleActors])

  const visibleLinks = allLinks.filter(l => {
    if (filter === 'pos' && l.val < 0) return false
    if (filter === 'neg' && l.val >= 0) return false
    if (focus && l.a !== focus && l.b !== focus) return false
    return true
  })

  const focusActor = focus ? visibleActors.find(a => a.id === focus) : null
  const focusStats = focusActor ? (() => {
    const links = allLinks
      .filter(l => l.a === focusActor.id || l.b === focusActor.id)
      .map(l => ({ otherId: l.a === focusActor.id ? l.b : l.a, val: l.val, label: l.label }))
      .sort((a, b) => b.val - a.val)
    return { actor: focusActor, links }
  })() : null

  const cats = useMemo(() => {
    const set = new Set<string>()
    actors.forEach(a => { if (a.cat && CAT_LABEL[a.cat]) set.add(CAT_LABEL[a.cat]) })
    return ['Todas', ...Array.from(set)]
  }, [actors])

  // Buscador · sugerencias por prefijo
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return actors
      .filter(a => nameOf(a).toLowerCase().includes(q) || (a.partido || '').toLowerCase().includes(q))
      .sort((x, y) => infOf(y) - infOf(x))
      .slice(0, 6)
  }, [searchQuery, actors])

  // Zoom
  const zoomIn  = () => setZoom(z => Math.min(3, +(z * 1.25).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(0.4, +(z / 1.25).toFixed(2)))
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // Pan con arrastre
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Solo arrastrar si no se está clicando en un nodo (data-node="true")
    const target = e.target as Element
    if (target.closest('[data-node="true"]')) return
    dragState.current = { x0: e.clientX, y0: e.clientY, pan0: { ...pan } }
  }, [pan])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.x0
    const dy = e.clientY - dragState.current.y0
    setPan({ x: dragState.current.pan0.x + dx, y: dragState.current.pan0.y + dy })
  }, [])
  const onMouseUp = useCallback(() => { dragState.current = null }, [])
  // Wheel zoom
  const onWheel = useCallback((e: WheelEvent) => {
    if (!svgRef.current?.contains(e.target as Node)) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? 1 / 1.1 : 1.1
    setZoom(z => Math.max(0.4, Math.min(3, +(z * delta).toFixed(2))))
  }, [])
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // Tooltip data
  const tooltipActor = hovered ? visibleActors.find(a => a.id === hovered) : null

  return (
    <section style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 18 }}>
      {/* Grafo */}
      <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 22,
        padding: '20px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todas las relaciones</FilterBtn>
          <FilterBtn active={filter === 'pos'} onClick={() => setFilter('pos')} accent="#16A34A">Solo alianzas</FilterBtn>
          <FilterBtn active={filter === 'neg'} onClick={() => setFilter('neg')} accent="#DC2626">Solo conflictos</FilterBtn>
          <span style={{ flex: 1 }}/>
          <button onClick={() => setShowLabels(s => !s)} style={btnGhost}>
            {showLabels ? 'Ocultar etiquetas' : 'Mostrar etiquetas'}
          </button>
          {focus && <button onClick={() => setFocus(null)} style={btnPrimary}>✕ Quitar foco</button>}
        </div>

        {/* Buscador + categorías */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 220 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar actor o partido…"
              style={{
                background: '#fff', border: '1px solid #d2d2d7', borderRadius: 999,
                padding: '7px 14px 7px 32px', fontSize: 12, fontFamily: 'inherit',
                color: '#1d1d1f', width: 230, outline: 'none', transition: 'all 160ms',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#1d1d1f' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#d2d2d7' }}
            />
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 11, top: 9, color: '#6e6e73' }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {searchQuery && searchMatches.length > 0 && (
              <div style={{
                position: 'absolute', top: 36, left: 0, right: 0, zIndex: 10,
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: 4,
                maxHeight: 240, overflowY: 'auto',
              }}>
                {searchMatches.map(m => {
                  const isInGraph = visibleActors.some(a => a.id === m.id)
                  return (
                    <button key={m.id} onClick={() => {
                      setSearchQuery(''); setFilterCat('Todas')
                      // Si no está en visibleActors, ampliar el max temporalmente
                      setFocus(m.id)
                    }} style={{
                      width: '100%', textAlign: 'left', background: 'transparent',
                      border: 'none', padding: '8px 10px', borderRadius: 7, cursor: 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f7' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: m.color || CAT_COLOR[m.cat || ''] || '#6e6e73' }}/>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f', flex: 1 }}>{nameOf(m)}</span>
                      <span style={{ fontSize: 10.5, color: '#6e6e73' }}>
                        {m.partido}{!isInGraph && ' · ⚠ fuera del grafo'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'center' }}>Categoría:</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <button key={c} onClick={() => { setFilterCat(c); setFocus(null) }} style={{
                background: filterCat === c ? '#1d1d1f' : '#fff',
                color: filterCat === c ? '#fff' : '#3a3a3d',
                border: '1px solid ' + (filterCat === c ? '#1d1d1f' : '#ECECEF'),
                borderRadius: 999, padding: '4px 10px',
                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Wrapper SVG con controles de zoom flotantes */}
        <div style={{ position: 'relative' }}>
          {/* Controles de zoom */}
          <div style={{
            position: 'absolute', top: 14, right: 14, zIndex: 5,
            display: 'flex', flexDirection: 'column', gap: 1,
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)', overflow: 'hidden',
          }}>
            <ZoomBtn onClick={zoomIn} title="Acercar">＋</ZoomBtn>
            <div style={{ height: 1, background: '#f5f5f7' }}/>
            <ZoomBtn onClick={zoomOut} title="Alejar">－</ZoomBtn>
            <div style={{ height: 1, background: '#f5f5f7' }}/>
            <ZoomBtn onClick={zoomReset} title="Restablecer" small>↺</ZoomBtn>
          </div>
          {/* Indicador de zoom */}
          <div style={{
            position: 'absolute', bottom: 14, right: 14, zIndex: 5,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
            border: '1px solid #ECECEF', borderRadius: 999,
            padding: '4px 10px', fontSize: 10.5, fontWeight: 600, color: '#6e6e73',
            fontVariantNumeric: 'tabular-nums',
          }}>{Math.round(zoom * 100)}%</div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{
              width: '100%', display: 'block',
              cursor: dragState.current ? 'grabbing' : 'grab',
              touchAction: 'none', userSelect: 'none',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <radialGradient id="actoresBgGrad" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="#fafafa" stopOpacity="1"/>
                <stop offset="100%" stopColor="#f0f0f3" stopOpacity="0.4"/>
              </radialGradient>
              <pattern id="grafoDotsPattern" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.7" fill="#d2d2d7" opacity="0.6"/>
              </pattern>
              <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                <feOffset dx="0" dy="1.5" result="offsetblur"/>
                <feFlood floodColor="#000" floodOpacity="0.18"/>
                <feComposite in2="offsetblur" operator="in"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Fondo · siempre fijo (no se transforma) */}
            <rect x="0" y="0" width={W} height={H} fill="url(#actoresBgGrad)"/>
            <rect x="0" y="0" width={W} height={H} fill="url(#grafoDotsPattern)"/>

            {/* Capa transformable · zoom + pan */}
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} style={{ transition: dragState.current ? 'none' : 'transform 200ms ease-out' }}>

              {/* Ejes */}
              <line x1={cx} y1="40" x2={cx} y2={H - 40} stroke="#d2d2d7" strokeDasharray="2 5"/>
              <line x1="40" y1={cy} x2={W - 40} y2={cy} stroke="#d2d2d7" strokeDasharray="2 5"/>
              <text x="48" y={cy + 4} textAnchor="start" fontSize="10" fill="#6e6e73" letterSpacing="0.12em" fontWeight="600">IZQ.</text>
              <text x={W - 48} y={cy + 4} textAnchor="end" fontSize="10" fill="#6e6e73" letterSpacing="0.12em" fontWeight="600">DER.</text>
              <text x={cx} y="32" textAnchor="middle" fontSize="10" fill="#6e6e73" letterSpacing="0.12em" fontWeight="600">CENTRALIZACIÓN</text>
              <text x={cx} y={H - 26} textAnchor="middle" fontSize="10" fill="#6e6e73" letterSpacing="0.12em" fontWeight="600">DESCENTRALIZACIÓN</text>

              {/* Edges */}
              {visibleLinks.map((l, i) => {
                const pa = posMap[l.a], pb = posMap[l.b]
                if (!pa || !pb) return null
                const [x1, y1] = pa
                const [x2, y2] = pb
                const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
                const dx = mx - cx, dy = my - cy
                const len = Math.sqrt(dx * dx + dy * dy) || 1
                const cmx = mx + (dx / len) * 30
                const cmy = my + (dy / len) * 30
                const stroke = l.val >= 0 ? '#16A34A' : '#DC2626'
                const isHL = focus && (l.a === focus || l.b === focus)
                const opacity = isHL ? 0.95 : (focus ? 0.10 : Math.min(0.55, Math.abs(l.val) / 100 + 0.10))
                const width = Math.max(0.8, (Math.abs(l.val) / 100) * 5) * (isHL ? 1.5 : 1)
                const dash = l.val < 0 ? '5 5' : ''
                return (
                  <g key={i} style={{ pointerEvents: 'none' }}>
                    <path
                      d={`M ${x1} ${y1} Q ${cmx} ${cmy} ${x2} ${y2}`}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={width}
                      strokeOpacity={opacity}
                      strokeDasharray={dash}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-opacity 200ms, stroke-width 200ms' }}
                    />
                    {showLabels && isHL && (
                      <g>
                        <rect
                          x={cmx - (l.label.length * 3.2) - 6}
                          y={cmy - 17}
                          width={(l.label.length * 6.4) + 12}
                          height={14}
                          rx="7"
                          fill="#fff"
                          stroke={stroke}
                          strokeOpacity="0.30"
                        />
                        <text x={cmx} y={cmy - 7} textAnchor="middle" fontSize="9" fontWeight="600" fill={stroke}>
                          {l.label}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}

              {/* Nodes */}
              {visibleActors.map(a => {
                const pos = posMap[a.id]
                if (!pos) return null
                const [x, y] = pos
                const isFocus = focus === a.id
                const isHover = hovered === a.id
                const inf = infOf(a)
                const baseR = 12 + Math.sqrt(inf) * 1.4
                const r = baseR * (isHover ? 1.10 : 1)
                const dim = !!focus && focus !== a.id && !visibleLinks.some(l => l.a === a.id || l.b === a.id)
                const color = a.color || CAT_COLOR[a.cat || ''] || '#6e6e73'
                return (
                  <g
                    key={a.id}
                    data-node="true"
                    style={{ cursor: 'pointer', transition: 'opacity 200ms' }}
                    opacity={dim ? 0.18 : 1}
                    onClick={() => setFocus(focus === a.id ? null : a.id)}
                    onMouseEnter={() => setHovered(a.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {(isFocus || isHover) && (
                      <circle cx={x} cy={y} r={r + 10} fill={color} opacity={isFocus ? 0.18 : 0.10}/>
                    )}
                    <circle
                      cx={x} cy={y} r={r}
                      fill={color}
                      stroke={isFocus ? '#1d1d1f' : '#fff'}
                      strokeWidth={isFocus ? 2.5 : 2}
                      filter="url(#nodeShadow)"
                      style={{ transition: 'r 200ms ease-out' }}
                    />
                    {r >= 14 && (
                      <text
                        x={x} y={y + 4}
                        textAnchor="middle"
                        fill="#fff"
                        fontFamily="var(--font-display)"
                        fontWeight="700"
                        fontSize={r >= 20 ? '11' : '9.5'}
                        letterSpacing="0.02em"
                        style={{ pointerEvents: 'none' }}
                      >
                        {initialsOf(a)}
                      </text>
                    )}
                    {/* Etiqueta tipo chip · solo en alta influencia o foco/hover */}
                    {(isFocus || isHover || (inf >= 70 && !focus)) && (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect
                          x={x - (shortName(a).length * 3.4) - 7}
                          y={y + r + 5}
                          width={(shortName(a).length * 6.8) + 14}
                          height={16}
                          rx="8"
                          fill="#fff"
                          stroke="#ECECEF"
                          strokeWidth="1"
                        />
                        <text
                          x={x} y={y + r + 16}
                          textAnchor="middle"
                          fill="#1d1d1f"
                          fontFamily="var(--font-display)"
                          fontWeight="600"
                          fontSize="10"
                        >
                          {shortName(a)}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Tooltip al hover (HTML, fuera del SVG) */}
          {tooltipActor && hovered !== focus && (() => {
            const pos = posMap[tooltipActor.id]
            if (!pos) return null
            const [tx, ty] = pos
            // Convertir coords SVG a coords visuales (% del viewBox)
            const left = ((tx * zoom + pan.x) / W) * 100
            const top  = ((ty * zoom + pan.y) / H) * 100
            const color = tooltipActor.color || CAT_COLOR[tooltipActor.cat || ''] || '#6e6e73'
            return (
              <div style={{
                position: 'absolute',
                left: `${left}%`, top: `${top}%`,
                transform: 'translate(-50%, calc(-100% - 18px))',
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 10,
                padding: '8px 12px', minWidth: 180, maxWidth: 260,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                pointerEvents: 'none', zIndex: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }}/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{nameOf(tooltipActor)}</span>
                </div>
                {(tooltipActor.cargo_actual || tooltipActor.cargo) && (
                  <div style={{ fontSize: 11, color: '#515154', marginBottom: 2 }}>{tooltipActor.cargo_actual || tooltipActor.cargo}</div>
                )}
                <div style={{ fontSize: 10.5, color: '#6e6e73' }}>
                  {tooltipActor.partido}{tooltipActor.cat ? ' · ' + (CAT_LABEL[tooltipActor.cat] || '') : ''} · inf. {infOf(tooltipActor)}
                </div>
              </div>
            )
          })()}

          {/* Hint de uso (esquina inferior izquierda) */}
          <div style={{
            position: 'absolute', bottom: 14, left: 14, zIndex: 5,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
            border: '1px solid #ECECEF', borderRadius: 999,
            padding: '4px 10px', fontSize: 10, color: '#6e6e73',
            pointerEvents: 'none',
          }}>
            <span>↕ scroll · zoom · arrastrar fondo · clic en nodo · foco</span>
          </div>
        </div>
      </div>

      {/* Panel lateral */}
      <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 22,
        padding: '22px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}>
        {focusStats ? <FocusPanel stats={focusStats} actors={visibleActors}/>
                    : <LegendPanel actors={visibleActors} totalActors={actors.length} cats={cats.filter(c => c !== 'Todas')}/>}
      </div>
    </section>
  )
}

// ───────────── helpers UI ─────────────

const btnGhost: React.CSSProperties = {
  background: '#fff', border: '1px solid #d2d2d7', borderRadius: 999,
  padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
  fontSize: 12, color: '#3a3a3d', transition: 'all 160ms',
}
const btnPrimary: React.CSSProperties = {
  background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 999,
  padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
}

function ZoomBtn({ onClick, children, title, small }: { onClick: () => void; children: React.ReactNode; title?: string; small?: boolean }) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        background: '#fff', border: 'none', cursor: 'pointer',
        width: 36, height: 36, padding: 0,
        fontSize: small ? 14 : 18, fontWeight: 500, color: '#1d1d1f',
        fontFamily: 'inherit', lineHeight: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center', transition: 'background 120ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f7' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
    >
      {children}
    </button>
  )
}

function FilterBtn({ active, onClick, accent, children }: { active: boolean; onClick: () => void; accent?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#1d1d1f' : '#fff',
      color: active ? '#fff' : (accent || '#3a3a3d'),
      border: active ? '1px solid #1d1d1f' : '1px solid #d2d2d7',
      borderRadius: 999, padding: '7px 14px', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
      display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
      transition: 'all 160ms',
    }}>
      {accent && !active && <span style={{ width: 8, height: 8, borderRadius: 999, background: accent }}/>}
      {children}
    </button>
  )
}

function FocusPanel({ stats, actors }: { stats: { actor: Actor; links: { otherId: string; val: number; label: string }[] }; actors: Actor[] }) {
  const actorOf = (id: string) => actors.find(a => a.id === id)
  const cargo = stats.actor.cargo_actual || stats.actor.cargo || ''
  const partido = stats.actor.partido || ''
  const color = stats.actor.color || CAT_COLOR[stats.actor.cat || ''] || '#6e6e73'
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 999, background: color,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700,
          boxShadow: `0 4px 14px ${color}40`, flexShrink: 0,
        }}>
          {initialsOf(stats.actor)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6e6e73', margin: 0 }}>Foco</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: '2px 0', lineHeight: 1.2 }}>
            {nameOf(stats.actor)}
          </h2>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#515154', margin: '0 0 4px' }}>{cargo}</p>
      <p style={{ fontSize: 11, color: '#6e6e73', margin: '0 0 16px' }}>
        {partido}{partido && stats.actor.cat ? ' · ' : ''}{CAT_LABEL[stats.actor.cat || ''] || ''} · {stats.links.length} relaciones · influencia {infOf(stats.actor)}
      </p>
      <p style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 10px' }}>
        Afinidad bilateral
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
        {stats.links.length === 0 && (
          <div style={{ padding: '20px 6px', textAlign: 'center', color: '#9CA3AF', fontSize: 11.5 }}>
            Sin relaciones detectadas con los actores visibles.
          </div>
        )}
        {stats.links.map(l => {
          const other = actorOf(l.otherId)
          if (!other) return null
          const pct = (Math.abs(l.val) / 100) * 50
          const pos = l.val >= 0
          const otherColor = other.color || CAT_COLOR[other.cat || ''] || '#6e6e73'
          return (
            <div key={l.otherId}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: 3, gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: otherColor, flexShrink: 0 }}/>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortName(other)}</span>
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 600,
                  letterSpacing: '-0.012em', color: pos ? '#16A34A' : '#DC2626', whiteSpace: 'nowrap',
                }}>
                  {pos ? '+' : ''}{l.val}
                </span>
              </div>
              <div style={{ position: 'relative', height: 4, background: '#f5f5f7', borderRadius: 999 }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#6e6e73', opacity: 0.4 }}/>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: pos ? '50%' : `${50 - pct}%`,
                  width: `${pct}%`,
                  background: pos ? '#16A34A' : '#DC2626',
                  borderRadius: 999,
                }}/>
              </div>
              <div style={{ fontSize: 9.5, color: '#9CA3AF', marginTop: 1 }}>{l.label}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function LegendPanel({ actors, totalActors, cats }: { actors: Actor[]; totalActors: number; cats: string[] }) {
  const byCat: Record<string, number> = {}
  for (const a of actors) {
    const lbl = CAT_LABEL[a.cat || '']
    if (lbl) byCat[lbl] = (byCat[lbl] || 0) + 1
  }
  return (
    <>
      <p style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6e6e73', margin: '0 0 6px' }}>Leyenda</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.022em', margin: '0 0 6px' }}>
        Cómo leer el grafo
      </h2>
      <p style={{ fontSize: 12, color: '#515154', margin: '0 0 16px', lineHeight: 1.5 }}>
        <strong>{actors.length}</strong> actores en pantalla · de {totalActors} totales · ordenados por influencia.
        Posición: <strong>X</strong> ideología (izq/dcha) · <strong>Y</strong> centralización.
      </p>

      <LegendRow>
        <svg width="48" height="14"><line x1="0" y1="7" x2="48" y2="7" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round"/></svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Alianza</div>
          <div style={{ fontSize: 11, color: '#6e6e73' }}>Compañeros · bloque ideológico</div>
        </div>
      </LegendRow>
      <LegendRow>
        <svg width="48" height="14"><line x1="0" y1="7" x2="48" y2="7" stroke="#DC2626" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round"/></svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Conflicto</div>
          <div style={{ fontSize: 11, color: '#6e6e73' }}>Bloques opuestos · gobierno↔oposición</div>
        </div>
      </LegendRow>

      <div style={{ height: 1, background: '#e8e8ed', margin: '14px 0' }}/>

      <p style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 8px' }}>
        Por categoría
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {cats.map(c => {
          const code = Object.keys(CAT_LABEL).find(k => CAT_LABEL[k] === c) || ''
          const color = CAT_COLOR[code] || '#6e6e73'
          return (
            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: color, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, color: '#1d1d1f' }}>{c}</span>
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                {byCat[c] || 0}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ height: 1, background: '#e8e8ed', margin: '14px 0' }}/>
      <p style={{ fontSize: 10.5, color: '#6e6e73', margin: 0, lineHeight: 1.5 }}>
        Pulsa un nodo para aislar sus vínculos. Usa scroll para hacer zoom y arrastra el fondo para mover el grafo.
      </p>
    </>
  )
}

function LegendRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>{children}</div>
}
