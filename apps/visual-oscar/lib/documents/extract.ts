/**
 * Punto de entrada unificado para extracción de documentos.
 *
 * Soporta entrada desde:
 *   - URL (descarga primero)
 *   - Buffer/ArrayBuffer directo
 *
 * Autodetecta formato desde:
 *   1. Hint explícito (opts.format)
 *   2. MIME type del header HTTP
 *   3. Extensión de la URL
 *   4. Magic bytes (PDF: %PDF, ZIP/DOCX/XLSX: PK, JSON: { o [, XML: <?xml o <)
 *
 * Cache compartida para URLs (15 min) — evita re-descargar.
 */

import type { DocumentFormat, DocumentSource, ExtractOptions, ExtractedDocument } from './types'
import { extractPdf } from './pdf'
import { extractDocx } from './docx'
import { extractSpreadsheet } from './spreadsheet'
import { extractXml, extractJson, extractHtml, extractPlainText } from './structured'

const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; DocumentExtractor)'

interface Cache { ts: number; data: ExtractedDocument }
const cache: Map<string, Cache> = new Map()
const CACHE_TTL = 15 * 60 * 1000  // 15 min
const MAX_CACHE_ENTRIES = 100
const MAX_DOWNLOAD_SIZE = 25 * 1024 * 1024  // 25 MB

/**
 * Extrae texto y estructura de un documento desde URL o buffer.
 */
export async function extractDocument(
  source: DocumentSource,
  opts: ExtractOptions = {},
): Promise<ExtractedDocument> {
  // Caché por URL
  if (source.url) {
    const cacheKey = `${source.url}|${opts.maxPages}|${opts.maxChars}|${opts.sheet}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data
  }

  let buffer: ArrayBuffer
  let format: DocumentFormat = source.format ?? 'unknown'
  let mimeHint = source.mimeType

  if (source.buffer) {
    if (source.buffer instanceof ArrayBuffer) buffer = source.buffer
    else if (source.buffer instanceof Uint8Array) {
      buffer = source.buffer.buffer.slice(source.buffer.byteOffset, source.buffer.byteOffset + source.buffer.byteLength) as ArrayBuffer
    } else {
      const b = source.buffer as Buffer
      buffer = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
    }
  } else if (source.url) {
    const downloaded = await downloadUrl(source.url)
    if (!downloaded) {
      return {
        format: 'unknown', text: '', units: 0, metadata: {},
        warnings: ['download_failed'], extractionMs: 0,
      }
    }
    buffer = downloaded.buffer
    if (!mimeHint) mimeHint = downloaded.mimeType
    if (format === 'unknown' && downloaded.mimeType) {
      format = mimeToFormat(downloaded.mimeType)
    }
    if (format === 'unknown') {
      format = formatFromUrl(source.url)
    }
  } else {
    return {
      format: 'unknown', text: '', units: 0, metadata: {},
      warnings: ['no_source_provided'], extractionMs: 0,
    }
  }

  // Detectar formato desde magic bytes si aún unknown
  if (format === 'unknown') {
    format = detectFormatFromMagic(buffer)
  }

  const result = await dispatchExtract(buffer, format, opts)

  // Guardar en caché
  if (source.url) {
    const cacheKey = `${source.url}|${opts.maxPages}|${opts.maxChars}|${opts.sheet}`
    if (cache.size >= MAX_CACHE_ENTRIES) {
      // LRU básico: borrar el más viejo
      const oldest = Array.from(cache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0]
      if (oldest) cache.delete(oldest[0])
    }
    cache.set(cacheKey, { ts: Date.now(), data: result })
  }

  return result
}

async function dispatchExtract(
  buffer: ArrayBuffer,
  format: DocumentFormat,
  opts: ExtractOptions,
): Promise<ExtractedDocument> {
  switch (format) {
    case 'pdf':   return extractPdf(buffer, opts)
    case 'docx':
    case 'doc':   return extractDocx(buffer, opts)
    case 'xlsx':
    case 'xls':   return extractSpreadsheet(buffer, opts, format)
    case 'csv':   return extractSpreadsheet(buffer, opts, 'csv')
    case 'tsv':   return extractSpreadsheet(buffer, opts, 'tsv')
    case 'xml':   return extractXml(buffer, opts)
    case 'json':  return extractJson(buffer, opts)
    case 'html':  return extractHtml(buffer, opts)
    case 'md':
    case 'txt':   return extractPlainText(buffer, format, opts)
    default:
      return {
        format: 'unknown', text: '', units: 0, metadata: {},
        warnings: [`format_unsupported: ${format}`], extractionMs: 0,
      }
  }
}

// ─── Descarga ───────────────────────────────────────────────────────────────

async function downloadUrl(url: string, timeoutMs = 25000): Promise<{ buffer: ArrayBuffer; mimeType: string } | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) return null
    const contentLength = Number(res.headers.get('content-length') || '0')
    if (contentLength > MAX_DOWNLOAD_SIZE) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_DOWNLOAD_SIZE) return null
    return { buffer: buf, mimeType: res.headers.get('content-type') || '' }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// ─── Detección de formato ──────────────────────────────────────────────────

function mimeToFormat(mime: string): DocumentFormat {
  const m = mime.toLowerCase()
  if (m.includes('application/pdf') || m.includes('/pdf')) return 'pdf'
  if (m.includes('wordprocessingml') || m.includes('officedocument.word')) return 'docx'
  if (m.includes('msword')) return 'doc'
  if (m.includes('spreadsheetml') || m.includes('officedocument.sheet')) return 'xlsx'
  if (m.includes('application/vnd.ms-excel')) return 'xls'
  if (m.includes('text/csv') || m.includes('application/csv')) return 'csv'
  if (m.includes('text/tab-separated') || m.includes('application/tab-separated')) return 'tsv'
  if (m.includes('application/xml') || m.includes('text/xml') || m.includes('+xml')) return 'xml'
  if (m.includes('application/json') || m.includes('+json')) return 'json'
  if (m.includes('text/html') || m.includes('application/xhtml')) return 'html'
  if (m.includes('text/markdown')) return 'md'
  if (m.includes('text/plain')) return 'txt'
  return 'unknown'
}

function formatFromUrl(url: string): DocumentFormat {
  const ext = url.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, DocumentFormat> = {
    pdf: 'pdf', docx: 'docx', doc: 'doc', xlsx: 'xlsx', xls: 'xls',
    csv: 'csv', tsv: 'tsv', xml: 'xml', rss: 'xml', atom: 'xml',
    json: 'json', html: 'html', htm: 'html', md: 'md', txt: 'txt',
  }
  return map[ext] || 'unknown'
}

function detectFormatFromMagic(buffer: ArrayBuffer): DocumentFormat {
  const view = new Uint8Array(buffer.slice(0, 16))
  if (view.length < 4) return 'unknown'
  // %PDF
  if (view[0] === 0x25 && view[1] === 0x50 && view[2] === 0x44 && view[3] === 0x46) return 'pdf'
  // PK (ZIP-based: DOCX, XLSX, ODT, etc.)
  if (view[0] === 0x50 && view[1] === 0x4B) {
    // Para distinguir DOCX vs XLSX habría que inspeccionar el ZIP. Default a docx.
    return 'docx'
  }
  // <?xml o <xml
  const sample = new TextDecoder('utf-8', { fatal: false }).decode(view)
  if (sample.startsWith('<?xml') || sample.startsWith('<')) return 'xml'
  // { o [ = JSON
  if (view[0] === 0x7B || view[0] === 0x5B) return 'json'
  // OLE (Microsoft Office antiguo)
  if (view[0] === 0xD0 && view[1] === 0xCF && view[2] === 0x11 && view[3] === 0xE0) return 'doc'
  return 'txt'
}

// ─── Helpers reutilizables ──────────────────────────────────────────────────

/**
 * Extracción rápida → solo el texto plano. Útil para feeding LLMs.
 */
export async function extractText(source: DocumentSource, opts?: ExtractOptions): Promise<string> {
  const result = await extractDocument(source, opts)
  return result.text
}

/**
 * Resumen breve del documento (formato, páginas/filas, tamaño) sin contenido.
 */
export async function summarizeDocument(source: DocumentSource): Promise<{
  format: DocumentFormat
  units: number
  sizeBytes: number
  metadata: ExtractedDocument['metadata']
  warnings: string[]
}> {
  const r = await extractDocument(source, { maxChars: 5000, maxPages: 5 })
  return {
    format: r.format,
    units: r.units,
    sizeBytes: r.metadata.sourceSize || 0,
    metadata: r.metadata,
    warnings: r.warnings,
  }
}
