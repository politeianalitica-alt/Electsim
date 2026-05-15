/**
 * GET /api/electoral/encuestas?ambito=general&limit=30
 *
 * Lista de encuestas electorales españolas combinando:
 *   1. Catálogo CURADO con cifras conocidas (12 sondeos recientes)
 *   2. METADATA en vivo de electocracia.com vía WP REST API
 *      (171 sondeos clasificados por casa encuestadora)
 *
 * El catálogo curado aporta las CIFRAS (% por partido) que no están
 * disponibles en JSON (en electocracia están como imágenes). Cada
 * encuesta lleva su PESO calculado:
 *   peso_final = peso_calidad_casa × decay_temporal × bonus_muestra
 *
 * Cuando esté disponible un OCR sobre las imágenes o un feed
 * estructurado, este endpoint mantendrá el mismo contrato pero las
 * cifras se cargarán dinámicamente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEncuestasElectocracia } from '@/lib/sources/electocracia'
import { getSondeosVivos, pesoEncuesta, type SondeoCifras } from '@/lib/sources/encuestas-pesos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 1800   // 30 min

interface EncuestaConPeso extends SondeoCifras {
  peso: number
  peso_breakdown: { calidad: number; recencia: number; muestra_factor: number }
  link?: string
  source: 'wikipedia' | 'curado' | 'electocracia'
}

export async function GET(req: NextRequest) {
  const ambito = (req.nextUrl.searchParams.get('ambito') || 'general') as 'general' | 'todos'
  const limit = Math.min(60, Math.max(5, Number(req.nextUrl.searchParams.get('limit') || 30)))
  const t0 = Date.now()

  // Sondeos en vivo (Wikipedia) o catálogo curado fallback
  const vivos = await getSondeosVivos(limit)
  const curados: EncuestaConPeso[] = vivos.map(s => {
    const wb = pesoEncuesta({ casa: s.casa, fecha: s.fecha, muestra: s.muestra })
    return {
      ...s,
      peso: Math.round(wb.peso * 1000) / 1000,
      peso_breakdown: {
        calidad: Math.round(wb.calidad * 100) / 100,
        recencia: Math.round(wb.recencia * 100) / 100,
        muestra_factor: Math.round(wb.muestra_factor * 100) / 100,
      },
      source: s.id.startsWith('wiki-') ? 'wikipedia' as const : 'curado' as const,
    }
  })

  // Metadata viva de electocracia (sin cifras propias, solo info)
  const elecMeta = await fetchEncuestasElectocracia({ perPage: 30, ambito })

  // Set de IDs ya cubiertos por el curado para no duplicar (por casa+fecha aprox)
  const yaCubierto = new Set(
    curados.map(c => `${c.casa.toLowerCase()}|${c.fecha}`),
  )

  // Posts de electocracia que NO están en el curado · marcados como referencia
  const sinCifras = elecMeta
    .filter(p => p.pollster && p.fecha_encuesta)
    .filter(p => !yaCubierto.has(`${p.pollster!.toLowerCase()}|${p.fecha_encuesta}`))
    .slice(0, limit - curados.length)

  return NextResponse.json({
    encuestas: curados.slice(0, limit),
    referencias_sin_cifras: sinCifras.map(p => ({
      id: `e-${p.id}`,
      casa: p.pollster,
      cliente: p.cliente,
      fecha: p.fecha_encuesta,
      fecha_publicacion: p.date.slice(0, 10),
      tipo: p.tipo,
      ambito: p.ambito,
      link: p.link,
      title: p.title,
    })),
    meta: {
      n_curadas: curados.length,
      n_referencias: sinCifras.length,
      ambito,
      fuente_principal: 'Electocracia.com (metadata) + catálogo curado (cifras)',
      ponderacion: 'peso_final = peso_calidad × exp(-días/30) × √(N/1000)',
    },
    fetch_ms: Date.now() - t0,
  }, { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } })
}
