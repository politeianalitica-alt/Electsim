import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK_FEED = {
  items: [
    {
      id: '1', titular: 'El Congreso aprueba los presupuestos generales del Estado',
      fuente: 'El País', categoria: 'politica', sentimiento_score: 0.15,
      relevancia_score: 0.82, partidos_mencionados: 'PSOE,PP', resumen: 'El Congreso da luz verde a los PGE tras meses de negociación.',
      fecha_publicacion: new Date(Date.now() - 3600_000).toISOString(), scope: 'es', ideologia: 'centroizquierda',
    },
    {
      id: '2', titular: 'La economía española crece un 2.8% en el segundo trimestre',
      fuente: 'El Mundo', categoria: 'economia', sentimiento_score: 0.42,
      relevancia_score: 0.76, partidos_mencionados: 'PSOE', resumen: 'El PIB español supera previsiones del Banco de España.',
      fecha_publicacion: new Date(Date.now() - 7200_000).toISOString(), scope: 'es', ideologia: 'centroderecha',
    },
    {
      id: '3', titular: 'Spain faces political uncertainty ahead of regional elections',
      fuente: 'Financial Times', categoria: 'politics', sentimiento_score: -0.1,
      relevancia_score: 0.71, partidos_mencionados: null, resumen: "International media coverage of Spain's political landscape.",
      fecha_publicacion: new Date(Date.now() - 10800_000).toISOString(), scope: 'intl', ideologia: null,
    },
  ],
  total: 3,
  page: 1,
  per_page: 20,
  pages: 1,
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  const data = await fromBackend<typeof MOCK_FEED>(`/api/media-intel/feed${qs}`)
  if (data) return NextResponse.json(withMeta(data, 'backend'))
  return NextResponse.json(withMeta(MOCK_FEED, 'mock'))
}
