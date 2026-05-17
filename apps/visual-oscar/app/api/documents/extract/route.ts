/**
 * /api/documents/extract — Extracción universal de documentos.
 *
 * GET ?url=https://...               descarga + extrae (formatos auto-detectados)
 * POST con multipart/form-data       subida directa de archivo
 *
 * Query opcionales:
 *   ?format=pdf|docx|xlsx|csv|xml|json|html|md|txt
 *   ?maxPages=N        máximo páginas PDF (default 50)
 *   ?maxChars=N        máximo caracteres devueltos (default 200000)
 *   ?sheet=NAME        nombre de hoja XLSX
 *   ?metadata=true     incluir metadata (autor, fechas, etc.)
 *   ?summary=true      solo resumen (formato + tamaño + páginas), sin texto
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractDocument, summarizeDocument } from '@/lib/documents'
import type { DocumentFormat, ExtractOptions } from '@/lib/documents'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const url = params.get('url')
  if (!url) {
    return NextResponse.json(withMeta({ error: 'missing_url_param' }, 'error'), { status: 400 })
  }

  const opts: ExtractOptions = {
    maxPages: Number(params.get('maxPages') || 50),
    maxChars: Number(params.get('maxChars') || 200_000),
    sheet: params.get('sheet') || undefined,
    includeMetadata: params.get('metadata') === 'true',
  }
  const format = params.get('format') as DocumentFormat | null
  const summary = params.get('summary') === 'true'

  try {
    if (summary) {
      const s = await summarizeDocument({ url, format: format || undefined })
      return NextResponse.json(withMeta(s, 'live'))
    }
    const doc = await extractDocument({ url, format: format || undefined }, opts)
    return NextResponse.json(withMeta(doc, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}

/**
 * POST multipart/form-data:
 *   file = <archivo binario>
 *   format = (opcional)
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json(withMeta({ error: 'missing_file' }, 'error'), { status: 400 })
    }
    const format = (form.get('format') as DocumentFormat | null) || undefined
    const buffer = await file.arrayBuffer()
    const doc = await extractDocument({ buffer, format, mimeType: file.type }, {
      maxPages: 50,
      maxChars: 200_000,
      includeMetadata: true,
    })
    return NextResponse.json(withMeta({ ...doc, filename: file.name }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
