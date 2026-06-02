'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryApi, datasetsApi } from '@/lib/estudio/api-client'
import { timeAgo } from '@/lib/estudio/utils'
import type { QueryMessage } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import styles from './Query.module.css'

const EXAMPLE_QUESTIONS = [
  '¿Cuál es la media de estimación de voto del PP en los últimos 12 meses?',
  'Muestra los contratos adjudicados por importe mayor de 5M€ en 2025',
  '¿Qué partido tiene mayor volatilidad en intención de voto?',
  'Compara abstención por comunidad autónoma en las últimas elecciones',
  'Cuántos registros hay en este dataset y cuál es el campo más reciente',
]

export default function QueryClient() {
  const qc = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input,           setInput]           = useState('')
  const [showDatasetPicker, setShowDatasetPicker] = useState(false)
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([])

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey:  ['domo', 'query', 'sessions'],
    queryFn:   queryApi.listSessions,
    staleTime: 30_000,
  })

  const { data: datasets = [] } = useQuery({
    queryKey:  ['domo', 'datasets'],
    queryFn:   datasetsApi.list,
    staleTime: 60_000,
  })

  const { data: activeSession, isLoading: loadingSession } = useQuery({
    queryKey:  ['domo', 'query', 'session', activeSessionId],
    queryFn:   () => queryApi.getSession(activeSessionId!),
    enabled:   !!activeSessionId,
    staleTime: 0,
  })

  const createSessionMutation = useMutation({
    mutationFn: () => queryApi.createSession(selectedDatasets),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['domo', 'query', 'sessions'] })
      setActiveSessionId(session.id)
      setShowDatasetPicker(false)
      setSelectedDatasets([])
    },
  })

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => queryApi.deleteSession(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['domo', 'query', 'sessions'] })
      if (activeSessionId === id) setActiveSessionId(null)
    },
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) => queryApi.sendMessage(activeSessionId!, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domo', 'query', 'session', activeSessionId] })
      setInput('')
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages])

  const handleSend = () => {
    if (!input.trim() || !activeSessionId || sendMutation.isPending) return
    sendMutation.mutate(input.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleDataset = (id: string) =>
    setSelectedDatasets(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  return (
    <div className={styles.root}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Consultas</span>
          <button onClick={() => setShowDatasetPicker(true)} className={styles.newBtn} title="Nueva consulta">+</button>
        </div>
        {loadingSessions ? (
          <div className={styles.sidebarList}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 52, borderRadius: 8 }} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className={styles.sidebarEmpty}>
            <span style={{ fontSize: '1.4rem', opacity: 0.25 }}>⌨</span>
            <p>Crea tu primera consulta IA</p>
            <button onClick={() => setShowDatasetPicker(true)} className={styles.btnPrimary} style={{ fontSize: '.75rem' }}>
              + Nueva
            </button>
          </div>
        ) : (
          <div className={styles.sidebarList}>
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`${styles.sessionItem} ${activeSessionId === s.id ? styles.sessionActive : ''}`}
              >
                <div className={styles.sessionItemTitle}>{s.title}</div>
                <div className={styles.sessionItemMeta}>
                  {s.messages.length} mensajes · {timeAgo(s.updatedAt)}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteSessionMutation.mutate(s.id) }}
                  className={styles.sessionDelete}
                  title="Eliminar"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sprint Q-C.4 · E5 · empty state en lenguaje analista, no devops.
         ANTES presumía de SQL en el primer mensaje ("AI Query · El motor
         generará el SQL...") contradiciendo la promesa del hub ("sin
         escribir una línea de código"). AHORA habla del resultado que
         recibe el analista; el detalle SQL sigue accesible bajo el botón
         "Ver SQL generado" en cada respuesta. */}
      <div className={styles.main}>
        {!activeSessionId ? (
          <div className={styles.emptyChat}>
            <span style={{ fontSize: '2.5rem', opacity: 0.2 }}>⌨</span>
            <h2 className={styles.emptyChatTitle}>Pregúntale a tus datos</h2>
            <p className={styles.emptyChatDesc}>
              Escribe la pregunta en español. Te devolvemos la tabla y la mejor
              visualización para responderla. Si necesitas la consulta SQL
              exacta, podrás verla en cada respuesta.
            </p>
            <div className={styles.exampleQuestions}>
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setShowDatasetPicker(true)}
                  className={styles.exampleBtn}
                >
                  {q}
                </button>
              ))}
            </div>
            <button onClick={() => setShowDatasetPicker(true)} className={styles.btnPrimary}>
              + Nueva consulta
            </button>
          </div>
        ) : loadingSession ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 80, borderRadius: 12 }} />)}
          </div>
        ) : (
          <>
            <div className={styles.messages}>
              {activeSession && activeSession.datasetIds.length > 0 && (
                <div className={styles.datasetPills}>
                  <span className={styles.datasetPillsLabel}>Datasets activos:</span>
                  {activeSession.datasetIds.map(id => {
                    const ds = datasets.find(d => d.id === id)
                    return <span key={id} className={styles.datasetPill}>{ds?.name ?? id}</span>
                  })}
                </div>
              )}

              {activeSession?.messages.length === 0 && (
                <div className={styles.chatHint}>
                  {/* Sprint Q-C.4 · E5 · prosa coherente con el empty state */}
                  <p>Pregúntale a tus datos en español. Si necesitas la consulta SQL exacta, podrás verla en cada respuesta.</p>
                  <div className={styles.exampleQuestions} style={{ marginTop: '.5rem' }}>
                    {EXAMPLE_QUESTIONS.slice(0, 3).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); inputRef.current?.focus() }}
                        className={styles.exampleBtn}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeSession?.messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {sendMutation.isPending && (
                <div className={styles.thinkingBubble}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputBar}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta en español o escribe SQL… (Enter para enviar, Shift+Enter para nueva línea)"
                className={styles.chatInput}
                rows={1}
                disabled={sendMutation.isPending}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
                className={styles.sendBtn}
              >
                {sendMutation.isPending ? '⟳' : '↑'}
              </button>
            </div>
          </>
        )}
      </div>

      {showDatasetPicker && (
        <div className={styles.modalOverlay} onClick={() => setShowDatasetPicker(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Seleccionar datasets para la consulta</span>
              <button onClick={() => setShowDatasetPicker(false)} className={styles.modalClose}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ fontSize: '.82rem', color: 'var(--color-muted,#6b7280)', margin: '0 0 .75rem' }}>
                Elige los datasets que el asistente IA podrá consultar. Puedes seleccionar hasta 5.
              </p>
              <div className={styles.datasetList}>
                {datasets.map(ds => (
                  <div
                    key={ds.id}
                    onClick={() => (selectedDatasets.length < 5 || selectedDatasets.includes(ds.id)) && toggleDataset(ds.id)}
                    className={`${styles.datasetItem} ${selectedDatasets.includes(ds.id) ? styles.datasetSelected : ''}`}
                  >
                    <div className={styles.datasetCheck}>
                      {selectedDatasets.includes(ds.id) ? '✓' : ''}
                    </div>
                    <div className={styles.datasetInfo}>
                      <span className={styles.datasetName}>{ds.name}</span>
                      <span className={styles.datasetMeta}>
                        {ds.rowCount?.toLocaleString('es') ?? '?'} filas · {ds.schema?.length ?? '?'} columnas
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <span style={{ fontSize: '.78rem', color: 'var(--color-muted,#9ca3af)' }}>
                {selectedDatasets.length} seleccionado{selectedDatasets.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button onClick={() => setShowDatasetPicker(false)} className={styles.btnCancel}>Cancelar</button>
                <button
                  onClick={() => createSessionMutation.mutate()}
                  disabled={selectedDatasets.length === 0 || createSessionMutation.isPending}
                  className={styles.btnPrimary}
                >
                  {createSessionMutation.isPending ? '⟳ Iniciando…' : 'Iniciar consulta →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message: msg }: { message: QueryMessage }) {
  const [showSql, setShowSql] = useState(false)
  const isUser = msg.role === 'user'

  return (
    <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
      <div className={`${styles.bubbleInner} ${isUser ? styles.bubbleInnerUser : styles.bubbleInnerAssistant}`}>
        <p className={styles.bubbleText}>{msg.content}</p>

        {msg.sql && (
          <div className={styles.sqlBlock}>
            <button onClick={() => setShowSql(s => !s)} className={styles.sqlToggle}>
              {showSql ? '▲ Ocultar SQL' : '▼ Ver SQL generado'}
            </button>
            {showSql && <pre className={styles.sqlCode}>{msg.sql}</pre>}
          </div>
        )}

        {msg.queryResult && (
          <QueryResultTable result={msg.queryResult} />
        )}

        {msg.chartSuggestion && (
          <div className={styles.chartSuggestion}>
            <span className={styles.chartSuggestionIcon}>◔</span>
            <span>Sugerencia de visualización: <strong>{msg.chartSuggestion.type}</strong>
              {msg.chartSuggestion.title && ` — ${msg.chartSuggestion.title}`}
            </span>
          </div>
        )}

        {msg.error && (
          <div className={styles.errorBlock}>✕ {msg.error}</div>
        )}
      </div>
      <div className={styles.bubbleTime}>{timeAgo(msg.createdAt)}</div>
    </div>
  )
}

function QueryResultTable({ result }: { result: NonNullable<QueryMessage['queryResult']> }) {
  const MAX_ROWS = 10
  const [showAll, setShowAll] = useState(false)
  const rows = showAll ? result.rows : result.rows.slice(0, MAX_ROWS)

  return (
    <div className={styles.resultBlock}>
      <div className={styles.resultMeta}>
        {result.rowCount.toLocaleString('es')} filas · {result.executionMs}ms
      </div>
      <div className={styles.resultTableWrap}>
        <table className={styles.resultTable}>
          <thead>
            <tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {result.columns.map(c => <td key={c}>{String(row[c] ?? '—')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.rows.length > MAX_ROWS && !showAll && (
        <button onClick={() => setShowAll(true)} className={styles.showMoreBtn}>
          + Ver {result.rows.length - MAX_ROWS} filas más
        </button>
      )}
    </div>
  )
}
