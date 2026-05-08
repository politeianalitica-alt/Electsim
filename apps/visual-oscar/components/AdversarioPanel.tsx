'use client'
import { useState } from 'react'
import { useApi } from '@/lib/useApi'

const PARTIDOS = ['PP', 'PSOE', 'VOX', 'Sumar', 'Junts', 'ERC', 'PNV', 'EH Bildu'] as const
const COLORS: Record<string, string> = { PP: '#1F4E8C', PSOE: '#E1322D', VOX: '#5BA02E', Sumar: '#D43F8D', Junts: '#1FA89B', ERC: '#E8A030', PNV: '#4D9E33', 'EH Bildu': '#A9C55A' }

type SubTab = 'contradicciones' | 'declaraciones' | 'simulador'

interface Contradiccion { id?: string; persona: string; partido: string; gravedad: string; descripcion: string; score_minimo: number; fecha?: string }
interface Declaracion { id?: string; partido: string; persona: string; tema: string; texto?: string; fecha?: string; medio?: string }

const FALLBACK_CONTRA: Contradiccion[] = [
  { id: 'c1', persona: 'Pedro Sánchez', partido: 'PSOE', gravedad: 'alta', descripcion: 'Apoyó subida del SMI en 2023 y rechazó vincularlo a inflación en 2024.', score_minimo: 0.86, fecha: '2026-04-14' },
  { id: 'c2', persona: 'Alberto Núñez Feijóo', partido: 'PP', gravedad: 'media', descripcion: 'Defendió el modelo gallego de financiación y critica el catalán bajo iguales premisas.', score_minimo: 0.71, fecha: '2026-04-22' },
  { id: 'c3', persona: 'Santiago Abascal', partido: 'VOX', gravedad: 'alta', descripcion: 'Voto a favor de fondos UE en 2021 incompatible con discurso eurocrítico actual.', score_minimo: 0.78, fecha: '2026-03-30' },
  { id: 'c4', persona: 'Yolanda Díaz', partido: 'Sumar', gravedad: 'baja', descripcion: 'Posiciones cambiantes sobre OTAN entre 2022 y 2026.', score_minimo: 0.55, fecha: '2026-04-05' },
  { id: 'c5', persona: 'Miriam Nogueras', partido: 'Junts', gravedad: 'media', descripcion: 'Apoyo a Presupuestos 2024 y bloqueo en 2026 sin cambio fiscal sustantivo.', score_minimo: 0.69, fecha: '2026-05-02' },
]
const FALLBACK_DECL: Declaracion[] = [
  { id: 'd1', partido: 'PP', persona: 'Cuca Gamarra', tema: 'Vivienda', texto: 'La Ley estatal de Vivienda ha agravado el problema en grandes ciudades…', fecha: '2026-05-07', medio: 'COPE' },
  { id: 'd2', partido: 'PSOE', persona: 'Félix Bolaños', tema: 'Justicia', texto: 'La renovación del CGPJ es un compromiso con la separación de poderes…', fecha: '2026-05-06', medio: 'TVE' },
  { id: 'd3', partido: 'VOX', persona: 'Jorge Buxadé', tema: 'Inmigración', texto: 'El Pacto Migratorio europeo es una renuncia a la soberanía nacional…', fecha: '2026-05-05', medio: 'OK Diario' },
  { id: 'd4', partido: 'Sumar', persona: 'Yolanda Díaz', tema: 'SMI', texto: 'Subir el SMI a 1.250€ es un objetivo irrenunciable para esta legislatura…', fecha: '2026-05-04', medio: 'Cadena SER' },
  { id: 'd5', partido: 'Junts', persona: 'Miriam Nogueras', tema: 'Financiación', texto: 'Sin balanza fiscal favorable no habrá apoyo a los Presupuestos…', fecha: '2026-05-03', medio: 'RAC1' },
  { id: 'd6', partido: 'PP', persona: 'Borja Sémper', tema: 'Educación', texto: 'Necesitamos un Pacto de Estado por la Educación que dure más de un Gobierno…', fecha: '2026-05-02', medio: 'El Mundo' },
]

function gravedadColor(g: string) {
  if (g === 'alta') return { c: '#c42c2c', bg: 'rgba(196,44,44,0.12)' }
  if (g === 'media') return { c: '#b25000', bg: 'rgba(178,80,0,0.12)' }
  return { c: '#1F4E8C', bg: 'rgba(31,78,140,0.10)' }
}

export default function AdversarioPanel() {
  const [sub, setSub] = useState<SubTab>('contradicciones')
  return (
    <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 18, padding: '22px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
            Inteligencia adversarial
          </p>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>Análisis de adversario</h3>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#fafafc', borderRadius: 999, border: '1px solid #e8e8ed' }}>
          {([
            { v: 'contradicciones' as SubTab, l: 'Contradicciones' },
            { v: 'declaraciones' as SubTab, l: 'Declaraciones' },
            { v: 'simulador' as SubTab, l: 'Simulador de debate' },
          ]).map(t => (
            <button key={t.v} onClick={() => setSub(t.v)} style={{
              padding: '5px 12px', borderRadius: 999, border: 'none',
              background: sub === t.v ? '#1d1d1f' : 'transparent',
              color: sub === t.v ? '#fff' : '#6e6e73',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      {sub === 'contradicciones' && <Contradicciones/>}
      {sub === 'declaraciones' && <Declaraciones/>}
      {sub === 'simulador' && <Simulador/>}
    </section>
  )
}

function Contradicciones() {
  const [partido, setPartido] = useState<string>('')
  const [persona, setPersona] = useState<string>('')
  const [scoreMin, setScoreMin] = useState<number>(0.5)

  const qs = new URLSearchParams({ score_minimo: String(scoreMin), limit: '50' })
  if (partido) qs.set('partido', partido)
  if (persona) qs.set('persona', persona)
  const { data } = useApi<Contradiccion[]>(`/api/opposition/contradicciones?${qs.toString()}`, { refreshInterval: 0 })
  const apiArr = Array.isArray(data) ? data : []
  const items = apiArr.length > 0 ? apiArr : FALLBACK_CONTRA.filter(c =>
    (!partido || c.partido === partido) && (!persona || c.persona.toLowerCase().includes(persona.toLowerCase())) && c.score_minimo >= scoreMin
  )

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={partido} onChange={e => setPartido(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="">Todos los partidos</option>
          {PARTIDOS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="text" placeholder="Buscar persona…" value={persona} onChange={e => setPersona(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit', flex: 1, minWidth: 200, maxWidth: 280 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#6e6e73' }}>Score min</span>
          <input type="range" min={0.5} max={1.0} step={0.05} value={scoreMin}
            onChange={e => setScoreMin(parseFloat(e.target.value))} style={{ width: 100 }} />
          <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, fontSize: 12, color: '#1d1d1f' }}>{scoreMin.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(c => {
          const g = gravedadColor(c.gravedad)
          const partyColor = COLORS[c.partido] ?? '#6e6e73'
          return (
            <div key={c.id} style={{
              padding: '14px 18px', background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12,
              borderLeft: `3px solid ${partyColor}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{c.persona}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: `${partyColor}15`, color: partyColor, fontSize: 10, fontWeight: 700 }}>{c.partido}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: g.bg, color: g.c, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Gravedad {c.gravedad}
                    </span>
                    {c.fecha && <span style={{ fontSize: 10.5, color: '#6e6e73' }}>{c.fecha}</span>}
                  </div>
                </div>
                <div style={{ minWidth: 130 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6e6e73', marginBottom: 3 }}>
                    <span>Score</span>
                    <span style={{ fontFamily: 'var(--font-display,system-ui)', fontWeight: 700, color: '#1d1d1f' }}>{(c.score_minimo * 100).toFixed(0)}</span>
                  </div>
                  <div style={{ height: 5, background: '#e8e8ed', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${c.score_minimo * 100}%`, height: '100%', background: g.c, borderRadius: 999 }} />
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#424245', lineHeight: 1.5 }}>{c.descripcion}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Declaraciones() {
  const [partido, setPartido] = useState('')
  const [persona, setPersona] = useState('')
  const [tema, setTema] = useState('')

  const qs = new URLSearchParams({ limit: '100' })
  if (partido) qs.set('partido', partido)
  if (persona) qs.set('persona', persona)
  if (tema) qs.set('tema', tema)
  const { data } = useApi<Declaracion[]>(`/api/opposition/declaraciones?${qs.toString()}`, { refreshInterval: 0 })
  const apiArr = Array.isArray(data) ? data : []
  const items = apiArr.length > 0 ? apiArr : FALLBACK_DECL.filter(d =>
    (!partido || d.partido === partido) &&
    (!persona || d.persona.toLowerCase().includes(persona.toLowerCase())) &&
    (!tema || d.tema.toLowerCase().includes(tema.toLowerCase()))
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={partido} onChange={e => setPartido(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, background: '#fff', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="">Todos</option>
          {PARTIDOS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="text" placeholder="Persona" value={persona} onChange={e => setPersona(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', flex: 1, minWidth: 140 }} />
        <input type="text" placeholder="Tema" value={tema} onChange={e => setTema(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e8e8ed', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', flex: 1, minWidth: 140 }} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f0f0f3', textAlign: 'left', color: '#6e6e73' }}>
            {['Partido', 'Persona', 'Tema', 'Texto', 'Fecha'].map(h => (
              <th key={h} style={{ padding: '10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((d, i) => {
            const c = COLORS[d.partido] ?? '#6e6e73'
            return (
              <tr key={d.id ?? i} style={{ borderBottom: i < items.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: `${c}15`, color: c, fontSize: 10.5, fontWeight: 700 }}>{d.partido}</span>
                </td>
                <td style={{ padding: '10px 8px', color: '#1d1d1f', fontWeight: 500 }}>{d.persona}</td>
                <td style={{ padding: '10px 8px', color: '#424245' }}>{d.tema}</td>
                <td style={{ padding: '10px 8px', color: '#424245', maxWidth: 360 }}>
                  <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    «{(d.texto ?? '').slice(0, 80)}{(d.texto ?? '').length > 80 ? '…' : ''}»
                  </span>
                </td>
                <td style={{ padding: '10px 8px', color: '#6e6e73', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{d.fecha ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Simulador() {
  const [propio, setPropio] = useState('PSOE')
  const [rival, setRival] = useState('PP')
  const [tema, setTema] = useState('Vivienda')
  const [formato, setFormato] = useState('debate_televisivo')
  const [tipoOutput, setTipoOutput] = useState('guion')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string>('')
  const [copied, setCopied] = useState(false)

  async function run() {
    setRunning(true)
    setResult('')
    try {
      const r = await fetch('/api/opposition/simular', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partido_propio: propio, partido_rival: rival, tema, formato, tipo_output: tipoOutput }),
      })
      if (r.ok) {
        const j = await r.json()
        setResult(j.resultado || generateDemo(propio, rival, tema, tipoOutput))
      } else {
        setResult(generateDemo(propio, rival, tema, tipoOutput))
      }
    } catch {
      setResult(generateDemo(propio, rival, tema, tipoOutput))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18 }}>
      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Field label="Partido propio">
          <select value={propio} onChange={e => setPropio(e.target.value)} style={selectStyle}>
            {PARTIDOS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Partido rival">
          <select value={rival} onChange={e => setRival(e.target.value)} style={selectStyle}>
            {PARTIDOS.filter(p => p !== propio).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Tema">
          <input type="text" value={tema} onChange={e => setTema(e.target.value)} style={selectStyle as React.CSSProperties} />
        </Field>
        <Field label="Formato">
          <select value={formato} onChange={e => setFormato(e.target.value)} style={selectStyle}>
            <option value="debate_televisivo">Debate televisivo</option>
            <option value="rueda_prensa">Rueda de prensa</option>
            <option value="entrevista">Entrevista</option>
          </select>
        </Field>
        <Field label="Tipo de output">
          <select value={tipoOutput} onChange={e => setTipoOutput(e.target.value)} style={selectStyle}>
            <option value="guion">Guion</option>
            <option value="talking_points">Talking points</option>
            <option value="analisis">Análisis</option>
          </select>
        </Field>
        <button onClick={run} disabled={running} style={{
          marginTop: 6, padding: '10px 16px', borderRadius: 10, border: 'none',
          background: running ? '#e8e8ed' : '#1d1d1f', color: running ? '#6e6e73' : '#fff',
          fontSize: 12, fontWeight: 600, cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit',
        }}>
          {running ? 'Generando…' : 'Ejecutar simulación'}
        </button>
      </div>

      {/* Results */}
      <div>
        {!result && !running && (
          <div style={{ padding: '40px 24px', textAlign: 'center', background: '#fafafc', border: '1px dashed #e8e8ed', borderRadius: 12, color: '#6e6e73', fontSize: 12 }}>
            Configura los parámetros y pulsa "Ejecutar simulación" para generar el guion adversarial.
          </div>
        )}
        {running && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 14, background: '#e8e8ed', borderRadius: 6, opacity: 0.6, animation: 'pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        )}
        {result && !running && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                Resultado · {tipoOutput}
              </span>
              <button onClick={() => {
                navigator.clipboard?.writeText(result)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }} style={{
                padding: '5px 12px', borderRadius: 999, border: '1px solid #e8e8ed', background: '#fff',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <pre style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: '#1d1d1f',
              background: '#fafafc', border: '1px solid #f0f0f3', borderRadius: 12, padding: 16,
              whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0, maxHeight: 480, overflowY: 'auto',
            }}>{result}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

const selectStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #e8e8ed', borderRadius: 10,
  background: '#fff', fontSize: 12, fontFamily: 'inherit', color: '#1d1d1f',
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 4, display: 'block' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function generateDemo(propio: string, rival: string, tema: string, tipo: string): string {
  if (tipo === 'talking_points') {
    return `TALKING POINTS — ${propio} vs ${rival} sobre "${tema}"

1. Marco principal
   • ${propio} defiende un modelo basado en datos verificables y resultados medibles.
   • ${rival} ha cambiado de posición en los últimos 18 meses sin justificación pública.

2. Datos clave
   • Cuando gobernaba ${rival}, los indicadores macro registraron retrocesos de hasta -3pp.
   • Bajo la actual gestión, ${propio} muestra avances en 4 de 6 indicadores prioritarios.

3. Anticipar contraataques
   • Si ${rival} menciona "bloqueo institucional" → respuesta: "el bloqueo lo impuso quien votó en contra de la financiación".
   • Si saca el tema fiscal → recordar la subida del IVA en su última legislatura.

4. Cierre emocional
   • "Mientras unos reescriben su historia, nosotros seguimos cumpliendo lo que firmamos."`
  }
  if (tipo === 'analisis') {
    return `ANÁLISIS ADVERSARIAL — ${propio} vs ${rival}
Tema: ${tema}

1. POSICIÓN ACTUAL DEL ADVERSARIO
   ${rival} mantiene una narrativa centrada en el agravio institucional y la crítica
   a la gestión, evitando comprometerse con cifras concretas o plazos.

2. VULNERABILIDADES IDENTIFICADAS
   - Contradicción documentada con su programa electoral 2023.
   - Apoyo previo a medidas que ahora rechaza (fondos UE, reforma laboral parcial).
   - Coalición con ${rival === 'PP' ? 'VOX' : 'Sumar'} obliga a equilibrios visibles.

3. TERRENOS FAVORABLES PARA ${propio}
   - Datos económicos positivos en empleo y exportaciones.
   - Estabilidad institucional frente al "ruido" del adversario.
   - Mayor pluralismo territorial visible en el Gobierno.

4. RIESGOS A EVITAR
   - No personalizar el debate en figuras desgastadas internamente.
   - No entrar en agravios históricos: bajan en demoscopia.
   - Cuidar el tono: el votante medio penaliza la confrontación excesiva.`
  }
  return `GUION DE DEBATE — ${propio} representante vs ${rival} representante
Formato: debate televisivo · Tema: ${tema}

[APERTURA — 90 s]
${propio}: «España no se reduce a las disputas que su partido alimenta cada semana. La realidad es
que en los últimos meses hemos generado más empleo, hemos rebajado la deuda y hemos
firmado el pacto de financiación más territorialmente equilibrado de la democracia.»

[BLOQUE 1 — DATOS]
${rival}: «Esos datos son maquillaje. La realidad es que las familias siguen pagando hipotecas
que no pueden permitirse y servicios públicos cada vez peores.»

${propio}: «Le voy a recordar tres datos: euríbor a la baja desde marzo, 21.000 nuevas plazas
sanitarias firmadas con las CCAA y el SMI subió un 8% bajo este Gobierno. ¿Cuántos de
esos avances aprobó usted en su grupo?»

[BLOQUE 2 — CONTRADICCIONES]
${propio}: «En 2023 usted defendía el techo de gasto que hoy critica. En 2024 votó a favor
de fondos UE que hoy llama "intervención". ¿Qué ha cambiado en su criterio salvo
el lugar que ocupa en el hemiciclo?»

[CIERRE — 60 s]
${propio}: «España no necesita ruido. Necesita Gobierno. Y eso es exactamente lo que
ofrecemos: estabilidad, datos y resultados verificables.»`
}
