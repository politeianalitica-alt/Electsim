'use client'
import { useMemo, useState } from 'react'

export type VParty = { id: string; name: string; color: string; seats: number }
type Vote = 'si' | 'no' | 'abs' | null

export default function VotacionSimulator({ parties }: { parties: VParty[] }) {
  const [votes, setVotes] = useState<Record<string, Vote>>({})
  const totalSeats = useMemo(() => parties.reduce((s, p) => s + p.seats, 0), [parties])
  const MAJ = Math.floor(totalSeats / 2) + 1 // 176 en Congreso

  const totals = useMemo(() => {
    let si = 0, no = 0, abs = 0, no_vot = 0
    for (const p of parties) {
      const v = votes[p.id]
      if (v === 'si') si += p.seats
      else if (v === 'no') no += p.seats
      else if (v === 'abs') abs += p.seats
      else no_vot += p.seats
    }
    return { si, no, abs, no_vot }
  }, [votes, parties])

  // Tipo de mayoría requerida (Congreso España)
  type MayKind = 'simple' | 'absoluta' | 'tres-quintos' | 'dos-tercios'
  const [mayoria, setMayoria] = useState<MayKind>('simple')

  const MAYORIAS: { k: MayKind; label: string; threshold: number; desc: string }[] = [
    { k:'simple',       label:'Mayoría simple',       threshold: 0,                          desc:'SÍ > NO entre votos emitidos · leyes ordinarias, investidura 2ª vuelta' },
    { k:'absoluta',     label:'Mayoría absoluta',     threshold: MAJ,                        desc:`SÍ ≥ ${MAJ} (mitad +1) · leyes orgánicas, investidura 1ª vuelta, moción de censura` },
    { k:'tres-quintos', label:'Mayoría 3/5',          threshold: Math.ceil(totalSeats*3/5),  desc:`SÍ ≥ ${Math.ceil(totalSeats*3/5)} · reformas constitucionales ordinarias, CGPJ` },
    { k:'dos-tercios',  label:'Mayoría 2/3',          threshold: Math.ceil(totalSeats*2/3),  desc:`SÍ ≥ ${Math.ceil(totalSeats*2/3)} · supuestos especialmente reforzados` },
  ]
  const sel = MAYORIAS.find(m => m.k === mayoria)!
  const apruebaSimple = totals.si > totals.no && totals.si > 0
  const aprueba = mayoria === 'simple' ? apruebaSimple : totals.si >= sel.threshold
  const aprobada = aprueba

  function setVote(pid: string, v: Vote) {
    setVotes(prev => ({ ...prev, [pid]: prev[pid] === v ? null : v }))
  }

  function preset(kind: 'derecha' | 'izquierda' | 'gobierno' | 'limpiar') {
    if (kind === 'limpiar') { setVotes({}); return }
    const next: Record<string, Vote> = {}
    const groups = {
      derecha:   { si: ['pp','vox','upn','cc'],                                no: ['psoe','sumar','erc','bildu','pnv','bng'],                              abs: ['junts'] },
      izquierda: { si: ['psoe','sumar','bildu','pnv','bng','erc'],             no: ['pp','vox','upn'],                                                      abs: ['junts','cc'] },
      gobierno:  { si: ['psoe','sumar','pnv','bildu','bng','erc'],             no: ['pp','vox','upn'],                                                      abs: ['junts','cc'] },
    } as const
    const g = groups[kind]
    for (const id of g.si)  next[id] = 'si'
    for (const id of g.no)  next[id] = 'no'
    for (const id of g.abs) next[id] = 'abs'
    setVotes(next)
  }

  const pctSi  = (totals.si / totalSeats) * 100
  const pctAbs = (totals.abs / totalSeats) * 100
  const pctNo  = (totals.no / totalSeats) * 100
  const thresholdPct = (sel.threshold / totalSeats) * 100

  return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header con presets */}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
 <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', alignSelf: 'center', marginRight: 4 }}>Plantillas:</span>
          {([
            { k: 'derecha',   l: 'Bloque derecha SÍ' },
            { k: 'gobierno',  l: 'Bloque gobierno SÍ' },
            { k: 'izquierda', l: 'Izquierda + nacionalistas SÍ' },
            { k: 'limpiar',   l: 'Limpiar' },
          ] as const).map(p => (
 <button key={p.k} onClick={() => preset(p.k)} style={{
              fontSize: 11.5, padding: '5px 10px', borderRadius: 999,
              border: '1px solid #ECECEF', background: '#fff', color: '#3a3a3d',
              fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
            }}>{p.l}</button>
          ))}
 </div>
 <select
          value={mayoria}
          onChange={e => setMayoria(e.target.value as MayKind)}
          style={{
            fontFamily:'inherit', fontSize:11.5, fontWeight:600,
            padding:'6px 28px 6px 12px', borderRadius:999,
            border:'1px solid #1F4E8C', background:'#fff', color:'#1F4E8C',
            cursor:'pointer', appearance:'none',
            backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%231F4E8C\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
            backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center',
          }}>
          {MAYORIAS.map(m => (
 <option key={m.k} value={m.k}>
              {m.label}{m.threshold ? ` · ${m.threshold} SÍ` : ' · SÍ > NO'}
 </option>
          ))}
 </select>
 </div>

      {/* Banner resultado */}
 <div style={{
        padding: '14px 18px', borderRadius: 14,
        background: aprobada ? 'linear-gradient(135deg,#16A34A 0%,#15803D 100%)' : 'linear-gradient(135deg,#DC2626 0%,#991B1B 100%)',
        color: '#fff', display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center',
        boxShadow: `0 6px 18px -8px ${aprobada ? '#16A34A' : '#DC2626'}80`,
        transition: 'all 220ms',
      }}>
 <div>
 <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 3 }}>Resultado · {sel.label}</div>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.018em', lineHeight: 1 }}>
            {aprobada ? 'LEY APROBADA' : 'LEY RECHAZADA'}
 </div>
 <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 4 }}>
            {mayoria === 'simple'
              ? (aprobada ? `SÍ ${totals.si} > NO ${totals.no}` : `SÍ ${totals.si} ≤ NO ${totals.no}`)
              : (aprobada
                  ? `SÍ ${totals.si} ≥ ${sel.threshold} (umbral ${sel.label.toLowerCase()})`
                  : `Faltan ${sel.threshold - totals.si} votos · SÍ ${totals.si} no llega a ${sel.threshold}`)}
 </div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, letterSpacing: '-0.024em', lineHeight: 1 }}>{totals.si}</div>
 <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: '0.06em', marginTop: 2 }}>
            SÍ / {mayoria === 'simple' ? `NO ${totals.no}` : `${sel.threshold} requeridos`}
 </div>
 </div>
 </div>

      {/* Barra agregada SÍ / ABS / NO con marcador 176 */}
 <div>
 <div style={{ position: 'relative', height: 22, background: '#F5F5F7', borderRadius: 6, overflow: 'visible', display: 'flex' }}>
 <div style={{ display: 'flex', height: '100%', borderRadius: 6, overflow: 'hidden', width: '100%' }}>
 <div title={`SÍ ${totals.si}`} style={{ width: `${pctSi}%`, background: '#16A34A', transition: 'width 320ms cubic-bezier(.2,.8,.2,1)' }}/>
 <div title={`Abstenciones ${totals.abs}`} style={{ width: `${pctAbs}%`, background: '#9CA3AF', transition: 'width 320ms cubic-bezier(.2,.8,.2,1)' }}/>
 <div title={`NO ${totals.no}`} style={{ width: `${pctNo}%`, background: '#DC2626', transition: 'width 320ms cubic-bezier(.2,.8,.2,1)' }}/>
 </div>
          {/* Marcador del umbral activo (oculto en mayoría simple) */}
          {mayoria !== 'simple' && (
 <>
 <div style={{ position: 'absolute', left: `${thresholdPct}%`, top: -3, bottom: -3, width: 2, background: '#1d1d1f', transform: 'translateX(-50%)' }}/>
 <div style={{ position: 'absolute', left: `${thresholdPct}%`, top: 26, transform: 'translateX(-50%)', fontSize: 10, color: '#1d1d1f', fontWeight: 600, whiteSpace: 'nowrap' }}>↑ {sel.threshold}</div>
 </>
          )}
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 11.5, color: '#3a3a3d' }}>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#16A34A' }}/><strong>SÍ {totals.si}</strong></span>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#9CA3AF' }}/>Abst. {totals.abs}</span>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#DC2626' }}/><strong>NO {totals.no}</strong></span>
 <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#6e6e73' }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#ECECEF' }}/>No vota {totals.no_vot}</span>
 </div>
 </div>

      {/* Lista de partidos con switch SÍ/ABS/NO */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 14px', marginTop: 6 }}>
        {parties.map(p => {
          const v = votes[p.id]
          return (
 <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '7px 10px', borderRadius: 10, background: '#FAFAFB', border: '1px solid #ECECEF' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
 <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }}/>
 <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
 <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 700, color: '#6e6e73', marginLeft: 'auto' }}>{p.seats}</span>
 </div>
 <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 8, padding: 2, border: '1px solid #ECECEF' }}>
                {([
                  { k: 'si',  l: 'SÍ',  bg: '#16A34A' },
                  { k: 'abs', l: 'Abs', bg: '#9CA3AF' },
                  { k: 'no',  l: 'NO',  bg: '#DC2626' },
                ] as const).map(b => {
                  const active = v === b.k
                  return (
 <button key={b.k} onClick={() => setVote(p.id, b.k)} style={{
                      background: active ? b.bg : 'transparent',
                      color: active ? '#fff' : '#3a3a3d',
                      border: 'none', borderRadius: 6, padding: '4px 9px',
                      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 140ms',
                    }}>{b.l}</button>
                  )
                })}
 </div>
 </div>
          )
        })}
 </div>
 </div>
  )
}
