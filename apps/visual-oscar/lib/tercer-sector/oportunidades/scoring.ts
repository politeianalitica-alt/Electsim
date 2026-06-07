/**
 * lib/tercer-sector/oportunidades/scoring.ts · SCORING DE APTITUD ONG ·
 * FUENTE ÚNICA DE VERDAD · Tercer Sector cockpit · Sprint W1a.
 *
 * `scoreOportunidad()` decide, de forma puramente determinista y transparente,
 * cuán apta es una oportunidad (subvención/licitación/grant/cooperación) para
 * una organización del tercer sector. La usan:
 *   - el endpoint `/api/tercer-sector/oportunidades` (al normalizar cada item),
 *   - la extensión de licitaciones (`licitaciones/enrich.ts`) — que IMPORTA esta
 *     función y NO duplica las listas de CPV/keywords.
 *
 * Principios (CLAUDE.md + spec):
 *   - NUNCA inventar aptitud: si faltan datos clave (sin importe y sin plazo) el
 *     veredicto es 'incierta' / 'incierto', no un número optimista.
 *   - Reglas EXACTAS del spec (no se ajustan "a ojo"). Cada regla aplicada deja
 *     una razón legible en `razones`.
 *   - Pura y sin red: testeable con `node --experimental-strip-types`.
 *
 * Reglas (del spec):
 *   +25  CPV ∈ {85,853,8531,8532,752,751,804,805,981,982} (prefijos sociales)
 *   +20  título con keyword social (servicios sociales, inclusión, …)
 *   +20  tipo ∈ {subvencion, grant_ue, cooperacion_internacional}
 *   +10  docs descargables
 *   +10  plazo > 10 días
 *   −20  importe > 5M sin lotes
 *   −15  idioma ∉ {es, en}
 *   −15  sin importe ni plazo
 *   −20  texto sugiere obra/construcción/suministro industrial/servicios puramente técnicos
 * label: alta ≥ 55 · media 35-54 · baja 1-34 · incierta si faltan datos clave.
 */

import type { TipoOportunidad } from './types'

// ─────────────────────────────────────────────────────────────────────────
// Constantes EXPORTADAS (reutilizables por enrich.ts — no duplicar listas)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Prefijos CPV que delatan servicios sociales / salud / formación / cooperación
 * / asociaciones. EXACTAMENTE los del spec. Se evalúan como prefijo del CPV
 * normalizado (solo dígitos).
 *   85    Salud y servicios sociales
 *   853   Servicios de asistencia social
 *   8531  Asistencia social (subgrupo)
 *   8532  Servicios sociales sin alojamiento
 *   752   Servicios para la comunidad (incl. cooperación / asuntos sociales)
 *   751   Servicios de la administración pública (asuntos sociales)
 *   804   Educación de adultos y otras enseñanzas
 *   805   Servicios de formación
 *   981   Servicios de asociaciones (incl. asociaciones sociales 9813x)
 *   982   Servicios relacionados con la inclusión / diversidad
 */
export const CPV_SOCIALES: readonly string[] = [
  '85',
  '853',
  '8531',
  '8532',
  '752',
  '751',
  '804',
  '805',
  '981',
  '982',
] as const

/**
 * Keywords (en el título / descripción) que delatan una oportunidad social.
 * EXACTAMENTE las del spec. Se buscan sobre texto normalizado (minúsculas, sin
 * acentos), así que se escriben sin tildes.
 */
export const KEYWORDS_SOCIALES: readonly string[] = [
  'servicios sociales',
  'inclusion',
  'vulnerabilidad',
  'discapacidad',
  'infancia',
  'migrantes',
  'refugiados',
  'cooperacion',
  'humanitario',
  'voluntariado',
  'igualdad',
  'empleo social',
  'dependencia',
] as const

/**
 * Términos que sugieren obra / construcción / suministro industrial / servicios
 * puramente técnicos → penalización (mal encaje para una ONG generalista).
 * Sobre texto normalizado (sin acentos).
 */
export const KEYWORDS_PENALIZACION: readonly string[] = [
  'obra',
  'obras',
  'construccion',
  'edificacion',
  'rehabilitacion de edificio',
  'urbanizacion',
  'pavimentacion',
  'asfaltado',
  'carretera',
  'infraestructura',
  'suministro industrial',
  'maquinaria',
  'equipamiento industrial',
  'mantenimiento de instalaciones',
  'limpieza viaria',
  'redes electricas',
  'saneamiento',
  'alcantarillado',
  'demolicion',
] as const

/** Tipos de oportunidad que suman aptitud (vía "natural" del tercer sector). */
const TIPOS_AFINES: ReadonlySet<TipoOportunidad> = new Set<TipoOportunidad>([
  'subvencion',
  'grant_ue',
  'cooperacion_internacional',
])

/** Idiomas operables sin barrera para una ONG española. */
const IDIOMAS_OK = new Set(['es', 'en'])

// ─────────────────────────────────────────────────────────────────────────
// Helpers puros
// ─────────────────────────────────────────────────────────────────────────

/** Normaliza texto: minúsculas + sin acentos + colapsa espacios. Plano (sin deps). */
function norm(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** CPV → solo dígitos (hasta 8). null si no hay dígitos. */
function cpvDigits(cpv: string | null | undefined): string | null {
  if (!cpv) return null
  const d = String(cpv).replace(/[^0-9]/g, '')
  return d ? d.slice(0, 8) : null
}

/** ¿El CPV pertenece a un grupo social (prefijo de CPV_SOCIALES)? Exportada. */
export function cpvEsSocial(cpv: string | null | undefined): boolean {
  const d = cpvDigits(cpv)
  if (!d) return false
  return CPV_SOCIALES.some((p) => d.startsWith(p))
}

/** Días naturales desde hoy (o `now`) hasta `fechaLimite` (ISO/YYYY-MM-DD). */
export function diasRestantes(
  fechaLimite: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!fechaLimite) return null
  const m = String(fechaLimite).match(/^(\d{4})-(\d{2})-(\d{2})/)
  let limite: number
  if (m) {
    // Comparación a medianoche UTC para evitar saltos por zona horaria.
    limite = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  } else {
    const t = Date.parse(String(fechaLimite))
    if (!Number.isFinite(t)) return null
    limite = t
  }
  const hoy = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((limite - hoy) / 86_400_000)
}

// ─────────────────────────────────────────────────────────────────────────
// Scoring · FUENTE ÚNICA
// ─────────────────────────────────────────────────────────────────────────

/** Entrada mínima para puntuar. Acepta un `Partial<OportunidadTS>` enriquecido. */
export interface ScoreInput {
  titulo: string
  cpv?: string | null
  tipo?: TipoOportunidad | null
  importe_eur?: number | null
  fecha_limite?: string | null
  documentos?: { url?: string }[] | null
  moneda?: string | null
  idioma?: string | null
  /** Texto extra para keyword-matching (descripción/objeto), opcional. */
  descripcion?: string | null
  /** Si la fuente declara lotes (mitiga la penalización por importe gigante). */
  tiene_lotes?: boolean | null
  /** Override de "ahora" para tests deterministas. */
  now?: Date
}

export interface ScoreResult {
  score: number
  label: 'alta' | 'media' | 'baja' | 'incierta'
  razones: string[]
  riesgo: 'bajo' | 'medio' | 'alto' | 'incierto'
}

/**
 * Puntúa la aptitud de una oportunidad para una ONG. Determinista y transparente.
 *
 * `score` se clampa a [0,100]. `label`:
 *   - 'incierta'  si faltan datos clave (sin importe Y sin plazo).
 *   - 'alta'      score ≥ 55
 *   - 'media'     35 ≤ score ≤ 54
 *   - 'baja'      1 ≤ score ≤ 34  (0 también cae en 'baja' salvo que sea incierta)
 *
 * `riesgo` resume el riesgo de encaje/ejecución (no se inventa):
 *   - 'incierto'  si datos clave ausentes (mismo gate que 'incierta').
 *   - 'alto'      importe gigante sin lotes, idioma no operable, o texto técnico/obra.
 *   - 'bajo'      claramente social (CPV o keyword) y sin banderas de riesgo.
 *   - 'medio'     resto.
 */
export function scoreOportunidad(o: ScoreInput): ScoreResult {
  const razones: string[] = []
  let score = 0

  const texto = `${norm(o.titulo)} ${norm(o.descripcion)}`.trim()
  const tieneImporte = typeof o.importe_eur === 'number' && Number.isFinite(o.importe_eur)
  const dias = diasRestantes(o.fecha_limite, o.now)
  const tienePlazo = dias != null
  // "Faltan datos clave" = no hay NI importe NI plazo: no podemos juzgar aptitud.
  const datosClaveAusentes = !tieneImporte && !tienePlazo

  // ── Señales positivas ──────────────────────────────────────────────────
  if (cpvEsSocial(o.cpv)) {
    score += 25
    razones.push('CPV de servicios sociales/salud/cooperación (+25)')
  }

  const kwSocial = KEYWORDS_SOCIALES.find((k) => texto.includes(k))
  if (kwSocial) {
    score += 20
    razones.push(`Título indica ámbito social: "${kwSocial}" (+20)`)
  }

  if (o.tipo && TIPOS_AFINES.has(o.tipo)) {
    score += 20
    razones.push(`Tipo afín al tercer sector: ${o.tipo} (+20)`)
  }

  const tieneDocs = Array.isArray(o.documentos) && o.documentos.some((d) => d && d.url)
  if (tieneDocs) {
    score += 10
    razones.push('Documentos descargables disponibles (+10)')
  }

  if (dias != null && dias > 10) {
    score += 10
    razones.push(`Plazo holgado (${dias} días) (+10)`)
  }

  // ── Penalizaciones ───────────────────────────────────────────────────────
  const importeGiganteSinLotes =
    tieneImporte && (o.importe_eur as number) > 5_000_000 && !o.tiene_lotes
  if (importeGiganteSinLotes) {
    score -= 20
    razones.push('Importe > 5M€ sin lotes: difícil para una ONG (−20)')
  }

  // Idioma: solo penaliza si la fuente declara idioma y NO es operable.
  const idioma = o.idioma ? norm(o.idioma).slice(0, 2) : ''
  const idiomaNoOperable = !!idioma && !IDIOMAS_OK.has(idioma)
  if (idiomaNoOperable) {
    score -= 15
    razones.push(`Idioma no operable directamente (${idioma}) (−15)`)
  }

  if (datosClaveAusentes) {
    score -= 15
    razones.push('Sin importe ni plazo: información insuficiente (−15)')
  }

  const kwTecnica = KEYWORDS_PENALIZACION.find((k) => texto.includes(k))
  if (kwTecnica) {
    score -= 20
    razones.push(`Objeto técnico/obra ("${kwTecnica}"): mal encaje (−20)`)
  }

  // ── Clamp + etiqueta ──────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score))

  let label: ScoreResult['label']
  if (datosClaveAusentes) {
    label = 'incierta'
  } else if (score >= 55) {
    label = 'alta'
  } else if (score >= 35) {
    label = 'media'
  } else {
    label = 'baja'
  }

  // ── Riesgo (encaje/ejecución) ─────────────────────────────────────────────
  let riesgo: ScoreResult['riesgo']
  const banderasRiesgo = importeGiganteSinLotes || idiomaNoOperable || !!kwTecnica
  const claramenteSocial = cpvEsSocial(o.cpv) || !!kwSocial
  if (datosClaveAusentes) {
    riesgo = 'incierto'
  } else if (banderasRiesgo) {
    riesgo = 'alto'
  } else if (claramenteSocial) {
    riesgo = 'bajo'
  } else {
    riesgo = 'medio'
  }

  return { score, label, razones, riesgo }
}
