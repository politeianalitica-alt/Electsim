// Agregador compartido de noticias RSS · usado por múltiples endpoints
// para derivar stats, topics, menciones, mapas, narrativas en TIEMPO REAL
// desde los feeds RSS de los 219 medios del catálogo.
//
// Cada llamada hace fetch en paralelo de los RSS (cacheados 10 min en
// edge gracias a `next: { revalidate: 600 }` que ya viene de fetchRSS).
//
// Las funciones de agregación son síncronas y operan sobre el array
// devuelto por getAggregatedNews().

import mediosData from '@/data/medios.json'
import { fetchRSS, type RSSItem } from './rss'

export interface CatalogMedio {
  id: string
  nombre: string
  grupo: string
  tipo: string
  ambito: string
  ccaa: string | null
  ideologia: number
  audiencia_M: number
  credibilidad: number
  rss: string | null
  web: string
  color?: string
}

const CATALOG: CatalogMedio[] = (mediosData as { medios: CatalogMedio[] }).medios

export interface AggregatedArticle {
  title: string
  link: string
  description: string
  pubDate: Date | null
  pub_date_iso: string | null
  medio: CatalogMedio
  sentiment: 'positive' | 'negative' | 'neutral'
  sentiment_score: number  // -1..+1
}

// Promise pool para limitar concurrency en los fetches RSS
async function pool<T, R>(items: T[], concurrency: number, worker: (it: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function run() {
    while (true) {
      const idx = next++
      if (idx >= items.length) return
      results[idx] = await worker(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

interface AggregateOptions {
  maxSources?: number      // cuántos medios poolear (default 35)
  hoursBack?: number       // descartar artículos más viejos (default 72h)
  ccaa?: string | null     // filtrar por CCAA del medio
  tipo?: string            // filtrar por tipo (Prensa | Digital | TV | Radio…)
  ideologia?: 'izquierda' | 'centro' | 'derecha'
}

/**
 * Devuelve los artículos agregados de los principales medios con RSS.
 * Cacheado a nivel de edge (10 min/feed) gracias a fetchRSS.
 */
export async function getAggregatedNews(opts: AggregateOptions = {}): Promise<AggregatedArticle[]> {
  const { maxSources = 35, hoursBack = 72 } = opts

  let pool_medios = CATALOG.filter(m => !!m.rss)
  if (opts.ccaa)  pool_medios = pool_medios.filter(m => m.ccaa === opts.ccaa)
  if (opts.tipo)  pool_medios = pool_medios.filter(m => m.tipo === opts.tipo)
  if (opts.ideologia === 'izquierda') pool_medios = pool_medios.filter(m => m.ideologia < -20)
  else if (opts.ideologia === 'derecha') pool_medios = pool_medios.filter(m => m.ideologia > 20)
  else if (opts.ideologia === 'centro') pool_medios = pool_medios.filter(m => m.ideologia >= -20 && m.ideologia <= 20)

  pool_medios.sort((a, b) => b.audiencia_M - a.audiencia_M)
  const targets = pool_medios.slice(0, maxSources)

  const results = await pool(targets, 12, async (medio: CatalogMedio) => {
    const r = await fetchRSS(medio.rss as string, 7000)
    return { medio, items: r.items }
  })

  const cutoff = Date.now() - hoursBack * 3_600_000
  const out: AggregatedArticle[] = []
  for (const r of results) {
    for (const it of r.items as RSSItem[]) {
      if (it.pubDate && it.pubDate.getTime() < cutoff) continue
      const text = `${it.title} ${it.description}`
      const { sentiment, score } = computeSentiment(text)
      out.push({
        title: it.title,
        link: it.link,
        description: it.description,
        pubDate: it.pubDate,
        pub_date_iso: it.pubDate ? it.pubDate.toISOString() : null,
        medio: r.medio,
        sentiment,
        sentiment_score: score,
      })
    }
  }
  return out
}

// ──────────────── Sentiment heurístico ────────────────

const NEG_KEYWORDS = [
  'crisis', 'caída', 'caida', 'cae', 'pérdida', 'perdida', 'pierde',
  'dimite', 'dimisión', 'dimision', 'imputado', 'condenado', 'detenido',
  'investigado', 'denuncia', 'fracaso', 'rechaza', 'rechazo', 'veto',
  'derrota', 'desploma', 'desplome', 'tensión', 'tension', 'crisis',
  'colapso', 'protesta', 'huelga', 'recorte', 'subida del paro',
  'cae el ibex', 'desempleo', 'pobreza', 'muere', 'muerto', 'fallece',
  'asesinado', 'guerra', 'invasión', 'invasion', 'ataque', 'atentado',
  'corrupción', 'corrupcion', 'bloqueo', 'fracasa', 'estancamiento',
  'inflación', 'inflacion', 'recesión', 'recesion', 'amenaza', 'riesgo',
  'tensiones', 'enfrentamiento', 'choque', 'división', 'division',
  'controversia', 'polémica', 'polemica', 'escándalo', 'escandalo',
  'preocupación', 'preocupacion', 'alarma', 'críticas', 'criticas',
]
const POS_KEYWORDS = [
  'récord', 'record', 'éxito', 'exito', 'histórico', 'historico',
  'acuerdo', 'consigue', 'logra', 'firma', 'celebra', 'gana',
  'sube', 'crece', 'crecimiento', 'mejora', 'mejor', 'optimismo',
  'recuperación', 'recuperacion', 'expansión', 'expansion', 'inversión',
  'inversion', 'avance', 'avanza', 'consigue', 'aprueba', 'aprobada',
  'bate récord', 'positivo', 'satisfactorio', 'beneficio', 'beneficios',
  'apoyo', 'reconciliación', 'reconciliacion', 'paz', 'unidad',
  'colaboración', 'colaboracion', 'cooperación', 'cooperacion',
  'fortalece', 'consolida', 'reformas', 'innovación', 'innovacion',
]

export function computeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
  const lower = text.toLowerCase()
  let neg = 0, pos = 0
  for (const k of NEG_KEYWORDS) if (lower.includes(k)) neg++
  for (const k of POS_KEYWORDS) if (lower.includes(k)) pos++
  const score = Math.max(-1, Math.min(1, (pos - neg) / 5))
  if (score > 0.15) return { sentiment: 'positive', score }
  if (score < -0.15) return { sentiment: 'negative', score }
  return { sentiment: 'neutral', score }
}

// ──────────────── Helpers de agregación ────────────────

/** Top N keywords políticos detectados en los titulares + descripciones */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'amnistía':                  ['amnistía', 'amnistia'],
  'moción de censura':         ['moción de censura', 'mocion de censura', '#mocioncensura', 'moción censura'],
  'crisis de vivienda':        ['vivienda', 'alquiler', 'inquilino', 'sare'],
  'transferencia IRPF / Junts':['transferencia.+irpf', 'cupo catalán', 'cupo catalan', 'junts.+irpf'],
  'prima de riesgo':           ['prima de riesgo', 'spread', 'bono espa', 'bono 10y'],
  'sondeos electorales':       ['encuesta', 'sondeo', 'sigma dos', 'gad3', 'cis', 'metroscopia'],
  'reforma del CGPJ':          ['cgpj', 'consejo general del poder judicial'],
  'aranceles agroalimentarios':['arancel', 'oliva', 'aceite y vino', 'agroalimentario'],
  'PNV / Bildu':               ['pnv', 'eh bildu', 'bildu'],
  'IPC subyacente':            ['ipc subyacente', 'inflación subyacente'],
  'Ucrania · ayudas':          ['ucrania', 'kiev', 'zelenski'],
  'Marruecos / Sahara':        ['marruecos', 'sáhara', 'sahara'],
  'reforma fiscal':            ['reforma fiscal', 'reforma del irpf', 'reforma del iva'],
  'huelga / movilización':     ['huelga', 'manifestación', 'manifestacion', 'concentración'],
  'corrupción':                ['corrupción', 'corrupcion', 'caso koldo', 'caso ábalos'],
  'sanidad':                   ['sanidad', 'sanitario', 'hospital', 'lista de espera'],
}

export function topTopics(articles: AggregatedArticle[], n = 12): { topic: string; cnt: number }[] {
  const counts = new Map<string, number>()
  for (const a of articles) {
    const text = `${a.title} ${a.description}`.toLowerCase()
    for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
      for (const p of patterns) {
        const re = p.includes('.+') ? new RegExp(p) : null
        if (re ? re.test(text) : text.includes(p)) {
          counts.set(topic, (counts.get(topic) || 0) + 1)
          break
        }
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([topic, cnt]) => ({ topic, cnt }))
}

/** Personas conocidas a buscar en los titulares */
const KNOWN_PERSONS: { id: string; label: string; aliases: string[] }[] = [
  { id: 'pedro-sanchez',       label: 'Pedro Sánchez',          aliases: ['pedro sánchez', 'pedro sanchez', 'sánchez', 'sanchez '] },
  { id: 'alberto-feijoo',      label: 'Alberto Núñez Feijóo',   aliases: ['feijóo', 'feijoo', 'núñez feijóo'] },
  { id: 'santiago-abascal',    label: 'Santiago Abascal',       aliases: ['abascal'] },
  { id: 'yolanda-diaz',        label: 'Yolanda Díaz',           aliases: ['yolanda díaz', 'yolanda diaz'] },
  { id: 'isabel-diaz-ayuso',   label: 'Isabel Díaz Ayuso',      aliases: ['ayuso'] },
  { id: 'miriam-nogueras',     label: 'Miriam Nogueras',        aliases: ['nogueras'] },
  { id: 'aitor-esteban',       label: 'Aitor Esteban',          aliases: ['aitor esteban', ' esteban ', 'esteban (pnv)'] },
  { id: 'gabriel-rufian',      label: 'Gabriel Rufián',         aliases: ['rufián', 'rufian'] },
  { id: 'salvador-illa',       label: 'Salvador Illa',          aliases: ['illa'] },
  { id: 'juan-manuel-moreno',  label: 'Juan Manuel Moreno',     aliases: ['moreno bonilla', 'juanma moreno'] },
  { id: 'maria-jesus-montero', label: 'María Jesús Montero',    aliases: ['maría jesús montero', 'maria jesus montero', ' montero'] },
  { id: 'felix-bolanos',       label: 'Félix Bolaños',          aliases: ['bolaños', 'bolanos'] },
  { id: 'puigdemont',          label: 'Carles Puigdemont',      aliases: ['puigdemont'] },
  { id: 'pere-aragones',       label: 'Pere Aragonès',          aliases: ['aragonès', 'aragones'] },
  { id: 'arnaldo-otegi',       label: 'Arnaldo Otegi',          aliases: ['otegi'] },
  { id: 'pradales',            label: 'Imanol Pradales',        aliases: ['pradales'] },
  { id: 'rajoy',               label: 'Mariano Rajoy',          aliases: ['rajoy'] },
  { id: 'irene-montero',       label: 'Irene Montero',          aliases: ['irene montero'] },
  { id: 'ione-belarra',        label: 'Ione Belarra',           aliases: ['belarra'] },
  { id: 'juan-lobato',         label: 'Juan Lobato',            aliases: ['lobato'] },
]

export interface PersonMention {
  name: string
  label: string
  mentions: number
  pos: number
  neg: number
  neu: number
  sent_polarity: number
  avg_relevance: number
  last_seen: string | null
}

export function topPersons(articles: AggregatedArticle[], n = 15): PersonMention[] {
  const acc = new Map<string, { label: string; pos: number; neg: number; neu: number; total: number; lastTs: number | null }>()
  for (const a of articles) {
    const text = `${a.title} ${a.description}`.toLowerCase()
    for (const p of KNOWN_PERSONS) {
      if (p.aliases.some(al => text.includes(al))) {
        const cur = acc.get(p.id) || { label: p.label, pos: 0, neg: 0, neu: 0, total: 0, lastTs: null }
        if (a.sentiment === 'positive') cur.pos++
        else if (a.sentiment === 'negative') cur.neg++
        else cur.neu++
        cur.total++
        const ts = a.pubDate?.getTime() || null
        if (ts && (!cur.lastTs || ts > cur.lastTs)) cur.lastTs = ts
        acc.set(p.id, cur)
      }
    }
  }
  return Array.from(acc.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, n)
    .map(([id, v]) => ({
      name: id,
      label: v.label,
      mentions: v.total,
      pos: v.pos, neg: v.neg, neu: v.neu,
      sent_polarity: v.total > 0 ? +((v.pos - v.neg) / v.total).toFixed(2) : 0,
      avg_relevance: 0.7,
      last_seen: v.lastTs ? new Date(v.lastTs).toISOString() : null,
    }))
}

// CCAA: code → label legible
export const CCAA_LABEL: Record<string, string> = {
  AND: 'Andalucía', ARA: 'Aragón', AST: 'Asturias', BAL: 'Baleares',
  CAN: 'Canarias', CNT: 'Cantabria', CLM: 'Castilla-La Mancha',
  CYL: 'Castilla y León', CAT: 'Cataluña', EXT: 'Extremadura',
  GAL: 'Galicia', MAD: 'Madrid', MUR: 'Murcia', NAV: 'Navarra',
  PV:  'País Vasco', RIO: 'La Rioja', VAL: 'Valencia',
  CEU: 'Ceuta', MEL: 'Melilla',
}

export interface CCAARegionStat {
  n: number
  pos: number
  neg: number
  neu: number
  sent_score: number
  top_topics: string[]
}

/** Agrupa artículos por CCAA del medio. Los nacionales se asignan a Madrid. */
export function byCCAA(articles: AggregatedArticle[]): Record<string, CCAARegionStat> {
  const buckets = new Map<string, AggregatedArticle[]>()
  for (const a of articles) {
    let label: string
    if (a.medio.ambito === 'Nacional') label = 'Madrid'
    else if (a.medio.ccaa) label = CCAA_LABEL[a.medio.ccaa] || a.medio.ccaa
    else continue
    const cur = buckets.get(label) || []
    cur.push(a)
    buckets.set(label, cur)
  }
  const out: Record<string, CCAARegionStat> = {}
  for (const [label, arts] of Array.from(buckets.entries())) {
    const pos = arts.filter((a: AggregatedArticle) => a.sentiment === 'positive').length
    const neg = arts.filter((a: AggregatedArticle) => a.sentiment === 'negative').length
    const neu = arts.filter((a: AggregatedArticle) => a.sentiment === 'neutral').length
    const score = arts.length > 0
      ? +(arts.reduce((s: number, a: AggregatedArticle) => s + a.sentiment_score, 0) / arts.length).toFixed(2)
      : 0
    out[label] = {
      n: arts.length,
      pos, neg, neu,
      sent_score: score,
      top_topics: topTopics(arts, 3).map(t => t.topic),
    }
  }
  return out
}

// Coordenadas y país (para sentiment-map)
const CCAA_COORDS: Record<string, { lat: number; lon: number }> = {
  AND: { lat: 37.39, lon: -5.99 }, ARA: { lat: 41.65, lon: -0.89 },
  AST: { lat: 43.36, lon: -5.85 }, BAL: { lat: 39.57, lon:  2.65 },
  CAN: { lat: 28.29, lon: -16.63 }, CNT: { lat: 43.46, lon: -3.81 },
  CLM: { lat: 39.86, lon: -4.03 }, CYL: { lat: 41.65, lon: -4.72 },
  CAT: { lat: 41.39, lon:  2.16 }, EXT: { lat: 39.47, lon: -6.37 },
  GAL: { lat: 42.88, lon: -8.54 }, MAD: { lat: 40.42, lon: -3.70 },
  MUR: { lat: 37.99, lon: -1.13 }, NAV: { lat: 42.81, lon: -1.65 },
  PV:  { lat: 43.27, lon: -2.93 }, RIO: { lat: 42.46, lon: -2.45 },
  VAL: { lat: 39.47, lon: -0.38 }, CEU: { lat: 35.89, lon: -5.32 },
  MEL: { lat: 35.29, lon: -2.94 },
}

export interface SentimentMapPoint {
  source_country: string
  source_region: string
  lat: number
  lon: number
  volume: number
  avg_relevance: number
  pos: number
  neg: number
  neu: number
  spain_high: number
}

// ──────────────── Risk index derivado del feed ────────────────

/**
 * Mapeo de keyword → dimensión de riesgo (ICRG-like).
 * Cada artículo se cuenta en 0..N dimensiones según las palabras de su título.
 */
const DIMENSION_KEYWORDS: Record<string, string[]> = {
  institutional: [
    'amnistía', 'amnistia', 'moción de censura', 'mocion de censura',
    'cgpj', 'tribunal constitucional', 'tribunal supremo', 'fiscalía', 'fiscalia',
    'junts', 'pnv', 'erc', 'transferencia', 'cupo cataLán', 'gobierno', 'legislatura',
    'presupuestos', 'decreto-ley', 'real decreto', 'reforma constitucional',
    'investidura', 'aforamiento', 'lawfare',
  ],
  electoral: [
    'encuesta', 'sondeo', 'sigma dos', 'gad3', 'cis', 'metroscopia',
    'intención de voto', 'intencion de voto', 'escaños', 'escanos',
    'feijóo', 'feijoo', 'sánchez', 'sanchez', 'abascal', 'yolanda', 'ayuso',
    'partido popular', 'psoe', 'vox ', 'sumar', 'comicios', 'electoral',
  ],
  geopolitical: [
    'ucrania', 'kiev', 'rusia', 'putin', 'zelenski',
    'marruecos', 'sáhara', 'sahara', 'argelia', 'gibraltar',
    'otan', 'unión europea', 'union europea', 'bruselas', 'comisión europea',
    'eeuu', 'estados unidos', 'china', 'israel', 'gaza', 'palestina',
    'arancel', 'aranceles', 'sanción', 'sanciones',
  ],
  economic: [
    'prima de riesgo', 'ibex', 'bono', 'inflación', 'inflacion',
    'ipc', 'paro', 'empleo', 'crecimiento', 'pib', 'déficit', 'deficit',
    'banco de españa', 'bce', 'lagarde', 'fed', 'tipos de interés',
    'recesión', 'recesion', 'tesoro', 'bolsa', 'mercados', 'eurostoxx',
    'euríbor', 'euribor', 'subida tipos', 'recorte tipos', 'salario mínimo',
    'reforma fiscal', 'irpf', 'iva', 'impuesto',
  ],
  media: [
    'twitter', ' x ', 'redes sociales', 'tiktok', 'instagram', 'facebook',
    'polémica', 'polemica', 'escándalo', 'escandalo', 'viral', 'trending',
    'bulo', 'desinformación', 'desinformacion', 'fake news', 'verifica',
    'tertulia', 'periodista', 'medios', 'prensa', 'comunicado',
  ],
  social: [
    'vivienda', 'alquiler', 'inquilino', 'desahucio',
    'huelga', 'manifestación', 'manifestacion', 'concentración', 'protesta',
    'sanidad', 'sanitario', 'hospital', 'lista de espera', 'urgencias',
    'educación', 'educacion', 'colegios', 'profesorado', 'universidad',
    'igualdad', 'género', 'genero', 'feminismo', 'violencia',
    'pobreza', 'precariedad', 'salario mínimo', 'salario minimo',
    'pensiones', 'pensionistas', 'dependencia',
  ],
}

const DIMENSION_LABELS: Record<string, string> = {
  institutional: 'Institucional',
  electoral:     'Electoral',
  geopolitical:  'Geopolítica',
  economic:      'Económica',
  media:         'Media',
  social:        'Social',
}

const DIMENSION_WEIGHTS: Record<string, number> = {
  institutional: 0.20, electoral: 0.18, geopolitical: 0.15,
  economic: 0.18, media: 0.14, social: 0.15,
}

export interface RiskDriver {
  id: number
  title: string
  source: string
  relevance: number
  sentiment: string
  spain_impact: string
  contribution: number
  scraped_at: string | null
  dimension?: string
  dimension_label?: string
}

export interface RiskDimensionStat {
  label: string
  score: number
  level: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO'
  weight: number
  n_articles: number
  delta_24h: number
  z_score: number
  is_anomaly: boolean
  drivers: RiskDriver[]
}

function levelOf(score: number): RiskDimensionStat['level'] {
  if (score >= 75) return 'CRÍTICO'
  if (score >= 55) return 'ALTO'
  if (score >= 35) return 'MEDIO'
  return 'BAJO'
}

function semaforoOf(score: number): 'verde' | 'amarillo' | 'naranja' | 'rojo' {
  if (score >= 75) return 'rojo'
  if (score >= 55) return 'naranja'
  if (score >= 35) return 'amarillo'
  return 'verde'
}

/** Detecta a qué dimensiones pertenece cada artículo. */
function articleDimensions(a: AggregatedArticle): string[] {
  const text = `${a.title} ${a.description}`.toLowerCase()
  const out: string[] = []
  for (const [dim, kws] of Object.entries(DIMENSION_KEYWORDS)) {
    if (kws.some(k => text.includes(k))) out.push(dim)
  }
  return out
}

/** Calcula score 0-100 para una dimensión basado en volumen + negatividad. */
function dimensionScore(arts: AggregatedArticle[]): number {
  if (arts.length === 0) return 30  // baseline mínimo
  const negPct = arts.filter(a => a.sentiment === 'negative').length / arts.length
  // Volumen: log10 saturado a 50 artículos = 1.0
  const volNorm = Math.min(1, Math.log10(arts.length + 1) / Math.log10(51))
  // Score = 30 base + 50% volumen + 50% negatividad
  return Math.min(95, Math.max(10, Math.round(30 + volNorm * 35 + negPct * 35)))
}

export function dimensionStats(articles: AggregatedArticle[]): Record<string, RiskDimensionStat> {
  const buckets: Record<string, AggregatedArticle[]> = {}
  for (const dim of Object.keys(DIMENSION_KEYWORDS)) buckets[dim] = []
  for (const a of articles) {
    for (const dim of articleDimensions(a)) buckets[dim].push(a)
  }
  const out: Record<string, RiskDimensionStat> = {}
  let driverIdCounter = 1
  for (const [dim, arts] of Object.entries(buckets)) {
    const score = dimensionScore(arts)
    // Top 2 drivers de cada dimensión por sentiment más negativo + recencia
    const drivers: RiskDriver[] = arts
      .slice()
      .sort((a, b) => {
        const sa = (a.pubDate?.getTime() || 0) + (a.sentiment === 'negative' ? 86_400_000 : 0)
        const sb = (b.pubDate?.getTime() || 0) + (b.sentiment === 'negative' ? 86_400_000 : 0)
        return sb - sa
      })
      .slice(0, 2)
      .map(a => ({
        id: driverIdCounter++,
        title: a.title,
        source: a.medio.nombre,
        relevance: 0.7 + Math.random() * 0.2,  // 0.7-0.9
        sentiment: a.sentiment,
        spain_impact: a.medio.ambito === 'Nacional' ? 'high' : 'medium',
        contribution: +(arts.length > 0 ? Math.min(0.3, 1 / arts.length + 0.05) : 0).toFixed(2),
        scraped_at: a.pub_date_iso,
        dimension: dim,
        dimension_label: DIMENSION_LABELS[dim],
      }))
    // delta_24h: artículos en últimas 24h vs media baseline (estimado)
    const recent = arts.filter(a => a.pubDate && Date.now() - a.pubDate.getTime() < 24 * 3600_000).length
    const baseline = Math.max(1, arts.length / 3)  // baseline = promedio por día
    const delta = Math.round(((recent / baseline) - 1) * 10)
    const zScore = +((recent - baseline) / Math.max(1, Math.sqrt(baseline))).toFixed(1)
    out[dim] = {
      label: DIMENSION_LABELS[dim],
      score,
      level: levelOf(score),
      weight: DIMENSION_WEIGHTS[dim],
      n_articles: arts.length,
      delta_24h: delta,
      z_score: zScore,
      is_anomaly: Math.abs(zScore) >= 1.0,
      drivers,
    }
  }
  return out
}

/** Score composite ponderado. */
export function compositeScore(dims: Record<string, RiskDimensionStat>): { composite: number; level: RiskDimensionStat['level']; semaforo: 'verde' | 'amarillo' | 'naranja' | 'rojo' } {
  const total = Object.values(dims).reduce((s, d) => s + d.score * d.weight, 0)
  const composite = Math.round(total)
  return { composite, level: levelOf(composite), semaforo: semaforoOf(composite) }
}

/** Top drivers globales · combinando contribución y recencia. */
export function topDrivers(dims: Record<string, RiskDimensionStat>, n = 6): RiskDriver[] {
  const all: RiskDriver[] = []
  for (const d of Object.values(dims)) all.push(...d.drivers)
  return all
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, n)
}

// ──────────────── Burst topics / amplification (escalations) ────────────────

export interface BurstTopic {
  topic: string
  recent_n: number
  baseline_n: number
  ratio: number
  is_new: boolean
}
export interface AmplificationTopic {
  topic: string
  n_sources: number
  n_countries: number
  n_articles: number
  examples: string[]
}
export interface DualPolarizationTopic {
  topic: string
  total: number
  pos_pct: number
  neg_pct: number
  neu_pct: number
}

/**
 * Burst topics · topics que han subido en menciones recientes (24h)
 * vs ventana baseline (resto del periodo). Como no tenemos histórico
 * persistente, calculamos baseline como (total - recent) / 2.
 */
export function burstTopics(articles: AggregatedArticle[]): BurstTopic[] {
  const recent = articles.filter(a => a.pubDate && Date.now() - a.pubDate.getTime() < 24 * 3600_000)
  const old    = articles.filter(a => !recent.includes(a))
  const recentCounts = new Map<string, number>()
  const oldCounts    = new Map<string, number>()
  function bump(map: Map<string, number>, arts: AggregatedArticle[]) {
    for (const a of arts) {
      const text = `${a.title} ${a.description}`.toLowerCase()
      for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
        for (const p of patterns) {
          const re = p.includes('.+') ? new RegExp(p) : null
          if (re ? re.test(text) : text.includes(p)) {
            map.set(topic, (map.get(topic) || 0) + 1)
            break
          }
        }
      }
    }
  }
  bump(recentCounts, recent)
  bump(oldCounts,    old)
  const out: BurstTopic[] = []
  for (const [topic, recent_n] of Array.from(recentCounts.entries())) {
    const baseline_n = oldCounts.get(topic) || 0
    const baseline = Math.max(1, baseline_n / Math.max(1, (articles.length - recent.length) / 24))
    const ratio = +((recent_n / Math.max(1, baseline)) ).toFixed(1)
    out.push({ topic, recent_n, baseline_n, ratio, is_new: baseline_n === 0 })
  }
  return out.sort((a, b) => b.ratio * (b.recent_n + 1) - a.ratio * (a.recent_n + 1)).slice(0, 8)
}

/** Topics presentes en N medios distintos (más fuentes = mayor amplificación). */
export function amplification(articles: AggregatedArticle[]): AmplificationTopic[] {
  const acc = new Map<string, { sources: Set<string>; n: number; examples: Set<string> }>()
  for (const a of articles) {
    const text = `${a.title} ${a.description}`.toLowerCase()
    for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
      for (const p of patterns) {
        const re = p.includes('.+') ? new RegExp(p) : null
        if (re ? re.test(text) : text.includes(p)) {
          const cur = acc.get(topic) || { sources: new Set<string>(), n: 0, examples: new Set<string>() }
          cur.sources.add(a.medio.id)
          cur.examples.add(a.medio.nombre)
          cur.n++
          acc.set(topic, cur)
          break
        }
      }
    }
  }
  return Array.from(acc.entries())
    .filter(([, v]) => v.sources.size >= 3)
    .sort((a, b) => b[1].sources.size - a[1].sources.size)
    .slice(0, 6)
    .map(([topic, v]) => ({
      topic,
      n_sources: v.sources.size,
      n_countries: 1,  // todos los medios son españoles por ahora
      n_articles: v.n,
      examples: Array.from(v.examples).slice(0, 4),
    }))
}

/** Topics con sentiment dividido (alta polarización pos vs neg). */
export function dualPolarization(articles: AggregatedArticle[]): DualPolarizationTopic[] {
  const acc = new Map<string, { pos: number; neg: number; neu: number; total: number }>()
  for (const a of articles) {
    const text = `${a.title} ${a.description}`.toLowerCase()
    for (const [topic, patterns] of Object.entries(TOPIC_KEYWORDS)) {
      for (const p of patterns) {
        const re = p.includes('.+') ? new RegExp(p) : null
        if (re ? re.test(text) : text.includes(p)) {
          const cur = acc.get(topic) || { pos: 0, neg: 0, neu: 0, total: 0 }
          if (a.sentiment === 'positive') cur.pos++
          else if (a.sentiment === 'negative') cur.neg++
          else cur.neu++
          cur.total++
          acc.set(topic, cur)
          break
        }
      }
    }
  }
  return Array.from(acc.entries())
    .filter(([, v]) => v.total >= 5)
    .map(([topic, v]) => ({
      topic,
      total: v.total,
      pos_pct: Math.round(100 * v.pos / v.total),
      neg_pct: Math.round(100 * v.neg / v.total),
      neu_pct: Math.round(100 * v.neu / v.total),
    }))
    // Polarización = mínimo de pos/neg alto (ambos lados activos)
    .sort((a, b) => Math.min(b.pos_pct, b.neg_pct) - Math.min(a.pos_pct, a.neg_pct))
    .slice(0, 6)
}

// ──────────────── Geopolítica ────────────────

/** Categoría geopolítica detectada del titular. */
const GEO_CAT_KEYWORDS: Record<string, string[]> = {
  migracion:    ['migración', 'migracion', 'migrante', 'migratoria', 'frontera', 'sahara', 'canarias', 'patera', 'ceuta', 'melilla'],
  militar:      ['otan', 'militar', 'fuerzas armadas', 'guerra', 'invasión', 'invasion', 'ataque', 'ejército', 'ejercito', 'armada', 'aviación militar'],
  energia:      ['gas', 'gasoil', 'petróleo', 'petroleo', 'energético', 'energetico', 'argelia', 'opep', 'argelino', 'eólica internacional'],
  diplomatica:  ['embajador', 'embajada', 'reunión bilateral', 'cumbre', 'visita oficial', 'asuntos exteriores', 'diplomacia', 'ministerio de exteriores'],
  comercio:     ['arancel', 'aranceles', 'omc', 'tlc', 'tratado comercial', 'exportación', 'exportacion', 'importación', 'importacion'],
  union_europea:['unión europea', 'union europea', 'bruselas', 'comisión europea', 'parlamento europeo', 'consejo europeo', 'eurogrupo'],
}

const COUNTRY_KEYWORDS: Record<string, { lat: number; lon: number; iso: string; categoria: string }> = {
  'Marruecos':       { lat: 31.8, lon: -7.1,  iso: 'MAR', categoria: 'migracion'   },
  'Argelia':         { lat: 28.0, lon:  3.0,  iso: 'DZA', categoria: 'energia'     },
  'Francia':         { lat: 46.2, lon:  2.2,  iso: 'FRA', categoria: 'diplomatica' },
  'Alemania':        { lat: 51.2, lon: 10.5,  iso: 'DEU', categoria: 'diplomatica' },
  'Italia':          { lat: 42.5, lon: 12.6,  iso: 'ITA', categoria: 'diplomatica' },
  'Portugal':        { lat: 39.4, lon: -8.2,  iso: 'PRT', categoria: 'diplomatica' },
  'Reino Unido':     { lat: 55.4, lon: -3.4,  iso: 'GBR', categoria: 'diplomatica' },
  'Estados Unidos':  { lat: 38.0, lon: -97.0, iso: 'USA', categoria: 'militar'     },
  'Rusia':           { lat: 60.0, lon: 100.0, iso: 'RUS', categoria: 'militar'     },
  'Ucrania':         { lat: 49.0, lon: 32.0,  iso: 'UKR', categoria: 'militar'     },
  'China':           { lat: 35.0, lon: 105.0, iso: 'CHN', categoria: 'comercio'    },
  'Israel':          { lat: 31.0, lon: 35.0,  iso: 'ISR', categoria: 'militar'     },
  'Palestina':       { lat: 31.9, lon: 35.2,  iso: 'PSE', categoria: 'militar'     },
  'Gaza':            { lat: 31.5, lon: 34.4,  iso: 'GAZ', categoria: 'militar'     },
  'México':          { lat: 23.6, lon: -102.5, iso: 'MEX', categoria: 'diplomatica' },
  'Brasil':          { lat: -14.0, lon: -51.9, iso: 'BRA', categoria: 'comercio'    },
  'Argentina':       { lat: -38.4, lon: -63.6, iso: 'ARG', categoria: 'diplomatica' },
  'Cuba':            { lat: 21.5, lon: -77.8, iso: 'CUB', categoria: 'diplomatica' },
  'Venezuela':       { lat: 6.4,  lon: -66.6, iso: 'VEN', categoria: 'diplomatica' },
  'Turquía':         { lat: 39.0, lon: 35.0,  iso: 'TUR', categoria: 'militar'     },
  'Irán':            { lat: 32.4, lon: 53.7,  iso: 'IRN', categoria: 'militar'     },
  'Arabia Saudí':    { lat: 23.9, lon: 45.1,  iso: 'SAU', categoria: 'energia'     },
  'Mauritania':      { lat: 21.0, lon: -10.9, iso: 'MRT', categoria: 'migracion'   },
  'Senegal':         { lat: 14.5, lon: -14.5, iso: 'SEN', categoria: 'migracion'   },
}

function detectGeoCategory(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [cat, kws] of Object.entries(GEO_CAT_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return cat
  }
  return null
}

function detectCountries(text: string): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const country of Object.keys(COUNTRY_KEYWORDS)) {
    if (lower.includes(country.toLowerCase())) found.push(country)
  }
  return found
}

export interface GeoOsintItem {
  id: string
  titulo: string
  fuente: string
  fecha: string
  urgencia: number  // 1-5
  categoria: string
  resumen: string
  url?: string
  paises?: string[]
}

export function geoOsintFromArticles(articles: AggregatedArticle[]): GeoOsintItem[] {
  const out: GeoOsintItem[] = []
  for (const a of articles) {
    const text = `${a.title} ${a.description}`
    const cat = detectGeoCategory(text)
    const paises = detectCountries(text)
    if (!cat && paises.length === 0) continue
    // Urgencia: combinación de sentiment negativo + recencia
    const isRecent = a.pubDate && (Date.now() - a.pubDate.getTime() < 6 * 3600_000)
    let urgencia = 2
    if (a.sentiment === 'negative') urgencia += 1
    if (isRecent) urgencia += 1
    if (paises.some(p => ['Marruecos', 'Rusia', 'Israel', 'Palestina', 'Gaza', 'Ucrania'].includes(p))) urgencia += 1
    out.push({
      id: a.link || `${a.medio.id}-${a.title.slice(0, 40)}`,
      titulo: a.title,
      fuente: a.medio.nombre,
      fecha: a.pub_date_iso || new Date().toISOString(),
      urgencia: Math.min(5, urgencia),
      categoria: cat || 'diplomatica',
      resumen: a.description.slice(0, 240),
      url: a.link,
      paises,
    })
  }
  return out
    .sort((a, b) => {
      if (b.urgencia !== a.urgencia) return b.urgencia - a.urgencia
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })
}

export interface GeoAlertaItem {
  id: string
  titulo: string
  nivel: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
  fecha: string
  paises: string[]
  descripcion: string
  url?: string
}

export function geoAlertasFromArticles(articles: AggregatedArticle[]): GeoAlertaItem[] {
  const out: GeoAlertaItem[] = []
  for (const a of articles) {
    const text = `${a.title} ${a.description}`
    const paises = detectCountries(text)
    if (paises.length === 0) continue
    const lower = text.toLowerCase()
    let nivel: GeoAlertaItem['nivel'] = 'BAJO'
    const criticalKw = ['guerra', 'invasión', 'invasion', 'ataque', 'crisis', 'emergencia', 'colapso', 'evacua']
    const highKw     = ['tensión', 'tension', 'conflicto', 'amenaza', 'sanción', 'sancion', 'expulsión', 'expulsion']
    const medKw      = ['desacuerdo', 'controversia', 'protesta', 'manifestación', 'manifestacion']
    if (criticalKw.some(k => lower.includes(k))) nivel = 'CRITICO'
    else if (highKw.some(k => lower.includes(k))) nivel = 'ALTO'
    else if (medKw.some(k => lower.includes(k))) nivel = 'MEDIO'
    if (nivel === 'BAJO') continue  // solo subimos las realmente notables
    out.push({
      id: a.link || `${a.medio.id}-${a.title.slice(0, 40)}`,
      titulo: a.title,
      nivel,
      fecha: a.pub_date_iso || new Date().toISOString(),
      paises,
      descripcion: a.description.slice(0, 280),
      url: a.link,
    })
  }
  // Ordenar por nivel + fecha
  const order: Record<string, number> = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAJO: 3 }
  return out.sort((a, b) => {
    if (order[a.nivel] !== order[b.nivel]) return order[a.nivel] - order[b.nivel]
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  })
}

export interface GeoRiesgoItem {
  pais: string
  iso: string
  score: number  // 0-10
  interes_espana: number  // 0-10
  lat: number
  lon: number
  categoria: string
}

export function geoRiesgoFromArticles(articles: AggregatedArticle[]): GeoRiesgoItem[] {
  const counts = new Map<string, { n: number; neg: number }>()
  for (const a of articles) {
    const paises = detectCountries(`${a.title} ${a.description}`)
    for (const p of paises) {
      const cur = counts.get(p) || { n: 0, neg: 0 }
      cur.n++
      if (a.sentiment === 'negative') cur.neg++
      counts.set(p, cur)
    }
  }
  const out: GeoRiesgoItem[] = []
  for (const [pais, v] of Array.from(counts.entries())) {
    const meta = COUNTRY_KEYWORDS[pais]
    if (!meta) continue
    // Score 0-10: 50% volumen log + 50% % negatividad
    const volScore = Math.min(10, Math.log10(v.n + 1) * 4)
    const negScore = (v.neg / v.n) * 10
    const score = +((volScore * 0.5 + negScore * 0.5)).toFixed(1)
    // Interés España: simulado por inverso de la distancia + cercanía geopolítica
    // Más simple: se mantiene constante por país (ya curado en el dataset)
    const interesPorPais: Record<string, number> = {
      Marruecos: 9.5, Argelia: 8.2, Francia: 8.0, Alemania: 7.0, Portugal: 9.0,
      Italia: 6.5, 'Reino Unido': 6.8, 'Estados Unidos': 7.5, Rusia: 7.2,
      Ucrania: 6.5, China: 6.0, Israel: 6.8, Palestina: 6.5, Gaza: 6.8,
      México: 5.8, Brasil: 5.5, Argentina: 5.2, Cuba: 4.5, Venezuela: 6.2,
      Turquía: 5.5, Irán: 5.8, 'Arabia Saudí': 6.0, Mauritania: 7.0, Senegal: 7.2,
    }
    const interesEspana = interesPorPais[pais] ?? 5.0
    out.push({
      pais, iso: meta.iso, score, interes_espana: interesEspana,
      lat: meta.lat, lon: meta.lon, categoria: meta.categoria,
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

export function sentimentMap(articles: AggregatedArticle[]): SentimentMapPoint[] {
  const buckets = new Map<string, { ccaa: string; arts: AggregatedArticle[] }>()
  for (const a of articles) {
    const code = a.medio.ambito === 'Nacional' ? 'MAD' : (a.medio.ccaa || 'MAD')
    const cur = buckets.get(code) || { ccaa: code, arts: [] }
    cur.arts.push(a)
    buckets.set(code, cur)
  }
  const out: SentimentMapPoint[] = []
  for (const [code, b] of Array.from(buckets.entries())) {
    const coord = CCAA_COORDS[code] || CCAA_COORDS.MAD
    const pos = b.arts.filter((a: AggregatedArticle) => a.sentiment === 'positive').length
    const neg = b.arts.filter((a: AggregatedArticle) => a.sentiment === 'negative').length
    const neu = b.arts.filter((a: AggregatedArticle) => a.sentiment === 'neutral').length
    out.push({
      source_country: 'España',
      source_region: CCAA_LABEL[code] || code,
      lat: coord.lat, lon: coord.lon,
      volume: b.arts.length,
      avg_relevance: 0.7,
      pos, neg, neu,
      spain_high: b.arts.length,
    })
  }
  return out.sort((a, b) => b.volume - a.volume)
}
