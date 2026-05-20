'use client'
import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useBrainStream } from '@/hooks/useBrainStream'
import { useRagSearch, type RagCitation } from '@/hooks/useRagSearch'
import BrainRouteActions from '@/components/BrainRouteActions'

type Msg = {
  role: 'user' | 'assistant'
  text: string
  ts: number
  citations?: RagCitation[]
  toolsUsed?: string[]
  modelUsed?: string
  latencyMs?: number
}

const SUGGESTIONS = [
  '¿Quién ganaría hoy unas generales según la última estimación?',
  'Explica la diferencia entre PP+VOX+CC y la coalición progresista actual',
  'Resumen del Termómetro de Riesgo Político esta semana',
  'Compara los resultados de Madrid en 2019 y 2023',
  'Resume las últimas normas BOE sobre vivienda',
]

const WELCOME = 'Hola, soy **PoliteIA**, el motor analítico de Politeia Analítica. Puedo analizar estimaciones electorales, escenarios de coalición, riesgo político, normativa BOE/EUR-Lex, contratación pública y fondos europeos.\n\nUso fuentes reales en vivo cuando están disponibles. Si activas **Tools**, puedo consultar BOE, Congreso, EUR-Lex y mapa de actores directamente.\n\nPrueba con una sugerencia o escribe tu pregunta.'

export default function AgenteIAPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', text: WELCOME, ts: Date.now() }])
  const [input, setInput] = useState('')
  const [useTools, setUseTools] = useState(false)
  const [useRag, setUseRag] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const brain = useBrainStream()
  const rag = useRagSearch()

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, brain.streaming])

  // Cuando el stream termina, mover el texto a un mensaje persistente con metadata.
  useEffect(() => {
    if (!brain.isStreaming && brain.answer && brain.end) {
      setMessages(prev => {
        const last = prev[prev.length - 1]
        // Sólo añadimos si el último mensaje no es ya el del assistant que acabamos de generar
        if (last?.role === 'assistant' && last.text === brain.answer) return prev
        return [
          ...prev,
          {
            role: 'assistant',
            text: brain.answer,
            ts: Date.now(),
            citations: rag.citations,
            toolsUsed: brain.end?.tools_used,
            modelUsed: brain.end?.model_used,
            latencyMs: brain.end?.latency_ms,
          },
        ]
      })
    }
  }, [brain.isStreaming, brain.answer, brain.end, rag.citations])

  async function send(text: string) {
    const q = text.trim()
    if (!q || brain.isStreaming) return

    setMessages(prev => [...prev, { role: 'user', text: q, ts: Date.now() }])
    setInput('')

    // 1. Si RAG activo, buscar citas semánticas EN PARALELO con el chat
    if (useRag) {
      rag.search(q, { k: 5 })
    } else {
      rag.reset()
    }

    // 2. Streaming del Brain
    const history = messages
      .filter(m => m.text !== WELCOME)  // no incluir el welcome en el contexto LLM
      .map(m => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }))
    brain.send({
      question: q,
      history,
      use_tools: useTools,
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  // Render auxiliar de texto con **negrita** y `código`
  function renderText(text: string) {
    return text.split('**').map((seg, j) => j % 2 === 1
      ? <strong key={j}>{seg}</strong>
      : <span key={j}>{seg.split('`').map((s, k) => k % 2 === 1
          ? <code key={k} style={{ background: '#F5F5F7', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'ui-monospace,monospace' }}>{s}</code>
          : s)}</span>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader/>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '0 28px 40px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 44px)' }}>

        {/* Hero */}
        <section style={{ padding: '24px 0 18px', borderBottom: '1px solid #ECECEF', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#1F4E8C 0%,#0F2A4F 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px -4px rgba(31,78,140,0.5)' }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="#fff">
                  <path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/>
                </svg>
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.018em', margin: 0 }}>Brain</h1>
                <p style={{ fontSize: 12, color: '#6e6e73', margin: '2px 0 0' }}>Inteligencia conversacional · streaming · tool-use · RAG</p>
              </div>
            </div>
            {/* Toggles */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Toggle
                active={useTools}
                onClick={() => setUseTools(v => !v)}
                label={`Tools ${useTools ? '· on' : ''}`}
                hint="BOE, EUR-Lex, Congreso, actores"
              />
              <Toggle
                active={useRag}
                onClick={() => setUseRag(v => !v)}
                label={`RAG ${useRag ? '· on' : ''}`}
                hint="Citas semánticas del vector store"
              />
            </div>
          </div>
        </section>

        {/* Mensajes */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
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
                {renderText(m.text)}
              </div>
              {/* Botones CTA · rutas del dashboard mencionadas en la respuesta */}
              {m.role === 'assistant' && (
                <BrainRouteActions text={m.text} theme="light"/>
              )}
              {/* Citas RAG + metadata por mensaje */}
              {m.role === 'assistant' && (m.citations?.length || m.toolsUsed?.length) ? (
                <MessageMeta citations={m.citations} toolsUsed={m.toolsUsed} modelUsed={m.modelUsed} latencyMs={m.latencyMs}/>
              ) : null}
            </div>
          ))}

          {/* Stream en curso */}
          {brain.isStreaming && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '11px 15px', borderRadius: 16,
                background: '#fff', border: '1px solid #ECECEF', color: '#1d1d1f',
                fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap',
              }}>
                {brain.streaming ? renderText(brain.streaming) : (
                  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#86868b', animation: `dot 1.2s ${i*0.15}s infinite` }}/>)}
                  </span>
                )}
                <span style={{ display: 'inline-block', width: 2, height: 14, marginLeft: 2, background: '#1F4E8C', animation: 'blink 1s infinite' }}/>
              </div>
              {/* Citas RAG llegan en paralelo */}
              {(rag.citations.length > 0 || rag.isLoading) && (
                <MessageMeta citations={rag.citations} loading={rag.isLoading}/>
              )}
            </div>
          )}
        </div>

        {/* Sugerencias */}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, marginBottom: 8 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} disabled={brain.isStreaming} style={{
                fontSize: 11.5, padding: '7px 12px', borderRadius: 999,
                border: '1px solid #ECECEF', background: '#fff', color: '#3a3a3d',
                cursor: brain.isStreaming ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
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
            placeholder={brain.isStreaming ? 'Generando respuesta…' : 'Pregúntame sobre encuestas, escenarios, BOE, contratos, fondos UE…'}
            rows={1}
            disabled={brain.isStreaming}
            style={{
              flex: 1, border: 'none', outline: 'none', resize: 'none',
              fontFamily: 'inherit', fontSize: 13.5, color: '#1d1d1f',
              background: 'transparent', padding: '6px 0', maxHeight: 120,
            }}
          />
          {brain.isStreaming ? (
            <button type="button" onClick={brain.cancel} style={{
              background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10,
              padding: '8px 14px', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}>Detener</button>
          ) : (
            <button type="submit" disabled={!input.trim()} style={{
              background: input.trim() ? '#1F4E8C' : '#ECECEF',
              color: input.trim() ? '#fff' : '#86868b',
              border: 'none', borderRadius: 10, padding: '8px 14px',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 160ms', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              Enviar
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M2 8l12-6-3 6 3 6L2 8z"/></svg>
            </button>
          )}
        </form>

        {/* Estado del Brain */}
        <div style={{ marginTop: 8, fontSize: 10.5, color: '#86868b', textAlign: 'center' }}>
          {brain.end?.mode === 'ollama+stream'  && <>Respuesta en vivo de <strong style={{color:'#10b981'}}>PoliteIA</strong> · </>}
          {brain.end?.mode === 'ollama+tools'   && <>PoliteIA con <strong style={{color:'#10b981'}}>{brain.end?.tools_used?.length ?? 0} tools</strong> · </>}
          {brain.error                          && <>Error: <strong style={{color:'#DC2626'}}>{brain.error}</strong> · </>}
          {brain.end?.latency_ms                && <>{brain.end.latency_ms} ms · </>}
          motor: <code style={{fontSize:10.5,background:'#F5F5F7',padding:'1px 5px',borderRadius:3}}>PoliteIA</code>
        </div>

        <style>{`
          @keyframes msgIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
          @keyframes dot { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        `}</style>
      </main>
    </div>
  )
}

function Toggle({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      onClick={onClick}
      title={hint}
      style={{
        padding: '5px 12px', borderRadius: 999,
        border: `1px solid ${active ? '#1F4E8C' : '#ECECEF'}`,
        background: active ? 'rgba(31,78,140,0.08)' : '#fff',
        color: active ? '#1F4E8C' : '#6e6e73',
        fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all 160ms',
      }}
    >
      {label}
    </button>
  )
}

function MessageMeta({ citations, toolsUsed, modelUsed, latencyMs, loading }: {
  citations?: RagCitation[]
  toolsUsed?: string[]
  modelUsed?: string
  latencyMs?: number
  loading?: boolean
}) {
  const hasCitations = citations && citations.length > 0
  const hasTools = toolsUsed && toolsUsed.length > 0
  if (!hasCitations && !hasTools && !loading) return null
  return (
    <div style={{ marginTop: 6, maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {loading && !hasCitations && (
        <div style={{ fontSize: 10.5, color: '#86868b', fontStyle: 'italic' }}>Buscando fuentes…</div>
      )}
      {hasCitations && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 4 }}>
            Fuentes consultadas · {citations!.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {citations!.map(c => (
              <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', padding: '6px 10px', borderRadius: 8,
                background: '#F5F5F7', border: '1px solid #ECECEF',
                textDecoration: 'none', color: '#1d1d1f',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#1F4E8C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {c.source}{c.domain ? ` · ${c.domain}` : ''}
                  </span>
                  {c.score != null && (
                    <span style={{ fontSize: 10, color: '#86868b' }}>score {c.score.toFixed(2)}</span>
                  )}
                </div>
                {c.title && (
                  <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 2 }}>{c.title}</div>
                )}
                <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.4 }}>{c.snippet}</div>
              </a>
            ))}
          </div>
        </div>
      )}
      {hasTools && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <span style={{ fontSize: 10, color: '#6e6e73' }}>Tools:</span>
          {toolsUsed!.map(t => (
            <code key={t} style={{ fontSize: 10, background: '#EEF2FF', color: '#3730A3', padding: '1px 6px', borderRadius: 4 }}>{t}</code>
          ))}
        </div>
      )}
      {(modelUsed || latencyMs) && (
        <div style={{ fontSize: 10, color: '#86868b' }}>
          {modelUsed && <>modelo <code style={{background:'#F5F5F7',padding:'1px 5px',borderRadius:3}}>{modelUsed}</code> · </>}
          {latencyMs && <>{latencyMs} ms</>}
        </div>
      )}
    </div>
  )
}
