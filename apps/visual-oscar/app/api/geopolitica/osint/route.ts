import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, geoOsintFromArticles } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  // 1. Intentar backend real
  const real = await fromBackend<{ data?: unknown[] }>('/api/geopolitica/osint-feed?limite=20')
  if (real && Array.isArray(real.data) && real.data.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  // 2. Derivar de feed RSS agregado
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 48 })
    const items = geoOsintFromArticles(articles).slice(0, 30)
    if (items.length > 0) {
      return NextResponse.json(withMeta({
        data: items,
        total: items.length,
        derived_from_feeds: true,
      }, 'backend'))
    }
  } catch (e) {
    console.error('[osint] feed derivation failed:', e)
  }

  // 3. Fallback mock
  const mock = {
    data: [
      { id: '1', titulo: 'Reunión bilateral España-Marruecos sobre migración', fuente: 'El País', fecha: new Date().toISOString(), urgencia: 4, categoria: 'migracion', resumen: 'Los ministros de exteriores han acordado nuevas medidas.' },
      { id: '2', titulo: 'OTAN reafirma compromiso con España en Mediterráneo', fuente: 'ABC', fecha: new Date().toISOString(), urgencia: 3, categoria: 'militar', resumen: 'La alianza confirma presencia naval.' },
      { id: '3', titulo: 'Tensión energética: España reduce dependencia del gas argelino', fuente: 'El Mundo', fecha: new Date().toISOString(), urgencia: 2, categoria: 'energia', resumen: 'El Gobierno diversifica proveedores.' },
    ],
  }
  return NextResponse.json(withMeta(mock, 'mock'))
}
