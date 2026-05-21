import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/pipeline/${params.id}/run`, { method: 'POST' })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    await new Promise(r => setTimeout(r, 800))
    return NextResponse.json({
      id: `run-mock-${Date.now().toString(36)}`,
      pipelineId: params.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      recordsIn: 0,
      recordsOut: 0,
      recordsErrored: 0,
      nodeStats: {},
      logs: [],
    })
  }
}
