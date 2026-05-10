import type { AdjudicacionesSnapshot } from '@/types/contratacion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/contratacion/adjudicaciones`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
      })
      if (res.ok) return Response.json(await res.json())
    }
    return Response.json({
      adjudicaciones: [],
      organismos: [],
      empresas: [],
      casos_mediaticos: [],
    } satisfies AdjudicacionesSnapshot)
  } catch {
    return Response.json({
      adjudicaciones: [],
      organismos: [],
      empresas: [],
      casos_mediaticos: [],
    } satisfies AdjudicacionesSnapshot)
  }
}
