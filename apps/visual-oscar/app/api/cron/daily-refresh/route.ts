import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Daily refresh cron — called by Vercel Cron at 07:00 UTC
// Warms up the key API routes so they have fresh data cached for morning users

async function warmRoute(path: string): Promise<{ path: string; ok: boolean; ms: number }> {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const start = Date.now()
  try {
    const res = await fetch(`${base}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(15_000) })
    return { path, ok: res.ok, ms: Date.now() - start }
  } catch {
    return { path, ok: false, ms: Date.now() - start }
  }
}

const ROUTES_TO_WARM = [
  // ELECTORAL · agregador Wikipedia + D'Hondt provincial
  // Estos endpoints recalculan estimación con sondeos publicados ayer.
  '/api/electoral/encuestas?ambito=general&limit=30',
  '/api/electoral/estimacion',
  '/api/electoral/provincial',
  '/api/analytics/nowcast',
  '/api/mapa/dataset',
  // RESTO
  '/api/trends',
  '/api/crisis/signals',
  '/api/crisis/clusters',
  '/api/crisis/attack-detection',
  '/api/dashboard/home',
  '/api/risk/composite',
  '/api/risk/timeseries',
  '/api/legislativo/feed',
  '/api/news/feed',
]

export async function GET(req: Request) {
  // Verify this is a Vercel cron or internal call
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await Promise.all(ROUTES_TO_WARM.map(warmRoute))

  const summary = {
    timestamp: new Date().toISOString(),
    total: results.length,
    ok: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  }

  console.log('[cron/daily-refresh]', JSON.stringify(summary))

  return NextResponse.json(summary)
}
