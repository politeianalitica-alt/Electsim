import { NextResponse } from 'next/server'
import { backendConfigured, fromBackend } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const configured = backendConfigured()
  let backendOk = false
  if (configured) {
    const res = await fromBackend<{ status: string }>('/api/system/health')
    backendOk = !!res
  }
  return NextResponse.json({
    frontend: 'ok',
    backend_configured: configured,
    backend_reachable: backendOk,
    mode: backendOk ? 'live' : (configured ? 'degraded' : 'demo'),
    ts: new Date().toISOString(),
  })
}
