import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import type { Comision } from '@/types/legislativo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK_COMISIONES: Comision[] = [
  {
    id: 'com001',
    nombre: 'Comisión de Presupuestos',
    tipo: 'permanente',
    camara: 'congreso',
    miembros: [
      { nombre: 'Rosa María Romero', grupo: 'PP', cargo: 'presidente' },
      { nombre: 'Alejandro Soler', grupo: 'PSOE', cargo: 'vicepresidente' },
    ],
    temas_principales: ['Presupuestos 2025', 'Control del gasto', 'Deuda pública'],
    reuniones_este_mes: 4,
    proxima_reunion: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    iniciativas_activas: 8,
  },
  {
    id: 'com002',
    nombre: 'Comisión de Asuntos Exteriores',
    tipo: 'permanente',
    camara: 'congreso',
    miembros: [
      { nombre: 'Pau Marí-Klose', grupo: 'PSOE', cargo: 'presidente' },
      { nombre: 'Valentina Martínez Ferro', grupo: 'PP', cargo: 'vicepresidente' },
    ],
    temas_principales: ['Política exterior UE', 'Sáhara Occidental', 'Relaciones con Marruecos'],
    reuniones_este_mes: 3,
    proxima_reunion: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    iniciativas_activas: 5,
  },
  {
    id: 'com003',
    nombre: 'Comisión de Economía, Comercio y Transformación Digital',
    tipo: 'permanente',
    camara: 'congreso',
    miembros: [
      { nombre: 'Rodrigo Gómez García', grupo: 'PP', cargo: 'presidente' },
      { nombre: 'Gerardo Pisarello', grupo: 'SUMAR', cargo: 'vicepresidente' },
    ],
    temas_principales: ['IA y regulación digital', 'Comercio exterior', 'Transformación energética'],
    reuniones_este_mes: 5,
    proxima_reunion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    iniciativas_activas: 12,
  },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const camara = searchParams.get('camara')

  const path = `/api/legislativo/comisiones${camara ? `?camara=${camara}` : ''}`
  const real = await fromBackend<Comision[] | { comisiones?: Comision[] }>(path)

  if (Array.isArray(real) && real.length > 0) {
    return NextResponse.json(withMeta({ data: real }, 'backend'))
  }
  if (real && !Array.isArray(real) && Array.isArray((real as { comisiones?: Comision[] }).comisiones)) {
    return NextResponse.json(withMeta({ data: (real as { comisiones: Comision[] }).comisiones }, 'backend'))
  }
  return NextResponse.json(withMeta({ data: MOCK_COMISIONES }, 'mock'))
}
