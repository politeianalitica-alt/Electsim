/**
 * Framework de Narrativas v2 · multidimensional.
 *
 * BASE TEÓRICA · qué es una narrativa
 * ====================================
 * Una narrativa mediática se compone de 6 dimensiones intersectadas:
 *
 *   1. TEMA        — el asunto principal (vivienda, justicia, OTAN...)
 *   2. ACTORES     — protagonistas + antagonistas (víctimas, agresores, héroes)
 *   3. FRAME       — el marco interpretativo (Lakoff): víctima/agresor,
 *                    estratégico/episódico, conflicto/responsabilidad/moralidad
 *   4. EMOCIÓN     — registro afectivo dominante (ira/miedo/esperanza/desprecio)
 *   5. EVIDENCIA   — tipo de soporte (datos, anécdota, declaración, opinión)
 *   6. PERSISTENCIA— duración + crescendo + capacidad de regeneración
 *
 * Para extraer una narrativa:
 *   a) Agrupar noticias por similitud semántica (TF-IDF + Jaccard)
 *   b) Para cada cluster identificar las 6 dimensiones
 *   c) Calcular fuerza (n artículos · n medios · n días · crescendo)
 *   d) Detectar polarización (varianza de sentimiento)
 *
 * Esta v2 mejora la v1 (que solo agrupaba por similitud léxica) añadiendo:
 *   - Identificación de actores nombrados (NER por patrones)
 *   - Clasificación de frame (5 marcos clásicos de Iyengar/Entman)
 *   - Detección de emoción dominante (5 emociones de Plutchik aplicables a noticias)
 *   - Cálculo de polarización (varianza de sentimiento dentro del cluster)
 *   - Persistencia temporal (días con cobertura activa)
 */

import type { AggregatedArticle } from '../news-aggregator'

// ─── DIMENSIONES ────────────────────────────────────────────────────────

export type Frame = 'conflicto' | 'responsabilidad' | 'consecuencias económicas' | 'moralidad' | 'interés humano' | 'estratégico'

export type Emocion = 'ira' | 'miedo' | 'esperanza' | 'desprecio' | 'orgullo' | 'tristeza' | 'neutral'

export type TipoActor = 'protagonista' | 'antagonista' | 'víctima' | 'observador' | 'institución' | 'colectivo'

export interface ActorDetectado {
  nombre: string
  tipo: TipoActor
  menciones: number
  sentimientoMedio: number   // -1 a +1
}

export interface NarrativaV2 {
  id: string
  // Dimensión 1: Tema
  tema: string
  subtemas: string[]
  // Dimensión 2: Actores
  actores: ActorDetectado[]
  // Dimensión 3: Frame
  frameDominante: Frame
  framesSecundarios: Frame[]
  // Dimensión 4: Emoción
  emocionDominante: Emocion
  emocionesSecundarias: Emocion[]
  // Dimensión 5: Evidencia
  tipoEvidenciaDominante: 'datos' | 'declaración' | 'opinión' | 'anécdota' | 'mixto'
  fuentesCitadas: string[]
  // Dimensión 6: Persistencia + fuerza
  fuerza: number              // n artículos
  diasActiva: number
  crescendo: number           // ratio últimos 3d / anteriores 3d
  polarizacion: number        // 0-1 (varianza sentimiento)
  // Sentimiento agregado
  sentimientoMedio: number
  tono: 'positivo' | 'negativo' | 'neutral' | 'polarizado'
  // Visualización
  color: string
  ejemplos: Array<{ titulo: string; medio: string; url: string; fecha: string | null }>
  mediosCubriendo: string[]
}

// ─── PATRONES DE CLASIFICACIÓN ─────────────────────────────────────────

const FRAME_PATTERNS: Record<Frame, RegExp[]> = {
  'conflicto':                [/enfrentamiento|choque|guerra|combate|disput|tensión|cris[ií]s|polémica|amenaza/i],
  'responsabilidad':          [/responsabl|culpa|debe|deber[íi]a|tiene que|exige|reclama|pide/i],
  'consecuencias económicas': [/precio|coste|millones|pib|impuesto|paro|empleo|inversi[óo]n|empresa/i],
  'moralidad':                [/justo|injusto|ético|moral|valor|principio|democrac|libertad|derecho|dignidad/i],
  'interés humano':           [/familia|persona|víctima|sufre|histor[íi]a|testimonio|emoción/i],
  'estratégico':              [/estrateg|táctic|maniobra|cálculo|interés|posici[óo]n|votos|encuestas/i],
}

const EMOCION_PATTERNS: Record<Emocion, RegExp[]> = {
  'ira':       [/indignaci[óo]n|ira|furiosa?|rabi[ae]|escándalo|insulto/i],
  'miedo':     [/temor|miedo|alarma|preocupaci[óo]n|amenaza|peligro|riesgo|incertidumbre|crisis/i],
  'esperanza': [/esperanza|optimism|oportunidad|mejor|avanc|logro|éxito|positivo/i],
  'desprecio': [/desprecio|incompetenc|inepto|absurdo|ridícul|patético|vergonzoso|escándalo/i],
  'orgullo':   [/orgullo|patriotism|liderazgo|valent[íi]a|hero[íi]/i],
  'tristeza':  [/tristeza|dolor|luto|tragedia|pérdida|fallece|muerte/i],
  'neutral':   [/según|informa|según fuentes|declar[óa]/i],
}

const TIPO_EVIDENCIA_PATTERNS: Array<{ pattern: RegExp; tipo: 'datos' | 'declaración' | 'opinión' | 'anécdota' }> = [
  { pattern: /\b\d+%|\d+,\d+\s*€|\d+\s*millones|estad[íi]stic|cifras|datos|porcentaje|encuesta/i, tipo: 'datos' },
  { pattern: /declar[óa]|afirma|asegura|dijo|aseguró|según|manifest[óa]|sostiene/i,                tipo: 'declaración' },
  { pattern: /opina|considera|cree|estima|valor[óa]|interpreta|según los expertos/i,                tipo: 'opinión' },
  { pattern: /el caso|la historia|el testimonio|la víctima|familia[r]?/i,                          tipo: 'anécdota' },
]

const ACTORES_NER: Array<{ pattern: RegExp; nombre: string; tipo: TipoActor }> = [
  { pattern: /pedro\s+s[áa]nchez|presidente del gobierno/i,        nombre: 'Pedro Sánchez',   tipo: 'protagonista' },
  { pattern: /feij[óo]o|n[úu][ñn]ez feij[óo]o/i,                   nombre: 'Núñez Feijóo',    tipo: 'antagonista' },
  { pattern: /yolanda\s+d[íi]az/i,                                 nombre: 'Yolanda Díaz',    tipo: 'protagonista' },
  { pattern: /santiago\s+abascal|abascal/i,                        nombre: 'Santiago Abascal',tipo: 'antagonista' },
  { pattern: /ayuso|isabel d[íi]az ayuso/i,                        nombre: 'Isabel Díaz Ayuso',tipo: 'protagonista' },
  { pattern: /illa|salvador illa/i,                                nombre: 'Salvador Illa',   tipo: 'protagonista' },
  { pattern: /puigdemont/i,                                        nombre: 'Carles Puigdemont', tipo: 'antagonista' },
  { pattern: /\bpsoe\b/i,                                          nombre: 'PSOE',            tipo: 'institución' },
  { pattern: /partido popular|\bpp\b/i,                            nombre: 'PP',              tipo: 'institución' },
  { pattern: /\bvox\b/i,                                           nombre: 'Vox',             tipo: 'institución' },
  { pattern: /\bsumar\b/i,                                         nombre: 'Sumar',           tipo: 'institución' },
  { pattern: /\bjunts\b/i,                                         nombre: 'Junts',           tipo: 'institución' },
  { pattern: /\berc\b|esquerra republicana/i,                      nombre: 'ERC',             tipo: 'institución' },
  { pattern: /\bpnv\b/i,                                           nombre: 'PNV',             tipo: 'institución' },
  { pattern: /\beh bildu\b|bildu/i,                                nombre: 'EH Bildu',        tipo: 'institución' },
  { pattern: /\btribunal supremo\b|\bts\b/i,                       nombre: 'Tribunal Supremo',tipo: 'institución' },
  { pattern: /tribunal constitucional|\btc\b/i,                    nombre: 'Tribunal Constitucional', tipo: 'institución' },
  { pattern: /audiencia nacional/i,                                nombre: 'Audiencia Nacional', tipo: 'institución' },
  { pattern: /comisi[óo]n europea|bruselas/i,                      nombre: 'Comisión Europea',tipo: 'institución' },
  { pattern: /banco de españa|\bbde\b/i,                           nombre: 'Banco de España', tipo: 'institución' },
  { pattern: /\botan\b/i,                                          nombre: 'OTAN',            tipo: 'institución' },
  { pattern: /inmigra(?:ci[óo]n|ntes?)/i,                          nombre: 'Inmigrantes',     tipo: 'víctima' },
  { pattern: /menas/i,                                             nombre: 'MENAS',           tipo: 'víctima' },
  { pattern: /agricultor|ganader/i,                                nombre: 'Agricultores',    tipo: 'colectivo' },
  { pattern: /sindicat|ccoo|\bugt\b/i,                             nombre: 'Sindicatos',      tipo: 'colectivo' },
  { pattern: /pensionist/i,                                        nombre: 'Pensionistas',    tipo: 'colectivo' },
  { pattern: /j[óo]venes|juventud/i,                               nombre: 'Juventud',        tipo: 'colectivo' },
]

// ─── HELPERS ────────────────────────────────────────────────────────────

function detectarFrame(textos: string): { dominante: Frame; secundarios: Frame[] } {
  const scores: Record<Frame, number> = { 'conflicto': 0, 'responsabilidad': 0, 'consecuencias económicas': 0, 'moralidad': 0, 'interés humano': 0, 'estratégico': 0 }
  for (const [frame, patterns] of Object.entries(FRAME_PATTERNS)) {
    for (const p of patterns) {
      const m = textos.match(p)
      if (m) scores[frame as Frame] += m.length || 1
    }
  }
  const ordenados = Object.entries(scores).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const dominante: Frame = (ordenados[0]?.[0] as Frame) || 'conflicto'
  const secundarios: Frame[] = ordenados.slice(1, 3).map(e => e[0] as Frame)
  return { dominante, secundarios }
}

function detectarEmocion(textos: string): { dominante: Emocion; secundarias: Emocion[] } {
  const scores: Record<Emocion, number> = { 'ira': 0, 'miedo': 0, 'esperanza': 0, 'desprecio': 0, 'orgullo': 0, 'tristeza': 0, 'neutral': 0 }
  for (const [emocion, patterns] of Object.entries(EMOCION_PATTERNS)) {
    for (const p of patterns) {
      const m = textos.match(p)
      if (m) scores[emocion as Emocion] += m.length || 1
    }
  }
  const ordenados = Object.entries(scores).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const dominante: Emocion = (ordenados[0]?.[0] as Emocion) || 'neutral'
  const secundarias: Emocion[] = ordenados.slice(1, 3).map(e => e[0] as Emocion)
  return { dominante, secundarias }
}

function detectarEvidencia(textos: string): { tipo: 'datos' | 'declaración' | 'opinión' | 'anécdota' | 'mixto'; fuentes: string[] } {
  const scores = { datos: 0, declaración: 0, opinión: 0, anécdota: 0 }
  for (const { pattern, tipo } of TIPO_EVIDENCIA_PATTERNS) {
    const m = textos.match(pattern)
    if (m) scores[tipo] += m.length || 1
  }
  const ordenados = Object.entries(scores).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const top = ordenados[0]
  const segundo = ordenados[1]
  let tipo: 'datos' | 'declaración' | 'opinión' | 'anécdota' | 'mixto' = 'mixto'
  if (top && segundo && top[1] > segundo[1] * 2) tipo = top[0] as 'datos' | 'declaración' | 'opinión' | 'anécdota'
  else if (top) tipo = top[0] as 'datos' | 'declaración' | 'opinión' | 'anécdota'
  // Fuentes citadas: extraer "según X" o "X afirma"
  const fuentes = new Set<string>()
  const fuenteRe = /seg[úu]n\s+([A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+){0,2})/g
  let m
  while ((m = fuenteRe.exec(textos))) fuentes.add(m[1])
  return { tipo, fuentes: Array.from(fuentes).slice(0, 5) }
}

function detectarActores(articles: AggregatedArticle[]): ActorDetectado[] {
  const actorMap = new Map<string, { tipo: TipoActor; menciones: number; sentSum: number }>()
  for (const a of articles) {
    const txt = a.title + ' ' + (a.description || '')
    for (const { pattern, nombre, tipo } of ACTORES_NER) {
      const matches = txt.match(pattern)
      if (matches) {
        const existing = actorMap.get(nombre)
        if (existing) {
          existing.menciones += matches.length
          existing.sentSum += a.sentiment_score
        } else {
          actorMap.set(nombre, { tipo, menciones: matches.length, sentSum: a.sentiment_score })
        }
      }
    }
  }
  return Array.from(actorMap.entries()).map(([nombre, v]) => ({
    nombre, tipo: v.tipo, menciones: v.menciones,
    sentimientoMedio: +(v.sentSum / v.menciones).toFixed(2),
  })).sort((a, b) => b.menciones - a.menciones).slice(0, 8)
}

function calcularPolarizacion(articles: AggregatedArticle[]): number {
  if (articles.length < 2) return 0
  const media = articles.reduce((s, a) => s + a.sentiment_score, 0) / articles.length
  const varianza = articles.reduce((s, a) => s + Math.pow(a.sentiment_score - media, 2), 0) / articles.length
  // Normalizar a 0-1 (varianza máxima teórica = 1.0 si dos polos perfectos)
  return Math.min(1, varianza * 4)
}

function calcularCrescendo(articles: AggregatedArticle[]): number {
  if (articles.length < 3) return 1
  const sorted = [...articles].sort((a, b) => (a.pub_date_iso || '').localeCompare(b.pub_date_iso || ''))
  const half = Math.floor(sorted.length / 2)
  const primera = sorted.slice(0, half).length
  const segunda = sorted.slice(half).length
  if (primera === 0) return 2
  return +(segunda / primera).toFixed(2)
}

const TEMA_KEYWORDS: Array<{ tema: string; subtemas: string[]; keywords: RegExp[]; color: string }> = [
  { tema: 'Justicia y corrupción', subtemas: ['Caso Koldo', 'Caso Cerdán', 'Lawfare'], keywords: [/audiencia nacional|tribunal supremo|juez|fiscal|corrupci[óo]n|imputaci/i], color: '#7F1D1D' },
  { tema: 'Vivienda', subtemas: ['Alquiler', 'Precio', 'Stress'], keywords: [/vivienda|alquiler|hipoteca|inmobiliaria|squat/i], color: '#F97316' },
  { tema: 'Política territorial', subtemas: ['Cataluña', 'País Vasco', 'Financiación'], keywords: [/catalu[ñn]a|generalitat|junts|erc|euskadi|financiaci[óo]n autonómica/i], color: '#5B21B6' },
  { tema: 'Coalición de gobierno', subtemas: ['PSOE-Sumar', 'Junts', 'Tensión interna'], keywords: [/coalici[óo]n|psoe|sumar|gobierno|pacto/i], color: '#1F4E8C' },
  { tema: 'Economía y empleo', subtemas: ['Inflación', 'Empleo', 'SMI'], keywords: [/inflaci[óo]n|paro|empleo|smi|pib|impuesto/i], color: '#0F766E' },
  { tema: 'Migración', subtemas: ['Llegadas', 'MENAS', 'Frontera'], keywords: [/migra(?:ci[óo]n|ntes?)|inmigra|cayuco|patera|frontera|mena/i], color: '#DC2626' },
  { tema: 'Guerra Ucrania', subtemas: ['Ayuda', 'OTAN', 'Rusia'], keywords: [/ucrania|rusia|zelensky|putin|otan/i], color: '#3B82F6' },
  { tema: 'Israel-Palestina', subtemas: ['Gaza', 'Líbano', 'Hutíes'], keywords: [/gaza|israel|hamas|palest|hezbol/i], color: '#5D4037' },
  { tema: 'Sanidad', subtemas: ['Atención primaria', 'Listas espera'], keywords: [/sanidad|hospital|listas? de espera|m[ée]dic/i], color: '#16A34A' },
  { tema: 'Educación', subtemas: ['Universidad', 'Concertada'], keywords: [/educaci[óo]n|escuela|profesor|universidad|concertad/i], color: '#0EA5E9' },
  { tema: 'Cambio climático', subtemas: ['Sequía', 'Incendios', 'Energía'], keywords: [/clima|sequ[íi]a|incendi|cambio clim|energ[íi]a renovable/i], color: '#84CC16' },
  { tema: 'Feminismo y LGTBI', subtemas: ['Solo sí', 'Trans', 'Igualdad'], keywords: [/feminism|igualdad|lgtbi|trans|machist|violencia g[ée]nero/i], color: '#D946EF' },
]

function clasificarTema(textos: string): { tema: string; subtemas: string[]; color: string } {
  let best: { tema: string; subtemas: string[]; color: string; score: number } | null = null
  for (const t of TEMA_KEYWORDS) {
    let score = 0
    for (const re of t.keywords) {
      const m = textos.match(re)
      if (m) score += m.length || 1
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { tema: t.tema, subtemas: t.subtemas, color: t.color, score }
    }
  }
  return best ?? { tema: 'Política general', subtemas: [], color: '#525258' }
}

// ─── EXTRACCIÓN PRINCIPAL ───────────────────────────────────────────────

const STOP = new Set([
  'sobre','desde','hasta','según','tras','ante','entre','durante','esta','este','estos','estas',
  'también','aunque','mientras','porque','cuando','donde','quien','cómo','para','contra','por',
  'con','del','que','una','uno','unos','unas','los','las','les','sus','muy','más','tras',
])

function tokens(s: string): string[] {
  return s.toLowerCase().split(/\W+/).filter(w => w.length >= 4 && !STOP.has(w))
}

function bigrams(t: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < t.length - 1; i++) out.push(`${t[i]} ${t[i + 1]}`)
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/**
 * Extrae narrativas v2 multidimensionales de un conjunto de artículos.
 */
export function extraerNarrativasV2(articles: AggregatedArticle[], maxNarrativas = 6): NarrativaV2[] {
  if (articles.length < 3) return []

  // 1. Clustering greedy por similitud
  const docs = articles.map(a => {
    const txt = (a.title + ' ' + (a.description || '').slice(0, 200))
    return { article: a, set: new Set([...tokens(txt), ...bigrams(tokens(txt))]) }
  })

  const clusters: Array<{ docs: typeof docs; topTerms: Set<string> }> = []
  for (const doc of docs) {
    let mejor = -1, mejorSim = 0
    for (let i = 0; i < clusters.length; i++) {
      const sim = jaccard(doc.set, clusters[i].topTerms)
      if (sim > mejorSim && sim > 0.20) { mejor = i; mejorSim = sim }
    }
    if (mejor >= 0) {
      clusters[mejor].docs.push(doc)
      for (const t of doc.set) clusters[mejor].topTerms.add(t)
    } else {
      clusters.push({ docs: [doc], topTerms: new Set(doc.set) })
    }
  }

  // 2. Filtrar y rankear
  const significant = clusters.filter(c => c.docs.length >= 2)
  significant.sort((a, b) => b.docs.length - a.docs.length)

  // 3. Para cada cluster, extraer las 6 dimensiones
  return significant.slice(0, maxNarrativas).map((c, idx) => {
    const articles = c.docs.map(d => d.article)
    const textos = articles.map(a => a.title + ' ' + (a.description || '')).join(' ')

    const tema = clasificarTema(textos)
    const actores = detectarActores(articles)
    const { dominante: frameDominante, secundarios: framesSecundarios } = detectarFrame(textos)
    const { dominante: emocionDominante, secundarias: emocionesSecundarias } = detectarEmocion(textos)
    const { tipo: tipoEvidenciaDominante, fuentes: fuentesCitadas } = detectarEvidencia(textos)
    const fuerza = articles.length

    const sentimientoMedio = +(articles.reduce((s, a) => s + a.sentiment_score, 0) / articles.length).toFixed(2)
    const polarizacion = +calcularPolarizacion(articles).toFixed(2)
    const crescendo = calcularCrescendo(articles)
    const tono: 'positivo' | 'negativo' | 'neutral' | 'polarizado' =
      polarizacion > 0.4 ? 'polarizado' :
      sentimientoMedio > 0.15 ? 'positivo' :
      sentimientoMedio < -0.15 ? 'negativo' : 'neutral'

    // Días activa
    const fechas = articles.map(a => a.pub_date_iso).filter(Boolean).map(f => new Date(f!).getTime())
    const diasActiva = fechas.length > 0 ? Math.ceil((Math.max(...fechas) - Math.min(...fechas)) / 86400000) + 1 : 1

    // Medios cubriendo
    const mediosSet = new Set(articles.map(a => a.medio.nombre))
    const mediosCubriendo = Array.from(mediosSet).slice(0, 10)

    // Ejemplos
    const ejemplos = articles.slice(0, 3).map(a => ({
      titulo: a.title, medio: a.medio.nombre, url: a.link, fecha: a.pub_date_iso,
    }))

    return {
      id: `narr-v2-${idx + 1}`,
      tema: tema.tema,
      subtemas: tema.subtemas,
      actores,
      frameDominante, framesSecundarios,
      emocionDominante, emocionesSecundarias,
      tipoEvidenciaDominante, fuentesCitadas,
      fuerza, diasActiva, crescendo, polarizacion,
      sentimientoMedio, tono,
      color: tema.color,
      ejemplos, mediosCubriendo,
    }
  })
}
