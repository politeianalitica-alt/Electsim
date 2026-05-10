import type { CommunicationIntelSnapshot } from '@/types/narrativa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/narrativa/comm-intel`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 120 },
      })
      if (res.ok) return Response.json(await res.json())
    }
    const empty: CommunicationIntelSnapshot = {
      generado_en: new Date().toISOString(),
      kpis: [],
      topicos: [],
      sentimiento_global: 'Neutro',
      alerta_narrativa: false,
      alertas: [],
    }
    return Response.json(empty)
  } catch {
    return Response.json({ generado_en: new Date().toISOString(), kpis: [], topicos: [], sentimiento_global: 'Neutro', alerta_narrativa: false, alertas: [] })
  }
}
