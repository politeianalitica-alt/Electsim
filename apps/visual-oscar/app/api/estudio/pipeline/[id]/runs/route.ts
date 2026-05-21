import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/pipeline/${params.id}/runs`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockRuns(params.id))
  }
}

function getMockRuns(pipelineId: string) {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `run-${pipelineId}-${i}`,
    pipelineId,
    status:       i === 0 ? 'success' : i === 2 ? 'error' : 'success',
    startedAt:    new Date(Date.now() - i * 3_600_000).toISOString(),
    finishedAt:   new Date(Date.now() - i * 3_600_000 + 14_200).toISOString(),
    durationMs:   12_000 + Math.floor(Math.random() * 5_000),
    recordsIn:    50_000 + Math.floor(Math.random() * 5_000),
    recordsOut:   48_000 + Math.floor(Math.random() * 5_000),
    recordsErrored: i === 2 ? 12 : 0,
    errorMessage:   i === 2 ? 'Timeout en nodo de destino después de 30s' : undefined,
    nodeStats: {
      n1: { recordsIn: 0,      recordsOut: 50_000, durationMs: 2_000, status: 'success' },
      n2: { recordsIn: 50_000, recordsOut: 48_320, durationMs: 4_000, status: 'success' },
      n3: { recordsIn: 48_320, recordsOut: 48_320, durationMs: 1_000, status: 'success' },
      n4: { recordsIn: 48_320, recordsOut: 48_320, durationMs: 7_200, status: i === 2 ? 'error' : 'success' },
    },
    logs: [],
  }))
}
