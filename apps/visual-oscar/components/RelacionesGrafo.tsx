'use client'
import { useMemo, useState } from 'react'

// Grafo de relaciones de actores políticos · diseño Apple-Newsroom
// Inspirado en "Grafo Relaciones.html" del design system, adaptado a personas:
//
// - Vista inicial: TODOS los actores filtrados (max 60 por densidad visual),
//   posicionados por su eje ideológico (X) y eje territorial (Y).
// - Click en un actor → aísla sus vínculos (correligionarios, gobierno↔oposición,
//   instituciones independientes…) y muestra panel de afinidad con cada otro.
// - Filtros pill por categoría · toggle alianzas/conflictos · ocultar etiquetas.
//
// Las relaciones bilaterales se infieren del dataset:
//   · mismo partido          → +75 (compañeros)
//   · partidos del mismo bloque (izq/der) → +35 (afinidad ideológica)
//   · partidos opuestos (izq vs der)      → -55 (rivalidad)
//   · institución vs partido grande       → +10 (diálogo formal)
//   · gobierno vs oposición               → -30 (oposición)
//
// Solo se dibujan relaciones con |val| ≥ 30 para evitar saturación visual.

interface Actor {
  id: string
  nombre?: string
  nombre_completo?: string
  partido?: string
  cargo?: string
  cargo_actual?: string
  // Posicionamiento ideológico (-100..+100). Si no, se calcula por partido.
  ejeX?: number
  ejeY?: number
  // Categoría · gobierno | oposicion | parlamento | autonomico | municipal |
  //              institucion | patronal | sindicato | mediatico | europa
  cat?: string
  // Color del partido (si no, gris)
  color?: string
  // Influencia 0-100 (radio del nodo)
  inf?: number
  score_influencia?: number
}

interface Props {
  actors?: Actor[]
  /** Máximo de actores en la vista inicial. Default 50. */
  maxActors?: number
}

// Categorías y colores
const CAT_LABEL: Record<string, string> = {
  gobierno: 'Gobierno',
  oposicion: 'Oposición',
  parlamento: 'Parlamento',
  autonomico: 'Autonómico',
  municipal: 'Municipal',
  institucion: 'Institución',
  patronal: 'Patronal',
  sindicato: 'Sindicato',
  mediatico: 'Medios',
  europa: 'Europa',
}
const CAT_COLOR: Record<string, string> = {
  gobierno:    '#E1322D',
  oposicion:   '#1F4E8C',
  parlamento:  '#5B21B6',
  autonomico:  '#0F766E',
  municipal:   '#0EA5E9',
  institucion: '#7C3AED',
  patronal:    '#0E7490',
  sindicato:   '#A02525',
  mediatico:   '#525258',
  europa:      '#0F766E',
}

// Bloque ideológico de cada partido (para inferir relaciones bilaterales)
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
  a: string  // actor id
  b: string  // actor id
  val: number  // -100..+100
  label: string
}

// Genera relaciones bilaterales entre actores visible · simétrica, dedup
function inferLinks(visible: Actor[]): InferredLink[] {
  const out: InferredLink[] = []
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i], b = visible[j]
      const link = pairScore(a, b)
      if (link && Math.abs(link.val) >= 30) {
        out.push({ a: a.id, b: b.id, val: link.val, label: link.label })
      }
    }
  }
  // Limitar para no saturar el SVG · top 80 por |val|
  out.sort((x, y) => Math.abs(y.val) - Math.abs(x.val))
  return out.slice(0, 80)
}

function pairScore(a: Actor, b: Actor): { val: number; label: string } | null {
  const pa = a.partido || 'Independiente'
  const pb = b.partido || 'Independiente'
  // Mismo partido
  if (pa === pb && pa !== 'Independiente' && pa !== 'Medios') {
    return { val: 78, label: 'Compañeros de partido' }
  }
  const ba = PARTY_BLOCK[pa]
  const bb = PARTY_BLOCK[pb]
  if (!ba || !bb) return null
  // Mismo bloque ideológico
  if (ba === bb && (ba === 'izq' || ba === 'der')) {
    return { val: 42, label: 'Bloque ideológico afín' }
  }
  // Bloques opuestos
  if ((ba === 'izq' && bb === 'der') || (ba === 'der' && bb === 'izq')) {
    return { val: -58, label: 'Bloques enfrentados' }
  }
  // Gobierno vs oposición (cat)
  const ca = a.cat, cb = b.cat
  if ((ca === 'gobierno' && cb === 'oposicion') || (ca === 'oposicion' && cb === 'gobierno')) {
    return { val: -45, label: 'Gobierno ↔ oposición' }
  }
  // Institución vs partido grande
  if ((ba === 'institucion' && (pb === 'PP' || pb === 'PSOE')) ||
      (bb === 'institucion' && (pa === 'PP' || pa === 'PSOE'))) {
    return { val: 35, label: 'Diálogo formal' }
  }
  return null
}

function nameOf(a: Actor): string {
  return a.nombre_completo || a.nombre || a.id
}
function shortName(a: Actor): string {
  // "Pedro Sánchez Pérez-Castejón" → "P. Sánchez"
  const n = nameOf(a)
  const parts = n.split(/\s+/)
  if (parts.length === 1) return n
  return `${parts[0][0]}. ${parts[1]}`
}
function infOf(a: Actor): number {
  return a.score_influencia ?? a.inf ?? 50
}

export default function RelacionesGrafo({ actors = [], maxActors = 50 }: Props) {
  const [focus, setFocus] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pos' | 'neg'>('all')
  const [showLabels, setShowLabels] = useState(true)
  const [filterCat, setFilterCat] = useState<string>('Todas')

  const W = 1100, H = 680
  const cx = W / 2, cy = H / 2

  // Filtrar por categoría y limitar a maxActors por influencia
  const visibleActors = useMemo(() => {
    let pool = actors
    if (filterCat !== 'Todas') pool = pool.filter(a => CAT_LABEL[a.cat || ''] === filterCat)
    // Ordena por influencia descendente y corta
    pool = [...pool].sort((x, y) => infOf(y) - infOf(x)).slice(0, maxActors)
    return pool
  }, [actors, filterCat, maxActors])

  // Inferir relaciones entre los actores visibles
  const allLinks = useMemo(() => inferLinks(visibleActors), [visibleActors])

  // Posicionar cada actor por ejeX/ejeY (con leve jitter para no superponer)
  const posMap = useMemo(() => {
    const map: Record<string, [number, number]> = {}
    const padding = 60
    visibleActors.forEach((a, idx) => {
      const ejeX = a.ejeX ?? 0
      const ejeY = a.ejeY ?? 0
      // Mapear -100..+100 a coords del SVG
      const x = padding + ((ejeX + 100) / 200) * (W - 2 * padding)
      const y = padding + ((100 - ejeY) / 200) * (H - 2 * padding)  // y invertido
      // Jitter determinista por id (evita superposición exacta)
      const hash = a.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
      const jx = ((hash % 13) - 6) * 1.5
      const jy = (((hash * 7) % 11) - 5) * 1.5
      map[a.id] = [x + jx, y + jy]
    })
    return map
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
      .map(l => ({
        otherId: l.a === focusActor.id ? l.b : l.a,
        val: l.val,
        label: l.label,
      }))
      .sort((a, b) => b.val - a.val)
    return { actor: focusActor, links }
  })() : null

  const cats = useMemo(() => {
    const set = new Set<string>()
    actors.forEach(a => { if (a.cat && CAT_LABEL[a.cat]) set.add(CAT_LABEL[a.cat]) })
    return ['Todas', ...Array.from(set)]
  }, [actors])

  return (
    <section style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: 18 }}>
      {/* Grafo */}
      <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 22,
        padding: '24px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todas las relaciones</FilterBtn>
          <FilterBtn active={filter === 'pos'} onClick={() => setFilter('pos')} accent="#16A34A">Solo alianzas</FilterBtn>
          <FilterBtn active={filter === 'neg'} onClick={() => setFilter('neg')} accent="#DC2626">Solo conflictos</FilterBtn>
          <span style={{ flex: 1 }}/>
          <button onClick={() => setShowLabels(s => !s)} style={btnGhost}>
            {showLabels ? 'Ocultar etiquetas' : 'Mostrar etiquetas'}
          </button>
          {focus && (
            <button onClick={() => setFocus(null)} style={btnPrimary}>✕ Quitar foco</button>
          )}
        </div>

        {/* Filtros por categoría */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Categoría:</span>
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

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          <defs>
            <radialGradient id="actoresBgGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#f5f5f7" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#f5f5f7" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#actoresBgGrad)"/>

          {/* Eje IZQ/DER (X) y CENTR/DESCEN (Y) */}
          <line x1={cx} y1="40" x2={cx} y2={H - 40} stroke="#e8e8ed" strokeDasharray="2 4"/>
          <line x1="40" y1={cy} x2={W - 40} y2={cy} stroke="#e8e8ed" strokeDasharray="2 4"/>
          <text x="50" y={cy + 4} textAnchor="start" fontSize="10" fill="#6e6e73" letterSpacing="0.1em" fontWeight="600">IZQ.</text>
          <text x={W - 50} y={cy + 4} textAnchor="end" fontSize="10" fill="#6e6e73" letterSpacing="0.1em" fontWeight="600">DER.</text>
          <text x={cx} y="32" textAnchor="middle" fontSize="10" fill="#6e6e73" letterSpacing="0.1em" fontWeight="600">CENTR.</text>
          <text x={cx} y={H - 26} textAnchor="middle" fontSize="10" fill="#6e6e73" letterSpacing="0.1em" fontWeight="600">DESCENTR.</text>

          {/* Edges (arcos) */}
          {visibleLinks.map((l, i) => {
            const pa = posMap[l.a], pb = posMap[l.b]
            if (!pa || !pb) return null
            const [x1, y1] = pa
            const [x2, y2] = pb
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2
            const dx = mx - cx, dy = my - cy
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const cmx = mx + (dx / len) * 25
            const cmy = my + (dy / len) * 25
            const stroke = l.val >= 0 ? '#16A34A' : '#DC2626'
            const opacity = focus ? 0.85 : Math.min(0.6, Math.abs(l.val) / 100 + 0.10)
            const width = Math.max(0.8, (Math.abs(l.val) / 100) * 4)
            const dash = l.val < 0 ? '4 4' : ''
            return (
              <g key={i}>
                <path
                  d={`M ${x1} ${y1} Q ${cmx} ${cmy} ${x2} ${y2}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeOpacity={opacity}
                  strokeDasharray={dash}
                  strokeLinecap="round"
                />
                {showLabels && focus && (l.a === focus || l.b === focus) && (
                  <text
                    x={cmx} y={cmy - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#515154"
                    fontWeight="500"
                    style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}
                  >
                    {l.label}
                  </text>
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
            const inf = infOf(a)
            const r = 10 + Math.sqrt(inf) * 1.4  // 10..24 px aprox
            const dim = !!focus && focus !== a.id && !visibleLinks.some(l => l.a === a.id || l.b === a.id)
            const color = a.color || CAT_COLOR[a.cat || ''] || '#6e6e73'
            return (
              <g
                key={a.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setFocus(focus === a.id ? null : a.id)}
              >
                {isFocus && <circle cx={x} cy={y} r={r + 8} fill={color} opacity="0.18"/>}
                <circle
                  cx={x} cy={y} r={r}
                  fill={color}
                  opacity={dim ? 0.20 : 1}
                  stroke={isFocus ? '#1d1d1f' : '#fff'}
                  strokeWidth={isFocus ? 2.5 : 2}
                />
                {(isFocus || inf >= 65 || focus === null) && r >= 12 && (
                  <text
                    x={x} y={y + r + 11}
                    textAnchor="middle"
                    fill="#1d1d1f"
                    fontFamily="var(--font-display)"
                    fontWeight="600"
                    fontSize="9.5"
                    opacity={dim ? 0.30 : 0.85}
                    style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}
                  >
                    {shortName(a)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Panel lateral */}
      <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 22,
        padding: '22px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {focusStats ? (
          <FocusPanel stats={focusStats} actors={visibleActors}/>
        ) : (
          <LegendPanel actors={visibleActors} totalActors={actors.length} cats={cats.filter(c => c !== 'Todas')}/>
        )}
      </div>
    </section>
  )
}

// ───────────── helpers UI ─────────────

const btnGhost: React.CSSProperties = {
  background: '#fff', border: '1px solid #d2d2d7', borderRadius: 999,
  padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
  fontSize: 12, color: '#3a3a3d',
}
const btnPrimary: React.CSSProperties = {
  background: '#1d1d1f', color: '#fff', border: 'none', borderRadius: 999,
  padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ width: 12, height: 12, borderRadius: 999, background: color, flexShrink: 0 }}/>
        <p style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6e6e73', margin: 0 }}>Foco</p>
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.022em', margin: '4px 0 4px', lineHeight: 1.15 }}>
        {nameOf(stats.actor)}
      </h2>
      <p style={{ fontSize: 12, color: '#515154', margin: '0 0 4px' }}>{cargo}</p>
      <p style={{ fontSize: 11, color: '#6e6e73', margin: '0 0 16px' }}>
        {partido}{partido && stats.actor.cat ? ' · ' : ''}{CAT_LABEL[stats.actor.cat || ''] || ''} · {stats.links.length} relaciones · influencia {infOf(stats.actor)}
      </p>
      <p style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 10px' }}>
        Afinidad bilateral
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
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
  // Conteo por categoría
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
        {actors.length} actores en pantalla · de {totalActors} totales · ordenados por influencia.
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
        <svg width="48" height="14"><line x1="0" y1="7" x2="48" y2="7" stroke="#DC2626" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round"/></svg>
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
        Pulsa un nodo para aislar sus vínculos. Las relaciones bilaterales se infieren del partido,
        bloque ideológico y rol institucional.
      </p>
    </>
  )
}

function LegendRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>{children}</div>
}
