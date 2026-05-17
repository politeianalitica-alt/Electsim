/**
 * Agregador de RSS/Atom de parlamentos autonómicos.
 *
 * Cubre las CCAA con feeds RSS verificados.
 * Detección automática de encoding (UTF-8 / ISO-8859-1 / UTF-16) desde
 * el header Content-Type o el prólogo XML.
 */

import type { LegislativeInitiative, CCAA } from './types'

const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'

interface CcaaFeed {
  ccaa: CCAA
  parliament: string
  url: string
  /** Hint cuando el endpoint requiere un decoder específico */
  encodingHint?: 'utf8' | 'iso-8859-1' | 'utf16'
}

const CCAA_FEEDS: CcaaFeed[] = [
  // Andalucía — ISO-8859-1
  { ccaa: 'andalucia', parliament: 'Parlamento de Andalucía',
    url: 'https://www.parlamentodeandalucia.es/webdinamica/portal-web-parlamento/utilidades/sindicacionrss.do?contenido=Iniciativas',
    encodingHint: 'iso-8859-1' },
  { ccaa: 'andalucia', parliament: 'Parlamento de Andalucía',
    url: 'https://www.parlamentodeandalucia.es/webdinamica/portal-web-parlamento/utilidades/sindicacionrss.do?contenido=Leyes',
    encodingHint: 'iso-8859-1' },
  // Baleares — UTF-16
  { ccaa: 'baleares', parliament: 'Parlament de les Illes Balears',
    url: 'https://web.parlamentib.es/rsswebapifront/iniciativesPresentades', encodingHint: 'utf16' },
  { ccaa: 'baleares', parliament: 'Parlament de les Illes Balears',
    url: 'https://web.parlamentib.es/rsswebapifront/lleispib', encodingHint: 'utf16' },
  // La Rioja
  { ccaa: 'rioja', parliament: 'Parlamento de La Rioja',
    url: 'https://www.parlamento-larioja.org/actividad-parlamentaria/listado-ultimas-iniciativas/RSS' },
  { ccaa: 'rioja', parliament: 'Parlamento de La Rioja',
    url: 'https://www.parlamento-larioja.org/recursos-de-informacion/leyes-aprobadas/ultimas-leyes-aprobadas/RSS' },
  // Murcia
  { ccaa: 'murcia', parliament: 'Asamblea de Murcia',
    url: 'https://www.asambleamurcia.es/rss.xml' },
  // Asturias
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

/** Detecta el encoding desde header Content-Type, declaración XML o hint */
function detectEncoding(contentType: string, sample: string, hint?: string): string {
  // 1) Hint explícito
  if (hint === 'utf16') return 'utf-16'
  if (hint === 'iso-8859-1') return 'iso-8859-1'
  if (hint === 'utf8') return 'utf-8'
  // 2) Content-Type header
  const ctMatch = contentType.toLowerCase().match(/charset=([\w-]+)/)
  if (ctMatch) return ctMatch[1]
  // 3) Declaración XML
  const xmlMatch = sample.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i)
  if (xmlMatch) return xmlMatch[1].toLowerCase()
  return 'utf-8'
}

async function fetchFeed(feed: CcaaFeed, timeoutMs = 9000): Promise<FeedItem[]> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      signal: controller.signal,
      next: { revalidate: 1800 },
      redirect: 'follow',
    })
    if (!res.ok) return []
    const buf = await res.arrayBuffer()
    // Detección de encoding
    const sample = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 200))
    const encoding = detectEncoding(res.headers.get('content-type') || '', sample, feed.encodingHint)
    let text: string
    try {
      text = new TextDecoder(encoding).decode(buf)
    } catch {
      // Fallback a UTF-8 si el encoding no es soportado
      text = new TextDecoder('utf-8').decode(buf)
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

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í').replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
    .replace(/&Ntilde;/g, 'Ñ').replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&uuml;/gi, 'ü')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
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
    'relativa','relativo','presentada','presentado','grupo','parlamentario','sobre','con','desde',
    'comunidad','autónoma','autonoma','andalucia','andalucía','cataluña','catalunya','madrid'])
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length >= 6 && !STOP.has(w))
  return Array.from(new Set(words)).slice(0, 6)
}

/**
 * Infiere etapa por edad de la iniciativa.
 * Sin datos reales del parlamento autonómico, asumimos progresión razonable.
 */
function inferStageByAge(pubDate: Date | null): import('./types').Stage {
  if (!pubDate) return 'desconocido'
  const daysOld = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24)
  if (daysOld < 14)  return 'registrado'
  if (daysOld < 30)  return 'calificacion'
  if (daysOld < 60)  return 'comision'
  if (daysOld < 120) return 'enmiendas'
  if (daysOld < 180) return 'ponencia'
  if (daysOld < 270) return 'dictamen'
  if (daysOld < 365) return 'pleno-origen'
  return 'pleno-revision'
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
      const titleClean = decodeHtmlEntities(it.title)
      const descClean = decodeHtmlEntities(it.description)
      const kind = inferKind(titleClean, descClean)
      const pubDate = it.pubDate ? new Date(it.pubDate) : null
      const stage = inferStageByAge(pubDate)
      const id = `ccaa-${feed.ccaa}-${(it.link.split('/').pop() || titleClean.slice(0, 30)).replace(/[^a-zA-Z0-9-]/g, '')}`
      out.push({
        id,
        ambito: 'autonomico',
        ccaa: feed.ccaa,
        expediente: titleClean.match(/\d{2,4}[-/]\d{2,4}[-/]\w+[-/]\d+/)?.[0] || titleClean.match(/\d{4,}\/\d+/)?.[0] || titleClean.slice(0, 40),
        titulo: titleClean.length > 200 ? titleClean.slice(0, 197) + '…' : titleClean,
        kind,
        materia: inferMateria(titleClean + ' ' + descClean),
        promotor: feed.parliament,
        stage,
        fechaRegistro: pubDate ? pubDate.toISOString() : null,
        fechaActualizacion: pubDate ? pubDate.toISOString() : new Date().toISOString(),
        urlOficial: it.link || null,
        fuente: feed.url,
        tags: inferTags(titleClean + ' ' + descClean),
      })
    }
  }
  return out
}
