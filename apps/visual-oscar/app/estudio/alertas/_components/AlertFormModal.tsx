'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { alertsApi } from '@/lib/estudio/api-client'
import type { DomoAlert, AlertConditionOp, AlertSeverity, AlertChannel, AlertCondition } from '@/types/domo'
import styles from './Alerts.module.css'

const OPS: Array<{ value: AlertConditionOp; label: string }> = [
  { value: 'gt',             label: 'Mayor que (>)' },
  { value: 'gte',            label: 'Mayor o igual (≥)' },
  { value: 'lt',             label: 'Menor que (<)' },
  { value: 'lte',            label: 'Menor o igual (≤)' },
  { value: 'eq',             label: 'Igual a (=)' },
  { value: 'neq',            label: 'Distinto de (≠)' },
  { value: 'pct_change_gt',  label: 'Cambio % mayor que' },
  { value: 'pct_change_lt',  label: 'Cambio % menor que' },
  { value: 'anomaly',        label: 'Anomalía detectada' },
]

interface Props {
  alert:    DomoAlert | null
  datasets: Array<{ id: string; name: string; schema: Array<{ name: string }> }>
  onClose:  () => void
  onSaved:  () => void
}

export default function AlertFormModal({ alert: existing, datasets, onClose, onSaved }: Props) {
  const isEdit = !!existing

  const [name,         setName]         = useState(existing?.name ?? '')
  const [description,  setDescription]  = useState(existing?.description ?? '')
  const [datasetId,    setDatasetId]    = useState(existing?.datasetId ?? '')
  const [field,        setField]        = useState(existing?.condition.field ?? '')
  const [op,           setOp]           = useState<AlertConditionOp>(existing?.condition.op ?? 'gt')
  const [threshold,    setThreshold]    = useState<string>(String(existing?.condition.threshold ?? ''))
  const [aggregation,  setAggregation]  = useState<AlertCondition['aggregation']>(existing?.condition.aggregation ?? 'last')
  const [windowMinutes,setWindowMinutes]= useState<string>(String(existing?.condition.windowMinutes ?? '60'))
  const [severity,     setSeverity]     = useState<AlertSeverity>(existing?.severity ?? 'warning')
  const [channels,     setChannels]     = useState<AlertChannel[]>(
    existing?.actions.map(a => a.channel) ?? ['in_app']
  )
  const [cooldown,     setCooldown]     = useState<string>(String(existing?.cooldownMinutes ?? '60'))

  const selectedDataset = datasets.find(d => d.id === datasetId)
  const schemaColumns   = selectedDataset?.schema.map(c => c.name) ?? []

  const toggleChannel = (ch: AlertChannel) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  const saveMutation = useMutation({
    mutationFn: (data: Partial<DomoAlert>) =>
      isEdit ? alertsApi.update(existing!.id, data) : alertsApi.create(data),
    onSuccess: onSaved,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !datasetId || !field) return
    saveMutation.mutate({
      name,
      description: description || undefined,
      datasetId,
      condition: {
        field,
        op,
        threshold:     threshold     !== '' ? Number(threshold)     : undefined,
        aggregation,
        windowMinutes: windowMinutes !== '' ? Number(windowMinutes) : undefined,
      },
      severity,
      actions: channels.map(ch => ({ channel: ch })),
      cooldownMinutes: cooldown !== '' ? Number(cooldown) : 60,
      status: existing?.status ?? 'active',
    })
  }

  return (
 <div className={styles.modalOverlay} onClick={onClose}>
 <div className={styles.modal} onClick={e => e.stopPropagation()}>
 <div className={styles.modalHeader}>
 <span className={styles.modalTitle}>{isEdit ? 'Editar alerta' : 'Nueva alerta'}</span>
 <button onClick={onClose} className={styles.modalClose}></button>
 </div>
 <form onSubmit={handleSubmit} className={styles.modalBody}>
 <div className={styles.fSection}>
 <span className={styles.fSectionTitle}>Identificación</span>
 <label className={styles.fLabel}>Nombre *</label>
 <input value={name} onChange={e => setName(e.target.value)} required className={styles.fInput} placeholder="Ej: Caída de intención de voto PP > 3%" />
 <label className={styles.fLabel}>Descripción</label>
 <input value={description} onChange={e => setDescription(e.target.value)} className={styles.fInput} placeholder="Descripción opcional" />
 <label className={styles.fLabel}>Severidad</label>
 <div className={styles.sevGroup}>
              {(['info', 'warning', 'critical'] as AlertSeverity[]).map(s => (
 <button
                  key={s} type="button"
                  onClick={() => setSeverity(s)}
                  className={`${styles.sevBtn} ${severity === s ? styles.sevActive : ''}`}
                  style={severity === s ? { borderColor: s === 'info' ? '#3b82f6' : s === 'warning' ? '#f59e0b' : '#ef4444', color: s === 'info' ? '#3b82f6' : s === 'warning' ? '#f59e0b' : '#ef4444' } : {}}
                >
                  {s === 'info' ? 'ℹ Info' : s === 'warning' ? '! Aviso' : ' Crítica'}
 </button>
              ))}
 </div>
 </div>

 <div className={styles.fSection}>
 <span className={styles.fSectionTitle}>Condición</span>
 <label className={styles.fLabel}>Dataset *</label>
 <select value={datasetId} onChange={e => { setDatasetId(e.target.value); setField('') }} required className={styles.fSelect}>
 <option value="">Seleccionar dataset…</option>
              {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
 </select>
 <label className={styles.fLabel}>Campo *</label>
 <select value={field} onChange={e => setField(e.target.value)} required className={styles.fSelect} disabled={!datasetId}>
 <option value="">Seleccionar campo…</option>
              {schemaColumns.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 <label className={styles.fLabel}>Agregación</label>
 <select value={aggregation} onChange={e => setAggregation(e.target.value as AlertCondition['aggregation'])} className={styles.fSelect}>
 <option value="last">Último valor</option>
 <option value="sum">Suma</option>
 <option value="avg">Media</option>
 <option value="count">Conteo</option>
 <option value="min">Mínimo</option>
 <option value="max">Máximo</option>
 </select>
 <label className={styles.fLabel}>Operador</label>
 <select value={op} onChange={e => setOp(e.target.value as AlertConditionOp)} className={styles.fSelect}>
              {OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
 </select>
            {op !== 'anomaly' && (
 <>
 <label className={styles.fLabel}>Umbral</label>
 <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} className={styles.fInput} placeholder="Ej: 3.5" step="any" />
 </>
            )}
            {(op === 'pct_change_gt' || op === 'pct_change_lt' || op === 'anomaly') && (
 <>
 <label className={styles.fLabel}>Ventana (minutos)</label>
 <input type="number" value={windowMinutes} onChange={e => setWindowMinutes(e.target.value)} className={styles.fInput} min={1} />
 </>
            )}
 </div>

 <div className={styles.fSection}>
 <span className={styles.fSectionTitle}>Canales de notificación</span>
 <div className={styles.channelGroup}>
              {(['in_app', 'email', 'webhook'] as AlertChannel[]).map(ch => (
 <button
                  key={ch} type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`${styles.channelToggle} ${channels.includes(ch) ? styles.channelActive : ''}`}
                >
                  {ch === 'in_app' ? '◐ In-app' : ch === 'email' ? ' Email' : '⇉ Webhook'}
 </button>
              ))}
 </div>
 <label className={styles.fLabel}>Cooldown (minutos entre alertas)</label>
 <input type="number" value={cooldown} onChange={e => setCooldown(e.target.value)} className={styles.fInput} min={1} />
 </div>

 <div className={styles.modalFooter}>
 <button type="button" onClick={onClose} className={styles.btnCancel}>Cancelar</button>
 <button type="submit" disabled={saveMutation.isPending} className={styles.btnPrimary}>
              {saveMutation.isPending ? '⟳ Guardando…' : isEdit ? 'Guardar cambios' : 'Crear alerta'}
 </button>
 </div>
 </form>
 </div>
 </div>
  )
}
