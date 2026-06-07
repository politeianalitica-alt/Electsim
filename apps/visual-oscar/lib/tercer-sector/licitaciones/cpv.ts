/**
 * CPV (Common Procurement Vocabulary) sociales / salud / cooperación · TS2-lic-src
 *
 * El agregador es para tercer sector: cuando el usuario NO especifica un CPV,
 * priorizamos las licitaciones relevantes a ONGs (servicios sociales, salud,
 * cooperación, formación, integración, etc.). Estas constantes y helpers son
 * PUROS y testeables; las usa el normalizador (para `cpvIsSocial`) y el endpoint
 * (para ordenar/filtrar). Cero red.
 *
 * Divisiones CPV de referencia (8 dígitos, los 2 primeros = división):
 *   85 — Servicios de salud y asistencia social
 *   80 — Servicios de enseñanza y formación
 *   75 — Administración pública (incluye cooperación / asuntos sociales)
 *   92 — Servicios de esparcimiento, cultura y deporte
 *   98 — Otros servicios comunitarios, sociales y personales
 * + grupos finos relevantes (servicios sociales 853..., cooperación 75211200…).
 */

/** Grupos CPV (prefijos) relevantes a ONGs con su etiqueta legible en español. */
export const CPV_SOCIAL_GROUPS: { prefix: string; label: string }[] = [
  // Salud y asistencia social (división 85)
  { prefix: '85', label: 'Salud y servicios sociales' },
  { prefix: '8531', label: 'Servicios de asistencia social' },
  { prefix: '85311', label: 'Servicios de asistencia social con alojamiento' },
  { prefix: '85312', label: 'Servicios de asistencia social sin alojamiento' },
  { prefix: '85320', label: 'Servicios sociales' },
  { prefix: '85100', label: 'Servicios de salud' },
  { prefix: '85140', label: 'Servicios sanitarios diversos' },
  // Enseñanza y formación (división 80)
  { prefix: '80', label: 'Enseñanza y formación' },
  { prefix: '80500', label: 'Servicios de formación' },
  { prefix: '80400', label: 'Educación de adultos y otros' },
  // Administración / cooperación / asuntos sociales (división 75)
  { prefix: '7525', label: 'Servicios de asuntos sociales' },
  { prefix: '75200', label: 'Servicios para la comunidad' },
  { prefix: '752112', label: 'Servicios de cooperación al desarrollo / exterior' },
  { prefix: '75231', label: 'Servicios judiciales y de asilo' },
  // Cultura / comunidad / personales (92, 98)
  { prefix: '92', label: 'Cultura, esparcimiento y deporte' },
  { prefix: '98', label: 'Servicios comunitarios y personales' },
  { prefix: '98133', label: 'Servicios de asociaciones sociales' },
  // Ayuda humanitaria / suministros de emergencia frecuentes en cooperación
  { prefix: '15800', label: 'Productos alimenticios (ayuda)' },
  { prefix: '33', label: 'Equipos y productos médicos' },
]

/** Prefijos "core" para priorización por defecto (sin CPV en el filtro). */
export const CPV_SOCIAL_DEFAULT_PREFIXES = ['85', '80', '7525', '752112', '98133', '92'] as const

/** Normaliza un código CPV: solo dígitos, sin el guion de control "-9". */
export function normalizeCpv(cpv: string | null | undefined): string | null {
  if (!cpv) return null
  const digits = String(cpv).replace(/[^0-9]/g, '')
  if (!digits) return null
  // CPV son 8 dígitos (+ 1 de control). Nos quedamos con hasta 8.
  return digits.slice(0, 8)
}

/** ¿El CPV pertenece a un grupo social/salud/cooperación? (prefijo). */
export function cpvIsSocial(cpv: string | null | undefined): boolean {
  const n = normalizeCpv(cpv)
  if (!n) return false
  return CPV_SOCIAL_DEFAULT_PREFIXES.some((p) => n.startsWith(p))
}

/** Etiqueta legible del grupo CPV más específico que matchee (o null). */
export function cpvLabel(cpv: string | null | undefined): string | null {
  const n = normalizeCpv(cpv)
  if (!n) return null
  // El prefijo más largo que matchee gana (más específico).
  let best: { prefix: string; label: string } | null = null
  for (const g of CPV_SOCIAL_GROUPS) {
    if (n.startsWith(g.prefix)) {
      if (!best || g.prefix.length > best.prefix.length) best = g
    }
  }
  return best?.label ?? null
}

/**
 * ¿El CPV de la licitación matchea el filtro pedido? El filtro puede ser un
 * prefijo (ej. "85" → toda la división salud) o un código completo. Si la
 * licitación no tiene CPV, no matchea (no inventamos).
 */
export function cpvMatchesFilter(cpv: string | null | undefined, filtro: string | null | undefined): boolean {
  if (!filtro) return true // sin filtro → todo pasa
  const f = normalizeCpv(filtro)
  const c = normalizeCpv(cpv)
  if (!f) return true
  if (!c) return false
  return c.startsWith(f)
}

/**
 * Puntuación de relevancia social (0-100) para ordenar cuando no hay filtro CPV.
 * Más alto = más relevante a tercer sector. Prefijo más específico → más puntos.
 */
export function socialRelevanceScore(cpv: string | null | undefined): number {
  const n = normalizeCpv(cpv)
  if (!n) return 0
  let score = 0
  for (const p of CPV_SOCIAL_DEFAULT_PREFIXES) {
    if (n.startsWith(p)) {
      // división (2) → 40 ; grupo fino → hasta 60
      score = Math.max(score, 40 + Math.min(60, (p.length - 2) * 10))
    }
  }
  return score
}
