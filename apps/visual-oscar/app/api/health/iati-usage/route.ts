/**
 * /api/health/iati-usage · Snapshot interno del uso de la IATI_API_KEY.
 * Sprint IATI-MAX.
 *
 * Devuelve: configuración rate-limit, counters acumulados (requests, cache
 * hits, dedupe hits, throttle waits, 429s, errores) y ventana actual 1s/60s.
 *
 * Útil para:
 *   - Vigilar que NO estamos pegando a la API más rápido de lo permitido
 *     (Terms of Use IATI: "abuse or excessively frequent requests will result
 *     in suspension").
 *   - Confirmar que la caché y el dedupe in-flight están salvando llamadas.
 *
 * Seguridad: NUNCA expone la key (ni siquiera su existencia binaria). Solo
 * counters. Si el deploy lo desea, se puede proteger con un header admin (no
 * implementado aquí porque el dato es 100% counters, sin secretos).
 *
 * Cache: no-cache (queremos snapshot real-time).
 */
import { NextResponse } from 'next/server'
import { getIatiUsageStats } from '@/lib/tercer-sector/iati-rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const stats = getIatiUsageStats()
  return NextResponse.json(
    {
      ok: true,
      stats,
      note:
        'Counters proceso-locales. Resets al reiniciar el container. Server-side only · no contiene la API key.',
      fetched_at: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
