'use client'

import type { SyncRun } from '@/types/domo'
import { formatDuration, formatNumber, getStatusColor } from '@/lib/estudio/utils'
import styles from './FuenteDetalle.module.css'

interface Props { runs: SyncRun[] }

export default function SyncHistoryChart({ runs }: Props) {
  if (runs.length === 0) {
    return (
      <div className={styles.emptyRuns}>
        No hay ejecuciones registradas todavía.
      </div>
    )
  }

  const maxDuration = Math.max(...runs.map(r => r.durationMs ?? 0), 1)

  return (
    <div className={styles.runsTable}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border,#e5e7eb)' }}>
            {['Estado', 'Inicio', 'Duración', 'Leídos', 'Escritos', 'Errores', 'Duración visual'].map(h => (
              <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-muted,#6b7280)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.slice(0, 30).map(run => {
            const color = getStatusColor(run.status)
            const pct = Math.round(((run.durationMs ?? 0) / maxDuration) * 100)
            return (
              <tr key={run.id} style={{ borderBottom: '1px solid var(--color-border,#e5e7eb)' }}>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <span style={{ color, fontWeight: 600, fontSize: '0.78rem' }}>{run.status}</span>
                </td>
                <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-muted,#6b7280)' }}>
                  {new Date(run.startedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                  {run.durationMs ? formatDuration(run.durationMs) : '—'}
                </td>
                <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>{formatNumber(run.recordsRead)}</td>
                <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>{formatNumber(run.recordsWritten)}</td>
                <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: run.recordsErrored > 0 ? 'var(--color-danger,#ef4444)' : undefined }}>
                  {run.recordsErrored}
                </td>
                <td style={{ padding: '0.5rem 0.75rem', minWidth: 120 }}>
                  <div style={{ height: 6, background: 'var(--bg-secondary,#f3f4f6)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
