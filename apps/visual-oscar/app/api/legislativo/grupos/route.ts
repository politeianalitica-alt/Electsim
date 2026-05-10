import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import type { GrupoParlamentario } from '@/types/legislativo'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK_GRUPOS: GrupoParlamentario[] = [
  { id: 'gpsoe', nombre: 'Grupo Parlamentario Socialista', acronimo: 'GPS', partido_principal: 'PSOE', diputados: 121, color: '#e11931', portavoz: 'Patxi López', posicion_ideologica: 'centroizquierda' },
  { id: 'gpp', nombre: 'Grupo Parlamentario Popular', acronimo: 'GPP', partido_principal: 'PP', diputados: 137, color: '#199fe6', portavoz: 'Miguel Tellado', posicion_ideologica: 'centroderecha' },
  { id: 'gvox', nombre: 'Grupo Parlamentario VOX', acronimo: 'GPVOX', partido_principal: 'VOX', diputados: 33, color: '#63be21', portavoz: 'Pepa Millán', posicion_ideologica: 'derecha' },
  { id: 'gsumar', nombre: 'Grupo Parlamentario Sumar', acronimo: 'GPS2', partido_principal: 'SUMAR', diputados: 31, color: '#9b5fe0', portavoz: 'Marta Lois', posicion_ideologica: 'izquierda' },
  { id: 'gvoxplus', nombre: 'Grupo Parlamentario Republicano', acronimo: 'GPR', partido_principal: 'ERC', diputados: 7, color: '#f5a800', portavoz: 'Gabriel Rufián', posicion_ideologica: 'izquierda' },
  { id: 'gpjts', nombre: 'Grupo Parlamentario Junts', acronimo: 'GPJTS', partido_principal: 'JUNTS', diputados: 7, color: '#00a3e0', portavoz: 'Miriam Nogueras', posicion_ideologica: 'nacionalista' },
  { id: 'gpbildu', nombre: 'Grupo Parlamentario EH Bildu', acronimo: 'GPEHB', partido_principal: 'BILDU', diputados: 6, color: '#4ab42e', portavoz: 'Jon Iñarritu', posicion_ideologica: 'izquierda' },
  { id: 'gppnv', nombre: 'Grupo Parlamentario Vasco (EAJ-PNV)', acronimo: 'GPV', partido_principal: 'PNV', diputados: 5, color: '#007a4d', portavoz: 'Aitor Esteban', posicion_ideologica: 'regionalista' },
]

export async function GET() {
  const real = await fromBackend<{ grupos?: unknown[] }>('/api/legislativo/grupos')
  if (real && Array.isArray((real as { grupos?: unknown[] }).grupos) && (real as { grupos: unknown[] }).grupos.length > 0) {
    return NextResponse.json(withMeta({ data: (real as { grupos: unknown[] }).grupos }, 'backend'))
  }
  if (Array.isArray(real) && (real as unknown[]).length > 0) {
    return NextResponse.json(withMeta({ data: real }, 'backend'))
  }
  return NextResponse.json(withMeta({ data: MOCK_GRUPOS }, 'mock'))
}
