'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsApi } from '@/lib/estudio/api-client'
import { getStatusColor, getStatusLabel, timeAgo, formatNumber, formatBytes } from '@/lib/estudio/utils'
import type { Dataset } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import SchemaInspector from './SchemaInspector'
import DataExplorer from './DataExplorer'
import SqlEditor from './SqlEditor'
import styles from './DatasetDetail.module.css'

type Tab = 'explore' | 'schema' | 'sql' | 'config'

const TABS: Array<{ id: Tab; label: string; glyph: string }> = [
  { id: 'explore', label: 'Explorar',   glyph: '⊞' },
  { id: 'schema',  label: 'Schema',     glyph: '⋮' },
  { id: 'sql',     label: 'SQL',        glyph: '≫' },
  { id: 'config',  label: 'Configurar', glyph: '⚙' },
]

export default function DatasetDetailClient({ id }: { id: string }) {
  const qc    = useQueryClient()
  const isNew = id === 'nuevo'
  const [activeTab,  setActiveTab]   = useState<Tab>(isNew ? 'config' : 'explore')
  const [name,       setName]        = useState('')
  const [description,setDescription] = useState('')
  const [tags,       setTags]        = useState('')
  const [isDirty,    setIsDirty]     = useState(false)

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['domo', 'datasets', id],
    queryFn:  () => datasetsApi.get(id),
    enabled:  !isNew,
  })

  useEffect(() => {
    if (!dataset) return
    setName(dataset.name)
    setDescription(dataset.description ?? '')
    setTags(dataset.tags?.join(', ') ?? '')
  }, [dataset])

  const refreshMutation = useMutation({
    mutationFn: () => datasetsApi.refresh(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'datasets', id] }),
  })

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Dataset>) =>
      isNew ? datasetsApi.create(data) : datasetsApi.update(id, data),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['domo', 'datasets'] })
      setIsDirty(false)
      if (isNew && saved?.id) window.location.href = `/estudio/dataset/${saved.id}`
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      name,
      description,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    })
  }

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <Skeleton style={{ height: 32, width: 300, marginBottom: 16 }} />
        <Skeleton style={{ height: 400, borderRadius: 14 }} />
      </div>
    )
  }

  const color = dataset ? getStatusColor(dataset.status) : 'var(--color-accent,#3b82f6)'

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/estudio/dataset" className={styles.breadcrumbLink}>← Datasets</Link>
          <span className={styles.sep}>›</span>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setIsDirty(true) }}
            placeholder="Nombre del dataset…"
            className={styles.nameInput}
          />
          {isDirty && <span className={styles.dirtyBadge}>Sin guardar</span>}
          {dataset && (
            <span
              className={styles.statusBadge}
              style={{ color, background: `${color}15`, borderColor: `${color}35` }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 4 }} />
              {getStatusLabel(dataset.status)}
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          {dataset && (
            <>
              <a
                href={datasetsApi.exportUrl(id, 'csv')}
                className={styles.btnSecondary}
                download
              >
                ↓ CSV
              </a>
              <button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending || dataset.status === 'building'}
                className={styles.btnRefresh}
              >
                {refreshMutation.isPending ? '⟳ Actualizando…' : '↻ Actualizar'}
              </button>
            </>
          )}
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !name.trim()}
            className={styles.btnSave}
          >
            {saveMutation.isPending ? '⟳' : isDirty ? '● Guardar' : '✓ Guardado'}
          </button>
        </div>
      </div>

      {dataset && (
        <div className={styles.metaStrip}>
          <span>⬚ <strong>{formatNumber(dataset.rowCount)}</strong> filas</span>
          <span>⊟ <strong>{dataset.columnCount}</strong> columnas</span>
          <span>◈ <strong>{formatBytes(dataset.sizeBytes)}</strong></span>
          {dataset.lastRefreshedAt && (
            <span>↻ Actualizado <strong>{timeAgo(dataset.lastRefreshedAt)}</strong></span>
          )}
          {dataset.sourcePipelineId && (
            <Link href={`/estudio/pipeline/${dataset.sourcePipelineId}`} className={styles.pipelineLink}>
              ⟶ Pipeline origen
            </Link>
          )}
        </div>
      )}

      <div className={styles.tabs}>
        {TABS.filter(t => !isNew || t.id === 'config').map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
          >
            <span>{tab.glyph}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'explore' && dataset && (
          <DataExplorer datasetId={id} />
        )}
        {activeTab === 'schema' && dataset && (
          <SchemaInspector schema={dataset.schema} />
        )}
        {activeTab === 'sql' && dataset && (
          <SqlEditor datasetId={id} />
        )}
        {activeTab === 'config' && (
          <div className={styles.configForm}>
            <div className={styles.cfgGroup}>
              <label className={styles.cfgLabel}>Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setIsDirty(true) }}
                className={styles.cfgInput}
                placeholder="Nombre descriptivo del dataset"
              />
            </div>
            <div className={styles.cfgGroup}>
              <label className={styles.cfgLabel}>Descripción</label>
              <textarea
                value={description}
                onChange={e => { setDescription(e.target.value); setIsDirty(true) }}
                className={styles.cfgTextarea}
                rows={3}
                placeholder="¿Qué datos contiene este dataset?"
              />
            </div>
            <div className={styles.cfgGroup}>
              <label className={styles.cfgLabel}>Tags (separados por coma)</label>
              <input
                type="text"
                value={tags}
                onChange={e => { setTags(e.target.value); setIsDirty(true) }}
                className={styles.cfgInput}
                placeholder="electoral, municipios, 2024, ibex35"
              />
            </div>
            {dataset && (
              <div className={styles.cfgGroup}>
                <label className={styles.cfgLabel}>Retención (días)</label>
                <input
                  type="number"
                  value={dataset.retentionDays ?? 365}
                  readOnly
                  className={styles.cfgInput}
                />
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || !name.trim()}
              className={styles.btnPrimary}
            >
              {saveMutation.isPending ? '⟳ Guardando…' : isNew ? 'Crear dataset' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
