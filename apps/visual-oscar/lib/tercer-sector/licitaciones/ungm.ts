/**
 * Conector UNGM — UN Global Marketplace · ONU · TS6-lic-src
 *
 * UNGM (ungm.org) es el portal único de oportunidades de compra de las agencias
 * del Sistema de Naciones Unidas (FAO, PNUD, UNICEF, ACNUR, OMS, WFP, etc.).
 * Para el tercer sector y la cooperación internacional son licitaciones muy
 * relevantes (consultorías, suministros, servicios en terreno). Las modelamos
 * como licitación de nivel `org_internacional`.
 *
 * ENDPOINT KEYLESS (verificado · sin login):
 *   POST https://www.ungm.org/Public/Notice/Search
 *   Content-Type: application/json
 *   Body: { PageIndex, PageSize, SortField:"DatePublished", SortAscending:false, ... }
 *   Respuesta: NO es JSON. Devuelve un fragmento HTML con una fila por aviso:
 *     <div role="row" data-noticeid="NNN" class="tableRow dataRow notice-table">
 *       <div role="cell" class="tableCell resultTitle">…título…</div>
 *       <div role="cell" class="tableCell resultInfo1 deadline">DD-Mon-YYYY HH:MM (GMT ±x.xx) …</div>
 *       <div role="cell" class="tableCell">DD-Mon-YYYY</div>            ← publicado
 *       <div role="cell" class="tableCell resultAgency">FAO</div>       ← agencia ONU
 *       <div role="cell" class="tableCell">Request for proposal</div>   ← tipo (no usado)
 *       <div role="cell" class="tableCell resultInfo1">2026/…/137144</div> ← referencia
 *       <div role="cell" class="tableCell">Guyana</div>                  ← país destino
 *     </div>
 *   UNGM NO publica importe estimado en estos avisos → valor_eur = null (honesto).
 *   Usa UNSPSC (no CPV) y no aparece en la fila → cpv = null.
 *
 * `parseUngmRows()` es PURA y testeable con un fixture HTML pequeño (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import { cacheGet, cacheSet, errResult, okResult, safeFetch, toIso } from './shared'

const SEARCH_URL = 'https://www.ungm.org/Public/Notice/Search'
const PUBLIC_URL = 'https://www.ungm.org/Public/Notice'
const NOTICE_URL = 'https://www.ungm.org/Public/Notice'
const FUENTE = 'ungm' as const

// ─────────────────────────────────────────────────────────────────────────
// Nombre de país EN → ES (subset de países donde la ONU contrata habitualmente).
// Para los no listados se conserva el nombre original (la fuente da inglés).
// ─────────────────────────────────────────────────────────────────────────
const COUNTRY_ES: Record<string, string> = {
  spain: 'España',
  'united kingdom': 'Reino Unido',
  'united states': 'Estados Unidos',
  'united states of america': 'Estados Unidos',
  france: 'Francia',
  germany: 'Alemania',
  italy: 'Italia',
  portugal: 'Portugal',
  switzerland: 'Suiza',
  belgium: 'Bélgica',
  netherlands: 'Países Bajos',
  denmark: 'Dinamarca',
  guyana: 'Guyana',
  guinea: 'Guinea',
  'guinea-bissau': 'Guinea-Bisáu',
  venezuela: 'Venezuela',
  colombia: 'Colombia',
  mexico: 'México',
  argentina: 'Argentina',
  brazil: 'Brasil',
  peru: 'Perú',
  ecuador: 'Ecuador',
  bolivia: 'Bolivia',
  paraguay: 'Paraguay',
  uruguay: 'Uruguay',
  chile: 'Chile',
  honduras: 'Honduras',
  guatemala: 'Guatemala',
  'el salvador': 'El Salvador',
  nicaragua: 'Nicaragua',
  panama: 'Panamá',
  'costa rica': 'Costa Rica',
  'dominican republic': 'República Dominicana',
  haiti: 'Haití',
  cuba: 'Cuba',
  morocco: 'Marruecos',
  tunisia: 'Túnez',
  algeria: 'Argelia',
  egypt: 'Egipto',
  ethiopia: 'Etiopía',
  kenya: 'Kenia',
  nigeria: 'Nigeria',
  ghana: 'Ghana',
  senegal: 'Senegal',
  mali: 'Malí',
  niger: 'Níger',
  chad: 'Chad',
  sudan: 'Sudán',
  'south sudan': 'Sudán del Sur',
  somalia: 'Somalia',
  uganda: 'Uganda',
  tanzania: 'Tanzania',
  mozambique: 'Mozambique',
  angola: 'Angola',
  'democratic republic of the congo': 'R.D. del Congo',
  'cote d’ivoire': "Costa de Marfil",
  "cote d'ivoire": 'Costa de Marfil',
  cameroon: 'Camerún',
  zimbabwe: 'Zimbabue',
  zambia: 'Zambia',
  malawi: 'Malaui',
  rwanda: 'Ruanda',
  'burkina faso': 'Burkina Faso',
  afghanistan: 'Afganistán',
  pakistan: 'Pakistán',
  india: 'India',
  bangladesh: 'Bangladés',
  nepal: 'Nepal',
  'sri lanka': 'Sri Lanka',
  myanmar: 'Birmania',
  cambodia: 'Camboya',
  'lao people’s democratic republic': 'Laos',
  vietnam: 'Vietnam',
  indonesia: 'Indonesia',
  philippines: 'Filipinas',
  'timor-leste': 'Timor Oriental',
  'papua new guinea': 'Papúa Nueva Guinea',
  jordan: 'Jordania',
  lebanon: 'Líbano',
  'syrian arab republic': 'Siria',
  iraq: 'Irak',
  yemen: 'Yemen',
  'state of palestine': 'Palestina',
  turkey: 'Turquía',
  ukraine: 'Ucrania',
}

/** Traduce un nombre de país inglés a español; si no se conoce, lo devuelve tal cual. */
function paisEs(raw: string): string {
  const clean = raw.trim()
  if (!clean) return 'Internacional'
  return COUNTRY_ES[clean.toLowerCase()] ?? clean
}

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO del HTML de filas (sin red) — testeable con fixture
// ─────────────────────────────────────────────────────────────────────────

/** Decodifica entidades HTML básicas (incluye numéricas) y normaliza espacios. */
function decodeText(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()
}

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

/**
 * Convierte una fecha UNGM ("DD-Mon-YYYY" o "DD-Mon-YYYY HH:MM (GMT ±x.xx)") a
 * ISO-8601. Solo extrae la parte de fecha (la hora/offset es ruidosa). null si
 * no encaja el formato.
 */
function ungmDateToIso(raw: string): string | null {
  const m = raw.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/)
  if (!m) return null
  const mm = MONTHS[m[2].toLowerCase()]
  if (!mm) return null
  const dd = m[1].padStart(2, '0')
  return toIso(`${m[3]}-${mm}-${dd}`)
}

/** Trocea el HTML en bloques `<div role="row" ... data-noticeid="NNN" ...>…`. */
function splitRows(html: string): string[] {
  const blocks = html.split(/(?=<div\s+role="row"[^>]*data-noticeid=)/i)
  return blocks.filter((b) => /data-noticeid=/i.test(b))
}

/** Devuelve el texto del primer cell con la clase exacta dada (p.ej. "resultTitle"). */
function cellByClass(row: string, cls: string): string {
  const re = new RegExp(
    `<div[^>]*\\brole="cell"[^>]*\\bclass="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/div>`,
    'i',
  )
  const m = row.match(re)
  return m ? decodeText(m[1]) : ''
}

/**
 * Extrae el texto de TODAS las celdas `role="cell"` de una fila, en orden. Las
 * celdas con sub-divs anidados (botones) se recortan por el primer cierre, lo
 * que es suficiente para las celdas de datos planas (publicado, tipo, país).
 */
function cellsInOrder(row: string): string[] {
  const out: string[] = []
  // Eliminar scripts inline que UNGM incrusta tras la última celda de datos.
  const clean = row.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  const re = /<div[^>]*\brole="cell"[^>]*\bclass="([^"]*)"[^>]*>/gi
  let m: RegExpExecArray | null
  const starts: { idx: number; cls: string; tagLen: number }[] = []
  while ((m = re.exec(clean)) !== null) {
    starts.push({ idx: m.index, cls: m[1], tagLen: m[0].length })
  }
  for (let i = 0; i < starts.length; i++) {
    const begin = starts[i].idx + starts[i].tagLen
    const end = i + 1 < starts.length ? starts[i + 1].idx : clean.length
    out.push(decodeText(clean.slice(begin, end)))
  }
  return out
}

/** Parsea una fila de aviso UNGM al shape común. Pura. null si no hay id/título. */
export function parseUngmRow(row: string): LicitacionNormalizada | null {
  if (!row) return null
  const idM = row.match(/data-noticeid="(\d+)"/i)
  if (!idM) return null
  const remoteId = idM[1]

  const titulo = cellByClass(row, 'resultTitle')
  if (!titulo) return null

  const deadlineCell = cellByClass(row, 'deadline')
  const agencia = cellByClass(row, 'resultAgency')

  // Celdas posicionales para los campos sin clase distintiva (la clase
  // `resultInfo1` la comparten deadline y referencia, así que NO sirve para
  // distinguirlas: usamos la posición, que es estable):
  // [0]=opciones [1]=título [2]=deadline [3]=publicado [4]=agencia [5]=tipo [6]=ref [7]=país
  const cells = cellsInOrder(row)
  const publicadoCell = cells[3] ?? ''
  const referencia = cells[6] ?? ''
  const paisCell = cells[7] ?? cells[cells.length - 1] ?? ''

  const fechaPub = ungmDateToIso(publicadoCell)
  const plazo = ungmDateToIso(deadlineCell)
  const pais = paisEs(paisCell)

  const comprador = agencia
    ? `Naciones Unidas · ${agencia}`
    : 'Naciones Unidas (UNGM)'

  const tituloFinal = referencia
    ? `${titulo} (${referencia})`.slice(0, 300)
    : titulo.slice(0, 300)

  return {
    id: `ungm:${remoteId}`,
    titulo: tituloFinal,
    comprador: comprador.slice(0, 200),
    nivel: 'org_internacional',
    pais,
    region: null,
    valor_eur: null, // UNGM no publica importe estimado en estos avisos.
    moneda: 'EUR',
    cpv: null, // UNGM usa UNSPSC, no CPV.
    plazo,
    fecha_pub: fechaPub,
    url: `${NOTICE_URL}/${remoteId}`,
    fuente: FUENTE,
    documentos: [],
    idioma: 'en',
  }
}

/** Parsea el fragmento HTML de búsqueda UNGM. Pura. Limita a `max` items. */
export function parseUngmRows(
  html: string,
  max = 50,
): { items: LicitacionNormalizada[]; total: number } {
  if (!html || typeof html !== 'string') return { items: [], total: 0 }
  const rows = splitRows(html)
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (items.length >= max) break
    const item = parseUngmRow(row)
    if (item && !seen.has(item.id)) {
      seen.add(item.id)
      items.push(item)
    }
  }
  return { items, total: rows.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}, NUNCA lanza
// ─────────────────────────────────────────────────────────────────────────

export interface FetchUngmOpts {
  q?: string
  pageSize?: number
  timeoutMs?: number
  noCache?: boolean
}

/**
 * Busca oportunidades de compra en UN Global Marketplace. KEYLESS. Caché 30 min.
 * Degrada a `{ok:false}` ante fallo (nunca lanza). Limita a ~50 items.
 */
export async function fetchUngm(opts: FetchUngmOpts = {}): Promise<SourceResult> {
  const pageSize = Math.max(1, Math.min(50, opts.pageSize ?? 50))
  const q = (opts.q ?? '').trim()

  const body = JSON.stringify({
    PageIndex: 0,
    PageSize: pageSize,
    Title: q,
    Description: '',
    Reference: '',
    PublishedFrom: '',
    PublishedTo: '',
    DeadlineFrom: '',
    DeadlineTo: '',
    Countries: [],
    Agencies: [],
    UNSPSCs: [],
    NoticeTypes: [],
    SortField: 'DatePublished',
    SortAscending: false,
  })

  const cacheKey = `ungm:${pageSize}:${q}`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const res = await safeFetch(SEARCH_URL, {
    as: 'text',
    method: 'POST',
    body,
    timeoutMs: opts.timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/html, */*',
    },
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseUngmRows(res.text, pageSize)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
