import { MOCK_RISK } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET(req: Request) {
  const url = new URL(req.url)
  const wantHistory = url.searchParams.has('history')
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/risk/index${url.search}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  if (wantHistory) {
    const start = new Date('2026-04-27T00:00:00Z').getTime()
    const historia = MOCK_RISK.sparkline.map((v, i) => ({
      ts: new Date(start + i * 86400_000).toISOString(),
      valor: v,
    }))
    return Response.json({ historia })
  }
  return Response.json(MOCK_RISK)
}
