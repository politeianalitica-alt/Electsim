import type { ConnectorType, ChartType, NodeType, WidgetType } from '@/types/domo'

// ─── Conectores ──────────────────────────────────────────────────────────────
export const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  postgresql:    'PostgreSQL',
  mysql:         'MySQL',
  sqlite:        'SQLite',
  rest_api:      'API REST',
  csv:           'CSV',
  json:          'JSON',
  excel:         'Excel',
  websocket:     'WebSocket',
  rss:           'RSS / Atom',
  google_sheets: 'Google Sheets',
}

// Códigos de texto (sin emojis, coherente con el resto de la plataforma)
export const CONNECTOR_ICONS: Record<ConnectorType, string> = {
  postgresql:    'PG',
  mysql:         'MY',
  sqlite:        'SQ',
  rest_api:      'API',
  csv:           'CSV',
  json:          '{}',
  excel:         'XLS',
  websocket:     'WS',
  rss:           'RSS',
  google_sheets: 'GS',
}

export const CONNECTOR_CATEGORIES: Record<string, ConnectorType[]> = {
  'Bases de Datos': ['postgresql', 'mysql', 'sqlite'],
  'APIs & Web':     ['rest_api', 'websocket', 'rss'],
  'Archivos':       ['csv', 'json', 'excel', 'google_sheets'],
}

// ─── Charts / Widgets ────────────────────────────────────────────────────────
export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  kpi:            'Indicador KPI',
  bar:            'Barras',
  bar_horizontal: 'Barras horizontales',
  line:           'Línea',
  area:           'Área',
  scatter:        'Dispersión',
  pie:            'Tarta',
  donut:          'Donut',
  heatmap:        'Mapa de calor',
  table:          'Tabla',
  text:           'Texto',
  hemicycle:      'Hemiciclo',
  map:            'Mapa coroplético',
  gauge:          'Gauge',
}

// Símbolos Unicode geométricos (no emoji)
export const CHART_TYPE_ICONS: Record<ChartType, string> = {
  kpi:            '⟁',
  bar:            '▋',
  bar_horizontal: '▬',
  line:           '⌇',
  area:           '◿',
  scatter:        '⋮',
  pie:            '◐',
  donut:          '◎',
  heatmap:        '▦',
  table:          '⊟',
  text:           '⁋',
  hemicycle:      '⌢',
  map:            '⊕',
  gauge:          '⌚',
}

export const WIDGET_TYPE_META: Record<WidgetType, {
  label: string
  icon: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  category: 'numeric' | 'chart' | 'geo' | 'table' | 'content'
}> = {
  kpi:            { label: 'KPI',                icon: '⟁', defaultW: 3, defaultH: 2, minW: 2, minH: 2, category: 'numeric' },
  bar:            { label: 'Barras',             icon: '▋', defaultW: 6, defaultH: 4, minW: 3, minH: 3, category: 'chart' },
  bar_horizontal: { label: 'Barras horiz.',      icon: '▬', defaultW: 6, defaultH: 4, minW: 3, minH: 3, category: 'chart' },
  line:           { label: 'Línea',              icon: '⌇', defaultW: 6, defaultH: 4, minW: 3, minH: 3, category: 'chart' },
  area:           { label: 'Área',               icon: '◿', defaultW: 6, defaultH: 4, minW: 3, minH: 3, category: 'chart' },
  pie:            { label: 'Tarta',              icon: '◐', defaultW: 4, defaultH: 4, minW: 3, minH: 3, category: 'chart' },
  donut:          { label: 'Donut',              icon: '◎', defaultW: 4, defaultH: 4, minW: 3, minH: 3, category: 'chart' },
  scatter:        { label: 'Dispersión',         icon: '⋮', defaultW: 6, defaultH: 4, minW: 3, minH: 3, category: 'chart' },
  table:          { label: 'Tabla',              icon: '⊟', defaultW: 8, defaultH: 5, minW: 4, minH: 3, category: 'table' },
  text:           { label: 'Texto',              icon: '⁋', defaultW: 4, defaultH: 2, minW: 2, minH: 1, category: 'content' },
  hemicycle:      { label: 'Hemiciclo',          icon: '⌢', defaultW: 6, defaultH: 5, minW: 4, minH: 4, category: 'geo' },
  map:            { label: 'Mapa provincias',    icon: '⊕', defaultW: 6, defaultH: 6, minW: 4, minH: 4, category: 'geo' },
  gauge:          { label: 'Gauge',              icon: '⌚', defaultW: 3, defaultH: 3, minW: 2, minH: 2, category: 'numeric' },
  heatmap:        { label: 'Heatmap',            icon: '▦', defaultW: 8, defaultH: 5, minW: 4, minH: 3, category: 'chart' },
}

// ─── Pipeline nodes ──────────────────────────────────────────────────────────
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  source:      'Fuente',
  filter:      'Filtrar',
  select:      'Seleccionar',
  join:        'Unir (Join)',
  aggregate:   'Agregar',
  transform:   'Transformar',
  deduplicate: 'Deduplicar',
  sort:        'Ordenar',
  limit:       'Limitar',
  destination: 'Destino',
}

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  source:      '#3b82f6',
  filter:      '#f59e0b',
  select:      '#8b5cf6',
  join:        '#06b6d4',
  aggregate:   '#10b981',
  transform:   '#f97316',
  deduplicate: '#ec4899',
  sort:        '#6366f1',
  limit:       '#84cc16',
  destination: '#22c55e',
}

// ─── Colores de estado (token-aware) ─────────────────────────────────────────
export const STATUS_COLORS = {
  // sync
  connected:    'var(--color-success, #22c55e)',
  error:        'var(--color-danger,  #ef4444)',
  syncing:      'var(--color-warning, #f59e0b)',
  idle:         'var(--color-muted,   #6b7280)',
  paused:       'var(--color-muted,   #6b7280)',
  // run
  running:      'var(--color-warning, #f59e0b)',
  success:      'var(--color-success, #22c55e)',
  queued:       'var(--color-info,    #3b82f6)',
  cancelled:    'var(--color-muted,   #6b7280)',
  pending:      'var(--color-muted,   #6b7280)',
  // alert
  ok:           'var(--color-success, #22c55e)',
  triggered:    'var(--color-danger,  #ef4444)',
  silenced:     'var(--color-muted,   #6b7280)',
  // quality
  passing:      'var(--color-success, #22c55e)',
  failing:      'var(--color-danger,  #ef4444)',
  warning:      'var(--color-warning, #f59e0b)',
  skipped:      'var(--color-muted,   #6b7280)',
  // pipeline / dataset
  active:       'var(--color-success, #22c55e)',
  draft:        'var(--color-muted,   #6b7280)',
  ready:        'var(--color-success, #22c55e)',
  building:     'var(--color-info,    #3b82f6)',
  stale:        'var(--color-warning, #f59e0b)',
  empty:        'var(--color-muted,   #9ca3af)',
  // connection extras
  disconnected: 'var(--color-muted,   #6b7280)',
  testing:      'var(--color-info,    #3b82f6)',
} as const

// ─── Paletas de color para gráficos ──────────────────────────────────────────
export const POLITEIA_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
  '#10b981', '#6366f1', '#84cc16', '#14b8a6',
]

export const PARTIDO_COLORS: Record<string, string> = {
  PP:                                  '#1d4ed8',
  'Partido Popular':                   '#1d4ed8',
  PSOE:                                '#dc2626',
  'Partido Socialista Obrero Español': '#dc2626',
  PSC:                                 '#dc2626',
  'PSC-PSOE':                          '#dc2626',
  VOX:                                 '#84cc16',
  Sumar:                               '#7c3aed',
  Podemos:                             '#7c3aed',
  ERC:                                 '#f59e0b',
  'EH Bildu':                          '#059669',
  Bildu:                               '#059669',
  PNV:                                 '#065f46',
  'EAJ-PNV':                           '#065f46',
  Junts:                               '#1e3a8a',
  JxCat:                               '#1e3a8a',
  'Junts per Catalunya':               '#1e3a8a',
  CiU:                                 '#1d4ed8',
  BNG:                                 '#5bb3d9',
  CC:                                  '#f2c43a',
  UPN:                                 '#0e7d8c',
}

// ─── API base ────────────────────────────────────────────────────────────────
export const DOMO_API_BASE =
  process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'
