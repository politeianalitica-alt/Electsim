'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { sourcesApi } from '@/lib/estudio/api-client'
import { CONNECTOR_ICONS, CONNECTOR_LABELS } from '@/lib/estudio/constants'
import { getStatusColor, getStatusLabel, timeAgo, formatNumber, formatDuration } from '@/lib/estudio/utils'
import Skeleton from '@/components/Skeleton'
import SyncHistoryChart from './SyncHistoryChart'
import LogStream from './LogStream'
import styles from './FuenteDetalle.module.css'

type Tab = 'overview' | 'historial' | 'logs' | 'mapping'

export default function FuenteDetalleClient({ id }: { id: string }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: source, isLoading, isError } = useQuery({
    queryKey: ['domo', 'fuentes', id],
    queryFn:  () => sourcesApi.get(id),
  })

  const { data: runs } = useQuery({
    queryKey: ['domo', 'fuentes', id, 'runs'],
    queryFn:  () => sourcesApi.getRuns(id),
    enabled:  !!source,
  })

  const syncMutation = useMutation({
    mutationFn: () => sourcesApi.sync(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'fuentes', id] }),
  })

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
        <Skeleton style={{ height: 28, width: 200, marginBottom: 8 }} />
        <Skeleton style={{ height: 18, width: 320, marginBottom: 32 }} />
        <Skeleton style={{ height: 120, borderRadius: 14 }} />
      </div>
    )
  }

  if (isError || !source) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger,#ef4444)' }}>No se pudo cargar la fuente.</p>
        <Link href="/estudio/fuentes" style={{ color: 'var(--color-accent,#3b82f6)' }}>
          ← Volver a fuentes
        </Link>
      </div>
    )
  }

  const statusColor = getStatusColor(source.status)

  return (
    <div className={styles.root}>
      <div className={styles.breadcrumb}>
        <Link href="/estudio/fuentes" className={styles.breadcrumbLink}>Fuentes</Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span>{source.name}</span>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroIcon}>{CONNECTOR_ICONS[source.type]}</div>
          <div>
            <h1 className={styles.heroTitle}>{source.name}</h1>
            <div className={styles.heroBadges}>
              <span className={styles.typeBadge}>{CONNECTOR_LABELS[source.type]}</span>
              <span
                className={styles.statusBadge}
                style={{ color: statusColor, background: `${statusColor}15`, borderColor: `${statusColor}35` }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block', marginRight: 5 }} />
                {getStatusLabel(source.status)}
              </span>
            </div>
            {source.description && <p className={styles.heroDesc}>{source.description}</p>}
          </div>
        </div>
        <div className={styles.heroActions}>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || source.status === 'syncing'}
            className={styles.btnSync}
          >
            {syncMutation.isPending || source.status === 'syncing' ? '⟳ Sincronizando…' : '↻ Sync ahora'}
          </button>
          <Link href="/estudio/fuentes" className={styles.btnBack}>← Volver</Link>
        </div>
      </div>

      <div className={styles.kpiStrip}>
        {[
          { label: 'Registros totales',         value: source.totalRecords    !== undefined ? formatNumber(source.totalRecords)        : '—' },
          { label: 'Último sync',               value: source.lastSyncAt      ? timeAgo(source.lastSyncAt)                              : '—' },
          { label: 'Duración último sync',      value: source.lastSyncDurationMs ? formatDuration(source.lastSyncDurationMs)            : '—' },
          { label: 'Registros en último sync',  value: source.lastSyncRecords !== undefined ? formatNumber(source.lastSyncRecords)     : '—' },
        ].map(kpi => (
          <div key={kpi.label} className={styles.kpiCard}>
            <span className={styles.kpiValue}>{kpi.value}</span>
            <span className={styles.kpiLabel}>{kpi.label}</span>
          </div>
        ))}
      </div>

      {source.status === 'error' && source.lastSyncError && (
        <div className={styles.errorBanner}>
          ! <strong>Último error:</strong> {source.lastSyncError}
        </div>
      )}

      <div className={styles.tabs}>
        {(['overview', 'historial', 'logs', 'mapping'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
          >
            {({ overview: 'Resumen', historial: 'Historial', logs: 'Logs', mapping: 'Field Mapping' } as Record<Tab, string>)[t]}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {tab === 'overview' && (
          <div className={styles.configGrid}>
            <div className={styles.configCard}>
              <h3 className={styles.configTitle}>Configuración</h3>
              {Object.entries(source.config).map(([k, v]) => (
                <div key={k} className={styles.configRow}>
                  <span className={styles.configKey}>{k}</span>
                  <span className={styles.configValue}>
                    {k.toLowerCase().includes('password') || k.toLowerCase().includes('token') || k.toLowerCase().includes('key')
                      ? '••••••••'
                      : String(v)}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.configCard}>
              <h3 className={styles.configTitle}>Metadatos</h3>
              <div className={styles.configRow}>
                <span className={styles.configKey}>Schedule</span>
                <span className={styles.configValue}>{source.schedule}</span>
              </div>
              <div className={styles.configRow}>
                <span className={styles.configKey}>Creada</span>
                <span className={styles.configValue}>{new Date(source.createdAt).toLocaleDateString('es-ES')}</span>
              </div>
              <div className={styles.configRow}>
                <span className={styles.configKey}>Actualizada</span>
                <span className={styles.configValue}>{timeAgo(source.updatedAt)}</span>
              </div>
              <div className={styles.configRow}>
                <span className={styles.configKey}>ID</span>
                <span className={styles.configValue} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{source.id}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'historial' && (
          <SyncHistoryChart runs={runs ?? []} />
        )}

        {tab === 'logs' && (
          <LogStream sourceId={id} active={tab === 'logs'} />
        )}

        {tab === 'mapping' && (
          <div className={styles.mappingPlaceholder}>
            <span style={{ fontSize: '1.75rem', opacity: 0.4 }}>⟷</span>
            <p>El field mapping se configura después de la primera sincronización, cuando el schema de la fuente es conocido.</p>
            {source.lastSyncAt ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted,#6b7280)' }}>
                Sincronización completada {timeAgo(source.lastSyncAt)}. Configura el mapeo de campos aquí.
              </p>
            ) : (
              <button
                onClick={() => syncMutation.mutate()}
                className={styles.btnSync}
                style={{ marginTop: '0.5rem' }}
              >
                Ejecutar primera sync
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
