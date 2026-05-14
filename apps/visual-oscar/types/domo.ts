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

// ─── Alertas (Sprint 6) ──────────────────────────────────────────────────────
export type AlertConditionOp =
  | 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
  | 'pct_change_gt' | 'pct_change_lt'
  | 'anomaly'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertChannel = 'in_app' | 'email' | 'webhook'

export type AlertStatus = 'active' | 'paused' | 'triggered' | 'resolved'

export interface AlertCondition {
  field: string
  op: AlertConditionOp
  threshold?: number
  windowMinutes?: number
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'last'
}

export interface AlertAction {
  channel: AlertChannel
  webhookUrl?: string
  emailTo?: string[]
  message?: string
}

export interface DomoAlert {
  id: string
  name: string
  description?: string
  datasetId: string
  condition: AlertCondition
  severity: AlertSeverity
  actions: AlertAction[]
  status: AlertStatus
  cooldownMinutes?: number
  lastTriggeredAt?: ISOString
  lastCheckedAt?: ISOString
  triggerCount?: number
  createdBy?: string
  createdAt: ISOString
  updatedAt: ISOString
}

// Legacy alias mantenido para retrocompatibilidad con sprints 1-5
export type AlertRule = DomoAlert

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
  | AlertStatus

// ─── Notificaciones (Sprint 6) ───────────────────────────────────────────────
export type NotificationType =
  | 'alert_triggered'
  | 'alert_resolved'
  | 'dashboard_shared'
  | 'dataset_updated'
  | 'pipeline_failed'
  | 'pipeline_success'
  | 'mention'
  | 'system'

export interface DomoNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  severity?: AlertSeverity
  read: boolean
  actionUrl?: string
  metadata?: Record<string, unknown>
  createdAt: ISOString
}

// ─── Sharing / Permisos (Sprint 6) ───────────────────────────────────────────
export type ShareRole = 'viewer' | 'editor' | 'admin'

export type ShareSubjectType = 'user' | 'team' | 'org' | 'public_link'

export interface DashboardShare {
  id: string
  dashboardId: string
  subjectType: ShareSubjectType
  subjectId?: string
  subjectName?: string
  subjectAvatarUrl?: string
  role: ShareRole
  token?: string
  expiresAt?: ISOString
  createdBy?: string
  createdAt: ISOString
}

export interface ShareLinkMeta {
  token: string
  url: string
  expiresAt?: ISOString
  role: ShareRole
  viewCount: number
}

// ─── Gobernanza (Sprint 7) ───────────────────────────────────────────────────
export type OrgRole = 'owner' | 'admin' | 'analyst' | 'viewer' | 'api_only'

export interface OrgMember {
  id: string
  userId: string
  email: string
  name: string
  avatarUrl?: string
  role: OrgRole
  teams?: string[]
  lastActiveAt?: ISOString
  createdAt: ISOString
}

export interface OrgTeam {
  id: string
  name: string
  description?: string
  memberCount: number
  datasetAccess: string[]
  dashboardAccess: string[]
  createdAt: ISOString
}

export type AuditAction =
  | 'dashboard.view' | 'dashboard.create' | 'dashboard.edit'
  | 'dashboard.delete' | 'dashboard.share'
  | 'dataset.view'   | 'dataset.create'   | 'dataset.edit'
  | 'dataset.delete' | 'dataset.export'
  | 'pipeline.run'   | 'pipeline.create'  | 'pipeline.delete'
  | 'alert.create'   | 'alert.trigger'    | 'alert.delete'
  | 'query.run'
  | 'member.invite'  | 'member.remove'    | 'member.role_change'
  | 'api_key.create' | 'api_key.revoke'

export interface AuditLog {
  id: string
  action: AuditAction
  actorId: string
  actorEmail: string
  actorName: string
  resourceType: 'dashboard' | 'dataset' | 'pipeline' | 'alert' | 'query' | 'member' | 'api_key'
  resourceId?: string
  resourceName?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: ISOString
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  secret?: string
  scopes: string[]
  createdBy: string
  lastUsedAt?: ISOString
  expiresAt?: ISOString
  isActive: boolean
  createdAt: ISOString
}

// ─── AI Query (Sprint 7) ─────────────────────────────────────────────────────
export type QueryMessageRole = 'user' | 'assistant' | 'system'

export interface QueryMessage {
  id: string
  role: QueryMessageRole
  content: string
  sql?: string
  queryResult?: {
    columns: string[]
    rows: Record<string, unknown>[]
    rowCount: number
    executionMs: number
  }
  chartSuggestion?: {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'table'
    xField?: string
    yField?: string
    title?: string
  }
  error?: string
  createdAt: ISOString
}

export interface QuerySession {
  id: string
  title: string
  datasetIds: string[]
  messages: QueryMessage[]
  createdBy: string
  createdAt: ISOString
  updatedAt: ISOString
}

// ─── Health (Sprint 8) ───────────────────────────────────────────────────────
export type ServiceStatus = 'up' | 'degraded' | 'down' | 'unknown'

export interface ServiceHealth {
  status: ServiceStatus
  latencyMs?: number
  message?: string
  lastCheckedAt?: ISOString
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: Record<string, ServiceHealth>
  version: string
  uptimeSeconds: number
  checkedAt: ISOString
}

// ─── Annotations (Killer feature) ────────────────────────────────────────────
// Eventos marcados sobre líneas temporales en widgets (Domo "Story",
// Tableau "Annotations"). Diferencial para inteligencia política:
// permite marcar elecciones, leyes aprobadas, debates clave, etc.
export type AnnotationKind = 'event' | 'milestone' | 'note' | 'alert'

export interface DomoAnnotation {
  id: string
  scope: 'dataset' | 'dashboard' | 'widget'
  scopeId: string
  kind: AnnotationKind
  title: string
  description?: string
  date: ISOString
  color?: string
  createdBy?: string
  createdAt: ISOString
}

// ─── Export programable (Killer feature) ─────────────────────────────────────
// Inspirado en Domo "Scheduled Reports" + Looker "Scheduled Plans".
// Genera PDF/CSV/PNG de un dashboard o dataset en horarios definidos
// y los envía por email o webhook.
export type ExportFormat = 'pdf' | 'png' | 'csv' | 'json' | 'parquet' | 'xlsx'
export type ExportStatus = 'pending' | 'running' | 'success' | 'failed'

export interface ExportJob {
  id: string
  name: string
  scope: 'dashboard' | 'dataset'
  scopeId: string
  format: ExportFormat
  schedule?: ScheduleFrequency
  recipients?: string[]
  lastRunAt?: ISOString
  lastRunStatus?: ExportStatus
  lastFileUrl?: string
  fileSizeBytes?: number
  isActive: boolean
  createdBy?: string
  createdAt: ISOString
  updatedAt: ISOString
}
