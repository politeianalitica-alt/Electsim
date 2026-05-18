/**
 * GET /api/media-intel/feed
 * Feed de noticias en vivo (50 medios RSS) · sustituye el MOCK_FEED hardcoded.
 *
 * Fallback en cascada:
 *   1. fromBackend (si el backend FastAPI está disponible)
 *   2. getAggregatedNews (50 RSS en vivo)
 *   3. Vacío (sin mock)
 */
import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const MEDIO_IDEOLOGIA: Record<string, string> = {
  'eldiario.es': 'izquierda', 'el diario': 'izquierda', 'público': 'izquierda',
  'infolibre': 'centroizquierda', 'el país': 'centroizquierda', 'cadena ser': 'centroizquierda', 'la sexta': 'centroizquierda',
  'rtve': 'centro',
  'el confidencial': 'centro', '20minutos': 'centro',
  'el mundo': 'centroderecha', 'abc': 'derecha', 'la razón': 'derecha', 'okdiario': 'derecha', 'libertad digital': 'derecha',
}

function detectarIdeologia(medio: string): string | null {
  const k = medio.toLowerCase()
  for (const [pattern, ideo] of Object.entries(MEDIO_IDEOLOGIA)) {
    if (k.includes(pattern)) return ideo
  }
  return null
}

function detectarCategoria(titulo: string, descripcion: string): string {
  const t = (titulo + ' ' + descripcion).toLowerCase()
  if (/econom[íi]a|empleo|paro|inflaci[óo]n|pib|bolsa|empresa/i.test(t)) return 'economia'
  if (/sanidad|hospital|m[ée]dic|enfermer/i.test(t)) return 'sanidad'
  if (/educaci[óo]n|escuela|universidad|alumno/i.test(t)) return 'educacion'
  if (/cultura|cine|teatro|m[úu]sica/i.test(t)) return 'cultura'
  if (/deporte|f[úu]tbol|liga|olimp/i.test(t)) return 'deportes'
  if (/internacional|guerra|ucrania|gaza|china/i.test(t)) return 'internacional'
  if (/sucesos|crimen|robo|asalto|polic[íi]a/i.test(t)) return 'sucesos'
  if (/medio ambiente|clima|sequ[íi]a|incendio/i.test(t)) return 'medio_ambiente'
  return 'politica'
}

function detectarPartidos(texto: string): string | null {
  const partidos: string[] = []
  if (/\bpsoe\b/i.test(texto)) partidos.push('PSOE')
  if (/partido popular|\bpp\b/i.test(texto)) partidos.push('PP')
  if (/\bvox\b/i.test(texto)) partidos.push('VOX')
  if (/\bsumar\b/i.test(texto)) partidos.push('Sumar')
  if (/\bjunts\b/i.test(texto)) partidos.push('Junts')
  if (/\berc\b/i.test(texto)) partidos.push('ERC')
  if (/\bpnv\b/i.test(texto)) partidos.push('PNV')
  if (/\beh bildu\b|bildu/i.test(texto)) partidos.push('EH Bildu')
  return partidos.length > 0 ? partidos.join(',') : null
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = Number(sp.get('page') || 1)
  const perPage = Math.min(50, Number(sp.get('per_page') || 20))

  // Intento 1: backend
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  const dataBackend = await fromBackend<{ items: unknown[]; total: number; page: number; per_page: number; pages: number }>(`/api/media-intel/feed${qs}`)
  if (dataBackend) return NextResponse.json(withMeta(dataBackend, 'backend'))

  // Intento 2: agregador RSS en vivo
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: 168 })
    if (articles && articles.length > 0) {
      const items = articles.slice((page - 1) * perPage, page * perPage).map((a, i) => {
        const texto = a.title + ' ' + (a.description || '')
        return {
          id: `live-${i}-${Buffer.from(a.link).toString('base64').slice(0, 8)}`,
          titular: a.title,
          fuente: a.medio.nombre,
          categoria: detectarCategoria(a.title, a.description || ''),
          sentimiento_score: a.sentiment_score,
          relevancia_score: 0.5 + Math.abs(a.sentiment_score) * 0.3,
          partidos_mencionados: detectarPartidos(texto),
          resumen: (a.description || '').slice(0, 180),
          fecha_publicacion: a.pub_date_iso || new Date().toISOString(),
          scope: 'es',
          ideologia: detectarIdeologia(a.medio.nombre),
          url: a.link,
        }
      })
      const out = {
        items, total: articles.length, page, per_page: perPage,
        pages: Math.ceil(articles.length / perPage),
      }
      return NextResponse.json(withMeta(out, 'rss_aggregator'))
    }
  } catch {}

  // Intento 3: vacío (no mock)
  return NextResponse.json(withMeta({ items: [], total: 0, page, per_page: perPage, pages: 0 }, 'empty'))
}
