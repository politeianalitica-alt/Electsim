/**
 * Helper GDELT DOC 2.0 · build-query.ts
 *
 * Encapsula la construcción del query string para GDELT y resuelve los
 * bugs comunes detectados en el audit (mayo 2026):
 *
 *  - Queries multi-palabra SIN comillas → GDELT trata cada palabra como OR
 *    implícito → 80%+ ruido. Solución: si el query tiene espacios y no
 *    está ya entrecomillado, lo encapsulamos.
 *
 *  - Falta `sourcelang:` cuando se busca prensa de un idioma concreto
 *    (España suele querer `sourcelang:spanish`). Lo añadimos opcional.
 *
 *  - Falta `sourcecountry:` cuando se quiere acotar a medios de un país.
 *
 *  - `format=json`, `maxrecords`, `timespan`, `sort` se aplican siempre
 *    con defaults sensatos.
 *
 *  - Rango de tone: GDELT devuelve -10 a +10 (artículos) o -100 a +100
 *    (timelinetone agregado). Documentamos qué interpretar según `mode`.
 *
 *  - Helper `fetchGdelt()` añade retry con backoff exponencial (2 intentos,
 *    5s/12s) para mitigar el rate-limit de GDELT (1 req cada ~5s).
 *
 * Docs API: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 */

export type GdeltMode =
  | 'artlist'
  | 'imagecollage'
  | 'tonechart'
  | 'timelinevol'
  | 'timelinevolraw'
  | 'timelinetone'
  | 'timelinelang'
  | 'timelinesourcecountry'
  | 'wordcloudimagewebtags'
  | 'wordcloudimagetags'
  | 'wordcloudenglish'

export type GdeltSort =
  | 'datedesc'        // más recientes primero
  | 'dateasc'         // más antiguos primero
  | 'hybridrel'       // recencia + relevancia (RECOMENDADO para top stories)
  | 'tonedesc'        // tono más positivo
  | 'toneasc'         // tono más negativo

/** Timespan acepta `{n}min`, `{n}h`, `{n}d`, `{n}w`, `{n}mon`, o `custom:YYYYMMDDHHMMSS-YYYYMMDDHHMMSS` */
export type GdeltTimespan = string

export interface BuildGdeltQueryOptions {
  /** Texto base. Si tiene espacios y no está entrecomillado, se entrecomilla. */
  query: string
  /** Filtro idioma fuente: 'spanish', 'english', 'french', etc. */
  sourcelang?: string
  /** Filtro país fuente (ISO2 minúsculas o nombre): 'ES', 'spain', 'fr', etc. */
  sourcecountry?: string
  /** Filtro dominio específico: 'elpais.com', 'reuters.com' */
  domain?: string
  /** Tema GKG (GDELT Knowledge Graph): 'ECON_INFLATION', 'MIL_DEPLOYMENT', etc. */
  theme?: string
  /** Filtro de tone: '<-5' (muy negativo), '>5' (muy positivo) */
  toneFilter?: string
  /** Operadores extra raw que el caller quiera añadir */
  extraOperators?: string[]
  mode?: GdeltMode
  timespan?: GdeltTimespan
  maxrecords?: number       // default 50
  sort?: GdeltSort          // default 'hybridrel' para artlist, sin defecto para timelines
}

/**
 * Construye la URL completa al endpoint GDELT DOC 2.0 aplicando los fixes.
 *
 * Ejemplo:
 *   buildGdeltDocUrl({ query: 'Spain crisis', sourcelang: 'spanish', mode: 'artlist' })
 *   →
 *   https://api.gdeltproject.org/api/v2/doc/doc?query=%22Spain+crisis%22+sourcelang%3Aspanish&mode=artlist&format=json&timespan=24h&maxrecords=50&sort=hybridrel
 */
export function buildGdeltDocUrl(opts: BuildGdeltQueryOptions): string {
  const {
    query,
    sourcelang,
    sourcecountry,
    domain,
    theme,
    toneFilter,
    extraOperators = [],
    mode = 'artlist',
    timespan = '24h',
    maxrecords = 50,
    sort,
  } = opts

  // 1. Si el query tiene espacios y no empieza con comilla, encapsulamos
  //    (fix bug query sin comillas)
  let normalizedQuery = query.trim()
  const hasSpaces = /\s/.test(normalizedQuery)
  const isQuoted = normalizedQuery.startsWith('"') && normalizedQuery.endsWith('"')
  if (hasSpaces && !isQuoted && !normalizedQuery.includes(' OR ') && !normalizedQuery.includes(' AND ')) {
    normalizedQuery = `"${normalizedQuery}"`
  }

  // 2. Concatenar operadores
  const parts = [normalizedQuery]
  if (sourcelang) parts.push(`sourcelang:${sourcelang}`)
  if (sourcecountry) parts.push(`sourcecountry:${sourcecountry}`)
  if (domain) parts.push(`domain:${domain}`)
  if (theme) parts.push(`theme:${theme}`)
  if (toneFilter) parts.push(`tone${toneFilter}`)
  for (const op of extraOperators) parts.push(op)
  const fullQuery = parts.join(' ')

  // 3. Resto de parámetros
  const params = new URLSearchParams()
  params.set('query', fullQuery)
  params.set('mode', mode)
  params.set('format', 'json')
  params.set('timespan', timespan)
  params.set('maxrecords', String(maxrecords))

  // Sort solo aplica a artlist por defecto; timelines no lo necesitan
  const sortToUse = sort ?? (mode === 'artlist' ? 'hybridrel' : undefined)
  if (sortToUse) params.set('sort', sortToUse)

  return `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`
}

/**
 * Wrapper fetch con retry exponencial para GDELT.
 * GDELT rate-limita ~1 req/5s; sin retry los endpoints fallan silenciosamente.
 *
 * Devuelve null si todos los intentos fallan o si el body no es JSON válido.
 */
export async function fetchGdeltJson<T = any>(
  url: string,
  options: { timeoutMs?: number; maxRetries?: number } = {},
): Promise<T | null> {
  const { timeoutMs = 9000, maxRetries = 2 } = options
  const backoffs = [0, 5000, 12000]   // ms entre intentos

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, backoffs[attempt]))
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const r = await fetch(url, { signal: ctrl.signal })
      clearTimeout(t)
      if (!r.ok) {
        if (r.status === 429 || r.status === 503) continue
        return null
      }
      const text = await r.text()
      try {
        return JSON.parse(text) as T
      } catch {
        return null   // GDELT a veces devuelve HTML cuando query es inválido
      }
    } catch {
      clearTimeout(t)
      // timeout o abort · seguir al siguiente intento
    }
  }
  return null
}

/**
 * Normaliza el `seendate` de GDELT (formato `YYYYMMDDTHHMMSSZ`) a ISO 8601.
 * Devuelve la string vacía si la entrada es inválida.
 */
export function normalizeGdeltDate(seendate: string | undefined | null): string {
  if (!seendate || typeof seendate !== 'string') return ''
  // GDELT usa YYYYMMDDTHHMMSSZ o YYYYMMDDHHMMSS
  const m = seendate.match(/^(\d{4})(\d{2})(\d{2})[T]?(\d{2})(\d{2})(\d{2})/)
  if (!m) return ''
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`
}

/**
 * Clamp del tone a su rango oficial GDELT.
 * - artlist devuelve tone por artículo: rango -10 a +10
 * - timelinetone devuelve tone agregado: rango similar -10 a +10 (no -100..+100
 *   contrariamente a malentendido común; la escala -100..+100 es para
 *   `gtone` que ya no usamos)
 */
export function clampGdeltTone(t: number | null | undefined): number {
  if (typeof t !== 'number' || isNaN(t)) return 0
  return Math.max(-10, Math.min(10, t))
}
