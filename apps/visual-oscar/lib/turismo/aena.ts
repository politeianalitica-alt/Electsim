/**
 * Cliente AENA · pasajeros por aeropuerto español · Turismo v3 · Sprint T2-cross
 *
 * Tráfico de pasajeros de la red de aeropuertos de AENA (los 46 aeropuertos +
 * 2 helipuertos que gestiona en España). El turismo internacional entra a
 * España fundamentalmente por avión (~80% de las llegadas FRONTUR) → la
 * conectividad aérea es el cuello de botella físico del sector.
 *
 * ── FUENTE ────────────────────────────────────────────────────────────────
 * AENA publica las estadísticas oficiales de tráfico en su portal corporativo
 * (`aena.es/es/estadisticas`) y, en abierto, vía datos.gob.es (catálogo
 * "Estadísticas de tráfico aéreo" · organismo ENAIRE/AENA). NO hay una API
 * REST estable y versionada: son ficheros (CSV/XLS) mensuales por aeropuerto.
 *
 * Por eso la estrategia es DEGRADACIÓN HONESTA con dos niveles:
 *   1) Si `AENA_TRAFFIC_CSV_URL` apunta a un CSV público de datos.gob.es con el
 *      tráfico anual por aeropuerto, se parsea en vivo (helper `parseAenaCsv`).
 *      El formato esperado es flexible: detecta columnas de código IATA,
 *      nombre y pasajeros por heurística de cabecera.
 *   2) Si no hay CSV (caso por defecto), se sirve el CATÁLOGO CURADO Y DATADO
 *      `AENA_AEROPUERTOS` con el tráfico anual de los aeropuertos top y su
 *      fuente. Cada registro lleva `source` honesto ('catalog' | 'live').
 *
 * Patrón Politeia (igual que `lib/energia/agsi.ts`): respuesta
 * `{ ok, data|null, error?, fetched_at, source_url }`, caché TTL en memoria,
 * helpers PUROS (`parseAenaCsv`, `buildAenaResponse`) testeables con fixtures.
 * Cero secretos hardcodeados; el CSV opcional vive en una env var.
 *
 * Docs: https://www.aena.es/es/estadisticas/inicio.html ·
 *       https://datos.gob.es (buscar "tráfico aéreo AENA")
 */

// ─────────────────────────────────────────────────────────────────────────
// Tipos (propios de este lib)
// ─────────────────────────────────────────────────────────────────────────

export interface AenaAirport {
  /** Código IATA del aeropuerto (MAD, BCN, PMI…). */
  codigo: string
  /** Nombre legible del aeropuerto. */
  aeropuerto: string
  /** Pasajeros totales (último año disponible). null si no hay dato. */
  pasajeros: number | null
  /** % de pasajeros internacionales sobre el total. null si no curado. */
  intl_pct?: number | null
  /** Variación interanual de pasajeros en %. null si no disponible. */
  yoy_pct?: number | null
  /** Comunidad autónoma donde se ubica (contexto territorial). */
  ccaa?: string
  /** Procedencia del dato de este registro. */
  source: 'live' | 'catalog'
}

export interface AenaData {
  /** Año de referencia de las cifras (curado o detectado del CSV). */
  anio_ref: number | null
  /** Aeropuertos ordenados por pasajeros descendente. */
  aeropuertos: AenaAirport[]
  /** Suma de pasajeros de los aeropuertos incluidos. */
  total_pasajeros: number | null
  /** 'live' si todo el conjunto viene de CSV; 'catalog' si es curado. */
  source: 'live' | 'catalog'
  /** Nota de metodología / procedencia. */
  nota: string
}

export interface AenaResponse {
  ok: boolean
  data: AenaData | null
  error?: string
  fetched_at: string
  source_url: string
}

const PUBLIC_URL = 'https://www.aena.es/es/estadisticas/inicio.html'
const DATOS_GOB_URL = 'https://datos.gob.es/es/catalogo?q=tr%C3%A1fico+a%C3%A9reo+aena'
const DEFAULT_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 12 * 3600_000 // 12h · el dato es mensual/anual

// ─────────────────────────────────────────────────────────────────────────
// Catálogo curado + DATADO · top aeropuertos de la red AENA por pasajeros.
// Cifras: tráfico de pasajeros año natural 2024 (estadísticas anuales AENA,
// publicadas ene-2025). Redondeadas al millar. intl_pct es estructural
// (proporción internacional típica del aeropuerto, no varía mes a mes).
// Fuente: AENA · Estadísticas de tráfico aéreo (aena.es) · datos 2024.
// ─────────────────────────────────────────────────────────────────────────

/** Año natural al que corresponden las cifras curadas. */
export const AENA_ANIO_REF = 2024

export const AENA_FUENTE =
  'AENA · Estadísticas de tráfico aéreo (aena.es) · datos año 2024 · publicado ene-2025'

export const AENA_AEROPUERTOS: AenaAirport[] = [
  { codigo: 'MAD', aeropuerto: 'Adolfo Suárez Madrid-Barajas', pasajeros: 66_141_000, intl_pct: 70, ccaa: 'Madrid', source: 'catalog' },
  { codigo: 'BCN', aeropuerto: 'Josep Tarradellas Barcelona-El Prat', pasajeros: 55_039_000, intl_pct: 73, ccaa: 'Cataluña', source: 'catalog' },
  { codigo: 'PMI', aeropuerto: 'Palma de Mallorca', pasajeros: 33_303_000, intl_pct: 79, ccaa: 'Illes Balears', source: 'catalog' },
  { codigo: 'AGP', aeropuerto: 'Málaga-Costa del Sol', pasajeros: 25_309_000, intl_pct: 78, ccaa: 'Andalucía', source: 'catalog' },
  { codigo: 'ALC', aeropuerto: 'Alicante-Elche Miguel Hernández', pasajeros: 18_399_000, intl_pct: 79, ccaa: 'Comunitat Valenciana', source: 'catalog' },
  { codigo: 'TFS', aeropuerto: 'Tenerife Sur', pasajeros: 13_204_000, intl_pct: 80, ccaa: 'Canarias', source: 'catalog' },
  { codigo: 'IBZ', aeropuerto: 'Ibiza', pasajeros: 9_303_000, intl_pct: 60, ccaa: 'Illes Balears', source: 'catalog' },
  { codigo: 'LPA', aeropuerto: 'Gran Canaria', pasajeros: 14_736_000, intl_pct: 56, ccaa: 'Canarias', source: 'catalog' },
  { codigo: 'TFN', aeropuerto: 'Tenerife Norte-Ciudad de La Laguna', pasajeros: 6_565_000, intl_pct: 18, ccaa: 'Canarias', source: 'catalog' },
  { codigo: 'VLC', aeropuerto: 'Valencia', pasajeros: 10_711_000, intl_pct: 65, ccaa: 'Comunitat Valenciana', source: 'catalog' },
  { codigo: 'SVQ', aeropuerto: 'Sevilla', pasajeros: 8_840_000, intl_pct: 55, ccaa: 'Andalucía', source: 'catalog' },
  { codigo: 'BIO', aeropuerto: 'Bilbao', pasajeros: 6_700_000, intl_pct: 40, ccaa: 'País Vasco', source: 'catalog' },
  { codigo: 'ACE', aeropuerto: 'Lanzarote-César Manrique', pasajeros: 8_120_000, intl_pct: 70, ccaa: 'Canarias', source: 'catalog' },
  { codigo: 'FUE', aeropuerto: 'Fuerteventura', pasajeros: 6_700_000, intl_pct: 75, ccaa: 'Canarias', source: 'catalog' },
  { codigo: 'SCQ', aeropuerto: 'Santiago-Rosalía de Castro', pasajeros: 3_180_000, intl_pct: 30, ccaa: 'Galicia', source: 'catalog' },
  { codigo: 'MAH', aeropuerto: 'Menorca', pasajeros: 3_660_000, intl_pct: 55, ccaa: 'Illes Balears', source: 'catalog' },
  { codigo: 'GRO', aeropuerto: 'Girona-Costa Brava', pasajeros: 2_024_000, intl_pct: 88, ccaa: 'Cataluña', source: 'catalog' },
  { codigo: 'OVD', aeropuerto: 'Asturias', pasajeros: 1_700_000, intl_pct: 15, ccaa: 'Principado de Asturias', source: 'catalog' },
  { codigo: 'GRX', aeropuerto: 'F.G.L. Granada-Jaén', pasajeros: 1_500_000, intl_pct: 18, ccaa: 'Andalucía', source: 'catalog' },
  { codigo: 'XRY', aeropuerto: 'Jerez', pasajeros: 1_180_000, intl_pct: 45, ccaa: 'Andalucía', source: 'catalog' },
]

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (sin red) · testeables con fixtures
// ─────────────────────────────────────────────────────────────────────────

/** Normaliza un código IATA a 3 letras mayúsculas. '' si no es válido. */
export function normIata(v: unknown): string {
  if (v == null) return ''
  const s = String(v).trim().toUpperCase()
  return /^[A-Z]{3}$/.test(s) ? s : ''
}

/**
 * Parsea un número tolerando separadores de miles europeos ("1.234.567"),
 * decimales con coma, espacios y marcadores de hueco. null si no es número.
 */
export function parseAenaNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).trim()
  if (s === '' || s === '-' || s === 'n/a' || s.toLowerCase() === 'nd') return null
  // Quita separadores de miles (. o espacio) y normaliza coma decimal.
  s = s.replace(/\s+/g, '')
  if (s.includes(',') && s.includes('.')) {
    // "1.234.567,89" → "1234567.89"
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes('.') && /\.\d{3}(\D|$)/.test(s)) {
    // "1.234.567" (miles) → "1234567"
    s = s.replace(/\./g, '')
  } else {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Divide una línea CSV respetando comillas dobles simples. */
function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQ = !inQ
      }
    } else if (ch === delim && !inQ) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((c) => c.trim())
}

/** Quita acentos/diacríticos para comparar cabeceras. */
function deaccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Parsea un CSV de tráfico AENA (datos.gob.es) en una lista de aeropuertos.
 * Detección flexible de columnas por cabecera:
 *   - código IATA: cabecera con "iata" / "codigo" / "code"
 *   - nombre:      cabecera con "aeropuerto" / "nombre" / "name" / "airport"
 *   - pasajeros:   cabecera con "pasajero" / "passenger" / "pax" / "total"
 * Pura: testeable con un fixture de texto CSV. Devuelve [] si no puede mapear.
 */
export function parseAenaCsv(csv: string): AenaAirport[] {
  if (!csv || typeof csv !== 'string') return []
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) return []

  // Detecta delimitador por la cabecera (; típico en datos.gob.es ES).
  const header = lines[0]
  const delim = (header.match(/;/g)?.length ?? 0) >= (header.match(/,/g)?.length ?? 0) ? ';' : ','
  const cols = splitCsvLine(header, delim).map(deaccent)

  const idxIata = cols.findIndex((c) => /iata|^codigo$|^code$|cod_iata/.test(c))
  const idxName = cols.findIndex((c) => /aeropuerto|nombre|airport|^name$/.test(c))
  const idxPax = cols.findIndex((c) => /pasajero|passenger|\bpax\b|total/.test(c))

  if (idxPax === -1 || (idxIata === -1 && idxName === -1)) return []

  const out: AenaAirport[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delim)
    if (cells.length <= idxPax) continue
    const codigo = idxIata >= 0 ? normIata(cells[idxIata]) : ''
    const nombre = idxName >= 0 ? cells[idxName] : codigo
    const pax = parseAenaNum(cells[idxPax])
    if (!codigo && !nombre) continue
    if (pax == null) continue
    out.push({
      codigo: codigo || nombre.slice(0, 3).toUpperCase(),
      aeropuerto: nombre || codigo,
      pasajeros: pax,
      source: 'live',
    })
  }
  return out
}

/**
 * Ensambla la respuesta de AENA a partir de una lista de aeropuertos (de CSV o
 * del catálogo). Ordena por pasajeros desc, recorta a `limit`, calcula total.
 * Pura: testeable. `source` refleja la procedencia del conjunto.
 */
export function buildAenaResponse(
  airports: AenaAirport[],
  opts: { anio_ref: number | null; source: 'live' | 'catalog'; nota: string; limit?: number },
): AenaData {
  const sorted = airports
    .filter((a) => a.pasajeros != null)
    .slice()
    .sort((a, b) => (b.pasajeros ?? 0) - (a.pasajeros ?? 0))
  const limited = opts.limit != null ? sorted.slice(0, opts.limit) : sorted
  const total = limited.reduce((s, a) => s + (a.pasajeros ?? 0), 0)
  return {
    anio_ref: opts.anio_ref,
    aeropuertos: limited,
    total_pasajeros: limited.length ? total : null,
    source: opts.source,
    nota: opts.nota,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 12h
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry { expires: number; value: AenaResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearAenaCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// API pública (con red opcional + degradación a catálogo)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchAenaOpts {
  /** Máximo de aeropuertos a devolver (default 20). */
  limit?: number
  /** Forzar refetch ignorando caché. */
  noCache?: boolean
  /** Timeout ms (default 15s). */
  timeoutMs?: number
}

/**
 * Devuelve el tráfico de pasajeros por aeropuerto de la red AENA. Si
 * `AENA_TRAFFIC_CSV_URL` está configurada, intenta parsear ese CSV público en
 * vivo; ante cualquier fallo cae al catálogo curado. NUNCA lanza: ante error
 * total devuelve el catálogo con `source:'catalog'` (siempre hay dato útil).
 */
export async function fetchAena(opts: FetchAenaOpts = {}): Promise<AenaResponse> {
  const fetched_at = new Date().toISOString()
  const limit = Number.isFinite(opts.limit as number)
    ? Math.max(1, Math.min(50, opts.limit as number))
    : 20

  const cacheKey = `aena:${limit}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  const csvUrl = process.env.AENA_TRAFFIC_CSV_URL || ''

  // Intento 1 · CSV público en vivo (si hay URL configurada).
  if (csvUrl) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
      const r = await fetch(csvUrl, {
        signal: ctrl.signal,
        next: { revalidate: 43200 },
      } as RequestInit)
      clearTimeout(t)
      if (r.ok) {
        const text = await r.text()
        const parsed = parseAenaCsv(text)
        if (parsed.length >= 3) {
          const data = buildAenaResponse(parsed, {
            anio_ref: null,
            source: 'live',
            nota: `Tráfico de pasajeros AENA · CSV abierto (datos.gob.es) · ${parsed.length} aeropuertos`,
            limit,
          })
          const result: AenaResponse = { ok: true, data, fetched_at, source_url: csvUrl }
          _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
          return result
        }
      }
    } catch {
      /* cae al catálogo */
    }
  }

  // Intento 2 · catálogo curado + datado (degradación honesta, siempre OK).
  const data = buildAenaResponse(AENA_AEROPUERTOS, {
    anio_ref: AENA_ANIO_REF,
    source: 'catalog',
    nota: `${AENA_FUENTE}. Catálogo curado de los ${Math.min(limit, AENA_AEROPUERTOS.length)} aeropuertos top de la red AENA. Para datos en vivo configura AENA_TRAFFIC_CSV_URL con un CSV de ${DATOS_GOB_URL}`,
    limit,
  })
  const result: AenaResponse = {
    ok: true,
    data,
    fetched_at,
    source_url: PUBLIC_URL,
  }
  _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
