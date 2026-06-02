/**
 * Extracción de entidades del título + descripción.
 * Algoritmo spec §3.2 Sprint 3:
 *  - Índice en memoria pre-construido
 *  - Word boundaries
 *  - Normalización acentos
 *  - Resolución contextRequired
 *  - Co-referencias intra-artículo
 * Sprint 0.3 implementa todo; Sprint 3 calcula ProminenceScore aparte.
 *
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import type { Entity, ExtractedEntity } from './types'

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export interface AliasIndex {
  text: string
  textNorm: string
  baseConfidence: number
  candidateIds: string[]
  disambiguationRequired: boolean
  contextRequired: string[] | null
}

/**
 * Construye índice plano de aliases.
 * Cada alias.text puede ser ambiguo entre múltiples entities → candidateIds array.
 */
export function buildAliasIndex(entities: Entity[]): AliasIndex[] {
  const byText = new Map<string, AliasIndex>()
  for (const ent of entities) {
    if (!ent.active) continue
    for (const alias of ent.aliases) {
      const key = normalize(alias.text)
      let existing = byText.get(key)
      if (!existing) {
        existing = {
          text: alias.text,
          textNorm: key,
          baseConfidence: alias.confidence,
          candidateIds: [],
          disambiguationRequired: alias.disambiguationRequired ?? false,
          contextRequired: alias.contextRequired ?? null,
        }
        byText.set(key, existing)
      }
      if (!existing.candidateIds.includes(ent.id)) {
        existing.candidateIds.push(ent.id)
      }
      if (alias.contextRequired) existing.contextRequired = alias.contextRequired
      if (alias.disambiguationRequired) existing.disambiguationRequired = true
    }
  }
  return Array.from(byText.values())
}

function wordBoundaryMatch(text: string, needle: string): boolean {
  if (!needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i')
  return re.test(text)
}

export function extractEntities(
  title: string,
  description: string,
  entities: Entity[],
  index: AliasIndex[],
): ExtractedEntity[] {
  const titleNorm = normalize(title)
  const descNorm = normalize(description ?? '')
  const fullNorm = `${titleNorm} ${descNorm}`
  const extracted: ExtractedEntity[] = []

  // First pass: high-confidence direct matches
  for (const alias of index) {
    const inTitle = wordBoundaryMatch(titleNorm, alias.textNorm)
    const inDesc = wordBoundaryMatch(descNorm, alias.textNorm)
    if (!inTitle && !inDesc) continue

    let chosen: string | null = null
    let resolution: 'direct' | 'context' | 'coreference' = 'direct'

    if (alias.candidateIds.length === 1 && !alias.disambiguationRequired) {
      chosen = alias.candidateIds[0]
      resolution = 'direct'
    } else if (alias.contextRequired) {
      const hasContext = alias.contextRequired.some((c) =>
        fullNorm.includes(normalize(c)),
      )
      if (hasContext) {
        // Pick highest relevanceScore among candidates
        const cands = alias.candidateIds
          .map((id) => entities.find((e) => e.id === id)!)
          .filter(Boolean)
        cands.sort((a, b) => b.relevanceScore - a.relevanceScore)
        chosen = cands[0]?.id ?? null
        resolution = 'context'
      }
    }

    if (!chosen) continue

    let conf = alias.baseConfidence
    conf = inTitle ? conf * 1.0 : conf * 0.75
    const wordCount = alias.text.split(/\s+/).length
    // Penalización single-word aplica solo a matches "direct" (sin contexto explícito).
    // Aliases resueltas via context ya están validadas por el contexto, no doble-penalizar.
    if (wordCount === 1 && resolution !== 'context') conf *= 0.85
    if (wordCount >= 3) conf = Math.min(conf * 1.1, 1.0)

    if (conf < 0.55) continue

    extracted.push({
      entityId: chosen,
      alias: alias.text,
      confidence: conf,
      position: inTitle && inDesc ? 'both' : inTitle ? 'title' : 'description',
      resolutionMethod: resolution,
    })
  }

  // Second pass: co-reference resolution
  // Aliases con disambiguationRequired pero sin contextRequired:
  // resolver a la entity ya detectada con conf ≥ 0.85 en el mismo texto.
  for (const alias of index) {
    if (!alias.disambiguationRequired || alias.contextRequired) continue
    if (extracted.some((e) => e.alias === alias.text)) continue
    const inTitle = wordBoundaryMatch(titleNorm, alias.textNorm)
    const inDesc = wordBoundaryMatch(descNorm, alias.textNorm)
    if (!inTitle && !inDesc) continue
    const priorMatch = extracted.find(
      (e) => alias.candidateIds.includes(e.entityId) && e.confidence >= 0.85,
    )
    if (!priorMatch) continue
    let conf = alias.baseConfidence
    conf = inTitle ? conf * 1.0 : conf * 0.75
    if (conf < 0.55) continue
    extracted.push({
      entityId: priorMatch.entityId,
      alias: alias.text,
      confidence: conf,
      position: inTitle && inDesc ? 'both' : inTitle ? 'title' : 'description',
      resolutionMethod: 'coreference',
    })
  }

  return extracted
}
