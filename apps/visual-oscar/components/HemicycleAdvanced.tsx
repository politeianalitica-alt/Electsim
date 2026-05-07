'use client'
import { useMemo, useState } from 'react'

export type HParty = { id: string; name: string; color: string; seats: number }

const ORDER = ['sumar','psoe','erc','bildu','bng','junts','ciu','pnv','cc','upn','otros','ucd','pp','vox']

function generateSeats(total = 350, rows = 10) {
  const rowSeats: number[] = []
  const totalLen = Array.from({ length: rows }).reduce<number>((s, _, i) => s + (i + rows + 1), 0)
  for (let r = 0; r < rows; r++) rowSeats.push(Math.round(total * (r + rows + 1) / totalLen))
  rowSeats[rows - 1] += total - rowSeats.reduce((a, b) => a + b, 0)

  const innerR = 130
  const rowGap = 18
  const seats: { angle: number; radius: number }[] = []
  for (let r = 0; r < rows; r++) {
    const radius = innerR + r * rowGap
    const n = rowSeats[r]
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      seats.push({ angle: Math.PI - t * Math.PI, radius })
    }
  }
  seats.sort((a, b) => b.angle - a.angle)
  return seats
}

export default function HemicycleAdvanced({ parties, total = 350, majority = 176, belowLegend }: { parties: HParty[]; total?: number; majority?: number; belowLegend?: React.ReactNode }) {
  const [mode, setMode] = useState<'individual' | 'coalition'>('individual')
  const [selected, setSelected] = useState<string | null>(null)
  const [coalition, setCoalition] = useState<Set<string>>(new Set())
  const [hover, setHover] = useState<string | null>(null)

  // Hemicycle layout uses ideological order
  const hemicycleOrder = useMemo(
    () => ORDER.map(id => parties.find(p => p.id === id)).filter((p): p is HParty => !!p && p.seats > 0),
    [parties]
  )
  // Legend order: most → least seats
  const legendOrder = useMemo(
    () => parties.filter(p => p.seats > 0).slice().sort((a, b) => b.seats - a.seats),
    [parties]
  )

  const seats = useMemo(() => generateSeats(total, 10), [total])
  const seatAssign = useMemo(() => {
    const assigned: string[] = []
    let idx = 0
    for (const p of hemicycleOrder) for (let i = 0; i < p.seats; i++) assigned[idx++] = p.id
    return assigned
  }, [hemicycleOrder])

  const partyOf = (id: string) => parties.find(p => p.id === id)

  // Visual focus rules
  const isHighlighted = (id: string) => {
    if (mode === 'coalition') return coalition.has(id) || hover === id
    return (selected ?? hover) === id
  }
  const isDimmed = (id: string) => {
    if (mode === 'coalition') {
      if (coalition.size === 0 && !hover) return false
      return !coalition.has(id) && hover !== id
    }
    const f = selected ?? hover
    return f !== null && f !== id
  }

  // Coalition totals
  const coalitionSeats = useMemo(
    () => Array.from(coalition).reduce((s, id) => s + (partyOf(id)?.seats ?? 0), 0),
    [coalition, parties]
  )
  const coalitionParties = legendOrder.filter(p => coalition.has(p.id))

  // Center label
  const focusedSingle = mode === 'individual' ? (selected ?? hover) : null
  const focusedSingleParty = focusedSingle ? partyOf(focusedSingle) : null

  function toggleParty(id: string) {
    if (mode === 'coalition') {
      const next = new Set(coalition)
      if (next.has(id)) next.delete(id); else next.add(id)
      setCoalition(next)
    } else {
      setSelected(selected === id ? null : id)
    }
  }

  function switchMode(next: 'individual' | 'coalition') {
    setMode(next)
    setSelected(null)
    setCoalition(new Set())
    setHover(null)
  }

  const W = 720, H = 360
  const cx = W / 2, cy = H - 30

  const viable = coalitionSeats >= majority
  const pctMajority = Math.min(100, (coalitionSeats / majority) * 100)

  return (
    <div>
      {/* Mode switch */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
          {([
            { k: 'individual', label: 'Individual' },
            { k: 'coalition',  label: 'Calcular coalición' },
          ] as const).map(o => {
            const active = mode === o.k
            return (
              <button key={o.k} onClick={() => switchMode(o.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border: 'none', borderRadius: 999, padding: '5px 12px',
                fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 160ms',
              }}>{o.label}</button>
            )
          })}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <line x1={cx} y1={cy - 305} x2={cx} y2={cy - 110} stroke="#1d1d1f" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4"/>
        <text x={cx} y={cy - 312} textAnchor="middle" fontSize="11" fill="#6e6e73" fontWeight="600" letterSpacing="0.06em">MAYORÍA · {majority}</text>

        {seats.map((s, i) => {
          const x = cx + Math.cos(s.angle) * s.radius
          const y = cy - Math.sin(s.angle) * s.radius
          const partyId = seatAssign[i]
          if (!partyId) return null
          const p = partyOf(partyId)!
          const dim = isDimmed(partyId)
          const high = isHighlighted(partyId)
          return (
            <circle
              key={i}
              cx={x} cy={y} r="6.5"
              fill={p.color}
              opacity={dim ? 0.18 : 1}
              stroke={high ? '#1d1d1f' : 'transparent'}
              strokeWidth="1.2"
              style={{ cursor: 'pointer', transition: 'opacity 200ms' }}
              onMouseEnter={() => setHover(partyId)}
              onMouseLeave={() => setHover(null)}
              onClick={() => toggleParty(partyId)}
            />
          )
        })}

        {mode === 'coalition' && coalition.size > 0 ? (
          <g>
            <text x={cx} y={cy - 70} textAnchor="middle" fontFamily="var(--font-display)" fontSize="12" fontWeight="600" fill={viable ? '#16A34A' : '#F38A19'} letterSpacing="0.08em">
              {viable ? 'MAYORÍA ALCANZADA' : `FALTAN ${majority - coalitionSeats}`}
            </text>
            <text x={cx} y={cy - 30} textAnchor="middle" fontFamily="var(--font-display)" fontSize="56" fontWeight="600" letterSpacing="-0.03em" fill="#1d1d1f">{coalitionSeats}</text>
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10.5" fill="#6e6e73" letterSpacing="0.08em">ESCAÑOS · {coalition.size} {coalition.size === 1 ? 'partido' : 'partidos'}</text>
          </g>
        ) : focusedSingleParty ? (
          <g>
            <text x={cx} y={cy - 70} textAnchor="middle" fontFamily="var(--font-display)" fontSize="14" fontWeight="600" fill={focusedSingleParty.color} letterSpacing="0.04em">{focusedSingleParty.name}</text>
            <text x={cx} y={cy - 30} textAnchor="middle" fontFamily="var(--font-display)" fontSize="56" fontWeight="600" letterSpacing="-0.03em" fill="#1d1d1f">{focusedSingleParty.seats}</text>
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10.5" fill="#6e6e73" letterSpacing="0.08em">ESCAÑOS · {(focusedSingleParty.seats / total * 100).toFixed(1)}%</text>
          </g>
        ) : (
          <g>
            <text x={cx} y={cy - 50} textAnchor="middle" fontFamily="var(--font-display)" fontSize="60" fontWeight="600" letterSpacing="-0.03em" fill="#1d1d1f">{total}</text>
            <text x={cx} y={cy - 22} textAnchor="middle" fontSize="11" fill="#6e6e73" letterSpacing="0.1em" fontWeight="600">DIPUTADOS · TOTAL</text>
          </g>
        )}
      </svg>

      {/* Coalition summary */}
      {mode === 'coalition' && (
        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: viable ? 'rgba(22,163,74,0.06)' : '#F5F5F7', border: `1px solid ${viable ? 'rgba(22,163,74,0.22)' : '#e8e8ed'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minHeight: 22 }}>
              {coalitionParties.length === 0 ? (
                <span style={{ fontSize: 12, color: '#6e6e73' }}>Selecciona partidos para sumar escaños…</span>
              ) : coalitionParties.map(p => (
                <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: '#fff', border: `1px solid ${p.color}55`, color: '#1d1d1f' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: p.color }}/>
                  {p.name} · {p.seats}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: viable ? '#16A34A' : '#1d1d1f', lineHeight: 1 }}>
                {coalitionSeats}<span style={{ fontSize: 13, color: '#6e6e73', fontWeight: 600 }}>/{majority}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.06em', background: viable ? '#16A34A' : '#F38A19', color: '#fff' }}>
                {viable ? 'VIABLE' : 'INSUF.'}
              </span>
              <button onClick={() => setCoalition(new Set())} style={{ fontSize: 11, color: '#6e6e73', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Limpiar</button>
            </div>
          </div>
          <div style={{ position: 'relative', height: 6, background: '#fff', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pctMajority}%`, height: '100%', background: viable ? '#16A34A' : '#1d1d1f', transition: 'width 220ms' }}/>
          </div>
        </div>
      )}

      {/* Legend — sorted by seats DESC */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginTop: 14 }}>
        {legendOrder.map(p => {
          const active = isHighlighted(p.id)
          const inCoalition = mode === 'coalition' && coalition.has(p.id)
          const dim = isDimmed(p.id)
          return (
            <button
              key={p.id}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => toggleParty(p.id)}
              style={{
                background: inCoalition ? `${p.color}10` : '#fff',
                border: active ? `1.5px solid ${p.color}` : '1px solid #e8e8ed',
                borderRadius: 10,
                padding: '8px 10px',
                cursor: 'pointer',
                textAlign: 'left',
                opacity: dim ? 0.45 : 1,
                transition: 'all 180ms',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 8,
                minWidth: 0,
                position: 'relative',
              }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: p.color, flexShrink: 0 }}/>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#3a3a3d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.012em', lineHeight: 1, color: '#1d1d1f', marginLeft: 'auto' }}>{p.seats}</span>
              </span>
              {inCoalition && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 999, background: p.color }}/>
              )}
            </button>
          )
        })}
      </div>

      {/* Slot opcional justo debajo de la leyenda (p.ej. tabla con datos del hemiciclo) */}
      {belowLegend}
    </div>
  )
}
