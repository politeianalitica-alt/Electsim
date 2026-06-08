/**
 * Cruceros · tráfico de pasajeros de crucero por puerto español · Turismo v3 ·
 * Sprint T2-cross
 *
 * España es la primera potencia de cruceros del Mediterráneo: Barcelona es el
 * principal homeport de Europa y, junto a Baleares, Málaga, Valencia, Canarias
 * y Cádiz, concentra el grueso del tráfico crucerístico. Este lib cruza Turismo
 * con el módulo Puertos.
 *
 * ── PRINCIPIO ANTI-DUPLICACIÓN (CLAUDE.md / spec) ──────────────────────────
 * El módulo Puertos (`lib/ports-handlers.ts`) cubre carga y AIS, NO el tráfico
 * de pasajeros de crucero por puerto (sus seeds tienen buques de tipo `cruise`
 * y algún puerto español, pero no las cifras de pasajeros de crucero). Por eso:
 *   - Las CIFRAS de pasajeros de crucero son CURADAS + DATADAS (fuente: Puertos
 *     del Estado · estadísticas de tráfico de pasajeros, año 2024).
 *   - Se hace un import DINÁMICO de ports-handlers para, cuando un puerto existe
 *     allí, enriquecer con su `slug`/coords y permitir deep-link al módulo
 *     Puertos SIN duplicar datos. El import es dinámico (igual que
 *     `lib/energia/energy-logistics.ts`) para no romper el harness de tests.
 *
 * Cada registro lleva `source` honesto: 'catalog' (cifras curadas) y, si se
 * cruzó con Puertos, `port_slug` para enlazar. NUNCA se inventan cifras.
 *
 * Patrón Politeia: `{ ok, data|null, error?, fetched_at, source_url }`, caché
 * TTL, helpers PUROS testeables.
 *
 * Docs: https://www.puertos.es/es-es/estadisticas (tráfico de pasajeros)
 */

// ─────────────────────────────────────────────────────────────────────────
// Tipos (propios de este lib)
// ─────────────────────────────────────────────────────────────────────────

export interface CruisePort {
  /** Nombre del puerto. */
  puerto: string
  /** Autoridad portuaria / sistema portuario. */
  autoridad?: string
  /** Pasajeros de crucero (año de referencia). null si no curado. */
  pasajeros_crucero: number | null
  /** Nº de escalas de buques de crucero en el año. null si no curado. */
  escalas?: number | null
  /** Cuota de homeport (embarque/desembarque) vs tránsito, si se conoce. */
  homeport_pct?: number | null
  /** Comunidad autónoma. */
  ccaa?: string
  /** Slug del puerto en el módulo Puertos (si existe) para deep-link. */
  port_slug?: string | null
  /** Latitud (constante geográfica · del módulo Puertos o curada). */
  lat?: number | null
  /** Longitud. */
  lon?: number | null
  /** Procedencia del registro. */
  source: 'catalog' | 'ports+catalog'
}

export interface CrucerosData {
  anio_ref: number | null
  puertos: CruisePort[]
  total_pasajeros: number | null
  /** Nº de puertos que se pudieron cruzar con el módulo Puertos. */
  cruzados_con_puertos: number
  source: 'catalog' | 'ports+catalog'
  nota: string
}

export interface CrucerosResponse {
  ok: boolean
  data: CrucerosData | null
  error?: string
  fetched_at: string
  source_url: string
}

const PUBLIC_URL = 'https://www.puertos.es/es-es/estadisticas'
const CACHE_TTL_MS = 12 * 3600_000

/** Año natural de las cifras curadas. */
export const CRUCEROS_ANIO_REF = 2024

export const CRUCEROS_FUENTE =
  'Puertos del Estado · estadísticas de tráfico de pasajeros de crucero · año 2024'

// ─────────────────────────────────────────────────────────────────────────
// Catálogo curado + DATADO · pasajeros de crucero por puerto español (2024).
// Cifras redondeadas al millar. homeport_pct: proporción de pasajeros que
// embarcan/desembarcan (homeport) frente a los que están en tránsito (escala).
// Fuente: Puertos del Estado · tráfico de pasajeros · año 2024.
// ─────────────────────────────────────────────────────────────────────────

export const CRUCEROS_PUERTOS: CruisePort[] = [
  { puerto: 'Barcelona', autoridad: 'Port de Barcelona', pasajeros_crucero: 3_650_000, escalas: 830, homeport_pct: 55, ccaa: 'Cataluña', source: 'catalog' },
  { puerto: 'Illes Balears (Palma)', autoridad: 'Autoritat Portuària de Balears', pasajeros_crucero: 2_700_000, escalas: 760, homeport_pct: 25, ccaa: 'Illes Balears', source: 'catalog' },
  { puerto: 'Las Palmas', autoridad: 'Puertos de Las Palmas', pasajeros_crucero: 1_150_000, escalas: 480, homeport_pct: 30, ccaa: 'Canarias', source: 'catalog' },
  { puerto: 'Santa Cruz de Tenerife', autoridad: 'Puertos de Tenerife', pasajeros_crucero: 1_300_000, escalas: 520, homeport_pct: 20, ccaa: 'Canarias', source: 'catalog' },
  { puerto: 'Málaga', autoridad: 'Autoridad Portuaria de Málaga', pasajeros_crucero: 520_000, escalas: 290, homeport_pct: 35, ccaa: 'Andalucía', source: 'catalog' },
  { puerto: 'Cádiz', autoridad: 'Autoridad Portuaria Bahía de Cádiz', pasajeros_crucero: 560_000, escalas: 320, homeport_pct: 8, ccaa: 'Andalucía', source: 'catalog' },
  { puerto: 'Valencia', autoridad: 'Autoridad Portuaria de Valencia', pasajeros_crucero: 480_000, escalas: 230, homeport_pct: 30, ccaa: 'Comunitat Valenciana', source: 'catalog' },
  { puerto: 'Vigo', autoridad: 'Autoridad Portuaria de Vigo', pasajeros_crucero: 380_000, escalas: 160, homeport_pct: 5, ccaa: 'Galicia', source: 'catalog' },
  { puerto: 'A Coruña', autoridad: 'Autoridad Portuaria de A Coruña', pasajeros_crucero: 220_000, escalas: 130, homeport_pct: 4, ccaa: 'Galicia', source: 'catalog' },
  { puerto: 'Alacant', autoridad: 'Autoridad Portuaria de Alicante', pasajeros_crucero: 130_000, escalas: 90, homeport_pct: 10, ccaa: 'Comunitat Valenciana', source: 'catalog' },
  { puerto: 'Cartagena', autoridad: 'Autoridad Portuaria de Cartagena', pasajeros_crucero: 220_000, escalas: 150, homeport_pct: 3, ccaa: 'Región de Murcia', source: 'catalog' },
  { puerto: 'Bilbao', autoridad: 'Autoridad Portuaria de Bilbao', pasajeros_crucero: 130_000, escalas: 70, homeport_pct: 8, ccaa: 'País Vasco', source: 'catalog' },
  { puerto: 'Ibiza', autoridad: 'Autoritat Portuària de Balears', pasajeros_crucero: 180_000, escalas: 130, homeport_pct: 5, ccaa: 'Illes Balears', source: 'catalog' },
  { puerto: 'Almería', autoridad: 'Autoridad Portuaria de Almería', pasajeros_crucero: 90_000, escalas: 60, homeport_pct: 2, ccaa: 'Andalucía', source: 'catalog' },
]

// Mapa puerto curado → slug del módulo Puertos (cuando existe en PORTS_SEED).
// Permite deep-link sin duplicar datos del módulo Puertos.
const PORT_SLUG_HINTS: Record<string, string> = {
  Barcelona: 'barcelona',
  Valencia: 'valencia',
  Bilbao: 'bilbao',
  'Las Palmas': 'las_palmas',
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS (sin red) · testeables
// ─────────────────────────────────────────────────────────────────────────

/**
 * Enriquece la lista curada de puertos de crucero con metadata del módulo
 * Puertos (slug + coords) cuando el puerto existe allí. `portsCatalog` es la
 * lista de puertos cruda de ports-handlers (o []). Pura: testeable con fixtures.
 */
export function enrichCruisePorts(
  curated: CruisePort[],
  portsCatalog: Array<{ slug?: string; name?: string; lat?: number; lon?: number; country_iso?: string }>,
): { puertos: CruisePort[]; cruzados: number } {
  const byName = new Map<string, { slug?: string; lat?: number; lon?: number }>()
  for (const p of portsCatalog || []) {
    if (p?.country_iso && p.country_iso !== 'ES') continue
    if (p?.slug) byName.set(p.slug, { slug: p.slug, lat: p.lat, lon: p.lon })
  }
  let cruzados = 0
  const puertos = curated.map((c) => {
    const slug = PORT_SLUG_HINTS[c.puerto]
    const meta = slug ? byName.get(slug) : undefined
    if (meta) {
      cruzados++
      return {
        ...c,
        port_slug: meta.slug ?? slug,
        lat: meta.lat ?? c.lat ?? null,
        lon: meta.lon ?? c.lon ?? null,
        source: 'ports+catalog' as const,
      }
    }
    // Sin cruce confirmado con el módulo Puertos: NO emitir port_slug, para
    // no renderizar deep-links /puertos/[slug] hacia puertos no garantizados.
    return { ...c, port_slug: null }
  })
  return { puertos, cruzados }
}

/**
 * Ensambla la respuesta de cruceros: ordena por pasajeros desc, recorta a
 * `limit`, calcula total. Pura: testeable.
 */
export function buildCrucerosData(
  puertos: CruisePort[],
  opts: { anio_ref: number | null; cruzados: number; nota: string; limit?: number },
): CrucerosData {
  const sorted = puertos
    .filter((p) => p.pasajeros_crucero != null)
    .slice()
    .sort((a, b) => (b.pasajeros_crucero ?? 0) - (a.pasajeros_crucero ?? 0))
  const limited = opts.limit != null ? sorted.slice(0, opts.limit) : sorted
  const total = limited.reduce((s, p) => s + (p.pasajeros_crucero ?? 0), 0)
  const anyCrossed = limited.some((p) => p.source === 'ports+catalog')
  return {
    anio_ref: opts.anio_ref,
    puertos: limited,
    total_pasajeros: limited.length ? total : null,
    cruzados_con_puertos: opts.cruzados,
    source: anyCrossed ? 'ports+catalog' : 'catalog',
    nota: opts.nota,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Caché en memoria · TTL 12h
// ─────────────────────────────────────────────────────────────────────────

interface CacheEntry { expires: number; value: CrucerosResponse }
const _cache = new Map<string, CacheEntry>()

/** Limpia la caché. Solo para tests. */
export function _clearCrucerosCache(): void {
  _cache.clear()
}

// ─────────────────────────────────────────────────────────────────────────
// API pública (import dinámico de ports-handlers + degradación)
// ─────────────────────────────────────────────────────────────────────────

export interface FetchCrucerosOpts {
  limit?: number
  noCache?: boolean
}

/**
 * Devuelve el tráfico de cruceros por puerto español (cifras curadas+datadas),
 * cruzado con el módulo Puertos cuando el puerto existe allí (deep-link sin
 * duplicar). NUNCA lanza: si el cruce con Puertos falla, sirve solo el catálogo.
 */
export async function fetchCruceros(opts: FetchCrucerosOpts = {}): Promise<CrucerosResponse> {
  const fetched_at = new Date().toISOString()
  const limit = Number.isFinite(opts.limit as number)
    ? Math.max(1, Math.min(30, opts.limit as number))
    : 14

  const cacheKey = `cruceros:${limit}`
  if (!opts.noCache) {
    const hit = _cache.get(cacheKey)
    if (hit && Date.now() <= hit.expires) return hit.value
  }

  let portsCatalog: any[] = []
  let crossNote = ''
  try {
    // Import dinámico (ver cabecera): mantiene el harness de tests cargable.
    const { catalogPorts } = await import('../ports-handlers.ts')
    const res = catalogPorts(new URLSearchParams({ country: 'ES' }))
    portsCatalog = Array.isArray(res?.items) ? res.items : []
    crossNote = ` Cruzado con módulo Puertos (${portsCatalog.length} puertos ES en catálogo).`
  } catch {
    crossNote = ' Sin cruce con módulo Puertos (no disponible en este contexto).'
  }

  const { puertos, cruzados } = enrichCruisePorts(CRUCEROS_PUERTOS, portsCatalog)
  const data = buildCrucerosData(puertos, {
    anio_ref: CRUCEROS_ANIO_REF,
    cruzados,
    nota: `${CRUCEROS_FUENTE}.${crossNote} Cifras de pasajeros de crucero curadas+datadas (Puertos del Estado no expone API REST de pasajeros).`,
    limit,
  })

  const result: CrucerosResponse = { ok: true, data, fetched_at, source_url: PUBLIC_URL }
  _cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: result })
  return result
}
