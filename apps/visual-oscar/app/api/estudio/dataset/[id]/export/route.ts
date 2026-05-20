import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const format = req.nextUrl.searchParams.get('format') ?? 'csv'
  try {
    const res  = await fetch(`${BACKEND}/api/estudio/dataset/${params.id}/export?format=${format}`)
    if (!res.ok) throw new Error(`backend ${res.status}`)
    const blob = await res.blob()
    return new NextResponse(blob, {
      status: 200,
      headers: {
 'Content-Type':        format === 'csv' ? 'text/csv' : 'application/json',
 'Content-Disposition': `attachment; filename="dataset-${params.id}.${format}"`,
      },
    })
  } catch {
    const csv = 'municipio_id,municipio,partido,votos\n28001,Madrid,PP,892340\n08001,Barcelona,PSC,680120\n'
    return new NextResponse(csv, {
      headers: {
 'Content-Type': 'text/csv',
 'Content-Disposition': `attachment; filename="dataset-${params.id}.csv"`,
      },
    })
  }
}
