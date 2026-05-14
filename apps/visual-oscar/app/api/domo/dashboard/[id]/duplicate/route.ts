import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${BACKEND}/api/domo/dashboard/${params.id}/duplicate`, { method: 'POST' })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json({
      id:         `dash-${Date.now().toString(36)}`,
      name:       `Duplicado de ${params.id}`,
      visibility: 'private',
      widgets:    [],
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    })
  }
}
