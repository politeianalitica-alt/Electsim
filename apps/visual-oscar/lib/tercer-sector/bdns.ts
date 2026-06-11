/**
 * lib/tercer-sector/bdns.ts · Cliente BDNS (Base de Datos Nacional de
 * Subvenciones) enfocado al TERCER SECTOR · Sprint TS2-orgs.
 *
 * BDNS (Ministerio de Hacienda) contiene TODAS las subvenciones públicas de
 * España desde 2013 (Estado, CCAA, ayuntamientos, organismos). Es la fuente de
 * "dinero HACIA el tercer sector" más rica y, además, es KEYLESS.
 *
 * ── API REAL (probada en vivo · 2026-06-07) ───────────────────────────────
 *   Base: https://www.infosubvenciones.es/bdnstrans/api
 *   Auth: ninguna (keyless · JSON).
 *   - GET /concesiones/busqueda?page=&pageSize=  → resoluciones de concesión
 *       (quién recibió qué). Envelope `{ content: [ {...} ] }`.
 *       Campos por concesión:
 *         id · codConcesion · fechaConcesion ("YYYY-MM-DD") ·
 *         beneficiario ("<NIF> <RAZON SOCIAL>") · instrumento · importe ·
 *         ayudaEquivalente · convocatoria · numeroConvocatoria ·
 *         nivel1 (ESTADO/AUTONOMICA/LOCAL) · nivel2 (CCAA) · nivel3 (órgano) ·
 *         urlBR (bases reguladoras).
 *   - GET /convocatorias/busqueda?page=&pageSize=  → convocatorias.
 *       Envelope paginado `{ content:[...], totalElements, totalPages, ... }`.
 *       Campos: id · numeroConvocatoria · descripcion · fechaRecepcion ·
 *         nivel1/2/3 · mrr (financiada por MRR/NextGen).
 *   - pageSize máximo efectivo 50 (la API ignora valores mayores).
 *
 * ── Enfoque tercer sector ──────────────────────────────────────────────────
 * La API NO filtra de forma fiable por tipo de beneficiario ni por fecha
 * (probado: `fechaDesde`/`beneficiario` con formato estricto y poco fiable),
 * así que paginamos las concesiones/convocatorias MÁS RECIENTES y filtramos
 * en cliente por:
 *   1. NIF de beneficiario empieza por G/R/Q/F/V (formas jurídicas no lucrativas
 *      españolas: G=asociación/fundación, R=congregación/entidad religiosa,
 *      Q=organismo público/algunas fundaciones, F=cooperativa, V=otras sin
 *      ánimo de lucro). Heurística honesta, documentada.
 *   2. Razón social o convocatoria contiene términos del tercer sector
 *      (fundación, asociación, ONG, cooperativa, cáritas, cruz roja…).
 * Cada concesión se marca con `es_tercer_sector` y el motivo de match.
 *
 * Degradación honesta (CLAUDE.md): el fetch nunca lanza; ante fallo devuelve
 * `{ ok:false }`. Caché 6h (los datos cambian a diario pero no necesitan ser
 * inmediatos para análisis sectorial).
 *
 * KEYLESS · se llama desde route handlers de /api/tercer-sector/*.
 */
import {
  type TercerSectorEnvelope,
  fetchJson,
  cacheGet,
  cacheSet,
  normText,
  num,
} from './shared'

export const BDNS_BASE = 'https://www.infosubvenciones.es/bdnstrans/api'
export const BDNS_PUBLIC = 'https://www.infosubvenciones.es'
const CACHE_TTL_MS = 6 * 3600_000 // 6h
const MAX_PAGE_SIZE = 50

// ─────────────────────────────────────────────────────────────────────────
// Tipos del dominio (propios de este lib)
// ─────────────────────────────────────────────────────────────────────────

/** Una concesión BDNS normalizada (subvención concedida a un beneficiario). */
export interface BdnsConcesion {
  id: string
  /** NIF del beneficiario (extraído del prefijo del campo `beneficiario`), null si no aislable. */
  beneficiario_nif: string | null
  /** Razón social del beneficiario (sin el NIF). */
  beneficiario_nombre: string
  /** Importe de la subvención en euros (null si no informado). */
  importe_eur: number | null
  /** Instrumento (subvención, entrega dineraria, préstamo…). */
  instrumento: string | null
  /** Título de la convocatoria asociada. */
  convocatoria: string | null
  /** Nivel administrativo del convocante (ESTADO / AUTONOMICA / LOCAL). */
  nivel: string | null
  /** CCAA / ámbito territorial del convocante. */
  territorio: string | null
  /** Órgano concedente. */
  organo: string | null
  /** Fecha de concesión ("YYYY-MM-DD"), null si no informada. */
  fecha: string | null
  /** True si pasa el filtro de tercer sector. */
  es_tercer_sector: boolean
  /** Motivo del match ("nif" | "keyword" | "ambos" | ""). */
  match: string
}

/** Una convocatoria BDNS normalizada. */
export interface BdnsConvocatoria {
  id: string
  numero: string | null
  titulo: string
  fecha: string | null
  nivel: string | null
  territorio: string | null
  organo: string | null
  /** Financiada por el MRR (NextGenerationEU). */
  mrr: boolean
  es_tercer_sector: boolean
  match: string
}

// ─────────────────────────────────────────────────────────────────────────
// Filtro tercer sector · PURO (testeable)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Prefijos de NIF/CIF español típicos de entidades sin ánimo de lucro o de
 * economía social: G (asociaciones, fundaciones), R (congregaciones/entidades
 * religiosas), Q (organismos públicos / algunas fundaciones), F (cooperativas),
 * V (otros tipos sin ánimo de lucro). Heurística documentada.
 */
const NONPROFIT_NIF_PREFIXES = new Set(['G', 'R', 'F', 'V'])
// Q se trata aparte: muchos beneficiarios Q son administraciones (universidades,
// ayuntamientos) → solo cuenta como tercer sector si además matchea keyword.

/** Términos que delatan una entidad del tercer sector en razón social/convocatoria. */
const TS_KEYWORDS = [
  'fundacion',
  'fundacio',
  'asociacion',
  'associacio',
  'asoc.',
  'ong',
  'ongd',
  'cooperativa',
  'caritas',
  'cruz roja',
  'creu roja',
  'voluntariado',
  'sin animo de lucro',
  'sin fines de lucro',
  'tercer sector',
  'comite ',
  'federacion',
  'federacio',
  'confederacion',
  'plataforma',
  'red de',
  'plena inclusion',
  'secretariado gitano',
  'banco de alimentos',
  'banc dels aliments',
]

/** Términos que EXCLUYEN (administraciones públicas habituales). */
const ADMIN_KEYWORDS = [
  'ayuntamiento',
  'concello',
  'ajuntament',
  'diputacion',
  'diputacio',
  'mancomunidad',
  'consorcio',
  'universidad',
  'universitat',
  'consejeria',
  'conselleria',
  'cabildo',
  'gobierno de',
  'junta de',
  'generalitat',
  'comunidad autonoma',
]

/** Extrae el NIF del prefijo del campo `beneficiario` ("G12345678 NOMBRE"). */
export function splitBeneficiario(raw: unknown): { nif: string | null; nombre: string } {
  const s = String(raw ?? '').trim()
  if (!s) return { nif: null, nombre: '' }
  // NIF español: letra/número inicial + 7-8 alfanum. Tomamos el primer token si
  // parece un NIF (CIF empieza por letra A-W; NIE por X/Y/Z; persona física por dígito).
  const m = s.match(/^([A-WXYZ]?\d{7,8}[A-Z0-9]?)\s+(.*)$/i)
  if (m) return { nif: m[1].toUpperCase(), nombre: m[2].trim() }
  // Sin patrón claro: todo es nombre.
  return { nif: null, nombre: s }
}

/**
 * Decide si una concesión/convocatoria es de tercer sector. Pura: testeable.
 * Devuelve el motivo del match ("nif" | "keyword" | "ambos" | "").
 */
export function classifyTercerSector(
  nif: string | null,
  texto: string,
): { es: boolean; match: string } {
  const t = normText(texto)
  const isAdmin = ADMIN_KEYWORDS.some((k) => t.includes(k))
  const hasKeyword = TS_KEYWORDS.some((k) => t.includes(k))
  const prefix = nif ? nif.charAt(0).toUpperCase() : ''
  const nonprofitNif = NONPROFIT_NIF_PREFIXES.has(prefix)
  // Q solo cuenta si además hay keyword (no si parece administración).
  const qCounts = prefix === 'Q' && hasKeyword && !isAdmin

  const byNif = (nonprofitNif || qCounts) && !isAdmin
  const byKeyword = hasKeyword && !isAdmin

  if (byNif && byKeyword) return { es: true, match: 'ambos' }
  if (byNif) return { es: true, match: 'nif' }
  if (byKeyword) return { es: true, match: 'keyword' }
  return { es: false, match: '' }
}

// ─────────────────────────────────────────────────────────────────────────
// Mappers PUROS de la respuesta cruda → tipos del dominio
// ─────────────────────────────────────────────────────────────────────────

/** Extrae el array `content` de una respuesta BDNS (paginada o lista directa). */
export function bdnsContent(json: any): any[] {
  if (Array.isArray(json)) return json
  if (json && Array.isArray(json.content)) return json.content
  return []
}

/** Mapea una concesión cruda → BdnsConcesion (con clasificación). Pura. */
export function mapConcesion(raw: any): BdnsConcesion {
  const { nif, nombre } = splitBeneficiario(raw?.beneficiario)
  const convocatoria = raw?.convocatoria ?? null
  const cls = classifyTercerSector(nif, `${nombre} ${convocatoria ?? ''}`)
  return {
    id: String(raw?.id ?? raw?.codConcesion ?? ''),
    beneficiario_nif: nif,
    beneficiario_nombre: nombre,
    importe_eur: num(raw?.importe ?? raw?.ayudaEquivalente),
    instrumento: raw?.instrumento ? String(raw.instrumento).trim() : null,
    convocatoria: convocatoria ? String(convocatoria).trim() : null,
    nivel: raw?.nivel1 ? String(raw.nivel1).trim() : null,
    territorio: raw?.nivel2 ? String(raw.nivel2).trim() : null,
    organo: raw?.nivel3 ? String(raw.nivel3).trim() : null,
    fecha: raw?.fechaConcesion ? String(raw.fechaConcesion).slice(0, 10) : null,
    es_tercer_sector: cls.es,
    match: cls.match,
  }
}

/** Mapea una convocatoria cruda → BdnsConvocatoria (con clasificación). Pura. */
export function mapConvocatoria(raw: any): BdnsConvocatoria {
  const titulo = String(raw?.descripcion ?? raw?.titulo ?? '').trim()
  const cls = classifyTercerSector(null, titulo)
  return {
    id: String(raw?.id ?? raw?.numeroConvocatoria ?? ''),
    numero: raw?.numeroConvocatoria ? String(raw.numeroConvocatoria) : null,
    titulo,
    fecha: raw?.fechaRecepcion ? String(raw.fechaRecepcion).slice(0, 10) : null,
    nivel: raw?.nivel1 ? String(raw.nivel1).trim() : null,
    territorio: raw?.nivel2 ? String(raw.nivel2).trim() : null,
    organo: raw?.nivel3 ? String(raw.nivel3).trim() : null,
    mrr: raw?.mrr === true,
    es_tercer_sector: cls.es,
    match: cls.match,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch crudo paginado · degradación honesta
// ─────────────────────────────────────────────────────────────────────────

interface FetchPagesOpts {
  /** Nº de páginas a recorrer (cada una hasta 50 ítems). */
  pages?: number
  noCache?: boolean
  timeoutMs?: number
}

/**
 * Descarga las concesiones BDNS más recientes (varias páginas) y las clasifica.
 * Devuelve TODAS las concesiones (con la marca `es_tercer_sector`); el endpoint
 * decide si filtra. NUNCA lanza.
 */
export async function fetchConcesiones(
  opts: FetchPagesOpts = {},
): Promise<TercerSectorEnvelope<BdnsConcesion[]>> {
  const fetched_at = new Date().toISOString()
  const pages = Math.max(1, Math.min(8, opts.pages ?? 3))
  const cacheKey = `bdns:concesiones:${pages}`
  if (!opts.noCache) {
    const hit = cacheGet<TercerSectorEnvelope<BdnsConcesion[]>>(cacheKey)
    if (hit) return hit
  }

  const all: BdnsConcesion[] = []
  let anyOk = false
  let lastError = ''
  for (let p = 0; p < pages; p++) {
    const url = `${BDNS_BASE}/concesiones/busqueda?page=${p}&pageSize=${MAX_PAGE_SIZE}`
    const res = await fetchJson(url, {
      revalidate: 21600,
      timeoutMs: opts.timeoutMs,
    })
    if ('error' in res) {
      lastError = res.error
      // 429 / error puntual: paramos de paginar pero devolvemos lo acumulado.
      break
    }
    anyOk = true
    const content = bdnsContent(res.json)
    if (content.length === 0) break
    for (const raw of content) all.push(mapConcesion(raw))
    if (content.length < MAX_PAGE_SIZE) break // última página
  }

  if (!anyOk && all.length === 0) {
    return {
      ok: false,
      data: null,
      error: lastError || 'bdns_sin_datos',
      fetched_at,
      source_url: BDNS_PUBLIC,
    }
  }

  const result: TercerSectorEnvelope<BdnsConcesion[]> = {
    ok: true,
    data: all,
    fetched_at,
    source_url: BDNS_PUBLIC,
    partial: !!lastError,
  }
  cacheSet(cacheKey, result, CACHE_TTL_MS)
  return result
}

/**
 * Descarga las convocatorias BDNS más recientes (varias páginas) clasificadas.
 * NUNCA lanza.
 */
export async function fetchConvocatorias(
  opts: FetchPagesOpts = {},
): Promise<TercerSectorEnvelope<BdnsConvocatoria[]>> {
  const fetched_at = new Date().toISOString()
  const pages = Math.max(1, Math.min(8, opts.pages ?? 3))
  const cacheKey = `bdns:convocatorias:${pages}`
  if (!opts.noCache) {
    const hit = cacheGet<TercerSectorEnvelope<BdnsConvocatoria[]>>(cacheKey)
    if (hit) return hit
  }

  const all: BdnsConvocatoria[] = []
  let anyOk = false
  let lastError = ''
  for (let p = 0; p < pages; p++) {
    const url = `${BDNS_BASE}/convocatorias/busqueda?page=${p}&pageSize=${MAX_PAGE_SIZE}`
    const res = await fetchJson(url, { revalidate: 21600, timeoutMs: opts.timeoutMs })
    if ('error' in res) {
      lastError = res.error
      break
    }
    anyOk = true
    const content = bdnsContent(res.json)
    if (content.length === 0) break
    for (const raw of content) all.push(mapConvocatoria(raw))
    if (content.length < MAX_PAGE_SIZE) break
  }

  if (!anyOk && all.length === 0) {
    return {
      ok: false,
      data: null,
      error: lastError || 'bdns_sin_datos',
      fetched_at,
      source_url: BDNS_PUBLIC,
    }
  }

  const result: TercerSectorEnvelope<BdnsConvocatoria[]> = {
    ok: true,
    data: all,
    fetched_at,
    source_url: BDNS_PUBLIC,
    partial: !!lastError,
  }
  cacheSet(cacheKey, result, CACHE_TTL_MS)
  return result
}

// ─────────────────────────────────────────────────────────────────────────
// Grandes beneficiarios (BDNS · ejercicio) · quién recibe MÁS dinero público
// ─────────────────────────────────────────────────────────────────────────

/** Un gran beneficiario BDNS de un ejercicio (importe agregado anual). */
export interface BdnsGranBeneficiario {
  id: string
  beneficiario_nif: string | null
  beneficiario_nombre: string
  importe_eur: number | null
  ejercicio: number | null
  es_tercer_sector: boolean
  match: string
}

/** Mapea un gran beneficiario crudo → BdnsGranBeneficiario. Pura. */
export function mapGranBeneficiario(raw: any, ejercicio: number | null): BdnsGranBeneficiario {
  const { nif, nombre } = splitBeneficiario(raw?.beneficiario)
  const cls = classifyTercerSector(nif, nombre)
  return {
    id: String(raw?.idPersona ?? raw?.id ?? nif ?? nombre.slice(0, 30)),
    beneficiario_nif: nif,
    beneficiario_nombre: nombre,
    importe_eur: num(raw?.ayudaETotal ?? raw?.importe ?? raw?.ayuda ?? raw?.importeConcedido ?? raw?.total ?? raw?.ayudaEquivalente),
    ejercicio: raw?.ejercicio != null ? Number(raw.ejercicio) : ejercicio,
    es_tercer_sector: cls.es,
    match: cls.match,
  }
}

/**
 * Descarga los grandes beneficiarios de subvenciones de un ejercicio (BDNS
 * /grandesbeneficiarios). Clasifica tercer sector. NUNCA lanza.
 */
export async function fetchGrandesBeneficiarios(
  opts: FetchPagesOpts & { ejercicio?: number } = {},
): Promise<TercerSectorEnvelope<BdnsGranBeneficiario[]>> {
  const fetched_at = new Date().toISOString()
  const ejercicio = opts.ejercicio ?? new Date().getFullYear() - 1
  const pages = Math.max(1, Math.min(6, opts.pages ?? 2))
  const cacheKey = `bdns:grandesbenef:${ejercicio}:${pages}`
  if (!opts.noCache) {
    const hit = cacheGet<TercerSectorEnvelope<BdnsGranBeneficiario[]>>(cacheKey)
    if (hit) return hit
  }
  const all: BdnsGranBeneficiario[] = []
  let anyOk = false
  let lastError = ''
  for (let p = 0; p < pages; p++) {
    const url = `${BDNS_BASE}/grandesbeneficiarios/busqueda?page=${p}&pageSize=${MAX_PAGE_SIZE}&ejercicio=${ejercicio}`
    const res = await fetchJson(url, { revalidate: 21600, timeoutMs: opts.timeoutMs })
    if ('error' in res) {
      lastError = res.error
      break
    }
    anyOk = true
    const content = bdnsContent(res.json)
    if (content.length === 0) break
    for (const raw of content) all.push(mapGranBeneficiario(raw, ejercicio))
    if (content.length < MAX_PAGE_SIZE) break
  }
  if (!anyOk && all.length === 0) {
    return { ok: false, data: null, error: lastError || 'bdns_sin_datos', fetched_at, source_url: BDNS_PUBLIC }
  }
  const result: TercerSectorEnvelope<BdnsGranBeneficiario[]> = {
    ok: true,
    data: all.sort((a, b) => (b.importe_eur ?? 0) - (a.importe_eur ?? 0)),
    fetched_at,
    source_url: BDNS_PUBLIC,
    partial: !!lastError,
  }
  cacheSet(cacheKey, result, CACHE_TTL_MS)
  return result
}

/**
 * Descarga las ayudas de estado recientes (BDNS /ayudasestado), reusando el
 * shape de concesión (son resoluciones de ayuda pública). NUNCA lanza.
 */
export async function fetchAyudasEstado(
  opts: FetchPagesOpts = {},
): Promise<TercerSectorEnvelope<BdnsConcesion[]>> {
  const fetched_at = new Date().toISOString()
  const pages = Math.max(1, Math.min(6, opts.pages ?? 2))
  const cacheKey = `bdns:ayudasestado:${pages}`
  if (!opts.noCache) {
    const hit = cacheGet<TercerSectorEnvelope<BdnsConcesion[]>>(cacheKey)
    if (hit) return hit
  }
  const all: BdnsConcesion[] = []
  let anyOk = false
  let lastError = ''
  for (let p = 0; p < pages; p++) {
    const url = `${BDNS_BASE}/ayudasestado/busqueda?page=${p}&pageSize=${MAX_PAGE_SIZE}`
    const res = await fetchJson(url, { revalidate: 21600, timeoutMs: opts.timeoutMs })
    if ('error' in res) {
      lastError = res.error
      break
    }
    anyOk = true
    const content = bdnsContent(res.json)
    if (content.length === 0) break
    for (const raw of content) all.push(mapConcesion(raw))
    if (content.length < MAX_PAGE_SIZE) break
  }
  if (!anyOk && all.length === 0) {
    return { ok: false, data: null, error: lastError || 'bdns_sin_datos', fetched_at, source_url: BDNS_PUBLIC }
  }
  const result: TercerSectorEnvelope<BdnsConcesion[]> = {
    ok: true,
    data: all,
    fetched_at,
    source_url: BDNS_PUBLIC,
    partial: !!lastError,
  }
  cacheSet(cacheKey, result, CACHE_TTL_MS)
  return result
}

// ─────────────────────────────────────────────────────────────────────────
// Agregaciones PURAS para rankings (testeables)
// ─────────────────────────────────────────────────────────────────────────

export interface BdnsRankItem {
  nombre: string
  nif: string | null
  total_eur: number
  num_concesiones: number
}

/**
 * Agrupa concesiones por beneficiario y devuelve el ranking por importe total.
 * Pura: testeable. Solo cuenta concesiones con importe numérico.
 */
export function rankBeneficiarios(
  concesiones: BdnsConcesion[],
  limit = 20,
): BdnsRankItem[] {
  const byKey = new Map<string, BdnsRankItem>()
  for (const c of concesiones) {
    const key = (c.beneficiario_nif || c.beneficiario_nombre || '').toUpperCase()
    if (!key) continue
    const cur =
      byKey.get(key) ??
      { nombre: c.beneficiario_nombre || c.beneficiario_nif || '—', nif: c.beneficiario_nif, total_eur: 0, num_concesiones: 0 }
    cur.total_eur += c.importe_eur ?? 0
    cur.num_concesiones += 1
    byKey.set(key, cur)
  }
  return Array.from(byKey.values())
    .sort((a, b) => b.total_eur - a.total_eur)
    .slice(0, Math.max(1, limit))
}

/** Suma de importes de una lista de concesiones (ignora null). Pura. */
export function sumImportes(concesiones: BdnsConcesion[]): number {
  return concesiones.reduce((s, c) => s + (c.importe_eur ?? 0), 0)
}

/**
 * Cuenta concesiones por nivel administrativo (ESTADO/AUTONOMICA/LOCAL/otros).
 * Pura: testeable.
 */
export function countByNivel(concesiones: BdnsConcesion[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of concesiones) {
    const k = c.nivel || 'OTROS'
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}
