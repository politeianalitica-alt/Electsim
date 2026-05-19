/**
 * Tipos del modelo ontológico unificado (Pilar 1).
 *
 * Generados a partir del backend Pydantic en agents/entities/schemas.py.
 * Estos tipos son la fuente de verdad para todo el frontend que consume
 * entidades + relaciones (workspace investigation-centric, búsqueda
 * global, fichas, brain copiloto, etc.).
 *
 * Mantén este archivo sincronizado con `agents/entities/schemas.py`.
 * Si añades un kind nuevo, actualiza ambos.
 */

export type EntityKind =
  | 'actor_person'
  | 'actor_org'
  | 'institution'
  | 'party'
  | 'government'
  | 'law'
  | 'event'
  | 'territory'
  | 'media'
  | 'document'
  | 'sector'
  | 'narrative'
  | 'theme'

export type LinkKind =
  | 'member_of'
  | 'leads'
  | 'president_of'
  | 'minister_of'
  | 'succeeds'
  | 'proposes'
  | 'votes_for'
  | 'votes_against'
  | 'abstains_on'
  | 'regulates'
  | 'located_in'
  | 'covers'
  | 'participated_in'
  | 'caused'
  | 'responded_to'
  | 'allied_with'
  | 'rival_of'
  | 'coalition_with'
  | 'criticizes'
  | 'supports'
  | 'mentions'
  | 'frames'
  | 'attacks'
  | 'promotes'
  | 'issued_by'
  | 'cites'

export interface EntitySummary {
  id: number
  kind: EntityKind
  slug: string
  qid?: string | null
  display_name: string
  tags: string[]
}

export interface Entity extends EntitySummary {
  aliases: string[]
  payload: Record<string, unknown>
  confidence: number
  source: string
  valid_from?: string | null
  valid_to?: string | null
  created_at: string
  updated_at: string
}

export interface EntitySearchResult {
  entity: EntitySummary
  score: number
  matched_via: 'slug' | 'qid' | 'display_name' | 'alias' | 'tag' | 'payload'
}

export interface EntityLink {
  id: number
  src_id: number
  dst_id: number
  link_kind: LinkKind
  confidence: number
  evidence_url?: string | null
  evidence_id?: number | null
  payload: Record<string, unknown>
  valid_from?: string | null
  valid_to?: string | null
  created_at: string
}

export interface KindsResponse {
  entity_kinds: EntityKind[]
  link_kinds: LinkKind[]
}

/** Helpers de presentación */
export const KIND_LABEL: Record<EntityKind, string> = {
  actor_person: 'Persona',
  actor_org: 'Organización',
  institution: 'Institución',
  party: 'Partido',
  government: 'Gobierno',
  law: 'Ley',
  event: 'Evento',
  territory: 'Territorio',
  media: 'Medio',
  document: 'Documento',
  sector: 'Sector',
  narrative: 'Narrativa',
  theme: 'Tema',
}

export const KIND_COLOR: Record<EntityKind, string> = {
  actor_person: '#0071e3',
  actor_org: '#5B21B6',
  institution: '#1F4E8C',
  party: '#E1322D',
  government: '#B45309',
  law: '#0F766E',
  event: '#DC2626',
  territory: '#0E7490',
  media: '#7C2D12',
  document: '#6e6e73',
  sector: '#16A34A',
  narrative: '#9333EA',
  theme: '#0EA5E9',
}
