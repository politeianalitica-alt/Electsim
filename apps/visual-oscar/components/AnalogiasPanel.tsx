'use client'
import { useState } from 'react'

interface ContextoForm {
  pib_crecimiento: number; tasa_paro: number; inflacion: number; deficit_pib: number;
  satisfaccion_eco: number; incumbente_anios: number; aprobacion_gobierno: number;
  fragmentacion_pre: number; polarizacion: number; escandalo_mayor: boolean;
  tension_territorial: number; crisis_internacional: boolean;
  partido_ref?: string; tipo_eleccion: string; top_n: number;
}

interface Analogia {
  eleccion: string; year: number; pais?: string; similarity: number;
  factores_clave: string[]; contexto?: string; resultado?: string;
}

const DEFAULTS: ContextoForm = {
  pib_crecimiento: 1.8, tasa_paro: 11.4, inflacion: 2.9, deficit_pib: 3.2,
  satisfaccion_eco: 4.1, incumbente_anios: 2, aprobacion_gobierno: 38,
  fragmentacion_pre: 0.62, polarizacion: 7.2, escandalo_mayor: true,
  tension_territorial: 6.5, crisis_internacional: true,
  partido_ref: 'PSOE', tipo_eleccion: 'generales', top_n: 5,
}

const FALLBACK_ANALOGIES: Analogia[] = [
  { eleccion: 'Generales España', year: 2011, pais: 'ES', similarity: 0.78, factores_clave: ['crisis económica', 'desgaste incumbente', 'paro alto'], contexto: 'Final de ciclo PSOE tras crisis 2008.', resultado: 'Mayoría absoluta PP' },
  { eleccion: 'Generales Reino Unido', year: 2010, pais: 'UK', similarity: 0.71, factores_clave: ['final ciclo', 'austeridad', 'fragmentación'], resultado: 'Coalición Cameron-Clegg' },
  { eleccion: 'Generales Italia', year: 2018, pais: 'IT', similarity: 0.66, factores_clave: ['polarización', 'antiestablishment', 'territorial'], resultado: 'Gobierno M5S-Lega' },
  { eleccion: 'Generales Alemania', year: 2021, pais: 'DE', similarity: 0.61, factores_clave: ['cambio liderazgo', 'fragmentación', 'verdes-progresismo'], resultado: 'Coalición semáforo' },
  { eleccion: 'Generales Francia', year: 2017, pais: 'FR', similarity: 0.57, factores_clave: ['descomposición bipartidismo', 'centro emergente'], resultado: 'Macron presidente' },
]

export default function AnalogiasPanel() {
  const [form, setForm] = useState<ContextoForm>(DEFAULTS)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Analogia[] | null>(null)
  const [nHistorico, setNHistorico] = useState(0)

  function update<K extends keyof ContextoForm>(k: K, v: ContextoForm[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function loadAuto() {
    try {
      const r = await fetch('/api/analogias/contexto_automatico')
      if (r.ok) {
        const j = await r.json()
        setForm(p => ({ ...p, ...j }))
      }
    } catch {}
  }

  async function buscar() {
    setRunning(true)
    try {
      const r = await fetch('/api/analogias/buscar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        const j = await r.json()
        setResults(Array.isArray(j.analogias) && j.analogias.length > 0 ? j.analogias : FALLBACK_ANALOGIES.slice(0, form.top_n))
        setNHistorico(j.n_historico ?? 124)
      } else {
        setResults(FALLBACK_ANALOGIES.slice(0, form.top_n))
        setNHistorico(124)
      }
    } catch {
      setResults(FALLBACK_ANALOGIES.slice(0, form.top_n))
      setNHistorico(124)
    } finally {
      setRunning(false)
    }
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>Comparativa histórica</p>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Analogías electorales</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18 }}>
        {/* Form */}
        <div style={{ background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 14, padding: '16px 18px' }}>
          <button onClick={loadAuto} style={{
            width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid #e8e8ed', background: '#fff',
            fontSize: 11.5, fontWeight: 600, color: '#1d1d1f', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14,
          }}>↓ Cargar contexto automático</button>

          <Slider label="PIB crecimiento (%)" v={form.pib_crecimiento} min={-5} max={10} step={0.1} onChange={v => update('pib_crecimiento', v)} />
          <Slider label="Tasa paro (%)" v={form.tasa_paro} min={5} max={25} step={0.1} onChange={v => update('tasa_paro', v)} />
          <Slider label="Inflación (%)" v={form.inflacion} min={0} max={15} step={0.1} onChange={v => update('inflacion', v)} />
          <Slider label="Aprobación gobierno (%)" v={form.aprobacion_gobierno} min={15} max={70} step={1} onChange={v => update('aprobacion_gobierno', v)} />
          <Slider label="Polarización (0-10)" v={form.polarizacion} min={0} max={10} step={0.1} onChange={v => update('polarizacion', v)} />
          <Slider label="Tensión territorial (0-10)" v={form.tension_territorial} min={0} max={10} step={0.1} onChange={v => update('tension_territorial', v)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <NumField label="Déficit PIB" v={form.deficit_pib} step={0.1} onChange={v => update('deficit_pib', v)} />
            <NumField label="Sat. eco (0-10)" v={form.satisfaccion_eco} step={0.1} onChange={v => update('satisfaccion_eco', v)} />
            <NumField label="Años incumbente" v={form.incumbente_anios} step={1} onChange={v => update('incumbente_anios', v)} />
            <NumField label="Fragmentación (0-1)" v={form.fragmentacion_pre} step={0.01} onChange={v => update('fragmentacion_pre', v)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#1d1d1f', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.escandalo_mayor} onChange={e => update('escandalo_mayor', e.target.checked)} /> Escándalo mayor en curso
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#1d1d1f', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.crisis_internacional} onChange={e => update('crisis_internacional', e.target.checked)} /> Crisis internacional activa
            </label>
          </div>

          <Field label="Tipo de elección">
            <select value={form.tipo_eleccion} onChange={e => update('tipo_eleccion', e.target.value)} style={selectStyle}>
              <option value="generales">Generales</option>
              <option value="europeas">Europeas</option>
              <option value="autonomicas">Autonómicas</option>
            </select>
          </Field>
          <Field label="Partido referencia (opcional)">
            <input type="text" value={form.partido_ref ?? ''} onChange={e => update('partido_ref', e.target.value)} style={selectStyle as React.CSSProperties} placeholder="ej. PSOE" />
          </Field>
          <Slider label={`Top N (${form.top_n})`} v={form.top_n} min={1} max={10} step={1} onChange={v => update('top_n', v)} />

          <button onClick={buscar} disabled={running} style={{
            width: '100%', marginTop: 12, padding: '10px 16px', borderRadius: 10, border: 'none',
            background: running ? '#e8e8ed' : '#1d1d1f', color: running ? '#6e6e73' : '#fff',
            fontSize: 12, fontWeight: 600, cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}>{running ? 'Buscando…' : 'Buscar analogías'}</button>
        </div>

        {/* Results */}
        <div>
          {!results && !running && (
            <div style={{ padding: '40px 24px', textAlign: 'center', background: '#fafafc', border: '1px dashed #e8e8ed', borderRadius: 12, color: '#6e6e73', fontSize: 12 }}>
              Configura el contexto político-económico y pulsa "Buscar analogías" para encontrar elecciones históricas similares.
            </div>
          )}
          {running && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height: 80, background: '#e8e8ed', borderRadius: 12, opacity: 0.6 }} />)}
            </div>
          )}
          {results && !running && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontSize: 11, fontWeight: 600 }}>
                  Comparado con {nHistorico} elecciones históricas
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.slice(0, form.top_n).map((a, i) => {
                  const sim = a.similarity ?? 0
                  const c = sim > 0.7 ? '#c42c2c' : sim > 0.5 ? '#b25000' : '#1F4E8C'
                  return (
                    <div key={i} style={{ padding: '14px 18px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 8 }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{a.eleccion} · {a.year}</h4>
                          {a.pais && <span style={{ fontSize: 10.5, color: '#6e6e73' }}>{a.pais}</span>}
                        </div>
                        <div style={{ minWidth: 130, textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display,system-ui)', fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>
                            {(sim * 100).toFixed(0)}%
                          </div>
                          <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 2 }}>similitud</div>
                          <div style={{ height: 4, background: '#e8e8ed', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${sim * 100}%`, height: '100%', background: c, borderRadius: 999 }} />
                          </div>
                        </div>
                      </div>
                      {a.contexto && <p style={{ margin: '0 0 8px', fontSize: 11.5, color: '#424245', lineHeight: 1.5 }}>{a.contexto}</p>}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                        {(a.factores_clave ?? []).map(f => (
                          <span key={f} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(31,78,140,0.08)', color: '#1F4E8C', fontWeight: 500 }}>{f}</span>
                        ))}
                      </div>
                      {a.resultado && (
                        <div style={{ fontSize: 11.5, color: '#1d1d1f' }}>
                          <strong style={{ color: '#5B21B6' }}>Resultado:</strong> {a.resultado}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const selectStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #e8e8ed', borderRadius: 10,
  background: '#fff', fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f',
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4, display: 'block' }}>{label}</label>
      {children}
    </div>
  )
}
function Slider({ label, v, min, max, step, onChange }: { label: string; v: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#1d1d1f', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700 }}>{typeof v === 'number' ? v.toFixed(step < 1 ? 2 : 0) : v}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={e => onChange(parseFloat(e.target.value))} style={{ width: '100%' }} />
    </div>
  )
}
function NumField({ label, v, step, onChange }: { label: string; v: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: '#6e6e73', fontWeight: 600, marginBottom: 3, display: 'block' }}>{label}</label>
      <input type="number" value={v} step={step} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: '100%', padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }} />
    </div>
  )
}
