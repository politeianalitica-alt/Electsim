/**
 * /api/legislativo/document-mine — Minería de documentos legislativos.
 *
 * GET con uno de:
 *   ?ds=<URL_pdf_diario_sesiones>     extrae comparecientes, acuerdos, resumen
 *   ?bocg=<URL_pdf_boletin>            extrae iniciativas, enmiendas
 *   ?ley=<URL_pdf_ley>                 extrae preámbulo, artículos, disposiciones
 *
 * Devuelve datos estructurados listos para mostrar.
 */

import { NextRequest, NextResponse } from 'next/server'
import { mineDiarioSesiones, mineBocg, mineLawPdf } from '@/lib/legislative/document-mining'
import { withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const ds = params.get('ds')
  const bocg = params.get('bocg')
  const ley = params.get('ley')

  try {
    if (ds) {
      const result = await mineDiarioSesiones(ds)
      if (!result) return NextResponse.json(withMeta({ error: 'extraction_failed' }, 'error'), { status: 422 })
      return NextResponse.json(withMeta({ type: 'diario_sesiones', ...result }, 'live'))
    }
    if (bocg) {
      const result = await mineBocg(bocg)
      if (!result) return NextResponse.json(withMeta({ error: 'extraction_failed' }, 'error'), { status: 422 })
      return NextResponse.json(withMeta({ type: 'bocg', ...result }, 'live'))
    }
    if (ley) {
      const result = await mineLawPdf(ley)
      if (!result) return NextResponse.json(withMeta({ error: 'extraction_failed' }, 'error'), { status: 422 })
      return NextResponse.json(withMeta({ type: 'ley', ...result }, 'live'))
    }
    return NextResponse.json(withMeta({ error: 'missing_url_param', usage: 'use ds= bocg= or ley=' }, 'error'), { status: 400 })
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}
