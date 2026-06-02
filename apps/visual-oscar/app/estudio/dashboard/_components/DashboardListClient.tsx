'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardsApi } from '@/lib/estudio/api-client'
import { timeAgo, formatNumber } from '@/lib/estudio/utils'
import type { Dashboard, DashboardVisibility } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import styles from './DashboardList.module.css'

const VIS_FILTERS: Array<{ value: DashboardVisibility | 'all'; label: string }> = [
  { value: 'all',     label: 'Todos' },
  { value: 'private', label: 'Privados' },
  { value: 'team',    label: 'Equipo' },
  { value: 'public',  label: 'Públicos' },
]

const VIS_LABELS: Record<DashboardVisibility, string> = {
  private: 'Privado', team: 'Equipo', public: 'Público',
}

const VIS_COLORS: Record<DashboardVisibility, string> = {
  private: '#9ca3af', team: '#3b82f6', public: '#22c55e',
}

export default function DashboardListClient() {
  const qc = useQueryClient()
  const [visFilter, setVisFilter] = useState<DashboardVisibility | 'all'>('all')
  const [search,    setSearch]    = useState('')

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey:  ['domo', 'dashboards'],
    queryFn:   dashboardsApi.list,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dashboardsApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'dashboards'] }),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => dashboardsApi.duplicate(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'dashboards'] }),
  })

  const filtered = dashboards.filter(d => {
    const matchVis    = visFilter === 'all' || d.visibility === visFilter
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase())
    return matchVis && matchSearch
  })

  const templates = dashboards.filter(d => d.isTemplate).length

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          {/* Sprint Q-C.4 · alinear con nav/hub · "Mis paneles" */}
          <h1 className={styles.title}>Mis paneles</h1>
          <p className={styles.subtitle}>Construye paneles de análisis político conectados a tus tablas.</p>
        </div>
        <Link href="/estudio/dashboard/nuevo" className={styles.btnPrimary}>
          + Nuevo panel
        </Link>
      </div>

      <div className={styles.kpiStrip}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 72, borderRadius: 12 }} />)
        ) : (
          <>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue}>{dashboards.length}</span>
              <span className={styles.kpiLabel}>Total dashboards</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>
                {dashboards.reduce((a, d) => a + d.widgets.length, 0)}
              </span>
              <span className={styles.kpiLabel}>Widgets totales</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiValue} style={{ color: '#8b5cf6' }}>{templates}</span>
              <span className={styles.kpiLabel}>Plantillas</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Buscar dashboard…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <div className={styles.filterGroup}>
          {VIS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setVisFilter(f.value)}
              className={`${styles.filterBtn} ${visFilter === f.value ? styles.filterActive : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 180, borderRadius: 14 }} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <span style={{ fontSize: '2rem', opacity: 0.4 }}>⊟</span>
          <p>{dashboards.length === 0 ? 'Todavía no hay dashboards.' : 'Ningún dashboard coincide.'}</p>
          {dashboards.length === 0 && (
            <Link href="/estudio/dashboard/nuevo" className={styles.btnPrimary}>Crear primer dashboard</Link>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map(dashboard => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              visLabel={VIS_LABELS[dashboard.visibility]}
              visColor={VIS_COLORS[dashboard.visibility]}
              onDuplicate={() => duplicateMutation.mutate(dashboard.id)}
              onDelete={() => {
                if (confirm(`¿Eliminar "${dashboard.name}"?`)) deleteMutation.mutate(dashboard.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DashboardCard({
  dashboard, visLabel, visColor, onDuplicate, onDelete,
}: {
  dashboard:    Dashboard
  visLabel:     string
  visColor:     string
  onDuplicate:  () => void
  onDelete:     () => void
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardThumb}>
        {dashboard.thumbnailUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={dashboard.thumbnailUrl} alt={dashboard.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '1.5rem', opacity: 0.35 }}>⊟</span>
        }
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardName}>{dashboard.name}</span>
          {dashboard.isTemplate && <span className={styles.templateBadge}>Plantilla</span>}
          <span className={styles.visBadge} style={{ color: visColor, background: `${visColor}15`, borderColor: `${visColor}35` }}>
            {visLabel}
          </span>
        </div>
        {dashboard.description && <p className={styles.cardDesc}>{dashboard.description}</p>}
        <div className={styles.cardMeta}>
          <span>{dashboard.widgets.length} widgets</span>
          {dashboard.viewCount !== undefined && <span>· {formatNumber(dashboard.viewCount)} vistas</span>}
          <span>· {timeAgo(dashboard.updatedAt)}</span>
        </div>
        {dashboard.tags && dashboard.tags.length > 0 && (
          <div className={styles.tags}>
            {dashboard.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>
        )}
      </div>
      <div className={styles.cardActions}>
        <Link href={`/estudio/dashboard/${dashboard.id}`} className={styles.btnView}>Abrir</Link>
        <Link href={`/estudio/dashboard/${dashboard.id}/editar`} className={styles.btnEdit}>Editar</Link>
        <button onClick={onDuplicate} className={styles.btnIcon} title="Duplicar">⎘</button>
        <button onClick={onDelete} className={styles.btnIcon} title="Eliminar">×</button>
      </div>
    </div>
  )
}
