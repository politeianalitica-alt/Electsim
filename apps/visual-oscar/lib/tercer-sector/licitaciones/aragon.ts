/**
 * Conector Aragón Open Data — Contratación del Gobierno de Aragón · ES/CCAA · TS6
 *
 * Aragón Open Data (opendata.aragon.es) publica el catálogo "Contratos Gobierno
 * de Aragón". El dato VIVO (ejercicio en curso) no vive en el datastore CKAN
 * —que solo conserva volcados antiguos— sino en el endpoint BRSCGI de la base
 * documental AODB, que sirve el listado de contratos formalizados en CSV y XML
 * sin clave de API.
 *
 * Fuente KEYLESS (CSV, sección OPENDATACONTCSV):
 *   https://gd.aragon.es/cgi-bin/AODB/BRSCGI?CMD=VERLST&BASE=CONT
 *     &DOCS=1-<n>&SEC=OPENDATACONTCSV&SORT=-EJER,CMEN&SEPARADOR=
 *     &@EJER-GE=<desde>&@EJER-LE=<hasta>&PROC-C=&IDAD-C=&ORGA-C=&TIPC-C=&CMEN-C=
 *
 *   El CSV usa `;` como separador, comillas dobles y PERMITE saltos de línea
 *   dentro de campos entrecomillados (ej. razones sociales con dirección). Por
 *   eso el parser es un mini-CSV con estado (no un `split(';')`).
 *
 *   Columnas (cabecera real verificada):
 *     0 Obj · 1 Organo · 2 Procedimiento · 3 Tipo de contrato
 *     4 Importe de licitación · 5 Importe de adjudicación
 *     6 Instrumento de publicación · 7 Número de licitadores
 *     8 Identidad del adjudicatario · 9 Ejercicio · 10 Código Expediente · 11 M
 *
 *   ¡OJO! La variante XML (OPENDATACONTXML) tiene un BUG: `<organo>` duplica el
 *   objeto del contrato en vez del órgano. El CSV es la única forma fiable de
 *   separar título (Obj) y comprador (Organo) → usamos CSV.
 *
 * Encoding: el endpoint sirve ISO-8859-1. `safeFetch` decodifica como UTF-8, lo
 * que convierte los acentos/0xA0 en U+FFFD (decodificación con pérdida). No es
 * recuperable byte a byte, así que colapsamos U+FFFD a espacio para mantener los
 * textos legibles (el caso dominante es el 0xA0 que separa palabras). Nunca
 * inventamos: si un dato falta o queda ilegible, va null.
 *
 * `parseAragonCsv()` es PURO y testeable con un fixture CSV (sin red).
 */
import type { LicitacionNormalizada, SourceResult } from './types'
import { cacheGet, cacheSet, errResult, okResult, parseNum, safeFetch, toEur, toIso } from './shared'

const BASE = 'https://gd.aragon.es/cgi-bin/AODB/BRSCGI'
const PUBLIC_URL =
  'https://opendata.aragon.es/datos/catalogo/dataset/contratos-gobierno-de-aragon'
const FUENTE = 'aragon' as const
const MAX_ITEMS = 50

// ─────────────────────────────────────────────────────────────────────────
// Parsing PURO (testeable con fixture CSV)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Repara mojibake de la decodificación UTF-8 sobre bytes ISO-8859-1: el byte
 * inválido aparece como U+FFFD. No es reversible, así que lo colapsamos a un
 * espacio (caso dominante: 0xA0 separador) y normalizamos espacios.
 */
function repair(s: string): string {
  return s.replace(/�/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Mini-parser CSV con estado. Separador `;`, comillas `"`, `""` escapa comilla,
 * y los saltos de línea DENTRO de comillas no rompen la fila. Devuelve filas de
 * celdas (strings crudas, sin reparar). Puro.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
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
    } else if (c === ';') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      // Cierra la fila solo si hay contenido acumulado (evita filas vacías).
      if (field !== '' || row.length > 0) {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      }
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Construye la URL pública de la ficha a partir del código de expediente. */
function expedienteUrl(codigo: string | null): string {
  if (codigo)
    return `https://contratantes.aragon.es/?codExp=${encodeURIComponent(codigo)}`
  return PUBLIC_URL
}

/**
 * Parsea el CSV de contratos de Aragón al shape común. Asume la cabecera real
 * verificada (12 columnas). Pura. Limita a `MAX_ITEMS`.
 */
export function parseAragonCsv(text: string): { items: LicitacionNormalizada[]; total: number } {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return { items: [], total: 0 }

  // La primera fila es cabecera. El resto son contratos.
  const dataRows = rows.slice(1)
  const items: LicitacionNormalizada[] = []
  const seen = new Set<string>()

  for (const cols of dataRows) {
    if (cols.length < 11) continue // fila incompleta → se descarta (no se inventa)

    const titulo = repair(cols[0] ?? '')
    const organo = repair(cols[1] ?? '')
    const importeLicit = repair(cols[4] ?? '')
    const ejercicio = repair(cols[9] ?? '')
    const codigo = repair(cols[10] ?? '') || null

    // remoteId estable: código de expediente; si falta, ejercicio+título truncado.
    const remoteId = codigo || `${ejercicio}-${titulo.slice(0, 40)}`
    if (!remoteId.trim()) continue
    const id = `aragon:${remoteId}`
    if (seen.has(id)) continue
    seen.add(id)

    const valor = toEur(parseNum(importeLicit), 'EUR')

    items.push({
      id,
      titulo: (titulo || 'Contrato Gobierno de Aragón').slice(0, 300),
      comprador: (organo || 'Gobierno de Aragón').slice(0, 200),
      nivel: 'ccaa',
      pais: 'España',
      region: 'Aragón',
      valor_eur: valor,
      moneda: 'EUR',
      cpv: null, // la fuente no expone CPV
      plazo: null, // contratos ya formalizados: sin plazo de presentación
      fecha_pub: toIso(ejercicio), // solo se conoce el ejercicio (año)
      url: expedienteUrl(codigo),
      fuente: FUENTE,
      documentos: [],
      idioma: 'es',
    })

    if (items.length >= MAX_ITEMS) break
  }

  return { items, total: items.length }
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resiliente (red) — degrada a SourceResult{ok:false}
// ─────────────────────────────────────────────────────────────────────────

export interface FetchAragonOpts {
  timeoutMs?: number
  noCache?: boolean
}

/**
 * Descarga los contratos del Gobierno de Aragón (ventana de los 3 últimos
 * ejercicios, más recientes primero). KEYLESS. Caché 30 min. Degrada a
 * `{ok:false}` ante fallo (nunca lanza).
 */
export async function fetchAragon(opts: FetchAragonOpts = {}): Promise<SourceResult> {
  const hasta = new Date().getUTCFullYear()
  const desde = hasta - 2 // ventana de 3 ejercicios

  const params = new URLSearchParams({
    CMD: 'VERLST',
    BASE: 'CONT',
    DOCS: `1-${MAX_ITEMS}`,
    SEC: 'OPENDATACONTCSV',
    SORT: '-EJER,CMEN',
    SEPARADOR: '',
    '@EJER-GE': String(desde),
    '@EJER-LE': String(hasta),
    'PROC-C': '',
    'IDAD-C': '',
    'ORGA-C': '',
    'TIPC-C': '',
    'CMEN-C': '',
  })

  const url = `${BASE}?${params.toString()}`
  const cacheKey = `aragon:${desde}-${hasta}`
  if (!opts.noCache) {
    const hit = cacheGet(cacheKey)
    if (hit) return hit
  }

  const res = await safeFetch(url, {
    as: 'text',
    timeoutMs: opts.timeoutMs,
    headers: { Accept: 'text/csv,*/*' },
  })

  if (res.error) return errResult(FUENTE, res.error, PUBLIC_URL)
  if (!res.ok) return errResult(FUENTE, `http_${res.status}`, PUBLIC_URL)

  const { items, total } = parseAragonCsv(res.text)
  if (items.length === 0) return errResult(FUENTE, 'sin_datos', PUBLIC_URL)

  const result = okResult(FUENTE, items, PUBLIC_URL, total)
  cacheSet(cacheKey, result)
  return result
}
