import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import type { VotacionPlenaria } from '@/types/legislativo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function makeMockVotaciones(): VotacionPlenaria[] {
  return [
    {
      id: 'vot001',
      titulo: 'Proyecto de Ley de Presupuestos Generales del Estado 2025',
      fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      tipo: 'proyecto_de_ley',
      resultado: 'rechazada',
      votos_favor: 168,
      votos_contra: 177,
      votos_abstencion: 5,
      votos_ausente: 0,
      quorum: 176,
      desglose_grupos: [
        { grupo_id: 'gpsoe', grupo_nombre: 'GPS', voto: 'si', diputados_favor: 121, diputados_contra: 0, diputados_abstencion: 0, diputados_ausente: 0 },
        { grupo_id: 'gpp', grupo_nombre: 'GPP', voto: 'no', diputados_favor: 0, diputados_contra: 137, diputados_abstencion: 0, diputados_ausente: 0 },
        { grupo_id: 'gsumar', grupo_nombre: 'GPS2', voto: 'si', diputados_favor: 31, diputados_contra: 0, diputados_abstencion: 0, diputados_ausente: 0 },
        { grupo_id: 'gvox', grupo_nombre: 'GPVOX', voto: 'no', diputados_favor: 0, diputados_contra: 33, diputados_abstencion: 0, diputados_ausente: 0 },
      ],
      descripcion: 'Primera votación de totalidad sobre los PGE 2025. Rechazada por la oposición.',
    },
    {
      id: 'vot002',
      titulo: 'Reforma del Reglamento del Congreso — Procedimiento telemático',
      fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      tipo: 'proyecto_de_ley',
      resultado: 'aprobada',
      votos_favor: 198,
      votos_contra: 140,
      votos_abstencion: 12,
      votos_ausente: 0,
      quorum: 176,
      desglose_grupos: [
        { grupo_id: 'gpsoe', grupo_nombre: 'GPS', voto: 'si', diputados_favor: 121, diputados_contra: 0, diputados_abstencion: 0, diputados_ausente: 0 },
        { grupo_id: 'gpp', grupo_nombre: 'GPP', voto: 'no', diputados_favor: 0, diputados_contra: 137, diputados_abstencion: 0, diputados_ausente: 0 },
        { grupo_id: 'gsumar', grupo_nombre: 'GPS2', voto: 'si', diputados_favor: 31, diputados_contra: 0, diputados_abstencion: 0, diputados_ausente: 0 },
        { grupo_id: 'gvox', grupo_nombre: 'GPVOX', voto: 'no', diputados_favor: 0, diputados_contra: 0, diputados_abstencion: 12, diputados_ausente: 21 },
      ],
      descripcion: 'Aprobada reforma para permitir votaciones telemáticas en casos excepcionales.',
    },
  ]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ?? '20'
  const resultado = searchParams.get('resultado')

  const path = `/api/legislativo/votaciones?limit=${limit}${resultado ? `&resultado=${resultado}` : ''}`
  const real = await fromBackend<{ votaciones?: VotacionPlenaria[] } | VotacionPlenaria[]>(path)

  if (Array.isArray(real) && real.length > 0) {
    return NextResponse.json(withMeta({ data: real }, 'backend'))
  }
  if (real && !Array.isArray(real) && Array.isArray((real as { votaciones?: VotacionPlenaria[] }).votaciones)) {
    return NextResponse.json(withMeta({ data: (real as { votaciones: VotacionPlenaria[] }).votaciones }, 'backend'))
  }
  return NextResponse.json(withMeta({ data: makeMockVotaciones() }, 'mock'))
}
