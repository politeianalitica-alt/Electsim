import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/domo/query/sessions`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockSessions())
  }
}

export async function POST(req: NextRequest) {
  let body: { datasetIds?: string[] } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  try {
    const res = await fetch(`${BACKEND}/api/domo/query/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const id = `session-${Date.now().toString(36)}`
    return NextResponse.json({
      id,
      title:      `Consulta ${new Date().toLocaleDateString('es')}`,
      datasetIds: body.datasetIds ?? [],
      messages:   [],
      createdBy:  'demo',
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    })
  }
}

function getMockSessions() {
  return [
    {
      id: 'session-demo-1',
      title: 'Análisis intención de voto CIS',
      datasetIds: ['ds-2'],
      messages: [
        {
          id: 'msg-1', role: 'user',
          content: '¿Cuál es la media de estimación de voto del PP?',
          createdAt: '2026-05-13T10:00:00Z',
        },
        {
          id: 'msg-2', role: 'assistant',
          content: 'Según los datos del CIS, la media de estimación de voto del PP en el período analizado es de 31.4%.',
          sql: "SELECT AVG(media_estimacion) AS media FROM cis_barometros WHERE partido = 'PP' AND fecha >= '2025-01-01'",
          queryResult: {
            columns: ['media'], rows: [{ media: '31.4' }], rowCount: 1, executionMs: 42,
          },
          chartSuggestion: { type: 'line', xField: 'fecha', yField: 'media_estimacion', title: 'Evolución estimación PP' },
          createdAt: '2026-05-13T10:00:05Z',
        },
      ],
      createdBy: 'demo',
      createdAt: '2026-05-13T10:00:00Z',
      updatedAt: '2026-05-13T10:00:05Z',
    },
  ]
}
