import type { TeamSnapshot } from '@/types/intelligence'
import { MOCK_TEAM, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/team`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const snap: TeamSnapshot = { items: MOCK_TEAM, total: MOCK_TEAM.length, generado_en: nowIso() }
  return Response.json(snap)
}
