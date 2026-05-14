import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; widgetId: string } },
) {
  try {
    const res = await fetch(
      `${BACKEND}/api/estudio/dashboard/${params.id}/widget/${params.widgetId}/data`,
      { next: { revalidate: 0 } },
    )
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({
      columns: ['partido', 'votos'],
      rows: [
        { partido: 'PP',                  votos: 8_091_840 },
        { partido: 'PSOE',                votos: 7_760_970 },
        { partido: 'VOX',                 votos: 3_033_744 },
        { partido: 'Sumar',               votos: 2_490_392 },
        { partido: 'ERC',                 votos:   462_883 },
        { partido: 'Bildu',               votos:   393_252 },
        { partido: 'PNV',                 votos:   275_782 },
        { partido: 'Junts',               votos:   392_634 },
      ],
    })
  }
}
