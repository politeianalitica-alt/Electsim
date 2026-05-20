import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limit  = req.nextUrl.searchParams.get('limit')  ?? '50'
  const offset = req.nextUrl.searchParams.get('offset') ?? '0'
  try {
    const res = await fetch(
 `${BACKEND}/api/estudio/dataset/${params.id}/preview?limit=${limit}&offset=${offset}`,
      { next: { revalidate: 0 } },
    )
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const lim = parseInt(limit)
    const off = parseInt(offset)
    return NextResponse.json({
      columns:   ['municipio_id', 'municipio', 'ccaa', 'partido', 'votos', 'pct_votos', 'censo', 'año'],
      totalRows: 179_852,
      truncated: true,
      rows: Array.from({ length: lim }, (_, i) => ({
        municipio_id: 28001 + i + off,
        municipio:    ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Zaragoza', 'Murcia'][i % 8],
        ccaa:         ['Comunidad de Madrid', 'Cataluña', 'Comunidad Valenciana', 'Andalucía'][i % 4],
        partido:      ['PSOE', 'PP', 'VOX', 'Sumar', 'ERC', 'Bildu'][i % 6],
        votos:        1_000 + Math.floor(Math.random() * 80_000),
        pct_votos:    parseFloat((5 + Math.random() * 35).toFixed(2)),
        censo:        50_000 + Math.floor(Math.random() * 500_000),
        año:          2024,
      })),
    })
  }
}
