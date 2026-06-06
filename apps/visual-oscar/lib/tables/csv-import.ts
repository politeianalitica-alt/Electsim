import type { PoliteiTable, TableColumnDef, TableRow, ColumnType } from '@/types/tables'

/**
 * Importación de CSV/TSV a una tabla del workspace. Parser propio (sin
 * dependencias) que soporta comillas, comas/;/tab y saltos de línea dentro de
 * campos entrecomillados. Detecta el delimitador automáticamente.
 */

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const commas = (firstLine.match(/,/g) || []).length
  const semis = (firstLine.match(/;/g) || []).length
  const tabs = (firstLine.match(/\t/g) || []).length
  if (tabs >= commas && tabs >= semis && tabs > 0) return '\t'
  return semis > commas ? ';' : ','
}

/** Convierte texto delimitado en una matriz de strings (filas × celdas). */
export function parseDelimited(text: string, delimiter?: string): string[][] {
  const delim = delimiter ?? detectDelimiter(text)
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"') { inQuotes = true; i++; continue }
    if (c === delim) { cur.push(field); field = ''; i++; continue }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      cur.push(field); field = ''
      rows.push(cur); cur = []
      i++; continue
    }
    field += c; i++
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur) }
  // Descarta filas totalmente vacías
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

function isNumeric(v: string): boolean {
  if (v.trim() === '') return false
  const n = Number(v.trim().replace(/\s/g, '').replace(',', '.'))
  return !isNaN(n) && isFinite(n)
}

function slugKey(label: string, i: number): string {
  const base = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || `col_${i}`
}

export interface CsvPreview {
  headers: string[]
  rows: string[][]
  totalRows: number
}

/** Vista previa ligera (primeras `limit` filas) para confirmar antes de importar. */
export function previewCsv(text: string, limit = 6): CsvPreview {
  const matrix = parseDelimited(text)
  if (!matrix.length) return { headers: [], rows: [], totalRows: 0 }
  const headers = matrix[0].map((h, i) => h.trim() || `Columna ${i + 1}`)
  const rows = matrix.slice(1)
  return { headers, rows: rows.slice(0, limit), totalRows: rows.length }
}

/** Construye una PoliteiTable a partir de texto CSV/TSV. Lanza si está vacío. */
export function buildTableFromCsv(workspaceId: string, name: string, text: string): PoliteiTable {
  const matrix = parseDelimited(text)
  if (matrix.length < 1) throw new Error('El CSV está vacío')
  const headers = matrix[0].map((h, i) => h.trim() || `Columna ${i + 1}`)
  const dataRows = matrix.slice(1)

  const columns: TableColumnDef[] = headers.map((h, i) => {
    const sample = dataRows.slice(0, 50).map(r => (r[i] ?? '').trim()).filter(Boolean)
    const numeric = sample.length > 0 && sample.every(isNumeric)
    const type: ColumnType = numeric ? 'number' : 'text'
    return { id: `col_${i}`, key: slugKey(h, i), label: h, type, sortable: true, filterable: true }
  })

  const rows: TableRow[] = dataRows.map((r, ri) => {
    const row: TableRow = { id: `row_${ri}` }
    columns.forEach((col, i) => {
      const raw = (r[i] ?? '').trim()
      row[col.key] = col.type === 'number' && isNumeric(raw)
        ? Number(raw.replace(/\s/g, '').replace(',', '.'))
        : raw
    })
    return row
  })

  const now = new Date().toISOString()
  return {
    id: `tbl_csv_${Date.now().toString(36)}`,
    workspaceId,
    name: name.trim() || 'Tabla importada',
    description: `Importada de CSV · ${rows.length} filas × ${columns.length} columnas`,
    kind: 'custom',
    columns,
    rows,
    view: 'table',
    createdAt: now,
    updatedAt: now,
    tags: ['csv', 'importada'],
    relatedIssueIds: [],
  }
}
