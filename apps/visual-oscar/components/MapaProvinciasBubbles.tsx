'use client'
/* Mapa Provincias v2 — vista de burbujas geográficas.
   Cada provincia es un círculo posicionado en su centroide aproximado,
   con radio proporcional a los escaños y color del partido más votado.

   Reusa los datasets de winners de MapaProvincias.tsx para que ambos
   mapas muestren exactamente la misma información (estimación 2026,
   generales 2023, 2019, 2016, 2015 + históricos 1977-2011). */
import { useMemo, useState } from 'react'
import {
  PARTIES, PROVINCES, WINNERS, WINNERS_HIST, HISTORIC_OPTIONS, HISTORIC_KEYS,
  getBreakdown, partyName,
  type PartyId,
} from './MapaProvincias'

// Vista (igual que en MapaProvincias cuadrícula)
type View = 'winner' | 'tamano'
const VIEWS: { k: View; label: string }[] = [
  { k: 'winner', label: 'Ganador' },
  { k: 'tamano', label: 'Tamaño' },
]
// Color de la burbuja según vista. En modo "tamano" usamos escala
// monocroma (consistente con la cuadrícula), pero el radio sigue
// codificando el número de escaños.
function colorForBubble(view: View, winner: PartyId | undefined, seats: number): string {
  if (view === 'tamano') {
    if (seats >= 20) return '#1d1d1f'
    if (seats >= 10) return '#515154'
    if (seats >= 5)  return '#86868b'
    return '#C0C0C5'
  }
  return winner ? PARTIES[winner].color : '#C0C0C5'
}

// Centroides aproximados en viewBox 1000×720 (proyección simple Iberia
// + Baleares + Canarias inset). Tomados del diseño v2.
const CENTROIDS: Record<string, { x: number; y: number; pop: string }> = {
  // Galicia
  c:  { x: 120, y: 130, pop: '1,12M' },
  lu: { x: 175, y: 140, pop: '325k' },
  or: { x: 170, y: 185, pop: '302k' },
  po: { x: 118, y: 175, pop: '943k' },
  // Cornisa norte
  o:  { x: 235, y: 130, pop: '1,01M' },
  s:  { x: 305, y: 140, pop: '584k' },
  bi: { x: 380, y: 148, pop: '1,15M' },
  ss: { x: 430, y: 142, pop: '724k' },
  vi: { x: 418, y: 188, pop: '335k' },
  na: { x: 478, y: 182, pop: '665k' },
  // Castilla y León
  le: { x: 235, y: 200, pop: '450k' },
  p:  { x: 288, y: 218, pop: '159k' },
  bu: { x: 340, y: 215, pop: '360k' },
  lo: { x: 400, y: 225, pop: '319k' },
  za: { x: 248, y: 245, pop: '170k' },
  va: { x: 300, y: 255, pop: '519k' },
  sg: { x: 340, y: 280, pop: '153k' },
  so: { x: 388, y: 265, pop: '89k' },
  sa: { x: 238, y: 288, pop: '330k' },
  av: { x: 295, y: 300, pop: '158k' },
  // Aragón
  hu: { x: 478, y: 225, pop: '223k' },
  z:  { x: 475, y: 275, pop: '977k' },
  te: { x: 480, y: 325, pop: '135k' },
  // Cataluña
  l:  { x: 560, y: 240, pop: '439k' },
  ge: { x: 660, y: 235, pop: '781k' },
  b:  { x: 625, y: 290, pop: '5,72M' },
  t:  { x: 580, y: 325, pop: '819k' },
  // Madrid + interior
  m:  { x: 355, y: 340, pop: '6,87M' },
  gu: { x: 410, y: 325, pop: '265k' },
  cu: { x: 418, y: 380, pop: '201k' },
  to: { x: 330, y: 395, pop: '716k' },
  cr: { x: 340, y: 445, pop: '492k' },
  ab: { x: 412, y: 438, pop: '387k' },
  // Levante
  cs: { x: 530, y: 360, pop: '586k' },
  v:  { x: 528, y: 410, pop: '2,59M' },
  a:  { x: 520, y: 470, pop: '1,88M' },
  mu: { x: 478, y: 498, pop: '1,52M' },
  // Extremadura
  cc: { x: 240, y: 370, pop: '388k' },
  ba: { x: 240, y: 430, pop: '668k' },
  // Andalucía
  h:  { x: 185, y: 510, pop: '525k' },
  se: { x: 240, y: 510, pop: '1,94M' },
  co: { x: 300, y: 495, pop: '776k' },
  j:  { x: 360, y: 490, pop: '623k' },
  ca: { x: 230, y: 565, pop: '1,24M' },
  ma: { x: 295, y: 555, pop: '1,73M' },
  gr: { x: 370, y: 545, pop: '918k' },
  al: { x: 425, y: 540, pop: '731k' },
  // Baleares
  pm: { x: 730, y: 395, pop: '1,21M' },
  // Canarias (inset)
  gc: { x: 140, y: 660, pop: '1,15M' },
  tf: { x: 80,  y: 660, pop: '1,03M' },
  // Ceuta y Melilla
  ce: { x: 235, y: 610, pop: '83k' },
  ml: { x: 295, y: 610, pop: '86k' },
}

// Etiqueta legible del dataset
function labelForDataset(d: string): string {
  if (d === 'estimacion') return 'Estimación 2026'
  const hist = HISTORIC_OPTIONS.find((o) => o.k === d)
  if (hist) return hist.label
  if (d === 'g2023') return 'Generales 2023'
  if (d === 'g2019') return 'Generales 2019'
  if (d === 'g2016') return 'Generales 2016'
  if (d === 'g2015') return 'Generales 2015'
  return d
}

// % aproximado del partido ganador. Son números curados a partir del
// dataset 2026 del archivo de diseño y se aplican como fallback para
// los datasets históricos cuando no tenemos pct específico.
const WINNER_PCT_2026: Record<string, string> = {
  c: '33%', lu: '38%', or: '36%', po: '30%', o: '31%', s: '35%', bi: '28%',
  ss: '27%', vi: '26%', na: '23%', le: '32%', p: '39%', bu: '38%', lo: '40%',
  za: '36%', va: '33%', sg: '41%', so: '39%', sa: '37%', av: '38%',
  hu: '30%', z: '31%', te: '26%', l: '24%', ge: '26%', b: '27%', t: '26%',
  m: '36%', gu: '34%', cu: '33%', to: '31%', cr: '30%', ab: '28%',
  cs: '32%', v: '30%', a: '31%', mu: '35%', cc: '33%', ba: '35%',
  h: '32%', se: '33%', co: '31%', j: '33%', ca: '31%', ma: '30%',
  gr: '29%', al: '33%', pm: '34%', gc: '29%', tf: '28%', ce: '41%', ml: '38%',
}

export default function MapaProvinciasBubbles({
  dataset: datasetProp,
  onDatasetChange,
  compact = false,
}: {
  dataset?: string
  onDatasetChange?: (d: string) => void
  compact?: boolean
}) {
  const [internalDataset, setInternalDataset] = useState<string>('estimacion')
  const dataset = datasetProp ?? internalDataset
  const setDataset = (d: string) => {
    if (onDatasetChange) onDatasetChange(d)
    else setInternalDataset(d)
  }

  const [hover, setHover] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [partyFilter, setPartyFilter] = useState<PartyId | null>(null)
  const [view, setView] = useState<View>('winner')
  const focused = pinned ?? hover

  const winners = WINNERS[dataset] || WINNERS_HIST[dataset] || WINNERS.estimacion
  const totalSeats = PROVINCES.reduce((s, p) => s + p.seats, 0)

  // Conteo de provincias por partido ganador
  const winnersByParty = useMemo(() => {
    const m: Partial<Record<PartyId, number>> = {}
    PROVINCES.forEach((p) => {
      const w = winners[p.id]
      if (w) m[w] = (m[w] || 0) + 1
    })
    return Object.entries(m).sort((a, b) => (b[1] as number) - (a[1] as number)) as Array<[PartyId, number]>
  }, [winners])

  const focusedProv = focused ? PROVINCES.find((p) => p.id === focused) : null
  const focusedWinner = focusedProv ? winners[focusedProv.id] : undefined
  const focusedCentroid = focusedProv ? CENTROIDS[focusedProv.id] : undefined

  // Radio proporcional sqrt (idéntico al diseño v2)
  const radius = (seats: number) => 7 + Math.sqrt(seats) * 4.4

  return (
 <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '2.2fr 1fr', gap: 14 }}>
      {/* Mapa SVG */}
 <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, padding: '14px 16px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Header con selectores idénticos a MapaProvincias cuadrícula */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
 <div>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.013em', margin: '0 0 2px' }}>
              Mapa de burbujas · {labelForDataset(dataset)}
 </h3>
 <p style={{ fontSize: 10.5, color: '#6e6e73', margin: 0 }}>
              52 circunscripciones · {view === 'winner' ? 'color = partido más votado' : 'color = tamaño en escaños'}
 </p>
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            {/* Fila 1: Est. 2026 / Generales 2023 + dropdown históricas */}
 <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
 <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
                {([{ k: 'estimacion', label: 'Est. 2026' }, { k: 'g2023', label: 'Generales 2023' }] as const).map(o => {
                  const active = dataset === o.k
                  return (
 <button key={o.k} onClick={() => { setDataset(o.k); setPinned(null); setHover(null) }} style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#1d1d1f' : '#6e6e73',
                      border: 'none', borderRadius: 999, padding: '5px 11px',
                      fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
                      fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 160ms',
                    }}>{o.label}</button>
                  )
                })}
 </div>
 <select
                value={HISTORIC_KEYS.includes(dataset) ? dataset : ''}
                onChange={e => { if (e.target.value) { setDataset(e.target.value); setPinned(null); setHover(null) } }}
                style={{
                  fontFamily: 'inherit', fontSize: 11.5, fontWeight: HISTORIC_KEYS.includes(dataset) ? 600 : 500,
                  padding: '5px 26px 5px 11px', borderRadius: 999,
                  border: '1px solid ' + (HISTORIC_KEYS.includes(dataset) ? '#1d1d1f' : '#ECECEF'),
                  background: '#fff', color: HISTORIC_KEYS.includes(dataset) ? '#1d1d1f' : '#6e6e73',
                  cursor: 'pointer', appearance: 'none' as const,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
                }}>
 <option value="">Históricas…</option>
                {HISTORIC_OPTIONS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
 </select>
 </div>
            {/* Fila 2: Ganador / Tamaño */}
 <div style={{ display: 'inline-flex', background: '#F5F5F7', borderRadius: 999, padding: 3 }}>
              {VIEWS.map(o => {
                const active = view === o.k
                return (
 <button key={o.k} onClick={() => setView(o.k)} style={{
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#1d1d1f' : '#6e6e73',
                    border: 'none', borderRadius: 999, padding: '5px 11px',
                    fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
                    fontFamily: 'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 160ms',
                  }}>{o.label}</button>
                )
              })}
 </div>
 </div>
 </div>

 <svg viewBox="0 0 1000 720" style={{ width: '100%', display: 'block' }}>
 <defs>
 <radialGradient id="mpb-seaGrad" cx="50%" cy="40%" r="65%">
 <stop offset="0%" stopColor="#f5f5f7" stopOpacity="0.6" />
 <stop offset="100%" stopColor="#f5f5f7" stopOpacity="0" />
 </radialGradient>
 </defs>

          {/* Cajas inset */}
 <rect x="30" y="615" width="180" height="90" rx="6" fill="none" stroke="#d2d2d7" strokeDasharray="2 3" />
 <text x="40" y="630" fontSize="9.5" fill="#86868b" letterSpacing="0.1em" fontWeight="500">CANARIAS</text>
 <rect x="215" y="588" width="105" height="50" rx="6" fill="none" stroke="#d2d2d7" strokeDasharray="2 3" />

          {/* Marca geográfica suave */}
 <circle cx="500" cy="350" r="320" fill="url(#mpb-seaGrad)" />
 <text x="500" y="60" textAnchor="middle" fontSize="9.5" fill="#c7c7cc" letterSpacing="0.18em" fontWeight="500">N</text>
 <text x="940" y="365" fontSize="9.5" fill="#c7c7cc" letterSpacing="0.18em" fontWeight="500">E</text>
 <text x="500" y="700" textAnchor="middle" fontSize="9.5" fill="#c7c7cc" letterSpacing="0.18em" fontWeight="500">S</text>
 <text x="40" y="365" fontSize="9.5" fill="#c7c7cc" letterSpacing="0.18em" fontWeight="500">O</text>

          {/* Provincias */}
          {PROVINCES.map((p) => {
            const c = CENTROIDS[p.id]
            if (!c) return null
            const r = radius(p.seats)
            const isFocus = focused === p.id
            const winner = winners[p.id]
            // En modo "tamano" desactivamos el filtro por partido (no aplica)
            const dim = (focused !== null && !isFocus) || (view === 'winner' && partyFilter && winner !== partyFilter)
            const color = colorForBubble(view, winner, p.seats)
            return (
 <g key={p.id}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setPinned(pinned === p.id ? null : p.id)}
                style={{ cursor: 'pointer' }}
              >
                {isFocus && <circle cx={c.x} cy={c.y} r={r + 5} fill={color} opacity={0.18} />}
 <circle cx={c.x} cy={c.y} r={r}
                  fill={color}
                  fillOpacity={dim ? 0.22 : 0.92}
                  stroke={isFocus ? '#1d1d1f' : '#fff'}
                  strokeWidth={isFocus ? 2 : 1.5}
                  style={{ transition: 'fill-opacity 160ms' }}
                />
                {(r >= 14 || isFocus) && (
 <text x={c.x} y={c.y + 3.5} textAnchor="middle"
                    fontSize={Math.min(r * 0.55, 13)} fontWeight="600" fill="#fff"
                    fontFamily="var(--font-display)" letterSpacing="-0.01em"
                    style={{ pointerEvents: 'none', opacity: dim ? 0.6 : 1 }}>
                    {p.seats}
 </text>
                )}
                {(isFocus || r >= 18) && (
 <text x={c.x} y={c.y + r + 11} textAnchor="middle"
                    fontSize="9.5" fontWeight="500" fill="#6e6e73"
                    style={{ pointerEvents: 'none', opacity: dim ? 0.4 : 1 }}>
                    {p.name}
 </text>
                )}
 </g>
            )
          })}
 </svg>

        {/* Leyenda inferior — cambia según la vista activa */}
        {view === 'winner' ? (
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingTop: 10, borderTop: '1px solid #f5f5f7' }}>
            {winnersByParty.map(([id, count]) => {
              const active = partyFilter === id
              const meta = PARTIES[id]
              return (
 <button key={id}
                  onClick={() => setPartyFilter(active ? null : id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    border: active ? `1.5px solid ${meta.color}` : '1px solid #ECECEF',
                    background: '#fff',
                    fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
                    color: '#1d1d1f', whiteSpace: 'nowrap',
                  }}>
 <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color }}></span>
                  {meta.name}
 <span style={{ color: '#9CA3AF', fontWeight: 500 }}>{count}</span>
 </button>
              )
            })}
            {partyFilter && (
 <button onClick={() => setPartyFilter(null)} style={{
                marginLeft: 'auto', border: 'none', background: 'transparent',
                color: '#6e6e73', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
              }}>Quitar filtro ×</button>
            )}
 </div>
        ) : (
          // Vista Tamaño: leyenda de la escala monocroma por escaños
 <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, paddingTop: 10, borderTop: '1px solid #f5f5f7', fontSize: 11, color: '#6e6e73' }}>
 <span style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Escaños</span>
            {[
              { c: '#C0C0C5', l: '< 5' },
              { c: '#86868b', l: '5–9' },
              { c: '#515154', l: '10–19' },
              { c: '#1d1d1f', l: '≥ 20' },
            ].map((s) => (
 <span key={s.l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
 <span style={{ width: 10, height: 10, borderRadius: 999, background: s.c }}></span>
 <span>{s.l}</span>
 </span>
            ))}
 </div>
        )}
 </div>

      {/* Panel de detalle — integrado del MapaProvincias cuadrícula
          (mismo desglose por partido + barras + meta de población) */}
 <aside>
 <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {focusedProv ? (() => {
            const w = focusedWinner
            const wParty = w ? PARTIES[w] : null
            const breakdown = getBreakdown(dataset, focusedProv, w)
            const breakdownEntries = Object.keys(breakdown).length
              ? (Object.entries(breakdown) as Array<[PartyId, number]>).sort((a, b) => b[1] - a[1])
              : null
            return (
 <>
                {/* Header: provincia + escaños grande */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: breakdownEntries ? 10 : 0 }}>
 <div>
 <p style={{ fontSize: 9.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Provincia</p>
 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.018em', margin: '0 0 4px', color: '#1d1d1f' }}>{focusedProv.name}</h3>
                    {focusedCentroid && (
 <p style={{ fontSize: 10.5, color: '#86868b', margin: 0 }}>Población {focusedCentroid.pop}</p>
                    )}
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.024em', color: '#1d1d1f', lineHeight: 1 }}>{focusedProv.seats}</div>
 <div style={{ fontSize: 9.5, color: '#86868b', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginTop: 4 }}>escaños</div>
 </div>
 </div>

                {/* Líder con chip y % aproximado */}
                {wParty && (
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: `${wParty.color}10`, border: `1px solid ${wParty.color}30`, borderRadius: 10, marginBottom: 12 }}>
 <span style={{ width: 10, height: 10, borderRadius: 999, background: wParty.color, flexShrink: 0 }}/>
 <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Líder</span>
 <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: wParty.color }}>{partyName(dataset, w!)}</span>
                    {dataset === 'estimacion' && WINNER_PCT_2026[focusedProv.id] && (
 <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 700, color: wParty.color }}>{WINNER_PCT_2026[focusedProv.id]}</span>
                    )}
 </div>
                )}

                {/* Desglose por partido (mismo dataset que la cuadrícula) */}
                {breakdownEntries ? (
 <div>
 <p style={{ fontSize: 9.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px' }}>Desglose por partido</p>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {breakdownEntries.map(([pid, n]) => {
                        const meta = PARTIES[pid]
                        const pct = (n / focusedProv.seats) * 100
                        return (
 <div key={pid}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, fontSize: 11.5 }}>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
 <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color, flexShrink: 0 }}/>
 <span style={{ fontWeight: 600, color: '#3a3a3d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partyName(dataset, pid)}</span>
 </span>
 <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{n}</span>
 </div>
 <div style={{ height: 4, background: '#f5f5f7', borderRadius: 2, overflow: 'hidden' }}>
 <div style={{ width: `${pct}%`, height: 4, background: meta.color, borderRadius: 2 }}/>
 </div>
 </div>
                        )
                      })}
 </div>
 </div>
                ) : (
 <p style={{ fontSize: 11.5, color: '#9CA3AF' }}>Sin desglose disponible para este dataset.</p>
                )}

                {/* Pie con aporte al total */}
 <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5f5f7', fontSize: 11.5, color: '#6e6e73' }}>
                  Representa <strong style={{ color: '#1d1d1f' }}>{((focusedProv.seats / totalSeats) * 100).toFixed(1)}%</strong> de los 350 escaños.
 </div>
 </>
            )
          })() : (
 <>
 <p style={{ fontSize: 9.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 6px' }}>Resumen</p>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
                52 provincias · 350 escaños
 </h2>
 <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.5, margin: '0 0 14px' }}>
                Cada círculo representa una provincia. Su tamaño es proporcional al número de escaños que reparte. El color indica el partido más votado en {labelForDataset(dataset).toLowerCase()}.
 </p>
 <div style={{ paddingTop: 12, borderTop: '1px solid #f5f5f7' }}>
 <p style={{ fontSize: 9.5, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px' }}>Provincias más grandes</p>
                {PROVINCES.slice().sort((a, b) => b.seats - a.seats).slice(0, 5).map((p) => {
                  const w = winners[p.id]
                  return (
 <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, fontSize: 11.5 }}>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
 <span style={{ width: 7, height: 7, borderRadius: 999, background: w ? PARTIES[w].color : '#C0C0C5' }}></span>
 <span>{p.name}</span>
 </span>
 <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{p.seats}</span>
 </div>
                  )
                })}
 </div>
 </>
          )}
 </div>
 </aside>
 </div>
  )
}
