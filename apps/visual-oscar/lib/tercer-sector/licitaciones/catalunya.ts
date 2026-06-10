/**
 * Conector Transparència Catalunya — contractació pública · ES/CCAA · TS6
 *
 * La Generalitat publica en su portal Socrata (analisi.transparenciacatalunya.cat)
 * el dataset "Contractació pública a Catalunya: publicacions a la Plataforma de
 * serveis de contractació pública" (id `ybgg-dgi6`). Recoge publicaciones de
 * contratos (adjudicaciones, menores, etc.) de la Generalitat, su sector público
 * y las entidades de la administración local catalana. KEYLESS (Socrata SODA v2).
 *
 * Endpoint JSON:
 *   https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json
 *     ?$limit=50&$order=data_publicacio_contracte DESC
 *     &$where=data_publicacio_contracte IS NOT NULL
 *
 * Campos reales (verificados contra la API el 2026-06-09):
 *   codi_expedient, denominacio, objecte_contracte, nom_organ, nom_departament_ens,
 *   nom_ambit, tipus_contracte, procediment, codi_cpv (puede ser multivalor con
 *   "||"), import_adjudicacio_sense (sin IVA), import_adjudicacio_amb_iva,
 *   data_publicacio_contracte, data_adjudicacio_contracte, durada_contracte,
 *   denominacio_adjudicatari, enllac_publicacio { url } (ficha en contractaciopublica.cat).
 *
 * `parseCatalunyaItems()` es PURO y testeable con un fixture JSON (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import {
  cacheGet,
  cacheSet,
  errResult,
  okResult,
  parseNum,
  safeFetch,
  toIso,
  toEur,
} from './shared'
import { normalizeCpv } from './cpv'

const DATASET = 'ybgg-dgi6'
const BASE = `https://analisi.transparenciacatalunya.cat/resource/${DATASET}.json`
const PUBLIC_URL = `https://analisi.transparenciacatalunya.cat/d/${DATASET}`
const FUENTE = 'catalunya' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture JSON)
// ─────────────────────────────────────────────────────────────────────────

/** Campo Socrata que puede llegar como string plano o como objeto { url }. */
type SocrataUrl = string | { url?: string } | null | undefined

interface CatalunyaRaw {
  codi_expedient?: string
  denominacio?: string
  objecte_contracte?: string
  nom_organ?: string
  nom_departament_ens?: string
  nom_ambit?: string
  tipus_contracte?: string
  procediment?: string
  codi_cpv?: string
  import_adjudicacio_sense?: string | number
  import_adjudicacio_amb_iva?: string | number
  data_publicacio_contracte?: string
  data_adjudicacio_contracte?: string
  durada_contracte?: string
  denominacio_adjudicatari?: string
  enllac_publicacio?: SocrataUrl
}

/** Extrae la URL de un campo Socrata que puede ser string u objeto { url }. */
function socrataUrl(v: SocrataUrl): string | null {
  if (!v) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'object' && typeof v.url === 'string') return v.url.trim() || null
  return null
}

/** Resuelve el órgano de contratación tolerando varias formas. */
function resolveComprador(raw: CatalunyaRaw): string {
  const organo = (raw.nom_organ || '').trim()
  const depto = (raw.nom_departament_ens || '').trim()
  if (organo && depto && organo !== depto) return `${organo} · ${depto}`
  if (organo) return organo
  if (depto) return depto
  return 'Generalitat de Catalunya'
}

/**
 * El CPV puede venir multivalor ("80000000-4||92312000-1"). Nos quedamos con el
 * primero y lo normalizamos a 8 dígitos. null si no hay.
 */
function resolveCpv(raw: CatalunyaRaw): string | null {
  if (!raw.codi_cpv) return null
  const first = String(raw.codi_cpv).split('||')[0]
  return normalizeCpv(first)
}

/** Parsea un registro de contractació al shape común. Pura. */
export function parseCatalunyaItem(raw: CatalunyaRaw): LicitacionNormalizada | null {
  if (!raw || typeof raw !== 'object') return null
  const code = raw.codi_expedient
  if (!code) return null
  const id = `catalunya:${String(code)}`

  const titulo =
    raw.objecte_contracte || raw.denominacio || 'Contracte públic (Generalitat de Catalunya)'

  // Importe: preferimos el valor sin IVA (base del contrato); fallback al de con IVA.
  const importe =
    parseNum(raw.import_adjudicacio_sense) ?? parseNum(raw.import_adjudicacio_amb_iva) ?? null

  return {
    id,
    titulo: String(titulo).slice(0, 300),
    comprador: resolveComprador(raw).slice(0, 200),
    nivel: 'ccaa',
    pais: 'España',
    region: 'Cataluña',
    valor_eur: toEur(importe, 'EUR'),
    moneda: 'EUR',
    cpv: resolveCpv(raw),
    plazo: toIso(raw.data_adjudicacio_contracte),
    fecha_pub: toIso(raw.data_publicacio_contracte),
    url: socrataUrl(raw.enllac_publicacio) ?? PUBLIC_URL,
    fuente: FUENTE,
    documentos: [],
    idioma: 'ca',
  }
}

/**
 * Parsea la respuesta del dataset Socrata (array directo de filas). Pura.
 * Deduplica por `id` y limita defensivamente.
 */
export function parseCatalunyaItems(json: unknown): { items: LicitacionNormalizada[]; total: number } {
  if (!Array.isArray(json)) return { items: [], total: 0 }
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const raw of json) {
    const item = parseCatalunyaItem(raw as CatalunyaRaw)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total: items.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}, nunca lanza
// ─────────────────────────────────────────────────────────────────────────

/**
 * Trae las últimas publicaciones de contratos de la Generalitat de Catalunya.
 * KEYLESS. Caché 30 min. Degrada a `{ok:false}` ante fallo (nunca lanza).
 */
export async function fetchCatalunya(
  opts: { timeoutMs?: number; noCache?: boolean } = {},
): Promise<SourceResult> {
  const params = new URLSearchParams({
    $limit: '50',
    $order: 'data_publicacio_contracte DESC',
    $where: 'data_publicacio_contracte IS NOT NULL',
  })
  const url = `${BASE}?${params.toString()}`
  const cacheKey = `catalunya:${DATASET}:latest50`

  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const res = await safeFetch(url, {
    as: 'json',
    timeoutMs: opts.timeoutMs,
    headers: { Accept: 'application/json' },
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseCatalunyaItems(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
