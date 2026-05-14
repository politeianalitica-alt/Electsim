'use client'

import Link from 'next/link'
import type { DataSource } from '@/types/domo'
import { CONNECTOR_ICONS, CONNECTOR_LABELS } from '@/lib/domo/constants'
import { getStatusColor, getStatusLabel, timeAgo, formatNumber, formatDuration, scheduleLabel } from '@/lib/domo/utils'
import styles from './ConnectorCard.module.css'

interface Props {
  source:    DataSource
  onSync:    () => void
  onDelete:  () => void
  isSyncing: boolean
}

export default function ConnectorCard({ source, onSync, onDelete, isSyncing }: Props) {
  const statusColor = getStatusColor(source.status)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.connectorIcon}>{CONNECTOR_ICONS[source.type]}</div>
        <div className={styles.cardMeta}>
          <span className={styles.connectorType}>{CONNECTOR_LABELS[source.type]}</span>
          <span
            className={styles.statusBadge}
            style={{
              color: statusColor,
              background: `${statusColor}18`,
              borderColor: `${statusColor}40`,
            }}
          >
            <span className={styles.statusDot} style={{ background: statusColor }} />
            {getStatusLabel(source.status)}
          </span>
        </div>
      </div>

      <h3 className={styles.cardTitle}>{source.name}</h3>
      {source.description && <p className={styles.cardDesc}>{source.description}</p>}

      <div className={styles.stats}>
        {source.totalRecords !== undefined && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatNumber(source.totalRecords)}</span>
            <span className={styles.statLabel}>registros</span>
          </div>
        )}
        {source.lastSyncDurationMs !== undefined && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatDuration(source.lastSyncDurationMs)}</span>
            <span className={styles.statLabel}>último sync</span>
          </div>
        )}
        {source.lastSyncAt && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{timeAgo(source.lastSyncAt)}</span>
            <span className={styles.statLabel}>actualizado</span>
          </div>
        )}
      </div>

      {source.status === 'error' && source.lastSyncError && (
        <div className={styles.errorMsg}>! {source.lastSyncError}</div>
      )}

      <div className={styles.scheduleBadge}>⌚ {scheduleLabel(source.schedule)}</div>

      <div className={styles.actions}>
        <Link href={`/domo/fuentes/${source.id}`} className={styles.btnView}>
          Ver detalle
        </Link>
        <button
          onClick={onSync}
          disabled={isSyncing || source.status === 'syncing'}
          className={styles.btnSync}
        >
          {isSyncing || source.status === 'syncing' ? '⟳ Sincronizando…' : '↻ Sync'}
        </button>
        <button onClick={onDelete} className={styles.btnDelete} title="Eliminar fuente">
          ×
        </button>
      </div>
    </div>
  )
}
