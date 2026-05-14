import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/dataset/${params.id}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const t0 = Date.now()
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400))
    return NextResponse.json({
      columns:    ['partido', 'total_votos', 'municipios'],
      rowCount:   6,
      durationMs: Date.now() - t0,
      fromCache:  false,
      rows: [
        { partido: 'PP',    total_votos: 8_091_840, municipios: 4_210 },
        { partido: 'PSOE',  total_votos: 7_760_970, municipios: 3_980 },
        { partido: 'VOX',   total_votos: 3_033_744, municipios: 2_140 },
        { partido: 'Sumar', total_votos: 2_490_392, municipios: 1_890 },
        { partido: 'ERC',   total_votos:   462_883, municipios:   412 },
        { partido: 'Bildu', total_votos:   393_252, municipios:   230 },
      ],
    })
  }
}
