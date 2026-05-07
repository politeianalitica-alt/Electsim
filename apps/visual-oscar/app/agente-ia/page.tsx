'use client'
import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

type Msg = { role: 'user' | 'assistant'; text: string; ts: number }

const SUGGESTIONS = [
  '¿Quién ganaría hoy unas generales según la última estimación?',
  'Explica la diferencia entre PP+VOX+CC y la coalición progresista actual',
  'Resumen del Termómetro de Riesgo Político esta semana',
  'Compara los resultados de Madrid en 2019 y 2023',
  '¿Qué provincias son clave para el bloqueo parlamentario?',
]

const WELCOME = 'Hola, soy el Agente IA de Politeia Analítica. Puedo responderte sobre estimación electoral, escenarios de coalición, riesgo político, datos macro y resultados históricos por municipio.\n\nPrueba con una de las sugerencias o escribe tu pregunta.'

// Respuesta simulada (placeholder hasta conectar al backend con LLM)
function fakeReply(q: string): string {
  const lower = q.toLowerCase()
  if (lower.includes('ganaría') || lower.includes('estimacion') || lower.includes('estimación')) {
    return 'Según la **estimación 2026** (media de encuestas, PP en cabeza con 32,1 % y 132 escaños), la única coalición viable hoy sería **PP + VOX + UPN + CC = 175 escaños**, que aún queda 1 escaño por debajo de la mayoría absoluta (176). PSOE + Sumar + nacionalistas suman 179, también con mayoría simple.\n\nFuente: agregación de 14 casas encuestadoras, datos en `/dashboard`.'
  }
  if (lower.includes('coalici') || lower.includes('mayoría') || lower.includes('mayoria')) {
    return 'Cuatro escenarios principales con la estimación actual:\n\n• **PP + VOX**: 172 escaños — insuficiente\n• **PP + VOX + UPN + CC**: 175 — insuficiente por 1\n• **PSOE + Sumar + nacionalistas**: 179 — viable\n• **Gran coalición PP + PSOE**: 261 — viable pero improbable\n\nDetalle en `/escenarios`.'
  }
  if (lower.includes('riesgo') || lower.includes('term')) {
    return 'El **Termómetro de Riesgo Político** marca actualmente **25,8 / 100 (BAJO)**. Componentes:\n\n• Polarización: 72,4 (alta)\n• Volatilidad electoral: estable\n• Gobernabilidad: deteriorada por bloqueo parlamentario\n• Tensión institucional: contenida\n\nDetalle en `/riesgo`.'
  }
  if (lower.includes('madrid')) {
    return 'Madrid municipio (37 escaños provinciales en juego):\n\n• **2019 nov**: PP 479k · PSOE 463k · VOX 281k · UP 229k · Cs 155k\n• **2023**: PP 720k · PSOE 471k · Sumar 284k · VOX 213k\n\nPP creció +50 % en votos absolutos entre 2019 y 2023 absorbiendo casi todo el voto de Cs y parte de VOX.'
  }
  if (lower.includes('bloqueo') || lower.includes('clave')) {
    return 'Provincias clave para desempatar el bloqueo parlamentario:\n\n• **Andalucía** (61 esc): PSOE pierde terreno frente a PP\n• **Cataluña** (48 esc): fragmentación PSC/ERC/Junts/PP\n• **Madrid** (37 esc): PP consolidado, sin margen para PSOE\n• **Valencia** (33 esc): basculante PP↔PSOE\n• **País Vasco** (18 esc): PNV mantiene papel de bisagra\n\nMapa interactivo en `/mapa`.'
  }
  return 'Por ahora soy un placeholder — el backend del modelo todavía no está conectado a esta interfaz. Cuando lo enchufemos, podré consultar la base de datos electoral, encuestas, indicadores macro y mediáticos en tiempo real para responderte.\n\nMientras tanto, prueba una de las sugerencias o navega a la sección concreta del dashboard.'
}

export default function AgenteIAPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', text: WELCOME, ts: Date.now() }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  function send(text: string) {
    const q = text.trim()
    if (!q || thinking) return
    setMessages(m => [...m, { role: 'user', text: q, ts: Date.now() }])
    setInput('')
    setThinking(true)
    // Latencia simulada
    setTimeout(() => {
      setMessages(m => [...m, { role: 'assistant', text: fakeReply(q), ts: Date.now() }])
      setThinking(false)
    }, 700 + Math.random() * 600)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader/>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 28px 40px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 44px)' }}>

        {/* Hero */}
        <section style={{ padding: '24px 0 18px', borderBottom: '1px solid #ECECEF', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#1F4E8C 0%,#0F2A4F 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px -4px rgba(31,78,140,0.5)' }}>
              <svg width="22" height="22" viewBox="0 0 16 16" fill="#fff">
                <path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.018em', margin: 0 }}>Agente IA</h1>
              <p style={{ fontSize: 12, color: '#6e6e73', margin: '2px 0 0' }}>Inteligencia conversacional sobre los datos de Politeia Analítica</p>
            </div>
          </div>
        </section>

        {/* Mensajes */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%',
                padding: '11px 15px',
                borderRadius: 16,
                background: m.role === 'user' ? '#1F4E8C' : '#fff',
                color: m.role === 'user' ? '#fff' : '#1d1d1f',
                border: m.role === 'user' ? 'none' : '1px solid #ECECEF',
                boxShadow: m.role === 'user' ? '0 1px 3px rgba(31,78,140,0.2)' : '0 1px 2px rgba(0,0,0,0.04)',
                fontSize: 13.5,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                animation: 'msgIn 220ms ease-out',
              }}>
                {m.text.split('**').map((seg, j) => j % 2 === 1
                  ? <strong key={j}>{seg}</strong>
                  : <span key={j}>{seg.split('`').map((s, k) => k % 2 === 1
                      ? <code key={k} style={{ background: m.role === 'user' ? 'rgba(255,255,255,0.18)' : '#F5F5F7', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'ui-monospace,monospace' }}>{s}</code>
                      : s)}</span>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '11px 15px', borderRadius: 16, background: '#fff', border: '1px solid #ECECEF', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#86868b', animation: `dot 1.2s ${i*0.15}s infinite` }}/>)}
              </div>
            </div>
          )}
        </div>

        {/* Sugerencias */}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, marginBottom: 8 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} disabled={thinking} style={{
                fontSize: 11.5, padding: '7px 12px', borderRadius: 999,
                border: '1px solid #ECECEF', background: '#fff', color: '#3a3a3d',
                cursor: thinking ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                transition: 'all 160ms',
              }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={onSubmit} style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-end', padding: '10px 12px', background: '#fff', border: '1px solid #ECECEF', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Pregúntame sobre encuestas, escenarios, municipios…"
            rows={1}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none',
              fontFamily: 'inherit', fontSize: 13.5, color: '#1d1d1f',
              background: 'transparent', padding: '6px 0', maxHeight: 120,
            }}
          />
          <button type="submit" disabled={!input.trim() || thinking} style={{
            background: input.trim() && !thinking ? '#1F4E8C' : '#ECECEF',
            color: input.trim() && !thinking ? '#fff' : '#86868b',
            border: 'none', borderRadius: 10, padding: '8px 14px',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
            cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
            transition: 'all 160ms', display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            Enviar
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8l12-6-3 6 3 6L2 8z"/></svg>
          </button>
        </form>

        <div style={{ marginTop: 8, fontSize: 10.5, color: '#86868b', textAlign: 'center' }}>
          Respuestas generadas con datos del dashboard · El backend LLM real se conectará próximamente
        </div>

        <style>{`
          @keyframes msgIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
          @keyframes dot { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
        `}</style>
      </main>
    </div>
  )
}
