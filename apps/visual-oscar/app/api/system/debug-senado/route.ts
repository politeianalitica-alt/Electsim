/**
 * /api/system/debug-senado — Diagnóstico público del fetcher del Senado.
 * Ruta /api/system/ está exenta del middleware de auth.
 */

import { NextResponse } from 'next/server'
import { fetchSenadoComisiones } from '@/lib/legislative/senado'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const t0 = Date.now()
  try {
    // Forzar fetch directo sin caché de Next
    const xmlRes = await fetch('https://www.senado.es/web/ficopendataservlet?tipoFich=7&legis=15', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0)' },
      cache: 'no-store',
    })
    const xmlText = await xmlRes.text()
    const comisionCount = (xmlText.match(/<comision[\s>]/g) || []).length
    const closeCount = (xmlText.match(/<\/comision>/g) || []).length

    // Probar el parser directamente
    const items = await fetchSenadoComisiones()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ms: Date.now() - t0,
      xml: {
        status: xmlRes.status,
        size: xmlText.length,
        comisionOpenCount: comisionCount,
        comisionCloseCount: closeCount,
        first200: xmlText.slice(0, 200),
      },
      parser: {
        totalItems: items.length,
        bySenado: items.filter(i => i.camara === 'senado').length,
        byMixta: items.filter(i => i.camara === 'mixta').length,
        first3: items.slice(0, 3),
        lastIfAny: items[items.length - 1] || null,
      },
    })
  } catch (e) {
    return NextResponse.json({
      error: String(e),
      stack: e instanceof Error ? e.stack?.split('\n').slice(0, 5).join('\n') : null,
      ms: Date.now() - t0,
    }, { status: 500 })
  }
}
