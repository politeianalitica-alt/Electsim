/**
 * Capa de documentos · re-exports.
 *
 * Uso típico:
 *
 *   import { extractDocument, extractText } from '@/lib/documents'
 *
 *   const doc = await extractDocument({ url: 'https://www.boe.es/.../l.pdf' })
 *   console.log(doc.text)           // texto plano
 *   console.log(doc.metadata)       // título, autor, fechas
 *   console.log(doc.tables)         // tablas estructuradas (HTML/XLSX)
 *   console.log(doc.rows)           // filas estructuradas (CSV/JSON/XLSX)
 *
 * Para feeding LLMs:
 *
 *   const text = await extractText({ url: pdfUrl }, { maxPages: 20 })
 */

export { extractDocument, extractText, summarizeDocument } from './extract'
export { extractPdf } from './pdf'
export { extractDocx } from './docx'
export { extractSpreadsheet } from './spreadsheet'
export { extractXml, extractJson, extractHtml, extractPlainText } from './structured'
export type {
  DocumentFormat,
  DocumentSource,
  ExtractOptions,
  ExtractedDocument,
} from './types'
