// Tipos compartidos entre frontend y backend ElectSim FastAPI.
// Reutilizados de apps/web/lib/api/endpoints.ts (politeia v3) sin tocar lógica.
// Visual-oscar consume estos tipos a través del proxy /api/* (no llamadas directas).

export interface MorningBriefing {
  date: string
  generated_at: string
  tenant_id?: string
  workspace_id?: string
  executive_summary: string
  key_alerts: Array<{ title: string; level: string; body: string }>
  top_stories: Array<{ title: string; source: string; relevance: number; summary?: string }>
  active_narratives: Array<{ frame_label: string; velocity: string; recommended_action?: string }>
  risk_signals: Array<{ title: string; probability: number; impact: string; description: string }>
  legislative_updates: Array<{ title: string; status: string; date: string }>
  electoral_snapshot: { itpe?: number; top_parties?: Record<string, number>; trend?: string }
  three_questions: string[]
  analyst_note: string
  mode: string
}

export interface SystemStatus {
  database: { ok: boolean; message?: string }
  modules: Record<string, { active: boolean; mode: string }>
  llm?: { available: boolean; model: string; provider: string }
  pipelines?: { healthy: number; degraded: number; failed: number }
  sources?: { total: number; active: number; degraded: number; down: number }
  overall_ok?: boolean
}

export interface MediaStory {
  id: string
  title: string
  source: string
  url?: string
  published_at?: string
  language?: string
  relevance_score: number
  sentiment?: number
  topics?: string[]
  entities?: string[]
}

export interface NarrativeCluster {
  id: string
  frame_label: string
  central_claim: string
  lifecycle: string
  velocity: string
  promoters: string[]
  affected_actors: string[]
  article_count: number
  dominant_emotion?: string
  recommended_action?: string
}

export interface AlertItem {
  id: string
  title: string
  body: string
  level: 'low' | 'medium' | 'high' | 'critical'
  source: string
  created_at: string
  read: boolean
}
