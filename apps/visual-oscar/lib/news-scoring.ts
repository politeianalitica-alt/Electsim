// Heurística de importancia de noticias.
//
// Score 0-100 = combinación ponderada de:
//   1. Peso del medio  (audiencia × credibilidad)             40%
//   2. Recencia        (decay exponencial · vida media 12 h)  25%
//   3. Política        (keywords políticas en titular)        20%
//   4. Crisis/urgencia (señales tipo "última hora", "crisis") 10%
//   5. Cluster         (misma noticia en múltiples medios)    5 %

import type { RSSItem } from './rss'

export interface MedioMeta {
  id: string
  nombre: string
  audiencia_M: number
  credibilidad: number
  ideologia: number
  tipo: string
  ambito: string
  ccaa: string | null
}

export interface ScoredArticle {
  medio_id: string
  medio_nombre: string
  medio_tipo: string
  medio_ambito: string
  medio_ccaa: string | null
  ideologia: number
  title: string
  link: string
  pub_date: string | null   // ISO
  description: string
  importance: number        // 0-100
  // Componentes del score (transparente, debuggeable)
  components: {
    source: number
    recency: number
    politics: number
    crisis: number
    cluster: number
  }
  // Tags detectados (para badges en la UI)
  tags: string[]
}

// Keywords políticos · partidos, instituciones, líderes, temas calientes
const POLITICS_KEYWORDS = [
  // Partidos
  'pp', 'psoe', 'vox', 'sumar', 'podemos', 'erc', 'junts', 'pnv', 'bildu', 'cs', 'bng', 'cc',
  // Líderes
  'sánchez', 'sanchez', 'feijóo', 'feijoo', 'ayuso', 'abascal', 'yolanda díaz', 'yolanda diaz',
  'puigdemont', 'aragonès', 'aragones', 'urkullu', 'pradales', 'page', 'moreno bonilla',
  'almeida', 'colau', 'ortuzar', 'rufián', 'rufian', 'belarra', 'iglesias', 'errejón',
  // Instituciones
  'congreso', 'senado', 'moncloa', 'gobierno', 'oposición', 'oposicion',
  'tribunal supremo', 'constitucional', 'audiencia nacional', 'fiscalía', 'fiscalia',
  'cgpj', 'rey', 'casa real', 'monarquía', 'monarquia',
  // Temas
  'amnistía', 'amnistia', 'investidura', 'moción', 'mocion', 'censura', 'cuestión de confianza',
  'presupuestos', 'pgegov', 'decreto-ley', 'decreto ley', 'reforma constitucional',
  'cataluña', 'cataluna', 'catalunya', 'país vasco', 'pais vasco', 'galicia', 'andalucía',
  'inmigración', 'inmigracion', 'sahara', 'gibraltar',
  // Económico-político
  'prima de riesgo', 'bono español', 'bono espanol', 'banco de españa', 'airef',
  'ibex', 'cnmv', 'cnmc', 'oligopolio',
  // Procesos y casos
  'caso koldo', 'caso ábalos', 'caso abalos', 'caso bárcenas', 'gürtel', 'guertel',
  'lava jato', 'tito berni', 'lawfare', 'imputación', 'imputacion',
]

const CRISIS_KEYWORDS = [
  'última hora', 'ultima hora', 'urgente', 'breaking', 'alerta',
  'crisis', 'colapso', 'dimite', 'dimisión', 'dimision', 'detenido',
  'imputado', 'investigado', 'condenado', 'absuelto',
  'evacuado', 'emergencia', 'catástrofe', 'catastrofe',
  'muere', 'fallece', 'muerto', 'asesinado',
  'huelga general', 'paro general', 'manifestación masiva',
  'récord histórico', 'record historico', 'mínimo histórico', 'minimo historico',
]

function countMatches(text: string, keywords: string[]): { count: number; matched: string[] } {
  const lower = text.toLowerCase()
  const matched: string[] = []
  for (const kw of keywords) {
    if (lower.includes(kw)) matched.push(kw)
  }
  return { count: matched.length, matched }
}

/** Peso del medio: log(audiencia) ponderado por credibilidad. Normalizado a 0-1. */
function sourceWeight(m: MedioMeta): number {
  // log10(audiencia + 1) máx ~1.25 para audiencia=16M
  // credibilidad 0-1
  const aud = Math.log10(Math.max(0, m.audiencia_M) + 1) // 0..~1.25
  const cred = Math.max(0, Math.min(1, m.credibilidad))   // 0..1
  // Normalizamos a 0-1: dividimos entre 1.25 (max teórico de audiencia esperable)
  return Math.min(1, (aud / 1.25) * cred)
}

/** Recencia: 1 si publicado ahora, decay exponencial con vida media de 12h. 0 si > 7 días. */
function recencyBoost(pubDate: Date | null): number {
  if (!pubDate) return 0.3 // sin fecha → asumimos relativamente reciente
  const ageHours = (Date.now() - pubDate.getTime()) / 3_600_000
  if (ageHours < 0) return 1 // futuro (timezone weirdness)
  if (ageHours > 168) return 0 // > 7 días = sin valor noticia
  // Vida media 12h: f(0)=1, f(12)=0.5, f(24)=0.25, f(48)=0.063
  return Math.pow(0.5, ageHours / 12)
}

/** Política: 0-1 según count de keywords (saturación a 5+ matches = 1.0) */
function politicsBoost(text: string): { score: number; matched: string[] } {
  const { count, matched } = countMatches(text, POLITICS_KEYWORDS)
  return { score: Math.min(1, count / 5), matched: matched.slice(0, 5) }
}

/** Crisis: 0-1 si hay keywords de urgencia */
function crisisBoost(text: string): { score: number; matched: string[] } {
  const { count, matched } = countMatches(text, CRISIS_KEYWORDS)
  return { score: count > 0 ? 1 : 0, matched }
}

/** Cluster: detecta titulares similares (mismo tema en varios medios) */
function detectClusters(items: { title: string }[]): Map<number, number> {
  const clusters = new Map<number, number>() // index → cluster size
  // Tokenizamos a las 5 palabras significativas del titular (sin stopwords cortas)
  const tokens = items.map(it =>
    new Set(
      it.title.toLowerCase()
        .replace(/[^a-záéíóúñü\s]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 8)
    )
  )
  // Para cada par, compute Jaccard. Si > 0.4 → mismo cluster.
  for (let i = 0; i < items.length; i++) {
    let related = 1
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue
      const a = tokens[i], b = tokens[j]
      if (a.size === 0 || b.size === 0) continue
      let intersect = 0
      a.forEach(w => { if (b.has(w)) intersect++ })
      // Unión: tamaño del conjunto combinado sin spread (compatible target ES5)
      let union = a.size
      b.forEach(w => { if (!a.has(w)) union++ })
      const jaccard = intersect / union
      if (jaccard > 0.4) related++
    }
    clusters.set(i, related)
  }
  return clusters
}

export function scoreArticles(
  articles: { item: RSSItem; medio: MedioMeta }[],
): ScoredArticle[] {
  // Detectar clusters para cross-source boost
  const clusterSizes = detectClusters(articles.map(a => ({ title: a.item.title })))

  return articles.map((a, i) => {
    const text = `${a.item.title} ${a.item.description}`
    const src = sourceWeight(a.medio)
    const rec = recencyBoost(a.item.pubDate)
    const pol = politicsBoost(text)
    const cri = crisisBoost(text)
    const clusterSize = clusterSizes.get(i) || 1
    // Cluster boost: 0 si solo en 1 medio, 1 si está en 4+ medios
    const cluster = Math.min(1, (clusterSize - 1) / 3)

    // Composición ponderada · 0-100
    const importance = Math.round(
      (src * 0.40 + rec * 0.25 + pol.score * 0.20 + cri.score * 0.10 + cluster * 0.05) * 100
    )

    const tags: string[] = []
    if (cri.score > 0) tags.push('🚨 ÚLTIMA HORA')
    if (clusterSize >= 4) tags.push(`📢 ${clusterSize} medios`)
    if (pol.score >= 0.6) tags.push('🏛 POLÍTICA')
    if (rec >= 0.7) tags.push('🕐 RECIENTE')
    if (a.medio.credibilidad >= 0.85) tags.push('✓ FIABLE')

    return {
      medio_id: a.medio.id,
      medio_nombre: a.medio.nombre,
      medio_tipo: a.medio.tipo,
      medio_ambito: a.medio.ambito,
      medio_ccaa: a.medio.ccaa,
      ideologia: a.medio.ideologia,
      title: a.item.title,
      link: a.item.link,
      pub_date: a.item.pubDate ? a.item.pubDate.toISOString() : null,
      description: a.item.description,
      importance,
      components: {
        source: Math.round(src * 100),
        recency: Math.round(rec * 100),
        politics: Math.round(pol.score * 100),
        crisis: Math.round(cri.score * 100),
        cluster: Math.round(cluster * 100),
      },
      tags,
    }
  })
}
