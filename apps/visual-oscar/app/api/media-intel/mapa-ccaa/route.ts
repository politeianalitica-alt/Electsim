import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOCK = {
  ccaas: [
    { ccaa_id: 1, nombre_ccaa: 'Andalucía', narrativa_dominante: 'economia', n_articulos: 87, ideologia_media: 0.8 },
    { ccaa_id: 2, nombre_ccaa: 'Aragón', narrativa_dominante: 'politica', n_articulos: 23, ideologia_media: 0.5 },
    { ccaa_id: 3, nombre_ccaa: 'Asturias', narrativa_dominante: 'sanidad', n_articulos: 19, ideologia_media: -0.4 },
    { ccaa_id: 4, nombre_ccaa: 'Baleares', narrativa_dominante: 'vivienda', n_articulos: 31, ideologia_media: -0.2 },
    { ccaa_id: 5, nombre_ccaa: 'Canarias', narrativa_dominante: 'inmigracion', n_articulos: 44, ideologia_media: -0.1 },
    { ccaa_id: 6, nombre_ccaa: 'Cantabria', narrativa_dominante: 'politica', n_articulos: 11, ideologia_media: 0.3 },
    { ccaa_id: 7, nombre_ccaa: 'Castilla-La Mancha', narrativa_dominante: 'economia', n_articulos: 18, ideologia_media: 0.2 },
    { ccaa_id: 8, nombre_ccaa: 'Castilla y León', narrativa_dominante: 'politica', n_articulos: 27, ideologia_media: 1.1 },
    { ccaa_id: 9, nombre_ccaa: 'Cataluña', narrativa_dominante: 'politica', n_articulos: 124, ideologia_media: -0.9 },
    { ccaa_id: 10, nombre_ccaa: 'Extremadura', narrativa_dominante: 'economia', n_articulos: 14, ideologia_media: -0.3 },
    { ccaa_id: 11, nombre_ccaa: 'Galicia', narrativa_dominante: 'politica', n_articulos: 38, ideologia_media: 0.4 },
    { ccaa_id: 12, nombre_ccaa: 'La Rioja', narrativa_dominante: 'economia', n_articulos: 8, ideologia_media: 0.6 },
    { ccaa_id: 13, nombre_ccaa: 'Madrid', narrativa_dominante: 'economia', n_articulos: 198, ideologia_media: 0.9 },
    { ccaa_id: 14, nombre_ccaa: 'Murcia', narrativa_dominante: 'economia', n_articulos: 22, ideologia_media: 1.0 },
    { ccaa_id: 15, nombre_ccaa: 'Navarra', narrativa_dominante: 'politica', n_articulos: 21, ideologia_media: -0.5 },
    { ccaa_id: 16, nombre_ccaa: 'País Vasco', narrativa_dominante: 'politica', n_articulos: 67, ideologia_media: -0.8 },
    { ccaa_id: 17, nombre_ccaa: 'Comunitat Valenciana', narrativa_dominante: 'vivienda', n_articulos: 52, ideologia_media: -0.1 },
  ],
}

export async function GET() {
  const data = await fromBackend<typeof MOCK>('/api/media-intel/mapa-ccaa')
  if (data) return NextResponse.json(withMeta(data, 'backend'))
  return NextResponse.json(withMeta(MOCK, 'mock'))
}
