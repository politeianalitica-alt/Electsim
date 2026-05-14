import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/fuentes/${params.id}/runs`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(
      Array.from({ length: 8 }, (_, i) => ({
        id:           `run-${params.id}-${i}`,
        sourceId:     params.id,
        status:       i === 0 ? 'success' : i === 2 ? 'error' : 'success',
        startedAt:    new Date(Date.now() - i * 3_600_000).toISOString(),
        finishedAt:   new Date(Date.now() - i * 3_600_000 + 12_000).toISOString(),
        durationMs:   8_000 + Math.floor(Math.random() * 9_000),
        recordsRead:    50_000 + Math.floor(Math.random() * 5_000),
        recordsWritten: 48_000 + Math.floor(Math.random() * 5_000),
        recordsErrored: i === 2 ? 14 : 0,
        errorMessage:   i === 2 ? 'Timeout en lectura' : undefined,
        logs: [],
      })),
    )
  }
}
