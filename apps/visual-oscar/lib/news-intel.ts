/**
 * news-intel.ts — Capa de inteligencia DERIVADA del feed RSS.
 *
 * Toda detección es DINÁMICA — no hay narrativas, partidos ni figuras
 * "hardcodeadas". Las taxonomías están separadas en `news-taxonomy.ts`
 * (lista mínima de tokens conocidos para mapear actores y bloques) y los
 * topics emergen de un clustering ligero TF-IDF + Jaccard sobre los
 * titulares reales.
 *
 * Capacidades:
 *   - Feed multi-tier (nacional / europeo / regional / local)
 *   - Topic discovery dinámico (trigrams + clustering)
 *   - Narrativas profundas con anatomía completa derivada del cluster
 *   - Sentimiento por categoría / actor / figura / empresa
 *   - Story clusters (cobertura comparada)
 *   - Drill por CCAA + provincia
 *   - Categorías temáticas detectadas dinámicamente
 *   - Análisis empresarial (sectores, IBEX35, marcas)
 */

import {
  type AggregatedArticle,
  type CatalogMedio,
  CCAA_LABEL,
} from './news-aggregator'
import {
  PARTY_TOKENS,
  KNOWN_FIGURE_TOKENS,
  IBEX_COMPANIES,
  SECTORS,
  CATEGORY_HINTS,
  EMOTION_HINTS,
  GOAL_HINTS,
  CCAA_PROVINCES,
  PROVINCE_TOKENS,
} from './news-taxonomy'

// ── Tipos ───────────────────────────────────────────────────────────────────

export type Tier = 'nacional' | 'europeo' | 'regional' | 'local'

export interface TieredArticle extends AggregatedArticle {
  tier: Tier
  category: string                    // categoría detectada
  parties:   string[]                 // partidos mencionados
  figures:   string[]                 // figuras mencionadas
  companies: string[]                 // empresas mencionadas
  province:  string | null            // provincia detectada en titular
}

export interface NarrativeAnatomy {
  id:                string
  topic:             string
  headline:          string
  summary:           string
  articles:          AggregatedArticle[]
  // Anatomía
  audience:          { label: string; share: number }[]
  channels:          { channel: string; weight: number }[]
  topMessages:       { message: string; supporting: number }[]
  goals:             string[]
  benefitsActor:     { actor: string; reason: string }[]
  harmsActor:        { actor: string; reason: string }[]
  emotionalRegister: string
  diffusionVelocity: number
  // Métricas
  totalMentions:     number
  polarity:          number
  reach:             number
  ideologyBias:      number
  topMedios:         { id: string; nombre: string; n: number; ideologia: number }[]
  ccaas:             { ccaa: string; n: number }[]
  figures:           { name: string; n: number }[]
  companies:         { name: string; n: number }[]
  categories:        string[]
}

export interface TopicPartyCell {
  topic:  string
  party:  string
  n:      number
  pos:    number
  neg:    number
  neu:    number
  score:  number
}

export interface FigureSentimentDeep {
  id:           string
  label:        string
  ccaa:         string | null      // CCAA principal donde aparece
  mentions:     number
  pos:          number
  neg:          number
  neu:          number
  polarity:     number
  trend24h:     number
  topTopics:    string[]
  whoMentions:  { medio: string; n: number; ideology: number }[]
  recentTitles: { title: string; sentiment: number; link: string; medio: string }[]
}

export interface CompanySentiment {
  id:        string
  label:     string
  ticker?:   string
  sector?:   string
  mentions:  number
  pos:       number
  neg:       number
  neu:       number
  polarity:  number
  topics:    string[]
  recent:    { title: string; medio: string; link: string; sentiment: number; date: string | null }[]
}

export interface SectorSentiment {
  sector:    string
  mentions:  number
  polarity:  number
  companies: { name: string; mentions: number; polarity: number }[]
  topNews:   { title: string; medio: string; link: string; sentiment: number }[]
}

export interface StoryCluster {
  id:               string
  topic:            string
  representativeTitle: string
  articles:         { medio: CatalogMedio; title: string; link: string; sentiment_score: number }[]
  framings:         { left: string[]; center: string[]; right: string[] }
  ideologySpread:   number
  firstSeen:        string | null
  lastSeen:         string | null
}

export interface ProvinceStat {
  name:        string
  ccaa:        string
  mentions:    number
  polarity:    number
  topNews:     { title: string; medio: string; link: string; sentiment: number; date: string | null }[]
}

export interface CCAADeepDetail {
  ccaa:        string
  total:       number
  polarity:    number
  categories:  { category: string; n: number; polarity: number }[]
  topTopics:   { topic: string; n: number }[]
  topNews:     { title: string; medio: string; link: string; sentiment: number; date: string | null }[]
  topMedios:   { id: string; nombre: string; n: number }[]
  topFigures:  { name: string; n: number; polarity: number }[]
  topCompanies:{ name: string; n: number; polarity: number }[]
  provinces:   ProvinceStat[]
}

export interface DynamicCategory {
  id:        string
  label:     string
  count:     number
  polarity:  number
}

// ── Tier classification ────────────────────────────────────────────────────

const EU_HINTS = ['euractiv','euobserver','politico.eu','euronews','bbc.com','reuters.com','ft.com','dw.com','lemonde','spiegel','tagesschau']
const LOCAL_KEYWORDS = ['ayuntamiento','alcalde','pleno municipal','diputación','diputacion','comarca','barrio','distrito','vecinos','plenario','concejal']

export function classifyTier(a: AggregatedArticle): Tier {
  if (a.medio.ambito === 'Internacional' || a.medio.ambito === 'UE') return 'europeo'
  if (a.medio.ambito === 'Nacional')      return 'nacional'
  if (EU_HINTS.some(h => a.link.toLowerCase().includes(h))) return 'europeo'
  const text = `${a.title} ${a.description}`.toLowerCase()
  if (a.medio.ccaa && LOCAL_KEYWORDS.some(k => text.includes(k))) return 'local'
  if (a.medio.ccaa) return 'regional'
  return 'nacional'
}

// ── Detección dinámica ─────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'que','para','como','este','esta','estos','estas','ese','esa','esos','esas','con','por','los','las','del','una','uno','sus','sin','sobre',
  'desde','hasta','entre','mientras','aunque','porque','pero','sino','solo','sólo','muy','más','menos','también','ya','aún','aun','ni','ha','han','he','hemos','sea','seré','será','serán','sido','siendo','son','soy','tras','les','nos','vos','vamos','va','van','tan','algo','nada','todo','toda','todas','todos','otro','otra','otros','otras','cada','algunos','algunas','cual','cuales','cuyo','cuya','quien','cuando','donde','aqui','aquí','alli','allí','ahi','ahí','ahora','antes','despues','después','dentro','fuera','aún','según','segun','tras','luego','tanto','tanta','tantos','tantas','poco','pocos','poca','pocas','mucho','muchos','mucha','muchas','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','primer','primera','primeros','primeras','última','últimas','último','últimos','hoy','ayer','mañana','este','dijo','dice','dicen','dijo','dijeron','dijo','tener','tiene','tienen','tuvo','tener','hace','hizo','hacen','sólo','solo','así','asi','si','no','un','el','la','lo','en','de','y','a','o','u','e','al','si','sí','les','le','me','te','se','su','sus','mi','tu','este','esto','esa','ese','vez','años','año','día','días','tras','plus','según',
  'video','foto','directo','última','última hora','hora','últimas','noticia','noticias','en directo','en vivo'
])

const PUNCT_RE = /[¿¡!?,.;:()[\]"'«»“”—–\-…\/]/g

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(PUNCT_RE, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
}

function bigrams(words: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < words.length - 1; i++) out.push(`${words[i]} ${words[i + 1]}`)
  return out
}

function trigrams(words: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < words.length - 2; i++) out.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`)
  return out
}

/**
 * Detección dinámica de tópicos: extrae los bigramas/trigramas más
 * frecuentes (con TF-IDF lite) y los devuelve como "topics emergentes".
 * No hay lista cerrada — los temas emergen del corpus actual.
 */
export interface DynamicTopic {
  id:       string
  label:    string             // el bigrama capitalizado
  count:    number
  polarity: number
  articles: AggregatedArticle[]
}

export function discoverTopics(articles: AggregatedArticle[], minSupport = 3, maxTopics = 20): DynamicTopic[] {
  // DF: en cuántos artículos aparece cada ngrama
  const df = new Map<string, number>()
  // Article ↔ ngrams
  const articleGrams: Array<Set<string>> = []
  for (const a of articles) {
    const words = tokenize(`${a.title} ${a.description}`)
    const grams = new Set([...bigrams(words), ...trigrams(words)])
    articleGrams.push(grams)
    for (const g of Array.from(grams)) df.set(g, (df.get(g) || 0) + 1)
  }

  // Filtramos: aparición ≥ minSupport, no demasiado común (cap 35% del corpus)
  const N = articles.length
  const candidates = Array.from(df.entries())
    .filter(([_, n]) => n >= minSupport && n <= N * 0.35)

  // TF-IDF score: idf log(N/df) × freq
  const scored = candidates.map(([g, n]) => ({
    g, n,
    score: n * Math.log((N + 1) / (n + 1)),
  }))

  // Greedy: ordenamos por score, descartamos los que se solapan demasiado con uno ya elegido
  scored.sort((a, b) => b.score - a.score)
  const picked: { g: string; n: number; words: Set<string> }[] = []
  for (const c of scored) {
    const words = new Set(c.g.split(' '))
    const overlap = picked.some(p => {
      const inter = Array.from(words).filter(w => p.words.has(w)).length
      return inter / Math.min(words.size, p.words.size) > 0.6
    })
    if (overlap) continue
    picked.push({ g: c.g, n: c.n, words })
    if (picked.length >= maxTopics) break
  }

  // Para cada topic seleccionado: artículos que lo contienen + polaridad
  return picked.map((p, idx) => {
    const arts: AggregatedArticle[] = []
    articleGrams.forEach((grams, i) => { if (grams.has(p.g)) arts.push(articles[i]) })
    const polarity = arts.length > 0 ? +(arts.reduce((s, a) => s + a.sentiment_score, 0) / arts.length).toFixed(2) : 0
    const id = `topic-${idx}-${p.g.replace(/\s+/g, '-')}`
    const label = p.g.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    return { id, label, count: p.n, polarity, articles: arts }
  })
}

// ── Detecciones puntuales sobre un texto ───────────────────────────────────

export function detectParties(text: string): string[] {
  const lo = ` ${text.toLowerCase()} `
  return Object.entries(PARTY_TOKENS).filter(([_, kws]) => kws.some(k => lo.includes(` ${k} `) || lo.includes(`${k} `) || lo.includes(` ${k}`))).map(([p]) => p)
}

export function detectFigures(text: string): string[] {
  const lo = ` ${text.toLowerCase()} `
  const out: string[] = []
  for (const [label, tokens] of Object.entries(KNOWN_FIGURE_TOKENS)) {
    if (tokens.some(t => lo.includes(t.toLowerCase()))) out.push(label)
  }
  return out
}

export function detectCompanies(text: string): string[] {
  const lo = ` ${text.toLowerCase()} `
  const out: string[] = []
  for (const c of IBEX_COMPANIES) {
    if (c.tokens.some(t => lo.includes(t.toLowerCase()))) out.push(c.label)
  }
  return out
}

export function detectCategory(text: string): string {
  const lo = text.toLowerCase()
  let best = 'Otros'
  let bestScore = 0
  for (const [cat, kws] of Object.entries(CATEGORY_HINTS)) {
    const score = kws.reduce((s, k) => s + (lo.includes(k) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = cat }
  }
  return best
}

export function detectProvince(text: string, ccaaHint?: string | null): string | null {
  const lo = text.toLowerCase()
  for (const [province, tokens] of Object.entries(PROVINCE_TOKENS)) {
    if (tokens.some(t => lo.includes(t.toLowerCase()))) {
      return province
    }
  }
  return null
}

// ── Tiered Feed (enriquecido) ───────────────────────────────────────────────

export interface TieredFeed {
  tiers: Record<Tier, TieredArticle[]>
  counts: Record<Tier, number>
  total: number
  categories: DynamicCategory[]      // categorías presentes en el feed
}

function enrichArticle(a: AggregatedArticle): TieredArticle {
  const text = `${a.title} ${a.description}`
  return {
    ...a,
    tier:      classifyTier(a),
    category:  detectCategory(text),
    parties:   detectParties(text),
    figures:   detectFigures(text),
    companies: detectCompanies(text),
    province:  detectProvince(text, a.medio.ccaa),
  }
}

export function tieredFeed(articles: AggregatedArticle[], perTier = 25): TieredFeed {
  const enriched = articles.map(enrichArticle)
  const buckets: Record<Tier, TieredArticle[]> = { nacional: [], europeo: [], regional: [], local: [] }
  for (const a of enriched) buckets[a.tier].push(a)

  const score = (a: TieredArticle) => {
    const recency = a.pubDate ? Math.max(0, 1 - (Date.now() - a.pubDate.getTime()) / (72 * 3600_000)) : 0
    return recency * 2 + Math.abs(a.sentiment_score) + Math.log1p(a.medio.audiencia_M) * 0.5
  }
  for (const t of Object.keys(buckets) as Tier[]) {
    buckets[t].sort((a, b) => score(b) - score(a))
    buckets[t] = buckets[t].slice(0, perTier)
  }

  // Categorías presentes
  const catMap = new Map<string, { n: number; sum: number }>()
  for (const a of enriched) {
    const cur = catMap.get(a.category) || { n: 0, sum: 0 }
    cur.n++; cur.sum += a.sentiment_score
    catMap.set(a.category, cur)
  }
  const categories: DynamicCategory[] = Array.from(catMap.entries())
    .map(([id, v]) => ({ id, label: id, count: v.n, polarity: v.n > 0 ? +(v.sum / v.n).toFixed(2) : 0 }))
    .sort((a, b) => b.count - a.count)

  return {
    tiers: buckets,
    counts: {
      nacional: buckets.nacional.length, europeo: buckets.europeo.length,
      regional: buckets.regional.length, local: buckets.local.length,
    },
    total: enriched.length,
    categories,
  }
}

// ── Narrativas profundas (dinámicas) ────────────────────────────────────────

function detectGoals(arts: AggregatedArticle[]): string[] {
  const text = arts.map(a => `${a.title} ${a.description}`).join(' ').toLowerCase()
  const out: string[] = []
  for (const [goal, kws] of Object.entries(GOAL_HINTS)) {
    const score = kws.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0)
    if (score >= 1) out.push(goal)
  }
  if (out.length === 0) out.push('Marcar agenda mediática')
  return out.slice(0, 5)
}

function detectEmotion(arts: AggregatedArticle[]): string {
  const text = arts.map(a => `${a.title} ${a.description}`).join(' ').toLowerCase()
  const scores: Record<string, number> = {}
  for (const [emo, kws] of Object.entries(EMOTION_HINTS)) {
    scores[emo] = kws.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0)
  }
  const polarity = arts.reduce((s, a) => s + a.sentiment_score, 0) / Math.max(1, arts.length)
  if (Object.values(scores).every(v => v === 0)) return polarity < -0.1 ? 'indignación' : polarity > 0.1 ? 'esperanza' : 'neutro'
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}

function audienceFromArticles(arts: AggregatedArticle[]): { label: string; share: number }[] {
  let urb_prog = 0, urb_cons = 0, rur_cons = 0, joven = 0, mayor = 0
  for (const a of arts) {
    const w = Math.max(0.1, a.medio.audiencia_M)
    if (a.medio.ideologia < -20) urb_prog += w
    else if (a.medio.ideologia > 20) {
      if (a.medio.tipo === 'Radio' || a.medio.tipo === 'TV') rur_cons += w
      else urb_cons += w
    }
    if (a.medio.tipo === 'Digital') joven += w
    if (a.medio.tipo === 'Prensa' || a.medio.tipo === 'Radio') mayor += w
  }
  const total = urb_prog + urb_cons + rur_cons + joven + mayor + 0.01
  return [
    { label: 'Urbano progresista', share: +(100 * urb_prog / total).toFixed(0) },
    { label: 'Urbano conservador', share: +(100 * urb_cons / total).toFixed(0) },
    { label: 'Rural conservador',  share: +(100 * rur_cons / total).toFixed(0) },
    { label: 'Votante joven',      share: +(100 * joven    / total).toFixed(0) },
    { label: 'Votante mayor',      share: +(100 * mayor    / total).toFixed(0) },
  ].filter(x => x.share > 5).sort((a, b) => b.share - a.share)
}

function channelsFromArticles(arts: AggregatedArticle[]): { channel: string; weight: number }[] {
  const tot: Record<string, number> = {}
  for (const a of arts) tot[a.medio.tipo] = (tot[a.medio.tipo] || 0) + 1
  const sum = arts.length || 1
  return Object.entries(tot).map(([c, n]) => ({ channel: c, weight: +(100 * n / sum).toFixed(0) }))
    .sort((a, b) => b.weight - a.weight)
}

function extractMessages(arts: AggregatedArticle[]): { message: string; supporting: number }[] {
  const phrases = new Map<string, number>()
  for (const a of arts) {
    const t = a.title.replace(/["«»“”]/g, '').trim()
    const frag = t.split(/[.,:;]/)[0].trim()
    if (frag.length >= 25 && frag.length <= 110) {
      phrases.set(frag, (phrases.get(frag) || 0) + 1)
    }
  }
  const out = Array.from(phrases.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, supporting]) => ({ message, supporting }))
  return out
}

function actorEffects(arts: AggregatedArticle[]):
  { benefits: { actor: string; reason: string }[]; harms: { actor: string; reason: string }[] } {
  const partyImpact: Record<string, { pos: number; neg: number }> = {}
  for (const a of arts) {
    const text = `${a.title} ${a.description}`
    for (const p of detectParties(text)) {
      partyImpact[p] = partyImpact[p] || { pos: 0, neg: 0 }
      if (a.sentiment_score >  0.1) partyImpact[p].pos++
      else if (a.sentiment_score < -0.1) partyImpact[p].neg++
    }
  }
  const benefits: { actor: string; reason: string }[] = []
  const harms:    { actor: string; reason: string }[] = []
  for (const [actor, v] of Object.entries(partyImpact)) {
    const delta = v.pos - v.neg
    if (delta >= 2) benefits.push({ actor, reason: `cobertura favorable ${v.pos}↑ vs ${v.neg}↓` })
    if (delta <= -2) harms.push({ actor, reason: `cobertura hostil ${v.neg}↓ vs ${v.pos}↑` })
  }
  return { benefits, harms }
}

function diffusionVelocity(arts: AggregatedArticle[]): number {
  if (arts.length === 0) return 0
  const now = Date.now()
  const last24h = arts.filter(a => a.pubDate && (now - a.pubDate.getTime() < 86400_000)).length
  const last72h = arts.length
  const accel = last72h > 0 ? (last24h / last72h) : 0
  return Math.min(100, Math.round(accel * 100 * (1 + Math.log1p(last24h) / 5)))
}

/**
 * Genera narrativas profundas a partir de los topics emergentes
 * descubiertos dinámicamente. Cada topic se convierte en una narrativa
 * con anatomía completa.
 */
export function narrativesDeep(articles: AggregatedArticle[], minArticles = 3): NarrativeAnatomy[] {
  const topics = discoverTopics(articles, minArticles, 14)
  const out: NarrativeAnatomy[] = []

  for (const t of topics) {
    const arts = t.articles
    if (arts.length < minArticles) continue

    const reach = +(arts.reduce((s, a) => s + a.medio.audiencia_M, 0)).toFixed(1)
    const ideologyBias = arts.length > 0
      ? Math.round(arts.reduce((s, a) => s + a.medio.ideologia, 0) / arts.length)
      : 0

    const topMediosMap = new Map<string, { nombre: string; n: number; ideologia: number }>()
    for (const a of arts) {
      const cur = topMediosMap.get(a.medio.id) || { nombre: a.medio.nombre, n: 0, ideologia: a.medio.ideologia }
      cur.n++
      topMediosMap.set(a.medio.id, cur)
    }
    const topMedios = Array.from(topMediosMap.entries())
      .map(([id, v]) => ({ id, nombre: v.nombre, n: v.n, ideologia: v.ideologia }))
      .sort((a, b) => b.n - a.n).slice(0, 6)

    const ccaaMap = new Map<string, number>()
    for (const a of arts) {
      if (!a.medio.ccaa) continue
      const lab = CCAA_LABEL[a.medio.ccaa] || a.medio.ccaa
      ccaaMap.set(lab, (ccaaMap.get(lab) || 0) + 1)
    }
    const ccaas = Array.from(ccaaMap.entries()).map(([ccaa, n]) => ({ ccaa, n })).sort((a, b) => b.n - a.n).slice(0, 6)

    const figureMap = new Map<string, number>()
    const companyMap = new Map<string, number>()
    const categorySet = new Set<string>()
    for (const a of arts) {
      const text = `${a.title} ${a.description}`
      for (const f of detectFigures(text)) figureMap.set(f, (figureMap.get(f) || 0) + 1)
      for (const c of detectCompanies(text)) companyMap.set(c, (companyMap.get(c) || 0) + 1)
      categorySet.add(detectCategory(text))
    }
    const figures = Array.from(figureMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, n }))
    const companies = Array.from(companyMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, n }))

    const { benefits, harms } = actorEffects(arts)
    const messages = extractMessages(arts)
    const headline = messages[0]?.message ?? t.label

    const polarity = t.polarity
    const summary = `${arts.length} menciones en ${topMedios.length} medios distintos. ` +
      `Polaridad media ${polarity > 0 ? '+' : ''}${polarity.toFixed(2)}. ` +
      (benefits.length ? `Beneficia a ${benefits.map(b => b.actor).join(', ')}. ` : '') +
      (harms.length    ? `Perjudica a ${harms.map(h => h.actor).join(', ')}.` : '')

    out.push({
      id: t.id,
      topic: t.label,
      headline,
      summary,
      articles: arts.slice(0, 8),
      audience:     audienceFromArticles(arts),
      channels:     channelsFromArticles(arts),
      topMessages:  messages,
      goals:        detectGoals(arts),
      benefitsActor: benefits,
      harmsActor:   harms,
      emotionalRegister: detectEmotion(arts),
      diffusionVelocity: diffusionVelocity(arts),
      totalMentions: arts.length,
      polarity, reach, ideologyBias,
      topMedios, ccaas,
      figures, companies,
      categories: Array.from(categorySet),
    })
  }
  return out.sort((a, b) => b.totalMentions - a.totalMentions)
}

// ── Topic × Party sentiment heatmap ────────────────────────────────────────

export function topicPartySentiment(articles: AggregatedArticle[]): TopicPartyCell[] {
  const topics = discoverTopics(articles, 3, 14)
  const cells: TopicPartyCell[] = []
  for (const t of topics) {
    const byParty: Record<string, { pos: number; neg: number; neu: number; n: number }> = {}
    for (const a of t.articles) {
      const parties = detectParties(`${a.title} ${a.description}`)
      for (const p of parties) {
        const cur = byParty[p] || { pos: 0, neg: 0, neu: 0, n: 0 }
        if (a.sentiment_score >  0.1) cur.pos++
        else if (a.sentiment_score < -0.1) cur.neg++
        else cur.neu++
        cur.n++
        byParty[p] = cur
      }
    }
    for (const [party, v] of Object.entries(byParty)) {
      const score = v.n > 0 ? +((v.pos - v.neg) / v.n).toFixed(2) : 0
      cells.push({ topic: t.label, party, n: v.n, pos: v.pos, neg: v.neg, neu: v.neu, score })
    }
  }
  return cells.sort((a, b) => b.n - a.n)
}

// ── Figures (deep) ─────────────────────────────────────────────────────────

export function figuresDeep(articles: AggregatedArticle[], n = 15): FigureSentimentDeep[] {
  const acc = new Map<string, AggregatedArticle[]>()
  for (const a of articles) {
    const figs = detectFigures(`${a.title} ${a.description}`)
    for (const f of figs) {
      if (!acc.has(f)) acc.set(f, [])
      acc.get(f)!.push(a)
    }
  }
  const out: FigureSentimentDeep[] = []
  const now = Date.now()
  for (const [label, mine] of Array.from(acc.entries())) {
    if (mine.length < 2) continue
    const pos = mine.filter(a => a.sentiment === 'positive').length
    const neg = mine.filter(a => a.sentiment === 'negative').length
    const neu = mine.filter(a => a.sentiment === 'neutral').length
    const polarity = mine.length > 0 ? +(mine.reduce((s, a) => s + a.sentiment_score, 0) / mine.length).toFixed(2) : 0

    // CCAA principal donde aparece
    const ccaaCount: Record<string, number> = {}
    for (const a of mine) {
      if (a.medio.ccaa) {
        const lab = CCAA_LABEL[a.medio.ccaa] || a.medio.ccaa
        ccaaCount[lab] = (ccaaCount[lab] || 0) + 1
      } else if (a.medio.ambito === 'Nacional') {
        ccaaCount['Nacional'] = (ccaaCount['Nacional'] || 0) + 1
      }
    }
    const ccaa = Object.entries(ccaaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    // Topics asociados (dinámicos)
    const topicsLocal = discoverTopics(mine, 1, 4)
    const topTopics = topicsLocal.map(t => t.label)

    // Quién menciona
    const mediosCounts: Record<string, { nombre: string; n: number; ideology: number }> = {}
    for (const a of mine) {
      const cur = mediosCounts[a.medio.id] || { nombre: a.medio.nombre, n: 0, ideology: a.medio.ideologia }
      cur.n++
      mediosCounts[a.medio.id] = cur
    }
    const whoMentions = Object.values(mediosCounts).sort((a, b) => b.n - a.n).slice(0, 6)
      .map(v => ({ medio: v.nombre, n: v.n, ideology: v.ideology }))

    // Trend 24h
    const recent  = mine.filter(a => a.pubDate && (now - a.pubDate.getTime() <  86400_000))
    const earlier = mine.filter(a => a.pubDate && (now - a.pubDate.getTime() >= 86400_000) && (now - a.pubDate.getTime() < 172800_000))
    const polR = recent.length  ? recent.reduce((s, a) => s + a.sentiment_score, 0) / recent.length  : 0
    const polE = earlier.length ? earlier.reduce((s, a) => s + a.sentiment_score, 0) / earlier.length : 0
    const trend24h = +(polR - polE).toFixed(2)

    const recentTitles = mine
      .filter(a => a.pubDate)
      .sort((a, b) => (b.pubDate!.getTime() - a.pubDate!.getTime()))
      .slice(0, 5)
      .map(a => ({ title: a.title, sentiment: a.sentiment_score, link: a.link, medio: a.medio.nombre }))

    out.push({
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label, ccaa,
      mentions: mine.length, pos, neg, neu, polarity, trend24h,
      topTopics, whoMentions, recentTitles,
    })
  }
  return out.sort((a, b) => b.mentions - a.mentions).slice(0, n)
}

// ── Empresas (IBEX35 + sectores) ───────────────────────────────────────────

export function companiesSentiment(articles: AggregatedArticle[]): CompanySentiment[] {
  const acc = new Map<string, AggregatedArticle[]>()
  for (const a of articles) {
    const text = `${a.title} ${a.description}`
    const companies = detectCompanies(text)
    for (const c of companies) {
      if (!acc.has(c)) acc.set(c, [])
      acc.get(c)!.push(a)
    }
  }
  const out: CompanySentiment[] = []
  for (const [label, mine] of Array.from(acc.entries())) {
    const company = IBEX_COMPANIES.find(c => c.label === label)
    const pos = mine.filter(a => a.sentiment === 'positive').length
    const neg = mine.filter(a => a.sentiment === 'negative').length
    const neu = mine.filter(a => a.sentiment === 'neutral').length
    const polarity = mine.length > 0 ? +(mine.reduce((s, a) => s + a.sentiment_score, 0) / mine.length).toFixed(2) : 0
    const topicsLocal = discoverTopics(mine, 1, 4)
    const topics = topicsLocal.map(t => t.label)
    const recent = mine.filter(a => a.pubDate)
      .sort((a, b) => b.pubDate!.getTime() - a.pubDate!.getTime())
      .slice(0, 5)
      .map(a => ({ title: a.title, medio: a.medio.nombre, link: a.link, sentiment: a.sentiment_score, date: a.pub_date_iso }))
    out.push({
      id:      label.toLowerCase().replace(/\s+/g, '-'),
      label,
      ticker:  company?.ticker,
      sector:  company?.sector,
      mentions: mine.length,
      pos, neg, neu, polarity, topics, recent,
    })
  }
  return out.sort((a, b) => b.mentions - a.mentions)
}

export function sectorsSentiment(articles: AggregatedArticle[]): SectorSentiment[] {
  const companies = companiesSentiment(articles)
  const bySector = new Map<string, CompanySentiment[]>()
  for (const c of companies) {
    const sec = c.sector || 'Otros'
    if (!bySector.has(sec)) bySector.set(sec, [])
    bySector.get(sec)!.push(c)
  }
  // Añadir sectores sin empresas IBEX pero con keywords detectadas
  const sectorKeywordMap = new Map<string, AggregatedArticle[]>()
  for (const a of articles) {
    const text = `${a.title} ${a.description}`.toLowerCase()
    for (const [sec, kws] of Object.entries(SECTORS)) {
      if (kws.some(k => text.includes(k))) {
        if (!sectorKeywordMap.has(sec)) sectorKeywordMap.set(sec, [])
        sectorKeywordMap.get(sec)!.push(a)
      }
    }
  }

  const out: SectorSentiment[] = []
  // Combinar
  const allSectors = new Set<string>([...Array.from(bySector.keys()), ...Array.from(sectorKeywordMap.keys())])
  for (const sec of Array.from(allSectors)) {
    const companiesInSec = bySector.get(sec) || []
    const articlesInSec = sectorKeywordMap.get(sec) || []
    const totalMentions = companiesInSec.reduce((s, c) => s + c.mentions, 0) + articlesInSec.length
    if (totalMentions === 0) continue
    const allArts = [
      ...companiesInSec.flatMap(c => c.recent.map(r => ({ title: r.title, medio: r.medio, link: r.link, sentiment: r.sentiment }))),
      ...articlesInSec.map(a => ({ title: a.title, medio: a.medio.nombre, link: a.link, sentiment: a.sentiment_score })),
    ]
    const polarity = allArts.length > 0 ? +(allArts.reduce((s, a) => s + a.sentiment, 0) / allArts.length).toFixed(2) : 0
    const topNews = allArts.sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment)).slice(0, 5)
    out.push({
      sector: sec,
      mentions: totalMentions,
      polarity,
      companies: companiesInSec.map(c => ({ name: c.label, mentions: c.mentions, polarity: c.polarity })),
      topNews,
    })
  }
  return out.sort((a, b) => b.mentions - a.mentions)
}

// ── Story clusters ─────────────────────────────────────────────────────────

function tokenizeBag(s: string): Set<string> {
  return new Set(
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(PUNCT_RE, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w))
  )
}
function jaccard(a: Set<string>, b: Set<string>): number {
  const A = Array.from(a)
  const setB = new Set(Array.from(b))
  let inter = 0
  for (const x of A) if (setB.has(x)) inter++
  const union = a.size + b.size - inter
  return union > 0 ? inter / union : 0
}

export function storyCluster(articles: AggregatedArticle[], threshold = 0.30, maxClusters = 10): StoryCluster[] {
  const pool = articles
    .filter(a => a.title && a.title.length > 20)
    .slice(0, 200)
    .map(a => ({ a, tokens: tokenizeBag(a.title) }))
  const used = new Set<number>()
  const clusters: { rep: AggregatedArticle; members: AggregatedArticle[] }[] = []
  for (let i = 0; i < pool.length; i++) {
    if (used.has(i)) continue
    const cluster: AggregatedArticle[] = [pool[i].a]
    used.add(i)
    for (let j = i + 1; j < pool.length; j++) {
      if (used.has(j)) continue
      if (jaccard(pool[i].tokens, pool[j].tokens) >= threshold) {
        cluster.push(pool[j].a)
        used.add(j)
      }
    }
    if (cluster.length >= 3) clusters.push({ rep: pool[i].a, members: cluster })
  }
  clusters.sort((a, b) => b.members.length - a.members.length)
  return clusters.slice(0, maxClusters).map((c, i) => {
    const ideologias = c.members.map(m => m.medio.ideologia)
    const ideologySpread = Math.max(...ideologias) - Math.min(...ideologias)
    const dates = c.members.filter(m => m.pubDate).map(m => m.pubDate!.getTime())
    const firstSeen = dates.length ? new Date(Math.min(...dates)).toISOString() : null
    const lastSeen  = dates.length ? new Date(Math.max(...dates)).toISOString() : null
    const left   = c.members.filter(m => m.medio.ideologia < -20).slice(0, 3).map(m => m.title)
    const right  = c.members.filter(m => m.medio.ideologia >  20).slice(0, 3).map(m => m.title)
    const center = c.members.filter(m => Math.abs(m.medio.ideologia) <= 20).slice(0, 3).map(m => m.title)
    return {
      id: `sc-${i}-${c.rep.medio.id}`,
      topic: detectCategory(c.rep.title),
      representativeTitle: c.rep.title,
      articles: c.members.slice(0, 12).map(m => ({
        medio: m.medio, title: m.title, link: m.link, sentiment_score: m.sentiment_score,
      })),
      framings: { left, center, right },
      ideologySpread,
      firstSeen, lastSeen,
    }
  })
}

// ── CCAA Deep Detail (con figuras + empresas + provincias) ─────────────────

export function ccaaDeep(articles: AggregatedArticle[], ccaaLabel: string): CCAADeepDetail {
  const target = Object.entries(CCAA_LABEL).find(([_, label]) => label === ccaaLabel)?.[0]
  const mine = articles.filter(a => {
    if (target && a.medio.ccaa === target) return true
    if (ccaaLabel === 'Madrid' && a.medio.ambito === 'Nacional') return true
    return false
  })
  const total = mine.length
  const polarity = total > 0 ? +(mine.reduce((s, a) => s + a.sentiment_score, 0) / total).toFixed(2) : 0

  // Categorías
  const catMap = new Map<string, { n: number; sum: number }>()
  for (const a of mine) {
    const cat = detectCategory(`${a.title} ${a.description}`)
    const cur = catMap.get(cat) || { n: 0, sum: 0 }
    cur.n++; cur.sum += a.sentiment_score
    catMap.set(cat, cur)
  }
  const categories = Array.from(catMap.entries()).map(([category, v]) => ({
    category, n: v.n, polarity: v.n > 0 ? +(v.sum / v.n).toFixed(2) : 0,
  })).sort((a, b) => b.n - a.n)

  // Top topics (dinámicos)
  const dynTopics = discoverTopics(mine, 2, 6)
  const topTopics = dynTopics.map(t => ({ topic: t.label, n: t.count }))

  // Top news
  const topNews = mine
    .filter(a => a.pubDate)
    .sort((a, b) => Math.abs(b.sentiment_score) - Math.abs(a.sentiment_score) || (b.pubDate!.getTime() - a.pubDate!.getTime()))
    .slice(0, 8)
    .map(a => ({ title: a.title, medio: a.medio.nombre, link: a.link, sentiment: a.sentiment_score, date: a.pub_date_iso }))

  // Top medios
  const medioMap = new Map<string, { nombre: string; n: number }>()
  for (const a of mine) {
    const cur = medioMap.get(a.medio.id) || { nombre: a.medio.nombre, n: 0 }
    cur.n++
    medioMap.set(a.medio.id, cur)
  }
  const topMedios = Array.from(medioMap.entries()).map(([id, v]) => ({ id, nombre: v.nombre, n: v.n }))
    .sort((a, b) => b.n - a.n).slice(0, 8)

  // Top figures
  const figureMap = new Map<string, { n: number; sum: number }>()
  for (const a of mine) {
    for (const f of detectFigures(`${a.title} ${a.description}`)) {
      const cur = figureMap.get(f) || { n: 0, sum: 0 }
      cur.n++; cur.sum += a.sentiment_score
      figureMap.set(f, cur)
    }
  }
  const topFigures = Array.from(figureMap.entries()).map(([name, v]) => ({
    name, n: v.n, polarity: v.n > 0 ? +(v.sum / v.n).toFixed(2) : 0,
  })).sort((a, b) => b.n - a.n).slice(0, 8)

  // Top companies
  const companyMap = new Map<string, { n: number; sum: number }>()
  for (const a of mine) {
    for (const c of detectCompanies(`${a.title} ${a.description}`)) {
      const cur = companyMap.get(c) || { n: 0, sum: 0 }
      cur.n++; cur.sum += a.sentiment_score
      companyMap.set(c, cur)
    }
  }
  const topCompanies = Array.from(companyMap.entries()).map(([name, v]) => ({
    name, n: v.n, polarity: v.n > 0 ? +(v.sum / v.n).toFixed(2) : 0,
  })).sort((a, b) => b.n - a.n).slice(0, 6)

  // Provincias
  const provinces: ProvinceStat[] = []
  const provList = CCAA_PROVINCES[ccaaLabel] || []
  for (const provName of provList) {
    const provArts = mine.filter(a => {
      const text = `${a.title} ${a.description}`.toLowerCase()
      const tokens = PROVINCE_TOKENS[provName] || [provName.toLowerCase()]
      return tokens.some(t => text.includes(t.toLowerCase()))
    })
    if (provArts.length === 0) continue
    const provPol = +(provArts.reduce((s, a) => s + a.sentiment_score, 0) / provArts.length).toFixed(2)
    const provTopNews = provArts.filter(a => a.pubDate)
      .sort((a, b) => Math.abs(b.sentiment_score) - Math.abs(a.sentiment_score))
      .slice(0, 4)
      .map(a => ({ title: a.title, medio: a.medio.nombre, link: a.link, sentiment: a.sentiment_score, date: a.pub_date_iso }))
    provinces.push({ name: provName, ccaa: ccaaLabel, mentions: provArts.length, polarity: provPol, topNews: provTopNews })
  }
  provinces.sort((a, b) => b.mentions - a.mentions)

  return {
    ccaa: ccaaLabel, total, polarity, categories, topTopics, topNews, topMedios,
    topFigures, topCompanies, provinces,
  }
}

// ── Coverage gaps (sesgo ideológico por tema) ──────────────────────────────

export interface CoverageGap {
  topic: string
  leftN: number
  centerN: number
  rightN: number
  bias: 'izq' | 'der' | 'equilibrado'
  gap: number
}

export function coverageGaps(articles: AggregatedArticle[]): CoverageGap[] {
  const topics = discoverTopics(articles, 3, 12)
  const out: CoverageGap[] = []
  for (const t of topics) {
    let l = 0, c = 0, r = 0
    for (const a of t.articles) {
      if (a.medio.ideologia < -20) l++
      else if (a.medio.ideologia > 20) r++
      else c++
    }
    const gap = Math.abs(l - r)
    const bias = l > r * 1.5 ? 'izq' : r > l * 1.5 ? 'der' : 'equilibrado'
    out.push({ topic: t.label, leftN: l, centerN: c, rightN: r, bias, gap })
  }
  return out.sort((a, b) => b.gap - a.gap)
}
