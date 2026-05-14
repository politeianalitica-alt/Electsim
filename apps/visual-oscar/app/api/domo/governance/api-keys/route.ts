import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/domo/governance/api-keys`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json([
      { id: 'k1', name: 'CI/CD pipeline',     prefix: 'pk_live_',  scopes: ['read:datasets', 'run:pipelines'], createdBy: 'carlos@politeia.es', lastUsedAt: new Date().toISOString(), isActive: true, createdAt: '2026-02-01T00:00:00Z' },
      { id: 'k2', name: 'Dashboard embed',    prefix: 'pk_embed_', scopes: ['read:dashboards'],                 createdBy: 'ana@politeia.es',    isActive: true, createdAt: '2026-03-15T00:00:00Z' },
    ])
  }
}

export async function POST(req: NextRequest) {
  let body: { name?: string; scopes?: string[]; expiresInDays?: number } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  try {
    const res = await fetch(`${BACKEND}/api/domo/governance/api-keys`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const secret = `pk_live_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
    return NextResponse.json({
      id:        `k-${Date.now().toString(36)}`,
      name:      body.name ?? 'Nueva Key',
      prefix:    secret.slice(0, 12),
      secret,
      scopes:    body.scopes ?? [],
      createdBy: 'demo',
      isActive:  true,
      createdAt: new Date().toISOString(),
    })
  }
}
