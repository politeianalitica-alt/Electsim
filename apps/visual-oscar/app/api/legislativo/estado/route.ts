import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import type { EstadoLegislativo } from '@/types/legislativo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK_ESTADO: EstadoLegislativo = {
  legislatura: 'XV Legislatura',
  camara: 'congreso',
  grupos_parlamentarios: [],
  distribucion_escanos: {
    PP: 137, PSOE: 121, VOX: 33, SUMAR: 31, ERC: 7, JUNTS: 7, BILDU: 6, PNV: 5, OTROS: 3,
  },
  sesiones_celebradas: 47,
  leyes_aprobadas: 18,
  leyes_en_tramite: 34,
  proxima_sesion_plenaria: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  alertas_legislativas: ['Presupuestos Generales en negociación', 'Reforma laboral segunda fase pendiente'],
}

export async function GET() {
  const real = await fromBackend<EstadoLegislativo>('/api/legislativo/estado')
  if (real && typeof real === 'object' && 'legislatura' in real) {
    return NextResponse.json(withMeta({ data: real }, 'backend'))
  }
  return NextResponse.json(withMeta({ data: MOCK_ESTADO }, 'mock'))
}
