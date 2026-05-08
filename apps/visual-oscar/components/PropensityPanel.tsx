'use client'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/useApi'

type SwingDistrict = {
  province: string
  ccaa?: string
  current_winner?: string
  margin_pp?: number
  swing_target?: string
  flip_probability?: number
  voters?: number
  segments?: { label: string; pct: number }[]
}
type Opportunity = {
  segment: string
  size_voters?: number
  party_target?: string
  current_lean?: string
  persuadability?: number
  message?: string
  channels?: string[]
}

const FALLBACK_DISTRICTS: SwingDistrict[] = [
  { province: 'Asturias', ccaa: 'Asturias', current_winner: 'PSOE', margin_pp: 2.1, swing_target: 'PP', flip_probability: 0.42, voters: 410_000,
    segments: [{ label: 'Trabajadores industriales', pct: 28 }, { label: 'Pensionistas', pct: 22 }, { label: 'Jóvenes urbanos', pct: 14 }] },
  { province: 'Valencia', ccaa: 'C. Valenciana', current_winner: 'PP', margin_pp: 1.4, swing_target: 'PSOE', flip_probability: 0.38, voters: 1_950_000,
    segments: [{ label: 'Clase media urbana', pct: 32 }, { label: 'Agro/regadío', pct: 19 }] },
  { province: 'Sevilla', ccaa: 'Andalucía', current_winner: 'PP', margin_pp: 3.2, swing_target: 'PSOE', flip_probability: 0.28, voters: 1_580_000,
    segments: [{ label: 'Barrios populares', pct: 36 }, { label: 'Clase media periferia', pct: 24 }] },
  { province: 'Pontevedra', ccaa: 'Galicia', current_winner: 'PP', margin_pp: 4.6, swing_target: 'BNG', flip_probability: 0.18, voters: 760_000,
    segments: [{ label: 'Pesca y rural', pct: 26 }, { label: 'Urbano Vigo', pct: 31 }] },
  { province: 'Tarragona', ccaa: 'Cataluña', current_winner: 'PSC', margin_pp: 1.8, swing_target: 'Junts', flip_probability: 0.34, voters: 580_000,
    segments: [{ label: 'Industria petroquímica', pct: 22 }, { label: 'Costa turística', pct: 27 }] },
  { province: 'Cádiz', ccaa: 'Andalucía', current_winner: 'PSOE', margin_pp: 2.7, swing_target: 'PP', flip_probability: 0.31, voters: 980_000,
    segments: [{ label: 'Sector naval', pct: 18 }, { label: 'Hostelería costera', pct: 24 }] },
]

const FALLBACK_OPPORTUNITIES: Opportunity[] = [
  { segment: 'Jóvenes urbanos 25-34 (no votantes)', size_voters: 1_200_000, party_target: 'Sumar', current_lean: 'abstención',
    persuadability: 0.62, message: 'Vivienda asequible y empleo estable',
    channels: ['Instagram', 'TikTok', 'podcasts'] },
  { segment: 'Clase media periurbana Madrid', size_voters: 480_000, party_target: 'PP', current_lean: 'PSOE débil',
    persuadability: 0.48, message: 'Reducción IRPF y servicios públicos',
    channels: ['WhatsApp', 'prensa local', 'TV'] },
  { segment: 'Pensionistas zona industrial Norte', size_voters: 720_000, party_target: 'PSOE', current_lean: 'PP medio',
    persuadability: 0.39, message: 'Defensa pensiones y sanidad pública',
    channels: ['TV regional', 'radio', 'door-to-door'] },
  { segment: 'Mujeres rurales 45-65', size_voters: 950_000, party_target: 'PSOE', current_lean: 'PP fuerte',
    persuadability: 0.34, message: 'Conciliación y servicios sociales rurales',
    channels: ['radio local', 'asociaciones'] },
  { segment: 'Profesionales liberales urbanos', size_voters: 390_000, party_target: 'Sumar/Más Madrid', current_lean: 'PP/Cs',
    persuadability: 0.42, message: 'Vivienda, transporte, fiscalidad innovadora',
    channels: ['Twitter/X', 'newsletter', 'eventos'] },
]

function flipColor(p?: number) {
  if (!p) return '#6e6e73'
  if (p >= 0.40) return '#c42c2c'
  if (p >= 0.30) return '#b25000'
  return '#2d8a39'
}

export default function PropensityPanel() {
  const [tab, setTab] = useState<'swing' | 'opportunities' | 'matrix'>('swing')
  const { data: dData } = useApi<SwingDistrict[]>('/api/coalitions/swing-districts', { refreshInterval: 0 })
  const { data: oData } = useApi<Opportunity[]>('/api/coalitions/opportunities', { refreshInterval: 0 })

  const districts = (Array.isArray(dData) && dData.length > 0) ? dData : FALLBACK_DISTRICTS
  const opportunities = (Array.isArray(oData) && oData.length > 0) ? oData : FALLBACK_OPPORTUNITIES

  // Matriz: filas = partidos origen, columnas = destino, valor = % flujo estimado
  const TRANSFER = useMemo(() => {
    const parties = ['PP', 'PSOE', 'VOX', 'Sumar', 'Abst.']
    // Datos demo de transferencia de voto (origen → destino)
    const M: Record<string, Record<string, number>> = {
      PP:    { PP: 78, PSOE: 4,  VOX: 14, Sumar: 1,  'Abst.': 3 },
      PSOE:  { PP: 8,  PSOE: 71, VOX: 3,  Sumar: 12, 'Abst.': 6 },
      VOX:   { PP: 22, PSOE: 1,  VOX: 65, Sumar: 0,  'Abst.': 12 },
      Sumar: { PP: 2,  PSOE: 28, VOX: 1,  Sumar: 58, 'Abst.': 11 },
      'Abst.':{ PP: 11, PSOE: 14, VOX: 6,  Sumar: 8,  'Abst.': 61 },
    }
    return { parties, M }
  }, [])

  return (
    <section style={{ background: '#fff', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
            Propensión electoral
          </p>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display,system-ui)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>
            Distritos pendulares · Oportunidades · Transferencia
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#fafafc', borderRadius: 999, border: '1px solid #e8e8ed' }}>
          {[
            { v: 'swing' as const, l: 'Swing districts' },
            { v: 'opportunities' as const, l: 'Oportunidades' },
            { v: 'matrix' as const, l: 'Transferencia' },
          ].map(t => (
            <button key={t.v} onClick={() => setTab(t.v)} style={{
              padding: '6px 14px', borderRadius: 999, border: 'none',
              background: tab === t.v ? '#1d1d1f' : 'transparent',
              color: tab === t.v ? '#fff' : '#6e6e73',
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* SWING DISTRICTS */}
      {tab === 'swing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {districts.map(d => {
            const fp = d.flip_probability ?? 0
            return (
              <div key={d.province} style={{
                display: 'grid', gridTemplateColumns: '180px 100px 100px 1fr 130px', gap: 14, alignItems: 'center',
                padding: '14px 16px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{d.province}</div>
                  {d.ccaa && <div style={{ fontSize: 10.5, color: '#6e6e73' }}>{d.ccaa}</div>}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Actual</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{d.current_winner ?? '—'}</div>
                  <div style={{ fontSize: 10.5, color: '#6e6e73' }}>+{d.margin_pp?.toFixed(1)} pp</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Swing →</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1F4E8C' }}>{d.swing_target ?? '—'}</div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: '#6e6e73' }}>Probabilidad de cambio</span>
                    <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: flipColor(fp) }}>
                      {(fp * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: 7, background: '#e8e8ed', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${fp * 100}%`, height: '100%', background: flipColor(fp), borderRadius: 999, transition: 'width 600ms ease' }} />
                  </div>
                  {(d.segments?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                      {d.segments!.slice(0, 3).map(s => (
                        <span key={s.label} style={{
                          fontSize: 9.5, padding: '2px 7px', borderRadius: 999,
                          background: 'rgba(31,78,140,0.10)', color: '#1F4E8C',
                        }}>{s.label} {s.pct}%</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9.5, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Censo</div>
                  <div style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 13, color: '#1d1d1f' }}>
                    {d.voters ? d.voters.toLocaleString('es-ES') : '—'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* OPPORTUNITIES */}
      {tab === 'opportunities' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {opportunities.map(op => {
            const persColor = (op.persuadability ?? 0) >= 0.50 ? '#2d8a39' : (op.persuadability ?? 0) >= 0.35 ? '#b25000' : '#c42c2c'
            return (
              <div key={op.segment} style={{
                padding: '16px 18px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>{op.segment}</div>
                    <div style={{ fontSize: 11, color: '#6e6e73' }}>
                      {op.size_voters ? `${op.size_voters.toLocaleString('es-ES')} votantes potenciales` : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700, color: persColor, lineHeight: 1 }}>
                      {((op.persuadability ?? 0) * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 9.5, color: '#6e6e73', marginTop: 2 }}>persuadable</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  {op.party_target && (
                    <span style={{
                      fontSize: 10, padding: '3px 9px', borderRadius: 999, fontWeight: 600,
                      background: 'rgba(31,78,140,0.10)', color: '#1F4E8C',
                    }}>→ {op.party_target}</span>
                  )}
                  {op.current_lean && (
                    <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 999, background: 'rgba(110,110,115,0.10)', color: '#6e6e73' }}>
                      Actual: {op.current_lean}
                    </span>
                  )}
                </div>
                {op.message && (
                  <div style={{ fontSize: 11.5, color: '#424245', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f0f0f3' }}>
                    «{op.message}»
                  </div>
                )}
                {(op.channels?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9.5, color: '#6e6e73', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>Canales:</span>
                    {op.channels!.map(c => (
                      <span key={c} style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 999, background: '#fff', border: '1px solid #e8e8ed', color: '#424245' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* TRANSFER MATRIX */}
      {tab === 'matrix' && (
        <div>
          <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '0 0 14px', lineHeight: 1.5 }}>
            Transferencia estimada de voto entre elecciones generales 2023 → estimación actual.
            Filas: voto previo · Columnas: voto actual. Intensidad de color = % del flujo.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6e6e73', textAlign: 'left' }}>Origen ↓ / Destino →</th>
                {TRANSFER.parties.map(p => (
                  <th key={p} style={{ padding: '8px 10px', fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', textAlign: 'center' }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANSFER.parties.map(row => (
                <tr key={row}>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1d1d1f', fontSize: 11.5 }}>{row}</td>
                  {TRANSFER.parties.map(col => {
                    const v = TRANSFER.M[row]?.[col] ?? 0
                    const isDiag = row === col
                    const intensity = v / 80
                    return (
                      <td key={col} style={{ padding: 4, textAlign: 'center' }}>
                        <div style={{
                          height: 36, borderRadius: 6,
                          background: isDiag
                            ? `rgba(31,78,140,${0.15 + intensity * 0.5})`
                            : v >= 15 ? `rgba(196,44,44,${0.15 + intensity * 0.5})` : v >= 5 ? `rgba(178,80,0,${0.15 + intensity * 0.4})` : `rgba(110,110,115,${0.05 + intensity * 0.2})`,
                          border: isDiag ? '1px solid rgba(31,78,140,0.30)' : '1px solid transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display,system-ui)', fontSize: 13, fontWeight: 700,
                          color: v >= 30 ? '#fff' : '#1d1d1f',
                        }}>
                          {v}%
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 10.5, color: '#6e6e73', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(31,78,140,0.50)' }} /> Voto retenido
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(196,44,44,0.50)' }} /> Fuga importante (≥15%)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(178,80,0,0.50)' }} /> Fuga moderada (5-15%)
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
