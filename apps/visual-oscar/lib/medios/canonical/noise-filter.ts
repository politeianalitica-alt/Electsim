/**
 * Filtro de ruido: 7 reglas spec §Paso 4.
 * Conservador: en duda, no marca noise (pasa al pipeline normal).
 * Sprint 0+1 · Task 3 · 2026-06-02
 */

export interface NoiseResult {
  isNoise: boolean
  reason: string | null
}

const NOISE_KEYWORDS = [
  'horóscopo', 'horoscopo',
  'receta de', 'recetas',
  'patrocinado', 'publicidad', 'publirreportaje', 'contenido patrocinado',
  'oferta', 'ofertas del black friday',
  'sorteo', 'concurso',
  'esquela', 'obituario',
]

const SPORTS_NO_POLITICS = ['resultados de la liga', 'gol de', 'minuto a minuto']

export function detectNoise(input: {
  title: string
  description?: string | null
}): NoiseResult {
  const title = input.title.trim()
  const description = (input.description ?? '').trim()
  const titleLower = title.toLowerCase()

  // Regla 1: título < 5 palabras
  const words = title.split(/\s+/).filter((w) => w.length > 0)
  if (words.length < 5) return { isNoise: true, reason: 'title_too_short' }

  // Regla 2: título solo números/símbolos (sin letras suficientes)
  // BMP-only Latin range para evitar regex flag `u` (target es5 en tsconfig)
  const alphaCount = (title.match(/[A-Za-zÀ-ɏḀ-ỿ]/g) ?? []).length
  if (alphaCount < 5) return { isNoise: true, reason: 'title_no_letters' }

  // Regla 3: keywords noise (horóscopo, receta, publi, sorteo, esquela)
  for (const kw of NOISE_KEYWORDS) {
    if (titleLower.includes(kw))
      return { isNoise: true, reason: `keyword_${kw.replace(/\s+/g, '_')}` }
  }

  // Regla 4: deportes sin contexto político
  for (const kw of SPORTS_NO_POLITICS) {
    if (titleLower.includes(kw)) return { isNoise: true, reason: 'sports_no_politics' }
  }

  // Regla 5: descripción vacía
  if (!description) return { isNoise: true, reason: 'empty_description' }

  // Regla 6: descripción igual al título
  if (description.toLowerCase().trim() === titleLower)
    return { isNoise: true, reason: 'description_equals_title' }

  return { isNoise: false, reason: null }
}
