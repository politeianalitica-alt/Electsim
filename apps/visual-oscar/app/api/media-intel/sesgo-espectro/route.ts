import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK = {
  medios: [
    { nombre: 'El País', ideologia_percibida: 'centroizquierda', audiencia_mensual_M: 16.2, grupo_mediatico: 'PRISA', tipo: 'Digital', n_articulos_recientes: 42 },
    { nombre: 'El Mundo', ideologia_percibida: 'centroderecha', audiencia_mensual_M: 11.8, grupo_mediatico: 'Unidad Editorial', tipo: 'Prensa', n_articulos_recientes: 35 },
    { nombre: 'ABC', ideologia_percibida: 'derecha', audiencia_mensual_M: 7.4, grupo_mediatico: 'Vocento', tipo: 'Prensa', n_articulos_recientes: 28 },
    { nombre: 'elDiario.es', ideologia_percibida: 'izquierda', audiencia_mensual_M: 9.1, grupo_mediatico: 'Público', tipo: 'Digital', n_articulos_recientes: 31 },
    { nombre: 'La Vanguardia', ideologia_percibida: 'centro', audiencia_mensual_M: 8.3, grupo_mediatico: 'Godó', tipo: 'Prensa', n_articulos_recientes: 22 },
  ],
}

export async function GET() {
  const data = await fromBackend<typeof MOCK>('/api/media-intel/sesgo-espectro')
  if (data) return NextResponse.json(withMeta(data, 'backend'))
  return NextResponse.json(withMeta(MOCK, 'mock'))
}
