/**
 * Conector SECOP II — Colombia Compra Eficiente (Socrata) · país/regional extranjero · TS-Global Gb
 *
 * SECOP II es la plataforma de contratación pública de Colombia. Su dataset
 * "Procesos de Contratación" se publica en el portal de datos abiertos
 * (Socrata, datos.gov.co) de forma KEYLESS. Relevante para tercer sector /
 * cooperación en Latinoamérica. Cuando la entidad trae departamento → nivel
 * `regional_extranjero`; si no, `pais_extranjero`. Moneda COP.
 *
 * API JSON KEYLESS (verificado 2026-06-07):
 *   GET https://www.datos.gov.co/resource/p6dx-8zbt.json?
 *       $limit=50&$order=fecha_de_publicacion_del DESC
 *   Respuesta: array de registros planos con (entre otros):
 *     id_del_proceso, referencia_del_proceso, nombre_del_procedimiento,
 *     descripci_n_del_procedimiento, entidad, departamento_entidad,
 *     ciudad_entidad, fecha_de_publicacion_del, precio_base,
 *     valor_total_adjudicacion, adjudicado, codigo_principal_de_categoria,
 *     urlproceso ({ url }).
 *
 * `parseSecop()` es PURO y testeable con un fixture (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types.ts'
import { cacheGet, cacheSet, errResult, okResult, parseNum, safeFetch, toIso } from './shared.ts'

const RESOURCE = 'p6dx-8zbt'
const BASE = `https://www.datos.gov.co/resource/${RESOURCE}.json`
const PUBLIC_URL = 'https://www.colombiacompra.gov.co/secop/secop-ii'
const FUENTE = 'secop' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture)
// ─────────────────────────────────────────────────────────────────────────

interface SecopRecord {
  id_del_proceso?: string
  referencia_del_proceso?: string
  nombre_del_procedimiento?: string
  descripci_n_del_procedimiento?: string
  entidad?: string
  nit_entidad?: string
  departamento_entidad?: string
  ciudad_entidad?: string
  fecha_de_publicacion_del?: string
  fecha_de_ultima_publicaci?: string
  precio_base?: string | number
  valor_total_adjudicacion?: string | number
  adjudicado?: string
  codigo_principal_de_categoria?: string
  urlproceso?: { url?: string } | string
}

/** Extrae la URL del proceso (campo `urlproceso` es objeto `{url}` o string). Pura. */
export function secopUrl(rec: SecopRecord): string {
  const u = rec.urlproceso
  let raw = ''
  if (u && typeof u === 'object') raw = String(u.url || '')
  else if (typeof u === 'string') raw = u
  if (raw && /^https?:\/\//.test(raw)) return raw
  return PUBLIC_URL
}

/** Mapea un registro SECOP al shape común. Pura. */
export function parseSecopRecord(rec: SecopRecord): LicitacionNormalizada | null {
  if (!rec || typeof rec !== 'object') return null
  const ref = rec.id_del_proceso || rec.referencia_del_proceso
  if (!ref) return null

  const titulo =
    rec.nombre_del_procedimiento ||
    rec.descripci_n_del_procedimiento ||
    'Proceso de contratación · SECOP II'
  const comprador = rec.entidad || 'Entidad pública (Colombia)'

  const depto = (rec.departamento_entidad || '').trim()
  const noDef = /no\s*definido/i.test(depto) || depto === ''
  const region = noDef ? null : depto
  const nivel: LicitacionNormalizada['nivel'] = region ? 'regional_extranjero' : 'pais_extranjero'

  // Importe: valor adjudicado si lo hay (>0), si no el precio base. COP.
  const adjudicado = parseNum(rec.valor_total_adjudicacion)
  const base = parseNum(rec.precio_base)
  const amount = adjudicado != null && adjudicado > 0 ? adjudicado : base

  // CPV no aplica (Colombia usa UNSPSC en codigo_principal_de_categoria).
  return {
    id: `${FUENTE}:${ref}`,
    titulo: String(titulo).slice(0, 300),
    comprador: String(comprador).slice(0, 200),
    nivel,
    pais: 'Colombia',
    region,
    valor_eur: null, // Importes muy grandes en COP; se conserva moneda, sin FX forzado.
    moneda: 'COP',
    cpv: null,
    plazo: null, // El dataset no expone una fecha-límite de presentación fiable.
    fecha_pub: toIso(rec.fecha_de_publicacion_del || rec.fecha_de_ultima_publicaci),
    url: secopUrl(rec),
    fuente: FUENTE,
    documentos: [],
    idioma: 'es',
  }
}

/** Parsea la respuesta (array plano Socrata). Pura. */
export function parseSecop(json: unknown): { items: LicitacionNormalizada[]; total: number } {
  const arr = Array.isArray(json) ? json : []
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const rec of arr) {
    const item = parseSecopRecord(rec as SecopRecord)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total: items.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchSecopOpts {
  limit?: number
  timeoutMs?: number
  noCache?: boolean
}

export async function fetchSecop(opts: FetchSecopOpts = {}): Promise<SourceResult> {
  const limit = Math.max(1, Math.min(100, opts.limit ?? 50))
  // Socrata SoQL: $order con DESC (la columna `fecha_de_publicacion_del`).
  const params = new URLSearchParams({
    $limit: String(limit),
    $order: 'fecha_de_publicacion_del DESC',
  })
  const url = `${BASE}?${params.toString()}`
  const cacheKey = `secop:${params.toString()}`
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

  const { items, total } = parseSecop(res.json)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
