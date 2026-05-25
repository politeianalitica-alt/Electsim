/**
 * Helper para enlazar actores del mapa con dosieres del fixture.
 *
 * Usa matching por nombre normalizado (lowercase, sin diacríticos)
 * para que "Pedro Sánchez" del mapa cuadre con "Pedro Sanchez Perez-Castejon"
 * del dossier (match parcial).
 */
import { DOSIERES_RESUMEN, type DossierResumen } from '@/data/dosieres-fixture'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quita tildes
    .replace(/[^a-z0-9 ]/g, ' ')        // solo a-z 0-9 espacios
    .replace(/\s+/g, ' ')
    .trim()
}

// Índice precalculado · clave = nombre normalizado por palabras
const INDEX: { tokens: string[]; dossier: DossierResumen }[] =
  DOSIERES_RESUMEN.map(d => ({
    tokens: normalize(d.nombre_completo).split(' '),
    dossier: d,
  }))

/**
 * Busca el dossier que mejor cuadra con un nombre dado.
 * Estrategia:
 *   1. Match exacto del nombre normalizado
 *   2. Match por TODOS los tokens del nombre buscado dentro del nombre del dossier
 *      (p.ej. "Pedro Sanchez" matchea "Pedro Sanchez Perez-Castejon")
 *   3. Match parcial · al menos 2 tokens cuando el nombre buscado tiene 2+
 */
export function findDossier(name: string): DossierResumen | null {
  if (!name) return null
  const norm = normalize(name)
  if (!norm) return null
  const searchTokens = norm.split(' ').filter(t => t.length > 1)
  if (searchTokens.length === 0) return null

  // 1. exacto
  for (const entry of INDEX) {
    if (entry.tokens.join(' ') === norm) return entry.dossier
  }
  // 2. todos los tokens buscados están en el dossier
  for (const entry of INDEX) {
    const dossierJoined = entry.tokens.join(' ')
    if (searchTokens.every(t => dossierJoined.includes(t))) return entry.dossier
  }
  // 3. al menos 2 tokens si hay 3+
  if (searchTokens.length >= 3) {
    let bestMatch: { entry: typeof INDEX[number]; matches: number } | null = null
    for (const entry of INDEX) {
      const dossierJoined = entry.tokens.join(' ')
      const matches = searchTokens.filter(t => dossierJoined.includes(t)).length
      if (matches >= 2 && (!bestMatch || matches > bestMatch.matches)) {
        bestMatch = { entry, matches }
      }
    }
    if (bestMatch) return bestMatch.entry.dossier
  }
  return null
}

export function hasDossier(name: string): boolean {
  return findDossier(name) !== null
}
