'use client'
/**
 * <BrainCopilotPanel /> · Pilar 3 · copiloto context-aware en /investigations/[id].
 *
 * Panel deslizable a la derecha (340px) que toggle con Cmd+J. Sabe qué
 * investigación está abierta y qué entidades están pinneadas. Ofrece
 * acciones rápidas (resumen_caso, hipótesis_ach, sources_evidencia,
 * generar_briefing, perfil_actor, coalición) + input free-form.
 *
 * Muestra:
 *   - Respuesta (markdown ligero)
 *   - Tool trace (cada llamada al brain con latencia + ok/error)
 *   - Sources (URLs citadas)
 *   - Suggested actions (chips clicables)
 *
 * El razonamiento es visible (Pilar 3 de la visión 2027) · cumple AI Act.
 */
import { useEffect, useRef, useState } from 'react'
import type { InvestigationDetail } from '@/types/investigations'

type CopilotAction =
  | 'resumen_caso'
  | 'hipotesis_ach'
  | 'sources_evidencia'
  | 'generar_briefing'
  | 'perfil_actor'
  | 'coalicion'
  | 'free_query'

interface ToolTraceEntry {
  tool: string
  input_summary: string
  ok: boolean
  latency_ms: number
  error?: string | null
}
interface SuggestedAction {
  action: CopilotAction
  label: string
  rationale: string
}
interface CopilotResponse {
  answer: string
  structured: Record<string, unknown>
  tool_trace: ToolTraceEntry[]
  sources: string[]
  suggested_actions: SuggestedAction[]
  latency_ms: number
  model?: string
  ok: boolean
  error?: string | null
}

interface ConversationEntry {
  id: string
  prompt: string
  action: CopilotAction
  response?: CopilotResponse
  pending: boolean
  ts: string
}

const ACTION_BUTTONS: { action: CopilotAction; label: string; hint: string }[] = [
  { action: 'resumen_caso',      label: 'Resumen del caso',     hint: 'Sintetiza con las entidades fijadas' },
  { action: 'hipotesis_ach',     label: 'Hipótesis ACH',        hint: 'Escenarios competing iniciales' },
  { action: 'sources_evidencia', label: 'Sugiere fuentes',      hint: 'URLs validadas para evidencia' },
  { action: 'generar_briefing',  label: 'Borrador SITREP',      hint: 'Producto entregable' },
  { action: 'perfil_actor',      label: 'Perfil de actor',      hint: 'Sobre el primer actor pinneado' },
  { action: 'coalicion',         label: 'Viabilidad coalición', hint: 'Si hay 2+ partidos fijados' },
]

export function BrainCopilotPanel({
  open, onClose, detail,
}: {
  open: boolean
  onClose: () => void
  detail: InvestigationDetail | null
}) {
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [conversation])

  async function send(action: CopilotAction, prompt?: string) {
    if (busy || !detail) return
    const text = (prompt ?? input).trim()
    if (!text && action === 'free_query') return
    setBusy(true)
    const id = `${action}-${Date.now()}`
    const entry: ConversationEntry = {
      id, action,
      prompt: text || ACTION_BUTTONS.find(b => b.action === action)?.label || action,
      pending: true,
      ts: new Date().toISOString(),
    }
    setConversation((c) => [...c, entry])
    if (!prompt) setInput('')

    try {
      const uid = (typeof window !== 'undefined' ? window.localStorage.getItem('politeia.user_id') : null) || 'demo'
      const res = await fetch('/api/brain/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
        body: JSON.stringify({
          prompt: text || ACTION_BUTTONS.find(b => b.action === action)?.label,
          action,
          investigation_id: detail.id,
          pinned_entity_ids: detail.pinned.map(p => p.entity_id),
        }),
      })
      const data = await res.json() as CopilotResponse
      setConversation((c) => c.map(e => e.id === id ? { ...e, response: data, pending: false } : e))
    } catch (err) {
      setConversation((c) => c.map(e => e.id === id ? {
        ...e, pending: false,
        response: {
          answer: `Error de red: ${String(err).slice(0, 160)}`,
          structured: {}, tool_trace: [], sources: [], suggested_actions: [],
          latency_ms: 0, ok: false,
        },
      } : e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const pinnedCount = detail?.pinned.length ?? 0

  return (
    <aside style={{
      position: 'fixed', right: 0, top: 0, bottom: 0,
      width: 360, zIndex: 900,
      background: 'var(--color-surface, #fff)',
      borderLeft: '1px solid var(--color-hairline, #ECECEF)',
      boxShadow: '0 0 32px rgba(0,0,0,0.10)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-text, system-ui)',
    }}>
      {/* Header */}
      <header style={{
        padding: '14px 18px', borderBottom: '1px solid var(--color-hairline-soft, #ECECEF)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: detail ? 'var(--color-success, #2d8a39)' : 'var(--color-ink-5, #aeaeb2)',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'var(--color-ink-4, #6e6e73)',
          }}>
            Copiloto · Groq Brain
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-ink-3, #515154)' }}>
            {detail
              ? `${pinnedCount} entidad${pinnedCount === 1 ? '' : 'es'} · contexto del caso`
              : 'sin investigación activa'}
          </div>
        </div>
        <button onClick={onClose} title="Cerrar (⌘J)" style={{
          background: 'transparent', border: 'none',
          color: 'var(--color-ink-4, #6e6e73)', cursor: 'pointer',
          fontSize: 18, padding: 4, lineHeight: 1,
        }}>×</button>
      </header>

      {/* Action buttons */}
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--color-hairline-soft, #ECECEF)',
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
      }}>
        {ACTION_BUTTONS.map(btn => (
          <button
            key={btn.action}
            onClick={() => void send(btn.action)}
            disabled={busy}
            title={btn.hint}
            style={{
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--color-surface-raised, #f5f5f7)',
              border: '1px solid var(--color-hairline, #ECECEF)',
              color: 'var(--color-ink-2, #3a3a3d)',
              fontSize: 11.5, fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.5 : 1,
              fontFamily: 'inherit', textAlign: 'left',
              lineHeight: 1.3,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {conversation.length === 0 && (
          <div style={{
            padding: 16, fontSize: 12.5, color: 'var(--color-ink-4, #6e6e73)',
            lineHeight: 1.55,
            background: 'var(--color-surface-raised, #f5f5f7)',
            borderRadius: 10,
          }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--color-ink-2, #3a3a3d)' }}>
              Hola. Soy tu copiloto en este caso.
            </p>
            <p style={{ margin: 0, fontSize: 11.5 }}>
              Conozco las {pinnedCount} entidades fijadas y los artefactos del notebook,
              hipótesis y evidencias. Usa los botones de acción o pregúntame algo
              concreto. Te muestro qué tools del brain estoy usando y cuánto tardan.
            </p>
          </div>
        )}
        {conversation.map((entry) => (
          <ConversationItem key={entry.id} entry={entry} onAction={send} />
        ))}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); void send('free_query') }}
            style={{
              padding: 14, borderTop: '1px solid var(--color-hairline-soft, #ECECEF)',
              background: 'var(--color-surface-raised, #f5f5f7)',
            }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send('free_query')
            }
          }}
          placeholder="Pregunta o instrucción · Enter envía · Shift+Enter salto de línea"
          style={{
            width: '100%', minHeight: 56, maxHeight: 160,
            padding: 10, borderRadius: 8,
            border: '1px solid var(--color-hairline, #ECECEF)',
            background: 'var(--color-bg, #fbfbfd)',
            fontFamily: 'inherit', fontSize: 13, color: 'var(--color-ink, #1d1d1f)',
            resize: 'vertical', outline: 'none',
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 8, fontSize: 10, color: 'var(--color-ink-5, #aeaeb2)',
        }}>
          <span>
            <kbd style={kbdStyle}>⌘J</kbd> cerrar
          </span>
          <button type="submit" disabled={!input.trim() || busy} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: 'var(--color-accent, #0071e3)', color: '#fff',
            fontSize: 12, fontWeight: 600,
            cursor: !input.trim() || busy ? 'not-allowed' : 'pointer',
            opacity: !input.trim() || busy ? 0.5 : 1,
            fontFamily: 'inherit',
          }}>
            {busy ? 'Pensando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────
// Conversation item
// ─────────────────────────────────────────────────────────────────

function ConversationItem({
  entry, onAction,
}: {
  entry: ConversationEntry
  onAction: (a: CopilotAction, prompt?: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* User message */}
      <div style={{
        alignSelf: 'flex-end', maxWidth: '85%',
        padding: '8px 12px', borderRadius: 12,
        background: 'var(--color-accent-subtle, rgba(0,113,227,0.08))',
        fontSize: 12.5, color: 'var(--color-ink, #1d1d1f)',
        lineHeight: 1.4,
      }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                      color: 'var(--color-accent-text, #0066cc)', textTransform: 'uppercase',
                      marginBottom: 3 }}>
          {entry.action.replace(/_/g, ' ')}
        </div>
        {entry.prompt}
      </div>

      {/* Response */}
      {entry.pending ? (
        <div style={{
          alignSelf: 'flex-start', maxWidth: '90%',
          padding: '8px 12px', borderRadius: 12,
          background: 'var(--color-surface-raised, #f5f5f7)',
          fontSize: 12, color: 'var(--color-ink-4, #6e6e73)',
          fontStyle: 'italic',
        }}>
          Razonando con el contexto del caso…
        </div>
      ) : entry.response ? (
        <div style={{ alignSelf: 'flex-start', maxWidth: '95%', width: '95%' }}>
          {/* Answer */}
          <div style={{
            padding: '10px 12px', borderRadius: 12,
            background: 'var(--color-surface-raised, #f5f5f7)',
            fontSize: 12.5, color: 'var(--color-ink, #1d1d1f)',
            lineHeight: 1.55, whiteSpace: 'pre-wrap',
          }}>
            {entry.response.answer}
          </div>

          {/* Tool trace */}
          {entry.response.tool_trace.length > 0 && (
            <details style={{
              marginTop: 6, fontSize: 11,
              border: '1px solid var(--color-hairline-soft, #ECECEF)',
              borderRadius: 8, background: 'var(--color-bg, #fbfbfd)',
            }}>
              <summary style={{
                padding: '6px 10px', cursor: 'pointer',
                fontWeight: 600, color: 'var(--color-ink-3, #515154)',
                fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Tool trace · {entry.response.tool_trace.length} llamada{entry.response.tool_trace.length === 1 ? '' : 's'}
                {entry.response.latency_ms > 0 && ` · ${(entry.response.latency_ms / 1000).toFixed(1)}s`}
              </summary>
              <ul style={{
                listStyle: 'none', padding: '4px 10px 10px', margin: 0,
                display: 'flex', flexDirection: 'column', gap: 3,
              }}>
                {entry.response.tool_trace.map((t, i) => (
                  <li key={i} style={{ fontSize: 10.5 }}>
                    <span style={{
                      color: t.ok ? 'var(--color-success, #2d8a39)' : 'var(--color-danger, #c42c2c)',
                      fontWeight: 700, marginRight: 6,
                    }}>{t.ok ? '✓' : '×'}</span>
                    <code style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      color: 'var(--color-ink-2, #3a3a3d)',
                      fontSize: 10.5,
                    }}>{t.tool}</code>
                    <span style={{ color: 'var(--color-ink-5, #aeaeb2)' }}> · {t.latency_ms}ms</span>
                    {t.error && (
                      <span style={{ color: 'var(--color-danger, #c42c2c)', marginLeft: 6 }}>
                        {t.error.slice(0, 80)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Sources */}
          {entry.response.sources.length > 0 && (
            <details style={{
              marginTop: 4, fontSize: 11,
              border: '1px solid var(--color-hairline-soft, #ECECEF)',
              borderRadius: 8, background: 'var(--color-bg, #fbfbfd)',
            }}>
              <summary style={{
                padding: '6px 10px', cursor: 'pointer',
                fontWeight: 600, color: 'var(--color-ink-3, #515154)',
                fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Fuentes · {entry.response.sources.length}
              </summary>
              <ul style={{ listStyle: 'none', padding: '4px 10px 10px', margin: 0 }}>
                {entry.response.sources.slice(0, 8).map((s, i) => (
                  <li key={i} style={{ fontSize: 10.5, wordBreak: 'break-all' }}>
                    {s.startsWith('http') ? (
                      <a href={s} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--color-accent-text, #0066cc)' }}>{s}</a>
                    ) : <span style={{ color: 'var(--color-ink-4, #6e6e73)' }}>{s}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Suggested actions */}
          {entry.response.suggested_actions.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {entry.response.suggested_actions.map((sa, i) => (
                <button key={i} onClick={() => onAction(sa.action)} title={sa.rationale} style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: 'var(--color-accent-subtle, rgba(0,113,227,0.08))',
                  border: '1px solid var(--color-accent, #0071e3)',
                  color: 'var(--color-accent-text, #0066cc)',
                  fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {sa.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  fontSize: 9, padding: '1px 5px', marginRight: 4,
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-hairline, #ECECEF)',
  borderRadius: 4, color: 'var(--color-ink-4, #6e6e73)',
}
