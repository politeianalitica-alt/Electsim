import type { ContratosVigentesSnapshot } from '@/types/contratacion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/contratacion/contratos-vigentes`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 120 },
      })
      if (res.ok) return Response.json(await res.json())
    }
    return Response.json({ contratos: [] } satisfies ContratosVigentesSnapshot)
  } catch {
    return Response.json({ contratos: [] } satisfies ContratosVigentesSnapshot)
  }
}
