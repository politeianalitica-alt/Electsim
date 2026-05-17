/**
 * news-intel.ts — Capa de inteligencia derivada del feed RSS agregado.
 *
 * Construye análisis estructurados sobre el output de news-aggregator:
 *   - Feed multi-tier (Nacional · Europeo · Regional · Local)
 *   - Narrativas profundas (audiencia, canales, mensajes, objetivos)
 *   - Sentiment topic × party (heatmap)
 *   - Sentiment por figura pública
 *   - Story clustering (cobertura comparada)
 *   - Drill por CCAA/provincia
 *
 * Todo es síncrono sobre el array de AggregatedArticle.
 */

import {
  type AggregatedArticle, type CatalogMedio,
  CCAA_LABEL, topTopics, topPersons,
} from './news-aggregator'

// ── Tipos ───────────────────────────────────────────────────────────────────

export type Tier = 'nacional' | 'europeo' | 'regional' | 'local'

export interface TieredArticle extends AggregatedArticle {
  tier: Tier
}

export interface NarrativeAnatomy {
  id:                string
  topic:             string                  // tema principal: "Amnistía", "Vivienda"
  headline:          string                  // titular sintético
  summary:           string                  // 2-3 frases
  articles:          AggregatedArticle[]     // muestra
  // Anatomía completa
  audience:          { label: string; share: number }[]   // demografía/político
  channels:          { channel: string; weight: number }[] // TV/Radio/Digital/Prensa
  topMessages:       { message: string; supporting: number }[]
  goals:             string[]                // qué busca esta narrativa
  benefitsActor:     { actor: string; reason: string }[]
  harmsActor:        { actor: string; reason: string }[]
  emotionalRegister: 'indignación' | 'miedo' | 'esperanza' | 'rabia' | 'ironía' | 'neutro'
  diffusionVelocity: number                  // 0..100, ritmo de mención
  // Métricas
  totalMentions:     number
  polarity:          number                  // -1..+1
  reach:             number                  // suma audiencia M de los medios cubriendo
  ideologyBias:      number                  // -100..+100, eje político medio
  topMedios:         { id: string; nombre: string; n: number; ideologia: number }[]
  ccaas:             { ccaa: string; n: number }[]
}

export interface TopicPartyCell {
  topic:  string
  party:  string
  n:      number
  pos:    number
  neg:    number
  neu:    number
  score:  number                             // -1..+1
}

export interface FigureSentimentDeep {
  id:           string
  label:        string
  mentions:     number
  pos:          number
  neg:          number
  neu:          number
  polarity:     number                       // -1..+1
  trend24h:     number                       // diff de polarity vs 24h previas (estimado)
  topTopics:    string[]
  whoMentions:  { medio: string; n: number; ideology: number }[]
  recentTitles: { title: string; sentiment: number; link: string; medio: string }[]
}

export interface StoryCluster {
  id:               string
  topic:            string
  representativeTitle: string
  articles:         { medio: CatalogMedio; title: string; link: string; sentiment_score: number }[]
  framings:         { left: string[]; center: string[]; right: string[] }
  ideologySpread:   number                   // |max - min| de ideologia
  firstSeen:        string | null
  lastSeen:         string | null
}

export interface CCAADetail {
  ccaa:         string
  total:        number
  polarity:     number
  topTopics:    { topic: string; n: number }[]
  topNews:      { title: string; medio: string; link: string; sentiment: number; date: string | null }[]
  topMedios:    { id: string; nombre: string; n: number }[]
}

// ── Tier classification ────────────────────────────────────────────────────

const EU_HINTS = ['euractiv','euobserver','politico.eu','euronews','bbc.com','reuters.com','ft.com','dw.com','lemonde','spiegel','tagesschau','elpais.com/internacional']
const LOCAL_KEYWORDS = ['ayuntamiento','alcalde','pleno municipal','diputación','comarca','barrio','distrito','localidad','vecinos']

export function classifyTier(a: AggregatedArticle): Tier {
  // 1. Por ámbito explícito del medio
  if (a.medio.ambito === 'Internacional' || a.medio.ambito === 'UE') return 'europeo'
  if (a.medio.ambito === 'Nacional')      return 'nacional'

  // 2. URL EU
  if (EU_HINTS.some(h => a.link.toLowerCase().includes(h))) return 'europeo'

  // 3. Si el medio tiene ccaa y el título alude a algo local
  const text = `${a.title} ${a.description}`.toLowerCase()
  if (a.medio.ccaa && LOCAL_KEYWORDS.some(k => text.includes(k))) return 'local'

  // 4. Si tiene CCAA pero no es local explícito, es regional
  if (a.medio.ccaa) return 'regional'

  return 'nacional'
}

export interface TieredFeed {
  tiers: Record<Tier, TieredArticle[]>
  counts: Record<Tier, number>
  total: number
}

export function tieredFeed(articles: AggregatedArticle[], perTier = 30): TieredFeed {
  const buckets: Record<Tier, TieredArticle[]> = { nacional: [], europeo: [], regional: [], local: [] }
  for (const a of articles) {
    const t = classifyTier(a)
    buckets[t].push({ ...a, tier: t })
  }
  // Sort by recency * relevance
  const score = (a: AggregatedArticle) => {
    const recency = a.pubDate ? Math.max(0, 1 - (Date.now() - a.pubDate.getTime()) / (72 * 3600_000)) : 0
    const sentMagnitude = Math.abs(a.sentiment_score)
    const reach = Math.log1p(a.medio.audiencia_M)
    return recency * 2 + sentMagnitude + reach * 0.5
  }
  for (const t of Object.keys(buckets) as Tier[]) {
    buckets[t].sort((a, b) => score(b) - score(a))
    buckets[t] = buckets[t].slice(0, perTier)
  }
  return {
    tiers: buckets,
    counts: {
      nacional: buckets.nacional.length,
      europeo:  buckets.europeo.length,
      regional: buckets.regional.length,
      local:    buckets.local.length,
    },
    total: articles.length,
  }
}

// ── Topic detection (más rico que topTopics) ───────────────────────────────

const NARRATIVE_TOPICS: Array<{ id: string; label: string; keywords: string[]; goals: string[]; emotion: NarrativeAnatomy['emotionalRegister'] }> = [
  {
    id: 'amnistia', label: 'Amnistía',
    keywords: ['amnistía','amnistia','ley amnistía','indulto procés'],
    goals: ['Polarizar voto territorial', 'Cuestionar la legalidad del Gobierno', 'Mantener al independentismo en agenda'],
    emotion: 'indignación',
  },
  {
    id: 'vivienda', label: 'Vivienda · alquiler',
    keywords: ['vivienda','alquiler','desahucio','zona tensionada','okupación','okupacion','sareb'],
    goals: ['Movilizar voto joven urbano', 'Disputar el marco del derecho a la vivienda', 'Diferenciar a la izquierda'],
    emotion: 'rabia',
  },
  {
    id: 'pgce', label: 'Presupuestos · PGE',
    keywords: ['pge','presupuestos generales','techo de gasto','déficit','deficit','prórroga presupuestaria'],
    goals: ['Mostrar bloqueo institucional', 'Negociar concesiones territoriales', 'Forzar adelanto electoral'],
    emotion: 'miedo',
  },
  {
    id: 'mocion-censura', label: 'Moción de censura',
    keywords: ['moción de censura','mocion de censura','candidato alternativo','reprobación','reprobacion'],
    goals: ['Erosionar al Gobierno', 'Forzar pronunciamiento de socios', 'Generar narrativa de fin de ciclo'],
    emotion: 'rabia',
  },
  {
    id: 'cgpj-justicia', label: 'CGPJ y justicia',
    keywords: ['cgpj','tribunal constitucional','tribunal supremo','fiscalía general','fiscalia general','jueces','magistrados','lawfare'],
    goals: ['Disputar control de la judicatura', 'Cuestionar separación de poderes', 'Presionar al ejecutivo'],
    emotion: 'indignación',
  },
  {
    id: 'inmigracion', label: 'Inmigración · fronteras',
    keywords: ['inmigración','inmigracion','migrantes','frontera','ceuta','melilla','canarias migración','menas','sin papeles'],
    goals: ['Movilizar voto identitario', 'Erosionar consenso PSOE-derecha', 'Encuadrar problema como crisis'],
    emotion: 'miedo',
  },
  {
    id: 'energia-precios', label: 'Energía y precios',
    keywords: ['precio luz','factura luz','gas','renovables','nuclear','transición ecológica','transicion ecologica','combustibles'],
    goals: ['Asociar Gobierno a coste de vida', 'Disputar transición ecológica', 'Defender intereses sectoriales'],
    emotion: 'rabia',
  },
  {
    id: 'sanidad', label: 'Sanidad pública',
    keywords: ['sanidad','hospital','urgencias','lista de espera','atención primaria','atencion primaria','sanitario'],
    goals: ['Atribuir colapso a CCAA contrarias', 'Defender modelo público vs privado', 'Movilizar voto trabajador'],
    emotion: 'indignación',
  },
  {
    id: 'gaza-israel', label: 'Gaza · Israel',
    keywords: ['gaza','israel','palestina','hamás','hamas','rafah','tel aviv','sionismo'],
    goals: ['Marcar posición moral', 'Polarizar interno PSOE-Sumar', 'Disputar relato internacional'],
    emotion: 'indignación',
  },
  {
    id: 'ucrania', label: 'Ucrania · OTAN',
    keywords: ['ucrania','kiev','zelenski','otan','rusia','putin','sanciones rusia','gasto militar'],
    goals: ['Justificar gasto en defensa', 'Mantener alineamiento atlantista', 'Marcar disenso interno'],
    emotion: 'miedo',
  },
  {
    id: 'aranceles-eeuu', label: 'Aranceles EE.UU.',
    keywords: ['aranceles','trump','aceite','vino','exportaciones','wto','omc'],
    goals: ['Presionar a Bruselas', 'Defender intereses sectoriales', 'Cuestionar dependencia atlantista'],
    emotion: 'miedo',
  },
  {
    id: 'pp-feijoo', label: 'PP · liderazgo',
    keywords: ['feijóo','feijoo','génova','partido popular','dirección popular'],
    goals: ['Consolidar liderazgo', 'Disputar voto de centro', 'Marcar diferencias con Vox'],
    emotion: 'neutro',
  },
  {
    id: 'vox', label: 'Vox · ultraderecha',
    keywords: ['vox','abascal','santiago abascal','patriotas','meloni','le pen'],
    goals: ['Erosionar al PP por la derecha', 'Movilizar voto antisistema', 'Capitalizar agendas culturales'],
    emotion: 'rabia',
  },
]

function detectNarrativeIds(text: string): string[] {
  const lo = text.toLowerCase()
  return NARRATIVE_TOPICS.filter(n => n.keywords.some(k => lo.includes(k))).map(n => n.id)
}

// ── Narrativas profundas ────────────────────────────────────────────────────

const PARTY_KEYWORDS: Record<string, string[]> = {
  PP:    ['feijóo','feijoo','partido popular',' pp ','génova','ayuso'],
  PSOE:  ['sánchez','sanchez','psoe','ferraz','bolaños','bolanos','montero'],
  Vox:   ['abascal','vox ','santiago abascal'],
  Sumar: ['yolanda','sumar','díaz','diaz'],
  Junts: ['junts','puigdemont','turull'],
  ERC:   [' erc ','aragonès','aragones','rufián','rufian'],
  Bildu: ['bildu','otegi'],
  PNV:   [' pnv ','pradales','ortuzar'],
}

function detectParties(text: string): string[] {
  const lo = ` ${text.toLowerCase()} `
  return Object.entries(PARTY_KEYWORDS).filter(([_, kws]) => kws.some(k => lo.includes(k))).map(([p]) => p)
}

function audienceFromArticles(arts: AggregatedArticle[]): { label: string; share: number }[] {
  // Estimamos audiencia a partir de la ideología y tipo medio
  let urbano_progresista = 0
  let urbano_conservador = 0
  let rural_conservador  = 0
  let votante_joven      = 0
  let votante_mayor      = 0

  for (const a of arts) {
    const i = a.medio.ideologia
    const w = a.medio.audiencia_M
    if (i < -20) urbano_progresista += w
    else if (i > 20) {
      if (a.medio.tipo === 'Radio' || a.medio.tipo === 'TV') rural_conservador += w
      else urbano_conservador += w
    }
    if (a.medio.tipo === 'Digital') votante_joven += w
    if (a.medio.tipo === 'Prensa' || a.medio.tipo === 'Radio') votante_mayor += w
  }
  const total = urbano_progresista + urbano_conservador + rural_conservador + votante_joven + votante_mayor + 1
  return [
    { label: 'Urbano progresista', share: +(100 * urbano_progresista / total).toFixed(0) },
    { label: 'Urbano conservador', share: +(100 * urbano_conservador / total).toFixed(0) },
    { label: 'Rural conservador',  share: +(100 * rural_conservador  / total).toFixed(0) },
    { label: 'Votante joven',      share: +(100 * votante_joven      / total).toFixed(0) },
    { label: 'Votante mayor',      share: +(100 * votante_mayor      / total).toFixed(0) },
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
  // Heurística simple: extrae frases capitalizadas frecuentes en los titulares
  const phrases = new Map<string, number>()
  for (const a of arts) {
    const t = a.title.replace(/["«»“”]/g, '').trim()
    // Toma primer fragmento con verbo
    const frag = t.split(/[.,:;]/)[0].trim()
    if (frag.length >= 25 && frag.length <= 110) {
      phrases.set(frag, (phrases.get(frag) || 0) + 1)
    }
  }
  return Array.from(phrases.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, supporting]) => ({ message, supporting }))
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
    if (delta >= 2) benefits.push({ actor, reason: `coverage favorable ${v.pos}↑ vs ${v.neg}↓` })
    if (delta <= -2) harms.push({ actor, reason: `coverage hostil ${v.neg}↓ vs ${v.pos}↑` })
  }
  return { benefits, harms }
}

function diffusionVelocity(arts: AggregatedArticle[]): number {
  if (arts.length === 0) return 0
  const now = Date.now()
  const last24h = arts.filter(a => a.pubDate && (now - a.pubDate.getTime() < 86400_000)).length
  const last72h = arts.length
  // Velocidad = qué fracción de las menciones cae en últimas 24h × ritmo
  const accel = last72h > 0 ? (last24h / last72h) : 0
  return Math.min(100, Math.round(accel * 100 * (1 + Math.log1p(last24h) / 5)))
}

export function narrativesDeep(articles: AggregatedArticle[], minArticles = 3): NarrativeAnatomy[] {
  const buckets = new Map<string, AggregatedArticle[]>()
  for (const a of articles) {
    const text = `${a.title} ${a.description}`
    const ids = detectNarrativeIds(text)
    for (const id of ids) {
      if (!buckets.has(id)) buckets.set(id, [])
      buckets.get(id)!.push(a)
    }
  }

  const out: NarrativeAnatomy[] = []
  for (const [id, arts] of Array.from(buckets.entries())) {
    if (arts.length < minArticles) continue
    const def = NARRATIVE_TOPICS.find(n => n.id === id)!

    const totalSent = arts.reduce((s, a) => s + a.sentiment_score, 0)
    const polarity = arts.length > 0 ? +(totalSent / arts.length).toFixed(2) : 0

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

    const { benefits, harms } = actorEffects(arts)
    const messages = extractMessages(arts)
    const head = messages[0]?.message ?? def.label
    const summary = `${arts.length} menciones en ${topMedios.length} medios. ` +
      `Polaridad media ${polarity > 0 ? '+' : ''}${polarity.toFixed(2)}. ` +
      (benefits.length ? `Beneficia a ${benefits.map(b => b.actor).join(', ')}. ` : '') +
      (harms.length    ? `Perjudica a ${harms.map(h => h.actor).join(', ')}.` : '')

    out.push({
      id, topic: def.label, headline: head, summary,
      articles: arts.slice(0, 8),
      audience:     audienceFromArticles(arts),
      channels:     channelsFromArticles(arts),
      topMessages:  messages,
      goals:        def.goals,
      benefitsActor: benefits,
      harmsActor:   harms,
      emotionalRegister: def.emotion,
      diffusionVelocity: diffusionVelocity(arts),
      totalMentions: arts.length, polarity, reach,
      ideologyBias,
      topMedios, ccaas,
    })
  }
  return out.sort((a, b) => b.totalMentions - a.totalMentions)
}

// ── Topic × Party sentiment heatmap ────────────────────────────────────────

export function topicPartySentiment(articles: AggregatedArticle[]): TopicPartyCell[] {
  const cells: Record<string, { pos: number; neg: number; neu: number; n: number }> = {}
  for (const a of articles) {
    const text = `${a.title} ${a.description}`
    const topicIds = detectNarrativeIds(text)
    const parties  = detectParties(text)
    for (const t of topicIds) {
      for (const p of parties) {
        const k = `${t}__${p}`
        const cur = cells[k] || { pos: 0, neg: 0, neu: 0, n: 0 }
        if (a.sentiment_score >  0.1) cur.pos++
        else if (a.sentiment_score < -0.1) cur.neg++
        else cur.neu++
        cur.n++
        cells[k] = cur
      }
    }
  }
  const out: TopicPartyCell[] = []
  for (const [k, v] of Object.entries(cells)) {
    const [topicId, party] = k.split('__')
    const def = NARRATIVE_TOPICS.find(n => n.id === topicId)
    if (!def) continue
    const score = v.n > 0 ? +((v.pos - v.neg) / v.n).toFixed(2) : 0
    out.push({ topic: def.label, party, n: v.n, pos: v.pos, neg: v.neg, neu: v.neu, score })
  }
  return out.sort((a, b) => b.n - a.n)
}

// ── Figuras públicas con análisis profundo ──────────────────────────────────

export function figuresDeep(articles: AggregatedArticle[], n = 12): FigureSentimentDeep[] {
  const persons = topPersons(articles, n)
  const out: FigureSentimentDeep[] = []
  const now = Date.now()

  for (const p of persons) {
    // Recolectar artículos donde aparece esta persona
    const mine = articles.filter(a => {
      const text = `${a.title} ${a.description}`.toLowerCase()
      const idLower = p.name.replace(/-/g, ' ').toLowerCase()
      return text.includes(idLower) || text.includes(p.label.toLowerCase())
    })

    // Topics asociados
    const topicCounts: Record<string, number> = {}
    for (const a of mine) {
      for (const tid of detectNarrativeIds(`${a.title} ${a.description}`)) {
        topicCounts[tid] = (topicCounts[tid] || 0) + 1
      }
    }
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([id]) => NARRATIVE_TOPICS.find(n => n.id === id)?.label || id)

    // Quién menciona
    const mediosCounts: Record<string, { nombre: string; n: number; ideology: number }> = {}
    for (const a of mine) {
      const cur = mediosCounts[a.medio.id] || { nombre: a.medio.nombre, n: 0, ideology: a.medio.ideologia }
      cur.n++
      mediosCounts[a.medio.id] = cur
    }
    const whoMentions = Object.values(mediosCounts).map(v => ({ medio: v.nombre, n: v.n, ideology: v.ideology }))
      .sort((a, b) => b.n - a.n).slice(0, 6)

    // Trend 24h vs 24-48h
    const recent  = mine.filter(a => a.pubDate && (now - a.pubDate.getTime() <  86400_000))
    const earlier = mine.filter(a => a.pubDate && (now - a.pubDate.getTime() >= 86400_000) && (now - a.pubDate.getTime() < 172800_000))
    const polR = recent.length  ? recent.reduce((s, a) => s + a.sentiment_score, 0) / recent.length  : 0
    const polE = earlier.length ? earlier.reduce((s, a) => s + a.sentiment_score, 0) / earlier.length : 0
    const trend24h = +(polR - polE).toFixed(2)

    // Recent titles
    const recentTitles = mine
      .filter(a => a.pubDate)
      .sort((a, b) => (b.pubDate!.getTime() - a.pubDate!.getTime()))
      .slice(0, 4)
      .map(a => ({ title: a.title, sentiment: a.sentiment_score, link: a.link, medio: a.medio.nombre }))

    out.push({
      id: p.name,
      label: p.label,
      mentions: p.mentions,
      pos: p.pos, neg: p.neg, neu: p.neu,
      polarity: p.sent_polarity,
      trend24h,
      topTopics,
      whoMentions,
      recentTitles,
    })
  }
  return out
}

// ── Story clusters (cobertura comparada del mismo evento) ──────────────────

function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^\wáéíóúñü\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4)
  )
}
function jaccard(a: Set<string>, b: Set<string>): number {
  const A = Array.from(a), B = Array.from(b)
  const setB = new Set(B)
  let inter = 0
  for (const x of A) if (setB.has(x)) inter++
  const union = a.size + b.size - inter
  return union > 0 ? inter / union : 0
}

export function storyCluster(articles: AggregatedArticle[], threshold = 0.32, maxClusters = 10): StoryCluster[] {
  // Cluster por similitud de titular (jaccard). Greedy.
  const pool = articles
    .filter(a => a.title && a.title.length > 20)
    .slice(0, 200)
    .map(a => ({ a, tokens: tokenize(a.title) }))

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
    if (cluster.length >= 3) {
      clusters.push({ rep: pool[i].a, members: cluster })
    }
  }
  clusters.sort((a, b) => b.members.length - a.members.length)
  return clusters.slice(0, maxClusters).map((c, i) => {
    const ideologias = c.members.map(m => m.medio.ideologia)
    const ideologySpread = Math.max(...ideologias) - Math.min(...ideologias)
    const dates = c.members.filter(m => m.pubDate).map(m => m.pubDate!.getTime())
    const firstSeen = dates.length ? new Date(Math.min(...dates)).toISOString() : null
    const lastSeen  = dates.length ? new Date(Math.max(...dates)).toISOString() : null

    // Framings: lo que dicen los medios de cada bloque
    const left   = c.members.filter(m => m.medio.ideologia < -20).slice(0, 3).map(m => m.title)
    const right  = c.members.filter(m => m.medio.ideologia >  20).slice(0, 3).map(m => m.title)
    const center = c.members.filter(m => Math.abs(m.medio.ideologia) <= 20).slice(0, 3).map(m => m.title)

    return {
      id: `sc-${i}-${c.rep.medio.id}`,
      topic: detectNarrativeIds(c.rep.title)[0] || 'otros',
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

// ── CCAA drill detail ─────────────────────────────────────────────────────

export function ccaaDetail(articles: AggregatedArticle[], ccaaLabel: string): CCAADetail {
  const target = Object.entries(CCAA_LABEL).find(([_, label]) => label === ccaaLabel)?.[0]
  const mine = articles.filter(a => {
    if (target && a.medio.ccaa === target) return true
    if (ccaaLabel === 'Madrid' && a.medio.ambito === 'Nacional') return true
    return false
  })
  const total = mine.length
  const polarity = total > 0 ? +(mine.reduce((s, a) => s + a.sentiment_score, 0) / total).toFixed(2) : 0
  const topNews = mine
    .filter(a => a.pubDate)
    .sort((a, b) => Math.abs(b.sentiment_score) - Math.abs(a.sentiment_score) || (b.pubDate!.getTime() - a.pubDate!.getTime()))
    .slice(0, 8)
    .map(a => ({ title: a.title, medio: a.medio.nombre, link: a.link, sentiment: a.sentiment_score, date: a.pub_date_iso }))
  const tops = topTopics(mine, 6)
  const medioMap = new Map<string, { nombre: string; n: number }>()
  for (const a of mine) {
    const cur = medioMap.get(a.medio.id) || { nombre: a.medio.nombre, n: 0 }
    cur.n++
    medioMap.set(a.medio.id, cur)
  }
  const topMedios = Array.from(medioMap.entries())
    .map(([id, v]) => ({ id, nombre: v.nombre, n: v.n }))
    .sort((a, b) => b.n - a.n).slice(0, 6)

  return { ccaa: ccaaLabel, total, polarity, topTopics: tops.map(t => ({ topic: t.topic, n: t.cnt })), topNews, topMedios }
}

// ── Bias coverage gap (qué medios cubren qué) ─────────────────────────────

export interface CoverageGap {
  topic: string
  leftN: number
  centerN: number
  rightN: number
  bias: 'izq' | 'der' | 'equilibrado'
  gap: number   // |leftN - rightN|
}

export function coverageGaps(articles: AggregatedArticle[]): CoverageGap[] {
  const acc: Record<string, { l: number; c: number; r: number }> = {}
  for (const a of articles) {
    const ids = detectNarrativeIds(`${a.title} ${a.description}`)
    const bucket = a.medio.ideologia < -20 ? 'l' : a.medio.ideologia > 20 ? 'r' : 'c'
    for (const id of ids) {
      acc[id] = acc[id] || { l: 0, c: 0, r: 0 }
      acc[id][bucket]++
    }
  }
  return Object.entries(acc).map(([id, v]) => {
    const def = NARRATIVE_TOPICS.find(n => n.id === id)
    const gap = Math.abs(v.l - v.r)
    const bias = v.l > v.r * 1.5 ? 'izq' : v.r > v.l * 1.5 ? 'der' : 'equilibrado'
    return { topic: def?.label || id, leftN: v.l, centerN: v.c, rightN: v.r, bias, gap }
  }).sort((a, b) => b.gap - a.gap)
}

// Re-exports útiles
export { NARRATIVE_TOPICS }
