'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelinesApi } from '@/lib/estudio/api-client'
import { getStatusColor, getStatusLabel, timeAgo, formatDuration, formatNumber } from '@/lib/estudio/utils'
import type { Pipeline, PipelineStatus } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import styles from './PipelineList.module.css'

const STATUS_FILTERS: Array<{ value: PipelineStatus | 'all'; label: string }> = [
  { value: 'all',     label: 'Todos' },
  { value: 'active',  label: 'Activos' },
  { value: 'paused',  label: 'Pausados' },
  { value: 'draft',   label: 'Borrador' },
  { value: 'error',   label: 'Con error' },
]

export default function PipelineListClient() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<PipelineStatus | 'all'>('all')
  const [search,       setSearch]       = useState('')

  const { data: pipelines = [], isLoading, isError, refetch } = useQuery({
    queryKey:  ['domo', 'pipelines'],
    queryFn:   pipelinesApi.list,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pipelinesApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'pipelines'] }),
  })

  const runMutation = useMutation({
    mutationFn: (id: string) => pipelinesApi.run(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'pipelines'] }),
  })

  const filtered = pipelines.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const active       = pipelines.filter(p => p.status === 'active').length
  const errors       = pipelines.filter(p => p.status === 'error').length
  const totalRecords = pipelines.reduce((a, p) => a + (p.lastRunRecords ?? 0), 0)

  return (
 <div className={styles.root}>
 <div className={styles.header}>
 <div>
 <h1 className={styles.title}>Pipelines ETL</h1>
 <p className={styles.subtitle}>Transforma y enruta datos entre fuentes y datasets</p>
 </div>
 <Link href="/estudio/pipeline/nuevo" className={styles.btnPrimary}>
          + Nuevo pipeline
 </Link>
 </div>

 <div className={styles.kpiStrip}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 72, borderRadius: 12 }} />)
        ) : (
 <>
 <div className={styles.kpiCard}>
 <span className={styles.kpiValue}>{pipelines.length}</span>
 <span className={styles.kpiLabel}>Total pipelines</span>
 </div>
 <div className={styles.kpiCard}>
 <span className={styles.kpiValue} style={{ color: 'var(--color-success,#22c55e)' }}>{active}</span>
 <span className={styles.kpiLabel}>Activos</span>
 </div>
 <div className={styles.kpiCard}>
 <span className={styles.kpiValue} style={{ color: errors > 0 ? 'var(--color-danger,#ef4444)' : undefined }}>{errors}</span>
 <span className={styles.kpiLabel}>Con error</span>
 </div>
 <div className={styles.kpiCard}>
 <span className={styles.kpiValue}>{formatNumber(totalRecords)}</span>
 <span className={styles.kpiLabel}>Registros última ejecución</span>
 </div>
 </>
        )}
 </div>

 <div className={styles.filters}>
 <input
          type="search"
          placeholder="Buscar pipeline…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
 <div className={styles.filterGroup}>
          {STATUS_FILTERS.map(f => (
 <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`${styles.filterBtn} ${statusFilter === f.value ? styles.filterActive : ''}`}
            >
              {f.label}
 </button>
          ))}
 </div>
 <button onClick={() => refetch()} className={styles.btnSecondary} title="Refrescar">↻</button>
 </div>

      {isLoading && (
 <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 88, borderRadius: 12 }} />)}
 </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
 <div className={styles.emptyState}>
 <span style={{ fontSize: '2rem', opacity: 0.4 }}>⟶</span>
 <p>{pipelines.length === 0 ? 'Todavía no hay pipelines configurados.' : 'Ningún pipeline coincide con los filtros.'}</p>
          {pipelines.length === 0 && (
 <Link href="/estudio/pipeline/nuevo" className={styles.btnPrimary}>Crear primer pipeline</Link>
          )}
 </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
 <div className={styles.list}>
          {filtered.map(pipeline => (
 <PipelineRow
              key={pipeline.id}
              pipeline={pipeline}
              onRun={() => runMutation.mutate(pipeline.id)}
              onDelete={() => {
                if (confirm(`¿Eliminar "${pipeline.name}"?`)) deleteMutation.mutate(pipeline.id)
              }}
              isRunning={runMutation.isPending && runMutation.variables === pipeline.id}
            />
          ))}
 </div>
      )}
 </div>
  )
}

function PipelineRow({
  pipeline, onRun, onDelete, isRunning,
}: {
  pipeline:  Pipeline
  onRun:     () => void
  onDelete:  () => void
  isRunning: boolean
}) {
  const statusColor = getStatusColor(pipeline.status)
  const runColor    = pipeline.lastRunStatus ? getStatusColor(pipeline.lastRunStatus) : undefined

  return (
 <div className={styles.row}>
 <div className={styles.rowLeft}>
 <div className={styles.rowIcon}>⟶</div>
 <div className={styles.rowInfo}>
 <div className={styles.rowTitleRow}>
 <span className={styles.rowName}>{pipeline.name}</span>
 <span className={styles.rowStatus} style={{ color: statusColor, background: `${statusColor}15`, borderColor: `${statusColor}35` }}>
 <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, display: 'inline-block', marginRight: 4 }} />
              {getStatusLabel(pipeline.status)}
 </span>
            {pipeline.lastRunStatus && (
 <span className={styles.rowStatus} style={{ color: runColor, background: `${runColor}15`, borderColor: `${runColor}35` }}>
                Último run: {getStatusLabel(pipeline.lastRunStatus)}
 </span>
            )}
 </div>
          {pipeline.description && <p className={styles.rowDesc}>{pipeline.description}</p>}
 <div className={styles.rowMeta}>
 <span>{pipeline.nodes.length} nodos</span>
            {pipeline.lastRunAt          && <span>· ejecutado {timeAgo(pipeline.lastRunAt)}</span>}
            {pipeline.lastRunDurationMs  && <span>· {formatDuration(pipeline.lastRunDurationMs)}</span>}
            {pipeline.lastRunRecords !== undefined && <span>· {formatNumber(pipeline.lastRunRecords)} registros</span>}
 <span>· {pipeline.schedule}</span>
 </div>
 </div>
 </div>
 <div className={styles.rowActions}>
 <Link href={`/estudio/pipeline/${pipeline.id}`} className={styles.btnView}>Editar</Link>
 <button
          onClick={onRun}
          disabled={isRunning || pipeline.lastRunStatus === 'running'}
          className={styles.btnRun}
        >
          {isRunning || pipeline.lastRunStatus === 'running' ? '⟳' : '▶'}
 </button>
 <button onClick={onDelete} className={styles.btnDelete} title="Eliminar">×</button>
 </div>
 </div>
  )
}
