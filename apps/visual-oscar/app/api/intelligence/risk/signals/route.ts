import type { SignalsSnapshot } from '@/types/intelligence'
import { MOCK_SIGNALS, nowIso } from '../../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/risk/signals`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}
  const snap: SignalsSnapshot = { items: MOCK_SIGNALS, total: MOCK_SIGNALS.length, generado_en: nowIso() }
  return Response.json(snap)
}
