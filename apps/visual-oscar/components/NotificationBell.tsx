'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/context/NotificationsContext'
import { timeAgo } from '@/lib/domo/utils'
import type { DomoNotification, AlertSeverity, NotificationType } from '@/types/domo'
import styles from './NotificationBell.module.css'

const TYPE_GLYPH: Record<NotificationType, string> = {
  alert_triggered:  '!',
  alert_resolved:   '✓',
  dashboard_shared: '⊡',
  dataset_updated:  '↻',
  pipeline_failed:  '×',
  pipeline_success: '●',
  mention:          '@',
  system:           'i',
}

const SEV_COLORS: Record<AlertSeverity, string> = {
  info:     '#3b82f6',
  warning:  '#f59e0b',
  critical: '#ef4444',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className={styles.root} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={styles.bell}
        aria-label={`${unreadCount} notificaciones sin leer`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Notificaciones</span>
            <div className={styles.dropdownActions}>
              {unreadCount > 0 && (
                <button onClick={() => markAllRead()} className={styles.markAllBtn}>
                  Marcar todas leídas
                </button>
              )}
              <Link href="/domo/notificaciones" onClick={() => setOpen(false)} className={styles.seeAllLink}>
                Ver todas
              </Link>
            </div>
          </div>

          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>
                <span style={{ fontSize: '1.4rem', opacity: 0.3 }}>◌</span>
                <p>Sin notificaciones</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={() => { if (!n.read) markRead(n.id) }}
                  onDelete={() => deleteNotification(n.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({ notification: n, onRead, onDelete }: {
  notification: DomoNotification
  onRead: () => void
  onDelete: () => void
}) {
  const glyph = TYPE_GLYPH[n.type] ?? 'i'
  const color = n.severity ? SEV_COLORS[n.severity] : '#6b7280'

  const inner = (
    <div className={`${styles.item} ${!n.read ? styles.unread : ''}`} onClick={onRead}>
      <span className={styles.itemIcon} style={{ color, background: `${color}15` }}>{glyph}</span>
      <div className={styles.itemBody}>
        <div className={styles.itemTitle}>{n.title}</div>
        <div className={styles.itemBody2}>{n.body}</div>
        <div className={styles.itemTime}>{timeAgo(n.createdAt)}</div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className={styles.itemDelete}
        title="Eliminar"
      >✕</button>
    </div>
  )

  return n.actionUrl ? (
    <Link href={n.actionUrl} style={{ textDecoration: 'none' }}>{inner}</Link>
  ) : inner
}
