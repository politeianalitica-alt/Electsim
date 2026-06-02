/**
 * Capa 2 clasificación: heurísticas keyword + scoring ponderado.
 * Algoritmo spec §2.1.2 Sprint 2.
 * Umbral 0.60.
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import type { TopicTag, TopicRulesCatalog } from './types'

const FIELD_WEIGHT = {
  title: 1.5,
  description: 1.0,
  'title+description': 1.2,
} as const

interface Rule {
  id: string
  field: 'title' | 'description' | 'title+description'
  type: 'contains_any' | 'contains_all'
  terms: string[]
  score: number
  note?: string
}

interface Subtopic {
  subtopicId: string
  rules: Rule[]
}

interface Topic {
  topicId: string
  label: string
  rules: Rule[]
  subtopics?: Subtopic[]
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function matchRule(text: string, rule: Rule): boolean {
  const textNorm = normalize(text)
  const termsNorm = rule.terms.map(normalize)
  if (rule.type === 'contains_any') {
    return termsNorm.some((t) => textNorm.includes(t))
  }
  return termsNorm.every((t) => textNorm.includes(t))
}

function getText(field: Rule['field'], title: string, description: string): string {
  if (field === 'title') return title
  if (field === 'description') return description
  return `${title} ${description}`
}

function scoreTopic(
  rules: Rule[],
  title: string,
  description: string,
): { score: number; maxPossible: number } {
  let score = 0
  let maxPossible = 0
  for (const rule of rules) {
    const weight = FIELD_WEIGHT[rule.field]
    maxPossible += rule.score * weight
    const text = getText(rule.field, title, description)
    if (matchRule(text, rule)) {
      score += rule.score * weight
    }
  }
  return { score, maxPossible }
}

export function classifyByHeuristic(
  title: string,
  description: string,
  catalog: TopicRulesCatalog,
): TopicTag | null {
  const topics = catalog.topics as Topic[]
  const scores: Array<{
    topicId: string
    subtopicId?: string
    normalized: number
  }> = []

  for (const topic of topics) {
    // Score macrotopic-level rules
    if (topic.rules.length > 0) {
      const { score, maxPossible } = scoreTopic(topic.rules, title, description)
      if (maxPossible > 0) {
        scores.push({
          topicId: topic.topicId,
          normalized: score / maxPossible,
        })
      }
    }
    // Score subtopics
    if (topic.subtopics) {
      for (const sub of topic.subtopics) {
        const { score, maxPossible } = scoreTopic(sub.rules, title, description)
        if (maxPossible > 0) {
          scores.push({
            topicId: topic.topicId,
            subtopicId: sub.subtopicId,
            normalized: score / maxPossible,
          })
        }
      }
    }
  }

  scores.sort((a, b) => b.normalized - a.normalized)
  const winner = scores[0]
  if (!winner || winner.normalized < 0.6) return null

  return {
    topicId: winner.topicId,
    subtopicId: winner.subtopicId ?? null,
    level: winner.subtopicId ? 2 : 1,
    confidence: Math.min(winner.normalized, 1.0),
    method: 'HEURISTIC',
    assignedAt: new Date().toISOString(),
  }
}
