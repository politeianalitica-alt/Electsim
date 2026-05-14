import { NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_DOMO_API_URL ?? 'http://localhost:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/domo/governance/audit`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`backend ${res.status}`)
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    return NextResponse.json(getMockAudit())
  }
}

function getMockAudit() {
  const mins = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
  return [
    { id: 'a1', action: 'query.run',         actorId: 'u1', actorEmail: 'carlos@politeia.es', actorName: 'Carlos Martínez', resourceType: 'query',     resourceName: 'Sesión CIS análisis',           ipAddress: '83.45.120.11',  createdAt: mins(5)    },
    { id: 'a2', action: 'dashboard.share',   actorId: 'u2', actorEmail: 'ana@politeia.es',     actorName: 'Ana García',      resourceType: 'dashboard', resourceId:   'dash-1',           resourceName: 'Monitor Electoral 2024', ipAddress: '78.34.99.201', createdAt: mins(32)   },
    { id: 'a3', action: 'alert.trigger',     actorId: 'u1', actorEmail: 'carlos@politeia.es', actorName: 'Carlos Martínez', resourceType: 'alert',     resourceId:   'alert-2',          resourceName: 'Nuevo contrato IBEX > 10M€', ipAddress: 'system',     createdAt: mins(47)   },
    { id: 'a4', action: 'pipeline.run',      actorId: 'u3', actorEmail: 'pablo@consultora.es', actorName: 'Pablo Ruiz',      resourceType: 'pipeline',  resourceId:   'pipe-1',           resourceName: 'CIS Barómetro Mayo 2026',  ipAddress: '91.126.77.4', createdAt: mins(90)   },
    { id: 'a5', action: 'dataset.export',    actorId: 'u2', actorEmail: 'ana@politeia.es',     actorName: 'Ana García',      resourceType: 'dataset',   resourceId:   'ds-3',             resourceName: 'Contratos AAPP 2020-2025', ipAddress: '78.34.99.201', createdAt: mins(180)  },
    { id: 'a6', action: 'member.invite',     actorId: 'u1', actorEmail: 'carlos@politeia.es', actorName: 'Carlos Martínez', resourceType: 'member',                                      resourceName: 'laura@ibex.es',            ipAddress: '83.45.120.11', createdAt: mins(600)  },
    { id: 'a7', action: 'api_key.create',    actorId: 'u1', actorEmail: 'carlos@politeia.es', actorName: 'Carlos Martínez', resourceType: 'api_key',                                     resourceName: 'CI/CD pipeline key',       ipAddress: '83.45.120.11', createdAt: mins(1440) },
  ]
}
