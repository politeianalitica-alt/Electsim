'use client'
/**
 * `<GeoScenarioSlider />` · Sprint G4 · feature interactiva WOW.
 *
 * Scenario Impact Slider tipo war-gaming: 5 sliders 0-100 (sanciones,
 * conflicto, energía, migración, cyber) que recalculan impactos España
 * en tiempo real (debounce 300ms).
 *
 * Inspiración: BlackRock GRI scenario stress testing + war-gaming clásico
 * militar. DIFERENCIADOR: interactivo en navegador, no análisis estático.
 *
 * Recalcula 7 impactos cuantitativos:
 *  - Spain Risk Index 0-100 composite
 *  - EUR/USD pressure %
 *  - Gas price change %
 *  - IBEX drop %
 *  - Migration arrivals uplift %
 *  - Yield 10Y shift pb
 *  - Tourism drop %
 *
 * Y muestra los Top Risks que se "materializan" con esos parámetros.
 */
import { useEffect, useMemo, useState } from 'react'

interface ScenarioResp {
  ok: boolean
  inputs: Record<string, number>
  impacts: Record<string, number>
  composite_band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  triggered_top_risks: string[]
  methodology: string
  disclaimer: string
}

const BAND_COLOR: Record<string, { bg: string; fg: string; track: string }> = {
  BAJO:    { bg: '#dcfce7', fg: '#166534', track: '#16a34a' },
  MEDIO:   { bg: '#fef3c7', fg: '#92400e', track: '#f59e0b' },
  ALTO:    { bg: '#ffedd5', fg: '#9a3412', track: '#f97316' },
  CRITICO: { bg: '#fee2e2', fg: '#991b1b', track: '#dc2626' },
}

const SLIDER_META = [
  { key: 'sanctions',  label: 'Sanciones (intensidad nuevas vs socios)',  hint: 'OFAC + EU + UN designations + impactos secundarios' },
  { key: 'conflict',   label: 'Escalada conflicto (Ucrania + ME)',         hint: 'Intensidad militar global · ACLED fatalities' },
  { key: 'energy',     label: 'Shock energético (gas TTF · petróleo)',     hint: 'Precio gas + interrupciones suministro UE' },
  { key: 'migration',  label: 'Presión migratoria (Canarias + Med)',       hint: 'Llegadas FRONTEX + cayucos atlántico' },
  { key: 'cyber',      label: 'Amenaza cyber (infraestructura crítica)',   hint: 'DDoS + ransomware + sabotaje' },
]

function useDebouncedValue<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

export function GeoScenarioSlider() {
  const [sliders, setSliders] = useState<Record<string, number>>({
    sanctions: 50,
    conflict: 50,
    energy: 50,
    migration: 50,
    cyber: 30,
  })
  const [data, setData] = useState<ScenarioResp | null>(null)
  const debounced = useDebouncedValue(sliders, 350)

  useEffect(() => {
    const params = new URLSearchParams(
      Object.entries(debounced).map(([k, v]) => [k, String(v)]),
    )
    fetch(`/api/geopolitica/scenario-impact?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => { if (j?.ok) setData(j) })
      .catch(() => {})
  }, [debounced])

  const reset = () => setSliders({ sanctions: 50, conflict: 50, energy: 50, migration: 50, cyber: 30 })

  const presets = useMemo(() => [
    { label: 'Status quo', values: { sanctions: 50, conflict: 50, energy: 50, migration: 50, cyber: 30 } },
    { label: 'Escalada total', values: { sanctions: 90, conflict: 95, energy: 85, migration: 80, cyber: 75 } },
    { label: 'Distensión', values: { sanctions: 20, conflict: 25, energy: 30, migration: 35, cyber: 20 } },
    { label: 'Cyber-war', values: { sanctions: 40, conflict: 30, energy: 35, migration: 30, cyber: 95 } },
    { label: 'Crisis energética', values: { sanctions: 60, conflict: 55, energy: 95, migration: 50, cyber: 30 } },
  ], [])

  const band = data ? BAND_COLOR[data.composite_band] : BAND_COLOR.MEDIO

  return (
    <section style={{
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      border: '1px solid #1e293b',
      borderLeft: `4px solid ${band.track}`,
      borderRadius: 12,
      padding: 18,
      color: '#f1f5f9',
    }}>
      <header style={{ marginBottom: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#fbbf24', textTransform: 'uppercase' }}>
            ◆ Scenario Impact Slider · war-gaming interactivo
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>
            Ajusta los 5 sliders → recalcula impactos España en tiempo real · BlackRock GRI stress style
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setSliders(p.values)}
              type="button"
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                padding: '3px 8px',
                borderRadius: 5,
                fontSize: 9,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: 0.4,
              }}
            >
              {p.label}
            </button>
          ))}
          <button onClick={reset} type="button" style={{
            background: '#fbbf24', color: '#0f172a', border: 'none', padding: '3px 8px', borderRadius: 5, fontSize: 9, fontWeight: 700, cursor: 'pointer',
          }}>Reset</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Sliders panel izquierdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SLIDER_META.map((s) => {
            const v = sliders[s.key]
            const color = v < 30 ? '#16a34a' : v < 55 ? '#f59e0b' : v < 75 ? '#f97316' : '#dc2626'
            return (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#e2e8f0' }}>{s.label}</span>
                  <span style={{ color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const }}>{v}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={v}
                  onChange={(e) => setSliders((prev) => ({ ...prev, [s.key]: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    accentColor: color,
                  }}
                />
                <p style={{ margin: '2px 0 0', fontSize: 9, color: '#64748b' }}>{s.hint}</p>
              </div>
            )
          })}
        </div>

        {/* Impactos panel derecho */}
        <div>
          {data && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  Spain Composite Risk
                </p>
                <p style={{ margin: 0, fontSize: 56, fontWeight: 700, color: band.track, lineHeight: 1, fontVariantNumeric: 'tabular-nums' as const }}>
                  {data.impacts.spain_risk_index}
                </p>
                <span style={{
                  display: 'inline-block',
                  marginTop: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  padding: '3px 12px',
                  borderRadius: 12,
                  background: band.bg,
                  color: band.fg,
                }}>
                  BANDA · {data.composite_band}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                {[
                  { k: 'eurusd_pressure_pct',         label: 'EUR/USD ▼',     unit: '%', invert: false },
                  { k: 'gas_price_change_pct',         label: 'Gas TTF ▲',     unit: '%', invert: true },
                  { k: 'ibex_drop_pct',                label: 'IBEX ▼',        unit: '%', invert: false },
                  { k: 'migration_arrivals_uplift_pct',label: 'Llegadas ▲',   unit: '%', invert: true },
                  { k: 'yield_10y_shift_pb',           label: 'Yield 10Y ▲',   unit: 'pb', invert: true },
                  { k: 'tourism_drop_pct',             label: 'Turismo ▼',    unit: '%', invert: false },
                ].map((m) => {
                  const val = data.impacts[m.k]
                  const isBad = m.invert ? val > 20 : val > 5
                  return (
                    <div key={m.k} style={{
                      background: '#1e293b',
                      borderLeft: `3px solid ${isBad ? '#dc2626' : '#64748b'}`,
                      borderRadius: 4,
                      padding: '6px 8px',
                    }}>
                      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', letterSpacing: 0.4, textTransform: 'uppercase' }}>{m.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: isBad ? '#fca5a5' : '#cbd5e1', fontVariantNumeric: 'tabular-nums' as const }}>
                        {val > 0 ? '+' : ''}{val}{m.unit}
                      </p>
                    </div>
                  )
                })}
              </div>

              {data.triggered_top_risks.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#fbbf24', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    ⚠ Top Risks materializados con este escenario
                  </p>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#e2e8f0', fontSize: 11 }}>
                    {data.triggered_top_risks.map((r, i) => <li key={i} style={{ marginBottom: 2 }}>{r}</li>)}
                  </ul>
                </div>
              )}

              <p style={{ margin: '14px 0 0', fontSize: 9, color: '#64748b', lineHeight: 1.5 }}>
                {data.disclaimer}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default GeoScenarioSlider
