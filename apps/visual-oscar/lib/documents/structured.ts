/**
 * Extractores ligeros para XML/JSON/HTML/TXT/MD.
 * No requieren dependencias externas.
 */

import type { ExtractedDocument, ExtractOptions } from './types'

export function extractXml(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  opts: ExtractOptions = {},
): ExtractedDocument {
  const t0 = Date.now()
  const warnings: string[] = []
  const maxChars = opts.maxChars ?? 200_000

  let text: string
  try {
    // Detectar encoding desde declaración XML o asumir UTF-8
    const buf = bufferOf(buffer)
    const sampleU8 = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 300))
    const encMatch = sampleU8.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i)
    const enc = encMatch ? encMatch[1].toLowerCase() : 'utf-8'
    try {
      text = new TextDecoder(enc).decode(buf)
    } catch {
      text = new TextDecoder('utf-8').decode(buf)
      warnings.push(`xml_encoding_fallback: declarado ${enc}, usado utf-8`)
    }
    if (text.length > maxChars) {
      warnings.push(`text_truncated: ${text.length} → ${maxChars}`)
      text = text.slice(0, maxChars)
    }

    // Detectar tablas dentro del XML (elementos repetidos a nivel hijo)
    const tags = Array.from(text.matchAll(/<([a-zA-Z][\w-]*)[\s>]/g)).map(m => m[1])
    const tagCount: Record<string, number> = {}
    for (const t of tags) tagCount[t] = (tagCount[t] || 0) + 1
    const repeatedTags = Object.entries(tagCount).filter(([_, n]) => n > 5).map(([t]) => t)

    return {
      format: 'xml',
      text,
      units: tags.length,
      metadata: { sourceSize: buf.length, wordCount: text.split(/\s+/).filter(Boolean).length },
      warnings: [...warnings, ...(repeatedTags.length > 0 ? [`repeated_tags: ${repeatedTags.slice(0, 5).join(', ')}`] : [])],
      extractionMs: Date.now() - t0,
    }
  } catch (e) {
    return {
      format: 'xml',
      text: '',
      units: 0,
      metadata: {},
      warnings: [`xml_error: ${String(e).slice(0, 200)}`],
      extractionMs: Date.now() - t0,
    }
  }
}

export function extractJson(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  opts: ExtractOptions = {},
): ExtractedDocument {
  const t0 = Date.now()
  const maxChars = opts.maxChars ?? 200_000
  const buf = bufferOf(buffer)
  let text = new TextDecoder('utf-8').decode(buf)
  const warnings: string[] = []

  let units = 0
  let rows: ExtractedDocument['rows'] = []
  try {
    const json = JSON.parse(text)
    if (Array.isArray(json)) {
      units = json.length
      rows = json.slice(0, 100).map(item => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const clean: Record<string, string | number | boolean | null> = {}
          for (const [k, v] of Object.entries(item)) {
            if (v === null || v === undefined) clean[k] = null
            else if (typeof v === 'object') clean[k] = JSON.stringify(v).slice(0, 200)
            else clean[k] = v as string | number | boolean
          }
          return clean
        }
        return { value: String(item) }
      })
      text = JSON.stringify(json.slice(0, 50), null, 2)
    } else if (typeof json === 'object' && json !== null) {
      text = JSON.stringify(json, null, 2)
      units = Object.keys(json).length
    }
  } catch (e) {
    warnings.push(`json_parse_error: ${String(e).slice(0, 200)}`)
  }

  if (text.length > maxChars) {
    warnings.push(`text_truncated: ${text.length} → ${maxChars}`)
    text = text.slice(0, maxChars)
  }

  return {
    format: 'json',
    text,
    units,
    metadata: { sourceSize: buf.length, wordCount: text.split(/\s+/).filter(Boolean).length },
    rows,
    warnings,
    extractionMs: Date.now() - t0,
  }
}

export function extractHtml(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  opts: ExtractOptions = {},
): ExtractedDocument {
  const t0 = Date.now()
  const maxChars = opts.maxChars ?? 200_000
  const buf = bufferOf(buffer)

  // Detectar encoding desde meta http-equiv o asumir UTF-8
  const sample = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 2048))
  const charsetMatch = sample.match(/<meta[^>]+charset=["']?([\w-]+)/i)
  const enc = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8'
  let html: string
  try {
    html = new TextDecoder(enc).decode(buf)
  } catch {
    html = new TextDecoder('utf-8').decode(buf)
  }

  // Extraer texto plano: quitar scripts/styles, luego tags
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  const stripped = noScript.replace(/<[^>]+>/g, ' ')
  let text = stripped
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').trim()

  // Extraer título
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : undefined

  // Extraer tablas (<table>)
  const tables: ExtractedDocument['tables'] = []
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tm
  while ((tm = tableRe.exec(html)) !== null) {
    const tableHtml = tm[1]
    const rows: (string | number)[][] = []
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rm
    while ((rm = rowRe.exec(tableHtml)) !== null) {
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      const cells: string[] = []
      let cm
      while ((cm = cellRe.exec(rm[1])) !== null) {
        cells.push(cm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      }
      if (cells.length > 0) rows.push(cells)
    }
    if (rows.length > 0) {
      const headers = rows[0].map(String)
      tables.push({ headers, rows: rows.slice(1) })
    }
  }

  const warnings: string[] = []
  if (text.length > maxChars) {
    warnings.push(`text_truncated: ${text.length} → ${maxChars}`)
    text = text.slice(0, maxChars)
  }

  return {
    format: 'html',
    text,
    units: tables.length,
    metadata: {
      sourceSize: buf.length,
      title,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    },
    tables,
    warnings,
    extractionMs: Date.now() - t0,
  }
}

export function extractPlainText(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  format: 'txt' | 'md' = 'txt',
  opts: ExtractOptions = {},
): ExtractedDocument {
  const t0 = Date.now()
  const maxChars = opts.maxChars ?? 200_000
  const buf = bufferOf(buffer)
  let text = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  const warnings: string[] = []
  if (text.length > maxChars) {
    warnings.push(`text_truncated: ${text.length} → ${maxChars}`)
    text = text.slice(0, maxChars)
  }
  return {
    format,
    text,
    units: text.split('\n\n').length,
    metadata: { sourceSize: buf.length, wordCount: text.split(/\s+/).filter(Boolean).length },
    warnings,
    extractionMs: Date.now() - t0,
  }
}

function bufferOf(buffer: ArrayBuffer | Uint8Array | Buffer): Uint8Array {
  if (buffer instanceof Uint8Array) return buffer
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer)
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}
