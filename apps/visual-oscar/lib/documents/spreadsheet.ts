/**
 * Extractor de XLSX/XLS/CSV/TSV usando `xlsx` (SheetJS).
 *
 * Devuelve:
 *   - Texto plano (concatenación de todas las celdas)
 *   - Filas estructuradas (rows[])
 *   - Lista de hojas disponibles
 *   - Tablas con headers
 */

import * as XLSX from 'xlsx'
import type { ExtractedDocument, ExtractOptions } from './types'

export async function extractSpreadsheet(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  opts: ExtractOptions = {},
  format: 'xlsx' | 'xls' | 'csv' | 'tsv' = 'xlsx',
): Promise<ExtractedDocument> {
  const t0 = Date.now()
  const warnings: string[] = []
  const maxChars = opts.maxChars ?? 200_000

  let buf: Buffer
  if (Buffer.isBuffer(buffer)) buf = buffer
  else if (buffer instanceof ArrayBuffer) buf = Buffer.from(buffer)
  else buf = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  try {
    const wb = XLSX.read(buf, {
      type: 'buffer',
      raw: format === 'csv' || format === 'tsv' ? false : true,
      ...(format === 'tsv' ? { FS: '\t' } : {}),
    })

    const sheetNames = wb.SheetNames
    const targetSheets = opts.sheet ? [opts.sheet] : sheetNames

    const allRows: Array<Record<string, string | number | boolean | null>> = []
    const tables: ExtractedDocument['tables'] = []
    const textParts: string[] = []

    for (const sheetName of targetSheets) {
      const sheet = wb.Sheets[sheetName]
      if (!sheet) {
        warnings.push(`sheet_not_found: ${sheetName}`)
        continue
      }
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true })
      const csvText = XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n', blankrows: false })

      // Tabla con headers
      if (json.length > 0) {
        const headers = Object.keys(json[0])
        const rows = json.map(row => headers.map(h => {
          const v = row[h]
          if (v === null || v === undefined) return ''
          return typeof v === 'object' ? JSON.stringify(v) : v as (string | number)
        }))
        tables.push({ headers, rows })
        // Para output también las primeras 100 filas como dict
        for (const row of json.slice(0, 100)) {
          const clean: Record<string, string | number | boolean | null> = {}
          for (const [k, v] of Object.entries(row)) {
            if (v === null || v === undefined) clean[k] = null
            else if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v
            else clean[k] = String(v)
          }
          allRows.push(clean)
        }
      }
      textParts.push(`=== HOJA: ${sheetName} ===\n${csvText}`)
    }

    let text = textParts.join('\n\n')
    if (text.length > maxChars) {
      warnings.push(`text_truncated: ${text.length} chars → ${maxChars}`)
      text = text.slice(0, maxChars) + '\n\n[…texto truncado…]'
    }

    return {
      format,
      text,
      units: allRows.length,
      metadata: {
        sourceSize: buf.length,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      },
      rows: allRows,
      sheets: sheetNames,
      tables,
      warnings,
      extractionMs: Date.now() - t0,
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    return {
      format,
      text: '',
      units: 0,
      metadata: { sourceSize: buf.length },
      warnings: [`spreadsheet_error: ${errMsg.slice(0, 200)}`],
      extractionMs: Date.now() - t0,
    }
  }
}
