/**
 * /api/medios/search · Búsqueda puntual de Media Intelligence.
 *
 * Endpoint nuevo que convierte la plataforma en herramienta de investigación
 * del analista: cualquier tema, cualquier ventana temporal, cualquier bloque
 * de medios.
 *
 * Fuente principal: NewsAPI (everything endpoint) · soporta:
 *   - q: query string con operadores booleanos (AND, OR, NOT, quotes)
 *   - language: es, en, fr, de, it, pt
 *   - from / to: fechas ISO
 *   - domains / excludeDomains: comma-separated
 *   - sortBy: relevancy | popularity | publishedAt
 *   - searchIn: title | description | content
 *   - pageSize, page
 *
 * Fuente secundaria: catálogo interno medios.json para mapping ideológico
 * (bloques izquierda/centro/derecha) cuando se pide sourceGroups.
 *
 * NEWS_API_KEY se lee solo del backend (process.env) · nunca expuesto al
 * cliente. El cliente llama a /api/medios/search y este endpoint reenvía.
 *
 * Devuelve una respuesta enriquecida (no solo articles):
 *   - timeline {date, count} agregado por día
 *   - topSources/topDomains ranking
 *   - actors extraídos heurísticamente
 *   - topics auto-detectados (n-gramas)
 *   - narratives detectadas (frames recurrentes)
 *   - sentiment heurístico
 *   - ideologicalComparison si sourceGroups incluido
 *
 * POST por preferencia (cuerpo rich) pero GET soportado para deep-linking.
 */

import { NextResponse } from 'next/server'
import mediosData from '@/data/medios.json'
import mediosEuropeosData from '@/data/medios-europeos.json'
import { IDEOLOGY_RANGES, type SourceGroup } from '@/lib/medios/sources-matrix'

export const dynamic = 'force-dynamic'

// ── Tipos contrato ──────────────────────────────────────────────────────
export interface MediaSearchRequest {
  query: string
  mode?: 'quick' | 'deep' | 'comparative' | 'dossier'
  from?: string
  to?: string
  language?: 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt'
  domains?: string[]
  excludeDomains?: string[]
  sourceGroups?: SourceGroup[]
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt'
  searchIn?: ('title' | 'description' | 'content')[]
  pageSize?: number
  page?: number
}

export interface MediaArticle {
  title: string
  description: string | null
  url: string
  image: string | null
  source: string
  source_id?: string | null
  domain: string
  author: string | null
  published: string
  language?: string
  sentiment_score?: number
  ideology_bucket?: SourceGroup | null
}

interface CatalogMedio {
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
}

const CATALOG: CatalogMedio[] = [
  ...(mediosData as { medios: CatalogMedio[] }).medios,
  ...(mediosEuropeosData as { medios: CatalogMedio[] }).medios,
]

const NEWSAPI_BASE = 'https://newsapi.org/v2'

// ── NewsAPI client ──────────────────────────────────────────────────────
async function newsapiFetch(path: string, params: Record<string, string>): Promise<any> {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) return { error: 'no_api_key' }
  const qs = new URLSearchParams({ ...params, apiKey })
  try {
    const r = await fetch(`${NEWSAPI_BASE}${path}?${qs}`, {
      headers: { Accept: 'application/json' },
      // NewsAPI everything tiene fresh data · cache corto
      next: { revalidate: 300 },
    } as RequestInit)
    if (r.status === 429) return { error: 'rate_limited' }
    if (r.status === 401) return { error: 'unauthorized' }
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────
function domainFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function dateKey(iso: string): string {
  return iso.slice(0, 10) // YYYY-MM-DD
}

function ideologyBucket(domain: string): SourceGroup | null {
  // Match dominio contra catálogo interno
  const medio = CATALOG.find((m) => {
    if (!m.web) return false
    try {
      const w = new URL(m.web.startsWith('http') ? m.web : `https://${m.web}`)
      return w.hostname.replace(/^www\./, '') === domain
    } catch {
      return false
    }
  })
  if (!medio) return null
  const id = medio.ideologia
  if (id <= -40) return 'left'
  if (id <= -15) return 'center-left'
  if (id <= 15) return 'center'
  if (id <= 40) return 'center-right'
  return 'right'
}

// Sentimiento heurístico básico (titulares solo)
const POSITIVE_KW = [
  'crece', 'mejora', 'avanza', 'positivo', 'éxito', 'acuerdo', 'aprueba',
  'récord', 'optimista', 'recuperación', 'gana', 'subida', 'logra', 'fortaleza',
]
const NEGATIVE_KW = [
  'crisis', 'caída', 'pierde', 'ataca', 'crítica', 'fracaso', 'condena',
  'imputado', 'corrupción', 'amenaza', 'denuncia', 'recesión', 'derrumbe',
  'rechaza', 'temor', 'alarma', 'colapso', 'caos', 'fraude', 'escándalo',
]

function sentimentScore(text: string): number {
  const lower = (text || '').toLowerCase()
  let pos = 0, neg = 0
  for (const kw of POSITIVE_KW) if (lower.includes(kw)) pos++
  for (const kw of NEGATIVE_KW) if (lower.includes(kw)) neg++
  if (pos === 0 && neg === 0) return 0
  return (pos - neg) / (pos + neg)
}

// Topic auto-detección via n-gramas (bigrams + trigrams)
const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
  'a', 'al', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'que', 'y', 'o',
  'pero', 'si', 'no', 'lo', 'le', 'se', 'su', 'es', 'son', 'fue', 'ha',
  'han', 'esta', 'este', 'están', 'también', 'más', 'menos', 'como',
  'cuando', 'donde', 'ante', 'tras', 'mientras', 'porque', 'aunque',
  'desde', 'hasta', 'entre', 'según',
])

function extractTopics(articles: MediaArticle[], maxN = 12): { label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const a of articles) {
    const text = `${a.title} ${a.description || ''}`.toLowerCase()
    const words = text
      .replace(/[^\wáéíóúñ ]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    for (let i = 0; i < words.length - 1; i++) {
      const bi = `${words[i]} ${words[i + 1]}`
      if (bi.length > 8) counts.set(bi, (counts.get(bi) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .filter(([_, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxN)
    .map(([label, count]) => ({ label, count }))
}

// Detección de actores via taxonomía interna (lista corta + cliente puede ampliar)
const ACTORS_KNOWN = [
  'Sánchez', 'Feijóo', 'Abascal', 'Yolanda Díaz', 'Belarra',
  'PSOE', 'PP', 'Vox', 'Sumar', 'Podemos', 'ERC', 'Junts', 'EH-Bildu', 'PNV',
  'Moncloa', 'Congreso', 'Senado', 'TC', 'Tribunal Supremo', 'CGPJ',
  'Marruecos', 'Argelia', 'Francia', 'Alemania', 'Italia', 'EEUU', 'China', 'Rusia', 'Ucrania',
  'UE', 'Comisión Europea', 'OTAN', 'BCE', 'FMI',
  'Santander', 'BBVA', 'Iberdrola', 'Repsol', 'Telefónica', 'Inditex', 'Ferrovial',
]

function extractActors(articles: MediaArticle[]): { name: string; mentions: number; sentiment: number }[] {
  const counts = new Map<string, { mentions: number; senSum: number }>()
  for (const a of articles) {
    const text = `${a.title} ${a.description || ''}`
    for (const actor of ACTORS_KNOWN) {
      if (text.includes(actor)) {
        const cur = counts.get(actor) || { mentions: 0, senSum: 0 }
        cur.mentions++
        cur.senSum += a.sentiment_score || 0
        counts.set(actor, cur)
      }
    }
  }
  return Array.from(counts.entries())
    .filter(([_, v]) => v.mentions >= 1)
    .map(([name, v]) => ({ name, mentions: v.mentions, sentiment: v.senSum / v.mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 20)
}

// Detección narrativas (frames recurrentes en titulares)
const NARRATIVE_FRAMES: Record<string, string[]> = {
  crisis:       ['crisis', 'colapso', 'derrumbe', 'caos', 'emergencia'],
  amenaza:      ['amenaza', 'peligro', 'riesgo', 'temor', 'alarma'],
  corrupcion:   ['corrupción', 'imputado', 'fraude', 'escándalo', 'condena'],
  recuperacion: ['recuperación', 'recupera', 'mejora', 'avanza', 'récord'],
  polarizacion: ['polariza', 'enfrenta', 'choque', 'tensión', 'división'],
  soberania:    ['soberanía', 'independencia', 'autodeterminación'],
  seguridad:    ['seguridad', 'orden', 'control', 'frontera'],
  pueblo:       ['pueblo', 'ciudadanos', 'gente'],
  elites:       ['élite', 'casta', 'oligarquía'],
  oportunidad:  ['oportunidad', 'futuro', 'avance', 'innovación'],
}

function extractNarratives(articles: MediaArticle[]): { frame: string; count: number; examples: string[] }[] {
  const result: { frame: string; count: number; examples: string[] }[] = []
  for (const [frame, kws] of Object.entries(NARRATIVE_FRAMES)) {
    const matches = articles.filter((a) =>
      kws.some((kw) => `${a.title} ${a.description || ''}`.toLowerCase().includes(kw))
    )
    if (matches.length >= 2) {
      result.push({
        frame,
        count: matches.length,
        examples: matches.slice(0, 3).map((m) => m.title),
      })
    }
  }
  return result.sort((a, b) => b.count - a.count)
}

// Resolver sourceGroups → array de dominios
function domainsFromSourceGroups(groups: SourceGroup[]): string[] {
  const domains: string[] = []
  for (const g of groups) {
    const range = IDEOLOGY_RANGES[g]
    if (!range) continue
    let filtered: CatalogMedio[] = []
    if (g === 'economic') {
      filtered = CATALOG.filter((m) => m.grupo?.toLowerCase().includes('econ') || /expansion|cinco-dias|el-economista/.test(m.id))
    } else if (g === 'international') {
      filtered = CATALOG.filter((m) => m.ambito === 'internacional' || m.ambito === 'europeo')
    } else if (g === 'regional') {
      filtered = CATALOG.filter((m) => m.ambito === 'autonomico' || m.ambito === 'regional')
    } else if (g === 'fact-checkers') {
      filtered = CATALOG.filter((m) => /maldita|newtral|verifica|verificat/.test(m.id))
    } else {
      filtered = CATALOG.filter((m) => m.ideologia >= range.min && m.ideologia < range.max)
    }
    for (const m of filtered) {
      try {
        const u = new URL(m.web.startsWith('http') ? m.web : `https://${m.web}`)
        domains.push(u.hostname.replace(/^www\./, ''))
      } catch {}
    }
  }
  return Array.from(new Set(domains))
}

// ── Núcleo: ejecuta la búsqueda enriquecida ──────────────────────────────
async function runSearch(req: MediaSearchRequest) {
  const apiKey = process.env.NEWSAPI_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'NEWSAPI_KEY not configured',
        hint: 'Define NEWSAPI_KEY en Vercel env vars o usa /api/medios/intel para RSS fallback',
        data_quality: { source_type: 'missing', source_name: 'NewsAPI' },
      },
      { status: 503 },
    )
  }
  if (!req.query || !req.query.trim()) {
    return NextResponse.json({ ok: false, error: 'query required' }, { status: 400 })
  }

  // Resolve domains (combina explícitos + sourceGroups)
  let domains: string[] = req.domains || []
  if (req.sourceGroups?.length) {
    domains = [...domains, ...domainsFromSourceGroups(req.sourceGroups)]
    domains = Array.from(new Set(domains))
  }
  const excludeDomains = req.excludeDomains || []

  // Construir params NewsAPI
  const params: Record<string, string> = {
    q: req.query,
    language: req.language || 'es',
    sortBy: req.sortBy || 'publishedAt',
    pageSize: String(Math.min(req.pageSize || 50, 100)),
    page: String(req.page || 1),
  }
  if (req.from) params.from = req.from
  if (req.to) params.to = req.to
  if (req.searchIn?.length) params.searchIn = req.searchIn.join(',')
  if (domains.length) params.domains = domains.slice(0, 20).join(',')
  if (excludeDomains.length) params.excludeDomains = excludeDomains.slice(0, 20).join(',')

  const data = await newsapiFetch('/everything', params)
  if (data.error) {
    return NextResponse.json(
      {
        ok: false,
        error: data.error,
        data_quality: { source_type: 'missing', source_name: 'NewsAPI', note: data.error },
      },
      { status: data.error === 'rate_limited' ? 429 : 502 },
    )
  }

  // Mapear artículos
  const articles: MediaArticle[] = (data.articles || []).map((a: any) => {
    const domain = domainFromUrl(a.url || '')
    const text = `${a.title} ${a.description || ''}`
    return {
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.urlToImage,
      source: a.source?.name || domain,
      source_id: a.source?.id || null,
      domain,
      author: a.author,
      published: a.publishedAt,
      language: req.language || 'es',
      sentiment_score: sentimentScore(text),
      ideology_bucket: ideologyBucket(domain),
    }
  })

  // Agregaciones enriquecidas
  const timelineMap = new Map<string, number>()
  const sourceMap = new Map<string, number>()
  const domainMap = new Map<string, number>()
  let posCount = 0, negCount = 0, neuCount = 0, sentSum = 0

  for (const a of articles) {
    timelineMap.set(dateKey(a.published), (timelineMap.get(dateKey(a.published)) || 0) + 1)
    sourceMap.set(a.source, (sourceMap.get(a.source) || 0) + 1)
    if (a.domain) domainMap.set(a.domain, (domainMap.get(a.domain) || 0) + 1)
    const s = a.sentiment_score || 0
    sentSum += s
    if (s > 0.1) posCount++
    else if (s < -0.1) negCount++
    else neuCount++
  }

  const timeline = Array.from(timelineMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const topSources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  const topDomains = Array.from(domainMap.entries())
    .map(([domain, count]) => ({ domain, count, ideology: ideologyBucket(domain) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  const sentiment = {
    score: articles.length ? sentSum / articles.length : 0,
    positive: posCount,
    negative: negCount,
    neutral: neuCount,
  }

  // Ideological comparison (solo si sourceGroups requested o si encontramos bucket auto)
  const buckets = new Map<SourceGroup, { count: number; senSum: number; frames: Map<string, number> }>()
  for (const a of articles) {
    if (!a.ideology_bucket) continue
    if (!buckets.has(a.ideology_bucket)) {
      buckets.set(a.ideology_bucket, { count: 0, senSum: 0, frames: new Map() })
    }
    const b = buckets.get(a.ideology_bucket)!
    b.count++
    b.senSum += a.sentiment_score || 0
    const text = (a.title + ' ' + (a.description || '')).toLowerCase()
    for (const [frame, kws] of Object.entries(NARRATIVE_FRAMES)) {
      if (kws.some((kw) => text.includes(kw))) {
        b.frames.set(frame, (b.frames.get(frame) || 0) + 1)
      }
    }
  }
  const ideologicalComparison = Array.from(buckets.entries()).map(([bucket, v]) => ({
    bucket,
    count: v.count,
    sentiment: v.count ? v.senSum / v.count : 0,
    dominantFrames: Array.from(v.frames.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([frame]) => frame),
  }))

  return NextResponse.json({
    ok: true,
    query: req.query,
    mode: req.mode || 'quick',
    data_quality: { source_type: 'live', source_name: 'NewsAPI · everything' },
    totalResults: data.totalResults || 0,
    n_articles: articles.length,
    articles,
    timeline,
    topSources,
    topDomains,
    actors: extractActors(articles),
    topics: extractTopics(articles),
    narratives: extractNarratives(articles),
    sentiment,
    ideologicalComparison: ideologicalComparison.length ? ideologicalComparison : null,
    params_applied: {
      domains: domains.length,
      excludeDomains: excludeDomains.length,
      sourceGroups: req.sourceGroups || [],
      sortBy: params.sortBy,
      language: params.language,
      from: req.from || null,
      to: req.to || null,
    },
    request_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  })
}

// ── Handlers ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  const sourceGroupsParam = url.searchParams.get('sourceGroups')
  const domainsParam = url.searchParams.get('domains')
  const excludeDomainsParam = url.searchParams.get('excludeDomains')
  const searchInParam = url.searchParams.get('searchIn')

  const request: MediaSearchRequest = {
    query: q,
    mode: (url.searchParams.get('mode') as any) || 'quick',
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    language: (url.searchParams.get('language') as any) || 'es',
    domains: domainsParam ? domainsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    excludeDomains: excludeDomainsParam ? excludeDomainsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    sourceGroups: sourceGroupsParam ? (sourceGroupsParam.split(',').map((s) => s.trim()) as SourceGroup[]) : undefined,
    sortBy: (url.searchParams.get('sortBy') as any) || 'publishedAt',
    searchIn: searchInParam ? (searchInParam.split(',') as any) : undefined,
    pageSize: parseInt(url.searchParams.get('pageSize') || '50', 10),
    page: parseInt(url.searchParams.get('page') || '1', 10),
  }
  return runSearch(request)
}

export async function POST(req: Request) {
  let body: MediaSearchRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 })
  }
  return runSearch(body)
}
