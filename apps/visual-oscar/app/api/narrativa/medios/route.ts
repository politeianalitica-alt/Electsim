import type { MediosNarrativaSnapshot } from '@/types/narrativa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/narrativa/medios`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 300 },
      })
      if (res.ok) return Response.json(await res.json())
    }
    const empty: MediosNarrativaSnapshot = {
      generado_en: new Date().toISOString(),
      periodo: '',
      medios: [],
      frames: [],
      terminos_calientes: [],
    }
    return Response.json(empty)
  } catch {
    return Response.json({ generado_en: new Date().toISOString(), periodo: '', medios: [], frames: [], terminos_calientes: [] })
  }
}
