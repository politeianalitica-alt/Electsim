/**
 * Tipos del workflow registry · mirror de agents/workflows/schemas.py.
 *
 * Recipes declarativas que el brain ejecuta secuencialmente:
 *
 *   briefing_matinal_sectorial · analisis_adversarial · coalition_deep
 *   narrative_drift_monitor · crisis_playbook
 *
 * El analista las invoca desde el panel del copiloto (Cmd+J) con inputs
 * declarados en `inputs_schema`. El frontend autoprellena lo que pueda
 * desde el contexto de la investigación activa (título, entidades).
 */

export type WorkflowCategory =
  | 'briefing'
  | 'intelligence'
  | 'forecast'
  | 'narrative'
  | 'crisis'
  | 'discovery'
  | 'custom'

export type OnError = 'abort' | 'continue' | 'retry'

export interface WorkflowStep {
  id: string
  tool: string
  description: string
  input_template: Record<string, unknown>
  output_to: string
  on_error: OnError
  depends_on: string[]
  retries: number
}

export interface WorkflowSummary {
  slug: string
  title: string
  description: string
  category: WorkflowCategory
  step_count: number
  tools_used: string[]
  inputs_schema: Record<string, string>
}

export interface Workflow extends WorkflowSummary {
  steps: WorkflowStep[]
  output_field: string
}

export interface WorkflowToolTrace {
  step_id: string
  tool: string
  ok: boolean
  latency_ms: number
  attempts: number
  output_key: string
  output_summary: string
  error?: string | null
}

export interface WorkflowResult {
  workflow_slug: string
  ok: boolean
  started_at: string
  finished_at: string
  total_latency_ms: number
  steps_executed: number
  steps_failed: number
  trace: WorkflowToolTrace[]
  outputs: Record<string, unknown>
  final_output: unknown
  error?: string | null
}

export interface RunWorkflowRequest {
  inputs: Record<string, unknown>
  investigation_id?: number | null
  pinned_entity_ids?: number[]
  dry_run?: boolean
}

// ─────────────────────────────────────────────────────────────────
// UI helpers · color y label por categoría
// ─────────────────────────────────────────────────────────────────

export const CATEGORY_LABEL: Record<WorkflowCategory, string> = {
  briefing:    'Briefing',
  intelligence:'Inteligencia',
  forecast:    'Forecast',
  narrative:   'Narrativa',
  crisis:      'Crisis',
  discovery:   'Descubrimiento',
  custom:      'Custom',
}

export const CATEGORY_COLOR: Record<WorkflowCategory, string> = {
  briefing:    '#0071e3',
  intelligence:'#5B21B6',
  forecast:    '#0F766E',
  narrative:   '#9333EA',
  crisis:      '#c42c2c',
  discovery:   '#16A34A',
  custom:      '#6e6e73',
}
