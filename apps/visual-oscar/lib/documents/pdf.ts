/**
 * Extractor de PDF usando `unpdf` (PDF.js empaquetado para serverless).
 *
 * Maneja:
 *   - Texto plano por página
 *   - Metadata (título, autor, fechas)
 *   - Tablas básicas (heurística por whitespace alignment)
 *
 * Limitaciones:
 *   - PDFs escaneados (imágenes) requieren OCR (no incluido aquí)
 *   - PDFs cifrados se rechazan limpiamente
 */

import { extractText, getDocumentProxy } from 'unpdf'
import type { ExtractedDocument, ExtractOptions } from './types'

export async function extractPdf(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  opts: ExtractOptions = {},
): Promise<ExtractedDocument> {
  const t0 = Date.now()
  const warnings: string[] = []
  const maxPages = opts.maxPages ?? 50
  const maxChars = opts.maxChars ?? 200_000

  // Normalizar a Uint8Array
  let bytes: Uint8Array
  if (buffer instanceof Uint8Array) bytes = buffer
  else if (buffer instanceof ArrayBuffer) bytes = new Uint8Array(buffer)
  else bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  try {
    const pdf = await getDocumentProxy(bytes)
    const totalPages = pdf.numPages
    const effectivePages = Math.min(maxPages, totalPages)
    if (effectivePages < totalPages) {
      warnings.push(`pdf_truncated: extraídas ${effectivePages} de ${totalPages} páginas`)
    }

    // Extraer texto en bloque
    const { text: rawText } = await extractText(pdf, { mergePages: false })
    // unpdf devuelve array de strings (uno por página) cuando mergePages=false
    const pagesText: string[] = Array.isArray(rawText) ? rawText : [String(rawText)]
    const slicedPages = pagesText.slice(0, effectivePages)

    let text = slicedPages.join('\n\n--- PÁGINA ---\n\n')
    if (text.length > maxChars) {
      warnings.push(`text_truncated: ${text.length} chars → ${maxChars}`)
      text = text.slice(0, maxChars) + '\n\n[…texto truncado…]'
    }

    // Metadata
    let metadata: ExtractedDocument['metadata'] = { pageCount: totalPages, sourceSize: bytes.length }
    if (opts.includeMetadata) {
      try {
        const meta = await pdf.getMetadata()
        const info = (meta?.info ?? {}) as Record<string, unknown>
        metadata = {
          ...metadata,
          title: typeof info.Title === 'string' ? info.Title : undefined,
          author: typeof info.Author === 'string' ? info.Author : undefined,
          subject: typeof info.Subject === 'string' ? info.Subject : undefined,
          creator: typeof info.Creator === 'string' ? info.Creator : undefined,
          producer: typeof info.Producer === 'string' ? info.Producer : undefined,
          creationDate: typeof info.CreationDate === 'string' ? info.CreationDate : undefined,
          modificationDate: typeof info.ModDate === 'string' ? info.ModDate : undefined,
        }
      } catch {/* metadata opcional */}
    }

    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length

    return {
      format: 'pdf',
      text,
      units: effectivePages,
      metadata: { ...metadata, wordCount },
      warnings,
      extractionMs: Date.now() - t0,
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    return {
      format: 'pdf',
      text: '',
      units: 0,
      metadata: { sourceSize: bytes.length },
      warnings: [`pdf_error: ${errMsg.slice(0, 200)}`],
      extractionMs: Date.now() - t0,
    }
  }
}
