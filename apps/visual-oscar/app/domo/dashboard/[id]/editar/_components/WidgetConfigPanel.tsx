'use client'

import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { datasetsApi } from '@/lib/domo/api-client'
import { WIDGET_TYPE_META } from '@/lib/domo/constants'
import type { DashboardWidget, WidgetConfig } from '@/types/domo'
import styles from './DashboardBuilder.module.css'

interface Props {
  widget:   DashboardWidget
  onUpdate: (cfg: Partial<WidgetConfig>) => void
  onClose:  () => void
}

export default function WidgetConfigPanel({ widget, onUpdate, onClose }: Props) {
  const meta = WIDGET_TYPE_META[widget.type]
  const cfg  = widget.config

  const { data: datasets = [] } = useQuery({
    queryKey:  ['domo', 'datasets'],
    queryFn:   datasetsApi.list,
    staleTime: 60_000,
  })

  const selectedDataset = datasets.find(d => d.id === cfg.datasetId)
  const schemaColumns   = selectedDataset?.schema.map(c => c.name) ?? []

  const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className={styles.cfgField}>
      <label className={styles.cfgLabel}>{label}</label>
      {children}
    </div>
  )

  return (
    <div className={styles.configPanel}>
      <div className={styles.configPanelHeader}>
        <div className={styles.configPanelTitle}>
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </div>
        <button onClick={onClose} className={styles.configPanelClose}>✕</button>
      </div>

      <div className={styles.configPanelBody}>
        <div className={styles.cfgSection}>
          <span className={styles.cfgSectionTitle}>Visualización</span>
          <Field label="Título">
            <input type="text" value={cfg.title ?? ''}    onChange={e => onUpdate({ title: e.target.value })}    className={styles.cfgInput} placeholder="Título del widget" />
          </Field>
          <Field label="Subtítulo">
            <input type="text" value={cfg.subtitle ?? ''} onChange={e => onUpdate({ subtitle: e.target.value })} className={styles.cfgInput} placeholder="Subtítulo opcional" />
          </Field>
          {(widget.type === 'kpi' || widget.type === 'gauge') && (
            <>
              <Field label="Prefijo">
                <input type="text" value={cfg.prefix ?? ''} onChange={e => onUpdate({ prefix: e.target.value })} className={styles.cfgInput} placeholder="€, %, #…" />
              </Field>
              <Field label="Unidad">
                <input type="text" value={cfg.unit ?? ''} onChange={e => onUpdate({ unit: e.target.value })}    className={styles.cfgInput} placeholder="pts, M€, %…" />
              </Field>
            </>
          )}
          {widget.type !== 'text' && widget.type !== 'kpi' && widget.type !== 'gauge' && (
            <Field label="Esquema de color">
              <select
                value={cfg.colorScheme ?? 'politeia'}
                onChange={e => onUpdate({ colorScheme: e.target.value as WidgetConfig['colorScheme'] })}
                className={styles.cfgSelect}
              >
                <option value="politeia">Politeia</option>
                <option value="partido">Por partido político</option>
                <option value="diverging">Divergente</option>
                <option value="sequential">Secuencial</option>
                <option value="monochrome">Monocromático</option>
              </select>
            </Field>
          )}
        </div>

        {widget.type !== 'text' && (
          <div className={styles.cfgSection}>
            <span className={styles.cfgSectionTitle}>Fuente de datos</span>
            <Field label="Dataset">
              <select
                value={cfg.datasetId ?? ''}
                onChange={e => onUpdate({ datasetId: e.target.value, xField: undefined, yField: undefined })}
                className={styles.cfgSelect}
              >
                <option value="">Sin conectar</option>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            {schemaColumns.length > 0 && (
              <>
                {['kpi', 'gauge'].includes(widget.type) ? (
                  <>
                    <Field label="Campo de valor">
                      <select value={cfg.valueField ?? ''} onChange={e => onUpdate({ valueField: e.target.value })} className={styles.cfgSelect}>
                        <option value="">— columna —</option>
                        {schemaColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    {widget.type === 'kpi' && (
                      <Field label="Agregación">
                        <select
                          value={cfg.kpiAggregation ?? 'sum'}
                          onChange={e => onUpdate({ kpiAggregation: e.target.value as WidgetConfig['kpiAggregation'] })}
                          className={styles.cfgSelect}
                        >
                          <option value="sum">Suma</option>
                          <option value="avg">Media</option>
                          <option value="count">Conteo</option>
                          <option value="min">Mínimo</option>
                          <option value="max">Máximo</option>
                          <option value="last">Último</option>
                        </select>
                      </Field>
                    )}
                  </>
                ) : ['pie', 'donut'].includes(widget.type) ? (
                  <>
                    <Field label="Campo etiqueta">
                      <select value={cfg.labelField ?? ''} onChange={e => onUpdate({ labelField: e.target.value })} className={styles.cfgSelect}>
                        <option value="">— columna —</option>
                        {schemaColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Campo valor">
                      <select value={cfg.valueField ?? ''} onChange={e => onUpdate({ valueField: e.target.value })} className={styles.cfgSelect}>
                        <option value="">— columna —</option>
                        {schemaColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Eje X / Categoría">
                      <select value={cfg.xField ?? ''} onChange={e => onUpdate({ xField: e.target.value })} className={styles.cfgSelect}>
                        <option value="">— columna —</option>
                        {schemaColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Eje Y / Valor">
                      <select value={cfg.yField ?? ''} onChange={e => onUpdate({ yField: e.target.value })} className={styles.cfgSelect}>
                        <option value="">— columna —</option>
                        {schemaColumns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    {['scatter', 'heatmap'].includes(widget.type) && (
                      <Field label="Campo color">
                        <select value={cfg.colorField ?? ''} onChange={e => onUpdate({ colorField: e.target.value })} className={styles.cfgSelect}>
                          <option value="">Ninguno</option>
                          {schemaColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label="Ordenar por">
                      <div style={{ display: 'flex', gap: 4 }}>
                        <select value={cfg.sortField ?? ''} onChange={e => onUpdate({ sortField: e.target.value })} className={styles.cfgSelect} style={{ flex: 1 }}>
                          <option value="">Sin ordenar</option>
                          {schemaColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={cfg.sortDir ?? 'desc'} onChange={e => onUpdate({ sortDir: e.target.value as 'asc' | 'desc' })} className={styles.cfgSelect} style={{ width: 64 }}>
                          <option value="desc">↓</option>
                          <option value="asc">↑</option>
                        </select>
                      </div>
                    </Field>
                    <Field label="Límite de filas">
                      <input type="number" min={1} max={500} value={cfg.limit ?? 20} onChange={e => onUpdate({ limit: Number(e.target.value) })} className={styles.cfgInput} />
                    </Field>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {widget.type === 'text' && (
          <div className={styles.cfgSection}>
            <span className={styles.cfgSectionTitle}>Contenido</span>
            <Field label="Texto (HTML básico permitido)">
              <textarea
                value={cfg.content ?? ''}
                onChange={e => onUpdate({ content: e.target.value })}
                className={styles.cfgTextarea}
                rows={6}
                placeholder="<strong>Título</strong>&#10;Tu texto aquí…"
              />
            </Field>
          </div>
        )}

        {widget.type === 'gauge' && (
          <div className={styles.cfgSection}>
            <span className={styles.cfgSectionTitle}>Gauge</span>
            <Field label="Mínimo">
              <input type="number" value={cfg.gaugeMin ?? 0}   onChange={e => onUpdate({ gaugeMin: Number(e.target.value) })}   className={styles.cfgInput} />
            </Field>
            <Field label="Máximo">
              <input type="number" value={cfg.gaugeMax ?? 100} onChange={e => onUpdate({ gaugeMax: Number(e.target.value) })} className={styles.cfgInput} />
            </Field>
          </div>
        )}
      </div>
    </div>
  )
}
