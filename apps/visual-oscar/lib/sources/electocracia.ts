/**
 * Cliente para electocracia.com · agregador de sondeos electorales
 * españoles. WordPress REST API expuesta con categorías por casa.
 *
 * Endpoints públicos:
 *   - GET /wp-json/wp/v2/posts?categories=5  → 171 sondeos agregados
 *   - GET /wp-json/wp/v2/categories         → casas encuestadoras
 *
 * Las cifras numéricas no están en JSON (están en imágenes embebidas
 * en cada post), así que este cliente devuelve la METADATA estructurada
 * (pollster, fecha, link) y delega las cifras al catálogo curado de
 * `encuestas-cifras.ts` calibrado con datos públicos.
 */

const BASE = 'https://electocracia.com/wp-json/wp/v2'
const CACHE_REVALIDATE_S = 3600  // 1h

// ID de categoría "Sondeos" (agregado de todas las encuestas)
const CAT_SONDEOS = 5

// Mapping ID categoría WP → nombre de casa encuestadora
export const CASAS_ENCUESTADORAS: Record<number, string> = {
   8: 'Celeste-Tel',
  10: 'DYM',
  12: 'GAD3',
  13: 'Gesop',
  16: 'Invymark',
  18: 'Metroscopia',
  27: 'TNS Demoscopia',
  28: 'NC Report',
  29: 'MyWord',
  37: 'Sigma Dos',
  38: 'Sondaxe',
  39: 'Simple Lógica',
  40: 'Redondo & Asociados',
  41: 'Netquest',
  44: 'Sociométrica',
   7: 'CIS',
   9: 'Demoscopia y Servicios',
  11: 'Estudio de Sociología',
  14: 'Hamalgama Métrica',
  15: 'IBES',
  20: 'GIPEyOP UV',
  43: 'SyM Consulting',
}

export interface PostElectocracia {
  id: number
  date: string                    // ISO
  link: string
  title: string
  pollster?: string               // casa detectada
  cliente?: string                // medio que encarga (ej. "El Mundo")
  fecha_encuesta?: string         // ISO date · puede diferir de la publicación
  tipo: 'general' | 'autonomica' | 'municipal' | 'europea' | 'otra'
  ambito?: string                 // ej. "Andalucía", "Madrid", "España"
  categorias: number[]
}

interface RawPost {
  id: number
  date: string
  link: string
  title: { rendered: string }
  categories: number[]
}

// ─── Helpers de parseo ──────────────────────────────────────────────────

/**
 * Extrae casa, cliente y fecha de un título estilo:
 * "Elecciones Generales (Sigma Dos para El Mundo, 14/04/2026)"
 * "Andalucía (NC Report para La Razón, 12/03/2026)"
 * "Cataluña - Encuesta GAD3 ABC 12 mar 2026"
 */
function parsePostTitle(rawTitle: string): {
  pollster?: string
  cliente?: string
  fecha_encuesta?: string
  tipo: PostElectocracia['tipo']
  ambito?: string
} {
  // Decodificar entidades HTML básicas
  const t = rawTitle.replace(/&#8211;/g, '–').replace(/&amp;/g, '&').replace(/&quot;/g, '"')

  // Detectar tipo + ámbito
  let tipo: PostElectocracia['tipo'] = 'otra'
  let ambito: string | undefined
  if (/Generales/i.test(t)) { tipo = 'general'; ambito = 'España' }
  else if (/Europeas/i.test(t)) { tipo = 'europea'; ambito = 'España' }
  else if (/Municipales/i.test(t)) { tipo = 'municipal' }
  else if (/Autonómica|Autonomía/i.test(t)) { tipo = 'autonomica' }

  // Si no es generales pero menciona una CCAA/provincia
  const CCAA = ['Andalucía', 'Cataluña', 'Madrid', 'C. Valenciana', 'Galicia',
 'Castilla y León', 'País Vasco', 'Castilla-La Mancha', 'Canarias',
 'Murcia', 'Asturias', 'Aragón', 'Baleares', 'Extremadura', 'Navarra',
 'La Rioja', 'Cantabria', 'Ceuta', 'Melilla']
  if (!ambito) {
    const found = CCAA.find(c => new RegExp(`\\b${c}\\b`, 'i').test(t))
    if (found) {
      ambito = found
      if (tipo === 'otra') tipo = 'autonomica'
    }
  }

  // Parsear paréntesis: (Casa para Cliente, dd/mm/aaaa)
  const parens = t.match(/\(([^)]+)\)/)
  if (parens) {
    const inside = parens[1]
    // Casa "para" cliente
    const m = inside.match(/^(.+?)\s+para\s+(.+?)(?:,\s*(.+))?$/i)
    if (m) {
      const fecha = m[3] ? parseFechaES(m[3]) : undefined
      return { pollster: m[1].trim(), cliente: m[2].trim(), fecha_encuesta: fecha, tipo, ambito }
    }
    // Solo casa, dd/mm/aaaa
    const m2 = inside.match(/^(.+?),\s*(.+)$/)
    if (m2) {
      return { pollster: m2[1].trim(), fecha_encuesta: parseFechaES(m2[2]), tipo, ambito }
    }
    return { pollster: inside.trim(), tipo, ambito }
  }
  return { tipo, ambito }
}

function parseFechaES(s: string): string | undefined {
  // dd/mm/aaaa
  const m = s.trim().match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (m) {
    const dd = m[1].padStart(2, '0')
    const mm = m[2].padStart(2, '0')
    let yy = m[3]
    if (yy.length === 2) yy = (parseInt(yy) > 50 ? '19' : '20') + yy
    return `${yy}-${mm}-${dd}`
  }
  return undefined
}

function detectCasaFromCategorias(cats: number[]): string | undefined {
  for (const cat of cats) {
    if (CASAS_ENCUESTADORAS[cat]) return CASAS_ENCUESTADORAS[cat]
  }
  return undefined
}

// ─── API pública ────────────────────────────────────────────────────────

/** Lista las últimas N encuestas publicadas en electocracia.com */
export async function fetchEncuestasElectocracia(opts: {
  perPage?: number
  page?: number
  ambito?: 'general' | 'todos'
} = {}): Promise<PostElectocracia[]> {
  const perPage = Math.min(100, opts.perPage ?? 30)
  const page = opts.page ?? 1
  const url = new URL(`${BASE}/posts`)
  url.searchParams.set('categories', String(CAT_SONDEOS))
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('page', String(page))
  url.searchParams.set('_fields', 'id,date,link,title,categories')

  let raw: RawPost[]
  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: CACHE_REVALIDATE_S },
      headers: { 'User-Agent': 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)' },
    })
    if (!res.ok) return []
    raw = (await res.json()) as RawPost[]
  } catch {
    return []
  }

  const items = raw.map(p => {
    const parsed = parsePostTitle(p.title.rendered)
    return {
      id: p.id,
      date: p.date,
      link: p.link,
      title: p.title.rendered,
      pollster: parsed.pollster || detectCasaFromCategorias(p.categories),
      cliente: parsed.cliente,
      fecha_encuesta: parsed.fecha_encuesta || p.date.slice(0, 10),
      tipo: parsed.tipo,
      ambito: parsed.ambito,
      categorias: p.categories,
    } as PostElectocracia
  })

  if (opts.ambito === 'general') {
    return items.filter(i => i.tipo === 'general')
  }
  return items
}

/** Estadísticas agregadas: cuántas encuestas por casa en los últimos N días */
export async function statsEncuestasPorCasa(diasAtras = 90): Promise<Array<{ casa: string; n: number }>> {
  const items = await fetchEncuestasElectocracia({ perPage: 100 })
  const cutoff = Date.now() - diasAtras * 86400 * 1000
  const recent = items.filter(i => new Date(i.date).getTime() >= cutoff)
  const byCasa: Record<string, number> = {}
  for (const i of recent) {
    if (i.pollster) byCasa[i.pollster] = (byCasa[i.pollster] || 0) + 1
  }
  return Object.entries(byCasa)
    .map(([casa, n]) => ({ casa, n }))
    .sort((a, b) => b.n - a.n)
}
