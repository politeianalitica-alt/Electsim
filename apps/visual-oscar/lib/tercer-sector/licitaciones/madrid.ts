/**
 * Conector Madrid — Ayuntamiento de Madrid · contratos menores · CCAA/local ES · TS6
 *
 * El portal de datos abiertos del Ayuntamiento de Madrid (datos.madrid.es, CKAN
 * 2.9) publica de forma KEYLESS el dataset "Contratos menores" con la actividad
 * contractual menor del consistorio (la vía por la que muchas ONGs y PYMEs
 * acceden a contratación pública local). Lo modelamos como licitación de nivel
 * `ccaa` (entidad local española), región "Comunidad de Madrid", moneda EUR.
 *
 * FUENTE CSV KEYLESS (verificado 2026-06-09):
 *   GET https://datos.madrid.es/dataset/300253-0-contratos-actividad-menores/
 *       resource/300253-26-contratos-actividad-menores-csv/download/
 *       contratos_menores_2026.csv
 *   CSV delimitado por ';' (RFC-4180: campos entrecomillados con `"` que pueden
 *   contener saltos de línea y `;` embebidos). Cabeceras (19 columnas):
 *     N. DE REGISTRO DE CONTRATO · N. DE EXPEDIENTE · CENTRO - SECCION ·
 *     ORGANO DE CONTRATACION · OBJETO DEL CONTRATO · TIPO DE CONTRATO ·
 *     N. DE INVITACIONES CURSADAS · INVITADOS A PRESENTAR OFERTA ·
 *     IMPORTE LICITACION IVA INC. · N. LICITADORES PARTICIPANTES ·
 *     NIF ADJUDICATARIO · RAZON SOCIAL ADJUDICATARIO · PYME ·
 *     IMPORTE ADJUDICACION IVA INC. · FECHA DE ADJUDICACION · PLAZO ·
 *     FECHA DE INSCRIPCION · ORGANISMO_CONTRATANTE · ORGANISMO_PROMOTOR
 *   Importes en formato europeo "15.808,00" (con un byte NBSP 0xA0 final que se
 *   sanea antes de parsear). Fechas en "DD/MM/YY". No expone CPV ni plazo-fecha
 *   de presentación (PLAZO es una duración en meses) → cpv/plazo quedan null.
 *
 * NOTA DE CODIFICACIÓN: el CSV se sirve en bytes Latin-1 (pese a la cabecera
 * `charset=utf-8`). `safeFetch` lo decodifica como UTF-8, por lo que los
 * caracteres acentuados de títulos/órganos pueden aparecer como U+FFFD. La
 * estructura (id, importe, fecha, NIF) es ASCII y se preserva intacta; NUNCA se
 * inventa ningún dato. `parseMadridCsv()` es PURA y testeable con un fixture.
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import { cacheGet, cacheSet, errResult, okResult, parseNum, safeFetch, toEur, toIso } from './shared'

const RESOURCE_CSV =
  'https://datos.madrid.es/dataset/300253-0-contratos-actividad-menores/resource/' +
  '300253-26-contratos-actividad-menores-csv/download/contratos_menores_2026.csv'
const PUBLIC_URL = 'https://datos.madrid.es/portal/site/egob/menuitem.c05c1f754a33a9fbe4b2e4b284f1a5a0/?vgnextoid=300253-0-contratos-actividad-menores'
const FUENTE = 'madrid' as const
const MAX_ITEMS = 50

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture CSV)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Tokeniza un CSV (delimitador configurable) respetando comillas RFC-4180:
 * campos entre `"` pueden contener el delimitador, `"` escapadas (`""`) y
 * saltos de línea. Devuelve filas como arrays de strings. Pura.
 */
export function parseCsvRows(input: string, delim = ';'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field)
      field = ''
    } else if (c === '\r') {
      // ignorar CR (se cierra fila con LF)
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Saca el ruido no numérico (NBSP/U+FFFD/espacios) antes de `parseNum`. */
function cleanAmount(s: string | undefined): string {
  return (s ?? '').replace(/[^\d.,-]/g, '').trim()
}

/** Convierte "DD/MM/YY" o "DD/MM/YYYY" a "YYYY-MM-DD". null si no encaja. */
function ddmmaaaToIso(s: string | undefined): string | null {
  if (!s) return null
  const m = s.replace(/[^\d/]/g, '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return null
  let [, d, mo, y] = m
  if (y.length === 2) y = `20${y}`
  return toIso(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`)
}

/**
 * Parsea el CSV de contratos menores del Ayuntamiento de Madrid al shape común.
 * Tolera columnas faltantes y filas mal formadas (las descarta). Pura.
 */
export function parseMadridCsv(csv: string): { items: LicitacionNormalizada[]; total: number } {
  if (!csv || typeof csv !== 'string') return { items: [], total: 0 }
  const rows = parseCsvRows(csv, ';')
  if (rows.length < 2) return { items: [], total: 0 }

  const header = rows[0].map((h) => h.trim())
  const idx: Record<string, number> = {}
  header.forEach((h, i) => {
    idx[h] = i
  })
  const col = (r: string[], name: string): string | undefined => {
    const i = idx[name]
    return i == null ? undefined : r[i]
  }

  const data = rows.slice(1).filter((r) => r.length === header.length)
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()

  for (const r of data) {
    const reg = (col(r, 'N. DE REGISTRO DE CONTRATO') || col(r, 'N. DE EXPEDIENTE') || '').trim()
    if (!reg) continue
    const id = `${FUENTE}:${reg}`
    if (seen.has(id)) continue
    seen.add(id)

    const titulo =
      (col(r, 'OBJETO DEL CONTRATO') || '').trim() || 'Contrato menor · Ayuntamiento de Madrid'

    // Comprador: el organismo contratante (área de gobierno) o el órgano firmante.
    const comprador =
      (col(r, 'ORGANISMO_CONTRATANTE') || col(r, 'ORGANO DE CONTRATACION') || '').trim() ||
      'Ayuntamiento de Madrid'

    // Importe: adjudicación si la hay (>0), si no el de licitación. EUR.
    const adj = parseNum(cleanAmount(col(r, 'IMPORTE ADJUDICACION IVA INC.')))
    const lic = parseNum(cleanAmount(col(r, 'IMPORTE LICITACION IVA INC.')))
    const importe = adj != null && adj > 0 ? adj : lic

    // Fecha de publicación: la de adjudicación, con respaldo en la de inscripción.
    const fechaPub =
      ddmmaaaToIso(col(r, 'FECHA DE ADJUDICACION')) || ddmmaaaToIso(col(r, 'FECHA DE INSCRIPCION'))

    items.push({
      id,
      titulo: titulo.replace(/\s+/g, ' ').slice(0, 300),
      comprador: comprador.replace(/\s+/g, ' ').slice(0, 200),
      nivel: 'ccaa',
      pais: 'España',
      region: 'Comunidad de Madrid',
      valor_eur: toEur(importe, 'EUR'),
      moneda: 'EUR',
      cpv: null, // El dataset no expone código CPV.
      plazo: null, // "PLAZO" es duración en meses, no una fecha-límite de presentación.
      fecha_pub: fechaPub,
      url: PUBLIC_URL,
      fuente: FUENTE,
      documentos: [],
      idioma: 'es',
    })
    if (items.length >= MAX_ITEMS) break
  }

  return { items, total: data.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}, NUNCA lanza
// ─────────────────────────────────────────────────────────────────────────

/**
 * Descarga y normaliza los contratos menores del Ayuntamiento de Madrid.
 * KEYLESS. Caché 30 min. Limita a ~50 items. Ante cualquier fallo devuelve
 * `errResult` (degradación honesta — nunca lanza).
 */
export async function fetchMadrid(
  opts: { timeoutMs?: number; noCache?: boolean } = {},
): Promise<SourceResult> {
  const cacheKey = `madrid:contratos-menores-2026`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const res = await safeFetch(RESOURCE_CSV, {
    as: 'text',
    timeoutMs: opts.timeoutMs,
    headers: { Accept: 'text/csv,*/*' },
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseMadridCsv(res.text)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
