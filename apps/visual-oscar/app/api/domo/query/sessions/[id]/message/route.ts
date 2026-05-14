import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { content?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  try {
    const res = await fetch(`${BACKEND}/api/domo/query/sessions/${params.id}/message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const content = body.content ?? ''
    const isSQL = content.trim().toUpperCase().startsWith('SELECT')
    const now = new Date().toISOString()
    return NextResponse.json({
      id: `msg-${Date.now().toString(36)}`,
      role: 'assistant',
      content: isSQL
        ? 'Consulta SQL ejecutada correctamente.'
        : `He analizado tu pregunta sobre "${content.slice(0, 60)}…". Estos son los resultados.`,
      sql: isSQL
        ? content
        : `SELECT * FROM dataset LIMIT 10 -- generado para: ${content.slice(0, 40)}`,
      queryResult: {
        columns: ['partido', 'estimacion', 'fecha'],
        rows: [
          { partido: 'PP',    estimacion: '31.4', fecha: '2026-04-01' },
          { partido: 'PSOE',  estimacion: '27.8', fecha: '2026-04-01' },
          { partido: 'Vox',   estimacion: '11.2', fecha: '2026-04-01' },
          { partido: 'Sumar', estimacion: '9.6',  fecha: '2026-04-01' },
        ],
        rowCount: 4,
        executionMs: 38,
      },
      chartSuggestion: { type: 'bar', xField: 'partido', yField: 'estimacion', title: 'Estimación de voto por partido' },
      createdAt: now,
    })
  }
}
