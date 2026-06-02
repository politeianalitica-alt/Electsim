/**
 * Deduplicación: exacta por URL + por titular hash en ventana temporal.
 * Sprint 0+1 · Task 3 · 2026-06-02
 */
import { createHash } from 'crypto'

const STOPWORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'y', 'o', 'pero', 'que',
  'con', 'por', 'para', 'es', 'son', 'su', 'sus', 'se', 'le', 'les',
  'lo', 'me', 'te', 'nos', 'mi', 'tu', 'sin', 'sobre',
])

export function isExactDuplicate(id: string, knownIds: Set<string>): boolean {
  return knownIds.has(id)
}

// Range covers ASCII alphanumerics + common Latin/Spanish diacritics ranges.
// We avoid the `u` flag (requires ES6 target in this tsconfig) and stick to
// a BMP-only character class. Punctuation is replaced with spaces; everything
// not in this allowlist is treated as a separator.
const TITLE_HASH_SEPARATOR_RE = /[^A-Za-z0-9À-ɏḀ-ỿ\s]/g

export function computeTitleHash(title: string): string {
  const tokens = title
    .toLowerCase()
    .replace(TITLE_HASH_SEPARATOR_RE, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS_ES.has(t))
    .slice(0, 8)
    .join(' ')
  return createHash('md5').update(tokens).digest('hex')
}

export function isTitleDuplicate(
  titleHash: string,
  sourceId: string,
  recent: Map<string, { id: string; sourceId: string; ts: string }>,
  windowMinutes: number,
): boolean {
  const entry = recent.get(titleHash)
  if (!entry) return false
  if (entry.sourceId !== sourceId) return false
  const ageMs = Date.now() - new Date(entry.ts).getTime()
  return ageMs <= windowMinutes * 60 * 1000
}
