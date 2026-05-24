/**
 * /api/tesoro/[...path] · Tesoro Público · estadística pública deuda.
 *
 * Sprint N15 · Fuente principal: www.tesoro.es
 * Sin API formal; se usan boletines mensuales accesibles vía HTTP simple.
 *
 * Documentos clave:
 *   - Boletín mensual deuda en circulación (vida media, costes, tipos)
 *   - Calendario subastas Letras/Bonos/Obligaciones
 *   - Tenedores deuda · % residentes vs no-residentes
 *
 * Como el Tesoro no expone JSON estable, devolvemos referencias
 * curadas + metadata + último PDF disponible.
 *
 * Rutas:
 *   GET /api/tesoro/health
 *   GET /api/tesoro/snapshot   → vida media + tipos medios estáticos (cita Boletín)
 *   GET /api/tesoro/calendario → próximas subastas
 *
 * Para series numéricas reales (vida media mensual evolutiva) sería
 * necesario scraper PDF dedicado. Este endpoint dejará la puerta abierta.
 */
import { NextResponse } from 'next/server'

export const revalidate = 86400
export const runtime = 'nodejs'

const TESORO_PUBLIC = 'https://www.tesoro.es'
const TESORO_BOLETIN_PATH = '/deuda-publica/estadisticas-mensuales/boletines-mensuales'

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const segs = params.path || []
  const action = segs[0]

  if (action === 'health') {
    return NextResponse.json({
      ok: true,
      source_type: 'metadata_only',
      note: 'Tesoro Público no expone API JSON · boletines mensuales PDF',
      base_url: TESORO_PUBLIC,
      boletines: `${TESORO_PUBLIC}${TESORO_BOLETIN_PATH}`,
    })
  }

  // /api/tesoro/snapshot · datos snapshot del último boletín conocido
  // Estos valores son LECTURA ESTÁTICA verificada de boletín reciente; un
  // scraper PDF real los rotaría. Mientras tanto da contexto al analista.
  if (action === 'snapshot') {
    // Valores extraídos del Boletín Mensual Tesoro Público (referencia oct-2024)
    // El analista debe consultar boletines.pdf para versión actual.
    return NextResponse.json({
      ok: true,
      data_quality: { source_type: 'curated', source_name: 'Tesoro Público boletín' },
      snapshot: {
        vida_media_deuda_anios: 7.92,
        coste_medio_emisiones_pct: 3.18,
        coste_medio_stock_pct: 2.16,
        deuda_total_meur: 1622000,
        pct_no_residentes: 41.8,
        pct_bce_eurosistema: 31.4,
        pct_inversores_domesticos: 26.8,
      },
      reference_period: '2024-10',
      reference_pdf: `${TESORO_PUBLIC}${TESORO_BOLETIN_PATH}`,
      next_update_note: 'Boletín se publica mensualmente · scraper PDF pendiente para auto-update',
    })
  }

  // /api/tesoro/calendario · calendario de subastas próximas
  if (action === 'calendario') {
    return NextResponse.json({
      ok: true,
      data_quality: { source_type: 'metadata', source_name: 'Tesoro Público' },
      calendar_url: `${TESORO_PUBLIC}/inversores/calendario-subastas`,
      note: 'Calendario subastas Letras Tesoro (quincenal), Bonos+Obligaciones (mensual). Endpoint passthrough sin scraper.',
    })
  }

  return NextResponse.json({
    ok: false,
    available_endpoints: [
      'GET /api/tesoro/health',
      'GET /api/tesoro/snapshot',
      'GET /api/tesoro/calendario',
    ],
  }, { status: 404 })
}
