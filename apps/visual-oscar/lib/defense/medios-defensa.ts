/**
 * Agregador especializado de medios de defensa.
 *
 * Fuentes con RSS funcional:
 *   - Infodefensa            https://www.infodefensa.com/feed
 *   - Revista Ejércitos      https://www.revistaejercitos.com/feed
 *   - Escudo Digital         https://www.escudodigital.com/feed
 *   - Defense News           https://www.defensenews.com/arc/outboundfeeds/rss/
 *   - Breaking Defense       https://breakingdefense.com/feed
 *   - The War Zone (TWZ)     https://www.thedrive.com/the-war-zone/rss
 *   - EDA News               https://www.eda.europa.eu/rss/news
 *   - NATO Newsroom          https://www.nato.int/cps/en/natohq/rss.xml
 *   - Jane's Defence         https://www.janes.com/feeds/news
 *
 * Cada artículo se clasifica por:
 *   - Dominio de capacidad (aereo/naval/terrestre/cyber/misiles/espacial/drones/nuclear)
 *   - Tipo de contenido (noticia/análisis/opinión/informe)
 *   - Relevancia 0-100 (España + adquisiciones + capacidades)
 *   - País mencionado (ISO2)
 *   - Vinculación a programa/contrato si matchea
 */

const TTL = 30 * 60 * 1000

interface CacheEntry<T> { ts: number; data: T }
const cache: Map<string, CacheEntry<unknown>> = new Map()

export interface MedioDefensa {
  id: string
  nombre: string
  url_base: string
  url_rss: string
  tipo: 'generalista_defensa' | 'revista_academica' | 'seguridad_cyber' | 'especializado_aereo' | 'referencia_internacional' | 'analisis_operacional' | 'institucional_eu' | 'institucional_nato'
  pais_origen: string
  idioma: string
  fiabilidad: 'alta' | 'muy_alta'
  color: string
  cobertura: string[]
  tiene_paywall_parcial?: boolean
}

export const MEDIOS_DEFENSA: MedioDefensa[] = [
  { id: 'infodefensa', nombre: 'Infodefensa', url_base: 'https://www.infodefensa.com', url_rss: 'https://www.infodefensa.com/feed', tipo: 'generalista_defensa', pais_origen: 'ES', idioma: 'es', fiabilidad: 'alta', color: '#1F4E8C', cobertura: ['es', 'eu', 'latam'] },
  { id: 'revista_ejercitos', nombre: 'Revista Ejércitos', url_base: 'https://www.revistaejercitos.com', url_rss: 'https://www.revistaejercitos.com/feed', tipo: 'revista_academica', pais_origen: 'ES', idioma: 'es', fiabilidad: 'muy_alta', color: '#5D4037', cobertura: ['es', 'eu', 'nato'] },
  { id: 'escudo_digital', nombre: 'Escudo Digital', url_base: 'https://www.escudodigital.com', url_rss: 'https://www.escudodigital.com/feed', tipo: 'seguridad_cyber', pais_origen: 'ES', idioma: 'es', fiabilidad: 'alta', color: '#16A34A', cobertura: ['es', 'cyber'] },
  { id: 'defense_news', nombre: 'Defense News', url_base: 'https://www.defensenews.com', url_rss: 'https://www.defensenews.com/arc/outboundfeeds/rss/', tipo: 'referencia_internacional', pais_origen: 'US', idioma: 'en', fiabilidad: 'muy_alta', color: '#1F4E8C', cobertura: ['us', 'nato', 'global'] },
  { id: 'breaking_defense', nombre: 'Breaking Defense', url_base: 'https://breakingdefense.com', url_rss: 'https://breakingdefense.com/feed', tipo: 'referencia_internacional', pais_origen: 'US', idioma: 'en', fiabilidad: 'alta', color: '#DC2626', cobertura: ['us', 'pentagon'] },
  { id: 'twz', nombre: 'The War Zone', url_base: 'https://www.thedrive.com/the-war-zone', url_rss: 'https://www.thedrive.com/the-war-zone/rss', tipo: 'analisis_operacional', pais_origen: 'US', idioma: 'en', fiabilidad: 'alta', color: '#7F1D1D', cobertura: ['operaciones', 'osint'] },
  { id: 'eda_news', nombre: 'EDA News', url_base: 'https://www.eda.europa.eu', url_rss: 'https://www.eda.europa.eu/rss/news', tipo: 'institucional_eu', pais_origen: 'EU', idioma: 'en', fiabilidad: 'muy_alta', color: '#0EA5E9', cobertura: ['eu', 'pesco', 'edf'] },
  { id: 'nato_newsroom', nombre: 'NATO Newsroom', url_base: 'https://www.nato.int', url_rss: 'https://www.nato.int/cps/en/natohq/rss.xml', tipo: 'institucional_nato', pais_origen: 'NATO', idioma: 'en', fiabilidad: 'muy_alta', color: '#5D4037', cobertura: ['nato'] },
]

// Dominios de capacidad
export type DominioCap = 'aereo' | 'naval' | 'terrestre' | 'cyber' | 'misiles' | 'espacial' | 'drones' | 'nuclear' | 'industria' | 'otros'

const DOMINIOS_KW: Record<DominioCap, RegExp[]> = {
  'aereo':       [/eurofighter|f-35|f-18|f\/a-18|rafale|fcas|typhoon|tornado|a400m|caza|combat aircraft/i],
  'naval':       [/fragata|frigate|destructor|destroyer|portaaviones|carrier|submarino|submarine|s-80|f-110|navantia|cvn|ssn|ssbn/i],
  'terrestre':   [/leopard|abrams|t-90|carro de combate|main battle tank|himars|pzh|pizarro|vcr|infantry fighting|self-propelled/i],
  'cyber':       [/cyber|ciber|ransomware|apt|malware|ccn-cert|incibe|cci\b|cyberdefen/i],
  'misiles':     [/misil|missile|patriot|samp\/t|iris-t|nasams|brahmos|kalibr|hellfire|tomahawk|hipersónic|hypersonic/i],
  'espacial':    [/satelite|satellite|space force|gmv|hisdesat|space command|spainsat|paz|space surveill/i],
  'drones':      [/drone|uav|ucav|rpas|reaper|predator|bayraktar|shahed|kamikaze drone|loitering munition/i],
  'nuclear':     [/nuclear|disuasi[óo]n|deterrent|warhead|cabeza nuclear|m51|trident|sentinel|ssbn/i],
  'industria':   [/contrato|contract|adjudic|licitaci[óo]n|tender|industria|industry|export|programa|adquisic|procurement/i],
  'otros':       [/.*/],
}

const PAIS_PATTERNS: Array<{ iso2: string; re: RegExp }> = [
  { iso2: 'ES', re: /españa|spanish|spain/i },
  { iso2: 'US', re: /united states|usa|pentagon|estados unidos|u\.s\./i },
  { iso2: 'GB', re: /united kingdom|uk\b|britain|british/i },
  { iso2: 'FR', re: /france|french|francia/i },
  { iso2: 'DE', re: /germany|german|deutschland|alemania/i },
  { iso2: 'IT', re: /italy|italia|italian/i },
  { iso2: 'PL', re: /poland|polish|polonia/i },
  { iso2: 'UA', re: /ukraine|ucrania|ukrainian/i },
  { iso2: 'RU', re: /russia|russian|rusia/i },
  { iso2: 'CN', re: /china|chinese/i },
  { iso2: 'IL', re: /israel|israeli/i },
  { iso2: 'IR', re: /iran|iranian|ir[áa]n/i },
  { iso2: 'TR', re: /turkey|turqu[íi]a|turkish/i },
  { iso2: 'SA', re: /saudi|arabia saud[íi]/i },
  { iso2: 'JP', re: /japan|jap[óo]n|japanese/i },
  { iso2: 'KR', re: /south korea|corea del sur|korean/i },
  { iso2: 'IN', re: /india|indian/i },
  { iso2: 'AU', re: /australia|australian/i },
]

const TIPO_CONTENIDO_PATTERNS: Array<{ tipo: 'noticia' | 'analisis' | 'opinion' | 'informe' | 'entrevista'; re: RegExp }> = [
  { tipo: 'analisis',   re: /an[áa]lisis|analysis|in-depth|deep dive|opinion piece/i },
  { tipo: 'opinion',    re: /opini[óo]n|opinion|editorial|comentario|column/i },
  { tipo: 'informe',    re: /informe|report|libro blanco|white paper|estudio/i },
  { tipo: 'entrevista', re: /entrevista|interview|exclusiva/i },
  { tipo: 'noticia',    re: /.*/ },
]

export interface ArticuloDefensa {
  id: string
  titulo: string
  url: string
  medio_id: string
  medio_nombre: string
  medio_color: string
  pais_origen_medio: string
  fecha: string | null
  excerpt: string
  dominios: DominioCap[]
  paises_mencionados: string[]
  tipo_contenido: 'noticia' | 'analisis' | 'opinion' | 'informe' | 'entrevista'
  es_paywall: boolean
  relevancia: number
}

async function fetchRSS(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
      signal: controller.signal, next: { revalidate: 1800 },
    })
    if (!res.ok) return null
    return await res.text()
  } catch { return null } finally { clearTimeout(t) }
}

function extractTag(body: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = re.exec(body)
  if (!m) return ''
  const v = m[1].trim()
  const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(v)
  return (cdata ? cdata[1] : v).trim()
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ').replace(/\s+/g, ' ').trim()
}

function detectarDominios(texto: string): DominioCap[] {
  const out: DominioCap[] = []
  for (const [dom, patterns] of Object.entries(DOMINIOS_KW)) {
    if (dom === 'otros') continue
    if (patterns.some(re => re.test(texto))) out.push(dom as DominioCap)
  }
  return out.length > 0 ? out.slice(0, 4) : ['otros']
}

function detectarPaises(texto: string): string[] {
  return PAIS_PATTERNS.filter(p => p.re.test(texto)).map(p => p.iso2).slice(0, 5)
}

function detectarTipo(texto: string): ArticuloDefensa['tipo_contenido'] {
  for (const p of TIPO_CONTENIDO_PATTERNS) {
    if (p.re.test(texto)) return p.tipo
  }
  return 'noticia'
}

function calcularRelevancia(art: { titulo: string; excerpt: string; dominios: DominioCap[]; paises: string[]; tipo: string }): number {
  const texto = (art.titulo + ' ' + art.excerpt).toLowerCase()
  let score = 50
  if (art.paises.includes('ES')) score += 15
  score += Math.min(art.dominios.filter(d => d !== 'otros').length * 8, 25)
  if (/contrato|contract|adjudic|licitaci[óo]n|tender|millones|million|bn\b/i.test(texto)) score += 10
  if (art.tipo === 'opinion' && !/\d+\s*(millones|million|bn)/i.test(texto)) score -= 10
  if (art.tipo === 'analisis' || art.tipo === 'informe') score += 5
  return Math.max(0, Math.min(100, score))
}

function parseFeed(xml: string, medio: MedioDefensa): ArticuloDefensa[] {
  const items: ArticuloDefensa[] = []
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = itemRe.exec(xml)) && idx < 30) {
    idx++
    const body = m[1]
    const titulo = stripHtml(extractTag(body, 'title'))
    const link = extractTag(body, 'link')
    const desc = stripHtml(extractTag(body, 'description'))
    const pubDate = extractTag(body, 'pubDate')
    const dominios = detectarDominios(titulo + ' ' + desc)
    const paises = detectarPaises(titulo + ' ' + desc)
    const tipo = detectarTipo(titulo + ' ' + desc)
    const relevancia = calcularRelevancia({ titulo, excerpt: desc, dominios, paises, tipo })
    items.push({
      id: `${medio.id}-${Buffer.from(link).toString('base64').slice(0, 16)}`,
      titulo, url: link, medio_id: medio.id, medio_nombre: medio.nombre, medio_color: medio.color,
      pais_origen_medio: medio.pais_origen,
      fecha: pubDate ? new Date(pubDate).toISOString() : null,
      excerpt: desc.slice(0, 280),
      dominios, paises_mencionados: paises, tipo_contenido: tipo,
      es_paywall: medio.tiene_paywall_parcial || false,
      relevancia,
    })
  }
  return items
}

export interface BriefingDefensa {
  items: ArticuloDefensa[]
  agregado: {
    totalItems: number
    porMedio: Record<string, number>
    porDominio: Record<string, number>
    porPais: Record<string, number>
    porTipo: Record<string, number>
    altaRelevancia: number
  }
  ts: string
}

export async function getBriefingDefensa(maxItems = 80): Promise<BriefingDefensa> {
  const cacheKey = `brief-def:${maxItems}`
  const cached = cache.get(cacheKey) as CacheEntry<BriefingDefensa> | undefined
  if (cached && Date.now() - cached.ts < TTL) return cached.data

  const results = await Promise.allSettled(
    MEDIOS_DEFENSA.map(async m => {
      const xml = await fetchRSS(m.url_rss)
      if (!xml) return [] as ArticuloDefensa[]
      return parseFeed(xml, m)
    }),
  )
  const all: ArticuloDefensa[] = []
  for (const r of results) if (r.status === 'fulfilled') all.push(...r.value)
  all.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
  const items = all.slice(0, maxItems)

  const porMedio: Record<string, number> = {}
  const porDominio: Record<string, number> = {}
  const porPais: Record<string, number> = {}
  const porTipo: Record<string, number> = {}
  let altaRelevancia = 0
  for (const it of items) {
    porMedio[it.medio_nombre] = (porMedio[it.medio_nombre] || 0) + 1
    for (const d of it.dominios) porDominio[d] = (porDominio[d] || 0) + 1
    for (const p of it.paises_mencionados) porPais[p] = (porPais[p] || 0) + 1
    porTipo[it.tipo_contenido] = (porTipo[it.tipo_contenido] || 0) + 1
    if (it.relevancia > 80) altaRelevancia++
  }

  const report: BriefingDefensa = {
    items,
    agregado: { totalItems: items.length, porMedio, porDominio, porPais, porTipo, altaRelevancia },
    ts: new Date().toISOString(),
  }
  cache.set(cacheKey, { ts: Date.now(), data: report })
  return report
}
