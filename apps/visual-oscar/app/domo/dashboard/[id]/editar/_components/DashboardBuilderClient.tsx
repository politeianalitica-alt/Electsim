'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardsApi } from '@/lib/domo/api-client'
import { generateId } from '@/lib/domo/utils'
import { WIDGET_TYPE_META } from '@/lib/domo/constants'
import type { Dashboard, DashboardWidget, WidgetType } from '@/types/domo'
import Skeleton from '@/components/Skeleton'
import WidgetRenderer from '../../_components/WidgetRenderer'
import WidgetConfigPanel from './WidgetConfigPanel'
import styles from './DashboardBuilder.module.css'

// SSR-safe import dinámico de react-grid-layout
const GridLayout = dynamic(() => import('react-grid-layout'), { ssr: false })

const COLS       = 12
const ROW_HEIGHT = 100

const WIDGET_CATEGORIES: Array<{ key: string; label: string; items: WidgetType[] }> = [
  { key: 'numeric', label: 'Numérico',        items: ['kpi', 'gauge'] },
  { key: 'chart',   label: 'Gráficos',        items: ['bar', 'bar_horizontal', 'line', 'area', 'pie', 'donut', 'scatter', 'heatmap'] },
  { key: 'geo',     label: 'Geo / Especial',  items: ['hemicycle', 'map'] },
  { key: 'table',   label: 'Tabla',           items: ['table'] },
  { key: 'content', label: 'Contenido',       items: ['text'] },
]

export default function DashboardBuilderClient({ id }: { id: string }) {
  const qc    = useQueryClient()
  const isNew = id === 'nuevo'

  const [name,             setName]             = useState('Nuevo dashboard')
  const [description,      setDescription]      = useState('')
  const [widgets,          setWidgets]          = useState<DashboardWidget[]>([])
  const [isDirty,          setIsDirty]          = useState(false)
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)
  const [showLibrary,      setShowLibrary]      = useState(true)

  const { isLoading, data: dashboardData } = useQuery({
    queryKey: ['domo', 'dashboards', id],
    queryFn:  () => dashboardsApi.get(id),
    enabled:  !isNew,
  })

  useEffect(() => {
    if (!dashboardData) return
    setName(dashboardData.name)
    setDescription(dashboardData.description ?? '')
    setWidgets(dashboardData.widgets)
  }, [dashboardData])

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Dashboard>) =>
      isNew ? dashboardsApi.create(data) : dashboardsApi.update(id, data),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['domo', 'dashboards'] })
      setIsDirty(false)
      if (isNew && saved?.id) window.location.href = `/domo/dashboard/${saved.id}/editar`
    },
  })

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    setWidgets(prev => prev.map(w => {
      const l = layout.find(item => item.i === w.id)
      if (!l) return w
      return { ...w, layout: { ...w.layout, x: l.x, y: l.y, w: l.w, h: l.h } }
    }))
    setIsDirty(true)
  }, [])

  const addWidget = useCallback((type: WidgetType) => {
    const meta = WIDGET_TYPE_META[type]
    const newWidget: DashboardWidget = {
      id:   generateId(),
      type,
      layout: {
        i: '',
        x: 0,
        y: widgets.length > 0 ? Math.max(...widgets.map(w => w.layout.y + w.layout.h)) : 0,
        w: meta.defaultW,
        h: meta.defaultH,
        minW: meta.minW,
        minH: meta.minH,
      },
      config: { title: meta.label },
    }
    newWidget.layout.i = newWidget.id
    setWidgets(prev => [...prev, newWidget])
    setSelectedWidgetId(newWidget.id)
    setIsDirty(true)
  }, [widgets])

  const removeWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId))
    setSelectedWidgetId(prev => prev === widgetId ? null : prev)
    setIsDirty(true)
  }, [])

  const updateWidgetConfig = useCallback((widgetId: string, config: Partial<DashboardWidget['config']>) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w))
    setIsDirty(true)
  }, [])

  const handleSave = () => {
    saveMutation.mutate({ name, description, widgets, visibility: 'private' })
  }

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId) ?? null

  const layout: Layout[] = widgets.map(w => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: w.layout.minW,
    minH: w.layout.minH,
  }))

  if (isLoading) return <Skeleton style={{ height: '100vh' }} />

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <Link href="/domo/dashboard" className={styles.breadcrumbLink}>← Dashboards</Link>
          <span className={styles.sep}>›</span>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setIsDirty(true) }}
            className={styles.nameInput}
          />
          {isDirty && <span className={styles.dirtyBadge}>Sin guardar</span>}
        </div>
        <div className={styles.topRight}>
          <span className={styles.widgetCount}>{widgets.length} widgets</span>
          <button onClick={() => setShowLibrary(l => !l)} className={styles.btnToggle}>
            {showLibrary ? '← Ocultar biblioteca' : 'Biblioteca →'}
          </button>
          {!isNew && (
            <Link href={`/domo/dashboard/${id}`} className={styles.btnPreview}>
              Vista previa
            </Link>
          )}
          <button onClick={handleSave} disabled={saveMutation.isPending || !name.trim()} className={styles.btnSave}>
            {saveMutation.isPending ? '⟳' : isDirty ? '● Guardar' : '✓ Guardado'}
          </button>
        </div>
      </div>

      <div className={styles.main}>
        {showLibrary && (
          <div className={styles.library}>
            <div className={styles.libraryTitle}>Biblioteca</div>
            {WIDGET_CATEGORIES.map(cat => (
              <div key={cat.key} className={styles.libCategory}>
                <span className={styles.libCategoryLabel}>{cat.label}</span>
                <div className={styles.libGrid}>
                  {cat.items.map(type => {
                    const meta = WIDGET_TYPE_META[type]
                    return (
                      <button
                        key={type}
                        onClick={() => addWidget(type)}
                        className={styles.libItem}
                        title={meta.label}
                      >
                        <span className={styles.libIcon}>{meta.icon}</span>
                        <span className={styles.libLabel}>{meta.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.canvas}>
          {widgets.length === 0 ? (
            <div className={styles.emptyCanvas}>
              <span style={{ fontSize: '2rem', opacity: 0.2 }}>⊟</span>
              <p>Añade widgets desde la biblioteca de la izquierda</p>
            </div>
          ) : (
            <GridLayout
              layout={layout}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              width={900}
              onLayoutChange={handleLayoutChange}
              draggableHandle={`.${styles.widgetDragHandle}`}
              style={{ minHeight: 400 }}
              resizeHandles={['se']}
            >
              {widgets.map(widget => (
                <div
                  key={widget.id}
                  onClick={() => setSelectedWidgetId(widget.id)}
                  className={`${styles.widgetCell} ${selectedWidgetId === widget.id ? styles.widgetSelected : ''}`}
                >
                  <div className={styles.widgetDragHandle}>⠿</div>
                  <WidgetRenderer
                    widget={widget}
                    dashboardId={isNew ? 'preview' : id}
                    editable
                    onEdit={() => setSelectedWidgetId(widget.id)}
                    onRemove={() => removeWidget(widget.id)}
                  />
                </div>
              ))}
            </GridLayout>
          )}
        </div>

        {selectedWidget && (
          <WidgetConfigPanel
            widget={selectedWidget}
            onUpdate={(cfg) => updateWidgetConfig(selectedWidget.id, cfg)}
            onClose={() => setSelectedWidgetId(null)}
          />
        )}
      </div>
    </div>
  )
}
