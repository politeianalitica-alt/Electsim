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
