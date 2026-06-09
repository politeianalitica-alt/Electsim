/**
 * GET /api/medios/think-tanks
 *
 * Tablón de artículos de los principales think tanks del mundo, de TODOS los
 * bloques geopolíticos (España, UE, anglosajón, China, Rusia, India,
 * Asia-Pacífico, Latinoamérica, multilateral/global).
 *
 * Agrega los feeds RSS/Atom de cada think tank en paralelo (Promise.allSettled),
 * parsea tanto <item> (RSS) como <entry> (Atom), y enriquece cada artículo con:
 *   - bloque geopolítico del think tank (del registry)
 *   - temas detectados (heurística por keywords ES+EN)
 *   - países detectados (heurística)
 *   - urgencia 1-5 y relevancia para España (heurística desde el resumen)
 *
 * Devuelve además `facets` (bloques/temas/países con conteos reales) para que
 * el selector del tablón solo ofrezca categorías con contenido.
 *
 * URLs de feed VERIFICADAS en jun-2026 (workflow think-tank-feeds-research,
 * 23/30 confirmados). Las no verificadas se incluyen como best-effort: si el
 * feed falla, Promise.allSettled lo descarta sin romper la respuesta.
 *
 * Nota anti-bot: muchos feeds (Foreign Policy, Clingendael, OIES, RAND, ECFR,
 * War on the Rocks…) responden 403 a User-Agents no-navegador o detrás de
 * Cloudflare. Por eso fetchFeed envía cabeceras de navegador. Los que usan
 * challenge JS de Cloudflare desde IP de datacenter pueden seguir fallando;
 * degradan limpiamente.
 */
import { NextResponse } from 'next/server'
import https from 'https'
import http from 'http'
import { SECTOR_LABELS, type SectorKey } from '@/lib/medios/sector-taxonomy'

// Mapeo de los temas del tablón (detectados en EN+ES) a la taxonomía de SECTOR
// compartida, para que el think-tank board se filtre con los mismos sectores
// que Pulso/Narrativas. Los feeds son geopolíticos → default 'internacional'.
const TEMA_TO_SECTOR: Record<string, SectorKey> = {
  conflicto_armado: 'defensa',
  defensa: 'defensa',
  energia: 'energia',
  economia: 'economia',
  migracion: 'internacional',
  diplomacia: 'internacional',
  ciberseguridad: 'telecom',
  clima: 'energia',
  tecnologia: 'telecom',
  crimen_organizado: 'justicia',
  gobernanza: 'politica_institucional',
}
const SECTORIAL_TEMA_SECTORS = new Set<SectorKey>(['defensa', 'energia', 'telecom', 'justicia'])
function sectorFromTemas(temas: string[]): SectorKey {
  const mapped = temas.map((t) => TEMA_TO_SECTOR[t]).filter(Boolean) as SectorKey[]
  // Prioriza sectores específicos (defensa/energía/telecom/justicia) sobre las
  // transversales amplias, antes de caer al default geopolítico 'internacional'.
  const sectorial = mapped.find((s) => SECTORIAL_TEMA_SECTORS.has(s))
  if (sectorial) return sectorial
  return mapped[0] ?? 'internacional'
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 45

// ─────────────────────────────────────────────────────────────────────────
// Registry de think tanks por bloque · URLs verificadas (workflow jun-2026)
// ─────────────────────────────────────────────────────────────────────────
type Bloque =
  | 'espana' | 'ue' | 'anglo' | 'china' | 'rusia'
  | 'india' | 'asia_pacifico' | 'latam' | 'global'

interface FeedDef {
  url: string
  nombre: string
  bloque: Bloque
  peso: number          // 0..1 · credibilidad/relevancia base para España
  verified: boolean     // confirmado en el workflow de verificación
  format?: 'rss' | 'atom' | 'auto'
}

const FEED_REGISTRY: Record<string, FeedDef> = {
  // ── España ──
  elcano:      { url: 'https://www.realinstitutoelcano.org/feed/',           nombre: 'Real Instituto Elcano', bloque: 'espana', peso: 0.85, verified: false },
  cidob:       { url: 'https://www.cidob.org/rss.xml',                       nombre: 'CIDOB Barcelona',       bloque: 'espana', peso: 0.85, verified: false },
  // ── Unión Europea ──
  ecfr:        { url: 'https://ecfr.eu/feed/',                               nombre: 'ECFR',                  bloque: 'ue', peso: 0.72, verified: true },
  euiss:       { url: 'https://www.iss.europa.eu/rss.xml',                   nombre: 'EUISS',                 bloque: 'ue', peso: 0.74, verified: true },
  bruegel:     { url: 'https://www.bruegel.org/rss.xml',                     nombre: 'Bruegel',               bloque: 'ue', peso: 0.68, verified: true },
  ispi:        { url: 'https://www.ispionline.it/feed/',                     nombre: 'ISPI',                  bloque: 'ue', peso: 0.70, verified: true },
  ifri:        { url: 'https://www.ifri.org/en/rss.xml',                     nombre: 'IFRI',                  bloque: 'ue', peso: 0.72, verified: true },
  swp:         { url: 'https://www.swp-berlin.org/en/rss.xml',               nombre: 'SWP Berlin',            bloque: 'ue', peso: 0.74, verified: true },
  clingendael: { url: 'https://www.clingendael.org/rss.xml',                 nombre: 'Clingendael',           bloque: 'ue', peso: 0.70, verified: true },
  // ── Anglosajón (EE.UU. / R.U.) ──
  brookings:   { url: 'https://www.brookings.edu/feed/atom/',                nombre: 'Brookings',             bloque: 'anglo', peso: 0.75, verified: false, format: 'atom' },
  cfr:         { url: 'https://www.cfr.org/feed',                            nombre: 'Council on Foreign Relations', bloque: 'anglo', peso: 0.76, verified: true },
  rand:        { url: 'https://www.rand.org/pubs/new.xml',                   nombre: 'RAND Corporation',      bloque: 'anglo', peso: 0.78, verified: true, format: 'atom' },
  atlantic_council: { url: 'https://www.atlanticcouncil.org/feed/',          nombre: 'Atlantic Council',      bloque: 'anglo', peso: 0.68, verified: true },
  rusi:        { url: 'https://rusi.org/rss/latest-publications.xml',        nombre: 'RUSI',                  bloque: 'anglo', peso: 0.72, verified: true },
  warontherocks: { url: 'https://warontherocks.com/feed/',                  nombre: 'War on the Rocks',      bloque: 'anglo', peso: 0.70, verified: true },
  fp:          { url: 'https://foreignpolicy.com/feed/',                     nombre: 'Foreign Policy',        bloque: 'anglo', peso: 0.65, verified: true },
  chatham_ia:  { url: 'https://medium.com/feed/international-affairs-blog',  nombre: 'Chatham House · International Affairs', bloque: 'anglo', peso: 0.66, verified: false },
  // ── China ──
  merics:      { url: 'https://merics.org/en/rss',                          nombre: 'MERICS',                bloque: 'china', peso: 0.74, verified: true },
  // ── Rusia ──
  valdai:      { url: 'https://valdaiclub.com/export/rss/feed.xml',         nombre: 'Valdai Club',           bloque: 'rusia', peso: 0.55, verified: true },
  // ── India / Sur Global ──
  gatewayhouse:{ url: 'https://www.gatewayhouse.in/feed/',                  nombre: 'Gateway House',         bloque: 'india', peso: 0.66, verified: true },
  // ── Asia-Pacífico ──
  lowy:        { url: 'https://www.lowyinstitute.org/the-interpreter/rss.xml', nombre: 'Lowy Institute',     bloque: 'asia_pacifico', peso: 0.70, verified: true },
  // ── Latinoamérica ──
  insight_crime: { url: 'https://insightcrime.org/feed/',                   nombre: 'InSight Crime',         bloque: 'latam', peso: 0.68, verified: true },
  // ── Multilateral / Global ──
  icg:         { url: 'https://www.crisisgroup.org/rss.xml',                nombre: 'International Crisis Group', bloque: 'global', peso: 0.80, verified: true },
  oies:        { url: 'https://www.oxfordenergy.org/publications/feed/',    nombre: 'OIES Oxford',           bloque: 'global', peso: 0.78, verified: true },
  mmc:         { url: 'https://mixedmigration.org/?feed=atom&post_type=resource', nombre: 'Mixed Migration Centre', bloque: 'global', peso: 0.72, verified: true, format: 'atom' },
  bellingcat:  { url: 'https://www.bellingcat.com/feed/',                   nombre: 'Bellingcat',            bloque: 'global', peso: 0.70, verified: true },
}

export const BLOQUE_LABEL: Record<Bloque, string> = {
  espana: 'España',
  ue: 'Unión Europea',
  anglo: 'Anglosajón (EE.UU./R.U.)',
  china: 'China',
  rusia: 'Rusia',
  india: 'India',
  asia_pacifico: 'Asia-Pacífico',
  latam: 'Latinoamérica',
  global: 'Multilateral / Global',
}

// ─────────────────────────────────────────────────────────────────────────
// Heurísticas de clasificación
// ─────────────────────────────────────────────────────────────────────────
const URGENCIA_5 = /\b(war|attack|killed|crisis|emergency|invasion|guerra|ataque|invasi[oó]n|muertos|massacre|coup|golpe de estado)\b/i
const URGENCIA_4 = /\b(conflict|escalation|sanctions|threat|explosion|conflicto|escalada|sanciones|amenaza|offensive|ofensiva|strike|bombing)\b/i
const URGENCIA_3 = /\b(tension|protest|dispute|warning|incident|tensi[oó]n|protesta|disputa|advertencia|standoff|unrest)\b/i
const URGENCIA_2 = /\b(concern|risk|instability|deterioration|preocupaci[oó]n|riesgo|inestabilidad|uncertainty|incertidumbre)\b/i

const ESP_BOOST = /\b(espa[nñ]a|spain|spanish|repsol|naturgy|iberdrola|indra|santander|bbva|inditex|telef[oó]nica|marruecos|morocco|argelia|algeria|sahel|gibraltar|canarias|melilla|ceuta|otan|nato)\b/i

// Países (código ISO2 aproximado → etiqueta + regex de detección ES+EN)
const PAISES: Array<{ code: string; label: string; rx: RegExp }> = [
  { code: 'MA', label: 'Marruecos', rx: /\b(morocco|marruecos|moroccan)\b/i },
  { code: 'DZ', label: 'Argelia', rx: /\b(algeria|argelia|algerian)\b/i },
  { code: 'UA', label: 'Ucrania', rx: /\b(ukraine|ucrania|ukrainian)\b/i },
  { code: 'RU', label: 'Rusia', rx: /\b(russia|rusia|russian|kremlin|putin)\b/i },
  { code: 'CN', label: 'China', rx: /\b(china|chinese|beijing|pek[ií]n|xi jinping)\b/i },
  { code: 'US', label: 'EE.UU.', rx: /\b(united states|u\.?s\.?a?\.?|estados unidos|washington|trump|biden)\b/i },
  { code: 'VE', label: 'Venezuela', rx: /\b(venezuela|venezuelan|maduro|caracas)\b/i },
  { code: 'IR', label: 'Irán', rx: /\b(iran|ir[aá]n|iranian|tehran|teher[aá]n)\b/i },
  { code: 'IL', label: 'Israel', rx: /\b(israel|israeli|netanyahu)\b/i },
  { code: 'PS', label: 'Palestina / Gaza', rx: /\b(palestin|gaza|hamas|cisjordania|west bank)\b/i },
  { code: 'TR', label: 'Turquía', rx: /\b(turkey|turqu[ií]a|turkish|erdogan|erdo[gğ]an)\b/i },
  { code: 'EG', label: 'Egipto', rx: /\b(egypt|egipto|egyptian|cairo|el cairo)\b/i },
  { code: 'LY', label: 'Libia', rx: /\b(libya|libia|libyan)\b/i },
  { code: 'SY', label: 'Siria', rx: /\b(syria|siria|syrian|damascus|damasco)\b/i },
  { code: 'LB', label: 'Líbano', rx: /\b(lebanon|l[ií]bano|lebanese|hezbollah|hizbol[aá])\b/i },
  { code: 'SD', label: 'Sahel / Mali / Níger', rx: /\b(sahel|mali|niger|n[ií]ger|burkina|chad|sudan|sud[aá]n)\b/i },
  { code: 'IN', label: 'India', rx: /\b(india|indian|nueva delhi|new delhi|modi)\b/i },
  { code: 'PK', label: 'Pakistán', rx: /\b(pakistan|paquist[aá]n|pakistani)\b/i },
  { code: 'KP', label: 'Corea del Norte', rx: /\b(north korea|corea del norte|pyongyang|kim jong)\b/i },
  { code: 'TW', label: 'Taiwán', rx: /\b(taiwan|taiw[aá]n|taipei|taip[eé]i)\b/i },
  { code: 'EU', label: 'Unión Europea', rx: /\b(european union|uni[oó]n europea|\beu\b|\bue\b|brussels|bruselas)\b/i },
  { code: 'GB', label: 'Reino Unido', rx: /\b(united kingdom|reino unido|britain|brexit|london|londres)\b/i },
  { code: 'FR', label: 'Francia', rx: /\b(france|francia|french|paris|par[ií]s|macron)\b/i },
  { code: 'DE', label: 'Alemania', rx: /\b(germany|alemania|german|berlin|berl[ií]n)\b/i },
  { code: 'ES', label: 'España', rx: /\b(spain|espa[nñ]a|spanish)\b/i },
]

// Temas (categorías del selector) → etiqueta + regex
const TEMAS: Array<{ key: string; label: string; rx: RegExp }> = [
  { key: 'conflicto_armado', label: 'Conflicto armado', rx: /\b(war|conflict|attack|military|troops|guerra|conflicto|combate|offensive|insurgen)\b/i },
  { key: 'defensa', label: 'Defensa y seguridad', rx: /\b(nato|otan|defen[cs]e|defensa|deterrence|disuasi[oó]n|rearm|missile|misil|navy|armada)\b/i },
  { key: 'energia', label: 'Energía', rx: /\b(gas|oil|petr[oó]leo|pipeline|gasoducto|lng|gnl|energy|energ[ií]a|nuclear|renewable|renovable)\b/i },
  { key: 'economia', label: 'Economía y comercio', rx: /\b(trade|comercio|tariff|arancel|gdp|pib|inflation|inflaci[oó]n|sanctions|sanciones|investment|inversi[oó]n|debt|deuda)\b/i },
  { key: 'migracion', label: 'Migración', rx: /\b(migration|migraci[oó]n|refugee|refugiado|asylum|asilo|border|frontera)\b/i },
  { key: 'diplomacia', label: 'Diplomacia', rx: /\b(diplomat|diplomac|embassy|embajada|bilateral|summit|cumbre|treaty|tratado|alliance|alianza)\b/i },
  { key: 'ciberseguridad', label: 'Ciberseguridad', rx: /\b(cyber|ciber|hack|ransomware|malware|apt\b|disinformation|desinformaci[oó]n)\b/i },
  { key: 'clima', label: 'Clima y medio ambiente', rx: /\b(climate|clima|carbon|emissions|emisiones|cop\d+|green transition|transici[oó]n verde)\b/i },
  { key: 'tecnologia', label: 'Tecnología', rx: /\b(\bai\b|artificial intelligence|inteligencia artificial|semiconductor|chip|tech|tecnolog[ií]a|quantum|cu[aá]ntic|biotech|space|espacial)\b/i },
  { key: 'crimen_organizado', label: 'Crimen organizado', rx: /\b(drug|narco|trafficking|tr[aá]fico|cartel|organized crime|crimen organizado|smuggling|contrabando)\b/i },
  { key: 'gobernanza', label: 'Gobernanza y democracia', rx: /\b(election|elecci[oó]n|democracy|democracia|authoritarian|autoritari|governance|gobernanza|coup|golpe)\b/i },
]

// ─────────────────────────────────────────────────────────────────────────
// Fetch con cabeceras de navegador (clave para evitar 403 anti-bot)
// ─────────────────────────────────────────────────────────────────────────
const MAX_FEED_BYTES = 3 * 1024 * 1024 // ~3 MB · tope por feed

// `deadline` (timestamp absoluto) se comparte a través de las redirecciones para
// que TODA la cadena de saltos quede acotada a ~timeoutMs reales, en vez de
// reiniciar el timeout en cada salto (evita que un feed lento agote maxDuration
// y tumbe el endpoint con un 504 antes del fallback).
function fetchFeed(url: string, timeoutMs = 7000, redirects = 0, deadline = Date.now() + timeoutMs): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirects > 4) { reject(new Error('too many redirects')); return }
    const remaining = deadline - Date.now()
    if (remaining <= 0) { reject(new Error('deadline')); return }

    const lib = url.startsWith('https') ? https : http
    let settled = false
    let req: ReturnType<typeof lib.get>
    const timer = setTimeout(() => { if (settled) return; settled = true; req?.destroy(); reject(new Error('deadline')) }, remaining)
    const finish = (fn: () => void) => { if (settled) return; settled = true; clearTimeout(timer); fn() }

    req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    }, (res) => {
      const status = res.statusCode ?? 0
      if ((status === 301 || status === 302 || status === 307 || status === 308) && res.headers.location) {
        const next = new URL(res.headers.location, url).toString()
        res.resume()
        // mismo deadline → la cadena entera respeta el presupuesto de tiempo
        finish(() => resolve(fetchFeed(next, timeoutMs, redirects + 1, deadline)))
        return
      }
      if (status >= 400) { res.resume(); finish(() => reject(new Error(`HTTP ${status}`))); return }
      const chunks: Buffer[] = []
      let received = 0
      res.on('data', (c: Buffer) => {
        received += c.length
        if (received > MAX_FEED_BYTES) { req.destroy(); finish(() => reject(new Error('feed too large'))); return }
        chunks.push(c)
      })
      res.on('end', () => finish(() => resolve(Buffer.concat(chunks).toString('utf8'))))
      res.on('error', (e) => finish(() => reject(e)))
    })
    req.on('error', (e) => finish(() => reject(e)))
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Parser RSS <item> + Atom <entry>
// ─────────────────────────────────────────────────────────────────────────
export interface ThinkTankItem {
  id: string
  titulo: string
  fuente: string
  fuente_key: string
  bloque: Bloque
  bloque_label: string
  fecha: string
  url: string
  resumen: string
  urgencia: number
  relevancia_espana: number
  paises_detectados: string[]   // labels
  temas_detectados: string[]    // keys
  sector: SectorKey             // sector mapeado desde los temas
  sector_label: string
}

function pick(block: string, tag: string): string | null {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'))
  if (cdata) return cdata[1].trim()
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return plain ? plain[1].trim() : null
}

function safeFromCodePoint(n: number): string {
  try { return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '' } catch { return '' }
}

// Decodifica entidades HTML: numéricas (&#8216; &#x2019;) + nombradas comunes.
// Necesario porque varios feeds (Bellingcat…) traen comillas/guiones como entidades.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeFromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&(?:#39|apos|lsquo|rsquo);/gi, "'")
    .replace(/&(?:mdash);/gi, '—')
    .replace(/&(?:ndash);/gi, '–')
    .replace(/&(?:hellip);/gi, '…')
}

function stripHtml(s: string): string {
  // 1) quita tags · 2) decodifica entidades (después, para no recrear tags) · 3) colapsa espacios
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function hashId(s: string): string {
  // hash determinista corto (base36) · estable entre llamadas
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0 }
  return (h >>> 0).toString(36)
}

function parseFeed(xml: string, key: string, def: FeedDef, maxItems = 8): ThinkTankItem[] {
  const out: ThinkTankItem[] = []
  // Detecta RSS <item> o Atom <entry>. Respeta def.format si está declarado
  // (brookings/rand/mmc = 'atom'); el heurístico solo decide en modo 'auto'.
  const isAtom = def.format === 'atom'
    || (def.format !== 'rss' && /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml))
  const blockRe = isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi
  const blocks = xml.match(blockRe) ?? []

  for (const block of blocks.slice(0, maxItems)) {
    const titulo = stripHtml(pick(block, 'title') ?? '')
    if (!titulo) continue

    // Link: Atom puede tener varios <link rel=...>; preferimos rel="alternate"
    // (o sin rel apuntando a http) y descartamos edit/self/enclosure/replies.
    // RSS usa <link>url</link>. Cubre ambos órdenes (href antes/después de rel).
    let url = ''
    const linkTags = [...block.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
    const hrefOf = (l: string) => l.match(/href=["']([^"']+)["']/i)?.[1]?.trim() || ''
    const relOf = (l: string) => l.match(/rel=["']?([a-z]+)["']?/i)?.[1]?.toLowerCase() || ''
    const skipRel = new Set(['edit', 'self', 'replies', 'enclosure', 'first', 'last', 'next', 'prev', 'hub', 'via'])
    const alternate = linkTags.find((l) => relOf(l) === 'alternate' && hrefOf(l))
    const noRel = linkTags.find((l) => !relOf(l) && /^https?:/i.test(hrefOf(l)))
    const anyOk = linkTags.find((l) => !skipRel.has(relOf(l)) && hrefOf(l))
    url = hrefOf(alternate || noRel || anyOk || '')
    if (!url) {
      const rssLink = block.match(/<link>([\s\S]*?)<\/link>/i)
      if (rssLink) url = rssLink[1].trim()
    }

    const rawDate = pick(block, 'pubDate') || pick(block, 'published') || pick(block, 'updated') || pick(block, 'dc:date')
    let fecha: string
    try { fecha = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString() }
    catch { fecha = new Date().toISOString() }

    // content:encoded (RSS WordPress) antes del content genérico Atom.
    const rawSummary = pick(block, 'description') || pick(block, 'summary')
      || pick(block, 'content:encoded') || pick(block, 'content') || ''
    const resumen = stripHtml(rawSummary).slice(0, 400)

    const text = `${titulo} ${resumen}`
    const urgencia = URGENCIA_5.test(text) ? 5 : URGENCIA_4.test(text) ? 4 : URGENCIA_3.test(text) ? 3 : URGENCIA_2.test(text) ? 2 : 1
    const espBoost = ESP_BOOST.test(text) ? 0.2 : 0
    const relevancia_espana = Math.min(1, def.peso + espBoost)

    const paises_detectados = PAISES.filter((p) => p.rx.test(text)).map((p) => p.label)
    const temas_detectados = TEMAS.filter((t) => t.rx.test(text)).map((t) => t.key)
    const sector = sectorFromTemas(temas_detectados)

    out.push({
      id: `${key}:${hashId(url || titulo)}`,
      titulo: titulo.slice(0, 220),
      fuente: def.nombre,
      fuente_key: key,
      bloque: def.bloque,
      bloque_label: BLOQUE_LABEL[def.bloque],
      fecha,
      url,
      resumen,
      urgencia,
      relevancia_espana,
      paises_detectados,
      temas_detectados,
      sector,
      sector_label: SECTOR_LABELS[sector],
    })
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Facets
// ─────────────────────────────────────────────────────────────────────────
function buildFacets(items: ThinkTankItem[]) {
  const bloqueCount = new Map<Bloque, number>()
  const temaCount = new Map<string, number>()
  const paisCount = new Map<string, number>()
  const sectorCount = new Map<SectorKey, number>()
  for (const it of items) {
    bloqueCount.set(it.bloque, (bloqueCount.get(it.bloque) ?? 0) + 1)
    sectorCount.set(it.sector, (sectorCount.get(it.sector) ?? 0) + 1)
    for (const t of new Set(it.temas_detectados)) temaCount.set(t, (temaCount.get(t) ?? 0) + 1)
    for (const p of new Set(it.paises_detectados)) paisCount.set(p, (paisCount.get(p) ?? 0) + 1)
  }
  const temaLabel = Object.fromEntries(TEMAS.map((t) => [t.key, t.label]))
  return {
    bloques: Array.from(bloqueCount.entries())
      .map(([key, count]) => ({ key, label: BLOQUE_LABEL[key], count }))
      .sort((a, b) => b.count - a.count),
    temas: Array.from(temaCount.entries())
      .map(([key, count]) => ({ key, label: temaLabel[key] ?? key, count }))
      .sort((a, b) => b.count - a.count),
    paises: Array.from(paisCount.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    sectores: Array.from(sectorCount.entries())
      .map(([key, count]) => ({ key, label: SECTOR_LABELS[key], count }))
      .sort((a, b) => b.count - a.count),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────
export async function GET() {
  const generated_at = new Date().toISOString()
  const entries = Object.entries(FEED_REGISTRY)

  const settled = await Promise.allSettled(
    entries.map(async ([key, def]) => {
      const xml = await fetchFeed(def.url, 7000)
      return parseFeed(xml, key, def)
    }),
  )

  const all: ThinkTankItem[] = []
  let feedsOk = 0
  const failed: string[] = []
  settled.forEach((r, i) => {
    const key = entries[i][0]
    if (r.status === 'fulfilled' && r.value.length > 0) { feedsOk++; all.push(...r.value) }
    else failed.push(key)
  })

  // Descarta artículos con fecha futura imposible o anteriores a ~18 meses
  const now = Date.now()
  const minTs = now - 540 * 24 * 3600 * 1000
  const fresh = all.filter((it) => {
    const t = new Date(it.fecha).getTime()
    return Number.isFinite(t) && t <= now + 24 * 3600 * 1000 && t >= minTs
  })

  // Dedupe por id Y por URL canónica (host+path) · evita republicaciones cross-feed
  const seen = new Set<string>()
  const seenUrl = new Set<string>()
  const canonUrl = (u: string) => { try { const x = new URL(u); return (x.host + x.pathname).toLowerCase().replace(/\/$/, '') } catch { return '' } }
  const deduped = fresh.filter((it) => {
    if (seen.has(it.id)) return false
    const cu = canonUrl(it.url)
    if (cu && seenUrl.has(cu)) return false
    seen.add(it.id)
    if (cu) seenUrl.add(cu)
    return true
  })

  // Orden: urgencia DESC, relevancia España DESC, fecha DESC
  deduped.sort((a, b) => {
    if (b.urgencia !== a.urgencia) return b.urgencia - a.urgencia
    if (b.relevancia_espana !== a.relevancia_espana) return b.relevancia_espana - a.relevancia_espana
    return b.fecha.localeCompare(a.fecha)
  })

  const items = deduped.slice(0, 120)
  const facets = buildFacets(items)
  const warnings: string[] = []
  if (failed.length) warnings.push(`${failed.length}/${entries.length} feeds sin respuesta: ${failed.join(', ')}`)
  if (items.length === 0) warnings.push('Sin artículos · todos los feeds fallaron o devolvieron vacío.')

  // DataSource-compatible (lib/api/types) · 'live' = feeds RSS reales, 'mock' = fallback
  const source: 'live' | 'mock' = items.length > 0 ? 'live' : 'mock'
  const body = {
    items,
    facets,
    source,
    generated_at,
    feeds_ok: feedsOk,
    feeds_total: entries.length,
    warnings,
    // _meta · convención de la casa · useApi lee source/ts/warnings de aquí
    // (así el badge de frescura usa generated_at del servidor, no la hora de fetch).
    _meta: { source, ts: generated_at, warnings },
  }

  // Si TODO falló, devolvemos un mock mínimo para que el tablón no quede vacío.
  if (items.length === 0) {
    const mock = MOCK_ITEMS()
    return NextResponse.json(
      { ...body, items: mock, facets: buildFacets(mock), source: 'mock', _meta: { source: 'mock', ts: generated_at, warnings } },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    )
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' },
  })
}

// Fallback estático (solo si TODOS los feeds fallan) · marcado claramente como mock.
function MOCK_ITEMS(): ThinkTankItem[] {
  const mk = (
    key: string, nombre: string, bloque: Bloque, titulo: string, resumen: string,
    urgencia: number, temas: string[], paises: string[], hoursAgo: number,
  ): ThinkTankItem => ({
    id: `mock:${hashId(key + titulo)}`,
    titulo, fuente: nombre, fuente_key: key, bloque, bloque_label: BLOQUE_LABEL[bloque],
    fecha: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    url: '#', resumen, urgencia, relevancia_espana: 0.7,
    paises_detectados: paises, temas_detectados: temas,
    sector: sectorFromTemas(temas), sector_label: SECTOR_LABELS[sectorFromTemas(temas)],
  })
  return [
    mk('elcano', 'Real Instituto Elcano', 'espana', 'España ante la escalada en el Sahel', 'El deterioro de la seguridad en Mali y Níger plantea retos a la presencia española y a los flujos migratorios.', 4, ['conflicto_armado', 'migracion', 'defensa'], ['Sahel / Mali / Níger', 'Marruecos'], 3),
    mk('icg', 'International Crisis Group', 'global', 'CrisisWatch: focos de conflicto del mes', 'Resumen mensual de los conflictos activos y alertas tempranas en todo el mundo.', 3, ['conflicto_armado', 'diplomacia'], ['Ucrania'], 6),
    mk('merics', 'MERICS', 'china', 'China y la competencia tecnológica con Europa', 'Análisis del avance chino en semiconductores e interfaces cerebro-computadora y sus implicaciones para la UE.', 2, ['tecnologia', 'economia'], ['China', 'Unión Europea'], 9),
  ]
}
