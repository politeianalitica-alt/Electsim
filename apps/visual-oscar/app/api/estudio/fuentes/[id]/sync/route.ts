import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/fuentes/${params.id}/sync`, { method: 'POST' })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({
      id: `run-mock-${Date.now().toString(36)}`,
      sourceId:     params.id,
      status: 'running',
      startedAt:    new Date().toISOString(),
      recordsRead:    0,
      recordsWritten: 0,
      recordsErrored: 0,
      logs: [],
    })
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // Alias para getRuns: el frontend llama /runs por separado, pero ofrecemos esto por robustez
  return NextResponse.json([], { status: 200 })
}
