'use client'

/**
 * Command Palette ⌘K — buscador universal del módulo Domo.
 *
 * Inspirado en Linear / Domo / Looker / Notion: pulsa ⌘K (o Ctrl+K) en
 * cualquier página /estudio/* y busca rápidamente:
 *   - Fuentes / Pipelines / Datasets / Dashboards / Alertas
 *   - Acciones rápidas (Nueva fuente, AI Query…)
 *   - Navegación directa a módulos
 *
 * Usa fuse.js (ya está en package.json) para fuzzy search ordenado por score.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import {
  sourcesApi, pipelinesApi, datasetsApi, dashboardsApi, alertsApi,
} from '@/lib/estudio/api-client'
import styles from './DomoCommandPalette.module.css'

type ItemKind = 'source' | 'pipeline' | 'dataset' | 'dashboard' | 'alert' | 'action' | 'nav'

interface CmdItem {
  kind:     ItemKind
  id:       string
  title:    string
  subtitle?: string
  href:     string
  glyph:    string
  keywords?: string
}

const KIND_LABEL: Record<ItemKind, string> = {
  source: 'Fuente',
  pipeline: 'Pipeline',
  dataset: 'Dataset',
  dashboard: 'Dashboard',
  alert: 'Alerta',
  action: 'Acción',
  nav: 'Ir a',
}

const KIND_COLOR: Record<ItemKind, string> = {
  source: '#3b82f6',
  pipeline: '#8b5cf6',
  dataset: '#06b6d4',
  dashboard: '#22c55e',
  alert: '#ef4444',
  action: '#f59e0b',
  nav: '#9ca3af',
}

const KIND_GLYPH: Record<ItemKind, string> = {
  source: '⇡',
  pipeline: '⟶',
  dataset: '⊞',
  dashboard: '⊟',
  alert: '!',
  action: '+',
  nav: '→',
}

// Acciones rápidas siempre disponibles
const STATIC_ACTIONS: CmdItem[] = [
  { kind: 'action', id: 'new-source',    title: 'Conectar una nueva fuente',  href: '/estudio/fuentes?new=1',    glyph: '+', keywords: 'añadir conectar prensa boe encuesta csv excel api rss' },
  { kind: 'action', id: 'new-pipeline',  title: 'Nuevo flujo de limpieza',    href: '/estudio/pipeline/nuevo',   glyph: '+', keywords: 'limpiar cruzar enriquecer transformar' },
  { kind: 'action', id: 'new-dataset',   title: 'Crear nueva tabla',          href: '/estudio/dataset/nuevo',    glyph: '+', keywords: 'tabla columnas dataset' },
  { kind: 'action', id: 'new-dashboard', title: 'Crear nuevo panel',          href: '/estudio/dashboard/nuevo',  glyph: '+', keywords: 'panel dashboard widget kpi grafico' },
  { kind: 'action', id: 'new-alert',     title: 'Nuevo vigilante',            href: '/estudio/alertas?new=1',    glyph: '+', keywords: 'alerta umbral anomalia aviso' },
  { kind: 'action', id: 'ai-query',      title: 'Pregúntale a tus datos',     href: '/estudio/query',            glyph: '', keywords: 'pregunta lenguaje natural ia ai chat' },
]

const STATIC_NAV: CmdItem[] = [
  { kind: 'nav', id: 'nav-home',       title: 'Inicio del Estudio',      href: '/estudio',                glyph: '⬡' },
  { kind: 'nav', id: 'nav-fuentes',    title: 'Mis fuentes',             href: '/estudio/fuentes',        glyph: '⇡' },
  { kind: 'nav', id: 'nav-pipeline',   title: 'Limpieza y cruces',       href: '/estudio/pipeline',       glyph: '⟶' },
  { kind: 'nav', id: 'nav-dataset',    title: 'Mis tablas',              href: '/estudio/dataset',        glyph: '⊞' },
  { kind: 'nav', id: 'nav-dashboard',  title: 'Mis paneles',             href: '/estudio/dashboard',      glyph: '⊟' },
  { kind: 'nav', id: 'nav-alertas',    title: 'Vigilantes',              href: '/estudio/alertas',        glyph: '!' },
  { kind: 'nav', id: 'nav-notif',      title: 'Mis avisos',              href: '/estudio/notificaciones', glyph: '◐' },
  { kind: 'nav', id: 'nav-gobernanza', title: 'Equipo y permisos',       href: '/estudio/gobernanza',     glyph: '' },
  { kind: 'nav', id: 'nav-query',      title: 'Pregúntale a los datos',  href: '/estudio/query',          glyph: '' },
  { kind: 'nav', id: 'nav-health',     title: 'Estado del sistema',      href: '/estudio/health',         glyph: '◉' },
]

interface Props {
  open:    boolean
  onClose: () => void
}

export default function DomoCommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carga perezosa de cada catálogo sólo cuando se abre el palette
  const { data: sources = [] }    = useQuery({
    queryKey: ['domo', 'fuentes', 'palette'],
    queryFn:  () => sourcesApi.list({ pageSize: 200 }).then(r => r.data ?? []),
    enabled:  open, staleTime: 60_000,
  })
  const { data: pipelines = [] }  = useQuery({
    queryKey: ['domo', 'pipelines'],   queryFn: pipelinesApi.list,  enabled: open, staleTime: 60_000,
  })
  const { data: datasets = [] }   = useQuery({
    queryKey: ['domo', 'datasets'],    queryFn: datasetsApi.list,   enabled: open, staleTime: 60_000,
  })
  const { data: dashboards = [] } = useQuery({
    queryKey: ['domo', 'dashboards'],  queryFn: dashboardsApi.list, enabled: open, staleTime: 60_000,
  })
  const { data: alerts = [] }     = useQuery({
    queryKey: ['domo', 'alerts'],      queryFn: alertsApi.list,     enabled: open, staleTime: 60_000,
  })

  // Construye el índice de búsqueda
  const allItems: CmdItem[] = useMemo(() => {
    const items: CmdItem[] = [...STATIC_ACTIONS]
    sources.forEach(s => items.push({
      kind: 'source', id: s.id, title: s.name, subtitle: s.type,
      href: `/estudio/fuentes/${s.id}`, glyph: KIND_GLYPH.source,
    }))
    pipelines.forEach(p => items.push({
      kind: 'pipeline', id: p.id, title: p.name, subtitle: p.description ?? p.status,
      href: `/estudio/pipeline/${p.id}`, glyph: KIND_GLYPH.pipeline,
    }))
    datasets.forEach(d => items.push({
      kind: 'dataset', id: d.id, title: d.name, subtitle: `${d.rowCount?.toLocaleString('es') ?? '?'} filas`,
      href: `/estudio/dataset/${d.id}`, glyph: KIND_GLYPH.dataset,
    }))
    dashboards.forEach(d => items.push({
      kind: 'dashboard', id: d.id, title: d.name, subtitle: `${d.widgets?.length ?? 0} widgets`,
      href: `/estudio/dashboard/${d.id}`, glyph: KIND_GLYPH.dashboard,
    }))
    alerts.forEach(a => items.push({
      kind: 'alert', id: a.id, title: a.name, subtitle: a.severity,
      href: `/estudio/alertas`, glyph: KIND_GLYPH.alert,
    }))
    items.push(...STATIC_NAV)
    return items
  }, [sources, pipelines, datasets, dashboards, alerts])

  const fuse = useMemo(() => new Fuse(allItems, {
    keys:      ['title', 'subtitle', 'keywords'],
    threshold: 0.4,
    distance:  90,
  }), [allItems])

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return [...STATIC_ACTIONS, ...STATIC_NAV].slice(0, 20)
    }
    return fuse.search(query).slice(0, 30).map(r => r.item)
  }, [query, fuse])

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // delay para asegurar que el ref está en el DOM
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Reset activeIndex cuando cambia el resultado
  useEffect(() => { setActiveIndex(0) }, [query])

  const handleSelect = useCallback((item: CmdItem) => {
    onClose()
    router.push(item.href)
  }, [router, onClose])

  // Navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[activeIndex]
      if (item) handleSelect(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!open) return null

  // Group results by kind
  const groups: Record<ItemKind, CmdItem[]> = {
    action: [], nav: [], dashboard: [], dataset: [], pipeline: [], source: [], alert: [],
  }
  filtered.forEach(it => groups[it.kind].push(it))

  let runningIndex = 0

  return (
 <div className={styles.overlay} onClick={onClose}>
 <div className={styles.palette} onClick={e => e.stopPropagation()}>
 <div className={styles.searchBar}>
 <span className={styles.searchIcon}>⌕</span>
 <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Busca fuentes, pipelines, datasets, dashboards…"
            className={styles.searchInput}
          />
 <kbd className={styles.kbd}>ESC</kbd>
 </div>

 <div className={styles.results}>
          {filtered.length === 0 ? (
 <div className={styles.empty}>
 <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>⌕</span>
 <p>Sin resultados para “{query}”</p>
 </div>
          ) : (
            (Object.keys(groups) as ItemKind[]).map(kind => {
              const items = groups[kind]
              if (items.length === 0) return null
              return (
 <div key={kind} className={styles.group}>
 <div className={styles.groupLabel}>{KIND_LABEL[kind]}</div>
                  {items.map(item => {
                    const idx = runningIndex++
                    const active = idx === activeIndex
                    return (
 <button
                        key={`${kind}-${item.id}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleSelect(item)}
                        className={`${styles.item} ${active ? styles.itemActive : ''}`}
                      >
 <span
                          className={styles.itemIcon}
                          style={{ color: KIND_COLOR[item.kind], background: `${KIND_COLOR[item.kind]}15` }}
                        >
                          {item.glyph}
 </span>
 <div className={styles.itemBody}>
 <span className={styles.itemTitle}>{item.title}</span>
                          {item.subtitle && <span className={styles.itemSubtitle}>{item.subtitle}</span>}
 </div>
                        {active && <kbd className={styles.kbdInline}>↵</kbd>}
 </button>
                    )
                  })}
 </div>
              )
            })
          )}
 </div>

 <div className={styles.footer}>
 <span><kbd className={styles.kbdSmall}>↑</kbd><kbd className={styles.kbdSmall}>↓</kbd> navegar</span>
 <span><kbd className={styles.kbdSmall}>↵</kbd> abrir</span>
 <span><kbd className={styles.kbdSmall}>esc</kbd> cerrar</span>
 <span style={{ marginLeft: 'auto', fontSize: '.65rem', color: 'var(--color-muted,#9ca3af)' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
 </span>
 </div>
 </div>
 </div>
  )
}
