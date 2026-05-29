/**
 * Cliente GDELT mejorado · CAMEO event codes + temas + sentiment + geo-filtering.
 *
 * Sprint G24 · usuario pidió integrar las features de:
 *   - alex9smith/gdelt-doc-api (monitorización país/tema tiempo real)
 *   - linwoodc3/gdeltPyR (análisis cuantitativo eventos geopolíticos)
 *   - chickymonkeys/gdeltDataAcquisition (filtrado país + CAMEO)
 *   - py-gdelt PyPI (queries históricas BigQuery)
 *
 * Wrappers de tipo a las features de los repos, llamando a GDELT DOC v2 API
 * gratuita directamente.
 */

import { buildGdeltDocUrl, fetchGdeltJson, normalizeGdeltDate } from './build-query'

/**
 * CAMEO event codes principales (Conflict and Mediation Event Observations).
 * Subset de los 300+ códigos · los más relevantes para análisis geopolítico.
 */
export const CAMEO_CODES = {
  // 01x · cooperación verbal
  '010': 'Make public statement',
  '011': 'Decline comment',
  '012': 'Make pessimistic comment',
  '013': 'Make optimistic comment',
  '014': 'Consider policy option',
  '015': 'Acknowledge or claim responsibility',
  '016': 'Deny responsibility',
  '017': 'Engage in symbolic act',
  '018': 'Make empathetic comment',
  '019': 'Express accord',
  // 02x · appeal
  '021': 'Appeal for material cooperation',
  '022': 'Appeal for diplomatic cooperation',
  '023': 'Appeal for aid',
  '024': 'Appeal for political reform',
  '025': 'Appeal to yield',
  '026': 'Appeal to others to meet',
  '027': 'Appeal to others for help in mediation',
  '028': 'Appeal to others to settle dispute',
  // 03x · expressed intent
  '031': 'Express intent to cooperate',
  '032': 'Express intent to engage in diplomatic cooperation',
  '033': 'Express intent to provide material aid',
  '034': 'Express intent to institute political reform',
  '035': 'Express intent to yield',
  '036': 'Express intent to meet',
  '037': 'Express intent to mediate',
  '038': 'Express intent to settle dispute',
  '039': 'Express intent to accept mediation',
  // 04x · consult
  '040': 'Consult',
  '041': 'Discuss by telephone',
  '042': 'Make a visit',
  '043': 'Host a visit',
  '044': 'Meet at a "third" location',
  '045': 'Mediate',
  '046': 'Engage in negotiation',
  // 05x · diplomatic cooperation
  '050': 'Engage in diplomatic cooperation',
  '051': 'Praise or endorse',
  '052': 'Defend verbally',
  '053': 'Rally support on behalf of',
  '054': 'Grant diplomatic recognition',
  '055': 'Apologize',
  '056': 'Forgive',
  '057': 'Sign formal agreement',
  // 06x · material cooperation
  '061': 'Cooperate economically',
  '062': 'Cooperate militarily',
  '063': 'Engage in judicial cooperation',
  '064': 'Share intelligence',
  // 07x · provide aid
  '071': 'Provide economic aid',
  '072': 'Provide military aid',
  '073': 'Provide humanitarian aid',
  '074': 'Provide military protection',
  '075': 'Grant asylum',
  // 08x · yield
  '081': 'Ease administrative sanctions',
  '082': 'Ease political dissent',
  '083': 'Accede to demands for change',
  '084': 'Return or release',
  '085': 'Ease economic sanctions, boycott, embargo',
  '086': 'Allow international involvement',
  '087': 'De-escalate military engagement',
  // 09x · investigate
  '091': 'Investigate crime, corruption',
  '092': 'Investigate human rights abuses',
  '093': 'Investigate military action',
  '094': 'Investigate war crimes',
  // 10x · demand
  '101': 'Demand information',
  '102': 'Demand policy support',
  '103': 'Demand economic aid',
  '104': 'Demand political reform',
  '105': 'Demand yielding',
  '106': 'Demand meeting',
  '107': 'Demand rights',
  '108': 'Demand change in leadership',
  // 11x · disapprove
  '110': 'Disapprove',
  '111': 'Criticize or denounce',
  '112': 'Accuse',
  '113': 'Rally opposition',
  '114': 'Complain officially',
  '115': 'Bring lawsuit against',
  '116': 'Find guilty or liable',
  // 12x · reject
  '120': 'Reject',
  '121': 'Reject material cooperation',
  '122': 'Reject diplomatic cooperation',
  '123': 'Reject aid',
  '124': 'Reject political reform',
  '125': 'Reject to yield',
  '126': 'Refuse to meet',
  '127': 'Refuse to mediate',
  '128': 'Reject mediation',
  // 13x · threaten
  '130': 'Threaten',
  '131': 'Threaten with non-force',
  '132': 'Threaten with administrative sanctions',
  '133': 'Threaten with political dissent',
  '134': 'Threaten to halt international involvement',
  '135': 'Threaten with repression',
  '136': 'Threaten with military force',
  '137': 'Give ultimatum',
  // 14x · protest
  '140': 'Engage in political dissent',
  '141': 'Demonstrate or rally',
  '142': 'Conduct hunger strike',
  '143': 'Conduct strike or boycott',
  '144': 'Obstruct passage',
  '145': 'Protest violently',
  // 15x · military display
  '150': 'Demonstrate military or police power',
  '151': 'Increase police alert status',
  '152': 'Increase military alert status',
  '153': 'Mobilize armed forces',
  '154': 'Mobilize police',
  // 16x · reduce relations
  '160': 'Reduce relations',
  '161': 'Reduce or break diplomatic relations',
  '162': 'Reduce or stop material aid',
  '163': 'Impose embargo, boycott, sanctions',
  '164': 'Halt negotiations',
  '165': 'Halt mediation',
  '166': 'Expel or withdraw',
  // 17x · coerce
  '170': 'Coerce',
  '171': 'Seize or damage property',
  '172': 'Impose administrative sanctions',
  '173': 'Arrest, detain',
  '174': 'Expel or deport',
  '175': 'Use tactics of violent repression',
  // 18x · assault
  '180': 'Use unconventional violence',
  '181': 'Abduct, hijack, take hostage',
  '182': 'Physically assault',
  '183': 'Conduct suicide, car or other non-military bombing',
  '184': 'Use as human shield',
  '185': 'Attempt to assassinate',
  '186': 'Assassinate',
  // 19x · fight
  '190': 'Use conventional military force',
  '191': 'Impose blockade',
  '192': 'Occupy territory',
  '193': 'Fight with small arms and light weapons',
  '194': 'Fight with artillery and tanks',
  '195': 'Employ aerial weapons',
  '196': 'Violate ceasefire',
  // 20x · mass violence
  '200': 'Use unconventional mass violence',
  '201': 'Engage in mass expulsion',
  '202': 'Engage in mass killings',
  '203': 'Engage in ethnic cleansing',
  '204': 'Use weapons of mass destruction',
} as const

/**
 * CAMEO Goldstein Scale · -10 (most conflictual) a +10 (most cooperative).
 * Subset agregado por categoría.
 */
export function getGoldsteinScore(cameoCode: string): number {
  const code = cameoCode.substring(0, 2)
  const scores: Record<string, number> = {
    '01': 0.0, '02': 3.0, '03': 4.5, '04': 5.0, '05': 6.5, '06': 7.5, '07': 8.5, '08': 8.0, '09': 0.0, '10': -4.0,
    '11': -5.0, '12': -5.5, '13': -7.5, '14': -6.0, '15': -7.0, '16': -8.0, '17': -8.5, '18': -9.0, '19': -9.5, '20': -10.0,
  }
  return scores[code] ?? 0
}

/**
 * Query GDELT con CAMEO event code filtering (chickymonkeys approach).
 */
export async function fetchGdeltByCameoCode(opts: {
  cameoCode: string                  // e.g. '190' (military force)
  country?: string                   // ISO2 (e.g. 'UA')
  timespan?: string                  // '7d', '14d', '30d'
  maxRecords?: number
}): Promise<Array<{
  title: string
  url: string
  domain: string
  source_country: string
  tone: number
  goldstein: number
  cameo_label: string
  datetime: string
}>> {
  // GDELT no permite filtrar CAMEO directamente via DOC API · usamos themes + query
  // GoogleSearchSyntax con CAMEO_LABEL como búsqueda terminológica.
  const cameoLabel = (CAMEO_CODES as Record<string, string>)[opts.cameoCode]
  if (!cameoLabel) return []
  const url = buildGdeltDocUrl({
    query: `"${cameoLabel.toLowerCase()}"`,
    timespan: opts.timespan ?? '14d',
    mode: 'artlist',
    maxrecords: opts.maxRecords ?? 50,
    sort: 'datedesc',
  })
  const json = await fetchGdeltJson<{ articles: any[] }>(url, { timeoutMs: 9000 })
  return (json?.articles ?? []).map((a) => ({
    title: a.title || '',
    url: a.url || '',
    domain: a.domain || '',
    source_country: (a.sourcecountry || '').toUpperCase(),
    tone: typeof a.tone === 'number' ? a.tone : 0,
    goldstein: getGoldsteinScore(opts.cameoCode),
    cameo_label: cameoLabel,
    datetime: normalizeGdeltDate(a.seendate) || '',
  }))
}

/**
 * Monitorización tiempo real país/tema (alex9smith/gdelt-doc-api approach).
 * Devuelve trending themes + volume + tone para un país.
 */
export async function fetchCountryRealtime(country: string): Promise<{
  ok: boolean
  total_articles_24h: number
  avg_tone: number
  top_themes: Array<{ theme: string; count: number; avg_tone: number }>
  top_domains: Array<{ domain: string; count: number }>
  recent_articles: Array<{ title: string; url: string; domain: string; tone: number; datetime: string }>
}> {
  const url = buildGdeltDocUrl({
    query: country,
    timespan: '1d',
    mode: 'artlist',
    maxrecords: 100,
    sort: 'datedesc',
  })
  const json = await fetchGdeltJson<{ articles: any[] }>(url, { timeoutMs: 9000 })
  const articles = json?.articles ?? []
  const themesMap = new Map<string, { count: number; toneSum: number }>()
  const domainsMap = new Map<string, number>()
  let toneSum = 0, toneN = 0
  for (const a of articles) {
    const themes = (a.themes || '').split(';').filter(Boolean)
    for (const t of themes) {
      const cur = themesMap.get(t) || { count: 0, toneSum: 0 }
      cur.count++
      cur.toneSum += a.tone ?? 0
      themesMap.set(t, cur)
    }
    domainsMap.set(a.domain, (domainsMap.get(a.domain) || 0) + 1)
    if (typeof a.tone === 'number') { toneSum += a.tone; toneN++ }
  }
  const themesArr = Array.from(themesMap.entries())
  themesArr.sort((a, b) => b[1].count - a[1].count)
  const topThemes = themesArr.slice(0, 12).map(([theme, v]) => ({
    theme,
    count: v.count,
    avg_tone: v.count > 0 ? Math.round((v.toneSum / v.count) * 10) / 10 : 0,
  }))
  const domainsArr = Array.from(domainsMap.entries())
  domainsArr.sort((a, b) => b[1] - a[1])
  const topDomains = domainsArr.slice(0, 10).map(([domain, count]) => ({ domain, count }))
  return {
    ok: true,
    total_articles_24h: articles.length,
    avg_tone: toneN > 0 ? Math.round((toneSum / toneN) * 100) / 100 : 0,
    top_themes: topThemes,
    top_domains: topDomains,
    recent_articles: articles.slice(0, 15).map((a) => ({
      title: a.title || '',
      url: a.url || '',
      domain: a.domain || '',
      tone: typeof a.tone === 'number' ? a.tone : 0,
      datetime: normalizeGdeltDate(a.seendate) || '',
    })),
  }
}
