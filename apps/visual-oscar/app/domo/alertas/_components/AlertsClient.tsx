'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi, datasetsApi } from '@/lib/domo/api-client'
import { timeAgo } from '@/lib/domo/utils'
import type { DomoAlert, AlertSeverity, AlertStatus } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import AlertFormModal from './AlertFormModal'
import styles from './Alerts.module.css'

const SEV_META: Record<AlertSeverity, { label: string; color: string; bg: string }> = {
  info:     { label: 'Info',    color: '#3b82f6', bg: 'rgba(59,130,246,.1)' },
  warning:  { label: 'Aviso',   color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
  critical: { label: 'Crítica', color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
}

const STATUS_META: Record<AlertStatus, { label: string; glyph: string; color: string }> = {
  active:    { label: 'Activa',    glyph: '●', color: '#22c55e' },
  paused:    { label: 'Pausada',   glyph: '⏸', color: '#9ca3af' },
  triggered: { label: 'Disparada', glyph: '!', color: '#f59e0b' },
  resolved:  { label: 'Resuelta',  glyph: '✓', color: '#3b82f6' },
}

const OP_LABELS: Record<string, string> = {
  gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', neq: '≠',
  pct_change_gt: 'Δ% >', pct_change_lt: 'Δ% <', anomaly: 'Anomalía',
}

const CHANNEL_GLYPH: Record<string, string> = {
  in_app: '◐', email: '✉', webhook: '⇉',
}

export default function AlertsClient() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingAlert, setEditingAlert] = useState<DomoAlert | null>(null)

  const { data: alerts = [], isLoading } = useQuery({
    queryKey:  ['domo', 'alerts'],
    queryFn:   alertsApi.list,
    staleTime: 30_000,
  })

  const { data: datasets = [] } = useQuery({
    queryKey:  ['domo', 'datasets'],
    queryFn:   datasetsApi.list,
    staleTime: 60_000,
  })

  const toggleMutation = useMutation({
    mutationFn: alertsApi.toggle,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'alerts'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: alertsApi.delete,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['domo', 'alerts'] }),
  })

  const testMutation = useMutation({
    mutationFn: alertsApi.testFire,
    onSuccess:  (result) => alert(result.fired ? '✓ Alerta disparada correctamente' : '× Condición no cumplida'),
  })

  const datasetName = (id: string) => datasets.find(d => d.id === id)?.name ?? id

  const activeCount    = alerts.filter(a => a.status === 'active').length
  const triggeredCount = alerts.filter(a => a.status === 'triggered').length
  const criticalCount  = alerts.filter(a => a.severity === 'critical').length

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Alertas</h1>
          <p className={styles.subtitle}>Monitorización proactiva de métricas y datasets</p>
        </div>
        <button onClick={() => { setEditingAlert(null); setShowForm(true) }} className={styles.btnPrimary}>
          + Nueva alerta
        </button>
      </div>

      <div className={styles.kpiStrip}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 68, borderRadius: 10 }} />)
        ) : (
          <>
            <div className={styles.kpiCard}><span className={styles.kpiVal}>{alerts.length}</span><span className={styles.kpiLbl}>Total alertas</span></div>
            <div className={styles.kpiCard}><span className={styles.kpiVal} style={{ color: '#22c55e' }}>{activeCount}</span><span className={styles.kpiLbl}>Activas</span></div>
            <div className={styles.kpiCard}><span className={styles.kpiVal} style={{ color: '#f59e0b' }}>{triggeredCount}</span><span className={styles.kpiLbl}>Disparadas</span></div>
            <div className={styles.kpiCard}><span className={styles.kpiVal} style={{ color: '#ef4444' }}>{criticalCount}</span><span className={styles.kpiLbl}>Críticas</span></div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 100, borderRadius: 12 }} />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className={styles.empty}>
          <span style={{ fontSize: '2rem', opacity: 0.25 }}>!</span>
          <p>No hay alertas configuradas.</p>
          <button onClick={() => setShowForm(true)} className={styles.btnPrimary}>Crear primera alerta</button>
        </div>
      ) : (
        <div className={styles.list}>
          {alerts.map(a => {
            const sev = SEV_META[a.severity]
            const st  = STATUS_META[a.status]
            return (
              <div key={a.id} className={styles.card}>
                <div className={styles.cardLeft}>
                  <span
                    className={styles.sevBadge}
                    style={{ color: sev.color, background: sev.bg, borderColor: `${sev.color}30` }}
                  >
                    {sev.label}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <span className={styles.cardName}>{a.name}</span>
                    <span className={styles.statusChip} style={{ color: st.color }}>
                      {st.glyph} {st.label}
                    </span>
                  </div>
                  {a.description && <p className={styles.cardDesc}>{a.description}</p>}
                  <div className={styles.cardMeta}>
                    <span title="Dataset">⊟ {datasetName(a.datasetId)}</span>
                    <span>· {a.condition.field} {OP_LABELS[a.condition.op]} {a.condition.threshold ?? ''}</span>
                    {a.condition.windowMinutes && <span>· ventana {a.condition.windowMinutes}m</span>}
                    {a.triggerCount !== undefined && a.triggerCount > 0 && (
                      <span>· {a.triggerCount} disparos</span>
                    )}
                    {a.lastTriggeredAt && (
                      <span>· último: {timeAgo(a.lastTriggeredAt)}</span>
                    )}
                  </div>
                  <div className={styles.channelBadges}>
                    {a.actions.map((act, i) => (
                      <span key={i} className={styles.channelBadge}>
                        {CHANNEL_GLYPH[act.channel] ?? '●'} {act.channel}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button
                    onClick={() => toggleMutation.mutate(a.id)}
                    className={styles.btnSmall}
                    title={a.status === 'paused' ? 'Activar' : 'Pausar'}
                  >
                    {a.status === 'paused' ? '▶' : '⏸'}
                  </button>
                  <button onClick={() => testMutation.mutate(a.id)} className={styles.btnSmall} title="Probar">⚡</button>
                  <button onClick={() => { setEditingAlert(a); setShowForm(true) }} className={styles.btnSmall} title="Editar">✎</button>
                  <button
                    onClick={() => { if (confirm(`¿Eliminar "${a.name}"?`)) deleteMutation.mutate(a.id) }}
                    className={styles.btnSmall}
                    title="Eliminar"
                  >×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <AlertFormModal
          alert={editingAlert}
          datasets={datasets}
          onClose={() => { setShowForm(false); setEditingAlert(null) }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['domo', 'alerts'] })
            setShowForm(false)
            setEditingAlert(null)
          }}
        />
      )}
    </div>
  )
}
