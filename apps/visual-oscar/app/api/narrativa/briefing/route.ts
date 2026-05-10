import type { BriefingDiario } from '@/types/narrativa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/narrativa/briefing`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 1800 },
      })
      if (res.ok) return Response.json(await res.json())
    }
    const empty: BriefingDiario = {
      id: '', fecha: '', periodo: '', items: [],
      alertas_criticas: 0, total_items: 0,
      generado_por: 'Sistema IA · Politeia Analítica',
    }
    return Response.json(empty)
  } catch {
    return Response.json({ id: '', fecha: '', periodo: '', items: [], alertas_criticas: 0, total_items: 0, generado_por: 'Sistema IA · Politeia Analítica' })
  }
}
