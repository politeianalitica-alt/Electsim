// ─── Shared ──────────────────────────────────────────────────────────────────
export type ISOString = string

export interface LogEntry {
  id: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: ISOString
  metadata?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ─── Fuentes de Datos ────────────────────────────────────────────────────────
export type ConnectorType =
  | 'postgresql'
  | 'mysql'
  | 'sqlite'
  | 'rest_api'
  | 'csv'
  | 'json'
  | 'excel'
  | 'websocket'
  | 'rss'
  | 'google_sheets'

export type SyncStatus = 'connected' | 'error' | 'syncing' | 'idle' | 'paused'

export type ScheduleFrequency =
  | 'realtime'
  | 'every_5min'
  | 'every_15min'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'manual'

export interface DataSource {
  id: string
  name: string
  description?: string
  type: ConnectorType
  status: SyncStatus
  config: Record<string, unknown>
  schedule: ScheduleFrequency
  lastSyncAt?: ISOString
  lastSyncRecords?: number
  lastSyncDurationMs?: number
  lastSyncError?: string
  totalRecords?: number
  tags?: string[]
  createdAt: ISOString
  updatedAt: ISOString
}

export interface SyncRun {
  id: string
  sourceId: string
  status: 'running' | 'success' | 'error' | 'cancelled'
  startedAt: ISOString
  finishedAt?: ISOString
  durationMs?: number
  recordsRead: number
  recordsWritten: number
  recordsErrored: number
  errorMessage?: string
  logs: LogEntry[]
}

export interface FieldMapping {
  sourceField: string
  destinationField: string
  transform?: string
  nullable: boolean
}

// ─── Pipelines ───────────────────────────────────────────────────────────────
export type PipelineStatus = 'active' | 'paused' | 'draft' | 'error'

export type NodeType =
  | 'source'
  | 'filter'
  | 'select'
  | 'join'
  | 'aggregate'
  | 'transform'
  | 'deduplicate'
  | 'sort'
  | 'limit'
  | 'destination'

export interface PipelineNode {
  id: string
  type: NodeType
  label: string
  position: { x: number; y: number }
  config: Record<string, unknown>
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  status: PipelineStatus
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  schedule: ScheduleFrequency
  lastRunAt?: ISOString
  lastRunStatus?: 'success' | 'error' | 'running'
  lastRunRecords?: number
  lastRunDurationMs?: number
  outputDatasetId?: string
  createdAt: ISOString
  updatedAt: ISOString
}

export type RunStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled'

export interface NodeRunStat {
  recordsIn: number
  recordsOut: number
  durationMs: number
  status: RunStatus | string
}

export interface PipelineRun {
  id: string
  pipelineId: string
  status: RunStatus
  startedAt: ISOString
  finishedAt?: ISOString
  durationMs?: number
  recordsIn: number
  recordsOut: number
  recordsErrored: number
  nodeStats: Record<string, NodeRunStat>
  logs: LogEntry[] | string[]
  errorMessage?: string
}

// ─── Datasets ────────────────────────────────────────────────────────────────
export type DatasetStatus = 'ready' | 'building' | 'error' | 'empty' | 'stale'

export type ColumnType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'json'
  | 'array'
  | 'unknown'

export interface ColumnStats {
  nullCount?: number
  distinctCount?: number
  min?: unknown
  max?: unknown
  mean?: number
  stddev?: number
  topValues?: Array<{ value: unknown; count: number }>
}

export interface ColumnSchema {
  name: string
  type: ColumnType
  nullable: boolean
  description?: string
  examples?: unknown[]
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  foreignKeyRef?: { table: string; column: string }
  stats?: ColumnStats
}

export interface DatasetIndex {
  columns: string[]
  unique: boolean
  name?: string
}

export interface DataQualityScore {
  overall: number
  completeness: number
  uniqueness: number
  validity: number
  consistency: number
  lastCheckedAt?: ISOString
}

export interface Dataset {
  id: string
  name: string
  description?: string
  status: DatasetStatus
  rowCount: number
  columnCount: number
  sizeBytes: number
  schema: ColumnSchema[]
  indexes?: DatasetIndex[]
  sourceId?: string
  sourcePipelineId?: string
  tags?: string[]
  owner?: string
  qualityScore?: DataQualityScore
  lastRefreshedAt?: ISOString
  refreshDurationMs?: number
  partitionKey?: string
  retentionDays?: number
  isPublic?: boolean
  createdAt: ISOString
  updatedAt: ISOString
}

export interface DatasetPreview {
  columns: string[]
  rows: Record<string, unknown>[]
  totalRows: number
  truncated: boolean
}

export interface DatasetQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number
  fromCache: boolean
}

// ─── Dashboards & Widgets ────────────────────────────────────────────────────
export type WidgetType =
  | 'kpi'
  | 'bar'
  | 'bar_horizontal'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'table'
  | 'text'
  | 'hemicycle'
  | 'map'
  | 'gauge'
  | 'heatmap'

export interface WidgetLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface WidgetFilter {
  field: string
  op: '=' | '!=' | '>' | '<' | 'contains'
  value: unknown
}

export interface WidgetConfig {
  datasetId?: string
  xField?: string
  yField?: string
  colorField?: string
  valueField?: string
  labelField?: string
  filters?: WidgetFilter[]
  limit?: number
  sortField?: string
  sortDir?: 'asc' | 'desc'
  title?: string
  subtitle?: string
  unit?: string
  prefix?: string
  colorScheme?: 'politeia' | 'partido' | 'diverging' | 'sequential' | 'monochrome'
  showLegend?: boolean
  showGrid?: boolean
  kpiAggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'last'
  kpiComparePct?: boolean
  content?: string
  mapMetric?: string
  gaugeMin?: number
  gaugeMax?: number
  gaugeThresholds?: Array<{ value: number; color: string }>
}

export interface DashboardWidget {
  id: string
  type: WidgetType
  layout: WidgetLayout
  config: WidgetConfig
}

export type DashboardVisibility = 'private' | 'team' | 'public'

export interface Dashboard {
  id: string
  name: string
  description?: string
  slug?: string
  widgets: DashboardWidget[]
  tags?: string[]
  visibility: DashboardVisibility
  refreshIntervalSeconds?: number
  thumbnailUrl?: string
  isTemplate?: boolean
  viewCount?: number
  createdBy?: string
  createdAt: ISOString
  updatedAt: ISOString
}

// ─── Charts (catálogo independiente) ─────────────────────────────────────────
export type ChartType = WidgetType

export interface ChartAxisConfig {
  column: string
  label?: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none'
}

export interface ChartConfig {
  id: string
  name: string
  description?: string
  type: ChartType
  datasetId: string
  xAxis?: ChartAxisConfig
  yAxis?: ChartAxisConfig
  colorColumn?: string
  sizeColumn?: string
  filters: WidgetFilter[]
  colorPalette?: string[]
  showLegend: boolean
  showGrid: boolean
  title?: string
  subtitle?: string
  owner?: string
  tags: string[]
  createdAt: ISOString
  updatedAt: ISOString
}

// ─── Alertas ─────────────────────────────────────────────────────────────────
export type AlertConditionType =
  | 'threshold'
  | 'pct_change'
  | 'anomaly'
  | 'null_rate'
  | 'new_value'
  | 'row_count'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertAction = 'notification' | 'email' | 'webhook'

export interface AlertRule {
  id: string
  name: string
  description?: string
  datasetId: string
  column?: string
  conditionType: AlertConditionType
  conditionParams: Record<string, unknown>
  severity: AlertSeverity
  actions: AlertAction[]
  actionConfig: {
    emails?: string[]
    webhookUrl?: string
    webhookSecret?: string
  }
  evaluationFrequency: ScheduleFrequency
  silencePeriodMinutes?: number
  isActive: boolean
  lastTriggeredAt?: ISOString
  lastEvaluatedAt?: ISOString
  status: 'ok' | 'triggered' | 'silenced' | 'error'
  createdAt: ISOString
  updatedAt: ISOString
}

export interface AlertTrigger {
  id: string
  alertId: string
  triggeredAt: ISOString
  value: unknown
  threshold: unknown
  message: string
  resolvedAt?: ISOString
}

// ─── Jobs ────────────────────────────────────────────────────────────────────
export type JobType = 'sync' | 'pipeline' | 'export' | 'quality_check' | 'ai_query'
export type JobStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled'

export interface Job {
  id: string
  name: string
  type: JobType
  status: JobStatus
  relatedId?: string
  startedAt?: ISOString
  finishedAt?: ISOString
  durationMs?: number
  recordsProcessed?: number
  errorMessage?: string
  nextRunAt?: ISOString
  schedule?: ScheduleFrequency
  progress?: number
  createdAt: ISOString
}

export interface JobStep {
  id: string
  jobId: string
  name: string
  status: JobStatus
  startedAt?: ISOString
  finishedAt?: ISOString
  durationMs?: number
  recordsIn?: number
  recordsOut?: number
  errorMessage?: string
  order: number
}

// ─── Data Quality / Gobernanza ───────────────────────────────────────────────
export type CheckType =
  | 'not_null'
  | 'unique'
  | 'accepted_values'
  | 'range'
  | 'regex'
  | 'referential_integrity'
  | 'custom_sql'

export type CheckStatus = 'passing' | 'failing' | 'warning' | 'skipped'

export interface DataQualityCheck {
  id: string
  datasetId: string
  column?: string
  name: string
  type: CheckType
  params: Record<string, unknown>
  status: CheckStatus
  lastRunAt?: ISOString
  failingRows?: number
  totalRows?: number
  failingExamples?: Record<string, unknown>[]
  notifyOnFail: boolean
  isActive: boolean
  createdAt: ISOString
}

export interface LineageNode {
  id: string
  type: 'source' | 'pipeline' | 'dataset' | 'chart' | 'dashboard'
  label: string
  metadata?: Record<string, unknown>
}

export interface LineageEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface DataLineage {
  nodes: LineageNode[]
  edges: LineageEdge[]
}

// ─── AI Query ────────────────────────────────────────────────────────────────
export interface AIQueryMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string
  results?: Record<string, unknown>[]
  resultColumns?: string[]
  suggestedChartType?: ChartType
  error?: string
  timestamp: ISOString
}

export interface AIQuerySession {
  id: string
  title: string
  messages: AIQueryMessage[]
  contextTables: string[]
  createdAt: ISOString
  updatedAt: ISOString
}

// ─── Stats globales del módulo Domo ──────────────────────────────────────────
export interface DomoStats {
  totalDatasets: number
  totalRecords: number
  totalSources: number
  activePipelines: number
  jobsLast24h: number
  jobsFailedLast24h: number
  activeAlerts: number
  triggeredAlertsToday: number
  warehouseQualityScore: number
}

// Tipo agregado para colorear estados de cualquier dominio del módulo
export type DomoStatus =
  | PipelineStatus
  | RunStatus
  | DatasetStatus
  | SyncStatus
  | JobStatus
  | CheckStatus
  | AlertRule['status']
