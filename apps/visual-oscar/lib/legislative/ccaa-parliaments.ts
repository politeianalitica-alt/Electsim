/**
 * Agregador de RSS/Atom de parlamentos autonómicos.
 *
 * Cubre las CCAA que tienen feeds RSS verificados:
 *   - Andalucía (parlamentodeandalucia.es)
 *   - Baleares (parlamentib.es)
 *   - La Rioja (parlamento-larioja.org)
 *   - Murcia (asambleamurcia.es)
 *   - Asturias (jgpa.es)
 *   - Castilla-La Mancha (cortesclm.es)
 *   - Extremadura (asambleaex.es)
 *   - Canarias (parcan.es)
 *
 * Las demás CCAA no exponen RSS estructurado de iniciativas.
 */

import type { LegislativeInitiative, CCAA } from './types'

const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'

interface CcaaFeed {
  ccaa: CCAA
  parliament: string
  url: string
  /** Tipo de feed: 'rss20' por defecto. 'atom' o 'rss-utf16' si difiere */
  encoding?: 'utf8' | 'utf16'
}

const CCAA_FEEDS: CcaaFeed[] = [
  // Andalucía — RSS de iniciativas y leyes
  { ccaa: 'andalucia', parliament: 'Parlamento de Andalucía',
    url: 'https://www.parlamentodeandalucia.es/webdinamica/portal-web-parlamento/utilidades/sindicacionrss.do?contenido=Iniciativas' },
  { ccaa: 'andalucia', parliament: 'Parlamento de Andalucía',
    url: 'https://www.parlamentodeandalucia.es/webdinamica/portal-web-parlamento/utilidades/sindicacionrss.do?contenido=Leyes' },
  // Baleares — iniciativas y leyes
  { ccaa: 'baleares', parliament: 'Parlament de les Illes Balears',
    url: 'https://web.parlamentib.es/rsswebapifront/iniciativesPresentades', encoding: 'utf16' },
  { ccaa: 'baleares', parliament: 'Parlament de les Illes Balears',
    url: 'https://web.parlamentib.es/rsswebapifront/lleispib', encoding: 'utf16' },
  // La Rioja — iniciativas y leyes
  { ccaa: 'rioja', parliament: 'Parlamento de La Rioja',
    url: 'https://www.parlamento-larioja.org/actividad-parlamentaria/listado-ultimas-iniciativas/RSS' },
  { ccaa: 'rioja', parliament: 'Parlamento de La Rioja',
    url: 'https://www.parlamento-larioja.org/recursos-de-informacion/leyes-aprobadas/ultimas-leyes-aprobadas/RSS' },
  // Murcia
  { ccaa: 'murcia', parliament: 'Asamblea de Murcia',
    url: 'https://www.asambleamurcia.es/rss.xml' },
  // Asturias (JGPA)
  { ccaa: 'asturias', parliament: 'Junta General del Principado de Asturias',
    url: 'https://agoranet.jgpa.es/docuAst/rss.jsp' },
  // Castilla-La Mancha
  { ccaa: 'castilla-mancha', parliament: 'Cortes de Castilla-La Mancha',
    url: 'https://www.cortesclm.es/index.php?format=feed&type=rss' },
  // Extremadura
  { ccaa: 'extremadura', parliament: 'Asamblea de Extremadura',
    url: 'https://www.asambleaex.es/rssagenda' },
  // Canarias
  { ccaa: 'canarias', parliament: 'Parlamento de Canarias',
    url: 'https://www.parcan.es/noticias/rss.py' },
]

interface FeedItem {
  title: string
  link: string
  description: string
  pubDate: string | null
}

/** Parser RSS/Atom mínimo. Maneja UTF-16 si encoding='utf16'. */
async function fetchFeed(feed: CcaaFeed, timeoutMs = 8000): Promise<FeedItem[]> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      signal: controller.signal,
      next: { revalidate: 1800 },
    })
    if (!res.ok) return []
    let text: string
    if (feed.encoding === 'utf16') {
      const buf = await res.arrayBuffer()
      text = new TextDecoder('utf-16').decode(buf)
    } else {
      text = await res.text()
    }
    return parseFeed(text)
  } catch {
    return []
  } finally {
    clearTimeout(t)
  }
}

function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = []
  // RSS 2.0 <item>
  const rssRe = /<item[^>]*>([\s\S]*?)<\/item>/g
  let m
  while ((m = rssRe.exec(xml)) !== null) {
    const block = m[1]
    items.push({
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      description: extractTag(block, 'description'),
      pubDate: extractTag(block, 'pubDate') || extractTag(block, 'dc:date') || null,
    })
  }
  if (items.length > 0) return items
  // Atom <entry>
  const atomRe = /<entry[^>]*>([\s\S]*?)<\/entry>/g
  while ((m = atomRe.exec(xml)) !== null) {
    const block = m[1]
    const linkMatch = block.match(/<link[^>]*href="([^"]+)"/i)
    items.push({
      title: extractTag(block, 'title'),
      link: linkMatch ? linkMatch[1] : '',
      description: extractTag(block, 'summary') || extractTag(block, 'content'),
      pubDate: extractTag(block, 'published') || extractTag(block, 'updated') || null,
    })
  }
  return items
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = re.exec(block)
  if (!m) return ''
  return m[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

// ─── Heurísticas ────────────────────────────────────────────────────────────

function inferKind(title: string, desc: string): import('./types').InitiativeKind {
  const t = (title + ' ' + desc).toLowerCase()
  if (/proyecto.*ley|projecte.*llei/.test(t)) return 'PL'
  if (/proposici[oó]n.*ley|proposici[oó].*llei|pnl/.test(t)) return 'PPL'
  if (/moci[oó]n|moci[oó]/.test(t)) return 'MOCI'
  if (/interpelaci|interpel·laci/.test(t)) return 'INTE'
  if (/decreto.*ley|decret.*llei/.test(t)) return 'RDL'
  if (/reforma.*estatuto|reforma.*estatut/.test(t)) return 'REFC'
  return 'PROP'
}

function inferMateria(text: string): import('./types').Materia {
  const t = text.toLowerCase()
  if (/vivienda|alquiler|hipoteca|habitatge/.test(t)) return 'Vivienda'
  if (/sanidad|sanitar|salud/.test(t)) return 'Sanidad'
  if (/educa|universi|escuela|escola/.test(t)) return 'Educación'
  if (/justicia|judicial|fiscal|penal/.test(t)) return 'Justicia'
  if (/defensa|militar/.test(t)) return 'Defensa'
  if (/migra|extranj|asilo|refugia/.test(t)) return 'Migración'
  if (/energ|electric|renovable|combustible/.test(t)) return 'Energía'
  if (/digital|telecom|datos|inteligencia artificial|ciber/.test(t)) return 'Digital'
  if (/agra|agricul|ganader|pesca|forest/.test(t)) return 'Agraria'
  if (/cultura|patrimonio|memoria/.test(t)) return 'Cultura'
  if (/territori|autonom|local|municip/.test(t)) return 'Territorial'
  if (/social|pensión|empleo|trabajo|salario/.test(t)) return 'Social'
  if (/fisca|tribut|impuest|presupuest|económic/.test(t)) return 'Económica'
  return 'Otro'
}

function inferTags(text: string): string[] {
  const STOP = new Set(['proyecto','proposicion','proposición','ley','orgánica','organica','reforma',
    'normas','sobre','desde','hasta','según','según','general','generales','público','públicas',
    'relativa','relativo','presentada','presentado','grupo','parlamentario','sobre','con','desde'])
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length >= 6 && !STOP.has(w))
  return Array.from(new Set(words)).slice(0, 6)
}

// ─── API pública ───────────────────────────────────────────────────────────

export async function fetchCCAAInitiatives(maxPerCCAA = 30): Promise<LegislativeInitiative[]> {
  const settled = await Promise.allSettled(CCAA_FEEDS.map(async feed => {
    const items = await fetchFeed(feed)
    return { feed, items: items.slice(0, maxPerCCAA) }
  }))

  const out: LegislativeInitiative[] = []
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue
    const { feed, items } = r.value
    for (const it of items) {
      if (!it.title) continue
      const kind = inferKind(it.title, it.description)
      const id = `ccaa-${feed.ccaa}-${it.link.split('/').pop() || it.title.slice(0, 30)}`
      out.push({
        id,
        ambito: 'autonomico',
        ccaa: feed.ccaa,
        expediente: it.title.match(/\d{4,}\/\d+/)?.[0] || it.title.slice(0, 40),
        titulo: it.title.length > 200 ? it.title.slice(0, 197) + '…' : it.title,
        kind,
        materia: inferMateria(it.title + ' ' + it.description),
        promotor: feed.parliament,
        stage: 'registrado',
        fechaRegistro: it.pubDate ? new Date(it.pubDate).toISOString() : null,
        fechaActualizacion: it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString(),
        urlOficial: it.link || null,
        fuente: feed.url,
        tags: inferTags(it.title + ' ' + it.description),
      })
    }
  }
  return out
}
