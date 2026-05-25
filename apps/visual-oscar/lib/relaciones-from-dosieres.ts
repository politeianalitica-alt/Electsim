/**
 * Genera RelacionExplicita[] a partir de los 400 dosieres del fixture.
 *
 * Cada dossier tiene un apartado "redes" con items tipo 'contacto' cuyo
 * titulo = persona relacionada y contenido = "**Tipo** (nota +N/10) — ...".
 *
 * Mapeo:
 *   1. Para cada actor del mapa (ACTORES), buscar su dossier por nombre normalizado.
 *   2. Si tiene apartado "redes", para cada item:
 *      a) Buscar en ACTORES el actor destino por nombre normalizado.
 *      b) Si ambos actores existen y son distintos → crear RelacionExplicita.
 *   3. Solo incluir relaciones FUERTES (|nota| >= 5) para no saturar el grafo.
 *   4. Deduplicar por par ordenado (a-b == b-a).
 *
 * Tipo de línea según nota:
 *    +9 a +10: 'aliado_partido'      (verde fuerte · línea gruesa)
 *    +5 a +8:  'pacto_investidura'   (verde · línea media)
 *    -5 a -8:  'critica_publica'     (naranja · línea media)
 *    -9 a -10: 'oposicion_frontal'   (rojo fuerte · línea gruesa)
 */
import type { RelacionExplicita, TipoRelacion } from './relaciones-explicitas'
import { DOSIERES_FIXTURE } from '@/data/dosieres-fixture'
import { ACTORES } from './actores'

// ── Normalización ──────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quita tildes
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Índice precalculado de actores por tokens del nombre
const ACTOR_INDEX = ACTORES.map(a => ({
  id: a.id,
  tokens: normalize(a.nombre).split(' '),
  nombre: a.nombre,
}))

/** Busca el actor del mapa que mejor matchea con un nombre dado. */
function findActorIdByName(name: string): string | null {
  if (!name) return null
  const norm = normalize(name)
  const searchTokens = norm.split(' ').filter(t => t.length > 1)
  if (searchTokens.length === 0) return null

  // 1. Exacto
  for (const entry of ACTOR_INDEX) {
    if (entry.tokens.join(' ') === norm) return entry.id
  }
  // 2. Todos los tokens buscados están en el actor
  for (const entry of ACTOR_INDEX) {
    const joined = entry.tokens.join(' ')
    if (searchTokens.every(t => joined.includes(t))) return entry.id
  }
  // 3. Match parcial con apellido (2 tokens mínimo · nombre + apellido)
  if (searchTokens.length >= 2) {
    let best: { id: string; matches: number } | null = null
    for (const entry of ACTOR_INDEX) {
      const joined = entry.tokens.join(' ')
      const matches = searchTokens.filter(t => joined.includes(t)).length
      if (matches >= 2 && (!best || matches > best.matches)) {
        best = { id: entry.id, matches }
      }
    }
    if (best) return best.id
  }
  return null
}

// ── Mapeo nota → tipo de relación ─────────────────────────────────────────
function tipoFromNota(nota: number): TipoRelacion {
  if (nota >= 9) return 'aliado_partido'
  if (nota >= 5) return 'pacto_investidura'
  if (nota >= 0) return 'mediador'
  if (nota >= -4) return 'critica_publica'
  if (nota >= -8) return 'oposicion_frontal'
  return 'oposicion_frontal'
}

// Extraer nota desde el contenido del item · formato "**Tipo** (nota +N/10) — ..."
function extractNota(contenido: string): number | null {
  const m = contenido.match(/nota\s*([+\-]?\d+)\/10/)
  return m ? parseInt(m[1], 10) : null
}

// ── Build · genera las relaciones una sola vez al cargar el módulo ────────
function buildRelacionesDesdeDosieres(): RelacionExplicita[] {
  const out: RelacionExplicita[] = []
  const seen = new Set<string>()
  const MIN_NOTA_ABS = 5  // umbral · solo relaciones fuertes

  for (const dossier of DOSIERES_FIXTURE) {
    const actorA_id = findActorIdByName(dossier.nombre_completo)
    if (!actorA_id) continue

    const redes = dossier.apartados.find(ap => ap.tipo === 'redes')
    if (!redes) continue

    for (const item of redes.items) {
      const persona = item.titulo
      if (!persona) continue
      const actorB_id = findActorIdByName(persona)
      if (!actorB_id || actorB_id === actorA_id) continue

      const nota = extractNota(item.contenido)
      if (nota === null || Math.abs(nota) < MIN_NOTA_ABS) continue

      const pairKey = [actorA_id, actorB_id].sort().join('|')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      const tipo = tipoFromNota(nota)
      // Label corto · si el contenido tiene un guion separador, usar la
      // parte explicativa (la valoración razonada del informe).
      const dashIdx = item.contenido.indexOf('—')
      const explicacion = dashIdx > 0 ? item.contenido.slice(dashIdx + 1).trim() : item.contenido
      const labelClean = explicacion
        .replace(/\*+/g, '')
        .replace(/^\s*\(nota.*?\)\s*/i, '')
        .slice(0, 120)

      out.push({
        a: actorA_id,
        b: actorB_id,
        val: nota * 10,           // escala -100..+100
        tipo,
        label: labelClean || `Valoración del informe (${nota >= 0 ? '+' : ''}${nota}/10)`,
      })
    }
  }

  return out
}

export const RELACIONES_DESDE_DOSIERES: RelacionExplicita[] = buildRelacionesDesdeDosieres()
