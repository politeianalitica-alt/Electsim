'use client'
import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { RELACIONES_EXPLICITAS, TIPO_META, TIPO_LABEL, type TipoRelacion } from '@/lib/relaciones-explicitas'

// Grafo de relaciones de actores políticos · v3
// Mejoras sobre v2:
//   · Decoupled zoom: las posiciones se separan al hacer zoom, pero los
//     nodos NO se inflan (manteniéndose siempre del tamaño correcto)
//   · Drag de nodos individuales (mover manualmente)
//   · Tooltip al hover sobre arcos
//   · Atajos teclado (ESC=quita foco, /=enfoca buscador, +/-=zoom)
//   · Cuadrantes con tinte ideológico muy sutil
//   · Chip de stats flotante
//   · Animación de entrada en cascada (stagger)

interface Actor {
  id: string
  nombre?: string; nombre_completo?: string
  partido?: string
  cargo?: string; cargo_actual?: string
  ejeX?: number; ejeY?: number
  cat?: string; color?: string
  inf?: number; score_influencia?: number
}

interface Props {
  actors?: Actor[]
  maxActors?: number
}

// ───────── Categorías y colores ─────────
const CAT_LABEL: Record<string, string> = {
  gobierno:'Gobierno', oposicion:'Oposición', parlamento:'Parlamento',
  autonomico:'Autonómico', municipal:'Municipal', institucion:'Institución',
  patronal:'Patronal', sindicato:'Sindicato', mediatico:'Medios', europa:'Europa',
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

interface InferredLink {
  a: string
  b: string
  val: number
  label: string
  tipo?: TipoRelacion           // si proviene de relación explícita
  curado?: boolean              // true si está en el dataset curado
}

/**
 * Combina relaciones EXPLÍCITAS (dataset curado con hitos reales) con
 * relaciones INFERIDAS por algoritmo. Las explícitas siempre prevalecen
 * y se muestran primero · luego las inferidas rellenan hasta el límite.
 */
function buildLinks(visible: Actor[]): InferredLink[] {
  const visIds = new Set(visible.map(v => v.id))

  // 1. Relaciones explícitas que aplican a los actores visibles
  const explicitas: InferredLink[] = []
  const explicitKey = new Set<string>()
  for (const r of RELACIONES_EXPLICITAS) {
    if (!visIds.has(r.a) || !visIds.has(r.b)) continue
    const key = [r.a, r.b].sort().join('|')
    explicitKey.add(key)
    explicitas.push({ a: r.a, b: r.b, val: r.val, label: r.label, tipo: r.tipo, curado: true })
  }

  // 2. Relaciones inferidas (pero solo donde no hay explícita)
  const inferidas: InferredLink[] = []
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const key = [visible[i].id, visible[j].id].sort().join('|')
      if (explicitKey.has(key)) continue
      const link = pairScore(visible[i], visible[j])
      if (link && Math.abs(link.val) >= 30) {
        inferidas.push({ a: visible[i].id, b: visible[j].id, val: link.val, label: link.label })
      }
    }
  }
  // Ordena inferidas por intensidad descendente
  inferidas.sort((x, y) => Math.abs(y.val) - Math.abs(x.val))

  // 3. Combina · explícitas siempre + hasta completar 450 con inferidas
  return [...explicitas, ...inferidas].slice(0, 450)
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
  if ((ba === 'institucion' && (pb === 'PP' || pb === 'PSOE')) || (bb === 'institucion' && (pa === 'PP' || pa === 'PSOE'))) return { val: 35, label: 'Diálogo formal' }
  return null
}

const nameOf = (a: Actor): string => a.nombre_completo || a.nombre || a.id
const shortName = (a: Actor): string => {
  const parts = nameOf(a).split(/\s+/)
  return parts.length === 1 ? nameOf(a) : `${parts[0][0]}. ${parts[1]}`
}
const initialsOf = (a: Actor): string => {
  const parts = nameOf(a).split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
const infOf = (a: Actor): number => a.score_influencia ?? a.inf ?? 50

function antiCollide(positions: Record<string, [number, number]>, radii: Record<string, number>): Record<string, [number, number]> {
  const ids = Object.keys(positions)
  const result: Record<string, [number, number]> = {}
  for (const id of ids) result[id] = [...positions[id]] as [number, number]
  // 25 pases (antes 5) + padding 18px (antes 6) → reparto mucho más respirable
  for (let pass = 0; pass < 25; pass++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = result[ids[i]], b = result[ids[j]]
        const minDist = (radii[ids[i]] + radii[ids[j]]) + 18
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

export default function RelacionesGrafo({ actors = [], maxActors = 100 }: Props) {
  const [focus, setFocus] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'pos' | 'neg'>('all')
  const [showLabels, setShowLabels] = useState(true)
  const [filterCat, setFilterCat] = useState<string>('Todas')
  const [searchQuery, setSearchQuery] = useState('')

  // Zoom · ahora "decoupled": las posiciones se expanden, pero el nodo
  // mantiene su tamaño visual.
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [customPos, setCustomPos] = useState<Record<string, [number, number]>>({})

  // Drag: del fondo (pan) o de un nodo concreto
  const dragMode = useRef<'pan' | 'node' | null>(null)
  const dragNodeId = useRef<string | null>(null)
  const dragStart = useRef<{ x0: number; y0: number; pan0?: { x: number; y: number }; nodePos0?: [number, number] } | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const W = 1200, H = 760
  const cx = W / 2, cy = H / 2

  const visibleActors = useMemo(() => {
    let pool = actors
    if (filterCat !== 'Todas') pool = pool.filter(a => CAT_LABEL[a.cat || ''] === filterCat)
    return [...pool].sort((x, y) => infOf(y) - infOf(x)).slice(0, maxActors)
  }, [actors, filterCat, maxActors])

  const allLinks = useMemo(() => buildLinks(visibleActors), [visibleActors])

  // Posiciones BASE (sin zoom/pan/custom). Anti-collision.
  const basePosMap = useMemo(() => {
    const padding = 80
    const initial: Record<string, [number, number]> = {}
    const radii: Record<string, number> = {}
    visibleActors.forEach(a => {
      const ejeX = a.ejeX ?? 0
      const ejeY = a.ejeY ?? 0
      const x = padding + ((ejeX + 100) / 200) * (W - 2 * padding)
      const y = padding + ((100 - ejeY) / 200) * (H - 2 * padding)
      const hash = a.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
      const jx = ((hash % 19) - 9) * 1.6
      const jy = (((hash * 7) % 17) - 8) * 1.6
      initial[a.id] = [x + jx, y + jy]
      radii[a.id] = 12 + Math.sqrt(infOf(a)) * 1.4
    })
    return antiCollide(initial, radii)
  }, [visibleActors])

  // Posición FINAL (visible) = base · si el usuario ha arrastrado el nodo,
  // usamos su posición custom; si no, aplicamos zoom + pan al base.
  const transformPos = useCallback((id: string, base: [number, number]): [number, number] => {
    const custom = customPos[id]
    const [bx, by] = custom || base
    return [
      (bx - cx) * zoom + cx + pan.x,
      (by - cy) * zoom + cy + pan.y,
    ]
  }, [zoom, pan, customPos, cx, cy])

  const visiblePosMap = useMemo(() => {
    const out: Record<string, [number, number]> = {}
    for (const a of visibleActors) {
      out[a.id] = transformPos(a.id, basePosMap[a.id])
    }
    return out
  }, [visibleActors, basePosMap, transformPos])

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

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return actors
      .filter(a => nameOf(a).toLowerCase().includes(q) || (a.partido || '').toLowerCase().includes(q))
      .sort((x, y) => infOf(y) - infOf(x))
      .slice(0, 6)
  }, [searchQuery, actors])

  const zoomIn = () => setZoom(z => Math.min(3, +(z * 1.25).toFixed(2)))
  const zoomOut = () => setZoom(z => Math.max(0.5, +(z / 1.25).toFixed(2)))
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); setCustomPos({}) }

  // Drag handling
  const screenToSvg = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current
    if (!svg) return [0, 0]
    const rect = svg.getBoundingClientRect()
    const sx = (clientX - rect.left) / rect.width * W
    const sy = (clientY - rect.top) / rect.height * H
    return [sx, sy]
  }, [W, H])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element
    const nodeEl = target.closest('[data-node-id]') as HTMLElement | null
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-node-id')!
      dragMode.current = 'node'
      dragNodeId.current = id
      const base = basePosMap[id]
      const current = customPos[id] || base
      dragStart.current = { x0: e.clientX, y0: e.clientY, nodePos0: current }
    } else {
      dragMode.current = 'pan'
      dragStart.current = { x0: e.clientX, y0: e.clientY, pan0: { ...pan } }
    }
  }, [basePosMap, customPos, pan])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragMode.current || !dragStart.current) return
    const dx = e.clientX - dragStart.current.x0
    const dy = e.clientY - dragStart.current.y0
    if (dragMode.current === 'pan') {
      setPan({ x: dragStart.current.pan0!.x + dx, y: dragStart.current.pan0!.y + dy })
    } else if (dragMode.current === 'node' && dragNodeId.current) {
      // Convertir delta de pantalla a delta SVG (compensa zoom)
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const dsx = dx / rect.width * W / zoom
      const dsy = dy / rect.height * H / zoom
      const [bx0, by0] = dragStart.current.nodePos0!
      setCustomPos(prev => ({ ...prev, [dragNodeId.current!]: [bx0 + dsx, by0 + dsy] }))
    }
  }, [zoom, W, H])

  const onMouseUp = useCallback(() => {
    dragMode.current = null
    dragNodeId.current = null
    dragStart.current = null
  }, [])

  // Wheel zoom (centrado en el cursor)
  const onWheel = useCallback((e: WheelEvent) => {
    if (!svgRef.current?.contains(e.target as Node)) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? 1 / 1.1 : 1.1
    setZoom(z => Math.max(0.5, Math.min(3, +(z * delta).toFixed(2))))
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // Atajos teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignorar si se está escribiendo en un input
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') (t as HTMLInputElement).blur()
        return
      }
      if (e.key === 'Escape') { setFocus(null); setHovered(null) }
      else if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus() }
      else if (e.key === '+' || e.key === '=') zoomIn()
      else if (e.key === '-') zoomOut()
      else if (e.key === '0') zoomReset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tooltipActor = hovered ? visibleActors.find(a => a.id === hovered) : null
  const hoveredLinkData = hoveredLink !== null ? visibleLinks[hoveredLink] : null

  // Stats agregadas
  const positiveLinks = visibleLinks.filter(l => l.val > 0).length
  const negativeLinks = visibleLinks.filter(l => l.val < 0).length
  const distinctParties = new Set(visibleActors.map(a => a.partido).filter(Boolean)).size

  return (
    <section style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 18 }}>
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
          <div style={{ position: 'relative', minWidth: 240 }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Buscar actor o partido…  (pulsa "/")'
              style={{
                background: '#fff', border: '1px solid #d2d2d7', borderRadius: 999,
                padding: '7px 14px 7px 32px', fontSize: 12, fontFamily: 'inherit',
                color: '#1d1d1f', width: 250, outline: 'none', transition: 'all 160ms',
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
                    <button key={m.id} onClick={() => { setSearchQuery(''); setFilterCat('Todas'); setFocus(m.id) }} style={{
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

        {/* Wrapper SVG */}
        <div style={{ position: 'relative' }}>
          {/* Stats chip · esquina superior izquierda */}
          <div style={{
            position: 'absolute', top: 14, left: 14, zIndex: 5,
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            border: '1px solid #ECECEF', borderRadius: 14,
            padding: '8px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <Stat label="Actores" value={visibleActors.length}/>
            <span style={{ width: 1, alignSelf: 'stretch', background: '#ECECEF' }}/>
            <Stat label="Alianzas"   value={positiveLinks} color="#16A34A"/>
            <span style={{ width: 1, alignSelf: 'stretch', background: '#ECECEF' }}/>
            <Stat label="Conflictos" value={negativeLinks} color="#DC2626"/>
            <span style={{ width: 1, alignSelf: 'stretch', background: '#ECECEF' }}/>
            <Stat label="Partidos" value={distinctParties}/>
          </div>

          {/* Controles de zoom */}
          <div style={{
            position: 'absolute', top: 14, right: 14, zIndex: 5,
            display: 'flex', flexDirection: 'column', gap: 1,
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)', overflow: 'hidden',
          }}>
            <ZoomBtn onClick={zoomIn} title="Acercar (+)">＋</ZoomBtn>
            <div style={{ height: 1, background: '#f5f5f7' }}/>
            <ZoomBtn onClick={zoomOut} title="Alejar (-)">－</ZoomBtn>
            <div style={{ height: 1, background: '#f5f5f7' }}/>
            <ZoomBtn onClick={zoomReset} title="Restablecer (0)" small>↺</ZoomBtn>
          </div>
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
              cursor: dragMode.current === 'pan' ? 'grabbing' : (dragMode.current === 'node' ? 'move' : 'grab'),
              touchAction: 'none', userSelect: 'none',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              {/* Cuadrantes ideológicos · más sutil que antes */}
              <linearGradient id="bgQuadrants" x1="0" y1="0" x2="100%" y2="0">
                <stop offset="0%"   stopColor="#FEF2F2" stopOpacity="0.32"/>
                <stop offset="50%"  stopColor="#fafafa" stopOpacity="0.10"/>
                <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.32"/>
              </linearGradient>
              {/* Viñeta radial sutil para enfocar la mirada al centro */}
              <radialGradient id="bgVignette" cx="50%" cy="50%" r="62%">
                <stop offset="60%" stopColor="#fff" stopOpacity="0"/>
                <stop offset="100%" stopColor="#1d1d1f" stopOpacity="0.06"/>
              </radialGradient>
              {/* Patrón de puntos · más fino y discreto */}
              <pattern id="grafoDotsPattern" width="26" height="26" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.6" fill="#d2d2d7" opacity="0.35"/>
              </pattern>
              {/* Sombra suave para nodos · da profundidad */}
              <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2.6"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feFlood floodColor="#000" floodOpacity="0.18"/>
                <feComposite in2="offsetblur" operator="in"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              {/* Glow para nodos enfocados */}
              <filter id="nodeGlowFocus" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="8"/>
              </filter>
              {/* Gradiente radial reutilizable por color (definido inline en cada nodo via fill) */}
              {/* Marker de flecha sutil para arcos enfocados (sólo en focus) */}
              <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="#1d1d1f" opacity="0.4"/>
              </marker>
            </defs>

            {/* Fondo · capas: gradiente cuadrantes + viñeta radial + dots */}
            <rect x="0" y="0" width={W} height={H} fill="url(#bgQuadrants)"/>
            <rect x="0" y="0" width={W} height={H} fill="url(#bgVignette)"/>
            <rect x="0" y="0" width={W} height={H} fill="url(#grafoDotsPattern)"/>

            {/* Ejes (transformados por zoom + pan para coherencia) */}
            {(() => {
              const [ax0, ay0] = [(40 - cx) * zoom + cx + pan.x, cy + pan.y]
              const [ax1, ay1] = [(W - 40 - cx) * zoom + cx + pan.x, cy + pan.y]
              const [bx0, by0] = [cx + pan.x, (40 - cy) * zoom + cy + pan.y]
              const [bx1, by1] = [cx + pan.x, (H - 40 - cy) * zoom + cy + pan.y]
              return (
                <>
                  <line x1={ax0} y1={ay0} x2={ax1} y2={ay1} stroke="#d2d2d7" strokeDasharray="2 5" strokeWidth="1"/>
                  <line x1={bx0} y1={by0} x2={bx1} y2={by1} stroke="#d2d2d7" strokeDasharray="2 5" strokeWidth="1"/>
                  <text x={ax0 + 8} y={ay0 + 4} textAnchor="start" fontSize="10" fill="#6e6e73" letterSpacing="0.12em" fontWeight="600">IZQ.</text>
                  <text x={ax1 - 8} y={ay1 + 4} textAnchor="end"   fontSize="10" fill="#6e6e73" letterSpacing="0.12em" fontWeight="600">DER.</text>
                  <text x={bx0} y={by0 - 8} textAnchor="middle" fontSize="10" fill="#6e6e73" letterSpacing="0.12em" fontWeight="600">CENTRALIZACIÓN</text>
                  <text x={bx1} y={by1 + 14} textAnchor="middle" fontSize="10" fill="#6e6e73" letterSpacing="0.12em" fontWeight="600">DESCENTRALIZACIÓN</text>
                </>
              )
            })()}

            {/* Edges */}
            {visibleLinks.map((l, i) => {
              const pa = visiblePosMap[l.a], pb = visiblePosMap[l.b]
              if (!pa || !pb) return null
              const [x1, y1] = pa, [x2, y2] = pb
              const cxScreen = cx + pan.x
              const cyScreen = cy + pan.y
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
              const dx = mx - cxScreen, dy = my - cyScreen
              const len = Math.sqrt(dx * dx + dy * dy) || 1
              const cmx = mx + (dx / len) * 30
              const cmy = my + (dy / len) * 30
              // Si la relación es CURADA (explícita) usamos el color específico
              // del tipo · si es INFERIDA, fallback al verde/rojo genérico.
              const tipoMeta = l.tipo ? TIPO_META[l.tipo] : null
              const stroke = tipoMeta?.color ?? (l.val >= 0 ? '#16A34A' : '#DC2626')
              const isHL = (focus && (l.a === focus || l.b === focus)) || (hoveredLink === i)
              const baseOpacity = l.curado ? 0.72 : 0.45
              const opacity = isHL ? 0.96 : (focus ? 0.10 : Math.min(baseOpacity, Math.abs(l.val) / 100 + 0.15))
              const intensidad = tipoMeta?.intensidad ?? 1
              const width = Math.max(0.8, (Math.abs(l.val) / 100) * 5 * intensidad) * (isHL ? 1.7 : 1) * (l.curado ? 1.25 : 1)
              const dash = l.val < 0 ? '5 5' : ''
              return (
                <g key={i} style={{ pointerEvents: 'visibleStroke' }}>
                  <path
                    d={`M ${x1} ${y1} Q ${cmx} ${cmy} ${x2} ${y2}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={Math.max(width, 6)}
                    strokeOpacity={0}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredLink(i)}
                    onMouseLeave={() => setHoveredLink(null)}
                  />
                  <path
                    d={`M ${x1} ${y1} Q ${cmx} ${cmy} ${x2} ${y2}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={width}
                    strokeOpacity={opacity}
                    strokeDasharray={dash}
                    strokeLinecap="round"
                    style={{
                      pointerEvents: 'none',
                      transition: 'stroke-opacity 200ms, stroke-width 200ms',
                      // Animación de flujo · sólo en conflictos (dash) y cuando están enfocados
                      animation: (l.val < 0 && isHL) ? 'grafoEdgeFlow 1.4s linear infinite' : undefined,
                    }}
                  />
                  {showLabels && isHL && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect
                        x={cmx - (l.label.length * 3.4) - 7}
                        y={cmy - 18}
                        width={(l.label.length * 6.8) + 14}
                        height={15}
                        rx="7.5"
                        fill="#fff"
                        stroke={stroke}
                        strokeOpacity="0.35"
                      />
                      <text x={cmx} y={cmy - 8} textAnchor="middle" fontSize="9.5" fontWeight="600" fill={stroke}>
                        {l.label}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Nodes · NO se transforman por zoom (mantienen su radio) */}
            {visibleActors.map((a, idx) => {
              const pos = visiblePosMap[a.id]
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
                  data-node-id={a.id}
                  style={{
                    cursor: dragMode.current === 'node' && dragNodeId.current === a.id ? 'grabbing' : 'pointer',
                    transition: 'opacity 200ms',
                    animation: `grafoNodeIn 360ms ease-out backwards`,
                    animationDelay: `${idx * 12}ms`,
                  }}
                  opacity={dim ? 0.18 : 1}
                  onClick={() => { if (dragMode.current !== 'node') setFocus(focus === a.id ? null : a.id) }}
                  onMouseEnter={() => setHovered(a.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Halo expandido (focus o hover) — más grande y suave */}
                  {(isFocus || isHover) && (
                    <>
                      <circle cx={x} cy={y} r={r + 18} fill={color} opacity={isFocus ? 0.16 : 0.08}/>
                      <circle cx={x} cy={y} r={r + 9}  fill={color} opacity={isFocus ? 0.24 : 0.14}/>
                    </>
                  )}
                  {/* Nodo principal con sombra */}
                  <circle
                    cx={x} cy={y} r={r}
                    fill={color}
                    stroke={isFocus ? '#1d1d1f' : '#fff'}
                    strokeWidth={isFocus ? 2.5 : 2}
                    filter="url(#nodeShadow)"
                    style={{ transition: 'r 200ms ease-out' }}
                  />
                  {/* Highlight superior · simula iluminación 3D */}
                  <ellipse
                    cx={x} cy={y - r * 0.42}
                    rx={r * 0.55} ry={r * 0.28}
                    fill="#fff"
                    opacity={isFocus ? 0.30 : isHover ? 0.25 : 0.18}
                    style={{ pointerEvents: 'none', transition: 'opacity 200ms' }}
                  />
                  {r >= 14 && (
                    <text
                      x={x} y={y + 4}
                      textAnchor="middle"
                      fill="#fff"
                      fontFamily="var(--font-display)"
                      fontWeight="700"
                      fontSize={r >= 22 ? '12' : '10'}
                      letterSpacing="0.02em"
                      style={{ pointerEvents: 'none' }}
                    >
                      {initialsOf(a)}
                    </text>
                  )}
                  {(isFocus || isHover || (inf >= 70 && !focus)) && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect
                        x={x - (shortName(a).length * 3.4) - 7}
                        y={y + r + 6}
                        width={(shortName(a).length * 6.8) + 14}
                        height={16}
                        rx="8"
                        fill="#fff"
                        stroke="#ECECEF"
                        strokeWidth="1"
                      />
                      <text
                        x={x} y={y + r + 17}
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
          </svg>

          {/* Tooltip al hover sobre nodo */}
          {tooltipActor && hovered !== focus && (() => {
            const pos = visiblePosMap[tooltipActor.id]
            if (!pos) return null
            const [tx, ty] = pos
            const left = (tx / W) * 100
            const top  = (ty / H) * 100
            const color = tooltipActor.color || CAT_COLOR[tooltipActor.cat || ''] || '#6e6e73'
            return (
              <div style={{
                position: 'absolute',
                left: `${left}%`, top: `${top}%`,
                transform: 'translate(-50%, calc(-100% - 22px))',
                background: '#fff', border: '1px solid #ECECEF', borderRadius: 10,
                padding: '8px 12px', minWidth: 180, maxWidth: 280,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                pointerEvents: 'none', zIndex: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }}/>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d1d1f' }}>{nameOf(tooltipActor)}</span>
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

          {/* Tooltip al hover sobre arco */}
          {hoveredLinkData && (() => {
            const pa = visiblePosMap[hoveredLinkData.a]
            const pb = visiblePosMap[hoveredLinkData.b]
            if (!pa || !pb) return null
            const tx = (pa[0] + pb[0]) / 2
            const ty = (pa[1] + pb[1]) / 2
            const left = (tx / W) * 100
            const top = (ty / H) * 100
            const stroke = hoveredLinkData.val >= 0 ? '#16A34A' : '#DC2626'
            const partyA = visibleActors.find(x => x.id === hoveredLinkData.a)
            const partyB = visibleActors.find(x => x.id === hoveredLinkData.b)
            return (
              <div style={{
                position: 'absolute',
                left: `${left}%`, top: `${top}%`,
                transform: 'translate(-50%, -50%)',
                background: '#fff', border: `1px solid ${stroke}30`, borderRadius: 10,
                padding: '8px 12px', minWidth: 200, boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                pointerEvents: 'none', zIndex: 8,
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: stroke, textTransform: 'uppercase', marginBottom: 4 }}>
                  {hoveredLinkData.label}
                </div>
                <div style={{ fontSize: 12, color: '#1d1d1f' }}>
                  <strong>{partyA && shortName(partyA)}</strong> ↔ <strong>{partyB && shortName(partyB)}</strong>
                </div>
                <div style={{ fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 700, color: stroke, marginTop: 2 }}>
                  {hoveredLinkData.val > 0 ? '+' : ''}{hoveredLinkData.val}
                </div>
              </div>
            )
          })()}

          {/* Hint de uso */}
          <div style={{
            position: 'absolute', bottom: 14, left: 14, zIndex: 5,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
            border: '1px solid #ECECEF', borderRadius: 999,
            padding: '4px 10px', fontSize: 10, color: '#6e6e73',
            pointerEvents: 'none',
          }}>
            <span>scroll · zoom &nbsp; · &nbsp; arrastrar fondo · pan &nbsp; · &nbsp; arrastrar nodo · mover &nbsp; · &nbsp; ESC · quitar foco</span>
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

      {/* Keyframes globales */}
      <style jsx global>{`
        @keyframes grafoNodeIn {
          from { opacity: 0; transform: scale(0.4); }
          to   { opacity: 1; transform: scale(1); }
        }
        /* Animación de flujo en arcos de conflicto · da sensación de tensión */
        @keyframes grafoEdgeFlow {
          to { stroke-dashoffset: -20; }
        }
        /* Halo lentamente respirante en nodos enfocados */
        @keyframes grafoFocusBreath {
          0%, 100% { opacity: 0.20; transform: scale(1); }
          50%      { opacity: 0.35; transform: scale(1.06); }
        }
      `}</style>
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
    <button onClick={onClick} title={title} style={{
      background: '#fff', border: 'none', cursor: 'pointer',
      width: 36, height: 36, padding: 0,
      fontSize: small ? 14 : 18, fontWeight: 500, color: '#1d1d1f',
      fontFamily: 'inherit', lineHeight: 1, display: 'flex',
      alignItems: 'center', justifyContent: 'center', transition: 'background 120ms',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f7' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}>
      {children}
    </button>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 50 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: color || '#1d1d1f', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
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

      <p style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 8px' }}>
        Tipos de alianza
      </p>
      {[
        ['coalicion_gobierno', 'Coalición Moncloa'],
        ['pacto_investidura',  'Pacto investidura'],
        ['pacto_autonomico',   'Coalición autonómica'],
        ['aliado_partido',     'Aliado de partido'],
        ['aliado_sindical',    'Alianza sindical'],
        ['aliado_mediatico',   'Afinidad mediática'],
        ['mediador',           'Diálogo institucional'],
      ].map(([k, l]) => {
        const m = TIPO_META[k as TipoRelacion]
        return (
          <LegendRow key={k}>
            <svg width="40" height="10"><line x1="0" y1="5" x2="40" y2="5" stroke={m.color} strokeWidth={2.6 * m.intensidad} strokeLinecap="round"/></svg>
            <div style={{ fontSize: 11.5, color: '#3a3a3d' }}>{l}</div>
          </LegendRow>
        )
      })}

      <div style={{ height: 1, background: '#e8e8ed', margin: '12px 0' }}/>

      <p style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 8px' }}>
        Tipos de conflicto
      </p>
      {[
        ['oposicion_frontal',     'Oposición frontal'],
        ['rivalidad_interna',     'Rivalidad interna'],
        ['conflicto_judicial',    'Conflicto judicial'],
        ['conflicto_territorial', 'Conflicto territorial'],
        ['ruptura_coalicion',     'Ruptura coalición'],
        ['critica_publica',       'Crítica pública'],
      ].map(([k, l]) => {
        const m = TIPO_META[k as TipoRelacion]
        return (
          <LegendRow key={k}>
            <svg width="40" height="10"><line x1="0" y1="5" x2="40" y2="5" stroke={m.color} strokeWidth={2.6 * m.intensidad} strokeDasharray="4 4" strokeLinecap="round"/></svg>
            <div style={{ fontSize: 11.5, color: '#3a3a3d' }}>{l}</div>
          </LegendRow>
        )
      })}

      <div style={{ fontSize: 10.5, color: '#6e6e73', margin: '10px 0 0', lineHeight: 1.4 }}>
        Las relaciones <strong>curadas</strong> (con tipo) son más gruesas y opacas
        · las <strong>inferidas</strong> por algoritmo son más finas.
      </div>

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
        Pulsa un nodo para aislar sus vínculos. Arrástralo para moverlo. Usa scroll para zoom y pan con el fondo.
      </p>
    </>
  )
}

function LegendRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>{children}</div>
}
