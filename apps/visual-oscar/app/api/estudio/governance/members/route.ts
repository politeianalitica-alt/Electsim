import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/estudio/governance/members`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockMembers())
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/api/estudio/governance/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const body = await req.json().catch(() => ({ email: '', role: 'viewer' }))
    return NextResponse.json({
      id:        `m-${Date.now().toString(36)}`,
      userId:    `u-${Date.now().toString(36)}`,
      email:     body.email ?? '',
      name:      (body.email ?? '').split('@')[0] || 'Nuevo miembro',
      role:      body.role ?? 'viewer',
      createdAt: new Date().toISOString(),
    }, { status: 201 })
  }
}

function getMockMembers() {
  const now = new Date().toISOString()
  return [
    { id: 'm1', userId: 'u1', email: 'carlos@politeia.es',     name: 'Carlos Martínez', role: 'owner',    lastActiveAt: now,                                createdAt: '2025-01-01T00:00:00Z' },
    { id: 'm2', userId: 'u2', email: 'ana@politeia.es',        name: 'Ana García',      role: 'admin',    lastActiveAt: '2026-05-14T08:30:00Z',             createdAt: '2025-03-01T00:00:00Z' },
    { id: 'm3', userId: 'u3', email: 'pablo@consultora.es',    name: 'Pablo Ruiz',      role: 'analyst',  lastActiveAt: '2026-05-13T17:45:00Z',             createdAt: '2025-06-15T00:00:00Z' },
    { id: 'm4', userId: 'u4', email: 'laura@ibex.es',          name: 'Laura Sánchez',   role: 'viewer',   lastActiveAt: '2026-05-10T11:00:00Z',             createdAt: '2026-01-20T00:00:00Z' },
    { id: 'm5', userId: 'u5', email: 'ci@pipeline.bot',        name: 'CI/CD Bot',       role: 'api_only', lastActiveAt: '2026-05-14T10:00:00Z',             createdAt: '2026-02-01T00:00:00Z' },
  ]
}
