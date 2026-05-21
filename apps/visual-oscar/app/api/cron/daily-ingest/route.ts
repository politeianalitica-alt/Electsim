import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Each ingest can take 30-60s; cap to 5 minutes total (10 endpoints × ~30s).
export const maxDuration = 300

/**
 * Daily ETL ingest cron — runs at 04:00 UTC.
 *
 * Calls the POST /ingest endpoints of the risk-v2 and macro-finance modules.
 * Each connector inside the orchestrator already has individual try/except,
 * so a single source failing does NOT abort the others.
 *
 * After ingest, indices are recomputed and alerts are evaluated; the user has
 * a fresh /riesgo and /macro dashboard by 07:00 UTC (when the warm cron runs).
 *
 * Protected by `CRON_SECRET` Bearer token if set (Vercel cron injects it).
 */

async function callIngest(path: string, body?: object): Promise<{ path: string; ok: boolean; ms: number; summary?: unknown; error?: string }> {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const start = Date.now()
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(280_000),
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const ms = Date.now() - start
    if (!res.ok) {
      return { path, ok: false, ms, error: `HTTP ${res.status}` }
    }
    const j = await res.json()
    return {
      path, ok: true, ms,
      summary: {
        n_ok:        j.n_ok,
        n_stub:      j.n_stub,
        n_failed:    j.n_failed,
        total_rows:  j.total_rows ?? j.n_indices,
        total_pairs: j.total_pairs ?? undefined,
      },
    }
  } catch (e) {
    return { path, ok: false, ms: Date.now() - start, error: String(e) }
  }
}

const INGEST_ROUTES = [
 '/api/macro-finance/ingest',
 '/api/risk-v2/ingest?country=ES',
]

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = []
  for (const path of INGEST_ROUTES) {
    results.push(await callIngest(path))
  }

  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    ok:    results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  }
  return NextResponse.json(summary)
}
