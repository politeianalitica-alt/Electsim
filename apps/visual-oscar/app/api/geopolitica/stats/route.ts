import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  // Try the real KPI endpoint first (returns real DB aggregates)
  const kpis = await fromBackend<Record<string, unknown>>('/geopolitica/kpis')
  if (kpis && typeof kpis === 'object' && 'eventos_criticos_24h' in kpis) {
    const flat = {
      osint_24h: Number((kpis as any).eventos_criticos_24h ?? 0) + Number((kpis as any).impacto_espana_alto_7d ?? 0),
      alertas_activas: Number((kpis as any).paises_escalada_7d ?? 0),
      paises_monitorizados: Number((kpis as any).fuentes_internacionales ?? 0),
      presencia_activa: Number((kpis as any).conflictos_activos ?? 0),
      alertas_count: { CRITICO: 0, ALTO: 0, MEDIO: 0 },
    }
    return NextResponse.json(withMeta(flat, 'backend'))
  }
  const mock = {
    osint_24h: 47,
    alertas_activas: 8,
    paises_monitorizados: 23,
    presencia_activa: 12,
    alertas_count: { CRITICO: 2, ALTO: 3, MEDIO: 3 },
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
