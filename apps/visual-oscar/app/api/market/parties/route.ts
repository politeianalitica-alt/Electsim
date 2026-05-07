import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

// GET /api/market/parties
//   Devuelve los partidos verificados del backend ElectSim FastAPI · /market/parties
//   Cada uno con: slug, name, color_hex, ideology_axes { economic, social }
//   Se usa como "fuente de verdad" para el cuadrante 2D de /partidos.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface BackendParty {
  slug: string
  name: string
  color_hex: string
  ideology_axes: { economic: number; social: number }
}

const FALLBACK: BackendParty[] = [
  { slug: 'pp',      name: 'Partido Popular',                   color_hex: '#1D4F91', ideology_axes: { economic:  0.65, social:  0.55 } },
  { slug: 'psoe',    name: 'Partido Socialista Obrero Español', color_hex: '#E3001B', ideology_axes: { economic: -0.20, social: -0.45 } },
  { slug: 'vox',     name: 'Vox',                               color_hex: '#63BE21', ideology_axes: { economic:  0.50, social:  0.80 } },
  { slug: 'sumar',   name: 'Sumar',                             color_hex: '#E91E8C', ideology_axes: { economic: -0.70, social: -0.75 } },
  { slug: 'podemos', name: 'Podemos',                           color_hex: '#6A1F6F', ideology_axes: { economic: -0.80, social: -0.80 } },
  { slug: 'junts',   name: 'Junts per Catalunya',               color_hex: '#00C3B2', ideology_axes: { economic:  0.30, social:  0.00 } },
  { slug: 'erc',     name: 'Esquerra Republicana de Catalunya', color_hex: '#F9B215', ideology_axes: { economic: -0.40, social: -0.60 } },
  { slug: 'pnv',     name: 'Partido Nacionalista Vasco',        color_hex: '#007038', ideology_axes: { economic:  0.20, social: -0.10 } },
]

export async function GET() {
  const real = await fromBackend<BackendParty[]>('/market/parties')
  if (real && Array.isArray(real) && real.length > 0) {
    return NextResponse.json(withMeta({ parties: real, count: real.length }, 'backend'))
  }
  return NextResponse.json(withMeta({ parties: FALLBACK, count: FALLBACK.length }, 'mock'))
}
