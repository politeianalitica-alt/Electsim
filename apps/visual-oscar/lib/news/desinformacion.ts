/**
 * Desinformación · agregador de fact-checkers españoles.
 *
 * Fuentes RSS oficiales (públicas y gratuitas):
 *   - EFE Verifica       https://verifica.efe.com/feed/
 *   - Newtral Fact-check https://www.newtral.es/fact-check/feed/
 *   - Maldita            https://maldita.es/feed/
 *
 * Cada fuente:
 *   - Cabecera: nombre, URL, política editorial
 *   - Frecuencia de publicación: estimación
 *   - Cobertura: verificación de información política, salud, ciencia
 *
 * Procesamiento:
 *   - Extracción de "afirmación verificada" + "veredicto"
 *   - Clasificación por veredicto: bulo/engañoso/parcialmente cierto/cierto/sin contexto
 *   - Detección de actores políticos/instituciones afectadas
 *   - Análisis de tema (migración, COVID, elecciones, economía, etc.)
 */

const TTL = 30 * 60 * 1000  // 30 min

interface CacheEntry<T> { ts: number; data: T }
const cache: Map<string, CacheEntry<unknown>> = new Map()

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PoliteiaAnaltica/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: controller.signal,
      next: { revalidate: 1800 },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export interface FactCheck {
  id: string
  titulo: string
  afirmacion: string         // afirmación verificada
  veredicto: 'bulo' | 'engañoso' | 'parcialmente_cierto' | 'cierto' | 'sin_contexto' | 'sin_clasificar'
  veredictoLabel: string
  descripcion: string
  fuente: 'EFE Verifica' | 'Newtral' | 'Maldita' | string
  fuenteColor: string
  url: string
  fecha: string | null
  temas: string[]
  actoresAfectados: string[]   // políticos/instituciones/colectivos negativamente afectados
  alcanceEstimado: 'bajo' | 'medio' | 'alto' | 'viral'
}

interface SourceConfig {
  nombre: string
  feedUrl: string
  color: string
  veredictoParser: (titulo: string, desc: string) => { veredicto: FactCheck['veredicto']; label: string }
}

const FUENTES: SourceConfig[] = [
  {
    nombre: 'EFE Verifica',
    feedUrl: 'https://verifica.efe.com/feed/',
    color: '#0EA5E9',
    veredictoParser: (t, d) => {
      const txt = (t + ' ' + d).toLowerCase()
      if (/\bes un bulo\b|\bbulo\b|\bes falso\b|\bsin pruebas\b/.test(txt)) return { veredicto: 'bulo', label: 'Bulo' }
      if (/\bengañoso\b|\bdescontextualizad/.test(txt)) return { veredicto: 'engañoso', label: 'Engañoso' }
      if (/\bsin contexto\b/.test(txt)) return { veredicto: 'sin_contexto', label: 'Sin contexto' }
      if (/\bparcial/.test(txt)) return { veredicto: 'parcialmente_cierto', label: 'Parcialmente cierto' }
      if (/\bes cierto\b|\bes verdad\b|\bconfirmad/.test(txt)) return { veredicto: 'cierto', label: 'Cierto' }
      return { veredicto: 'sin_clasificar', label: 'Sin clasificar' }
    },
  },
  {
    nombre: 'Newtral',
    feedUrl: 'https://www.newtral.es/fact-check/feed/',
    color: '#7C3AED',
    veredictoParser: (t, d) => {
      const txt = (t + ' ' + d).toLowerCase()
      if (/\bes falso\b|\bbulo\b|\bsin pruebas\b/.test(txt)) return { veredicto: 'bulo', label: 'Falso' }
      if (/\bengañoso\b|\bnegacionista\b/.test(txt)) return { veredicto: 'engañoso', label: 'Engañoso' }
      if (/\bsin contexto\b|\bdescontextualizad/.test(txt)) return { veredicto: 'sin_contexto', label: 'Sin contexto' }
      if (/\bes verdad\b|\bes cierto\b|\bconfirmad/.test(txt)) return { veredicto: 'cierto', label: 'Cierto' }
      return { veredicto: 'sin_clasificar', label: 'Verificación' }
    },
  },
  {
    nombre: 'Maldita',
    feedUrl: 'https://maldita.es/feed/',
    color: '#DC2626',
    veredictoParser: (t, d) => {
      const txt = (t + ' ' + d).toLowerCase()
      if (/\bno es cierto\b|\bes falso\b|\bbulo\b|\bbulos\b|\bsin pruebas\b|\bno hay pruebas\b/.test(txt)) return { veredicto: 'bulo', label: 'Bulo' }
      if (/\bengañoso\b|\btramposo\b/.test(txt)) return { veredicto: 'engañoso', label: 'Engañoso' }
      if (/\bsin contexto\b|\bdescontextualizad/.test(txt)) return { veredicto: 'sin_contexto', label: 'Sin contexto' }
      if (/\bes cierto\b|\bes verdad\b/.test(txt)) return { veredicto: 'cierto', label: 'Cierto' }
      return { veredicto: 'sin_clasificar', label: 'Verificación' }
    },
  },
]

// Patrones para detectar actores afectados
const ACTORES_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /pedro\s+s[áa]nchez|psoe/i,                label: 'PSOE / Pedro Sánchez' },
  { pattern: /feij[óo]o|partido popular|\bpp\b/i,       label: 'PP / Núñez Feijóo' },
  { pattern: /vox|abascal/i,                            label: 'Vox / Santiago Abascal' },
  { pattern: /yolanda\s+d[íi]az|sumar/i,                label: 'Sumar / Yolanda Díaz' },
  { pattern: /ayuso|comunidad de madrid/i,              label: 'Comunidad de Madrid / Ayuso' },
  { pattern: /illa|cataluña|generalitat/i,              label: 'Generalitat de Catalunya' },
  { pattern: /tribunal supremo|ts\b/i,                  label: 'Tribunal Supremo' },
  { pattern: /tribunal constitucional|tc\b/i,           label: 'Tribunal Constitucional' },
  { pattern: /cni|inteligencia nacional/i,              label: 'CNI / Inteligencia' },
  { pattern: /guardia civil/i,                          label: 'Guardia Civil' },
  { pattern: /polic[íi]a nacional/i,                    label: 'Policía Nacional' },
  { pattern: /banco de españa/i,                        label: 'Banco de España' },
  { pattern: /sanidad p[úu]blica|ministerio.*sanidad/i, label: 'Sanidad Pública' },
  { pattern: /universidad|crue/i,                       label: 'Universidades' },
  { pattern: /inmigra(?:ci[óo]n|ntes?)|menas/i,         label: 'Inmigrantes' },
  { pattern: /mujeres|feminism|trans/i,                 label: 'Mujeres / Colectivo trans' },
  { pattern: /lgtbi/i,                                  label: 'Colectivo LGTBI' },
  { pattern: /jud[íi]os|israel/i,                       label: 'Comunidad judía / Israel' },
  { pattern: /musulman|palest/i,                        label: 'Musulmanes / Palestina' },
  { pattern: /periodista|prensa libre/i,                label: 'Profesionales del periodismo' },
  { pattern: /agricultor|ganader/i,                     label: 'Agricultores / ganaderos' },
  { pattern: /ucrania|zelensky/i,                       label: 'Ucrania / Zelensky' },
  { pattern: /rusia|putin/i,                            label: 'Rusia / Putin' },
]

// Patrones para clasificar tema
const TEMAS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /vacuna|covid|coronavirus|pandemi/i,        label: 'Salud / COVID' },
  { pattern: /elecciones|votar|sufragio|electoral/i,     label: 'Elecciones' },
  { pattern: /migra(?:ci[óo]n|ntes?)|mena|asilo|frontera/i, label: 'Migración' },
  { pattern: /econom[íi]a|inflaci[óo]n|empleo|paro|salario/i, label: 'Economía' },
  { pattern: /vivienda|alquiler|hipoteca/i,              label: 'Vivienda' },
  { pattern: /guerra|conflicto|invasi[óo]n|israel|ucrania|gaza/i, label: 'Guerra / Conflictos' },
  { pattern: /clima|medio ambiente|sequía|incendio/i,    label: 'Clima / Medio ambiente' },
  { pattern: /europ|ue|bruselas/i,                       label: 'UE / Bruselas' },
  { pattern: /corrupci[óo]n|caso koldo|caso cerd[áa]n/i, label: 'Corrupción' },
  { pattern: /tribunal|sentencia|justicia/i,             label: 'Justicia' },
  { pattern: /protesta|manifestaci[óo]n/i,               label: 'Protestas' },
  { pattern: /violencia|asesin|crimen/i,                 label: 'Violencia / crimen' },
  { pattern: /redes sociales|tiktok|tweet|x\s*\(twitter\)/i, label: 'Redes sociales' },
  { pattern: /inteligencia artificial|ia\b/i,            label: 'Inteligencia Artificial' },
]

function detectarTemas(texto: string): string[] {
  const out = new Set<string>()
  for (const { pattern, label } of TEMAS_PATTERNS) {
    if (pattern.test(texto)) out.add(label)
  }
  return Array.from(out).slice(0, 4)
}

function detectarActores(texto: string): string[] {
  const out = new Set<string>()
  for (const { pattern, label } of ACTORES_PATTERNS) {
    if (pattern.test(texto)) out.add(label)
  }
  return Array.from(out).slice(0, 5)
}

function estimarAlcance(item: { titulo: string; descripcion: string; veredicto: string }): FactCheck['alcanceEstimado'] {
  const txt = (item.titulo + ' ' + item.descripcion).toLowerCase()
  let score = 0
  if (/viral|miles|millones|tendencia/.test(txt)) score += 3
  if (/whatsapp|tiktok|tweet|circul/.test(txt)) score += 2
  if (/falso|bulo|engañoso/.test(txt) || item.veredicto === 'bulo') score += 1
  if (txt.length > 600) score += 1
  return score >= 4 ? 'viral' : score >= 3 ? 'alto' : score >= 1 ? 'medio' : 'bajo'
}

function parseFeed(xml: string, fuente: SourceConfig): FactCheck[] {
  const items: FactCheck[] = []
  // Regex simple para item de RSS
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = itemRe.exec(xml)) && idx < 50) {
    idx++
    const body = m[1]
    const titulo = extractTag(body, 'title') || ''
    const link = extractTag(body, 'link') || ''
    const desc = stripHtml(extractTag(body, 'description') || '')
    const pubDate = extractTag(body, 'pubDate') || ''
    const { veredicto, label } = fuente.veredictoParser(titulo, desc)
    const fcID = `${fuente.nombre.toLowerCase().replace(/\s+/g, '-')}-${Buffer.from(link).toString('base64').slice(0, 12)}`
    const fc: FactCheck = {
      id: fcID,
      titulo,
      afirmacion: extractAfirmacion(titulo, desc),
      veredicto,
      veredictoLabel: label,
      descripcion: desc.slice(0, 280),
      fuente: fuente.nombre,
      fuenteColor: fuente.color,
      url: link,
      fecha: pubDate ? new Date(pubDate).toISOString() : null,
      temas: detectarTemas(titulo + ' ' + desc),
      actoresAfectados: detectarActores(titulo + ' ' + desc),
      alcanceEstimado: estimarAlcance({ titulo, descripcion: desc, veredicto }),
    }
    items.push(fc)
  }
  return items
}

function extractTag(body: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = re.exec(body)
  if (!m) return ''
  // CDATA o texto
  const v = m[1].trim()
  const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(v)
  return (cdata ? cdata[1] : v).trim()
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim()
}

function extractAfirmacion(titulo: string, _desc: string): string {
  // Para fact-checks, el titular suele ser la afirmación verificada
  // Ej: "Es un bulo que [afirmación]" → extraer [afirmación]
  const m = /(?:bulo|falso|engañoso|sin contexto)\s+(?:que\s+)?(.+?)(?:[.:!?]|$)/i.exec(titulo)
  if (m) return m[1].trim()
  return titulo.length > 120 ? titulo.slice(0, 117) + '…' : titulo
}

export interface DesinformacionReport {
  items: FactCheck[]
  agregado: {
    totalItems: number
    porFuente: Record<string, number>
    porVeredicto: Record<string, number>
    porTema: Array<{ tema: string; n: number }>
    actoresAfectados: Array<{ actor: string; n: number; veredictosNegativos: number; temas: string[]; alcanceMedio: string; tendencia: 'creciente' | 'estable' | 'decreciente' }>
    alcanceViral: number
  }
  tendenciasTemporales: Array<{ fecha: string; total: number; bulos: number; engañosos: number }>
  porTemaTemporal: Record<string, Array<{ fecha: string; n: number }>>
  ts: string
}

/**
 * Agregador de desinformación · descarga RSS de 3 fact-checkers en paralelo.
 */
export async function getDesinformacionFeed(maxItems = 60): Promise<DesinformacionReport> {
  const cacheKey = `disinfo:${maxItems}`
  const cached = cache.get(cacheKey) as CacheEntry<DesinformacionReport> | undefined
  if (cached && Date.now() - cached.ts < TTL) return cached.data

  const results = await Promise.allSettled(
    FUENTES.map(async f => {
      const xml = await fetchText(f.feedUrl)
      if (!xml) return [] as FactCheck[]
      return parseFeed(xml, f)
    }),
  )

  const all: FactCheck[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }

  // Ordenar por fecha desc
  all.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  const items = all.slice(0, maxItems)

  // Agregados básicos
  const porFuente: Record<string, number> = {}
  const porVeredicto: Record<string, number> = {}
  const temaMap = new Map<string, number>()
  const actorMap = new Map<string, { n: number; neg: number; temas: Set<string>; alcances: string[]; fechas: string[] }>()
  let viralCount = 0
  for (const it of items) {
    porFuente[it.fuente] = (porFuente[it.fuente] || 0) + 1
    porVeredicto[it.veredicto] = (porVeredicto[it.veredicto] || 0) + 1
    for (const t of it.temas) temaMap.set(t, (temaMap.get(t) || 0) + 1)
    for (const a of it.actoresAfectados) {
      if (!actorMap.has(a)) actorMap.set(a, { n: 0, neg: 0, temas: new Set(), alcances: [], fechas: [] })
      const existing = actorMap.get(a)!
      existing.n++
      if (it.veredicto === 'bulo' || it.veredicto === 'engañoso') existing.neg++
      for (const t of it.temas) existing.temas.add(t)
      existing.alcances.push(it.alcanceEstimado)
      if (it.fecha) existing.fechas.push(it.fecha.slice(0, 10))
    }
    if (it.alcanceEstimado === 'viral') viralCount++
  }
  const porTema = Array.from(temaMap.entries()).map(([t, n]) => ({ tema: t, n })).sort((a, b) => b.n - a.n)

  const actoresAfectados = Array.from(actorMap.entries()).map(([a, v]) => {
    // Alcance medio
    const alcanceScore = v.alcances.reduce((s, x) => s + (x === 'viral' ? 3 : x === 'alto' ? 2 : x === 'medio' ? 1 : 0), 0) / Math.max(1, v.alcances.length)
    const alcanceMedio = alcanceScore >= 2.3 ? 'viral' : alcanceScore >= 1.5 ? 'alto' : alcanceScore >= 0.8 ? 'medio' : 'bajo'
    // Tendencia: comparar primera mitad con segunda mitad
    const fechas = v.fechas.sort()
    const half = Math.floor(fechas.length / 2)
    const primera = fechas.slice(0, half).length
    const segunda = fechas.slice(half).length
    const tendencia: 'creciente' | 'estable' | 'decreciente' = segunda > primera * 1.3 ? 'creciente' : segunda < primera * 0.7 ? 'decreciente' : 'estable'
    return {
      actor: a, n: v.n, veredictosNegativos: v.neg,
      temas: Array.from(v.temas).slice(0, 5),
      alcanceMedio, tendencia,
    }
  }).sort((a, b) => b.n - a.n)

  // Tendencias temporales (últimos 14 días)
  const tendenciasMap = new Map<string, { total: number; bulos: number; engañosos: number }>()
  const temaTemporalMap = new Map<string, Map<string, number>>()
  for (const it of items) {
    if (!it.fecha) continue
    const fechaDia = it.fecha.slice(0, 10)
    if (!tendenciasMap.has(fechaDia)) tendenciasMap.set(fechaDia, { total: 0, bulos: 0, engañosos: 0 })
    const t = tendenciasMap.get(fechaDia)!
    t.total++
    if (it.veredicto === 'bulo') t.bulos++
    if (it.veredicto === 'engañoso') t.engañosos++
    for (const tm of it.temas) {
      if (!temaTemporalMap.has(tm)) temaTemporalMap.set(tm, new Map())
      const tt = temaTemporalMap.get(tm)!
      tt.set(fechaDia, (tt.get(fechaDia) || 0) + 1)
    }
  }
  const tendenciasTemporales = Array.from(tendenciasMap.entries())
    .map(([fecha, v]) => ({ fecha, ...v }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const porTemaTemporal: Record<string, Array<{ fecha: string; n: number }>> = {}
  for (const [tema, fechas] of temaTemporalMap) {
    porTemaTemporal[tema] = Array.from(fechas.entries())
      .map(([fecha, n]) => ({ fecha, n }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }

  const report: DesinformacionReport = {
    items,
    agregado: { totalItems: items.length, porFuente, porVeredicto, porTema, actoresAfectados, alcanceViral: viralCount },
    tendenciasTemporales, porTemaTemporal,
    ts: new Date().toISOString(),
  }
  cache.set(cacheKey, { ts: Date.now(), data: report })
  return report
}
