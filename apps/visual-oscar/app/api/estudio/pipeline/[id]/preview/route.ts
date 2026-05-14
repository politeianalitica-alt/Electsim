import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const nodeId = req.nextUrl.searchParams.get('nodeId')
  try {
    const res = await fetch(
      `${BACKEND}/api/estudio/pipeline/${params.id}/preview${nodeId ? `?nodeId=${nodeId}` : ''}`,
      { next: { revalidate: 0 } },
    )
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({
      columns: ['municipio', 'partido', 'votos', 'año', 'pct'],
      rows: Array.from({ length: 5 }, (_, i) => ({
        municipio: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza'][i],
        partido:   ['PSOE', 'PP', 'VOX', 'Sumar', 'ERC'][i],
        votos:     10_000 + i * 3_200,
        año:       2024,
        pct:       (15 + i * 2.3).toFixed(2),
      })),
    })
  }
}
