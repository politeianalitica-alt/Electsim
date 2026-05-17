/**
 * Extractor de DOCX usando `mammoth`.
 *
 * Mammoth convierte DOCX a texto plano y HTML semántico.
 * Para .doc (formato binario antiguo) no hay soporte serverless limpio;
 * se devuelve aviso y se intenta como texto plano.
 */

import mammoth from 'mammoth'
import type { ExtractedDocument, ExtractOptions } from './types'

export async function extractDocx(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  opts: ExtractOptions = {},
): Promise<ExtractedDocument> {
  const t0 = Date.now()
  const warnings: string[] = []
  const maxChars = opts.maxChars ?? 200_000

  // Normalizar a Buffer (mammoth lo prefiere)
  let buf: Buffer
  if (Buffer.isBuffer(buffer)) buf = buffer
  else if (buffer instanceof ArrayBuffer) buf = Buffer.from(buffer)
  else buf = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  try {
    const result = await mammoth.extractRawText({ buffer: buf })
    let text = result.value || ''
    for (const m of result.messages) {
      if (m.type === 'warning' || m.type === 'error') {
        warnings.push(`docx_${m.type}: ${m.message.slice(0, 200)}`)
      }
    }
    if (text.length > maxChars) {
      warnings.push(`text_truncated: ${text.length} chars → ${maxChars}`)
      text = text.slice(0, maxChars) + '\n\n[…texto truncado…]'
    }
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length

    return {
      format: 'docx',
      text,
      units: text.split('\n\n').length,
      metadata: { wordCount, sourceSize: buf.length },
      warnings,
      extractionMs: Date.now() - t0,
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    return {
      format: 'docx',
      text: '',
      units: 0,
      metadata: { sourceSize: buf.length },
      warnings: [`docx_error: ${errMsg.slice(0, 200)}`],
      extractionMs: Date.now() - t0,
    }
  }
}
