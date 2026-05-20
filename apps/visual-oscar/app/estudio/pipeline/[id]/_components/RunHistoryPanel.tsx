'use client'

import { useQuery } from '@tanstack/react-query'
import { pipelinesApi } from '@/lib/estudio/api-client'
import { getStatusColor, getStatusLabel, timeAgo, formatDuration, formatNumber } from '@/lib/estudio/utils'
import Skeleton from '@/components/Skeleton'
import styles from './PipelineEditor.module.css'

interface Props {
  pipelineId: string
  onClose:    () => void
}

export default function RunHistoryPanel({ pipelineId, onClose }: Props) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey:        ['domo', 'pipelines', pipelineId, 'runs'],
    queryFn:         () => pipelinesApi.getRuns(pipelineId),
    refetchInterval: 10_000,
  })

  return (
 <div className={styles.rightPanel}>
 <div className={styles.rightPanelHeader} style={{ borderLeftColor: 'var(--color-accent,#3b82f6)' }}>
 <div>
 <span className={styles.rightPanelType}>Historial de ejecuciones</span>
 <h3 className={styles.rightPanelTitle}>Últimas {runs.length} runs</h3>
 </div>
 <button onClick={onClose} className={styles.btnClosePanel}></button>
 </div>

 <div className={styles.rightPanelBody}>
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
 <Skeleton key={i} style={{ height: 64, borderRadius: 8, marginBottom: 8 }} />
        ))}

        {!isLoading && runs.length === 0 && (
 <p style={{ color: 'var(--color-muted,#6b7280)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
            Todavía no hay ejecuciones registradas.
 </p>
        )}

        {!isLoading && runs.map(run => {
          const color = getStatusColor(run.status)
          return (
 <div key={run.id} className={styles.runCard}>
 <div className={styles.runCardHeader}>
 <span style={{ color, fontWeight: 700, fontSize: '0.78rem' }}>
 <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 4 }} />
                  {getStatusLabel(run.status)}
 </span>
 <span style={{ fontSize: '0.72rem', color: 'var(--color-muted,#6b7280)' }}>
                  {timeAgo(run.startedAt)}
 </span>
 </div>
 <div className={styles.runCardStats}>
 <span>⬇ {formatNumber(run.recordsIn)}</span>
 <span>⬆ {formatNumber(run.recordsOut)}</span>
                {run.recordsErrored > 0 && (
 <span style={{ color: 'var(--color-danger,#ef4444)' }}> {run.recordsErrored}</span>
                )}
                {run.durationMs && <span>⌚ {formatDuration(run.durationMs)}</span>}
 </div>
              {run.errorMessage && (
 <p style={{ fontSize: '0.72rem', color: 'var(--color-danger,#ef4444)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {run.errorMessage}
 </p>
              )}
              {run.nodeStats && Object.entries(run.nodeStats).length > 0 && (
 <details style={{ marginTop: 6 }}>
 <summary style={{ fontSize: '0.7rem', cursor: 'pointer', color: 'var(--color-muted,#6b7280)' }}>
                    Ver stats por nodo
 </summary>
 <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {Object.entries(run.nodeStats).map(([nodeId, stat]) => (
 <div key={nodeId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-muted,#6b7280)' }}>
 <span style={{ fontFamily: 'monospace' }}>{nodeId.slice(0, 8)}</span>
 <span>{formatDuration(stat.durationMs)} · {formatNumber(stat.recordsOut)} registros</span>
 </div>
                    ))}
 </div>
 </details>
              )}
 </div>
          )
        })}
 </div>
 </div>
  )
}
