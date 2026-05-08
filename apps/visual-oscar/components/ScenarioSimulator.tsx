'use client'
import { useMemo, useState } from 'react'

const CCAA = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
  'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Extremadura',
  'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco',
  'C. Valenciana', 'Ceuta', 'Melilla',
] as const

type Feature = { key: string; label: string; min: number; max: number; default: number; weight: number; help?: string }

const FEATURES: Feature[] = [
  { key: 'media_volatility', label: 'Volatilidad mediática', min: 0, max: 100, default: 50, weight: 0.20, help: 'Pedersen + burst' },
  { key: 'institutional_tension', label: 'Tensión institucional', min: 0, max: 100, default: 40, weight: 0.18, help: 'Conflictos' },
  { key: 'reg_instability', label: 'Inestabilidad regulatoria', min: 0, max: 100, default: 55, weight: 0.15, help: 'Velocidad BOE' },
  { key: 'polarization', label: 'Polarización social', min: 0, max: 100, default: 65, weight: 0.15, help: 'RRSS + calle' },
  { key: 'geo_risk', label: 'Riesgo geopolítico', min: 0, max: 100, default: 50, weight: 0.12, help: 'GDELT + ACLED' },
  { key: 'eco_stress', label: 'Estrés económico', min: 0, max: 100, default: 35, weight: 0.10, help: 'Prima + IBEX' },
  { key: 'electoral', label: 'Riesgo electoral', min: 0, max: 100, default: 45, weight: 0.10, help: 'Volatilidad polls' },
]

// Multiplicadores demo por CCAA (cómo amplifica/atenúa cada feature en la región)
const CCAA_MOD: Record<string, Partial<Record<string, number>>> = {
  'Cataluña': { institutional_tension: 1.4, polarization: 1.25, reg_instability: 1.15 },
  'País Vasco': { institutional_tension: 1.25, polarization: 1.15 },
  'Madrid': { media_volatility: 1.20, electoral: 1.15 },
  'Andalucía': { eco_stress: 1.10, electoral: 1.10 },
  'Canarias': { geo_risk: 1.30, eco_stress: 1.10 },
  'Baleares': { eco_stress: 1.05, polarization: 0.90 },
  'Galicia': { electoral: 0.90 },
  'Ceuta': { geo_risk: 1.45, polarization: 1.10 },
  'Melilla': { geo_risk: 1.45, polarization: 1.10 },
}

export default function ScenarioSimulator() {
  const [ccaa, setCcaa] = useState<string>('Madrid')
  const [features, setFeatures] = useState<Record<string, number>>(() =>
    Object.fromEntries(FEATURES.map(f => [f.key, f.default]))
  )

  const result = useMemo(() => {
    const mods = CCAA_MOD[ccaa] ?? {}
    let composite = 0
    let weighted: Array<{ key: string; label: string; v: number; w: number; mod: number }> = []
    for (const f of FEATURES) {
      const mod = mods[f.key] ?? 1.0
      const v = Math.min(100, features[f.key] * mod)
      composite += v * f.weight
      weighted.push({ key: f.key, label: f.label, v, w: f.weight, mod })
    }
    composite = Math.round(composite)
    const tier = composite >= 70 ? { label: 'CRÍTICO', color: '#c42c2c' }
      : composite >= 55 ? { label: 'ALTO', color: '#b25000' }
      : composite >= 40 ? { label: 'MEDIO', color: '#5B21B6' }
      : { label: 'BAJO', color: '#2d8a39' }
    return { composite, tier, weighted }
  }, [ccaa, features])

  function setF(k: string, v: number) {
    setFeatures(prev => ({ ...prev, [k]: v }))
  }
  function reset() {
    setFeatures(Object.fromEntries(FEATURES.map(f => [f.key, f.default])))
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '24px 28px', marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
            Simulador de escenarios
          </p>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
            ¿Qué pasaría si…?
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6e6e73', maxWidth: 480 }}>
            Ajusta los componentes y la CCAA para recalcular el Risk Index en tiempo real con los pesos del modelo.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 4 }}>
              Risk Index simulado
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 46, fontWeight: 700, letterSpacing: '-0.025em', color: result.tier.color, lineHeight: 1 }}>
                {result.composite}
              </span>
              <span style={{
                padding: '4px 10px', borderRadius: 999,
                background: `${result.tier.color}18`, color: result.tier.color,
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
              }}>{result.tier.label}</span>
            </div>
          </div>
          <button onClick={reset} style={{
            padding: '8px 14px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
            fontSize: 11, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit',
          }}>Reset</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        {/* CCAA selector */}
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
            Comunidad Autónoma
          </label>
          <select value={ccaa} onChange={e => setCcaa(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #e8e8ed', borderRadius: 10,
              background: '#fff', fontSize: 13, fontFamily: 'inherit', color: '#1d1d1f', cursor: 'pointer',
            }}>
            {CCAA.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#fafafc', borderRadius: 10, fontSize: 11, color: '#424245', lineHeight: 1.5 }}>
            <strong>Modificadores activos:</strong>
            {Object.keys(CCAA_MOD[ccaa] ?? {}).length === 0 ? (
              <span style={{ color: '#6e6e73' }}> ninguno (perfil base)</span>
            ) : (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {Object.entries(CCAA_MOD[ccaa] ?? {}).map(([k, v]) => {
                  const f = FEATURES.find(x => x.key === k)
                  return <li key={k} style={{ color: (v ?? 1) > 1 ? '#c42c2c' : '#2d8a39' }}>
                    {f?.label}: ×{v?.toFixed(2)}
                  </li>
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Features sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FEATURES.map(f => {
            const v = features[f.key]
            const mod = CCAA_MOD[ccaa]?.[f.key] ?? 1
            const effective = Math.min(100, v * mod)
            const c = effective >= 70 ? '#c42c2c' : effective >= 50 ? '#b25000' : '#2d8a39'
            return (
              <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 56px 60px', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f' }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: '#6e6e73' }}>peso {(f.weight * 100).toFixed(0)}% {f.help && `· ${f.help}`}</div>
                </div>
                <input type="range" min={f.min} max={f.max} value={v} onChange={e => setF(f.key, parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: c }} />
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-display,system-ui)', fontSize: 14, fontWeight: 700, color: c }}>
                  {Math.round(effective)}
                </div>
                <div style={{ fontSize: 10, color: mod !== 1 ? (mod > 1 ? '#c42c2c' : '#2d8a39') : '#6e6e73', textAlign: 'right' }}>
                  ×{mod.toFixed(2)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
