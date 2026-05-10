'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import IntelCard from '../_components/intel/IntelCard'
import IntelBadge from '../_components/intel/IntelBadge'
import { isAuthenticated } from '@/lib/auth'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { BrainMessage } from '@/types/intelligence'

const SUGERENCIAS = [
  'Cual es la probabilidad de adelanto electoral?',
  'Resume el impacto de la sentencia TC sobre vivienda',
  'Que estrategia esta siguiendo el PP?',
  'Mapea los riesgos politicos para mayo 2026',
]

function Avatar({ role }: { role: BrainMessage['role'] }) {
  const isUser = role === 'user'
  const bg = isUser ? '#1F4E8C' : '#0F766E'
  const initial = isUser ? 'TU' : 'IA'
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: bg, color: '#fff', fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      letterSpacing: '0.04em', fontFamily: 'var(--font-display)',
    }}>{initial}</div>
  )
}

export default function PoliteiaBrainPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [messages, setMessages] = useState<BrainMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setInput('')
    const userMsg: BrainMessage = { id: `m-${Date.now()}`, role: 'user', content: trimmed, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setBusy(true)
    try {
      const reply = await intelligenceApi.sendBrainMessage([
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed },
      ])
      const aiMsg: BrainMessage = { id: `m-${Date.now() + 1}`, role: 'assistant', content: reply || 'No hubo respuesta.', created_at: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, { id: `m-${Date.now() + 2}`, role: 'assistant', content: 'No se pudo obtener respuesta. Intentalo de nuevo.', created_at: new Date().toISOString() }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 30px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)' }}>
        <header style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: '#6e6e73', textTransform: 'uppercase', margin: '0 0 6px' }}>POLITEIA BRAIN</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.022em', margin: '0 0 4px' }}>Asistente analitico</h1>
          <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>Pregunta sobre la base de evidencias, riesgo, electoral o regulatorio. Las respuestas integran citas a la base.</p>
        </header>

        <IntelCard padding="0" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 && (
              <div>
                <p style={{ fontSize: 13, color: '#6e6e73', marginTop: 0, marginBottom: 14 }}>Empieza con una de estas sugerencias:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                  {SUGERENCIAS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      style={{
                        textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid #ECECEF',
                        background: '#fff', color: '#1d1d1f', fontSize: 12.5, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.4,
                      }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar role={m.role} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#86868b', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {m.role === 'user' ? 'Tu' : 'Politeia Brain'}
                  </div>
                  <div style={{
                    background: m.role === 'user' ? '#F5F5F7' : '#fff',
                    border: m.role === 'assistant' ? '1px solid #ECECEF' : 'none',
                    borderRadius: 12, padding: '12px 14px',
                    fontSize: 13.5, color: '#1d1d1f', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  }}>{m.content}</div>
                  {m.citas && m.citas.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {m.citas.map(c => (
                        <IntelBadge key={c.titulo} color="#0F766E" variant="outline" size="xs">{c.titulo}</IntelBadge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar role="assistant" />
                <div style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#86868b' }}>
                  Pensando...
                </div>
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid #ECECEF', padding: '12px 16px', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="Escribe tu pregunta..."
              style={{ flex: 1, padding: '11px 16px', border: '1px solid #ECECEF', borderRadius: 999, background: '#fff', fontSize: 13.5, fontFamily: 'inherit', color: '#1d1d1f' }}
            />
            <button onClick={() => send(input)} disabled={busy || !input.trim()}
              style={{ background: '#1F4E8C', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}>
              Enviar
            </button>
          </div>
        </IntelCard>
      </main>
    </div>
  )
}
