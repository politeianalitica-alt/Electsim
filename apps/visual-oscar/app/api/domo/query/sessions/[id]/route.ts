import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/query/sessions/${params.id}`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({
      id: params.id,
      title: 'Consulta',
      datasetIds: [],
      messages: [],
      createdBy: 'demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/query/sessions/${params.id}`, { method: 'DELETE' })
    return new NextResponse(null, { status: res.status })
  } catch {
    return new NextResponse(null, { status: 200 })
  }
}
