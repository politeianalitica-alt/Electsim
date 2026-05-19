/**
 * Tipos del workspace investigation-centric (Pilar 2).
 *
 * Una Investigation agrupa el trabajo analítico sobre un caso:
 *   - Entidades fijadas (pinned)
 *   - Artefactos: notebook blocks, hipótesis, evidencias, canvas, briefings
 *   - Audit trail de eventos del analista
 *
 * Tipos sincronizados con `agents/entities/schemas.py`.
 */

import type { EntitySummary } from './ontology'

export type InvestigationStatus = 'active' | 'archived' | 'shared'

export type ArtifactKind =
  | 'notebook_block'
  | 'hypothesis'
  | 'evidence'
  | 'canvas_state'
  | 'brief_version'
  | 'comment'

export interface Investigation {
  id: number
  slug: string
  title: string
  description: string
  owner_id: string
  status: InvestigationStatus
  tags: string[]
  payload: Record<string, unknown>
  collaborators: string[]
  created_at: string
  updated_at: string
  archived_at?: string | null
}

export interface PinnedEntity {
  id: number
  investigation_id: number
  entity_id: number
  position: number
  note: string
  pinned_by: string
  pinned_at: string
  entity?: EntitySummary | null
}

export interface Artifact {
  id: number
  investigation_id: number
  artifact_kind: ArtifactKind
  title: string
  payload: Record<string, unknown>
  position: number
  entity_refs: number[]
  author_id: string
  version: number
  parent_id?: number | null
  created_at: string
  updated_at: string
  archived_at?: string | null
}

export interface AnalystEvent {
  id: number
  investigation_id?: number | null
  actor_id: string
  verb: string
  target_kind?: string | null
  target_id?: number | null
  entity_id?: number | null
  payload: Record<string, unknown>
  ts: string
}

export interface InvestigationDetail extends Investigation {
  pinned: PinnedEntity[]
  artifacts: Artifact[]
  recent_events: AnalystEvent[]
  counts: Record<string, number>
}

export interface CreateInvestigationInput {
  slug?: string
  title: string
  description?: string
  tags?: string[]
  collaborators?: string[]
}

export const ARTIFACT_LABEL: Record<ArtifactKind, string> = {
  notebook_block: 'Bloque de cuaderno',
  hypothesis: 'Hipótesis',
  evidence: 'Evidencia',
  canvas_state: 'Estado de canvas',
  brief_version: 'Versión de briefing',
  comment: 'Comentario',
}
