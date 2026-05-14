'use client'
import { useMemo, useState } from 'react'

// Grafo de relaciones de afinidad parlamentaria entre partidos.
// Adaptado del diseño "Grafo Relaciones.html" del design system Apple-Newsroom.
//
// Cada arco representa una relación bilateral.
// Verde sólido  = alianza  (val > 0)  · grosor proporcional a |val|/100
// Rojo punteado = conflicto (val < 0)
// Click en partido → aísla sus vínculos · click otra vez = quitar foco

export interface GrafoParty {
  id: string
  name: string
  color: string
  seats: number
  block?: 'izq' | 'der' | 'centro'
}
export interface GrafoLink {
  a: string
  b: string
  /** -100 (hostil) … +100 (alianza) */
  val: number
  label: string
}

interface Props {
  parties: GrafoParty[]
  links: GrafoLink[]
  /** Posiciones radiales personalizadas (id → [x, y] en %). Si no, se calculan automáticamente. */
  positions?: Record<string, [number, number]>
  /** Mostrar el panel lateral (default true) */
  showSidePanel?: boolean
}

// Posiciones radiales por defecto pensadas para el sistema español
// (eje X: -100 izq → +100 der · eje Y arriba: territorial vasco/catalán)
const DEFAULT_POSITIONS: Record<string, [number, number]> = {
  pp:    [+0.55, -0.10],
  vox:   [+0.92, +0.42],
  upn:   [+0.88, -0.55],
  cc:    [+0.30, -0.88],
  junts: [+0.05, -0.92],
  psoe:  [-0.55, -0.10],
  sumar: [-0.92, +0.42],
  erc:   [-0.50, +0.78],
  bildu: [-0.10, +0.90],
  bng:   [-0.95, -0.30],
  pnv:   [-0.40, -0.78],
}

export default function GrafoRelacionesPartidos({ parties, links, positions, showSidePanel = true }: Props) {
  const [focus, setFocus] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pos' | 'neg'>('all')
  const [showLabels, setShowLabels] = useState(true)

  const W = 920, H = 620
  const cx = W / 2, cy = H / 2 + 10
  const R = 220

  // Mapeo id → coords absolutas en el SVG
  const posMap = useMemo(() => {
    const out: Record<string, [number, number]> = {}
    for (const p of parties) {
      const rel = (positions && positions[p.id]) || DEFAULT_POSITIONS[p.id]
      if (rel) {
        out[p.id] = [cx + R * rel[0], cy + R * rel[1]]
      } else {
        // Fallback: distribución circular si no hay posición predefinida
        const idx = parties.indexOf(p)
        const angle = (idx / parties.length) * Math.PI * 2 - Math.PI / 2
        out[p.id] = [cx + R * 0.85 * Math.cos(angle), cy + R * 0.85 * Math.sin(angle)]
      }
    }
    return out
  }, [parties, positions, cx, cy])

  const partyOf = (id: string) => parties.find(p => p.id === id)

  const visibleLinks = links.filter(l => {
    if (!posMap[l.a] || !posMap[l.b]) return false
    if (filter === 'pos' && l.val < 0) return false
    if (filter === 'neg' && l.val >= 0) return false
    if (focus && l.a !== focus && l.b !== focus) return false
    return true
  })

  // Stats del partido enfocado
  const focusStats = focus ? (() => {
    const p = partyOf(focus)
    if (!p) return null
    const linksFocus = links
      .filter(l => l.a === focus || l.b === focus)
      .map(l => ({
        otherId: l.a === focus ? l.b : l.a,
        val: l.val,
        label: l.label,
      }))
      .sort((a, b) => b.val - a.val)
    return { p, links: linksFocus }
  })() : null

  return (
    <section style={{
      display: 'grid',
      gridTemplateColumns: showSidePanel ? '8fr 4fr' : '1fr',
      gap: 18,
    }}>
      {/* Filtros + grafo */}
      <div style={{
        background: '#fff', border: '1px solid #ECECEF', borderRadius: 22,
        padding: '24px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
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

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          <defs>
            <radialGradient id="grafoBgGrad" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#f5f5f7" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#f5f5f7" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r="260" fill="url(#grafoBgGrad)"/>
          <circle cx={cx} cy={cy} r="260" fill="none" stroke="#e8e8ed" strokeDasharray="3 5"/>

          {/* Eje IZQ/DER */}
          <line x1={cx - 260} y1={cy} x2={cx + 260} y2={cy} stroke="#e8e8ed" strokeDasharray="2 4"/>
          <text x={cx - 270} y={cy + 4} textAnchor="end" fontSize="10" fill="#6e6e73" letterSpacing="0.1em" fontWeight="600">IZQ.</text>
          <text x={cx + 270} y={cy + 4} textAnchor="start" fontSize="10" fill="#6e6e73" letterSpacing="0.1em" fontWeight="600">DER.</text>

          {/* Edges (arcos curvados hacia fuera del centro) */}
          {visibleLinks.map((l, i) => {
            const [x1, y1] = posMap[l.a]
            const [x2, y2] = posMap[l.b]
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2
            const dx = mx - cx, dy = my - cy
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const cmx = mx + (dx / len) * 30
            const cmy = my + (dy / len) * 30
            const stroke = l.val >= 0 ? '#16A34A' : '#DC2626'
            const opacity = focus ? 0.9 : Math.min(0.8, Math.abs(l.val) / 100 + 0.15)
            const width = Math.max(1.2, (Math.abs(l.val) / 100) * 6)
            const dash = l.val < 0 ? '5 5' : ''
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
                    fontSize="9.5"
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
          {parties.map(p => {
            const pos = posMap[p.id]
            if (!pos) return null
            const [x, y] = pos
            const isFocus = focus === p.id
            const dim = !!focus && focus !== p.id && !visibleLinks.some(l => l.a === p.id || l.b === p.id)
            const r = 18 + Math.sqrt(p.seats) * 1.8
            return (
              <g
                key={p.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setFocus(focus === p.id ? null : p.id)}
              >
                {isFocus && <circle cx={x} cy={y} r={r + 8} fill={p.color} opacity="0.15"/>}
                <circle
                  cx={x} cy={y} r={r}
                  fill={p.color}
                  opacity={dim ? 0.25 : 1}
                  stroke={isFocus ? '#1d1d1f' : '#fff'}
                  strokeWidth={2.5}
                />
                <text
                  x={x} y={y - 2}
                  textAnchor="middle"
                  fill="#fff"
                  fontFamily="var(--font-display)"
                  fontWeight="600"
                  fontSize={p.id === 'bildu' ? '10' : '13'}
                  letterSpacing="-0.01em"
                  opacity={dim ? 0.4 : 1}
                >
                  {p.id === 'bildu' ? 'Bildu' : p.name}
                </text>
                <text
                  x={x} y={y + 12}
                  textAnchor="middle"
                  fill="#fff"
                  fontFamily="var(--font-display)"
                  fontWeight="500"
                  fontSize="10"
                  opacity={dim ? 0.35 : 0.85}
                >
                  {p.seats}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Panel lateral · leyenda o foco */}
      {showSidePanel && (
        <div style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 22,
          padding: '22px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {focusStats ? <FocusPanel stats={focusStats} parties={parties}/> : <LegendPanel parties={parties}/>}
        </div>
      )}
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

function FocusPanel({ stats, parties }: { stats: { p: GrafoParty; links: { otherId: string; val: number; label: string }[] }; parties: GrafoParty[] }) {
  const partyOf = (id: string) => parties.find(p => p.id === id)
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span style={{ width: 12, height: 12, borderRadius: 999, background: stats.p.color, flexShrink: 0 }}/>
        <p style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6e6e73', margin: 0 }}>Foco</p>
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.024em', margin: '4px 0 4px' }}>
        {stats.p.name}
      </h2>
      <p style={{ fontSize: 12.5, color: '#515154', margin: '0 0 18px' }}>
        {stats.p.seats} escaños · {stats.links.length} relaciones
      </p>
      <p style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 10px' }}>
        Afinidad bilateral
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stats.links.map(l => {
          const other = partyOf(l.otherId)
          if (!other) return null
          const pct = (Math.abs(l.val) / 100) * 50
          const pos = l.val >= 0
          return (
            <div key={l.otherId}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', marginBottom: 3, gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: other.color, flexShrink: 0 }}/>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{other.name}</span>
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
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
            </div>
          )
        })}
      </div>
    </>
  )
}

function LegendPanel({ parties }: { parties: GrafoParty[] }) {
  // Computar bloques desde los partidos pasados
  const izq = parties.filter(p => p.block === 'izq').reduce((s, p) => s + p.seats, 0)
  const der = parties.filter(p => p.block === 'der').reduce((s, p) => s + p.seats, 0)
  const centro = parties.filter(p => p.block === 'centro').reduce((s, p) => s + p.seats, 0)
  const izqParties = parties.filter(p => p.block === 'izq').map(p => p.name)
  const derParties = parties.filter(p => p.block === 'der').map(p => p.name)
  const centroParties = parties.filter(p => p.block === 'centro').map(p => p.name)

  return (
    <>
      <p style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6e6e73', margin: '0 0 6px' }}>Leyenda</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.022em', margin: '0 0 18px' }}>
        Cómo leer el grafo
      </h2>

      <LegendRow>
        <svg width="48" height="14"><line x1="0" y1="7" x2="48" y2="7" stroke="#16A34A" strokeWidth="4" strokeLinecap="round"/></svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Alianza fuerte</div>
          <div style={{ fontSize: 11, color: '#6e6e73' }}>+60 a +100 · coalición o apoyo estable</div>
        </div>
      </LegendRow>

      <LegendRow>
        <svg width="48" height="14"><line x1="0" y1="7" x2="48" y2="7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Diálogo</div>
          <div style={{ fontSize: 11, color: '#6e6e73' }}>+1 a +59 · acuerdos puntuales</div>
        </div>
      </LegendRow>

      <LegendRow>
        <svg width="48" height="14"><line x1="0" y1="7" x2="48" y2="7" stroke="#DC2626" strokeWidth="3" strokeDasharray="5 5" strokeLinecap="round"/></svg>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>Conflicto</div>
          <div style={{ fontSize: 11, color: '#6e6e73' }}>−1 a −100 · veto o confrontación</div>
        </div>
      </LegendRow>

      <div style={{ height: 1, background: '#e8e8ed', margin: '18px 0' }}/>

      <p style={{ fontSize: 10.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 10px' }}>
        Bloques principales
      </p>
      {izq > 0 && <BlockRow color="#E1322D" name="Bloque progresista"  seats={izq}    parties={izqParties}/>}
      {der > 0 && <BlockRow color="#1F4E8C" name="Bloque conservador"  seats={der}    parties={derParties}/>}
      {centro > 0 && <BlockRow color="#1FA89B" name="Independientes"   seats={centro} parties={centroParties}/>}
    </>
  )
}

function LegendRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>{children}</div>
  )
}

function BlockRow({ color, name, seats, parties }: { color: string; name: string; seats: number; parties: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
      <span style={{ width: 3, alignSelf: 'stretch', background: color, borderRadius: 999, flexShrink: 0, minHeight: 32 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.005em' }}>{name}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.018em' }}>{seats}</span>
        </div>
        <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 1 }}>{parties.join(' · ')}</div>
      </div>
    </div>
  )
}
