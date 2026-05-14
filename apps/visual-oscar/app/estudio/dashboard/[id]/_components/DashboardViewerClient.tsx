'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { dashboardsApi } from '@/lib/estudio/api-client'
import Skeleton from '@/components/Skeleton'
import WidgetRenderer from './WidgetRenderer'
import styles from './DashboardViewer.module.css'

const DashboardShareModal = dynamic(() => import('@/components/DashboardShareModal'), { ssr: false })

export default function DashboardViewerClient({ id }: { id: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const { data: dashboard, isLoading, isError } = useQuery({
    queryKey:        ['domo', 'dashboards', id],
    queryFn:         () => dashboardsApi.get(id),
    staleTime:       30_000,
  })

  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <Skeleton style={{ height: 40, width: 300, marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: 200, borderRadius: 12 }} />)}
        </div>
      </div>
    )
  }

  if (isError || !dashboard) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted,#6b7280)' }}>
        <p>Dashboard no encontrado.</p>
        <Link href="/estudio/dashboard">← Volver</Link>
      </div>
    )
  }

  const COLS  = 12
  const ROW_H = 100

  const maxBottom = dashboard.widgets.length > 0
    ? Math.max(...dashboard.widgets.map(w => w.layout.y + w.layout.h))
    : 0

  return (
    <div className={`${styles.root} ${isFullscreen ? styles.fullscreen : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/estudio/dashboard" className={styles.breadcrumbLink}>← Dashboards</Link>
          <span className={styles.sep}>›</span>
          <span className={styles.title}>{dashboard.name}</span>
        </div>
        <div className={styles.headerRight}>
          <button onClick={() => setShowShare(true)} className={styles.btnEdit}>
            ⊡ Compartir
          </button>
          <Link href={`/estudio/dashboard/${id}/editar`} className={styles.btnEdit}>Editar</Link>
          <button onClick={() => setIsFullscreen(f => !f)} className={styles.btnIcon}>
            {isFullscreen ? '⊡' : '⤢'}
          </button>
        </div>
      </div>

      <div className={styles.canvas}>
        {dashboard.widgets.length === 0 ? (
          <div className={styles.emptyCanvas}>
            <span style={{ fontSize: '2rem', opacity: 0.25 }}>⊟</span>
            <p>Este dashboard no tiene widgets.</p>
            <Link href={`/estudio/dashboard/${id}/editar`} className={styles.btnPrimary}>
              + Añadir widgets
            </Link>
          </div>
        ) : (
          <div
            className={styles.gridCanvas}
            style={{
              position: 'relative',
              width:    '100%',
              minHeight: `${(maxBottom + 1) * ROW_H}px`,
            }}
          >
            {dashboard.widgets.map(widget => (
              <div
                key={widget.id}
                style={{
                  position: 'absolute',
                  left:   `${(widget.layout.x / COLS) * 100}%`,
                  top:    `${widget.layout.y * ROW_H}px`,
                  width:  `${(widget.layout.w / COLS) * 100}%`,
                  height: `${widget.layout.h * ROW_H}px`,
                  padding: '4px',
                  boxSizing: 'border-box',
                }}
              >
                <WidgetRenderer
                  widget={widget}
                  dashboardId={id}
                  editable={false}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showShare && dashboard && (
        <DashboardShareModal
          dashboardId={id}
          dashboardName={dashboard.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
