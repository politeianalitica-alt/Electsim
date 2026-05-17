'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsApi } from '@/lib/estudio/api-client'
import { getStatusColor, getStatusLabel, timeAgo, formatNumber, formatBytes } from '@/lib/estudio/utils'
import { CHART_TYPE_ICONS } from '@/lib/estudio/constants'
import type { Dataset, DatasetStatus, ColumnType } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import styles from './DatasetList.module.css'

const STATUS_FILTERS: Array<{ value: DatasetStatus | 'all'; label: string }> = [
  { value: 'all',      label: 'Todos' },
  { value: 'ready',    label: 'Listos' },
  { value: 'building', label: 'Construyendo' },
  { value: 'stale',    label: 'Desact.' },
  { value: 'error',    label: 'Error' },
  { value: 'empty',    label: 'Vacíos' },
]

const COL_TYPE_COLORS: Record<ColumnType, string> = {
  string:    '#3b82f6',
  integer:   '#10b981',
  float:     '#06b6d4',
  boolean:   '#f59e0b',
  date:      '#8b5cf6',
  datetime:  '#7c3aed',
  timestamp: '#6d28d9',
  json:      '#f97316',
  array:     '#ec4899',
  unknown:   '#9ca3af',
}

export default function DatasetListClient() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<DatasetStatus | 'all'>('all')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState<'name' | 'rowCount' | 'sizeBytes' | 'updatedAt'>('updatedAt')

  const { data: datasets = [], isLoading, isError, refetch } = useQuery({
    queryKey:  ['domo', 'datasets'],
    queryFn:   datasetsApi.list,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => datasetsApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'datasets'] }),
  })

  const refreshMutation = useMutation({
    mutationFn: (id: string) => datasetsApi.refresh(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'datasets'] }),
  })

  const filtered = datasets
    .filter(d => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter
      const matchSearch = !search
        || d.name.toLowerCase().includes(search.toLowerCase())
        || (d.tags?.some(t => t.toLowerCase().includes(search.toLowerCase())))
      return matchStatus && matchSearch
    })
    .sort((a, b) => {
      if (sortBy === 'name')      return a.name.localeCompare(b.name)
      if (sortBy === 'rowCount')  return b.rowCount - a.rowCount
      if (sortBy === 'sizeBytes') return b.sizeBytes - a.sizeBytes
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  const ready      = datasets.filter(d => d.status === 'ready').length
  const errors     = datasets.filter(d => d.status === 'error').length
  const totalRows  = datasets.reduce((a, d) => a + d.rowCount,  0)
  const totalSize  = datasets.reduce((a, d) => a + d.sizeBytes, 0)

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Datasets</h1>
          <p className={styles.subtitle}>Almacenes de datos procesados listos para análisis y visualización</p>
        </div>
        <Link href="/estudio/dataset/nuevo" className={styles.btnPrimary}>
          + Nuevo dataset
        </Link>
      </div>

      <div className={styles.kpiStrip}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 72, borderRadius: 12 }} />)
        ) : (
          <>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue}>{datasets.length}</span>
              <span className={styles.kpiLabel}>Total datasets</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue} style={{ color: 'var(--color-success,#22c55e)' }}>{ready}</span>
              <span className={styles.kpiLabel}>Listos</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue}>{formatNumber(totalRows)}</span>
              <span className={styles.kpiLabel}>Total filas</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue}>{formatBytes(totalSize)}</span>
              <span className={styles.kpiLabel}>Tamaño total</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Buscar dataset o tag…"
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
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className={styles.sortSelect}
        >
          <option value="updatedAt">↓ Actualización</option>
          <option value="rowCount">↓ Filas</option>
          <option value="sizeBytes">↓ Tamaño</option>
          <option value="name">↓ Nombre</option>
        </select>
        <button onClick={() => refetch()} className={styles.btnSecondary}>↻</button>
      </div>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: 140, borderRadius: 12 }} />)}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <span style={{ fontSize: '2rem', opacity: 0.4 }}></span>
          <p>{datasets.length === 0 ? 'Todavía no hay datasets.' : 'Ningún dataset coincide con los filtros.'}</p>
          {datasets.length === 0 && (
            <Link href="/estudio/dataset/nuevo" className={styles.btnPrimary}>Crear primer dataset</Link>
          )}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map(dataset => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              colorOf={t => COL_TYPE_COLORS[t]}
              onRefresh={() => refreshMutation.mutate(dataset.id)}
              onDelete={() => {
                if (confirm(`¿Eliminar "${dataset.name}"?`)) deleteMutation.mutate(dataset.id)
              }}
              isRefreshing={refreshMutation.isPending && refreshMutation.variables === dataset.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DatasetCard({
  dataset, onRefresh, onDelete, isRefreshing, colorOf,
}: {
  dataset:      Dataset
  onRefresh:    () => void
  onDelete:     () => void
  isRefreshing: boolean
  colorOf:      (t: ColumnType) => string
}) {
  const color = getStatusColor(dataset.status)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardName}>{dataset.name}</span>
          <span
            className={styles.cardStatus}
            style={{ color, background: `${color}15`, borderColor: `${color}35` }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 4 }} />
            {getStatusLabel(dataset.status)}
          </span>
        </div>
        {dataset.description && <p className={styles.cardDesc}>{dataset.description}</p>}
      </div>

      <div className={styles.schemaPreview}>
        {dataset.schema.slice(0, 5).map(col => (
          <span
            key={col.name}
            className={styles.schemaChip}
            style={{ borderColor: `${colorOf(col.type)}40`, color: colorOf(col.type) }}
            title={`${col.name}: ${col.type}`}
          >
            {col.name}
          </span>
        ))}
        {dataset.schema.length > 5 && (
          <span className={styles.schemaMore}>+{dataset.schema.length - 5}</span>
        )}
      </div>

      <div className={styles.statsRow}>
        <span title="Filas">⬚ {formatNumber(dataset.rowCount)}</span>
        <span title="Columnas">{CHART_TYPE_ICONS.table} {dataset.columnCount}</span>
        <span title="Tamaño">◈ {formatBytes(dataset.sizeBytes)}</span>
        {dataset.lastRefreshedAt && (
          <span title="Última actualización">↻ {timeAgo(dataset.lastRefreshedAt)}</span>
        )}
      </div>

      {dataset.tags && dataset.tags.length > 0 && (
        <div className={styles.tags}>
          {dataset.tags.map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}

      <div className={styles.cardActions}>
        <Link href={`/estudio/dataset/${dataset.id}`} className={styles.btnView}>
          Explorar
        </Link>
        <button
          onClick={onRefresh}
          disabled={isRefreshing || dataset.status === 'building'}
          className={styles.btnRefresh}
          title="Actualizar dataset"
        >
          {isRefreshing || dataset.status === 'building' ? '⟳' : '↻'}
        </button>
        {dataset.sourcePipelineId && (
          <Link href={`/estudio/pipeline/${dataset.sourcePipelineId}`} className={styles.btnPipeline} title="Ver pipeline origen">
            ⟶
          </Link>
        )}
        <button onClick={onDelete} className={styles.btnDelete} title="Eliminar">×</button>
      </div>
    </div>
  )
}
