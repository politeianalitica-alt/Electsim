'use client'

import { useEffect, useRef, useState } from 'react'
import type { LogEntry } from '@/types/domo'
import styles from './FuenteDetalle.module.css'

const LEVEL_COLORS: Record<string, string> = {
  debug: '#9ca3af',
  info:  '#3b82f6',
  warn:  '#f59e0b',
  error: '#ef4444',
}

interface Props {
  sourceId: string
  active:   boolean
}

export default function LogStream({ sourceId, active }: Props) {
  const [logs,      setLogs]      = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const esRef     = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!active) return
    const es = new EventSource(`/api/estudio/fuentes/${sourceId}/logs`)
    esRef.current = es
    es.onopen    = () => setConnected(true)
    es.onmessage = e => {
      try {
        const entry: LogEntry = JSON.parse(e.data)
        setLogs(prev => [...prev.slice(-499), entry])
      } catch {/* swallow malformed events */}
    }
    es.onerror = () => setConnected(false)
    return () => {
      es.close()
      setConnected(false)
    }
  }, [sourceId, active])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className={styles.logContainer}>
      <div className={styles.logHeader}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.75rem',
            color: connected ? 'var(--color-success,#22c55e)' : 'var(--color-muted,#6b7280)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--color-success,#22c55e)' : 'var(--color-muted,#6b7280)', display: 'inline-block' }} />
          {connected ? 'Conectado · tiempo real' : 'Desconectado'}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-muted,#6b7280)' }}>
          {logs.length} entradas
        </span>
        <button
          onClick={() => setLogs([])}
          style={{ marginLeft: 'auto', fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted,#6b7280)' }}
        >
          Limpiar
        </button>
      </div>
      <div className={styles.logBody}>
        {logs.length === 0 && (
          <span style={{ color: '#6b7280', fontSize: '0.8rem', padding: '0.5rem' }}>
            Esperando eventos de log…
          </span>
        )}
        {logs.map(log => (
          <div key={log.id} className={styles.logLine}>
            <span style={{ color: '#6b7280', fontSize: '0.68rem', flexShrink: 0 }}>
              {new Date(log.timestamp).toLocaleTimeString('es-ES')}
            </span>
            <span
              style={{
                color: LEVEL_COLORS[log.level] ?? '#9ca3af',
                fontSize: '0.7rem',
                fontWeight: 700,
                width: 42,
                flexShrink: 0,
                textTransform: 'uppercase',
              }}
            >
              {log.level}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#e5e7eb' }}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
