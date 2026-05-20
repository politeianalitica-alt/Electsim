'use client'
import { useState, FormEvent, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import type { MorningBriefing } from '@/lib/api-types'

type Msg = {
  role: 'user' | 'brain'
  text: string
  ts: number
  /** Modelo que respondió (ej: 'claude-haiku-4-5-20251001'). */
  model?: string
  /** Tools que el modelo usó para responder. */
  toolsUsed?: Array<{ name: string; input: Record<string, unknown>; ms: number }>
  /** Provider del LLM ('anthropic', 'backend', 'ollama', 'fallback'). */
  source?: string
  /** Latencia total en ms. */
  ms?: number
  /** Preguntas de seguimiento sugeridas (solo en mensajes de brain). */
  followUps?: string[]
}

// Preguntas predefinidas del briefing matinal — usadas como fallback
// si el backend no está conectado. Cuando hay backend, se reemplazan
// por `briefing.three_questions` del shape MorningBriefing.
const PRESET_QUESTIONS = [
  {
    n: 1,
    q: '¿Mantendrá el PP el liderazgo si la narrativa de vivienda erosiona su electorado urbano?',
    a: 'Análisis de elasticidad: el PP mantiene un colchón de **+6,4 pp** sobre el PSOE. Una erosión completa del voto urbano joven (≈12% del electorado PP en grandes ciudades) reduciría su ventaja a **+1,8 pp** pero seguiría liderando.\n\n**Riesgo medio**. Madrid capital y zonas turísticas costeras son los focos a vigilar. Recomiendo cruzar con `/microdatos` para ver el voto blando por franja 25-44 años.',
  },
  {
    n: 2,
    q: '¿Activará el PSOE una iniciativa fiscal antes del cierre del semestre?',
    a: 'Probabilidad estimada: **62%**. Indicadores: Hacienda ha movido a 3 técnicos a Presupuestos esta semana, Montero canceló agenda exterior del 14-18 mayo, y el filtrado a *El País* del lunes apunta a una rebaja en el IRPF de tramos bajos.\n\nVentana óptima política: **18-25 mayo** (antes del Consejo Europeo del 27). Detalle en `/proyectos`.',
  },
  {
    n: 3,
    q: '¿Qué impacto tiene el bloqueo de Junts en la coalición de investidura a 12 meses?',
    a: 'Sin Junts el bloque de investidura cae a **172 escaños** (insuficiente). Tres caminos a 12 meses:\n\n• **45%** Junts vuelve con concesión fiscal (transferencia IRPF)\n• **30%** Reformulación de mayoría con CC + abstención de PNV en clave (170-175)\n• **25%** Adelanto electoral antes de Q1 2027\n\nVer escenarios completos en `/escenarios` y simular votación en `/congreso`.',
  },
]

const WELCOME_TEXT = 'El PP consolida su liderazgo en intención de voto (+0,4 pp esta semana) mientras el PSOE mantiene posiciones tras la última intervención del presidente. La narrativa de vivienda continúa en aceleración (+18% menciones 24h) con una emoción dominante de frustración. La amnistía vuelve al primer plano tras dos decisiones judiciales que dividen al socio Junts. En lo económico, el IPC subyacente sorprende a la baja, lo que abre margen al gobierno para una intervención en política fiscal antes del cierre del semestre.'

function fakeReply(q: string): string {
  const lower = q.toLowerCase()
  // Coincidencias por palabras clave para preguntas libres
  if (lower.includes('vox')) return 'VOX se mantiene en **12,4%** (-0,3 vs semana pasada). El espacio entre PP y VOX se sigue estrechando: -2,1 pp en 90 días. Aragón y Murcia son las CCAA donde más capilaridad pierden.'
  if (lower.includes('sumar') || lower.includes('podemos')) return 'Sumar oscila entre **9,8%-10,6%** (IC95). El bloque progresista total (PSOE+Sumar+Bildu+ERC+BNG+PNV) suma **174 escaños** estimados. Por debajo del umbral de mayoría absoluta.'
  if (lower.includes('encuesta') || lower.includes('sondeo')) return 'Última encuesta consolidada: **PP 32,1% · PSOE 26,8% · VOX 12,4% · Sumar 10,2%**. La media de 14 casas encuestadoras de las últimas 2 semanas. Siguiente bloque CIS previsto para el 9 de mayo.'
  if (lower.includes('vivienda')) return 'La narrativa de vivienda registra un pico de **+18% menciones 24h** y emoción dominante de frustración. PSOE y Sumar lideran exposición pero con tono defensivo. Detalle en `/medios-narrativa`.'
  if (lower.includes('riesgo') || lower.includes('crisis')) return 'Termómetro de Riesgo Político actual: **38/100 (medio-alto)**. Los componentes que más han subido son Estabilidad de coalición (-12 pts en 7 días) y Polarización mediática (+8 pts). Ver `/riesgo`.'
  if (lower.includes('pnv') || lower.includes('junts')) return 'Junts ha endurecido posiciones tras la última reunión bilateral. Probabilidad estimada de retirada formal de apoyo: **38%** (vs 22% hace un mes). PNV mantiene posición negociadora pero exige avances en transferencia ferroviaria antes del 15 de mayo.'
  return 'No tengo una respuesta directa para esa consulta en el contexto actual. Puedo profundizar si me indicas un actor, sector o tema específico — o pulsa **"Profundizar con Politeia"** para abrir una sesión completa de análisis.'
}

type BriefingResponse = MorningBriefing & { _meta?: { source: string; ts: string } }

export default function BrainBriefing() {
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Briefing real desde el backend ElectSim · refresh cada 5 min
  const { data: briefing, source, updatedAt, refresh } = useApi<BriefingResponse>(
    '/api/briefings/morning?workspace_id=default',
    { refreshInterval: 300_000 }
  )

  // Texto de bienvenida y preguntas: si hay briefing del backend lo usamos,
  // si no caemos a las constantes locales.
  const welcomeText = briefing?.executive_summary || WELCOME_TEXT
  const threeQuestions = (briefing?.three_questions && briefing.three_questions.length > 0)
    ? briefing.three_questions.map((q, i) => ({ n: i + 1, q, a: '' }))
    : PRESET_QUESTIONS
  const analystNote = briefing?.analyst_note
  const briefingMode = briefing?.mode

  // ─── Persistencia de conversación en localStorage ─────────────────────
  // Se carga lazy en el primer render y se sincroniza en cada cambio.
  // Clave por día para que cada mañana empiece limpia.
  const sessionKey = useMemo(() => {
    const d = new Date()
    return `politeia.brain.${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(sessionKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as Msg[]
      return Array.isArray(parsed) ? parsed.slice(-30) : []
    } catch {
      return []
    }
  })

  // Sync messages → localStorage (debounced via React batching)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(sessionKey, JSON.stringify(messages.slice(-30)))
    } catch {
      // localStorage lleno o desactivado, ignorar
    }
  }, [messages, sessionKey])

  // Pre-warm del context builder al montar — así la primera pregunta del
  // usuario tiene el contexto ya cacheado (latencia -1 a -2s).
  useEffect(() => {
    fetch('/api/brain/warmup').catch(() => {/* silent */})
  }, [])

  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  // Qué tool está ejecutándose en este momento (para indicador visual)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  async function ask(q: string) {
    const text = q.trim()
    if (!text || thinking) return
    const newMessages: Msg[] = [...messages, { role: 'user', text, ts: Date.now() }]
    setMessages(newMessages)
    setInput('')
    setThinking(true)

    // Las preguntas pre-definidas LOCALES (fallback) tienen respuesta curada
    // al instante. Las que vienen del backend (`briefing.three_questions`) NO
    // tienen respuesta curada → van directo al LLM como cualquier texto libre.
    const preset = PRESET_QUESTIONS.find(p => p.q === text && p.a)
    if (preset) {
      setTimeout(() => {
        setMessages(m => [...m, { role: 'brain', text: preset.a, ts: Date.now() }])
        setThinking(false)
      }, 400 + Math.random() * 300)
      return
    }

    // Texto libre → llamamos al LLM (Anthropic / backend / Ollama / mock
    // según LLM_PROVIDER en Vercel). El endpoint inyecta contexto vivo
    // del dashboard y puede invocar tools (get_polls, get_actor_profile,
    // etc.) si la pregunta lo requiere.
    try {
      const res = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      })
      const data: {
        reply: string
        source: 'anthropic' | 'ollama' | 'backend' | 'fallback'
        model?: string
        tools_used?: Array<{ name: string; input: Record<string, unknown>; ms: number }>
        ms?: number
      } = await res.json()
      const reply = (data.source !== 'fallback' && data.reply.trim().length > 0)
        ? data.reply
        : fakeReply(text)
      const newBrainMsg: Msg = {
        role: 'brain',
        text: reply,
        ts: Date.now(),
        model: data.model,
        source: data.source,
        toolsUsed: data.tools_used,
        ms: data.ms,
      }
      setMessages(m => [...m, newBrainMsg])

      // Auto-generar 3 sugerencias de follow-up en background (no bloquea)
      // Solo cuando la respuesta vino de Anthropic (real LLM)
      if (data.source === 'anthropic' && reply.length > 30) {
        fetch('/api/brain/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_question: text,
            brain_answer: reply.slice(0, 600),
          }),
        })
          .then(r => r.ok ? r.json() : null)
          .then((fu: { suggestions?: string[] } | null) => {
            if (fu?.suggestions && fu.suggestions.length > 0) {
              setMessages(prev => prev.map(m =>
                m.ts === newBrainMsg.ts ? { ...m, followUps: fu.suggestions } : m
              ))
            }
          })
          .catch(() => {/* silent */})
      }
    } catch {
      setMessages(m => [...m, { role: 'brain', text: fakeReply(text), ts: Date.now() }])
    } finally {
      setThinking(false)
    }
  }

  function onSubmit(e: FormEvent) { e.preventDefault(); ask(input) }

  return (
    <section style={{
      background: 'linear-gradient(135deg,#0F1F3D 0%,#0A1428 100%)',
      borderRadius: 22, padding: '28px 32px 24px', marginBottom: 22, color: '#e8e8ed',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow decorativo */}
      <div style={{ position: 'absolute', top: -120, right: -120, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,33,182,0.35) 0%, transparent 70%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', bottom: -100, left: -80, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,78,140,0.25) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      <div style={{ position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)' }}>
                BRIEFING MATINAL · POLITEIA
              </span>
              {briefingMode === 'real' && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#fff', background: '#10b981', padding: '2px 6px', borderRadius: 4 }}>LIVE</span>}
              {briefingMode === 'demo' && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#0F1F3D', background: '#fbbf24', padding: '2px 6px', borderRadius: 4 }}>DEMO</span>}
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
            </div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, letterSpacing: '-0.022em', lineHeight: 1.1, color: '#fff' }}>
              Buenos días, <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>Analista</em>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span style={{ textTransform: 'capitalize' }}>{today}</span>
            </div>
          </div>
          <Link href="/briefing" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', padding: '7px 14px', borderRadius: 999,
            fontSize: 11.5, fontWeight: 600, textDecoration: 'none', flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Ver briefing completo
          </Link>
        </div>

        {/* Texto narrativo · viene del backend si está conectado.
            Marcado como INFERIDO para que el usuario sepa que es lectura
            analítica generada por el modelo, no datos crudos. */}
        <div style={{
          margin: '0 0 14px', padding: '12px 16px', borderRadius: 10,
          background: 'rgba(37,99,235,0.10)', borderLeft: '3px solid #60A5FA',
          border: '1px solid rgba(96,165,250,0.25)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
            fontSize: 10, fontWeight: 800, color: '#93C5FD',
            letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>
            <span>◆</span>LECTURA ANALÍTICA · INFERIDO
            <span title="Interpretación derivada por el modelo a partir de las señales SIGINT disponibles · requiere validación humana antes de informar decisiones."
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 12, height: 12, borderRadius: '50%',
                    background: 'rgba(147,197,253,0.20)', color: '#93C5FD',
                    fontSize: 8, fontWeight: 800, cursor: 'help', marginLeft: 2,
                  }}>?</span>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: '#fff', maxWidth: 980 }}>
            {welcomeText}
          </p>
        </div>

        {/* Preguntas predefinidas · 3 del backend o las locales como fallback.
            Marcadas como PROYECTADO (escenarios para explorar) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
          fontSize: 10, fontWeight: 800, color: 'rgba(252,211,77,0.95)',
          letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          <span>◐</span>ESCENARIOS PARA EXPLORAR · PROYECTADO
          <span title="Posibles evoluciones · hipótesis prospectivas · no son predicciones deterministas."
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'rgba(252,211,77,0.20)', color: 'rgba(252,211,77,0.95)',
                  fontSize: 8, fontWeight: 800, cursor: 'help', marginLeft: 2,
                }}>?</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {threeQuestions.map(p => (
            <button key={p.n} onClick={() => ask(p.q)} disabled={thinking} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
              color: '#fff', padding: '12px 14px', borderRadius: 12,
              cursor: thinking ? 'not-allowed' : 'pointer', textAlign: 'left',
              fontFamily: 'inherit', transition: 'all 160ms',
              display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'rgba(91,33,182,0.4)', border: '1px solid rgba(139,92,246,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>{p.n}</div>
              <span style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.85)' }}>{p.q}</span>
            </button>
          ))}
        </div>

        {/* Conversación inline (si hay) */}
        {(messages.length > 0 || thinking) && (
          <div ref={scrollRef} style={{
            background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 14,
            maxHeight: 320, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '88%',
                  padding: '8px 12px', borderRadius: 12,
                  background: m.role === 'user' ? 'rgba(91,33,182,0.5)' : 'rgba(255,255,255,0.06)',
                  border: m.role === 'user' ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: 12.5, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                }}>
                  {m.text.split('**').map((seg, j) => j % 2 === 1
                    ? <strong key={j} style={{ color:'#fbbf24' }}>{seg}</strong>
                    : <span key={j}>{seg.split('`').map((s, k) => k % 2 === 1
                        ? <code key={k} style={{ background:'rgba(255,255,255,0.1)', padding:'1px 5px', borderRadius:4, fontSize:11.5, fontFamily:'ui-monospace,monospace' }}>{s}</code>
                        : s)}</span>
                  )}
                </div>
                {/* Metadata: tools usadas + modelo + latencia (solo brain) */}
                {m.role === 'brain' && (m.toolsUsed?.length || m.model || m.ms) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, maxWidth: '88%' }}>
                    {m.toolsUsed?.map((t, k) => (
                      <span key={k} title={`${t.name}(${JSON.stringify(t.input)}) · ${t.ms}ms`} style={{
                        fontSize: 9.5, padding: '1px 5px', borderRadius: 4,
                        background: 'rgba(167,139,250,0.15)', color: '#c4b5fd',
                        border: '1px solid rgba(167,139,250,0.3)', letterSpacing: '0.02em',
                        fontFamily: 'ui-monospace,monospace',
                      }}>
                        ⚒ {t.name}
                      </span>
                    ))}
                    {m.source === 'anthropic' && m.model && (
                      <span style={{
                        fontSize: 9.5, padding: '1px 5px', borderRadius: 4,
                        background: 'rgba(16,185,129,0.15)', color: '#6ee7b7',
                        border: '1px solid rgba(16,185,129,0.3)', letterSpacing: '0.02em',
                      }}>
                        Claude {m.model.includes('haiku') ? 'Haiku' : 'Sonnet'}
                      </span>
                    )}
                    {m.ms && m.ms > 0 && (
                      <span style={{
                        fontSize: 9.5, color: 'rgba(255,255,255,0.45)',
                        letterSpacing: '0.02em',
                      }}>
                        {m.ms < 1000 ? `${m.ms}ms` : `${(m.ms/1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>
                )}
                {/* Follow-ups: sugerencias de pregunta de seguimiento */}
                {m.role === 'brain' && m.followUps && m.followUps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6, maxWidth: '88%' }}>
                    {m.followUps.slice(0, 3).map((fu, k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => ask(fu)}
                        disabled={thinking}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          color: 'rgba(255,255,255,0.75)',
                          fontSize: 10.5,
                          padding: '3px 8px',
                          borderRadius: 6,
                          cursor: thinking ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          maxWidth: '100%',
                          lineHeight: 1.4,
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={(e) => {
                          if (!thinking) {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.15)'
                            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(167,139,250,0.3)'
                            ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.10)'
                          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'
                        }}
                      >
                        → {fu}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding:'8px 12px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', display:'inline-flex', gap:4, alignItems:'center' }}>
                  {[0,1,2].map(i => <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#a78bfa', animation:`brainDot 1.2s ${i*0.15}s infinite` }}/>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick actions · botones de prompt rápido */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {[
            { label: '☀ Resumen del día', prompt: 'Resume lo más importante del día en 3 frases.' },
            { label: '📊 Última encuesta', prompt: '¿Cómo va la última encuesta?' },
            { label: '⚠ Alertas críticas', prompt: '¿Qué alertas críticas hay activas ahora?' },
            { label: '🔥 Narrativas calientes', prompt: '¿Qué narrativas están acelerándose?' },
            { label: '🏛 Estado coalición', prompt: '¿Cómo está la coalición de gobierno?' },
            { label: '🌡 Riesgo político', prompt: '¿Cómo va el índice de riesgo?' },
          ].map((qa) => (
            <button
              key={qa.label}
              type="button"
              disabled={thinking}
              onClick={() => ask(qa.prompt)}
              style={{
                background: 'rgba(167,139,250,0.10)',
                border: '1px solid rgba(167,139,250,0.25)',
                color: '#c4b5fd',
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 9px',
                borderRadius: 999,
                cursor: thinking ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                transition: 'all 150ms',
                opacity: thinking ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!thinking) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.20)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.10)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#c4b5fd'
              }}
            >
              {qa.label}
            </button>
          ))}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([])
                if (typeof window !== 'undefined') window.localStorage.removeItem(sessionKey)
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 10.5,
                padding: '4px 9px',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginLeft: 'auto',
              }}
              title="Limpiar conversación"
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Input + footer */}
        <form onSubmit={onSubmit} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12, padding: '6px 6px 6px 14px',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#a78bfa">
            <path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/>
          </svg>
          <input
            type="text"
            placeholder="Pregunta a Politeia sobre lo que ha pasado hoy…"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              color: '#fff', fontFamily: 'inherit', fontSize: 13, padding: '8px 0',
            }}
          />
          <button type="submit" disabled={!input.trim() || thinking} style={{
            background: input.trim() && !thinking ? 'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)' : 'rgba(255,255,255,0.08)',
            color: input.trim() && !thinking ? '#fff' : 'rgba(255,255,255,0.3)',
            border: 'none', borderRadius: 8, padding: '7px 14px',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'all 160ms',
          }}>
            Preguntar
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8l12-6-3 6 3 6L2 8z"/></svg>
          </button>
        </form>

        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(167,139,250,0.10)', borderLeft: '3px solid #A78BFA',
          border: '1px solid rgba(167,139,250,0.25)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, color: '#C4B5FD', letterSpacing: '0.10em',
              textTransform: 'uppercase', flexShrink: 0, marginTop: 1,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <span>➤</span>NOTA · RECOMENDADO
            </span>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
              {analystNote || 'Semana de inflexión electoral. Vigilar señales de movilización en mayores de 55 años.'}
            </span>
          </div>
          <Link href="/agente-ia" style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
            Profundizar con Politeia →
          </Link>
        </div>
        <p style={{
          marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.45, fontStyle: 'italic',
        }}>
          Aviso metodológico · El briefing combina datos <em>observados</em> con
          interpretaciones <em>inferidas</em> y escenarios <em>proyectados</em>
          generados por IA. No constituye predicción determinista y requiere validación.
        </p>

        <style>{`
          @keyframes brainDot { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
        `}</style>
      </div>
    </section>
  )
}
