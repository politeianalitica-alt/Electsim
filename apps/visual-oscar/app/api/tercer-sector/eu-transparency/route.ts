/**
 * /api/tercer-sector/eu-transparency · Registro de Transparencia de la UE (ONGs).
 * Sprint Tercer Sector v3 · TS2-orgs (route, opcional).
 *
 * El Registro de Transparencia UE publica un export masivo (XML/Excel), no una
 * API REST de consulta puntual ligera. Hasta cablear ese export, este endpoint
 * degrada honestamente: explica la fuente y enlaza al registro, sin inventar
 * datos. Cuando se conecte el export, este handler servirá las ONGs registradas
 * (categoría III: ONG, plataformas, redes) con su huella de lobby UE.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 15

export async function GET() {
  const fetched_at = new Date().toISOString()
  return NextResponse.json(
    {
      ok: false,
      data: null,
      degraded: true,
      degraded_reason: 'no_api_rest',
      source_url: 'https://ec.europa.eu/transparencyregister/public/homePage.do',
      fetched_at,
      _meta: {
        source: 'tercer-sector/eu-transparency',
        source_label: 'EU Transparency Register',
        note: 'El Registro de Transparencia de la UE expone un export masivo (XML/Excel), no una API REST puntual. Pendiente de cablear ese export. Las ONGs de categoría III (ONG/plataformas/redes) y su huella de lobby UE se servirán aquí cuando esté conectado.',
        download_url:
          'https://ec.europa.eu/transparencyregister/public/consultation/statistics.do',
      },
    },
    { status: 200, headers: { 'Cache-Control': 'public, s-maxage=86400' } },
  )
}
