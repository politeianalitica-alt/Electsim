/**
 * Tipos del sistema de extracción de documentos.
 *
 * Soporta: PDF, DOCX, XLSX, XLS, CSV, TSV, XML, JSON, TXT/MD, HTML.
 */

export type DocumentFormat =
  | 'pdf' | 'docx' | 'doc'
  | 'xlsx' | 'xls' | 'csv' | 'tsv'
  | 'xml' | 'json'
  | 'txt' | 'md' | 'html'
  | 'unknown'

export interface ExtractOptions {
  /** Máximo de páginas a extraer (PDF). Default: 50 */
  maxPages?: number
  /** Máximo de caracteres a devolver. Default: 200_000 */
  maxChars?: number
  /** Para XLSX: nombre de hoja específica, o todas si null */
  sheet?: string | null
  /** Para PDF: extraer también metadata */
  includeMetadata?: boolean
  /** Idioma para OCR (futuro) */
  language?: 'es' | 'en' | 'ca' | 'eu' | 'gl'
}

export interface ExtractedDocument {
  format: DocumentFormat
  /** Texto plano extraído */
  text: string
  /** Número de páginas (PDF) o filas (CSV/XLSX) o secciones */
  units: number
  /** Metadatos del documento */
  metadata: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: string
    modificationDate?: string
    pageCount?: number
    wordCount?: number
    /** Tamaño en bytes del origen */
    sourceSize?: number
  }
  /** Para tablas (CSV/XLSX), las primeras filas estructuradas */
  rows?: Array<Record<string, string | number | boolean | null>>
  /** Para XLSX, nombres de hojas */
  sheets?: string[]
  /** Para HTML/XML, estructura tabular si la hay */
  tables?: Array<{ headers: string[]; rows: Array<(string | number)[]> }>
  /** Warnings no fatales */
  warnings: string[]
  /** Tiempo de extracción ms */
  extractionMs: number
}

export interface DocumentSource {
  /** URL del documento o ruta local */
  url?: string
  /** Buffer directo */
  buffer?: ArrayBuffer | Uint8Array | Buffer
  /** Hint del formato (si no, se autodetecta) */
  format?: DocumentFormat
  /** Hint del MIME type */
  mimeType?: string
}
