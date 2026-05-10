import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import type { HuellaLegislativa } from '@/types/legislativo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK_HUELLA: HuellaLegislativa = {
  periodo: 'XV Legislatura (2023-2025)',
  total_iniciativas: 847,
  total_votaciones: 312,
  tasa_aprobacion_global: 38.5,
  contribuciones: [
    { grupo_id: 'gpsoe', grupo_nombre: 'GPS', partido: 'PSOE', color: '#e11931', iniciativas_presentadas: 289, iniciativas_aprobadas: 112, votos_favor: 8934, votos_contra: 2341, votos_abstencion: 567, tasa_exito: 38.8, temas_principales: ['economía', 'vivienda', 'justicia'] },
    { grupo_id: 'gpp', grupo_nombre: 'GPP', partido: 'PP', color: '#199fe6', iniciativas_presentadas: 312, iniciativas_aprobadas: 89, votos_favor: 5123, votos_contra: 9234, votos_abstencion: 234, tasa_exito: 28.5, temas_principales: ['seguridad', 'economía', 'educación'] },
    { grupo_id: 'gsumar', grupo_nombre: 'GPS2', partido: 'SUMAR', color: '#9b5fe0', iniciativas_presentadas: 134, iniciativas_aprobadas: 23, votos_favor: 3421, votos_contra: 1234, votos_abstencion: 456, tasa_exito: 17.2, temas_principales: ['trabajo', 'vivienda', 'igualdad'] },
    { grupo_id: 'gvox', grupo_nombre: 'GPVOX', partido: 'VOX', color: '#63be21', iniciativas_presentadas: 112, iniciativas_aprobadas: 2, votos_favor: 2341, votos_contra: 8123, votos_abstencion: 123, tasa_exito: 1.8, temas_principales: ['seguridad', 'inmigración', 'familia'] },
  ],
  temas_hot: [
    { tema: 'vivienda', count: 89, tendencia: 'sube' },
    { tema: 'inteligencia artificial', count: 45, tendencia: 'sube' },
    { tema: 'inmigración', count: 67, tendencia: 'sube' },
    { tema: 'pensiones', count: 56, tendencia: 'estable' },
    { tema: 'energía', count: 43, tendencia: 'baja' },
  ],
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo')

  const path = `/api/legislativo/huella${periodo ? `?periodo=${periodo}` : ''}`
  const real = await fromBackend<HuellaLegislativa>(path)

  if (real && typeof real === 'object' && 'contribuciones' in real) {
    return NextResponse.json(withMeta({ data: real }, 'backend'))
  }
  return NextResponse.json(withMeta({ data: MOCK_HUELLA }, 'mock'))
}
