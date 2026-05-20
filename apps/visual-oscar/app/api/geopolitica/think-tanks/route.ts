import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import https from 'https'
import http from 'http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FEED_REGISTRY: Record<string, { url: string; nombre: string; tag: string; peso: number }> = {
  elcano: { url: 'https://www.realinstitutoelcano.org/feed/', nombre: 'Real Instituto Elcano', tag: 'think_tank_es', peso: 0.85 },
  cidob: { url: 'https://www.cidob.org/rss/publicaciones', nombre: 'CIDOB Barcelona', tag: 'think_tank_es', peso: 0.85 },
  ecfr: { url: 'https://ecfr.eu/feed/', nombre: 'ECFR', tag: 'think_tank_eu', peso: 0.70 },
  euiss: { url: 'https://www.iss.europa.eu/rss.xml', nombre: 'EUISS', tag: 'think_tank_eu', peso: 0.72 },
  bruegel: { url: 'https://www.bruegel.org/rss.xml', nombre: 'Bruegel', tag: 'think_tank_eu', peso: 0.65 },
  atlantic_council: { url: 'https://www.atlanticcouncil.org/feed/', nombre: 'Atlantic Council', tag: 'think_tank_us', peso: 0.68 },
  rusi: { url: 'https://rusi.org/rss.xml', nombre: 'RUSI', tag: 'think_tank_uk', peso: 0.72 },
  chatham: { url: 'https://www.chathamhouse.org/rss.xml', nombre: 'Chatham House', tag: 'think_tank_uk', peso: 0.68 },
  warontherocks: { url: 'https://warontherocks.com/feed/', nombre: 'War on the Rocks', tag: 'defensa_estrategia', peso: 0.70 },
  icg: { url: 'https://www.crisisgroup.org/rss.xml', nombre: 'ICG Crisis Group', tag: 'alerta_temprana', peso: 0.80 },
  oies: { url: 'https://www.oxfordenergy.org/feed/', nombre: 'OIES Oxford', tag: 'energia_geo', peso: 0.78 },
  ispi: { url: 'https://www.ispionline.it/en/rss.xml', nombre: 'ISPI', tag: 'mediterraneo', peso: 0.72 },
  mmc: { url: 'https://mixedmigration.org/feed/', nombre: 'Mixed Migration Centre', tag: 'migracion', peso: 0.75 },
  insight_crime: { url: 'https://insightcrime.org/feed/', nombre: 'InSight Crime', tag: 'latam_geo', peso: 0.68 },
  bellingcat: { url: 'https://www.bellingcat.com/feed/', nombre: 'Bellingcat', tag: 'osint_verificacion', peso: 0.70 },
  fp: { url: 'https://foreignpolicy.com/feed/', nombre: 'Foreign Policy', tag: 'media_nicho', peso: 0.65 },
}

// Urgencia keywords
const URGENCIA_5 = /war|attack|killed|crisis|emergency|invasion|guerra|ataque|invasión|muertos/i
const URGENCIA_4 = /conflict|escalation|sanctions|threat|explosion|conflicto|escalada|sanciones|amenaza/i
const URGENCIA_3 = /tension|protest|dispute|warning|incident|tensión|protesta|disputa|advertencia/i
const URGENCIA_2 = /concern|risk|instability|deterioration|preocupación|riesgo|inestabilidad/i

// Spain relevance boost keywords
const ESP_BOOST = /españa|spain|spanish|repsol|naturgy|iberdrola|indra|santander|bbva|inditex|marruecos|argelia|venezuela|ucrania|sahel|otan|nato/i
const PAISES_INTERES = /marruecos|argelia|ucrania|venezuela|irán|china|rusia|turquía|egipto|libia|mali|níger|líbano|israel/i

function fetchUrl(url: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, {
      headers: {
 'User-Agent': 'Politeia/1.0 (intelligence platform; contact@politeia.es)',
 'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location
        if (loc) { resolve(fetchUrl(loc, timeoutMs)); return }
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
  })
}

interface ThinkTankItem {
  id: string; titulo: string; fuente: string; fuente_tipo: string; fecha: string
  url: string; resumen: string; urgencia: number; relevancia_espana: number
  paises_detectados: string[]; temas_detectados: string[]
}

function parseItems(xml: string, feedId: string, meta: typeof FEED_REGISTRY[string]): ThinkTankItem[] {
  const items: ThinkTankItem[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  let i = 0
  while ((m = itemRe.exec(xml)) !== null && i < 6) {
    const block = m[1]
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1]?.trim() ?? ''
    if (!title) continue
    const link = (block.match(/<link>(https?[^<]+)<\/link>/) || block.match(/<link[^>]*href="([^"]+)"/))?.[1]?.trim() ?? ''
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]?.trim() ?? ''
    const descRaw = (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || block.match(/<description>([\s\S]*?)<\/description>/))?.[1] ?? ''
    const resumen = descRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)

    const text = `${title} ${resumen}`
    const urgencia = URGENCIA_5.test(text) ? 5 : URGENCIA_4.test(text) ? 4 : URGENCIA_3.test(text) ? 3 : URGENCIA_2.test(text) ? 2 : 1
    const relevanciaBase = meta.peso
    const relevanciaBoost = ESP_BOOST.test(text) ? 0.2 : 0
    const paisesBoost = PAISES_INTERES.test(text) ? 0.15 : 0
    const relevancia_espana = Math.min(1, relevanciaBase + relevanciaBoost + paisesBoost)

    // Detect paises mentioned
    const paisesMap: Record<string, string> = {
      Marruecos: 'MA', Morocco: 'MA', Argelia: 'DZ', Algeria: 'DZ',
      Ucrania: 'UA', Ukraine: 'UA', Venezuela: 'VE', Iran: 'IR',
      China: 'CN', Russia: 'RU', Rusia: 'RU', Libya: 'LY', Libia: 'LY',
      Mali: 'ML', Niger: 'NE', Lebanon: 'LB', Israel: 'IL',
      Syria: 'SY', Siria: 'SY', Turkey: 'TR', Egypt: 'EG',
    }
    const paises_detectados = Object.keys(paisesMap).filter(p => new RegExp(p, 'i').test(text))

    // Detect themes
    const TEMAS: Record<string, RegExp> = {
      conflicto_armado: /war|conflict|attack|military|troops|guerra|conflicto/i,
      energia: /gas|oil|pipeline|LNG|energy|energía/i,
      migracion: /migration|refugee|asylum|border|migración|refugiado/i,
      diplomacia: /diplomatic|embassy|bilateral|summit|treaty|diplomacia/i,
      ciberseguridad: /cyber|hack|ransomware|APT|malware/i,
      economia_politica: /sanctions|trade|tariff|GDP|inflation|sanciones/i,
      defensa: /NATO|OTAN|defense|military|troops|exercise/i,
    }
    const temas_detectados = Object.entries(TEMAS).filter(([, re]) => re.test(text)).map(([t]) => t)

    const id = Buffer.from(`${feedId}:${link || title}`).toString('base64').slice(0, 16)

    let fecha: string
    try { fecha = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() }
    catch { fecha = new Date().toISOString() }

    items.push({
      id,
      titulo: title.slice(0, 200),
      fuente: meta.nombre,
      fuente_tipo: meta.tag,
      fecha,
      url: link,
      resumen: resumen.slice(0, 400),
      urgencia,
      relevancia_espana,
      paises_detectados,
      temas_detectados,
    })
    i++
  }
  return items
}

export async function GET() {
  // Try backend first
  const real = await fromBackend<{ items: ThinkTankItem[] }>('/api/geopolitica/think-tanks')
  if (real?.items?.length) return NextResponse.json(withMeta({ data: real.items }, 'backend'))

  // Fetch feeds in parallel with Promise.allSettled
  const results = await Promise.allSettled(
    Object.entries(FEED_REGISTRY).map(async ([feedId, meta]) => {
      const xml = await fetchUrl(meta.url, 7000)
      return parseItems(xml, feedId, meta)
    })
  )

  const allItems: ThinkTankItem[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value)
  }

  // Sort by urgencia DESC, relevancia DESC, fecha DESC
  allItems.sort((a, b) => {
    if (b.urgencia !== a.urgencia) return b.urgencia - a.urgencia
    if (b.relevancia_espana !== a.relevancia_espana) return b.relevancia_espana - a.relevancia_espana
    return b.fecha.localeCompare(a.fecha)
  })

  // Deduplicate by id
  const seen = new Set<string>()
  const deduped = allItems.filter(it => { if (seen.has(it.id)) return false; seen.add(it.id); return true })

  if (deduped.length > 0) {
    return NextResponse.json(withMeta({ data: deduped.slice(0, 60) }, 'mock'))
  }

  // Fallback: rich static mock (25 items from named sources)
  const mock = { data: [
    { id: 'm1', titulo: 'España ante la escalada en el Sahel: implicaciones para la política de seguridad', fuente: 'Real Instituto Elcano', fuente_tipo: 'think_tank_es', fecha: new Date(Date.now()-3600000).toISOString(), url: 'https://www.realinstitutoelcano.org', resumen: 'El deterioro de la seguridad en Mali y Níger plantea retos directos a la presencia militar española en la región y a los flujos migratorios hacia Canarias.', urgencia: 4, relevancia_espana: 0.9, paises_detectados: ['Mali', 'Niger'], temas_detectados: ['conflicto_armado', 'migracion', 'defensa'] },
    { id: 'm2', titulo: 'Energy security in the Western Mediterranean: Spain\'s strategic position', fuente: 'OIES Oxford', fuente_tipo: 'energia_geo', fecha: new Date(Date.now()-7200000).toISOString(), url: 'https://www.oxfordenergy.org', resumen: 'Spain\'s dependence on Algerian gas through the Medgaz pipeline creates strategic vulnerabilities that require immediate diversification plans.', urgencia: 3, relevancia_espana: 0.88, paises_detectados: ['Argelia'], temas_detectados: ['energia'] },
    { id: 'm3', titulo: 'Crise migratoire en Méditerranée occidentale: nouvelles dynamiques 2026', fuente: 'Mixed Migration Centre', fuente_tipo: 'migracion', fecha: new Date(Date.now()-10800000).toISOString(), url: 'https://mixedmigration.org', resumen: 'Record arrivals to the Canary Islands in Q1 2026, driven by instability across the Sahel and increasing push factors from West African countries.', urgencia: 4, relevancia_espana: 0.92, paises_detectados: ['Marruecos', 'Mali', 'Niger'], temas_detectados: ['migracion'] },
    { id: 'm4', titulo: 'European security architecture after Ukraine: NATO\'s southern flank', fuente: 'RUSI', fuente_tipo: 'think_tank_uk', fecha: new Date(Date.now()-14400000).toISOString(), url: 'https://rusi.org', resumen: 'Spain\'s NATO commitments in the southern flank are being tested. The Rota naval base plays a critical role in Atlantic defense posture.', urgencia: 3, relevancia_espana: 0.82, paises_detectados: ['Ucrania'], temas_detectados: ['defensa'] },
    { id: 'm5', titulo: 'Venezuela: crisis humanitaria y diáspora — impacto en España', fuente: 'CIDOB Barcelona', fuente_tipo: 'think_tank_es', fecha: new Date(Date.now()-18000000).toISOString(), url: 'https://www.cidob.org', resumen: 'El flujo de venezolanos hacia España supera 600.000 personas. Las remesas y la integración laboral crean nuevas dimensiones de la relación bilateral.', urgencia: 2, relevancia_espana: 0.87, paises_detectados: ['Venezuela'], temas_detectados: ['migracion', 'diplomatica'] },
    { id: 'm6', titulo: 'Morocco\'s military modernization: implications for Spain', fuente: 'ICG Crisis Group', fuente_tipo: 'alerta_temprana', fecha: new Date(Date.now()-21600000).toISOString(), url: 'https://www.crisisgroup.org', resumen: 'Morocco\'s arms procurement, including drones and advanced air defense systems, reshapes the balance of power in the Strait of Gibraltar.', urgencia: 3, relevancia_espana: 0.88, paises_detectados: ['Marruecos'], temas_detectados: ['defensa', 'diplomatica'] },
    { id: 'm7', titulo: 'Gas de Argelia: ¿puede España prescindir del gasoducto Medgaz?', fuente: 'Real Instituto Elcano', fuente_tipo: 'think_tank_es', fecha: new Date(Date.now()-25200000).toISOString(), url: 'https://www.realinstitutoelcano.org', resumen: 'Análisis de alternativas ante el riesgo de interrupción del suministro argelino, incluyendo GNL desde Qatar, Nigeria y EE.UU.', urgencia: 3, relevancia_espana: 0.95, paises_detectados: ['Argelia'], temas_detectados: ['energia'] },
    { id: 'm8', titulo: 'The Sahel crisis and European migration pressure', fuente: 'ECFR', fuente_tipo: 'think_tank_eu', fecha: new Date(Date.now()-28800000).toISOString(), url: 'https://ecfr.eu', resumen: 'European security frameworks in the Sahel are collapsing. France\'s withdrawal from Mali and Niger has created a power vacuum that Russia\'s Wagner group is filling.', urgencia: 4, relevancia_espana: 0.78, paises_detectados: ['Mali', 'Niger'], temas_detectados: ['conflicto_armado', 'migracion'] },
    { id: 'm9', titulo: 'Cyberattacks on European critical infrastructure: Spain\'s exposure', fuente: 'EUISS', fuente_tipo: 'think_tank_eu', fecha: new Date(Date.now()-32400000).toISOString(), url: 'https://www.iss.europa.eu', resumen: 'Spanish energy, water, and financial infrastructure face increasing targeting by state-linked threat actors. CCN-CERT reports 40% increase in sophisticated attacks.', urgencia: 4, relevancia_espana: 0.85, paises_detectados: ['Rusia', 'China'], temas_detectados: ['ciberseguridad'] },
    { id: 'm10', titulo: 'La OTAN en el Mediterráneo: España como pivote sur', fuente: 'CIDOB Barcelona', fuente_tipo: 'think_tank_es', fecha: new Date(Date.now()-36000000).toISOString(), url: 'https://www.cidob.org', resumen: 'El papel de España como puente entre el Mediterráneo occidental y el Atlántico cobra nueva relevancia estratégica en el contexto del reposicionamiento de la OTAN.', urgencia: 2, relevancia_espana: 0.88, paises_detectados: ['Marruecos'], temas_detectados: ['defensa', 'diplomatica'] },
    { id: 'm11', titulo: 'Drug trafficking networks and state fragility in the Western Mediterranean', fuente: 'InSight Crime', fuente_tipo: 'latam_geo', fecha: new Date(Date.now()-39600000).toISOString(), url: 'https://insightcrime.org', resumen: 'Cocaine flows through Spain from Latin America are increasing, with criminal organizations exploiting weaknesses in port security at Algeciras and Valencia.', urgencia: 3, relevancia_espana: 0.80, paises_detectados: ['Venezuela', 'Marruecos'], temas_detectados: ['crimen_organizado'] },
    { id: 'm12', titulo: 'Israel-Iran tensions: implications for Mediterranean energy routes', fuente: 'RUSI', fuente_tipo: 'think_tank_uk', fecha: new Date(Date.now()-43200000).toISOString(), url: 'https://rusi.org', resumen: 'Escalation between Israel and Iran threatens to disrupt maritime energy routes through the Strait of Hormuz, with direct impacts on LNG imports to Spain.', urgencia: 4, relevancia_espana: 0.78, paises_detectados: ['Israel'], temas_detectados: ['conflicto_armado', 'energia'] },
  ] }
  return NextResponse.json(withMeta(mock, 'mock'))
}
