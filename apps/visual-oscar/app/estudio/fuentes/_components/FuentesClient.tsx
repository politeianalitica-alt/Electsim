'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sourcesApi } from '@/lib/estudio/api-client'
import { CONNECTOR_CATEGORIES, CONNECTOR_ICONS, CONNECTOR_LABELS } from '@/lib/estudio/constants'
import { formatNumber } from '@/lib/estudio/utils'
import type { DataSource, ConnectorType, SyncStatus } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import ConnectorCard from './ConnectorCard'
import NuevaFuenteDrawer from './NuevaFuenteDrawer'
import styles from './FuentesClient.module.css'

const STATUS_FILTERS: Array<{ value: SyncStatus | 'all'; label: string }> = [
  { value: 'all',       label: 'Todas' },
  { value: 'connected', label: 'Conectadas' },
  { value: 'error',     label: 'Con error' },
  { value: 'syncing',   label: 'Sincronizando' },
  { value: 'idle',      label: 'Inactivas' },
]

export default function FuentesClient() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<SyncStatus | 'all'>('all')
  const [typeFilter,   setTypeFilter]   = useState<ConnectorType | 'all'>('all')
  const [search,       setSearch]       = useState('')
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['domo', 'fuentes'],
    queryFn:  () => sourcesApi.list({ pageSize: 100 }),
    staleTime: 30_000,
  })

  const syncMutation = useMutation({
    mutationFn: (id: string) => sourcesApi.sync(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'fuentes'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sourcesApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'fuentes'] }),
  })

  const sources: DataSource[] = data?.data ?? []

  const filtered = sources.filter(s => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    const matchType   = typeFilter   === 'all' || s.type   === typeFilter
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchType && matchSearch
  })

  const connected    = sources.filter(s => s.status === 'connected').length
  const errors       = sources.filter(s => s.status === 'error').length
  const totalRecords = sources.reduce((acc, s) => acc + (s.totalRecords ?? 0), 0)

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fuentes de Datos</h1>
          <p className={styles.subtitle}>
            Gestiona las conexiones de datos ingestados por la plataforma
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setDrawerOpen(true)}>
          + Nueva conexión
        </button>
      </div>

      <div className={styles.kpiStrip}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 72, borderRadius: 12 }} />
          ))
        ) : (
          <>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue}>{sources.length}</span>
              <span className={styles.kpiLabel}>Total fuentes</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue} style={{ color: 'var(--color-success,#22c55e)' }}>
                {connected}
              </span>
              <span className={styles.kpiLabel}>Conectadas</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue} style={{ color: errors > 0 ? 'var(--color-danger,#ef4444)' : undefined }}>
                {errors}
              </span>
              <span className={styles.kpiLabel}>Con error</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue}>{formatNumber(totalRecords)}</span>
              <span className={styles.kpiLabel}>Registros totales</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Buscar fuente…"
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
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as ConnectorType | 'all')}
          className={styles.select}
        >
          <option value="all">Todos los tipos</option>
          {Object.entries(CONNECTOR_CATEGORIES).map(([cat, types]) => (
            <optgroup key={cat} label={cat}>
              {types.map(t => (
                <option key={t} value={t}>
                  {CONNECTOR_ICONS[t]} · {CONNECTOR_LABELS[t]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button onClick={() => refetch()} className={styles.btnSecondary} title="Refrescar">
          ↻
        </button>
      </div>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 160, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {isError && (
        <div className={styles.emptyState}>
          <span style={{ fontSize: '1.75rem', color: 'var(--color-danger,#ef4444)' }}>!</span>
          <p>No se pudieron cargar las fuentes. El backend puede estar desconectado.</p>
          <button onClick={() => refetch()} className={styles.btnSecondary}>
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <span style={{ fontSize: '2rem', opacity: 0.4 }}>⇡</span>
          <p>
            {sources.length === 0
              ? 'Todavía no hay fuentes configuradas.'
              : 'Ninguna fuente coincide con los filtros.'}
          </p>
          {sources.length === 0 && (
            <button className={styles.btnPrimary} onClick={() => setDrawerOpen(true)}>
              Crear primera conexión
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map(source => (
            <ConnectorCard
              key={source.id}
              source={source}
              onSync={() => syncMutation.mutate(source.id)}
              onDelete={() => {
                if (confirm(`¿Eliminar la fuente "${source.name}"?`)) {
                  deleteMutation.mutate(source.id)
                }
              }}
              isSyncing={syncMutation.isPending && syncMutation.variables === source.id}
            />
          ))}
        </div>
      )}

      {drawerOpen && (
        <NuevaFuenteDrawer
          onClose={() => setDrawerOpen(false)}
          onSuccess={() => {
            setDrawerOpen(false)
            qc.invalidateQueries({ queryKey: ['domo', 'fuentes'] })
          }}
        />
      )}
    </div>
  )
}
