'use client'

/**
 * <CuadernoAIPanel> · asistente IA contextual para la nota activa.
 *
 * Sprint Cuaderno N7 · cierra el bucle analista ↔ máquina.
 *
 * UX:
 *   - Modal centrado · invocado desde el botón "◈ IA" del toolbar
 *   - Muestra el CONTEXTO que se va a enviar (entidades + título + backlinks)
 *   - 4 acciones pre-cocinadas (one-click):
 *       · Resumir la nota
 *       · Próximos pasos
 *       · Conexiones que me estoy perdiendo
 *       · Crítica · qué falta o falla
 *   - Input libre para hacer cualquier pregunta sobre la nota
 *   - Resultado streaming en la mitad inferior
 *   - 2 botones sobre cada respuesta:
 *       · Copiar      → clipboard
 *       · Insertar    → inserta en cursor del editor via editorRef.insertAtCursor()
 *
 * Implementación:
 *   - POST a /api/brain/chat con messages prearmadas (contexto + tarea)
 *   - Endpoint cae Backend Python → Anthropic Haiku → Ollama → fallback
 *   - Mantiene historial de la conversación dentro del panel · el siguiente
 *     mensaje del usuario se envía con todo el contexto previo
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { resolveEntity, KIND_COLORS } from '@/lib/cuaderno/entity-registry'
import type { CuadernoNote } from '@/lib/cuaderno/store'
import type { MarkdownEditorHandle } from './MarkdownEditor'

interface Props {
  note:        CuadernoNote
  backlinks:   { id: string; title: string }[]
  editorRef:   React.RefObject<MarkdownEditorHandle | null>
  onClose:     () => void
}

interface Msg {
  role:    'user' | 'assistant'
  content: string
}

const QUICK_ACTIONS: { id: string; label: string; prompt: string; glyph: string }[] = [
  {
    id: 'summary',
    glyph: '⊞',
    label: 'Resumir la nota',
    prompt:
      'Hazme un resumen ejecutivo de la nota en 5-7 frases. Quédate con los hechos verificables, las decisiones que he tomado, y los pendientes. Sin floritura.',
  },
  {
    id: 'next-steps',
    glyph: '→',
    label: 'Próximos pasos',
    prompt:
      'Como analista político, ¿cuáles son los próximos 5 pasos concretos para profundizar este análisis? Lista accionable con metric o entregable por paso.',
  },
  {
    id: 'missing-links',
    glyph: '◇',
    label: 'Conexiones que me pierdo',
    prompt:
      'Mirando las entidades mencionadas y el contenido de la nota, ¿qué conexiones o actores adyacentes me estoy perdiendo? Lista de 5-8 personas/instituciones/sectores que deberían estar en el radar pero no están en la nota.',
  },
  {
    id: 'critique',
    glyph: '!',
    label: 'Crítica · qué falla',
    prompt:
      'Modo abogado del diablo. Critica este análisis: ¿qué sesgos tiene? ¿qué supuestos no verifico? ¿qué evidencia me falta? Lista 5-6 fallos concretos con sugerencia para corregir.',
  },
]

function buildContext(note: CuadernoNote, backlinks: { title: string }[]): {
  text: string
  entities: { slug: string; name: string; kind: string }[]
} {
  // Extrae entidades del registry mencionadas
  const seen = new Set<string>()
  const entities: { slug: string; name: string; kind: string }[] = []
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(note.content)) !== null) {
    const e = resolveEntity(m[1].trim())
    if (e && !seen.has(e.slug)) {
      seen.add(e.slug)
      entities.push({ slug: e.slug, name: e.name, kind: e.kind })
    }
  }

  const tags = note.tags.length > 0 ? note.tags.join(' ') : '(sin tags)'
  const bl = backlinks.length > 0
    ? backlinks.slice(0, 6).map((b) => '· ' + b.title).join('\n')
    : '(sin notas que apunten aquí)'

  // Truncado del contenido a ~3000 chars para no comer presupuesto de tokens
  const body = note.content.length > 3000
    ? note.content.slice(0, 3000) + '\n…(truncada)…'
    : note.content

  const entLine = entities.length === 0
    ? '(ninguna del registry)'
    : entities.map((e) => `[[${e.slug}]] (${e.kind})`).join(', ')

  const text =
`<NOTA>
Título: ${note.title}
Carpeta: ${note.folder}
Actualizada: ${new Date(note.updatedAt).toISOString().slice(0, 10)}
Tags: ${tags}

Entidades mencionadas: ${entLine}

Notas que apuntan aquí:
${bl}

—— Contenido ——
${body}
</NOTA>`
  return { text, entities }
}

export function CuadernoAIPanel({ note, backlinks, editorRef, onClose }: Props) {
  const [conversation, setConversation] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const outputRef = useRef<HTMLDivElement | null>(null)

  const context = useMemo(() => buildContext(note, backlinks), [note, backlinks])

  const ask = useCallback(
    async (userPrompt: string) => {
      if (!userPrompt.trim() || busy) return
      const userMsg: Msg = { role: 'user', content: userPrompt }
      const next = [...conversation, userMsg]
      setConversation(next)
      setInput('')
      setBusy(true)

      // Construye messages para el endpoint Brain
      // El primer turno mete el contexto · turnos siguientes solo el prompt
      const messages = next.map((m, i) => {
        if (i === 0 && m.role === 'user') {
          return {
            role: 'user' as const,
            content: `${context.text}\n\n<TAREA>\n${m.content}\n</TAREA>\n\nResponde en español. Sé concreto y operativo. Si propones hechos, no inventes cifras.`,
          }
        }
        return { role: m.role, content: m.content }
      })

      try {
        const resp = await fetch('/api/brain/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messages }),
        })
        const data = await resp.json().catch(() => null)
        const answer =
          (data?.text as string) ||
          (data?.content as string) ||
          (data?.message as string) ||
          (data?.error
            ? `(no he podido procesar la petición · ${String(data.error).slice(0, 200)})`
            : '(respuesta vacía del Brain)')
        setConversation((c) => [...c, { role: 'assistant', content: answer }])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        setConversation((c) => [
          ...c,
          { role: 'assistant', content: `(fallo de red: ${msg})` },
        ])
      } finally {
        setBusy(false)
        // Scroll al fondo
        setTimeout(() => {
          outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' })
        }, 50)
      }
    },
    [busy, conversation, context.text],
  )

  function copyToClipboard(text: string) {
    try {
      navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  function insertIntoNote(text: string) {
    if (editorRef.current) {
      editorRef.current.insertAtCursor('\n\n' + text + '\n')
      onClose()
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: 'min(820px, 100%)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          fontFamily: '-apple-system, system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* Sprint Quality-4 · sin emojis · "◈" U+25C8 glifo geométrico permitido */}
          <span style={{ fontSize: 18, fontWeight: 700, color: '#0071e3' }} aria-hidden="true">◈</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
              Asistente · sobre <em>{note.title}</em>
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {context.entities.length} entidad{context.entities.length === 1 ? '' : 'es'} ·{' '}
              {backlinks.length} backlink{backlinks.length === 1 ? '' : 's'} ·{' '}
              {note.content.length} chars
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 22, color: '#64748b',
              cursor: 'pointer', padding: 0, width: 28,
            }}
          >
            ×
          </button>
        </div>

        {/* Context strip · colapsable */}
        <div style={{ padding: '8px 18px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <button
            onClick={() => setContextOpen((v) => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#475569', padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span>{contextOpen ? '▼' : '▶'}</span>
            <span>Contexto que se envía al Brain ({context.text.length} chars)</span>
          </button>
          {contextOpen && (
            <pre style={{
              marginTop: 6, fontSize: 11, color: '#475569',
              maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap',
              background: '#fff', padding: 10, borderRadius: 6,
              border: '1px solid #e5e7eb', fontFamily: 'ui-monospace, monospace',
            }}>
              {context.text}
            </pre>
          )}
        </div>

        {/* Quick actions · solo si no hay conversación todavía */}
        {conversation.length === 0 && (
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{
              fontSize: 10, color: '#64748b', textTransform: 'uppercase',
              letterSpacing: 0.5, fontWeight: 700, marginBottom: 8,
            }}>
              Atajos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => ask(a.prompt)}
                  disabled={busy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6,
                    border: '1px solid #e2e8f0', background: '#fff',
                    cursor: busy ? 'wait' : 'pointer', textAlign: 'left',
                    fontSize: 12, color: '#0f172a', fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: 14, color: '#0071e3', fontWeight: 700, width: 16 }}>{a.glyph}</span>
                  {a.label}
                </button>
              ))}
            </div>
            {context.entities.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {context.entities.slice(0, 8).map((e) => {
                  const c = KIND_COLORS[e.kind as keyof typeof KIND_COLORS]
                  return (
                    <span
                      key={e.slug}
                      style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 3,
                        background: c?.bg ?? '#f1f5f9', color: c?.fg ?? '#475569',
                        border: `1px solid ${c?.border ?? '#e2e8f0'}`, fontWeight: 600,
                      }}
                    >
                      {c?.glyph} {e.name}
                    </span>
                  )
                })}
                {context.entities.length > 8 && (
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>
                    + {context.entities.length - 8} más
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Conversation output */}
        <div
          ref={outputRef}
          style={{
            flex: 1, overflow: 'auto', padding: '12px 18px',
            display: 'flex', flexDirection: 'column', gap: 10,
            minHeight: conversation.length === 0 ? 0 : 200,
          }}
        >
          {conversation.map((m, i) => (
            <div
              key={i}
              style={{
                padding: '8px 10px', borderRadius: 6,
                background: m.role === 'user' ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${m.role === 'user' ? '#bfdbfe' : '#e2e8f0'}`,
              }}
            >
              <div style={{
                fontSize: 9, color: '#64748b', textTransform: 'uppercase',
                letterSpacing: 0.5, fontWeight: 700, marginBottom: 4,
              }}>
                {/* Sprint Quality-4 · etiquetas sin emojis · ">" usuario / "◈" Brain (glifos seguros) */}
                {m.role === 'user' ? '> TÚ' : '◈ BRAIN'}
              </div>
              <div style={{
                fontSize: 13, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.45,
              }}>
                {m.content}
              </div>
              {m.role === 'assistant' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    onClick={() => copyToClipboard(m.content)}
                    style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer',
                      color: '#475569',
                    }}
                  >
                    Copiar
                  </button>
                  <button
                    onClick={() => insertIntoNote(m.content)}
                    style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: '#0071e3', color: '#fff', border: '1px solid #0071e3',
                      cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    ⇡ Insertar en la nota
                  </button>
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div style={{
              fontSize: 12, color: '#94a3b8', padding: 8, fontStyle: 'italic',
            }}>
              … pensando
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 6 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(input)
              }
            }}
            placeholder={
              conversation.length === 0
                ? '… o escribe una pregunta libre sobre la nota'
                : 'Pregunta de seguimiento'
            }
            disabled={busy}
            style={{
              flex: 1, padding: '8px 10px', fontSize: 13, borderRadius: 6,
              border: '1px solid #cbd5e1', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => ask(input)}
            disabled={busy || !input.trim()}
            style={{
              padding: '8px 14px', fontSize: 13, borderRadius: 6,
              background: busy || !input.trim() ? '#cbd5e1' : '#0071e3',
              color: '#fff', border: 'none', fontWeight: 600,
              cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
