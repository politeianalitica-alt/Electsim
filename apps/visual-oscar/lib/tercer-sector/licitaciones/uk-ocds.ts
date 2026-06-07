/**
 * Conector UK Find a Tender — OCDS · país extranjero · TS2-lic-src
 *
 * Find a Tender Service (FTS) es el portal del Reino Unido para contratos
 * públicos por encima de umbrales. Publica datos en OCDS (Open Contracting Data
 * Standard) de forma KEYLESS, lo que lo hace ideal para el agregador. Nivel
 * `pais_extranjero` (Reino Unido).
 *
 * API OCDS:
 *   GET https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?
 *       updatedFrom=YYYY-MM-DDTHH:MM:SS&updatedTo=...&limit=N
 *   Respuesta: { releases: [ { ocid, tender:{title,value,tenderPeriod,
 *     documents,classification,items}, buyer:{name}, date, language } ], links }
 *
 * `parseOcdsReleasePackage()` es PURO y testeable; sirve de referencia OCDS
 * reutilizable. Importes en GBP normalmente → se convierten a EUR.
 */
import type { DocumentoLicitacion, LicitacionNormalizada, SourceResult } from './types'
import {
  cacheGet,
  cacheSet,
  countryName,
  detectFormat,
  errResult,
  okResult,
  parseNum,
  safeFetch,
  toEur,
  toIso,
} from './shared'
import { normalizeCpv } from './cpv'

const BASE = 'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages'
const PUBLIC_URL = 'https://www.find-tender.service.gov.uk'
const FUENTE = 'uk-ocds' as const

// ─────────────────────────────────────────────────────────────────────────
// Parsing OCDS PURO (reutilizable · testeable con fixture)
// ─────────────────────────────────────────────────────────────────────────

interface OcdsValue {
  amount?: number | string
  currency?: string
}
interface OcdsDocument {
  title?: string
  url?: string
  format?: string
  documentType?: string
}
interface OcdsClassification {
  scheme?: string
  id?: string
  description?: string
}
interface OcdsTender {
  title?: string
  description?: string
  value?: OcdsValue
  minValue?: OcdsValue
  tenderPeriod?: { endDate?: string }
  documents?: OcdsDocument[]
  classification?: OcdsClassification
  items?: { classification?: OcdsClassification }[]
}
interface OcdsRelease {
  ocid?: string
  id?: string
  date?: string
  language?: string
  tender?: OcdsTender
  buyer?: { name?: string; address?: { countryName?: string } }
  parties?: { roles?: string[]; name?: string; address?: { countryName?: string } }[]
}

/** Extrae el CPV de un release OCDS (tender.classification o items). Puro. */
function ocdsCpv(tender: OcdsTender | undefined): string | null {
  if (!tender) return null
  const isCpv = (c?: OcdsClassification) =>
    !!c?.id && /cpv/i.test(c.scheme || 'CPV')
  if (isCpv(tender.classification)) return normalizeCpv(tender.classification!.id)
  if (Array.isArray(tender.items)) {
    for (const it of tender.items) {
      if (isCpv(it.classification)) return normalizeCpv(it.classification!.id)
    }
  }
  return null
}

/** Mapea un OCDS document al shape común. Puro. */
function ocdsDoc(d: OcdsDocument): DocumentoLicitacion | null {
  if (!d?.url || !/^https?:\/\//.test(d.url)) return null
  const dt = (d.documentType || '').toLowerCase()
  let tipo: DocumentoLicitacion['tipo'] = 'otro'
  if (/tendernotice|notice/.test(dt)) tipo = 'anuncio'
  else if (/specification|requirement|terms|pliego/.test(dt)) tipo = 'pliego'
  else if (/award/.test(dt)) tipo = 'adjudicacion'
  else if (/clarification/.test(dt)) tipo = 'aclaracion'
  else if (/x_|form|annex/.test(dt)) tipo = 'anexo'
  return {
    nombre: (d.title || dt || 'Documento').slice(0, 200),
    url: d.url,
    formato: detectFormat(d.url, d.format),
    tipo,
  }
}

/**
 * Parsea un release OCDS al shape común. `defaultCountryIso` ej. "GB" para FTS.
 * Pura.
 */
export function parseOcdsRelease(
  release: OcdsRelease,
  fuente: SourceResult['fuente'],
  opts: { defaultCountryIso?: string; nivel: LicitacionNormalizada['nivel'] },
): LicitacionNormalizada | null {
  if (!release || typeof release !== 'object') return null
  const ocid = release.ocid || release.id
  if (!ocid) return null
  const tender = release.tender ?? {}

  const titulo = tender.title || tender.description || 'Licitación'
  const comprador =
    release.buyer?.name ||
    release.parties?.find((p) => p.roles?.includes('buyer'))?.name ||
    'Comprador público'

  // País.
  const ctryName =
    release.buyer?.address?.countryName ||
    release.parties?.find((p) => p.roles?.includes('buyer'))?.address?.countryName ||
    (opts.defaultCountryIso ? countryName(opts.defaultCountryIso) : null)
  const pais = ctryName || (opts.defaultCountryIso ? countryName(opts.defaultCountryIso) : 'Internacional')

  // Valor + moneda.
  const val = tender.value || tender.minValue
  const amount = parseNum(val?.amount)
  const moneda = (val?.currency || 'EUR').toUpperCase()
  const valorEur = moneda === 'EUR' ? amount : toEur(amount, moneda)

  const cpv = ocdsCpv(tender)
  const plazo = toIso(tender.tenderPeriod?.endDate)
  const fechaPub = toIso(release.date)

  const documentos: DocumentoLicitacion[] = []
  const seen = new Set<string>()
  for (const d of tender.documents ?? []) {
    const doc = ocdsDoc(d)
    if (doc && !seen.has(doc.url)) {
      seen.add(doc.url)
      documentos.push(doc)
    }
  }

  return {
    id: `${fuente}:${ocid}`,
    titulo: String(titulo).slice(0, 300),
    comprador: String(comprador).slice(0, 200),
    nivel: opts.nivel,
    pais,
    region: null,
    valor_eur: valorEur,
    moneda,
    cpv,
    plazo,
    fecha_pub: fechaPub,
    url: `${PUBLIC_URL}/Notice/${encodeURIComponent(ocid)}`,
    fuente,
    documentos,
    idioma: (release.language || 'en').slice(0, 2).toLowerCase(),
  }
}

/** Parsea un OCDS release package `{releases:[...]}`. Pura. */
export function parseOcdsReleasePackage(
  json: unknown,
  fuente: SourceResult['fuente'],
  opts: { defaultCountryIso?: string; nivel: LicitacionNormalizada['nivel'] },
): LicitacionNormalizada[] {
  if (!json || typeof json !== 'object') return []
  const o = json as Record<string, unknown>
  const releases = Array.isArray(o.releases) ? o.releases : []
  const out: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const r of releases) {
    const item = parseOcdsRelease(r as OcdsRelease, fuente, opts)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      out.push(item)
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchUkOcdsOpts {
  desde?: string
  hasta?: string
  pageSize?: number
  timeoutMs?: number
  noCache?: boolean
}

/** Construye el rango de fechas OCDS (updatedFrom/To) en ISO. Puro. */
export function ukOcdsRange(opts: FetchUkOcdsOpts): { from: string; to: string } {
  const to = opts.hasta ? `${opts.hasta}T23:59:59` : new Date().toISOString().slice(0, 19)
  const from = opts.desde
    ? `${opts.desde}T00:00:00`
    : new Date(Date.now() - 30 * 24 * 3600_000).toISOString().slice(0, 19)
  return { from, to }
}

export async function fetchUkOcds(opts: FetchUkOcdsOpts = {}): Promise<SourceResult> {
  const { from, to } = ukOcdsRange(opts)
  const limit = Math.max(1, Math.min(100, opts.pageSize ?? 30))
  const params = new URLSearchParams({
    updatedFrom: from,
    updatedTo: to,
    limit: String(limit),
    stages: 'tender',
  })
  const url = `${BASE}?${params.toString()}`
  const cacheKey = `uk-ocds:${params.toString()}`
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

  const items = parseOcdsReleasePackage(res.json, FUENTE, {
    defaultCountryIso: 'GB',
    nivel: 'pais_extranjero',
  })
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, items.length)
  cacheSet(cacheKey, result)
  return result
}
