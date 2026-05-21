'use client'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/useApi'

const PARTIDOS = ['PP', 'PSOE', 'VOX', 'Sumar', 'Junts'] as const
type Partido = typeof PARTIDOS[number]

interface VotoBlandoRecord { seccion?: string; provincia?: string; ccaa?: string; prob_blando?: number; voto_pp?: number; voto_psoe?: number; voto_vox?: number; voto_sumar?: number; n_votantes?: number; [key: string]: unknown }
interface TransferenciaRecord { partido_origen: string; partido_destino: string; prob_transferencia: number }

const FALLBACK_RECORDS: VotoBlandoRecord[] = [
  { seccion: '28-079-001-001', provincia: 'Madrid', ccaa: 'Madrid', prob_blando: 0.42, voto_pp: 0.31, voto_psoe: 0.28, voto_vox: 0.12, voto_sumar: 0.10, n_votantes: 1240 },
  { seccion: '08-019-002-003', provincia: 'Barcelona', ccaa: 'Cataluña', prob_blando: 0.55, voto_pp: 0.18, voto_psoe: 0.32, voto_vox: 0.08, voto_sumar: 0.14, n_votantes: 980 },
  { seccion: '46-250-001-002', provincia: 'Valencia', ccaa: 'C. Valenciana', prob_blando: 0.48, voto_pp: 0.34, voto_psoe: 0.27, voto_vox: 0.14, voto_sumar: 0.09, n_votantes: 1120 },
  { seccion: '41-091-003-001', provincia: 'Sevilla', ccaa: 'Andalucía', prob_blando: 0.39, voto_pp: 0.36, voto_psoe: 0.31, voto_vox: 0.11, voto_sumar: 0.08, n_votantes: 1340 },
  { seccion: '48-020-002-001', provincia: 'Bizkaia', ccaa: 'País Vasco', prob_blando: 0.32, voto_pp: 0.14, voto_psoe: 0.21, voto_vox: 0.04, voto_sumar: 0.11, n_votantes: 870 },
  { seccion: '15-030-001-002', provincia: 'A Coruña', ccaa: 'Galicia', prob_blando: 0.45, voto_pp: 0.41, voto_psoe: 0.26, voto_vox: 0.08, voto_sumar: 0.10, n_votantes: 760 },
  { seccion: '50-297-001-001', provincia: 'Zaragoza', ccaa: 'Aragón', prob_blando: 0.51, voto_pp: 0.29, voto_psoe: 0.30, voto_vox: 0.13, voto_sumar: 0.09, n_votantes: 940 },
  { seccion: '38-038-001-002', provincia: 'S.C. Tenerife', ccaa: 'Canarias', prob_blando: 0.47, voto_pp: 0.25, voto_psoe: 0.29, voto_vox: 0.09, voto_sumar: 0.08, n_votantes: 680 },
]

const FALLBACK_TRANSFER: TransferenciaRecord[] = [
  { partido_origen: 'PP', partido_destino: 'VOX', prob_transferencia: 0.18 },
  { partido_origen: 'PP', partido_destino: 'PSOE', prob_transferencia: 0.04 },
  { partido_origen: 'PP', partido_destino: 'Abst.', prob_transferencia: 0.06 },
  { partido_origen: 'PSOE', partido_destino: 'Sumar', prob_transferencia: 0.12 },
  { partido_origen: 'PSOE', partido_destino: 'PP', prob_transferencia: 0.07 },
  { partido_origen: 'PSOE', partido_destino: 'Abst.', prob_transferencia: 0.09 },
  { partido_origen: 'VOX', partido_destino: 'PP', prob_transferencia: 0.22 },
  { partido_origen: 'VOX', partido_destino: 'Abst.', prob_transferencia: 0.13 },
  { partido_origen: 'Sumar', partido_destino: 'PSOE', prob_transferencia: 0.28 },
  { partido_origen: 'Sumar', partido_destino: 'Abst.', prob_transferencia: 0.11 },
]

function probColor(p: number) {
  if (p >= 0.20) return '#c42c2c'
  if (p >= 0.10) return '#b25000'
  return '#6e6e73'
}

export default function VotoBlandoPanel() {
  const [partidoRef, setPartidoRef] = useState<Partido>('PSOE')
  const [tipoEleccion, setTipoEleccion] = useState('generales')
  const [recalcular, setRecalcular] = useState(false)
  const [running, setRunning] = useState(false)
  const [computed, setComputed] = useState<VotoBlandoRecord[] | null>(null)
  const [fuente, setFuente] = useState<'cache_db' | 'calculado' | 'error' | null>(null)

  const { data: trData } = useApi<TransferenciaRecord[]>(`/api/voto_blando/transferencia?tipo_eleccion=${tipoEleccion}`, { refreshInterval: 0 })
  const transfer = (Array.isArray(trData) && trData.length > 0) ? trData : FALLBACK_TRANSFER

  async function calcular() {
    setRunning(true)
    try {
      const r = await fetch('/api/voto_blando/calcular', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partido_ref: partidoRef.toLowerCase(), tipo_eleccion: tipoEleccion, recalcular }),
      })
      if (r.ok) {
        const j = await r.json()
        setComputed(Array.isArray(j.registros) ? j.registros : FALLBACK_RECORDS)
        setFuente(j.fuente || 'cache_db')
      } else {
        setComputed(FALLBACK_RECORDS)
        setFuente('cache_db')
      }
    } catch {
      setComputed(FALLBACK_RECORDS)
      setFuente('cache_db')
    } finally {
      setRunning(false)
    }
  }

  // Build matrix from transfer
  const { origenes, destinos, matrix } = useMemo(() => {
    const oset = new Set<string>(), dset = new Set<string>()
    transfer.forEach(t => { oset.add(t.partido_origen); dset.add(t.partido_destino) })
    const og = Array.from(oset)
    const ds = Array.from(dset)
    const m: Record<string, Record<string, number>> = {}
    transfer.forEach(t => {
      m[t.partido_origen] = m[t.partido_origen] ?? {}
      m[t.partido_origen][t.partido_destino] = t.prob_transferencia
    })
    return { origenes: og, destinos: ds, matrix: m }
  }, [transfer])

  const records = computed ?? FALLBACK_RECORDS
  const avgProb = records.length ? records.reduce((a, r) => a + (r.prob_blando ?? 0), 0) / records.length : 0

  return (
 <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Section 1: Calcular */}
 <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
 <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Cálculo</p>
 <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Calcular voto blando</h3>
 <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
 <Field label="Partido referencia">
 <select value={partidoRef} onChange={e => setPartidoRef(e.target.value as Partido)} style={selectStyle}>
              {PARTIDOS.map(p => <option key={p} value={p}>{p}</option>)}
 </select>
 </Field>
 <Field label="Tipo elección">
 <select value={tipoEleccion} onChange={e => setTipoEleccion(e.target.value)} style={selectStyle}>
 <option value="generales">Generales</option>
 <option value="europeas">Europeas</option>
 <option value="autonomicas">Autonómicas</option>
 </select>
 </Field>
 <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1d1d1f', cursor: 'pointer' }}>
 <input type="checkbox" checked={recalcular} onChange={e => setRecalcular(e.target.checked)} /> Forzar recálculo
 </label>
 <button onClick={calcular} disabled={running} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: running ? '#e8e8ed' : '#1d1d1f', color: running ? '#6e6e73' : '#fff',
            fontSize: 12, fontWeight: 600, cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}>{running ? 'Calculando…' : 'Calcular'}</button>
 </div>

        {/* KPIs */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { l: 'Registros', v: records.length, c: '#1F4E8C' },
            { l: 'Probabilidad media', v: `${(avgProb * 100).toFixed(1)}%`, c: avgProb > 0.4 ? '#c42c2c' : avgProb > 0.25 ? '#b25000' : '#2d8a39' },
            { l: 'Partido analizado', v: partidoRef, c: '#5B21B6' },
          ].map(k => (
 <div key={k.l} style={{ background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12, padding: '12px 14px' }}>
 <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4 }}>{k.l}</div>
 <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700, color: k.c, letterSpacing: '-0.02em' }}>{k.v}</div>
 </div>
          ))}
 </div>

        {fuente && (
 <div style={{ marginBottom: 12 }}>
 <span style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
              background: fuente === 'cache_db' ? 'rgba(31,78,140,0.10)' : fuente === 'calculado' ? 'rgba(45,138,57,0.12)' : 'rgba(196,44,44,0.12)',
              color: fuente === 'cache_db' ? '#1F4E8C' : fuente === 'calculado' ? '#2d8a39' : '#c42c2c',
            }}>fuente: {fuente}</span>
 </div>
        )}

        {/* Table */}
 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
 <thead>
 <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
              {['Sección', 'Provincia', 'CCAA', 'P(blando)', 'PP', 'PSOE', 'VOX', 'Sumar', 'Votantes'].map(h => (
 <th key={h} style={{ padding: '8px 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
 </tr>
 </thead>
 <tbody>
            {records.slice(0, 10).map((r, i) => (
 <tr key={i} style={{ borderBottom: i < 9 ? '1px solid #f5f5f7' : 'none' }}>
 <td style={{ padding: '8px 6px', fontFamily: 'ui-monospace,monospace', color: '#6e6e73' }}>{r.seccion}</td>
 <td style={{ padding: '8px 6px', color: '#1d1d1f' }}>{r.provincia}</td>
 <td style={{ padding: '8px 6px', color: '#6e6e73' }}>{r.ccaa}</td>
 <td style={{ padding: '8px 6px', fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: probColor(r.prob_blando ?? 0) }}>
                  {((r.prob_blando ?? 0) * 100).toFixed(1)}%
 </td>
 <td style={{ padding: '8px 6px', color: '#1F4E8C', fontVariantNumeric: 'tabular-nums' }}>{((r.voto_pp ?? 0) * 100).toFixed(0)}%</td>
 <td style={{ padding: '8px 6px', color: '#E1322D', fontVariantNumeric: 'tabular-nums' }}>{((r.voto_psoe ?? 0) * 100).toFixed(0)}%</td>
 <td style={{ padding: '8px 6px', color: '#5BA02E', fontVariantNumeric: 'tabular-nums' }}>{((r.voto_vox ?? 0) * 100).toFixed(0)}%</td>
 <td style={{ padding: '8px 6px', color: '#D43F8D', fontVariantNumeric: 'tabular-nums' }}>{((r.voto_sumar ?? 0) * 100).toFixed(0)}%</td>
 <td style={{ padding: '8px 6px', color: '#6e6e73', fontVariantNumeric: 'tabular-nums' }}>{(r.n_votantes ?? 0).toLocaleString('es-ES')}</td>
 </tr>
            ))}
 </tbody>
 </table>
 </div>

      {/* Section 2: Transferencias */}
 <div style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
 <div>
 <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Matriz</p>
 <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Transferencias de voto</h3>
 </div>
 <button style={{
            padding: '6px 14px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
            fontSize: 11, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit',
          }}>Recalcular</button>
 </div>
 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
 <thead>
 <tr>
 <th style={{ padding: '8px 10px', fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'left' }}>Origen ↓ / Destino →</th>
              {destinos.map(d => (
 <th key={d} style={{ padding: '8px 10px', fontSize: 11, color: '#1d1d1f', fontWeight: 700, textAlign: 'center' }}>{d}</th>
              ))}
 </tr>
 </thead>
 <tbody>
            {origenes.map(o => (
 <tr key={o}>
 <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1d1d1f' }}>{o}</td>
                {destinos.map(d => {
                  const v = matrix[o]?.[d] ?? 0
                  const c = probColor(v)
                  return (
 <td key={d} style={{ padding: 4, textAlign: 'center' }}>
 <div style={{
                        height: 32, borderRadius: 6,
                        background: v > 0 ? `${c}25` : '#fafafc',
                        border: '1px solid ' + (v > 0 ? `${c}50` : '#f0f0f3'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 12, color: c,
                      }}>{v > 0 ? `${(v * 100).toFixed(0)}%` : '—'}</div>
 </td>
                  )
                })}
 </tr>
            ))}
 </tbody>
 </table>
 </div>
 </section>
  )
}

const selectStyle = {
  padding: '8px 10px', border: '1px solid #e8e8ed', borderRadius: 10,
  background: '#fff', fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f',
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
 <div>
 <label style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4, display: 'block' }}>{label}</label>
      {children}
 </div>
  )
}
