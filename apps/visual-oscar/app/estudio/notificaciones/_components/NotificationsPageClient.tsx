'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/context/NotificationsContext'
import { timeAgo } from '@/lib/estudio/utils'
import type { NotificationType, AlertSeverity } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import styles from './Notifications.module.css'

const TYPE_META: Record<NotificationType, { label: string; glyph: string }> = {
  alert_triggered:  { label: 'Alerta disparada',     glyph: '!' },
  alert_resolved:   { label: 'Alerta resuelta',      glyph: '✓' },
  dashboard_shared: { label: 'Dashboard compartido', glyph: '⊡' },
  dataset_updated:  { label: 'Dataset actualizado',  glyph: '↻' },
  pipeline_failed:  { label: 'Pipeline fallido',     glyph: '×' },
  pipeline_success: { label: 'Pipeline exitoso',     glyph: '●' },
  mention:          { label: 'Mención',              glyph: '@' },
  system:           { label: 'Sistema',              glyph: 'i' },
}

const SEV_COLORS: Record<AlertSeverity, string> = {
  info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444',
}

const TYPE_FILTERS = ['Todas', 'Alertas', 'Pipelines', 'Sharing', 'Sistema'] as const

export default function NotificationsPageClient() {
  const { notifications, unreadCount, isLoading, markRead, markAllRead, deleteNotification } = useNotifications()
  const [filter, setFilter] = useState<typeof TYPE_FILTERS[number]>('Todas')

  const filtered = notifications.filter(n => {
    if (filter === 'Todas')     return true
    if (filter === 'Alertas')   return n.type === 'alert_triggered' || n.type === 'alert_resolved'
    if (filter === 'Pipelines') return n.type === 'pipeline_failed' || n.type === 'pipeline_success' || n.type === 'dataset_updated'
    if (filter === 'Sharing')   return n.type === 'dashboard_shared' || n.type === 'mention'
    if (filter === 'Sistema')   return n.type === 'system'
    return true
  })

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notificaciones</h1>
          {unreadCount > 0 && (
            <span className={styles.unreadCount}>{unreadCount} sin leer</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllRead()} className={styles.markAllBtn}>
            ✓ Marcar todas como leídas
          </button>
        )}
      </div>

      <div className={styles.filterBar}>
        {TYPE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span style={{ fontSize: '2rem', opacity: 0.25 }}>◌</span>
          <p>No hay notificaciones{filter !== 'Todas' ? ` de tipo "${filter}"` : ''}.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(n => {
            const meta  = TYPE_META[n.type]
            const color = n.severity ? SEV_COLORS[n.severity] : '#6b7280'
            const content = (
              <div
                className={`${styles.card} ${!n.read ? styles.unread : ''}`}
                onClick={() => { if (!n.read) markRead(n.id) }}
              >
                <span className={styles.icon} style={{ color, background: `${color}15` }}>{meta.glyph}</span>
                <div className={styles.body}>
                  <div className={styles.cardTitle}>{n.title}</div>
                  <div className={styles.cardBody}>{n.body}</div>
                  <div className={styles.cardMeta}>
                    <span className={styles.typeBadge}>{meta.label}</span>
                    <span>· {timeAgo(n.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                  className={styles.deleteBtn}
                  title="Eliminar"
                >✕</button>
              </div>
            )
            return n.actionUrl ? (
              <Link key={n.id} href={n.actionUrl} style={{ textDecoration: 'none' }}>{content}</Link>
            ) : <div key={n.id}>{content}</div>
          })}
        </div>
      )}
    </div>
  )
}
