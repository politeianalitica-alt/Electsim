/**
 * GET /api/search/global?q=...
 *
 * Búsqueda unificada de municipios + políticos + páginas estáticas.
 * Combina:
 *   · Lista local de 8.132 municipios (cacheada del backend si está caliente)
 *   · Wikidata opensearch para políticos (autocomplete)
 *   · Rutas estáticas fijas (briefing, war-room, etc.)
 *
 * Devuelve top 12 resultados en <300ms cuando hay caché.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Resultado = {
  tipo: 'municipio' | 'politico' | 'ccaa' | 'pagina'
  titulo: string
  subtitulo?: string
  url: string
  rank: number
}

// Rutas estáticas siempre buscables
const PAGINAS_FIJAS: Array<{ titulo: string; url: string; aliases: string[] }> = [
  { titulo: 'Inicio', url: '/inicio', aliases: ['home', 'dashboard'] },
  { titulo: 'Briefing matinal', url: '/briefing', aliases: ['noticias', 'morning brief'] },
  { titulo: 'War Room', url: '/war-room', aliases: ['guerra', 'campaña'] },
  { titulo: 'Riesgo político', url: '/riesgo', aliases: ['termometro'] },
  { titulo: 'Mapa de actores', url: '/mapa-actores', aliases: ['actores', 'red'] },
  { titulo: 'Coaliciones', url: '/coaliciones', aliases: ['pactos', 'gobierno'] },
  { titulo: 'Adversarios', url: '/adversarios', aliases: ['rivales'] },
  { titulo: 'Geopolítica', url: '/geopolitica', aliases: ['internacional'] },
  { titulo: 'Nowcasting', url: '/nowcasting', aliases: ['elecciones', 'pronostico'] },
  { titulo: 'Workspace', url: '/workspaces/ws_espana_2026/overview',
    aliases: ['workspace', 'mesa de trabajo'] },
]

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }
  const qNorm = normalize(q)
  const resultados: Resultado[] = []

  // 1) Páginas fijas
  for (const p of PAGINAS_FIJAS) {
    const titNorm = normalize(p.titulo)
    const aliases = p.aliases.map(normalize)
    if (titNorm.includes(qNorm) || aliases.some((a) => a.includes(qNorm))) {
      resultados.push({
        tipo: 'pagina', titulo: p.titulo, url: p.url,
        rank: titNorm.startsWith(qNorm) ? 100 : 80,
      })
    }
  }

  // 2) Municipios y CCAA · llama al backend si BACKEND_URL configurado
  //    (esto consulta endpoint que lee del CSV inventario)
  try {
    const r = await fetch(
      `${process.env.BACKEND_URL || ''}/api/v2/ficha/territorios/buscar?q=${encodeURIComponent(q)}&limit=8`,
      { next: { revalidate: 3600 } } as RequestInit,
    )
    if (r.ok) {
      const j = await r.json()
      for (const m of (j?.resultados || [])) {
        resultados.push({
          tipo: m.tipo === 'ccaa' ? 'ccaa' : 'municipio',
          titulo: m.nombre,
          subtitulo: m.provincia || m.ccaa || '',
          url: m.tipo === 'ccaa'
            ? `/ficha/territorio/ccaa-${encodeURIComponent(m.nombre)}`
            : `/ficha/territorio/${m.codigo_ine}`,
          rank: 90,
        })
      }
    }
  } catch {
    /* sin backend: usamos solo páginas fijas */
  }

  // 3) Políticos · Wikidata opensearch (autocomplete en es.wikipedia.org)
  if (qNorm.length >= 3) {
    try {
      const r = await fetch(
        `https://es.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=5&namespace=0&format=json&profile=fuzzy`,
        { next: { revalidate: 3600 } } as RequestInit,
      )
      if (r.ok) {
        const j = await r.json()
        // opensearch devuelve [query, titles[], descriptions[], urls[]]
        const titles: string[] = j?.[1] || []
        const urls: string[] = j?.[3] || []
        for (let i = 0; i < Math.min(5, titles.length); i++) {
          const t = titles[i]
          // Heurística: solo nombres que parezcan personas (2-4 palabras capitalizadas)
          if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4}$/.test(t)) {
            const slug = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')
            resultados.push({
              tipo: 'politico',
              titulo: t,
              subtitulo: 'Wikipedia · pulsa para construir ficha',
              url: `/ficha/politico/${slug}?nombre=${encodeURIComponent(t)}`,
              rank: 60,
            })
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  resultados.sort((a, b) => b.rank - a.rank)
  return NextResponse.json({ resultados: resultados.slice(0, 12) })
}
