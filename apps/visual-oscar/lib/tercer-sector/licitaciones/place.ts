/**
 * Conector PLACE / PLACSP (ATOM CODICE/UBL) · ES nacional + CCAA · TS2-lic-src
 *
 * Plataforma de Contratación del Sector Público. El feed ATOM de sindicación
 * agrega licitaciones de la Administración General del Estado Y de la mayoría de
 * CCAA y entidades locales (Ley 9/2017). Por eso cubre los niveles `nacional_es`
 * y `ccaa` de un tirón.
 *
 * Feed: contrataciondelestado.es/sindicacion/.../licitacionesPerfilesContratanteCompleto3.atom
 * Formato: ATOM con bloques CODICE/UBL embebidos (namespaces cac:/cbc:). Los
 * documentos de pliego van en `cac:*DocumentReference/cbc:URI` (o `cbc:Attachment`).
 *
 * Reutiliza el parser regex probado de `lib/placsp.ts` (tag/attr/decode) vía
 * `shared.ts`. Añade EXTRACCIÓN DE DOCUMENTOS (lo que `placsp.ts` no hacía) y
 * normaliza al shape común. `parsePlaceEntries()` es PURO y testeable con un
 * fixture ATOM pequeño (sin red).
 *
 * Cert: el dominio usa cert FNMT; usamos undici Agent con rejectUnauthorized:false
 * (endpoint público de solo lectura) cargado dinámicamente para no romper el
 * harness de tests (que no tiene undici en el path de parsing).
 */
import type { DocumentoLicitacion, LicitacionNormalizada, SourceResult } from './types'
import {
  attr,
  cacheGet,
  cacheSet,
  decode,
  errResult,
  okResult,
  parseNum,
  safeFetch,
  splitEntries,
  tag,
  toIso,
} from './shared'
import { normalizeCpv } from './cpv'

const FEED_URL =
  'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom'
const PUBLIC_URL = 'https://contrataciondelestado.es'
const FUENTE = 'place' as const

const ESTADO_LABELS: Record<string, string> = {
  PUB: 'Publicada',
  RES: 'Resuelta',
  ADJ: 'Adjudicada',
  EV: 'Evaluación',
  ANUL: 'Anulada',
  PRE: 'Preadjudicada',
  PER: 'Pendiente Resolución',
  CREA: 'Creada',
  DESI: 'Desierta',
  FORM: 'Formalizada',
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture ATOM)
// ─────────────────────────────────────────────────────────────────────────

/** Lee el `<summary>` formateado de PLACSP. */
function parseSummary(summary: string): { organo: string; importe: number | null; estado: string } {
  const out = { organo: '', importe: null as number | null, estado: '' }
  const orgM = summary.match(/[OÓ]rgano de Contrataci[oó]n:\s*([^;]+)/i)
  if (orgM) out.organo = orgM[1].trim()
  const impM = summary.match(/Importe:\s*([\d.,]+)\s*EUR/i)
  if (impM) out.importe = parseNum(impM[1])
  const estM = summary.match(/Estado:\s*([A-Z]+)/)
  if (estM) out.estado = estM[1].trim()
  return out
}

/**
 * Extrae documentos de pliego/anexos de un bloque CODICE. Los docs van como
 * `<cac:...DocumentReference> ... <cbc:URI>http...</cbc:URI> ...` y a veces
 * con `<cbc:DocumentType>` / `<cbc:Attachment><cac:ExternalReference><cbc:URI>`.
 * Pura.
 */
export function extractPlaceDocs(block: string): DocumentoLicitacion[] {
  const docs: DocumentoLicitacion[] = []
  const seen = new Set<string>()

  // 1) Cualquier <cbc:URI>...</cbc:URI> dentro del bloque (cubre DocumentReference
  //    y ExternalReference). Filtramos las que no son http.
  const uriRe = /<cbc:URI>([\s\S]*?)<\/cbc:URI>/gi
  let m: RegExpExecArray | null
  while ((m = uriRe.exec(block)) !== null) {
    const url = decode(m[1])
    if (!/^https?:\/\//i.test(url)) continue
    if (seen.has(url)) continue
    seen.add(url)
    // Nombre: intentar FileName cercano, si no el último segmento de la URL.
    const after = block.slice(m.index, m.index + 400)
    const fnM = after.match(/<cbc:FileName>([\s\S]*?)<\/cbc:FileName>/i)
    const dtM = after.match(/<cbc:DocumentType>([\s\S]*?)<\/cbc:DocumentType>/i)
    const nombre = fnM ? decode(fnM[1]) : urlBasename(url)
    const docType = dtM ? decode(dtM[1]) : ''
    docs.push({
      nombre: nombre.slice(0, 200),
      url,
      formato: detectExt(url, docType),
      tipo: classifyDocType(`${nombre} ${docType}`),
    })
  }
  return docs
}

function urlBasename(url: string): string {
  const clean = url.split('?')[0].split('#')[0]
  const seg = clean.split('/').filter(Boolean).pop() || clean
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

function detectExt(url: string, hint: string): string {
  const clean = url.split('?')[0]
  const m = clean.match(/\.([a-z0-9]{2,5})$/i)
  if (m) return m[1].toLowerCase()
  const h = hint.toLowerCase()
  if (/pdf/.test(h)) return 'pdf'
  if (/docx?|word/.test(h)) return 'docx'
  if (/xlsx?|excel/.test(h)) return 'xlsx'
  return 'desconocido'
}

function classifyDocType(text: string): DocumentoLicitacion['tipo'] {
  const t = text.toLowerCase()
  if (/pliego|pcap|ppt|cláusul|clausul|prescripci/.test(t)) return 'pliego'
  if (/anexo|modelo|formulario|declaraci/.test(t)) return 'anexo'
  if (/aclaraci|pregunta|respuesta|rectificaci/.test(t)) return 'aclaracion'
  if (/adjudic|resoluci/.test(t)) return 'adjudicacion'
  if (/anuncio|nota/.test(t)) return 'anuncio'
  return 'otro'
}

/** Parsea un único `<entry>` de PLACE al shape común. Pura. */
export function parsePlaceEntry(block: string): LicitacionNormalizada | null {
  const idUrl = tag(block, 'id')
  if (!idUrl) return null
  const idMatch = idUrl.match(/\/(\d+)\/?$/)
  const rawId = idMatch ? idMatch[1] : idUrl
  const id = `place:${rawId}`

  const titulo = tag(block, 'title')
  const summary = tag(block, 'summary')
  const updated = tag(block, 'updated')
  const linkHref = attr(block, 'link', 'href')

  const sum = parseSummary(summary)

  // Organismo: del summary o de PartyName/Name.
  let comprador = sum.organo
  if (!comprador) {
    const nameMatch = block.match(/<cac:PartyName>[\s\S]*?<cbc:Name>([\s\S]*?)<\/cbc:Name>/i)
    if (nameMatch) comprador = decode(nameMatch[1])
  }

  // Importe: del summary o de TotalAmount/TaxExclusiveAmount.
  let importe = sum.importe
  if (importe == null) {
    const totalMatch =
      block.match(/<cbc:TotalAmount[^>]*>([\d.,]+)<\/cbc:TotalAmount>/i) ||
      block.match(/<cbc:TaxExclusiveAmount[^>]*>([\d.,]+)<\/cbc:TaxExclusiveAmount>/i) ||
      block.match(/<cbc:EstimatedOverallContractAmount[^>]*>([\d.,]+)<\/cbc:EstimatedOverallContractAmount>/i)
    if (totalMatch) importe = parseNum(totalMatch[1])
  }

  // Ciudad / región.
  let region: string | null = null
  const ciudadMatch = block.match(/<cbc:CityName>([^<]+)<\/cbc:CityName>/i)
  if (ciudadMatch) region = decode(ciudadMatch[1])
  if (!region) {
    const countrySub = block.match(/<cbc:CountrySubentity>([^<]+)<\/cbc:CountrySubentity>/i)
    if (countrySub) region = decode(countrySub[1])
  }

  // CPV.
  let cpv: string | null = null
  const cpvMatch = block.match(/<cbc:ItemClassificationCode[^>]*>([0-9-]+)</i)
  if (cpvMatch) cpv = normalizeCpv(cpvMatch[1])

  // Plazo de presentación (cac:TenderSubmissionDeadlinePeriod/cbc:EndDate).
  let plazo: string | null = null
  const deadlineM = block.match(
    /<cac:TenderSubmissionDeadlinePeriod>[\s\S]*?<cbc:EndDate>([\s\S]*?)<\/cbc:EndDate>/i,
  )
  if (deadlineM) plazo = toIso(decode(deadlineM[1]))

  const documentos = extractPlaceDocs(block)

  // Heurística de nivel: si la región/ciudad sugiere CCAA/local, marcamos ccaa;
  // por defecto PLACE es nacional_es (cobertura mixta; el detalle real lo da el
  // organismo). Mantener conservador: con región conocida → ccaa.
  const nivel = region ? 'ccaa' : 'nacional_es'

  return {
    id,
    titulo: (titulo || 'Sin título').slice(0, 300),
    comprador: (comprador || 'Desconocido').slice(0, 200),
    nivel,
    pais: 'España',
    region,
    valor_eur: importe,
    moneda: 'EUR',
    cpv,
    plazo,
    fecha_pub: toIso(updated),
    url: linkHref || idUrl,
    fuente: FUENTE,
    documentos,
    idioma: 'es',
  }
}

/** Parsea un feed ATOM completo de PLACE a licitaciones normalizadas. Pura. */
export function parsePlaceEntries(xml: string): LicitacionNormalizada[] {
  if (!xml || typeof xml !== 'string') return []
  const blocks = splitEntries(xml, 'entry')
  const out: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const block of blocks) {
    const item = parsePlaceEntry(block)
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

/**
 * Descarga el feed ATOM de PLACE y lo normaliza. Caché 30 min. Usa undici Agent
 * (cert FNMT) cargado dinámicamente; si no está disponible, cae al fetch global.
 */
export async function fetchPlace(opts: { timeoutMs?: number; noCache?: boolean } = {}): Promise<SourceResult> {
  const cacheKey = 'place:feed643'
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  // Cargar undici dinámicamente (no romper el harness de tests).
  let dispatcher: unknown
  try {
    const undici = (await import('undici')) as unknown as {
      Agent: new (o: unknown) => unknown
    }
    dispatcher = new undici.Agent({
      connect: { rejectUnauthorized: false },
      bodyTimeout: 30000,
      headersTimeout: 15000,
    })
  } catch {
    dispatcher = undefined
  }

  const res = await safeFetch(FEED_URL, {
    as: 'text',
    timeoutMs: opts.timeoutMs,
    dispatcher,
    headers: { Accept: 'application/atom+xml, application/xml, */*' },
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const licitaciones = parsePlaceEntries(res.text)
  if (licitaciones.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, licitaciones, PUBLIC_URL, licitaciones.length)
  cacheSet(cacheKey, result)
  return result
}
