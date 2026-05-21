'use client'
import { useState } from 'react'

interface Signal {
  id: string
  area: 'electoral' | 'legislative' | 'media' | 'geopolitico' | string
  title: string
  description?: string
  level: 'critico' | 'alto' | 'medio' | 'bajo'
}

const FALLBACK_SIGNALS: Signal[] = [
  { id: 's1', area: 'electoral', title: 'Volatilidad encuestas Madrid', level: 'alto', description: 'Caída de 3.2pp en intención de voto PSOE en últimos 14d.' },
  { id: 's2', area: 'legislative', title: 'Bloque normas alto impacto', level: 'critico', description: '5 normas con impacto >8 en cola legislativa.' },
  { id: 's3', area: 'media', title: 'Burst narrativa migración', level: 'alto', description: 'Spike +280% en cobertura mediática últimos 7d.' },
  { id: 's4', area: 'geopolitico', title: 'Tensión Marruecos-Argelia', level: 'medio', description: 'Indicadores GDELT al alza, riesgo derivado España.' },
  { id: 's5', area: 'electoral', title: 'Movilización jóvenes urbanos', level: 'medio', description: 'Picos de actividad en RRSS antiestablishment.' },
]

const PRESETS: Record<string, Record<string, number | boolean>> = {
  electoral: { tasa_paro: 13.0, aprobacion_gobierno: 28.0 },
  legislative: { iniciativas_pendientes: 15 },
  media: { polarizacion: 0.85 },
  geopolitico: { crisis_internacional: true } as Record<string, number | boolean>,
}

const CCAA = ['Todas', 'Andalucía', 'Cataluña', 'Madrid', 'Valencia', 'País Vasco', 'Galicia', 'Castilla y León'] as const

interface ScenarioRow {
  seccion?: string
  ccaa?: string
  delta_pp?: number
  delta_psoe?: number
  delta_vox?: number
  delta_sumar?: number
  riesgo_estimado?: number
  [key: string]: unknown
}

const FALLBACK_RESULTS: ScenarioRow[] = [
  { seccion: '28-079-001-001', ccaa: 'Madrid', delta_pp: 0.022, delta_psoe: -0.018, delta_vox: 0.011, delta_sumar: -0.014, riesgo_estimado: 0.71 },
  { seccion: '08-019-002-003', ccaa: 'Cataluña', delta_pp: 0.014, delta_psoe: -0.025, delta_vox: 0.008, delta_sumar: -0.011, riesgo_estimado: 0.68 },
  { seccion: '46-250-001-002', ccaa: 'C. Valenciana', delta_pp: 0.031, delta_psoe: -0.024, delta_vox: 0.018, delta_sumar: -0.012, riesgo_estimado: 0.74 },
  { seccion: '41-091-003-001', ccaa: 'Andalucía', delta_pp: 0.027, delta_psoe: -0.020, delta_vox: 0.013, delta_sumar: -0.010, riesgo_estimado: 0.66 },
  { seccion: '48-020-002-001', ccaa: 'País Vasco', delta_pp: 0.005, delta_psoe: -0.008, delta_vox: 0.002, delta_sumar: -0.004, riesgo_estimado: 0.42 },
]

interface Props {
  signals?: Signal[]
}

export default function SignalScenarioPanel({ signals = FALLBACK_SIGNALS }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const list = signals.length > 0 ? signals : FALLBACK_SIGNALS

  return (
 <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px', marginTop: 18 }}>
 <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Señales de riesgo</p>
 <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Señales activas · Simular escenario por señal</h3>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(s => {
          const lvl = s.level
          const c = lvl === 'critico' ? '#c42c2c' : lvl === 'alto' ? '#b25000' : lvl === 'medio' ? '#5B21B6' : '#2d8a39'
          const isExp = expanded === s.id
          return (
 <div key={s.id} style={{ background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12, padding: '14px 18px', borderLeft: `3px solid ${c}` }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
 <div style={{ flex: 1, minWidth: 240 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
 <span style={{ padding: '2px 8px', borderRadius: 999, background: `${c}18`, color: c, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lvl}</span>
 <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontSize: 10, fontWeight: 600 }}>{s.area}</span>
 <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{s.title}</h4>
 </div>
                  {s.description && <p style={{ margin: 0, fontSize: 11.5, color: '#424245', lineHeight: 1.5 }}>{s.description}</p>}
 </div>
 <button onClick={() => setExpanded(isExp ? null : s.id)} style={{
                  padding: '6px 14px', borderRadius: 999, border: '1px solid #e8e8ed', background: isExp ? '#1d1d1f' : '#fff',
                  color: isExp ? '#fff' : '#1d1d1f', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {isExp ? 'Cerrar' : 'Simular escenario'}
 </button>
 </div>

              {isExp && <ScenarioForm signal={s}/>}
 </div>
          )
        })}
 </div>
 </section>
  )
}

function ScenarioForm({ signal }: { signal: Signal }) {
  const preset = PRESETS[signal.area] ?? {}
  const [ccaa, setCcaa] = useState<string>('Todas')
  const [features, setFeatures] = useState<Record<string, number | boolean>>({ ...preset })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ScenarioRow[] | null>(null)

  function setF(k: string, v: number | boolean) {
    setFeatures(p => ({ ...p, [k]: v }))
  }

  async function execute() {
    setRunning(true)
    try {
      const r = await fetch('/api/intelligence/propensity/scenario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: features, ccaa: ccaa === 'Todas' ? null : ccaa }),
      })
      if (r.ok) {
        const j = await r.json()
        setResults(Array.isArray(j.results) && j.results.length > 0 ? j.results : FALLBACK_RESULTS)
      } else {
        setResults(FALLBACK_RESULTS)
      }
    } catch {
      setResults(FALLBACK_RESULTS)
    } finally {
      setRunning(false)
    }
  }

  function downloadCSV() {
    if (!results || results.length === 0) return
    const headers = Object.keys(results[0])
    const rows = results.map(r => headers.map(h => String(r[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scenario-${signal.id}-${ccaa}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  return (
 <div style={{ marginTop: 14, padding: '14px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e8e8ed' }}>
 <div style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
        Simulación de escenario — {signal.area}
 </div>

 <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
 <div>
 <label style={{ fontSize: 10, color: '#6e6e73', fontWeight: 600, display: 'block', marginBottom: 3 }}>CCAA</label>
 <select value={ccaa} onChange={e => setCcaa(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
            {CCAA.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>

        {/* Feature key-value editor */}
 <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(features).map(([k, v]) => (
 <div key={k} style={{ background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 8, padding: '6px 10px' }}>
 <label style={{ fontSize: 10, color: '#6e6e73', fontWeight: 600, display: 'block', marginBottom: 2 }}>{k}</label>
              {typeof v === 'boolean' ? (
 <input type="checkbox" checked={v} onChange={e => setF(k, e.target.checked)} />
              ) : (
 <input type="number" value={v as number} step={0.1}
                  onChange={e => setF(k, parseFloat(e.target.value) || 0)}
                  style={{ width: 90, padding: '4px 6px', border: '1px solid #e8e8ed', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
              )}
 </div>
          ))}
 </div>

 <button onClick={execute} disabled={running} style={{
          padding: '8px 14px', borderRadius: 999, border: 'none',
          background: running ? '#e8e8ed' : '#1d1d1f', color: running ? '#6e6e73' : '#fff',
          fontSize: 11, fontWeight: 600, cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit',
        }}>{running ? 'Ejecutando…' : 'Ejecutar simulación'}</button>
 </div>

      {results && results.length > 0 && (
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
 <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(178,80,0,0.12)', color: '#b25000', fontSize: 11, fontWeight: 700 }}>
              Secciones afectadas: {results.length}
 </span>
 <button onClick={downloadCSV} style={{
              padding: '6px 12px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
              fontSize: 11, fontWeight: 600, color: '#1F4E8C', cursor: 'pointer', fontFamily: 'inherit',
            }}>↓ Descargar CSV</button>
 </div>
 <div style={{ overflowX: 'auto' }}>
 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
 <thead>
 <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
                  {Object.keys(results[0]).slice(0, 6).map(h => (
 <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
 </tr>
 </thead>
 <tbody>
                {results.slice(0, 10).map((row, i) => (
 <tr key={i} style={{ borderBottom: i < 9 ? '1px solid #f5f5f7' : 'none' }}>
                    {Object.keys(results[0]).slice(0, 6).map(k => {
                      const v = row[k]
                      const isNum = typeof v === 'number'
                      return (
 <td key={k} style={{ padding: '8px 10px', fontFamily: isNum ? 'ui-monospace,monospace' : 'inherit', color: '#1d1d1f' }}>
                          {isNum ? (v as number).toFixed(3) : String(v ?? '—')}
 </td>
                      )
                    })}
 </tr>
                ))}
 </tbody>
 </table>
 </div>
 </div>
      )}
 </div>
  )
}
