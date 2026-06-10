/**
 * lib/energia/news.ts · Agregador KEYLESS de NOTICIAS de energía (España + UE)
 *
 * Alimenta los bloques "noticias del día" y "noticias de la semana" del sector
 * energía a partir de un CATÁLOGO curado de feeds RSS públicos (sin API key).
 *
 * Diseño:
 *   - Reutiliza fetchRSS(url, timeoutMs) de '@/lib/rss' (parser propio, sin deps).
 *   - Promise.allSettled sobre TODOS los feeds → degradación por fuente: si un
 *     feed cae, va a `fuentes_error` y el resto sigue. NUNCA lanza.
 *   - Clasificación temática por keywords ES (classifyEnergySubtopic).
 *   - Deduplicación por título+link normalizados.
 *   - Particiona en `hoy` (<=36h) y `semana` (<=7d) y ordena por fecha desc.
 *
 * Notas de fuentes: las URLs son feeds RSS reales y públicos de medios y
 * organismos del sector. Algunas (marcadas `verify:true`) podrían cambiar de
 * ruta con el tiempo; si fallan, degradan solas (van a `fuentes_error`) sin
 * romper el agregado. NO se inventan datos: una fuente caída = array vacío + error.
 *
 * Cero claves. Cero emojis. Cero dependencias externas. ACCENT energía: '#16A34A'.
 */

import { fetchRSS, type RSSItem } from '@/lib/rss'

// ───────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ───────────────────────────────────────────────────────────────────────────

export type EnergySubtopic =
  | 'electrico'
  | 'renovables'
  | 'nuclear'
  | 'petroleo'
  | 'gas'
  | 'hidrogeno'
  | 'politica'
  | 'mercado'
  | 'general'

export interface EnergyNewsItem {
  title: string
  link: string
  source: string
  source_url: string
  /** ISO string de publicación, o null si el feed no trae fecha parseable. */
  published: string | null
  summary: string
  subtopic: EnergySubtopic
  /** Antigüedad en horas desde `published` hasta `fetched_at`, o null si sin fecha. */
  age_hours: number | null
}

export interface EnergyNewsSourceError {
  source: string
  error: string
}

export interface EnergyNewsResult {
  ok: boolean
  items: EnergyNewsItem[]
  /** Subconjunto con age_hours <= 36 (o sin fecha pero presentes en feed reciente). */
  hoy: EnergyNewsItem[]
  /** Subconjunto con age_hours <= 168 (7 días). */
  semana: EnergyNewsItem[]
  por_subtopic: Record<string, number>
  fuentes_ok: string[]
  fuentes_error: EnergyNewsSourceError[]
  fetched_at: string
}

export interface FetchEnergyNewsOptions {
  /** Filtra resultados a un único subtopic (tras la clasificación). */
  subtopic?: EnergySubtopic
  /** Ventana máxima de antigüedad en horas para `items` (default 168 = 7d). */
  sinceHours?: number
  /** Máximo de items por feed tras ordenar por fecha (default 20). */
  maxPerFeed?: number
  /** Timeout por feed en ms (default 8000). */
  timeoutMs?: number
}

// ───────────────────────────────────────────────────────────────────────────
// Catálogo curado de feeds RSS de energía (España + UE), KEYLESS
// ───────────────────────────────────────────────────────────────────────────

interface EnergyFeed {
  /** Nombre legible de la fuente. */
  source: string
  /** URL del feed RSS/Atom. */
  url: string
  /** Sesgo temático por defecto del feed (hint, no override de la clasificación). */
  bias: EnergySubtopic
  /** Ámbito geográfico. */
  scope: 'ES' | 'UE'
  /** true si la ruta RSS exacta podría haber cambiado; se incluye igualmente (degrada sola). */
  verify?: boolean
}

/**
 * 16 feeds. Mezcla medios especializados (electricidad/renovables/H2/gas/petróleo),
 * organismos reguladores (CNMC, REE/Redeia, MITECO) y prensa económica generalista.
 * Si alguno falla, degrada solo y aparece en `fuentes_error`.
 */
export const ENERGY_FEEDS: readonly EnergyFeed[] = [
  // — Medios especializados ES —
  { source: 'El Periódico de la Energía', url: 'https://elperiodicodelaenergia.com/feed/', bias: 'general', scope: 'ES' },
  { source: 'Energías Renovables', url: 'https://www.energias-renovables.com/rss', bias: 'renovables', scope: 'ES' },
  { source: 'pv magazine España', url: 'https://www.pv-magazine.es/feed/', bias: 'renovables', scope: 'ES' },
  { source: 'Energía Estratégica', url: 'https://www.energiaestrategica.es/feed/', bias: 'renovables', scope: 'ES' },
  { source: 'El Confidencial Energía', url: 'https://www.elconfidencial.com/rss/empresas/energia/', bias: 'mercado', scope: 'ES', verify: true },

  // — Organismos / reguladores ES —
  { source: 'CNMC (notas de prensa)', url: 'https://www.cnmc.es/rss', bias: 'politica', scope: 'ES', verify: true },
  { source: 'Redeia / Red Eléctrica (sala de prensa)', url: 'https://www.ree.es/es/rss/sala-de-prensa', bias: 'electrico', scope: 'ES', verify: true },
  { source: 'MITECO (Transición Ecológica)', url: 'https://www.miteco.gob.es/es/prensa/ultimas-noticias.rss', bias: 'politica', scope: 'ES', verify: true },

  // — Asociaciones sectoriales ES —
  { source: 'Foro Nuclear', url: 'https://www.foronuclear.org/feed/', bias: 'nuclear', scope: 'ES', verify: true },
  { source: 'AOP (petróleo)', url: 'https://www.aop.es/feed/', bias: 'petroleo', scope: 'ES', verify: true },
  { source: 'AeH2 (hidrógeno)', url: 'https://aeh2.org/feed/', bias: 'hidrogeno', scope: 'ES', verify: true },
  { source: 'Sedigás (gas)', url: 'https://www.sedigas.es/feed/', bias: 'gas', scope: 'ES', verify: true },

  // — Prensa económica generalista ES (secciones de energía/economía) —
  { source: 'Europa Press · Economía', url: 'https://www.europapress.es/rss/rss.aspx?ch=00132', bias: 'mercado', scope: 'ES', verify: true },
  { source: 'Expansión · Empresas', url: 'https://e00-expansion.uecdn.es/rss/empresas.xml', bias: 'mercado', scope: 'ES', verify: true },
  { source: 'El País · Economía', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada', bias: 'mercado', scope: 'ES', verify: true },

  // — UE —
  { source: 'pv magazine (Global/EU)', url: 'https://www.pv-magazine.com/feed/', bias: 'renovables', scope: 'UE' },
] as const

// ───────────────────────────────────────────────────────────────────────────
// Clasificación temática por keywords ES
// ───────────────────────────────────────────────────────────────────────────

/** Diccionario keyword → subtopic. Orden de evaluación: específicos antes que genéricos. */
const SUBTOPIC_RULES: Array<{ subtopic: EnergySubtopic; kw: RegExp }> = [
  {
    subtopic: 'hidrogeno',
    kw: /\b(hidr[óo]geno|h2\b|electroliz|electrolizador|hydrogen|pila de combustible|fuel cell|amon[íi]aco verde)\b/i,
  },
  {
    subtopic: 'nuclear',
    kw: /\b(nuclear|reactor|atom|uranio|smr\b|alm[áa]raz|cofrentes|ascó|asco\b|vandell[óo]s|trillo|garo[ñn]a|fisi[óo]n|fusi[óo]n nuclear|enusa|enresa)\b/i,
  },
  {
    subtopic: 'petroleo',
    kw: /\b(petr[óo]leo|crudo|brent|wti|refino|refiner[íi]a|gasolina|di[ée]sel|carburante|combustible f[óo]sil|opep|opec|barril)\b/i,
  },
  {
    subtopic: 'gas',
    kw: /\b(\bgas\b|gnl|lng|mibgas|ttf|gasoducto|regasificaci[óo]n|metanero|midcat|h2med|barmar|gas natural|biogas|biomet[áa]no)\b/i,
  },
  {
    subtopic: 'renovables',
    kw: /\b(e[óo]lic[ao]|solar|fotovoltaic[ao]|fotovoltaica|renovable|autoconsumo|aerogenerador|offshore|repotenciaci[óo]n|biomasa|geot[ée]rmica|hidr[áa]ulica|almacenamiento|bater[íi]a|storage)\b/i,
  },
  {
    subtopic: 'politica',
    kw: /\b(boe\b|decreto|real decreto|cnmc|pniec|miteco|ministerio|subasta|regulaci[óo]n|tarifa|peaje|cargo|retribuci[óo]n|directiva|reglamento ue|bruselas|comisi[óo]n europea|impuesto|gravamen|fiscal)\b/i,
  },
  {
    subtopic: 'mercado',
    kw: /\b(precio|mercado|pool|omie|omip|spot|day-ahead|cotizaci[óo]n|ppa\b|futuros|mibel|coste|tarifa de la luz|factura|recibo de la luz)\b/i,
  },
  {
    subtopic: 'electrico',
    kw: /\b(el[ée]ctric[ao]|electricidad|red el[ée]ctrica|redeia|\bree\b|demanda el[ée]ctrica|interconexi[óo]n|apag[óo]n|cero energ[ée]tico|tendido|subestaci[óo]n|transformador|megavatio|gigavatio|mw\b|gw\b)\b/i,
  },
]

/**
 * Clasifica una noticia de energía en un subtopic a partir de título + resumen.
 * Aplica las reglas en orden (específicas antes que genéricas). Si nada casa,
 * devuelve 'general'. Nunca lanza.
 */
export function classifyEnergySubtopic(title: string, summary: string): EnergySubtopic {
  const text = `${title || ''} ${summary || ''}`.toLowerCase()
  if (!text.trim()) return 'general'
  for (const rule of SUBTOPIC_RULES) {
    if (rule.kw.test(text)) return rule.subtopic
  }
  return 'general'
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers internos
// ───────────────────────────────────────────────────────────────────────────

const HORA_MS = 3600 * 1000
const HOY_MAX_H = 36
const SEMANA_MAX_H = 168

/** Normaliza string para dedupe: minúsculas, sin acentos, sin puntuación, colapsado. */
function normKey(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Calcula horas transcurridas entre published y ref. null si sin fecha. */
function ageHours(published: Date | null, refMs: number): number | null {
  if (!published) return null
  const diff = refMs - published.getTime()
  if (!Number.isFinite(diff)) return null
  return Math.max(0, Math.round((diff / HORA_MS) * 10) / 10)
}

/** Convierte un RSSItem crudo + metadatos de feed en EnergyNewsItem. */
function toNewsItem(raw: RSSItem, feed: EnergyFeed, refMs: number): EnergyNewsItem | null {
  const title = (raw.title || '').trim()
  const link = (raw.link || '').trim()
  if (!title || !link) return null
  const summary = (raw.description || '').trim()
  const subtopic = classifyEnergySubtopic(title, summary)
  return {
    title,
    link,
    source: feed.source,
    source_url: feed.url,
    published: raw.pubDate ? raw.pubDate.toISOString() : null,
    summary: summary.slice(0, 400),
    subtopic,
    age_hours: ageHours(raw.pubDate, refMs),
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Agregador principal
// ───────────────────────────────────────────────────────────────────────────

/**
 * Agrega noticias de energía de todo el catálogo RSS en paralelo.
 *
 * Garantías:
 *   - NUNCA lanza: cada feed se aísla con allSettled + try/catch interno de fetchRSS.
 *   - Degrada por fuente → `fuentes_error` con {source, error}.
 *   - `ok` es true si al menos un feed devolvió items; false si todos fallaron.
 */
export async function fetchEnergyNews(opts: FetchEnergyNewsOptions = {}): Promise<EnergyNewsResult> {
  const {
    subtopic,
    sinceHours = SEMANA_MAX_H,
    maxPerFeed = 20,
    timeoutMs = 8000,
  } = opts

  const fetchedAt = new Date()
  const refMs = fetchedAt.getTime()

  const settled = await Promise.allSettled(
    ENERGY_FEEDS.map(async (feed) => {
      const r = await fetchRSS(feed.url, timeoutMs)
      return { feed, r }
    }),
  )

  const fuentesOk: string[] = []
  const fuentesError: EnergyNewsSourceError[] = []
  const collected: EnergyNewsItem[] = []

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i]
    const feed = ENERGY_FEEDS[i]

    // allSettled nunca rejecta por nuestro async (fetchRSS captura), pero
    // protegemos por si acaso para garantizar "nunca lanza".
    if (outcome.status === 'rejected') {
      fuentesError.push({
        source: feed.source,
        error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
      })
      continue
    }

    const { r } = outcome.value
    if (!r.ok) {
      fuentesError.push({ source: feed.source, error: r.error || 'feed sin datos' })
      continue
    }

    // Normaliza + ordena por fecha desc dentro del feed + recorta a maxPerFeed.
    const feedItems = r.items
      .map((raw) => toNewsItem(raw, feed, refMs))
      .filter((x): x is EnergyNewsItem => x !== null)
      .sort((a, b) => dateRank(b.published) - dateRank(a.published))
      .slice(0, Math.max(1, maxPerFeed))

    if (feedItems.length > 0) {
      fuentesOk.push(feed.source)
      collected.push(...feedItems)
    } else {
      // Feed respondió OK pero sin items útiles → lo marcamos como error suave.
      fuentesError.push({ source: feed.source, error: 'feed sin entradas válidas' })
    }
  }

  // Dedupe global por título+link normalizados (se queda el primero, ya ordenado por feed).
  const seen = new Set<string>()
  let deduped: EnergyNewsItem[] = []
  for (const it of collected) {
    const key = `${normKey(it.title)}::${normKey(it.link)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
  }

  // Filtro por subtopic si se pidió.
  if (subtopic) {
    deduped = deduped.filter((x) => x.subtopic === subtopic)
  }

  // Filtro por ventana sinceHours: items SIN fecha se conservan (no se pueden
  // descartar por antigüedad, pero no se ocultan; aparecerán fuera de hoy/semana).
  const within = (h: number | null, max: number) => h === null || h <= max
  const filtered = deduped.filter((x) => within(x.age_hours, sinceHours))

  // Orden global por fecha desc (sin fecha al final).
  filtered.sort((a, b) => dateRank(b.published) - dateRank(a.published))

  const hoy = filtered.filter((x) => x.age_hours !== null && x.age_hours <= HOY_MAX_H)
  const semana = filtered.filter((x) => x.age_hours !== null && x.age_hours <= SEMANA_MAX_H)

  // Agregado por subtopic sobre el conjunto filtrado final.
  const porSubtopic: Record<string, number> = {}
  for (const x of filtered) {
    porSubtopic[x.subtopic] = (porSubtopic[x.subtopic] || 0) + 1
  }

  return {
    ok: fuentesOk.length > 0,
    items: filtered,
    hoy,
    semana,
    por_subtopic: porSubtopic,
    fuentes_ok: fuentesOk,
    fuentes_error: fuentesError,
    fetched_at: fetchedAt.toISOString(),
  }
}

/** Rank numérico para ordenar por fecha; items sin fecha quedan al final (-Infinity). */
function dateRank(iso: string | null): number {
  if (!iso) return -Infinity
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : -Infinity
}
