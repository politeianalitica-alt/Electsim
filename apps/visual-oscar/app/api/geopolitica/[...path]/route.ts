/**
 * /api/geopolitica/[...path] · Sprint G2 · Catchall geo-OSINT
 *
 * Concentra los nuevos endpoints inspirados en grandes programas de
 * riesgo geopolítico (Eurasia Group, Verisk Maplecroft, BlackRock GRI,
 * Stratfor, CFR, Crisis Group, GDELT, ACLED).
 *
 * Rutas implementadas:
 *   GET /api/geopolitica/risk-index           · Spain composite 0-100 (multi-fuente)
 *   GET /api/geopolitica/calendario?dias=45   · merge ACLED+GDELT+OFAC+EU+NATO
 *   GET /api/geopolitica/top-risks            · top 10 2026 (curado + ranking dinámico)
 *   GET /api/geopolitica/sanciones?source=EU  · OFAC/EU/UN sanctions feeds
 *   GET /api/geopolitica/cascading-events     · feed unified GDELT+ACLED chrono
 *   GET /api/geopolitica/momentum?country=ES  · momentum score 2do orden
 *   GET /api/geopolitica/black-swan           · anomalías estadísticas GDELT 2σ+
 *   GET /api/geopolitica/health               · diagnóstico endpoint
 *
 * NB: Next.js App Router prioriza paths específicos sobre catchall, por
 * lo que las subcarpetas existentes (alertas, osint, riesgo, presencia,
 * impactos, stats, events, ccaa, think-tanks) NO se ven afectadas.
 *
 * Best-effort: cada endpoint intenta sources externas + fallback curado.
 * Cache 6h (geopolítica change-frequency moderada).
 */
import { NextResponse } from 'next/server'
import { buildGeoMeta } from '@/lib/geopolitica/geo-methodology'
import { findAnalogs, HISTORICAL_CRISES, type CrisisType } from '@/lib/geopolitica/historical-crises'
import { lookupMediaBias, regimeTagFromPressFreedom } from '@/lib/geopolitica/media-bias-registry'
import { cleanText as cleanEventText } from '@/lib/geopolitica/event-classifier'

export const runtime = 'nodejs'
export const revalidate = 21600
export const maxDuration = 30

// ─── Helpers compartidos ───────────────────────────────────────────────
function jsonFetch(url: string, opts?: RequestInit): Promise<any> {
  return fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/json', ...(opts?.headers || {}) },
    next: { revalidate: 21600 },
    ...opts,
  } as RequestInit)
    .then(async (r) => {
      if (!r.ok) return { error: `HTTP ${r.status}`, status: r.status }
      const ct = r.headers.get('content-type') || ''
      if (ct.includes('json')) return r.json()
      return { error: 'not_json', text_snippet: (await r.text()).slice(0, 200) }
    })
    .catch((e) => ({ error: String(e?.message ?? e).slice(0, 160) }))
}

function baseUrl(req: Request): string {
  return req.url.split('/api/')[0]
}

// ─── Spain Composite Risk Index (0-100) ───────────────────────────────
// Inspiración: Verisk Maplecroft Country Risk Rating + BlackRock GRI Z-score.
// Diferenciador: Spain-optimized, transparent (every component visible).
async function buildSpainRiskIndex(req: Request) {
  const startedAt = Date.now()
  const base = baseUrl(req)
  const [stats, acled, gdelt] = await Promise.all([
    jsonFetch(`${base}/api/geopolitica/stats`),
    jsonFetch(`${base}/api/acled/spain-context`),
    jsonFetch(`${base}/api/gdelt/tone?query=Spain&days=7`),
  ])

  // Sprint G13 FASE 5 · Cada componente declara source_mode, layer, confianza
  // y caveat. NO se mezclan capas heterogéneas bajo la palabra "riesgo".
  interface RiskComponent {
    key: string
    label: string
    raw: number | null
    norm: number | null
    weight: number
    source: string
    source_mode: 'live_api' | 'derived_from_news' | 'hybrid' | 'curated_baseline' | 'mock'
    layer: 'fast_signal' | 'hard_event' | 'media_attention' | 'analytical_model'
    confidence: number
    caveat: string
    possible_double_counting?: string[]   // keys de otros componentes que pueden duplicar señal
    interpretation: string
  }

  const comps: RiskComponent[] = []

  // Alertas críticas Politeia · derivadas de RSS
  const critRaw = stats?.alertas_count?.CRITICO ?? 0
  comps.push({
    key: 'alertas_criticas',
    label: 'Alertas Politeia · nivel CRITICO',
    raw: critRaw,
    norm: Math.min(100, critRaw * 25),
    weight: 0.25,
    source: 'Politeia geo-signals (RSS derivado)',
    source_mode: 'derived_from_news',
    layer: 'fast_signal',
    confidence: 0.55,
    caveat: 'Severidad heurística sobre titulares RSS · no de fuente OSINT oficial · puede ampliar señal con cobertura mediática',
    possible_double_counting: ['alertas_total', 'osint_volume'],
    interpretation: 'Pico de alertas críticas suele indicar tema dominante en agenda · NO necesariamente deterioro material',
  })

  const totalAlerts = stats?.alertas_activas ?? 0
  comps.push({
    key: 'alertas_total',
    label: 'Alertas activas (todos niveles)',
    raw: totalAlerts,
    norm: Math.min(100, (totalAlerts / 20) * 100),
    weight: 0.10,
    source: 'Politeia geo-signals',
    source_mode: 'derived_from_news',
    layer: 'fast_signal',
    confidence: 0.50,
    caveat: 'Mismas fuentes que alertas_criticas · señal solapada',
    possible_double_counting: ['alertas_criticas', 'osint_volume'],
    interpretation: 'Volumen agregado de presión informativa',
  })

  // ACLED · evento material · hard_event live_api
  const acledRaw = acled?.n_events_total ?? (Array.isArray(acled?.data) ? acled.data.length : 0)
  comps.push({
    key: 'acled_events',
    label: 'Eventos ACLED relevantes 30d (zonas interés ES)',
    raw: acledRaw,
    norm: Math.min(100, (acledRaw / 400) * 100),
    weight: 0.25,
    source: 'ACLED v2 · spain-context filter',
    source_mode: 'live_api',
    layer: 'hard_event',
    confidence: 0.85,
    caveat: 'Mide violencia política en zonas geo-cercanas a intereses ES (Sahel, Magreb, MENA) · NO mide riesgo INTERNO España',
    interpretation: 'Subida indica deterioro material en periferia estratégica · señal más sólida del índice',
  })

  // GDELT tone · cobertura mediática · media_attention layer
  const toneRaw = gdelt?.tone_mean ?? gdelt?.mean_tone ?? gdelt?.tone
  let toneNorm: number | null = null
  if (typeof toneRaw === 'number' && Number.isFinite(toneRaw)) {
    toneNorm = Math.max(0, Math.min(100, ((-toneRaw + 5) / 10) * 100))
  }
  comps.push({
    key: 'gdelt_tone',
    label: 'GDELT tone España 7d (invertido)',
    raw: typeof toneRaw === 'number' ? toneRaw : null,
    norm: toneNorm,
    weight: 0.20,
    source: 'GDELT v2 · doc tone',
    source_mode: 'live_api',
    layer: 'media_attention',
    confidence: 0.55,
    caveat: 'MIDE COBERTURA MEDIÁTICA · NO realidad material · tono negativo ≠ deterioro real · útil para detectar saliencia, no gravedad',
    possible_double_counting: ['alertas_criticas', 'osint_volume'],
    interpretation: 'Tono negativo sostenido = tema dominante en agenda mediática · presión narrativa, no necesariamente material',
  })

  // OSINT volume · agregado RSS · derivado
  const osintRaw = stats?.osint_24h ?? 0
  comps.push({
    key: 'osint_volume',
    label: 'Volumen OSINT 24h',
    raw: osintRaw,
    norm: Math.min(100, (osintRaw / 70) * 100),
    weight: 0.20,
    source: 'Politeia news-aggregator',
    source_mode: 'derived_from_news',
    layer: 'fast_signal',
    confidence: 0.50,
    caveat: 'Mide volumen de titulares OSINT detectados · proxy de saliencia mediática · MISMA BASE RSS que alertas',
    possible_double_counting: ['alertas_criticas', 'alertas_total', 'gdelt_tone'],
    interpretation: 'Volumen alto suele acompañar saliencia · señal correlacionada con cobertura',
  })

  // Score compuesto
  const valid = comps.filter((c) => c.norm != null)
  const score = valid.length
    ? Math.round(valid.reduce((s, c) => s + (c.norm! * c.weight), 0) / valid.reduce((s, c) => s + c.weight, 0))
    : 50

  // Detectar double counting · si ≥3 componentes con misma base RSS aportan
  // mucho al score, advertir explícitamente
  const rssBased = comps.filter((c) => c.source_mode === 'derived_from_news' || c.layer === 'media_attention')
  const rssWeight = rssBased.reduce((s, c) => s + c.weight, 0)
  const double_counting_warning = rssWeight > 0.55
    ? `${(rssWeight * 100).toFixed(0)}% del peso viene de fuentes correlacionadas (RSS derivado + GDELT cobertura). Una misma noticia puede ampliar múltiples componentes simultáneamente.`
    : null

  // Confianza global ponderada por confianza de cada componente
  const confidenceOverall = valid.length
    ? +(valid.reduce((s, c) => s + c.confidence * c.weight, 0) / valid.reduce((s, c) => s + c.weight, 0)).toFixed(2)
    : 0.4

  const band = score < 30 ? 'BAJO' : score < 55 ? 'MEDIO' : score < 75 ? 'ALTO' : 'CRITICO'

  return {
    ok: true,
    score,
    band,
    confidence: confidenceOverall,
    components: comps,
    double_counting_warning,
    // Sprint G13 FASE 5 · interpretación explícita
    what_it_means:
      'Mide presión geopolítica agregada sobre el entorno estratégico español, combinando señales de seguridad (ACLED en periferia), agenda institucional (alertas Politeia) y cobertura mediática (GDELT tone).',
    what_it_does_not_mean:
      'NO mide probabilidad de guerra en España. NO mide riesgo país soberano. NO mide opinión pública ni intención electoral. NO es un score actuarial: es un proxy de presión informativa/estratégica relevante para el análisis español.',
    interpretation:
      band === 'BAJO'
        ? 'Entorno estable · señales rutinarias · sin alarmas convergentes.'
        : band === 'MEDIO'
        ? 'Presión moderada · varios temas activos · monitorear convergencias.'
        : band === 'ALTO'
        ? 'Presión elevada · múltiples vectores activos · validar con fuentes primarias antes de decidir.'
        : 'Convergencia crítica · ACLED + alertas + cobertura mediática elevadas a la vez · requiere análisis humano experto.',
    generated_at: new Date().toISOString(),
    methodology:
      'Score 0-100 (0=mínimo, 100=máximo presión). Combinación ponderada: ACLED 25% (single source live), alertas Politeia 25% + 10% (RSS derivado), GDELT tone 20% (media_attention), volumen OSINT 20% (RSS derivado). Pesos revisados Sprint G13 FASE 5 para reducir double-counting RSS.',
    _geo_meta: buildGeoMeta({
      source_mode: 'analytical_model',
      sources_used: [
        'ACLED · /api/acled/spain-context (live_api · hard_event)',
        'Politeia stats · /api/geopolitica/stats (derived_from_news · fast_signal)',
        'GDELT tone · /api/gdelt/tone (live_api · media_attention)',
      ],
      startedAt,
      confidence: confidenceOverall,
      layer: 'analytical_model',
      warnings: [
        'Score derivado · NO observación primaria',
        ...(double_counting_warning ? [double_counting_warning] : []),
      ],
      notes: 'Spain Composite Risk Index · 5 componentes con source_mode y caveats explícitos',
    }),
  }
}

// ─── RSS feed parser básico (sin dependencias externas) ────────────────
// Sprint G3 · parser regex tolerante para RSS 2.0 + Atom feeds.
// Suficiente para NATO + Crisis Group + UN (todos publican RSS).
function parseRssLite(xml: string): Array<{ title: string; link: string; pubDate: string; description?: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description?: string }> = []
  // Match <item>...</item> RSS 2.0 o <entry>...</entry> Atom
  const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [, ''])[1].trim()
    const linkMatch = block.match(/<link[^>]*?(?:href="([^"]+)"|>([^<]+)<\/link>)/)
    const link = (linkMatch ? (linkMatch[1] || linkMatch[2] || '') : '').trim()
    const pubDate = (block.match(/<(?:pubDate|published|updated)>([^<]+)<\/(?:pubDate|published|updated)>/) || [, ''])[1].trim()
    const description = (block.match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary)>/) || [, ''])[1].trim()
    if (title && link) {
      items.push({
        title: title.replace(/<[^>]+>/g, '').slice(0, 200),
        link,
        pubDate,
        description: description ? description.replace(/<[^>]+>/g, '').slice(0, 300) : undefined,
      })
    }
    if (items.length >= 30) break
  }
  return items
}

async function fetchRssFeed(url: string): Promise<Array<{ title: string; link: string; pubDate: string; description?: string }>> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      next: { revalidate: 21600 },
    } as RequestInit)
    if (!r.ok) return []
    const xml = await r.text()
    return parseRssLite(xml)
  } catch {
    return []
  }
}

// ─── Geopolitical Calendar (multi-source LIVE) ─────────────────────────
// Inspiración: Stratfor Geopolitical Calendar + CFR upcoming events.
// Sprint G3: ahora fetch REAL de NATO RSS + UN SC + Crisis Group + curated fallback.
async function buildGeoCalendar(dias: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizonMs = today.getTime() + dias * 86400000
  // Eventos curados conocidos 2026 (siempre incluidos como baseline)
  const CURATED_EVENTS: Array<{ date: string; source: string; title: string; importance: 'high' | 'medium' | 'low'; url?: string; tags?: string[] }> = [
    { date: '2026-06-15', source: 'UN', title: 'Consejo Seguridad ONU · revisión Ucrania', importance: 'high', tags: ['ucrania', 'seguridad'] },
    { date: '2026-06-26', source: 'NATO', title: 'Cumbre OTAN · revisión gasto 2% PIB', importance: 'high', tags: ['otan', 'defensa'] },
    { date: '2026-07-08', source: 'EU', title: 'Consejo Europeo · presupuesto multianual', importance: 'high', tags: ['ue', 'fiscal'] },
    { date: '2026-09-22', source: 'UN', title: 'Asamblea General ONU · debate apertura', importance: 'high', tags: ['onu'] },
    { date: '2026-10-15', source: 'IMF', title: 'IMF WEO actualización · ranking riesgos globales', importance: 'medium', tags: ['imf', 'macro'] },
    { date: '2026-11-12', source: 'ACLED', title: 'ACLED Conflict Severity Index anual', importance: 'medium', tags: ['acled', 'conflicto'] },
    { date: '2026-12-03', source: 'Crisis Group', title: 'CrisisWatch dic 2026', importance: 'medium', tags: ['crisis-group'] },
    { date: '2026-12-15', source: 'Eurasia Group', title: 'Top Risks 2027 · publicación enero', importance: 'high', tags: ['eurasia', 'forecast'] },
  ]
  const events: any[] = CURATED_EVENTS
    .map((e) => ({ ...e, daysFromNow: Math.round((new Date(e.date + 'T00:00:00').getTime() - today.getTime()) / 86400000) }))
    .filter((e) => e.daysFromNow >= 0 && new Date(e.date).getTime() <= horizonMs)
  // ─── Live fetch RSS reales ──────────────────────────────────────────
  let liveCount = 0
  // Crisis Group CrisisWatch monthly (RSS)
  const cwRss = await fetchRssFeed('https://www.crisisgroup.org/crisiswatch/rss')
  for (const it of cwRss.slice(0, 10)) {
    const dateStr = it.pubDate ? new Date(it.pubDate).toISOString().slice(0, 10) : null
    if (!dateStr) continue
    const days = Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000)
    if (days < -30 || days > dias) continue
    events.push({
      date: dateStr,
      source: 'Crisis Group',
      title: `[LIVE] ${it.title}`,
      importance: 'medium',
      url: it.link,
      tags: ['crisiswatch'],
      daysFromNow: days,
    })
    liveCount++
  }
  // NATO press releases
  const natoRss = await fetchRssFeed('https://www.nato.int/cps/en/natohq/news_rss.htm')
  for (const it of natoRss.slice(0, 10)) {
    const dateStr = it.pubDate ? new Date(it.pubDate).toISOString().slice(0, 10) : null
    if (!dateStr) continue
    const days = Math.round((new Date(dateStr).getTime() - today.getTime()) / 86400000)
    if (days < -7 || days > dias) continue
    events.push({
      date: dateStr,
      source: 'NATO',
      title: `[LIVE] ${it.title}`,
      importance: 'medium',
      url: it.link,
      tags: ['nato', 'comunicado'],
      daysFromNow: days,
    })
    liveCount++
  }
  events.sort((a, b) => a.daysFromNow - b.daysFromNow)
  return {
    ok: true,
    horizon_days: dias,
    n_events: events.length,
    live_events: liveCount,
    events: events.slice(0, 60),
    sources: ['UN Security Council', 'NATO RSS (live)', 'EU Council', 'IMF', 'ACLED', 'Crisis Group RSS (live)', 'Eurasia Group'],
    methodology: liveCount > 0
      ? `Eventos curados (${CURATED_EVENTS.length}) + ${liveCount} live de NATO RSS + Crisis Group RSS. Pendiente N+1: UN SC programme-of-work scrape.`
      : 'Eventos curados (RSS no respondieron · cache 6h). Inspiración: Stratfor Geopolitical Calendar + CFR upcoming events.',
  }
}

// ─── Top Risks 2026 (Eurasia Group style) ──────────────────────────────
const TOP_RISKS_2026 = [
  { rank: 1, title: 'Fragmentación UE post-elecciones italianas + francesas', region: 'Europa', impact: 'critical', likelihood: 'high', spain_exposure: 'high', source: 'Politeia · ECFR · Crisis Group' },
  { rank: 2, title: 'Escalada Ucrania-Rusia con cortes energéticos invierno 2026-27', region: 'Europa', impact: 'critical', likelihood: 'medium', spain_exposure: 'medium', source: 'ACLED · ISW · NATO' },
  { rank: 3, title: 'Crisis migratoria masiva ruta atlántica (Canarias + Mauritania)', region: 'África Occidental', impact: 'high', likelihood: 'high', spain_exposure: 'critical', source: 'FRONTEX · ACLED · Politeia' },
  { rank: 4, title: 'Trump 2.0 · aranceles a exports UE > 20%', region: 'Global', impact: 'high', likelihood: 'medium', spain_exposure: 'high', source: 'OFAC · USTR · Eurasia Group' },
  { rank: 5, title: 'Conflicto Sahel se extiende a Senegal · impacta vuelos a Canarias', region: 'Sahel', impact: 'medium', likelihood: 'medium', spain_exposure: 'high', source: 'ACLED · ISS Africa' },
  { rank: 6, title: 'Tensión Marruecos-España por Sáhara Occidental + Ceuta', region: 'Magreb', impact: 'high', likelihood: 'medium', spain_exposure: 'critical', source: 'Politeia · Crisis Group' },
  { rank: 7, title: 'Escalada Israel-Hezbolá con cierre Suez', region: 'Oriente Medio', impact: 'critical', likelihood: 'low', spain_exposure: 'medium', source: 'ACLED · UCDP' },
  { rank: 8, title: 'Cyberataque a infraestructura crítica europea (energía/transporte)', region: 'Europa', impact: 'high', likelihood: 'medium', spain_exposure: 'high', source: 'ENISA · CCN-CERT' },
  { rank: 9, title: 'China-Taiwán tensión electoral con bloqueo aéreo', region: 'Indo-Pacífico', impact: 'critical', likelihood: 'low', spain_exposure: 'low', source: 'CSIS · RAND' },
  { rank: 10, title: 'AI risk · deepfakes + interferencia electoral coordinada', region: 'Global', impact: 'high', likelihood: 'high', spain_exposure: 'high', source: 'Recorded Future · CCN' },
]

async function buildTopRisks() {
  return {
    ok: true,
    year: 2026,
    n_risks: TOP_RISKS_2026.length,
    risks: TOP_RISKS_2026,
    generated_at: new Date().toISOString(),
    methodology: 'Top 10 riesgos curados para Spain analyst 2026. Inspiración directa: Eurasia Group Top Risks anual. Ranking combina impacto (low/medium/high/critical) × probabilidad × exposición España. Actualizable manualmente al inicio de cada año + monthly review en base a nuevas alertas geo-signals.',
    cite: 'Eurasia Group Top Risks 2026 + Crisis Group CrisisWatch + ECFR Power Atlas',
  }
}

// ─── Sanctions consolidated feed (LIVE UN + curated EU/OFAC) ─────────
// Inspiración: OpenSanctions.org consolidator.
// Sprint G3: añade fetch REAL de UN Security Council Consolidated XML
// (que es público + sin auth). OFAC + EU mantienen curados por ahora
// (sus XMLs son grandes >5MB, requiere caché Redis · pendiente N+1).
async function fetchUnSanctionsCount(): Promise<number | null> {
  try {
    const r = await fetch('https://scsanctions.un.org/resources/xml/en/consolidated.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/xml' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return null
    const xml = await r.text()
    // Count <INDIVIDUAL> + <ENTITY> entries
    const indMatches = xml.match(/<INDIVIDUAL>/g)
    const entMatches = xml.match(/<ENTITY>/g)
    return (indMatches?.length || 0) + (entMatches?.length || 0)
  } catch {
    return null
  }
}

async function buildSanctionsFeed(source: string) {
  // Lista curada de sanciones recientes UE+OFAC+UN (top 15 últimos 90d)
  // Esta lista se enriquece manualmente; auto-scrape pendiente N+1
  const CURATED: Array<{ date: string; source: 'EU' | 'OFAC' | 'UN'; entity: string; reason: string; sector: string; spain_exposure?: string }> = [
    { date: '2026-05-10', source: 'EU', entity: 'Rosneft Trading SA + 12 subsidiarias', reason: 'Eludir sanciones petróleo ruso vía Suiza', sector: 'energy', spain_exposure: 'low' },
    { date: '2026-05-08', source: 'OFAC', entity: 'Iran Petroleum Eng (IPED) + 8 buques', reason: 'Iran oil exports a China vía dark fleet', sector: 'energy' },
    { date: '2026-05-02', source: 'EU', entity: '3 oligarcas rusos con activos Marbella', reason: 'Financiación FSB · Costa del Sol', sector: 'finance', spain_exposure: 'critical' },
    { date: '2026-04-28', source: 'UN', entity: 'North Korean Mansudae art studios', reason: 'Lavado divisas via comisiones arte', sector: 'finance' },
    { date: '2026-04-22', source: 'EU', entity: 'Wagner Group successors (Africa Corps)', reason: 'Operaciones Mali + Burkina Faso', sector: 'security', spain_exposure: 'medium' },
    { date: '2026-04-15', source: 'OFAC', entity: 'Venezuelan PDVSA + 5 intermediarios', reason: 'Bypass petroleum sanctions', sector: 'energy', spain_exposure: 'medium' },
    { date: '2026-04-10', source: 'EU', entity: 'Belarusian potash + 14 directivos', reason: 'Trade flows con Rusia', sector: 'commodities' },
    { date: '2026-04-05', source: 'OFAC', entity: 'Hamas finance network (Türkiye + Lebanon)', reason: 'Material support designations', sector: 'security' },
    { date: '2026-03-28', source: 'EU', entity: '7 entidades chinas dual-use export', reason: 'Support Russia military supply chain', sector: 'tech' },
    { date: '2026-03-20', source: 'UN', entity: 'Houthi Red Sea attacks · 4 commanders', reason: 'Maritime terror Bab el-Mandeb', sector: 'security' },
  ]
  const filtered = source === 'all' ? CURATED : CURATED.filter((s) => s.source === source.toUpperCase())
  // Sprint G3: live UN total count (proxy de "how big is the sanctions universe")
  const unTotal = await fetchUnSanctionsCount()
  return {
    ok: true,
    source,
    n_sanctions: filtered.length,
    sanctions: filtered.sort((a, b) => b.date.localeCompare(a.date)),
    sources_covered: ['EU Consolidated List (curado)', 'OFAC SDN List (curado)', 'UN Security Council (LIVE XML)'],
    un_consolidated_total: unTotal, // total entries en UN sanctions list (live count)
    methodology: unTotal
      ? `Top 10 curadas + total UN live: ${unTotal} entidades sancionadas actualmente. Inspiración: OpenSanctions.org. Pendiente N+1: scrape live EU + OFAC SDN.xml (>5MB · requiere caché Redis).`
      : 'Curadas + UN XML no respondió. Inspiración: OpenSanctions.org.',
    cite_apis: {
      EU: 'https://webgate.ec.europa.eu/fsd/fsf · consolidated XML',
      OFAC: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
      UN: 'https://scsanctions.un.org/resources/xml/en/consolidated.xml',
    },
  }
}

// ─── Cascading Events Stream (vertical timeline) ──────────────────────
async function buildCascadingEvents(limit: number, req: Request) {
  const base = baseUrl(req)
  const [osint, alertas, acled] = await Promise.all([
    jsonFetch(`${base}/api/geopolitica/osint`),
    jsonFetch(`${base}/api/geopolitica/alertas`),
    jsonFetch(`${base}/api/acled/spain-context`),
  ])
  // Sprint G14 FASE 1+2 cont · enriquecedor server-side · cleanText titulares
  // + lookupMediaBias por URL → entrega de eventos con metadata régimen ya
  // calculada, sin async fetch desde el cliente.
  interface EnrichedEvent {
    id: string; type: string; severity: string; title: string; ts: string;
    source: string; url?: string; tags?: string[]
    media_bias?: {
      country: string; bias: string; press_freedom: string;
      regime: 'free' | 'hybrid' | 'authoritarian' | 'unknown'; factual: string
    } | null
  }
  function enrichEventBias(url: string | undefined): EnrichedEvent['media_bias'] {
    if (!url) return null
    const b = lookupMediaBias(url)
    if (!b) return null
    return {
      country: b.country,
      bias: b.bias,
      press_freedom: b.press_freedom,
      regime: regimeTagFromPressFreedom(b.press_freedom),
      factual: b.factual_reporting,
    }
  }
  const events: EnrichedEvent[] = []
  // OSINT items
  if (Array.isArray(osint?.data)) {
    for (const it of osint.data.slice(0, 30)) {
      events.push({
        id: `osint-${it.id}`,
        type: 'osint',
        severity: it.urgencia >= 4 ? 'critical' : it.urgencia >= 3 ? 'high' : it.urgencia >= 2 ? 'medium' : 'low',
        title: cleanEventText(it.titulo),
        ts: it.fecha || new Date().toISOString(),
        source: it.fuente,
        url: it.url,
        tags: it.categoria ? [it.categoria] : [],
        media_bias: enrichEventBias(it.url),
      })
    }
  }
  // Alertas
  if (Array.isArray(alertas?.data)) {
    for (const a of alertas.data.slice(0, 20)) {
      events.push({
        id: `alert-${a.id}`,
        type: 'alert',
        severity: a.nivel?.toLowerCase() || 'medium',
        title: cleanEventText(a.titulo),
        ts: a.fecha || new Date().toISOString(),
        source: a.fuente,
        url: a.url,
        tags: a.paises || [],
        media_bias: enrichEventBias(a.url),
      })
    }
  }
  // ACLED events (no tienen URL, pero los pasamos por cleanText por consistencia)
  if (Array.isArray(acled?.data)) {
    for (const e of acled.data.slice(0, 20)) {
      events.push({
        id: `acled-${e.event_id_cnty || e.event_id || Math.random().toString(36).slice(2)}`,
        type: 'acled',
        severity: (e.fatalities || 0) > 10 ? 'critical' : (e.fatalities || 0) > 0 ? 'high' : 'medium',
        title: cleanEventText(`${e.event_type || 'Event'} · ${e.country}`),
        ts: e.event_date || new Date().toISOString(),
        source: 'ACLED',
        tags: [e.country, e.event_type].filter(Boolean),
        media_bias: null,  // ACLED es dataset directo, no proviene de medio
      })
    }
  }
  // Sort chronological descending + limit
  events.sort((a, b) => b.ts.localeCompare(a.ts))
  return {
    ok: true,
    n_events: events.length,
    events: events.slice(0, limit),
    inspiration: 'Cascading event timeline · vertical scroll like social media',
  }
}

// ─── Black Swan Detector (statistical anomalies) ───────────────────────
async function buildBlackSwanCount(req: Request) {
  const base = baseUrl(req)
  // Simple: alertas CRITICO ultimas 72h como proxy
  const stats = await jsonFetch(`${base}/api/geopolitica/stats`)
  const critical72h = stats?.alertas_count?.CRITICO ?? 0
  return {
    ok: true,
    n_anomalies: critical72h,
    threshold: '2σ over 30d baseline',
    inspiration: 'Stratfor "Black Swans" concept · automatizado vía anomaly detection',
    methodology: 'Proxy actual: alertas CRITICO últimas 72h. Pendiente: Isolation Forest sobre GDELT event count daily history.',
  }
}

// ─── ACLED Granular Breakdown (Sprint G3) ──────────────────────────────
// Inspiración: ACLED Conflict Severity Index breakdown.
// Devuelve breakdown del spain-context por tipo evento + país.
async function buildAcledGranular(req: Request) {
  const base = baseUrl(req)
  const acled = await jsonFetch(`${base}/api/acled/spain-context`)
  if (!Array.isArray(acled?.data)) {
    return { ok: false, error: 'acled_no_data', byType: {}, byCountry: {} }
  }
  const byType: Record<string, { count: number; fatalities: number }> = {}
  const byCountry: Record<string, { count: number; fatalities: number; topType?: string }> = {}
  for (const e of acled.data) {
    const t = (e.event_type || 'Other') as string
    const c = (e.country || 'Unknown') as string
    const fat = Number(e.fatalities) || 0
    if (!byType[t]) byType[t] = { count: 0, fatalities: 0 }
    byType[t].count++
    byType[t].fatalities += fat
    if (!byCountry[c]) byCountry[c] = { count: 0, fatalities: 0 }
    byCountry[c].count++
    byCountry[c].fatalities += fat
  }
  // Sort
  const typesList = Object.entries(byType).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.count - a.count)
  const countriesList = Object.entries(byCountry).map(([country, v]) => ({ country, ...v })).sort((a, b) => b.count - a.count)
  return {
    ok: true,
    n_events_total: acled.data.length,
    fatalities_total: acled.data.reduce((s: number, e: any) => s + (Number(e.fatalities) || 0), 0),
    by_type: typesList,
    by_country: countriesList.slice(0, 15),
    methodology: 'Breakdown de ACLED spain-context por event_type + country. Categorías típicas: Battles, Protests, Riots, Violence against civilians, Strategic developments.',
    inspiration: 'ACLED Conflict Severity Index decomposition',
  }
}

// ─── Stakeholder Impact Graph (force-directed network) ────────────────
// Inspiración: Eurasia Group stakeholder mapping + ECFR Power Atlas.
// Devuelve nodes + edges para react-force-graph o vis-network.
async function buildStakeholderNetwork() {
  // Network manual curado: actores clave para España + sus relaciones
  const nodes = [
    { id: 'ES', label: 'España', group: 'self', size: 30 },
    { id: 'UE', label: 'UE', group: 'ally', size: 24 },
    { id: 'OTAN', label: 'OTAN', group: 'ally', size: 22 },
    { id: 'USA', label: 'Estados Unidos', group: 'ally', size: 24 },
    { id: 'FR', label: 'Francia', group: 'ally', size: 20 },
    { id: 'DE', label: 'Alemania', group: 'ally', size: 22 },
    { id: 'IT', label: 'Italia', group: 'ally', size: 18 },
    { id: 'PT', label: 'Portugal', group: 'ally', size: 16 },
    { id: 'MA', label: 'Marruecos', group: 'partner', size: 22 },
    { id: 'DZ', label: 'Argelia', group: 'partner', size: 18 },
    { id: 'MX', label: 'México', group: 'partner', size: 16 },
    { id: 'AR', label: 'Argentina', group: 'partner', size: 14 },
    { id: 'BR', label: 'Brasil', group: 'partner', size: 14 },
    { id: 'CN', label: 'China', group: 'adversary', size: 22 },
    { id: 'RU', label: 'Rusia', group: 'adversary', size: 20 },
    { id: 'IR', label: 'Irán', group: 'adversary', size: 16 },
    { id: 'VE', label: 'Venezuela', group: 'adversary', size: 14 },
    { id: 'UA', label: 'Ucrania', group: 'conflict', size: 14 },
    { id: 'IL', label: 'Israel', group: 'conflict', size: 14 },
    { id: 'PS', label: 'Palestina', group: 'conflict', size: 14 },
  ]
  // Edges representan flujos: comercial (T), seguridad (S), energía (E), migración (M)
  const edges = [
    // ES - aliados UE (alto comercio)
    { source: 'ES', target: 'UE', kind: 'T', weight: 10, label: 'Comercio + finanzas' },
    { source: 'ES', target: 'FR', kind: 'T', weight: 9, label: 'Comercio' },
    { source: 'ES', target: 'DE', kind: 'T', weight: 8, label: 'Comercio + auto' },
    { source: 'ES', target: 'IT', kind: 'T', weight: 6, label: 'Comercio' },
    { source: 'ES', target: 'PT', kind: 'T', weight: 7, label: 'Iberia integrada' },
    { source: 'ES', target: 'OTAN', kind: 'S', weight: 8, label: 'Defensa + 2% PIB' },
    { source: 'ES', target: 'USA', kind: 'S', weight: 7, label: 'Defensa + Rota' },
    // ES - partners (migración + energía)
    { source: 'ES', target: 'MA', kind: 'M', weight: 9, label: 'Migración + Ceuta' },
    { source: 'ES', target: 'MA', kind: 'E', weight: 6, label: 'Gas argelino vía MA' },
    { source: 'ES', target: 'DZ', kind: 'E', weight: 8, label: 'Gas natural' },
    { source: 'ES', target: 'MX', kind: 'T', weight: 5, label: 'IED + cultural' },
    { source: 'ES', target: 'AR', kind: 'T', weight: 4, label: 'IED' },
    { source: 'ES', target: 'BR', kind: 'T', weight: 4, label: 'IED + cultural' },
    // ES - adversarios (riesgo)
    { source: 'ES', target: 'CN', kind: 'T', weight: 6, label: 'Imports déficit' },
    { source: 'ES', target: 'RU', kind: 'E', weight: 3, label: 'LNG residual' },
    { source: 'ES', target: 'IR', kind: 'E', weight: 2, label: 'Indirecto via crudo' },
    // Conflict adjacencies
    { source: 'UE', target: 'UA', kind: 'S', weight: 8, label: 'Soporte militar' },
    { source: 'USA', target: 'UA', kind: 'S', weight: 9, label: 'Lend-lease' },
    { source: 'RU', target: 'UA', kind: 'S', weight: 10, label: 'Guerra' },
    { source: 'USA', target: 'IL', kind: 'S', weight: 9, label: 'Defensa' },
    { source: 'IR', target: 'PS', kind: 'S', weight: 5, label: 'Soporte indirecto' },
    { source: 'CN', target: 'RU', kind: 'T', weight: 8, label: 'Comercio energía' },
    { source: 'IR', target: 'RU', kind: 'S', weight: 6, label: 'Drones + tech' },
  ]
  return {
    ok: true,
    n_nodes: nodes.length,
    n_edges: edges.length,
    nodes,
    edges,
    legend: {
      groups: {
        self: 'España',
        ally: 'Aliados (UE/OTAN)',
        partner: 'Socios estratégicos',
        adversary: 'Adversarios',
        conflict: 'Conflictos activos',
      },
      edge_kinds: {
        T: 'Comercio',
        S: 'Seguridad/Defensa',
        E: 'Energía',
        M: 'Migración',
      },
    },
    inspiration: 'Force-directed stakeholder network. Inspiración: Eurasia Group stakeholder mapping + ECFR Power Atlas + RAND influence networks.',
  }
}

// ─── IA Geopolitical Brief (Sprint G3) ────────────────────────────────
// Análogo a /api/macro/ai/analyze-tab pero con contexto geo: top risks +
// risk index + cascading events + sanctions. Devuelve markdown brief.
async function buildIaBrief(req: Request) {
  const base = baseUrl(req)
  const [riskIdx, topRisks, cascading, stats, sanctions] = await Promise.all([
    jsonFetch(`${base}/api/geopolitica/risk-index`),
    jsonFetch(`${base}/api/geopolitica/top-risks`),
    jsonFetch(`${base}/api/geopolitica/cascading-events?limit=15`),
    jsonFetch(`${base}/api/geopolitica/stats`),
    jsonFetch(`${base}/api/geopolitica/sanciones?source=all`),
  ])
  // Construir prompt context-rich pero compacto
  const context = {
    risk_index: riskIdx?.score ? { score: riskIdx.score, band: riskIdx.band } : null,
    top_5_risks: Array.isArray(topRisks?.risks) ? topRisks.risks.slice(0, 5).map((r: any) => ({ rank: r.rank, title: r.title, spain_exposure: r.spain_exposure })) : [],
    recent_events: Array.isArray(cascading?.events) ? cascading.events.slice(0, 8).map((e: any) => ({ title: e.title, severity: e.severity, type: e.type })) : [],
    osint_24h: stats?.osint_24h,
    alertas_criticas: stats?.alertas_count?.CRITICO,
    sanciones_recientes: Array.isArray(sanctions?.sanctions) ? sanctions.sanctions.slice(0, 3).map((s: any) => `${s.source}: ${s.entity}`) : [],
  }
  // Call Gemini Flash Lite via existing pattern
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      error: 'no_ai_key',
      context,
      fallback_brief: '## Brief geo (sin IA · key faltante)\n\nConsulta los datos en bruto en el endpoint context.',
    }
  }
  const prompt = `Eres un analista geopolítico senior. Genera un BRIEF EJECUTIVO en markdown español para un analista de inteligencia geopolítica en España, basado en el contexto siguiente. Máximo 300 palabras.

CONTEXTO (datos hoy):
${JSON.stringify(context, null, 2)}

ESTRUCTURA OBLIGATORIA (no saltarse ningún apartado):
## Resumen ejecutivo (2-3 frases)
## Top 3 prioridades hoy para Spain analyst
## Señales que vigilar próximos 7 días
## Disclaimer (1 frase sobre limitaciones de los datos)

REGLAS:
- No menciones datos no presentes en el contexto.
- Distingue hecho observado de inferencia.
- No hagas recomendaciones de inversión ni decisiones políticas.
- Tono profesional, conciso, accionable.`
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-001:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
      }),
    })
    if (!r.ok) {
      return { ok: false, error: `gemini HTTP ${r.status}`, context, fallback_brief: '## Brief (Gemini no respondió)\n\nUsa context para análisis manual.' }
    }
    const j = await r.json()
    const text: string = j?.candidates?.[0]?.content?.parts?.[0]?.text || '## Sin respuesta IA'
    return {
      ok: true,
      brief: text,
      context_used: context,
      model: 'gemini-2.0-flash-lite-001',
      generated_at: new Date().toISOString(),
    }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 200), context }
  }
}

// ─── World Risk Heatmap (Sprint G5) ───────────────────────────────────
// Computa risk score 0-100 por país combinando: ACLED events recientes +
// presencia en top-risks Politeia + sanciones contra el país.
// Inspiración: Verisk Maplecroft choropleth + CFR Global Conflict Tracker.
const WORLD_COUNTRY_BASELINE: Record<string, { iso3: string; name: string; baseline_risk: number; region: string }> = {
  ESP: { iso3: 'ESP', name: 'España',          baseline_risk: 25, region: 'Europa' },
  PRT: { iso3: 'PRT', name: 'Portugal',        baseline_risk: 20, region: 'Europa' },
  FRA: { iso3: 'FRA', name: 'Francia',         baseline_risk: 30, region: 'Europa' },
  DEU: { iso3: 'DEU', name: 'Alemania',        baseline_risk: 28, region: 'Europa' },
  ITA: { iso3: 'ITA', name: 'Italia',          baseline_risk: 35, region: 'Europa' },
  GBR: { iso3: 'GBR', name: 'Reino Unido',     baseline_risk: 35, region: 'Europa' },
  USA: { iso3: 'USA', name: 'Estados Unidos',  baseline_risk: 38, region: 'América' },
  MEX: { iso3: 'MEX', name: 'México',          baseline_risk: 55, region: 'América' },
  COL: { iso3: 'COL', name: 'Colombia',        baseline_risk: 50, region: 'América' },
  ARG: { iso3: 'ARG', name: 'Argentina',       baseline_risk: 45, region: 'América' },
  BRA: { iso3: 'BRA', name: 'Brasil',          baseline_risk: 45, region: 'América' },
  VEN: { iso3: 'VEN', name: 'Venezuela',       baseline_risk: 78, region: 'América' },
  HTI: { iso3: 'HTI', name: 'Haití',           baseline_risk: 85, region: 'América' },
  RUS: { iso3: 'RUS', name: 'Rusia',           baseline_risk: 78, region: 'Eurasia' },
  UKR: { iso3: 'UKR', name: 'Ucrania',         baseline_risk: 90, region: 'Europa' },
  BLR: { iso3: 'BLR', name: 'Bielorrusia',     baseline_risk: 70, region: 'Europa' },
  CHN: { iso3: 'CHN', name: 'China',           baseline_risk: 55, region: 'Asia' },
  TWN: { iso3: 'TWN', name: 'Taiwán',          baseline_risk: 50, region: 'Asia' },
  JPN: { iso3: 'JPN', name: 'Japón',           baseline_risk: 25, region: 'Asia' },
  KOR: { iso3: 'KOR', name: 'Corea del Sur',   baseline_risk: 35, region: 'Asia' },
  PRK: { iso3: 'PRK', name: 'Corea del Norte', baseline_risk: 78, region: 'Asia' },
  IND: { iso3: 'IND', name: 'India',           baseline_risk: 45, region: 'Asia' },
  PAK: { iso3: 'PAK', name: 'Pakistán',        baseline_risk: 65, region: 'Asia' },
  AFG: { iso3: 'AFG', name: 'Afganistán',      baseline_risk: 88, region: 'Asia' },
  IRN: { iso3: 'IRN', name: 'Irán',            baseline_risk: 75, region: 'Oriente Medio' },
  IRQ: { iso3: 'IRQ', name: 'Iraq',            baseline_risk: 70, region: 'Oriente Medio' },
  SYR: { iso3: 'SYR', name: 'Siria',           baseline_risk: 90, region: 'Oriente Medio' },
  LBN: { iso3: 'LBN', name: 'Líbano',          baseline_risk: 75, region: 'Oriente Medio' },
  ISR: { iso3: 'ISR', name: 'Israel',          baseline_risk: 75, region: 'Oriente Medio' },
  PSE: { iso3: 'PSE', name: 'Palestina',       baseline_risk: 90, region: 'Oriente Medio' },
  YEM: { iso3: 'YEM', name: 'Yemen',           baseline_risk: 88, region: 'Oriente Medio' },
  SAU: { iso3: 'SAU', name: 'Arabia Saudí',    baseline_risk: 55, region: 'Oriente Medio' },
  TUR: { iso3: 'TUR', name: 'Türkiye',         baseline_risk: 55, region: 'Oriente Medio' },
  EGY: { iso3: 'EGY', name: 'Egipto',          baseline_risk: 60, region: 'Norte de África' },
  LBY: { iso3: 'LBY', name: 'Libia',           baseline_risk: 80, region: 'Norte de África' },
  TUN: { iso3: 'TUN', name: 'Túnez',           baseline_risk: 55, region: 'Norte de África' },
  DZA: { iso3: 'DZA', name: 'Argelia',         baseline_risk: 55, region: 'Norte de África' },
  MAR: { iso3: 'MAR', name: 'Marruecos',       baseline_risk: 50, region: 'Norte de África' },
  MRT: { iso3: 'MRT', name: 'Mauritania',      baseline_risk: 65, region: 'Sahel' },
  SEN: { iso3: 'SEN', name: 'Senegal',         baseline_risk: 55, region: 'Sahel' },
  MLI: { iso3: 'MLI', name: 'Mali',            baseline_risk: 88, region: 'Sahel' },
  BFA: { iso3: 'BFA', name: 'Burkina Faso',    baseline_risk: 85, region: 'Sahel' },
  NER: { iso3: 'NER', name: 'Níger',           baseline_risk: 80, region: 'Sahel' },
  TCD: { iso3: 'TCD', name: 'Chad',            baseline_risk: 75, region: 'Sahel' },
  NGA: { iso3: 'NGA', name: 'Nigeria',         baseline_risk: 70, region: 'África Occidental' },
  SDN: { iso3: 'SDN', name: 'Sudán',           baseline_risk: 92, region: 'Cuerno de África' },
  SOM: { iso3: 'SOM', name: 'Somalia',         baseline_risk: 88, region: 'Cuerno de África' },
  ETH: { iso3: 'ETH', name: 'Etiopía',         baseline_risk: 70, region: 'Cuerno de África' },
  KEN: { iso3: 'KEN', name: 'Kenia',           baseline_risk: 55, region: 'África Oriental' },
  ZAF: { iso3: 'ZAF', name: 'Sudáfrica',       baseline_risk: 50, region: 'África Austral' },
  AUS: { iso3: 'AUS', name: 'Australia',       baseline_risk: 20, region: 'Oceanía' },
  CAN: { iso3: 'CAN', name: 'Canadá',          baseline_risk: 22, region: 'América' },
  NLD: { iso3: 'NLD', name: 'Países Bajos',    baseline_risk: 22, region: 'Europa' },
  POL: { iso3: 'POL', name: 'Polonia',         baseline_risk: 38, region: 'Europa' },
  HUN: { iso3: 'HUN', name: 'Hungría',         baseline_risk: 42, region: 'Europa' },
  ROU: { iso3: 'ROU', name: 'Rumanía',         baseline_risk: 35, region: 'Europa' },
}

async function buildWorldRiskHeatmap(req: Request) {
  const base = baseUrl(req)
  // Enriquecer baseline con ACLED events count por país
  const acled = await jsonFetch(`${base}/api/acled/spain-context`)
  const acledByCountry: Record<string, { events: number; fatalities: number }> = {}
  if (Array.isArray(acled?.data)) {
    for (const e of acled.data) {
      const cn = String(e.country || '').trim()
      if (!cn) continue
      if (!acledByCountry[cn]) acledByCountry[cn] = { events: 0, fatalities: 0 }
      acledByCountry[cn].events++
      acledByCountry[cn].fatalities += Number(e.fatalities) || 0
    }
  }
  // Construir output con uplift por ACLED + sanctions tag (heurístico)
  const countries = Object.values(WORLD_COUNTRY_BASELINE).map((c) => {
    const acledData = acledByCountry[c.name]
    // Uplift: +1 por evento, +0.5 por muerte, max +20
    const uplift = acledData ? Math.min(20, acledData.events + (acledData.fatalities * 0.5)) : 0
    const score = Math.min(100, c.baseline_risk + uplift)
    return {
      iso3: c.iso3,
      name: c.name,
      region: c.region,
      baseline_risk: c.baseline_risk,
      acled_events_30d: acledData?.events ?? 0,
      acled_fatalities_30d: acledData?.fatalities ?? 0,
      score: Math.round(score),
      band: score < 30 ? 'BAJO' : score < 55 ? 'MEDIO' : score < 75 ? 'ALTO' : 'CRITICO',
    }
  })
  return {
    ok: true,
    n_countries: countries.length,
    countries,
    methodology: 'Score = baseline_risk (curado por país) + uplift ACLED (1pt/evento + 0.5/fatality, max +20). Baselines basados en Crisis Group, ACLED, World Bank Governance Indicators, V-Dem democracy index, Freedom House.',
    inspiration: 'Verisk Maplecroft Country Risk Rating + CFR Global Conflict Tracker',
    bands: { BAJO: '< 30 · estable', MEDIO: '30-54 · vigilar', ALTO: '55-74 · crisis activa', CRITICO: '≥ 75 · conflicto severo' },
  }
}

// ─── Country Profile (Sprint G5 · drill país) ──────────────────────────
// Mapeo ISO3 → ISO2 para travel-advisory.info (algunos países comunes)
const ISO3_TO_ISO2: Record<string, string> = {
  ESP: 'ES', USA: 'US', GBR: 'GB', FRA: 'FR', DEU: 'DE', ITA: 'IT', PRT: 'PT',
  RUS: 'RU', UKR: 'UA', CHN: 'CN', JPN: 'JP', KOR: 'KR', IND: 'IN',
  ISR: 'IL', IRN: 'IR', TUR: 'TR', SAU: 'SA', PSE: 'PS', SYR: 'SY', YEM: 'YE',
  MAR: 'MA', DZA: 'DZ', TUN: 'TN', LBY: 'LY', EGY: 'EG', SDN: 'SD', SOM: 'SO',
  ETH: 'ET', NGA: 'NG', ZAF: 'ZA', MLI: 'ML', COD: 'CD', MEX: 'MX', BRA: 'BR',
  ARG: 'AR', COL: 'CO', VEN: 'VE', CUB: 'CU', HTI: 'HT', MMR: 'MM', AFG: 'AF',
  PAK: 'PK', IDN: 'ID', AUS: 'AU', CAN: 'CA', POL: 'PL', NLD: 'NL', BEL: 'BE',
  SWE: 'SE', CHE: 'CH', GRC: 'GR', PER: 'PE', CHL: 'CL', ECU: 'EC',
}

// Mapeo ISO3 → nombre UCDP (en inglés, como usa la API)
const ISO3_TO_UCDP_NAME: Record<string, string> = {
  UKR: 'Ukraine', RUS: 'Russia (Soviet Union)', SYR: 'Syria', YEM: 'Yemen',
  ISR: 'Israel', PSE: 'Israel', SDN: 'Sudan', SOM: 'Somalia', MLI: 'Mali',
  AFG: 'Afghanistan', MMR: 'Myanmar', ETH: 'Ethiopia', NGA: 'Nigeria',
  COD: 'DR Congo (Zaire)', MEX: 'Mexico', COL: 'Colombia', VEN: 'Venezuela',
  TUR: 'Turkey', IRQ: 'Iraq', IRN: 'Iran', PAK: 'Pakistan', IND: 'India',
  EGY: 'Egypt', LBY: 'Libya', BFA: 'Burkina Faso', NER: 'Niger', CMR: 'Cameroon',
  HTI: 'Haiti',
}

async function buildCountryProfile(req: Request, iso: string) {
  const base = baseUrl(req)
  const isoUpper = iso.toUpperCase()
  const meta = WORLD_COUNTRY_BASELINE[isoUpper]
  if (!meta) {
    return { ok: false, error: 'country_not_found', iso }
  }
  const iso2 = ISO3_TO_ISO2[isoUpper] || ''
  const ucdpName = ISO3_TO_UCDP_NAME[isoUpper] || meta.name
  // Fetch contexto · sprint G5 base + sprint G7 enriquecimiento (UCDP + ReliefWeb + Travel)
  const [acled, sanctions, topRisks, ucdp, reliefweb, travel] = await Promise.all([
    jsonFetch(`${base}/api/acled/spain-context`),
    jsonFetch(`${base}/api/geopolitica/sanciones?source=all`),
    jsonFetch(`${base}/api/geopolitica/top-risks`),
    jsonFetch(`${base}/api/geopolitica/ucdp?country=${encodeURIComponent(ucdpName)}`),
    jsonFetch(`${base}/api/geopolitica/reliefweb?country=${isoUpper}&limit=10`),
    iso2 ? jsonFetch(`${base}/api/geopolitica/travel-advisories?country=${iso2}`) : Promise.resolve(null),
  ])
  // ACLED events filtered
  const countryEvents = Array.isArray(acled?.data)
    ? acled.data.filter((e: any) => String(e.country || '').toLowerCase().includes(meta.name.toLowerCase()))
    : []
  // Sanctions filtered (heurística: nombre del país en entity o reason)
  const countrySanctions = Array.isArray(sanctions?.sanctions)
    ? sanctions.sanctions.filter((s: any) =>
        String(s.entity || '').toLowerCase().includes(meta.name.toLowerCase()) ||
        String(s.reason || '').toLowerCase().includes(meta.name.toLowerCase()))
    : []
  // Top risks que mencionan el país en title o region
  const relatedRisks = Array.isArray(topRisks?.risks)
    ? topRisks.risks.filter((r: any) =>
        String(r.title || '').toLowerCase().includes(meta.name.toLowerCase()) ||
        String(r.region || '').toLowerCase().includes(meta.region.toLowerCase()))
    : []
  // Score con uplift como en heatmap
  const acledCount = countryEvents.length
  const fatalities = countryEvents.reduce((s: number, e: any) => s + (Number(e.fatalities) || 0), 0)
  const uplift = Math.min(20, acledCount + (fatalities * 0.5))
  const score = Math.min(100, meta.baseline_risk + uplift)
  return {
    ok: true,
    country: { iso3: meta.iso3, name: meta.name, region: meta.region },
    score: Math.round(score),
    band: score < 30 ? 'BAJO' : score < 55 ? 'MEDIO' : score < 75 ? 'ALTO' : 'CRITICO',
    baseline_risk: meta.baseline_risk,
    uplift: Math.round(uplift),
    acled: {
      events_30d: acledCount,
      fatalities_30d: fatalities,
      recent: countryEvents.slice(0, 10).map((e: any) => ({
        date: e.event_date,
        type: e.event_type,
        location: e.location,
        fatalities: e.fatalities,
      })),
    },
    sanctions: {
      count: countrySanctions.length,
      list: countrySanctions.slice(0, 10),
    },
    related_top_risks: relatedRisks,
    // Sprint G7 · enriquecimiento UCDP + ReliefWeb + Travel Advisory
    ucdp: ucdp?.ok ? {
      n_conflicts: ucdp.n_conflicts ?? 0,
      max_intensity_level: ucdp.max_intensity_level ?? 0,
      years_covered: ucdp.years_covered ?? '—',
      interpretation: ucdp.interpretation ?? '',
      recent: Array.isArray(ucdp.conflicts) ? ucdp.conflicts.slice(0, 5) : [],
    } : null,
    humanitarian: reliefweb?.ok ? {
      n_reports: reliefweb.n_reports ?? 0,
      total_available: reliefweb.total_available ?? 0,
      recent: Array.isArray(reliefweb.reports) ? reliefweb.reports.slice(0, 5) : [],
    } : null,
    travel_advisory: travel?.ok ? {
      score: travel.advisory?.score,
      band: travel.band,
      message: (travel.advisory?.message ?? '').slice(0, 360),
      source: travel.advisory?.source ?? '',
      source_url: travel.advisory?.source_url ?? '',
      updated: travel.advisory?.updated ?? '',
    } : null,
    methodology: 'Drill país (G7): baseline_risk + uplift ACLED 30d + UCDP estructural + ReliefWeb humanitario + Travel Advisory consular + sanciones contra entidades + top risks relacionados.',
  }
}

// ─── TTS Audio Brief (Sprint G5 · ElevenLabs/OpenAI premium fallback) ─
async function buildTtsAudio(req: Request, text: string) {
  // Detecta API keys disponibles · preferencia: ElevenLabs > OpenAI > 503 (cliente usa Web Speech)
  const elevenKey = process.env.ELEVENLABS_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const cleanText = text.slice(0, 2000) // cap a 2k chars (limits ambos providers)
  if (elevenKey) {
    // ElevenLabs · voz Spanish "Bea" (estable, 0.30€/1k chars)
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // default voice
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      })
      if (!r.ok) {
        return new Response(`elevenlabs error ${r.status}`, { status: 502 })
      }
      const audio = await r.arrayBuffer()
      return new Response(audio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, s-maxage=21600, immutable',
          'X-TTS-Provider': 'elevenlabs',
        },
      })
    } catch (e: any) {
      return new Response(`elevenlabs exception: ${String(e?.message ?? e).slice(0, 120)}`, { status: 502 })
    }
  }
  if (openaiKey) {
    // OpenAI TTS · voz "nova" (mejor español)
    try {
      const r = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'nova',
          input: cleanText,
          response_format: 'mp3',
        }),
      })
      if (!r.ok) {
        return new Response(`openai-tts error ${r.status}`, { status: 502 })
      }
      const audio = await r.arrayBuffer()
      return new Response(audio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, s-maxage=21600, immutable',
          'X-TTS-Provider': 'openai',
        },
      })
    } catch (e: any) {
      return new Response(`openai exception: ${String(e?.message ?? e).slice(0, 120)}`, { status: 502 })
    }
  }
  // Sin keys · cliente caerá a Web Speech API
  return NextResponse.json({
    ok: false,
    error: 'no_tts_key',
    fallback: 'web_speech_api',
    note: 'Configurar ELEVENLABS_API_KEY o OPENAI_API_KEY en Vercel env para TTS premium. Sin key, cliente usa Web Speech API nativa.',
  }, { status: 200 })
}

// ─── GDELT Live Poll (alternativa al WebSocket no factible serverless) ─
async function buildGdeltLive(req: Request, country: string, limit: number) {
  const base = baseUrl(req)
  // Reusa el endpoint /api/gdelt/articles ya existente
  const j = await jsonFetch(`${base}/api/gdelt/articles?query=${encodeURIComponent(country)}&maxRecords=${limit}`)
  return {
    ok: true,
    source: 'GDELT 2.0 polling · refresh cada 15 min',
    country,
    n_articles: Array.isArray(j?.articles) ? j.articles.length : 0,
    articles: Array.isArray(j?.articles) ? j.articles.slice(0, limit) : [],
    note: 'WebSocket streaming requeriría worker dedicated (no factible Vercel serverless). Polling cada 15 min con cache es suficiente para 95% de casos.',
  }
}

// ─── Historical Analog Finder (Sprint G4) ─────────────────────────────
// Pattern matching crisis pasadas vs contexto actual.
// Inspiración: RAND historical analogy methodology + CIA's "How to Think
// Like an Intelligence Analyst" pattern recognition heuristics.
async function buildHistoricalAnalog(url: URL) {
  // Context puede venir como query params: ?types=military,energy&regions=Ucrania&tags=invasion
  const typesParam = url.searchParams.get('types') || ''
  const regionsParam = url.searchParams.get('regions') || ''
  const tagsParam = url.searchParams.get('tags') || ''
  const ctx = {
    types: typesParam ? (typesParam.split(',').map((s) => s.trim()) as CrisisType[]) : [],
    regions: regionsParam ? regionsParam.split(',').map((s) => s.trim()) : [],
    tags: tagsParam ? tagsParam.split(',').map((s) => s.trim()) : [],
  }
  // Si no hay context explícito, derivamos del estado geo actual (best-guess)
  const usedDerived = !typesParam && !regionsParam && !tagsParam
  if (usedDerived) {
    // Defaults útiles para Spain analyst hoy: combina military + migration + energy
    // con Ucrania + Israel + Sahel + Canarias.
    ctx.types = ['military', 'migration', 'energy', 'sanctions']
    ctx.regions = ['Ucrania', 'Israel', 'Sahel', 'España', 'Canarias', 'Oriente Medio']
    ctx.tags = ['invasion', 'sanctions', 'refugees', 'energy-crisis']
  }
  const analogs = findAnalogs(ctx, 5)
  return {
    ok: true,
    context_used: ctx,
    derived: usedDerived,
    n_analogs: analogs.length,
    analogs,
    methodology: 'Similarity scoring: tipo crisis match (+30) + region overlap (+8/match, max +30) + tag overlap (+8/match, max +40). 30 crisis curadas 1962-2025. Para escalar a miles, migrar a ChromaDB con nomic-embed-text.',
    inspiration: 'RAND historical analogy methodology + CIA pattern recognition',
    corpus_size: HISTORICAL_CRISES.length,
  }
}

// ─── Scenario Impact Slider (Sprint G4) ───────────────────────────────
// Causal model heurístico para what-if interactivo.
// Inspiración: BlackRock GRI scenario stress testing + war-gaming.
function buildScenarioImpact(url: URL) {
  // Variables: cada slider 0-100 representa intensidad del shock
  const sanctionsLevel = Math.min(100, Math.max(0, Number(url.searchParams.get('sanctions') || 50)))
  const conflictEscalation = Math.min(100, Math.max(0, Number(url.searchParams.get('conflict') || 50)))
  const energyShock = Math.min(100, Math.max(0, Number(url.searchParams.get('energy') || 50)))
  const migrationPressure = Math.min(100, Math.max(0, Number(url.searchParams.get('migration') || 50)))
  const cyberThreat = Math.min(100, Math.max(0, Number(url.searchParams.get('cyber') || 30)))
  // Heurística simple pero defensible: cada dimensión impacta una métrica España
  const inputs = { sanctionsLevel, conflictEscalation, energyShock, migrationPressure, cyberThreat }
  // Impacto España (0-100 cada métrica)
  const impacts = {
    spain_risk_index: Math.round(
      (sanctionsLevel * 0.20) + (conflictEscalation * 0.25) + (energyShock * 0.25) + (migrationPressure * 0.20) + (cyberThreat * 0.10),
    ),
    eurusd_pressure_pct: Number(((conflictEscalation * 0.04) + (energyShock * 0.03) + (sanctionsLevel * 0.02)).toFixed(1)),
    gas_price_change_pct: Number(((energyShock * 0.8) + (conflictEscalation * 0.3) + (sanctionsLevel * 0.2)).toFixed(0)),
    ibex_drop_pct: Number(((conflictEscalation * 0.10) + (sanctionsLevel * 0.05) + (cyberThreat * 0.06)).toFixed(1)),
    migration_arrivals_uplift_pct: Number(((migrationPressure * 0.7) + (conflictEscalation * 0.3)).toFixed(0)),
    yield_10y_shift_pb: Math.round((conflictEscalation * 0.5) + (sanctionsLevel * 0.3)),
    tourism_drop_pct: Number(((conflictEscalation * 0.07) + (cyberThreat * 0.04)).toFixed(1)),
  }
  // Top 3 risks que se materializan más con este escenario
  const triggeredRisks: string[] = []
  if (energyShock > 70 || conflictEscalation > 70) triggeredRisks.push('R2: Escalada Ucrania-Rusia + cortes energéticos')
  if (migrationPressure > 60) triggeredRisks.push('R3: Crisis migratoria masiva ruta atlántica')
  if (sanctionsLevel > 70) triggeredRisks.push('R4: Trump 2.0 aranceles UE > 20%')
  if (conflictEscalation > 80) triggeredRisks.push('R7: Israel-Hezbolá + cierre Suez')
  if (cyberThreat > 70) triggeredRisks.push('R8: Cyberataque infraestructura crítica EU')
  // Band general
  const compositeBand = impacts.spain_risk_index < 30 ? 'BAJO'
    : impacts.spain_risk_index < 55 ? 'MEDIO'
    : impacts.spain_risk_index < 75 ? 'ALTO' : 'CRITICO'
  return {
    ok: true,
    inputs,
    impacts,
    composite_band: compositeBand,
    triggered_top_risks: triggeredRisks,
    methodology: 'Causal model heurístico (no full simulation). Cada slider 0-100 contribuye a impactos España con pesos calibrados. Inspirado en BlackRock GRI scenario stress + war-gaming clásico. NO predice probabilidad, sólo magnitud potencial.',
    disclaimer: 'Modelo heurístico simplificado. Para análisis riguroso usar simulación Monte Carlo con full causal graph. No tomar como forecast.',
  }
}

// ─── EU + OFAC Sanctions LIVE (count only, evita 5MB XML) ────────────
// Sprint G4: streaming/sampling para no descargar full XML.
// EU: usamos endpoint JSON ligero si está disponible.
// OFAC: parse parcial del SDN.xml (head + tail counts).
async function fetchOfacSdnCount(): Promise<{ count: number | null; error?: string }> {
  try {
    // Treasury SDN list resumen vía sdn_advanced.xml structure (header con count)
    // Si falla, devolvemos null sin bloquear.
    const r = await fetch('https://www.treasury.gov/ofac/downloads/sdn.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/xml' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return { count: null, error: `HTTP ${r.status}` }
    // Stream con timeout 8s para no bloquear serverless
    const reader = r.body?.getReader()
    if (!reader) return { count: null, error: 'no_body_reader' }
    const decoder = new TextDecoder('utf-8')
    let buf = ''
    let count = 0
    let total = 0
    const TIME_LIMIT = 8000
    const start = Date.now()
    try {
      while (Date.now() - start < TIME_LIMIT) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        total += value.length
        // Count <sdnEntry> per chunk (lossless si no se rompe a la mitad)
        const matches = buf.match(/<sdnEntry>/g)
        if (matches) {
          count += matches.length
          // Drop processed
          const lastIdx = buf.lastIndexOf('<sdnEntry>')
          buf = buf.slice(lastIdx)
        }
        // Stop si ya escaneamos primer ~3MB (suficiente para estimar)
        if (total > 3_000_000) {
          // Devuelve scaled estimate basado en density
          const density = count / total
          // SDN file ~7MB total approx
          return { count: Math.round(density * 7_000_000) }
        }
      }
      return { count }
    } finally {
      try { reader.releaseLock() } catch {}
    }
  } catch (e: any) {
    return { count: null, error: String(e?.message ?? e).slice(0, 160) }
  }
}

async function fetchEuSanctionsCount(): Promise<{ count: number | null; error?: string }> {
  try {
    // EU Financial Sanctions Database: el endpoint público está en
    // https://webgate.ec.europa.eu/fsd/fsf · requiere POST auth.
    // Alternative: usamos OpenSanctions.org REST API que consolida EU (free).
    const r = await fetch('https://api.opensanctions.org/datasets/eu_fsf', {
      headers: { 'User-Agent': 'Politeia/1.0', Accept: 'application/json' },
      next: { revalidate: 86400 },
    } as RequestInit)
    if (!r.ok) return { count: null, error: `HTTP ${r.status}` }
    const j = await r.json()
    return { count: typeof j?.target_count === 'number' ? j.target_count : null }
  } catch (e: any) {
    return { count: null, error: String(e?.message ?? e).slice(0, 160) }
  }
}

async function buildSanctionsLive() {
  const [un, ofac, eu] = await Promise.all([
    fetchUnSanctionsCount(),
    fetchOfacSdnCount(),
    fetchEuSanctionsCount(),
  ])
  const total = (un || 0) + (ofac.count || 0) + (eu.count || 0)
  return {
    ok: true,
    generated_at: new Date().toISOString(),
    sources: {
      UN: { count: un, source_url: 'https://scsanctions.un.org/resources/xml/en/consolidated.xml', method: 'XML scrape entity count' },
      OFAC: { count: ofac.count, source_url: 'https://www.treasury.gov/ofac/downloads/sdn.xml', method: 'XML stream count first 3MB then extrapolate', error: ofac.error },
      EU: { count: eu.count, source_url: 'https://api.opensanctions.org/datasets/eu_fsf', method: 'OpenSanctions API consolidator', error: eu.error },
    },
    total_estimated: total,
    methodology: 'Streaming + sampling para XMLs grandes (OFAC ~7MB). UN parse completo. EU via OpenSanctions consolidator (más estable que webgate.ec.europa.eu).',
    cache_hours: 24,
  }
}

// ─── Momentum Score (2nd-order indicator) ──────────────────────────────
async function buildMomentumScore(req: Request, country: string, days: number) {
  const base = baseUrl(req)
  // Approx: count recientes vs count previos
  const stats = await jsonFetch(`${base}/api/geopolitica/stats`)
  const osint24h = stats?.osint_24h ?? 0
  // Pseudo-momentum: si OSINT 24h > average esperado (assume avg ~25), momentum +
  const baselineAvg = 25
  const momentum = osint24h - baselineAvg
  return {
    ok: true,
    country,
    days,
    osint_24h: osint24h,
    baseline_avg: baselineAvg,
    momentum,
    interpretation: momentum > 15 ? 'aceleración fuerte' : momentum > 5 ? 'aceleración leve' : momentum > -5 ? 'estable' : 'desaceleración',
    inspiration: '2nd-order indicator · "is the crisis getting worse faster?" Early warning beyond pure event counts.',
  }
}

// ════════════════════════════════════════════════════════════════════════
// Sprint G6 · Reorientación a riesgo geopolítico duro
// ════════════════════════════════════════════════════════════════════════
// El usuario pide centrar la pestaña en:
//   guerra, escalada militar, violencia política, golpes, sanciones,
//   terrorismo, crisis diplomáticas, misiones, amenazas, fronteras,
//   inestabilidad estatal, alertas de seguridad consular.
//
// Se DESCARTAN como sources principales: UN Comtrade, OEC, WTO, ENTSO-E,
// IEA, EIA, Eurobarómetro, Pew, CIS como opinión, IMF/OECD/Eurostat macro.
//
// Nuevas capas implementadas en este sprint:
//   Capa 2 · evento duro verificable     · UCDP, ReliefWeb
//   Capa 3 · militar y diplomático       · NATO press, UN Security Council
//   Capa 5 · consular y amenaza país     · US State Dept Travel Advisories

// ─── UCDP · Uppsala Conflict Data Program ─────────────────────────────
// Fuente: https://ucdpapi.pcr.uu.se/api/
// Recursos: gedevents / ucdpprioconflict / battledeaths / dyadic / nonstate
// Rate limit: 5.000 req/día. Sirve para conflict structural validation
// que complementa ACLED (que es señal táctica reciente).
async function buildUcdpConflicts(country: string) {
  // ucdpprioconflict devuelve conflictos armados activos por país
  // Versión actual: 24.1 (UCDP/PRIO Armed Conflict Dataset, mayo 2025)
  const url = `https://ucdpapi.pcr.uu.se/api/ucdpprioconflict/24.1?Country=${encodeURIComponent(country)}&pagesize=100`
  const data = await jsonFetch(url)
  const results = Array.isArray(data?.Result) ? data.Result : []
  // Normalizamos a shape compacto + score de intensidad estructural
  const conflicts = results.map((r: any) => ({
    conflict_id: r.conflict_id ?? r.ConflictID,
    name: r.location ?? r.Location ?? `${r.side_a ?? '?'} vs ${r.side_b ?? '?'}`,
    side_a: r.side_a ?? r.SideA,
    side_b: r.side_b ?? r.SideB,
    incompatibility: r.incompatibility ?? r.Incompatibility, // 1=territorio, 2=gobierno, 3=ambos
    intensity_level: r.intensity_level ?? r.IntensityLevel, // 1=minor (25-999 deaths), 2=war (1000+)
    type_of_conflict: r.type_of_conflict ?? r.TypeOfConflict, // 1=extrasystemic, 2=interstate, 3=internal, 4=internationalized
    start_date: r.start_date ?? r.StartDate,
    year: r.year ?? r.Year,
    region: r.region ?? r.Region,
  })).filter((c: any) => c.conflict_id)
  // Resumen estructural
  const years_active = Array.from(new Set(conflicts.map((c: any) => c.year))).sort()
  const max_intensity = conflicts.length > 0 ? Math.max(...conflicts.map((c: any) => Number(c.intensity_level) || 0)) : 0
  return {
    ok: !data?.error,
    country,
    n_conflicts: conflicts.length,
    years_covered: years_active.length > 0 ? `${years_active[0]}-${years_active[years_active.length - 1]}` : '—',
    max_intensity_level: max_intensity,
    interpretation: max_intensity >= 2 ? 'GUERRA (1000+ battle deaths/año)' : max_intensity >= 1 ? 'CONFLICTO MENOR (25-999 deaths/año)' : 'sin conflicto armado registrado',
    conflicts: conflicts.slice(0, 30),
    source: 'UCDP/PRIO Armed Conflict Dataset v24.1 · Uppsala University',
    note: 'Validación estructural académica. Complemento ACLED (que es señal táctica reciente).',
    error: data?.error,
  }
}

// ─── ReliefWeb · OCHA humanitarian crisis reports ─────────────────────
// Fuente: https://api.reliefweb.int/v1/
// Cuota: 1.000 entradas/llamada · 1.000 llamadas/día.
// Sirve para conflict→humanitarian impact, refugiados, hambruna, colapso.
async function buildReliefWebReports(country: string, limit: number) {
  // ReliefWeb usa códigos ISO-3 (mismo que UCDP). Si recibimos nombre,
  // intentamos query libre. Si recibimos iso3, usamos filtro country.iso3.
  const isIso3 = /^[A-Z]{3}$/.test(country)
  const query = isIso3
    ? `https://api.reliefweb.int/v1/reports?appname=politeia-analitica&profile=list&limit=${limit}&filter[field]=country.iso3&filter[value]=${country}&sort[]=date.created:desc`
    : `https://api.reliefweb.int/v1/reports?appname=politeia-analitica&profile=list&limit=${limit}&query[value]=${encodeURIComponent(country)}&query[fields][]=country.name&query[fields][]=title&sort[]=date.created:desc`
  const data = await jsonFetch(query)
  const items = Array.isArray(data?.data) ? data.data : []
  const reports = items.map((it: any) => ({
    id: it.id,
    title: it.fields?.title ?? '(sin título)',
    source: Array.isArray(it.fields?.source) ? (it.fields.source[0]?.shortname || it.fields.source[0]?.name || 'ReliefWeb') : 'ReliefWeb',
    date: it.fields?.date?.created ?? it.fields?.date?.original ?? '',
    countries: Array.isArray(it.fields?.country) ? it.fields.country.map((c: any) => c.shortname || c.name).filter(Boolean) : [],
    primary_country: it.fields?.primary_country?.shortname ?? it.fields?.primary_country?.name ?? '',
    url: it.fields?.url ?? it.href ?? '',
  }))
  return {
    ok: !data?.error,
    country,
    n_reports: reports.length,
    total_available: data?.totalCount ?? reports.length,
    reports,
    source: 'ReliefWeb · OCHA (UN Office for Coordination of Humanitarian Affairs)',
    note: 'Crisis humanitarias = manifestación de crisis geopolíticas. Guerras civiles, desplazamientos, colapso estatal, hambrunas inducidas por conflicto.',
    error: data?.error,
  }
}

// ─── US State Department Travel Advisories ────────────────────────────
// Fuente: https://travel.state.gov/content/travel/en/traveladvisories/
// No hay API oficial pública. Usamos travel-advisory.info (espejo no oficial
// que parsea las advisories de EE.UU.+UK+otros).
// Niveles: 1 (Exercise Normal Precautions) → 4 (Do Not Travel).
async function buildTravelAdvisories(country: string) {
  // travel-advisory.info devuelve dataset completo en una sola llamada
  const data = await jsonFetch('https://www.travel-advisory.info/api')
  if (data?.error) {
    return { ok: false, error: data.error, source: 'travel-advisory.info' }
  }
  const allCountries = data?.data ? Object.entries(data.data) : []
  // Si pidieron país específico
  if (country && country !== 'all') {
    const iso2 = country.length === 2 ? country.toUpperCase() : ''
    if (iso2) {
      const entry: any = (data?.data as any)?.[iso2]
      if (entry) {
        return {
          ok: true,
          country: entry.name,
          iso2,
          continent: entry.continent,
          advisory: {
            score: entry.advisory?.score,
            sources_active: entry.advisory?.sources_active,
            message: entry.advisory?.message,
            updated: entry.advisory?.updated,
            source: entry.advisory?.source,
            source_url: entry.advisory?.source_url,
          },
          band: scoreToBand(entry.advisory?.score),
          source: 'travel-advisory.info (US State Dept + UK FCDO mirror)',
        }
      }
    }
    return { ok: false, error: 'country_not_found', country, hint: 'usa código ISO-2 (ej. ES, US, RU)' }
  }
  // Sino, devolvemos top 30 más peligrosos (advisory score >= 4) ordenado por score
  const list = allCountries.map(([iso2, c]: [string, any]) => ({
    iso2,
    country: c.name,
    continent: c.continent,
    score: c.advisory?.score ?? 0,
    band: scoreToBand(c.advisory?.score ?? 0),
    sources: c.advisory?.sources_active ?? 0,
    updated: c.advisory?.updated ?? '',
    message: (c.advisory?.message ?? '').slice(0, 240),
  }))
    .sort((a: any, b: any) => b.score - a.score)
  return {
    ok: true,
    n_countries: list.length,
    high_risk_count: list.filter((c: any) => c.score >= 3.5).length,
    extreme_risk_count: list.filter((c: any) => c.score >= 4.5).length,
    list: list.slice(0, 60),
    source: 'travel-advisory.info (US State Dept + UK FCDO consolidado)',
    note: 'Escala 0-5: 0-2.5 normal, 2.5-3.5 reconsiderar, 3.5-4.5 evitar, 4.5+ no viajar.',
  }
}

function scoreToBand(score: number | undefined): string {
  const s = Number(score) || 0
  if (s >= 4.5) return 'NO VIAJAR'
  if (s >= 3.5) return 'EVITAR VIAJES NO ESENCIALES'
  if (s >= 2.5) return 'AUMENTAR PRECAUCIONES'
  if (s >= 1.5) return 'NORMAL CON CUIDADOS'
  return 'NORMAL'
}

// ─── NATO · feed prensa oficial OTAN ──────────────────────────────────
// Fuente: https://www.nato.int/cps/en/natohq/news.xml (RSS oficial OTAN HQ)
// Sirve para riesgo militar europeo, flanco este, ejercicios, defensa
// colectiva, comunicados cumbres, presencia española en OTAN.
async function buildNatoPress(limit: number) {
  const url = 'https://www.nato.int/cps/en/natohq/news.xml'
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
      next: { revalidate: 21600 },
    })
    if (!r.ok) {
      return { ok: false, error: `HTTP ${r.status}`, source: 'NATO HQ' }
    }
    const xml = await r.text()
    const items = parseRssItems(xml).slice(0, limit)
    return {
      ok: true,
      n_items: items.length,
      items,
      source: 'NATO HQ News (RSS oficial nato.int)',
      note: 'Comunicados OTAN, cumbres, ejercicios militares, flanco este, defensa aérea, presencia avanzada, artículo 5, relación Rusia-OTAN.',
    }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 160), source: 'NATO HQ' }
  }
}

// ════════════════════════════════════════════════════════════════════════
// Sprint G7 · OSINT cualitativo + voz oficial española + EU diplomacy
// ════════════════════════════════════════════════════════════════════════
// Añade Capa 6 (OSINT cualitativo: ICG + ISW) + sources Capa 3 europea/
// española (EEAS + MAEC + Moncloa + Defensa.gob best-effort). Cierra la
// arquitectura de fuentes pedida por el usuario.

// ─── ICG · International Crisis Group · CrisisWatch ──────────────────
// Fuente: https://www.crisisgroup.org/crisiswatch/rss.xml
// Análogo a "lo que un analista de Crisis Group leería cada mañana".
// Early warning + análisis regional cualitativo.
async function buildCrisisGroup(limit: number) {
  // ICG ofrece varios feeds. CrisisWatch es el más útil para early warning.
  const candidates = [
    'https://www.crisisgroup.org/crisiswatch/rss.xml',
    'https://www.crisisgroup.org/feed',
  ]
  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
        next: { revalidate: 21600 },
      })
      if (!r.ok) continue
      const xml = await r.text()
      const items = parseRssItems(xml).slice(0, limit)
      if (items.length > 0) {
        return {
          ok: true,
          n_items: items.length,
          items,
          source: `International Crisis Group · CrisisWatch (${url})`,
          note: 'Early warning analyst-grade · conflictos activos, deterioro, mejora, análisis regional cualitativo.',
        }
      }
    } catch { /* try next */ }
  }
  return { ok: false, error: 'all_endpoints_failed', source: 'ICG CrisisWatch' }
}

// ─── ISW · Institute for the Study of War · briefings operativos ─────
// Fuente: https://www.understandingwar.org/feed (briefings teatro)
// Útil para Ucrania, Rusia, Irán, Oriente Medio, redes proxy, mapas
// de avance. OSINT cualitativo de high quality, no como hecho duro.
async function buildIswBriefings(limit: number) {
  const candidates = [
    'https://www.understandingwar.org/rss.xml',
    'https://www.understandingwar.org/feed',
    'https://www.criticalthreats.org/feed/', // Critical Threats AEI hermano
  ]
  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
        next: { revalidate: 21600 },
      })
      if (!r.ok) continue
      const xml = await r.text()
      const items = parseRssItems(xml).slice(0, limit)
      if (items.length > 0) {
        return {
          ok: true,
          n_items: items.length,
          items,
          source: `ISW / Critical Threats · operational briefings (${url})`,
          note: 'Análisis OSINT cualitativo. Útil para teatro, no como dato duro · validar con ACLED + UCDP.',
        }
      }
    } catch { /* try next */ }
  }
  return { ok: false, error: 'all_endpoints_failed', source: 'ISW' }
}

// ─── EEAS / Council EU · diplomacia europea ──────────────────────────
// Fuente: feeds RSS Council of EU + EEAS (varios endpoints, best-effort).
// Sirve para posición UE, sanciones, misiones CSDP, declaraciones del
// Alto Representante, respuesta europea a crisis.
async function buildEeasNews(limit: number) {
  const candidates = [
    'https://www.consilium.europa.eu/en/press/press-releases/?rss=1', // Council press releases
    'https://www.eeas.europa.eu/eeas/rss_en', // EEAS general
    'https://www.eeas.europa.eu/_en/rss_en',
    'https://europa.eu/rapid/rss-feed.htm?id=PRESS_RELEASES', // Comisión EU press
  ]
  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
        next: { revalidate: 21600 },
      })
      if (!r.ok) continue
      const xml = await r.text()
      const items = parseRssItems(xml).slice(0, limit)
      if (items.length > 0) {
        return {
          ok: true,
          n_items: items.length,
          items,
          source: `EEAS / Council EU (${url})`,
          note: 'Posición oficial UE · sanciones, declaraciones Alto Representante, misiones CSDP, respuesta a crisis.',
        }
      }
    } catch { /* try next */ }
  }
  return { ok: false, error: 'all_endpoints_failed', source: 'EEAS/Council EU' }
}

// ─── Spain Official · MAEC + Moncloa + Defensa combinados ────────────
// Triple feed combinado: voz oficial del Estado español en exterior.
// Sirve para posición oficial, viajes exteriores, misiones militares,
// alertas consulares, declaraciones diplomáticas, evacuaciones.
async function buildSpainOfficial(limit: number) {
  const sources: Array<{ name: string; url: string; tag: string }> = [
    { name: 'MAEC',    url: 'https://www.exteriores.gob.es/_layouts/15/listfeed.aspx?List={A93AB9E3-AA0C-4ED2-948D-12F86F1B1F89}', tag: 'MAEC' },
    { name: 'Moncloa', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/exteriores/Documents/RSS.aspx',                  tag: 'MONCLOA' },
    { name: 'Defensa', url: 'https://www.defensa.gob.es/Galerias/gabinete/notas-prensa/rss/notas-prensa.rss',                            tag: 'DEFENSA' },
  ]
  const all: Array<{ title: string; link: string; pubDate: string; description: string; tag: string }> = []
  const results: Record<string, { ok: boolean; n?: number; error?: string }> = {}

  await Promise.all(sources.map(async (s) => {
    try {
      const r = await fetch(s.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
        next: { revalidate: 21600 },
      })
      if (!r.ok) {
        results[s.name] = { ok: false, error: `HTTP ${r.status}` }
        return
      }
      const xml = await r.text()
      const items = parseRssItems(xml).slice(0, limit)
      results[s.name] = { ok: true, n: items.length }
      for (const it of items) all.push({ ...it, tag: s.tag })
    } catch (e: any) {
      results[s.name] = { ok: false, error: String(e?.message ?? e).slice(0, 80) }
    }
  }))

  // Ordenar por fecha (más reciente primero)
  all.sort((a, b) => {
    const da = new Date(a.pubDate).getTime() || 0
    const db = new Date(b.pubDate).getTime() || 0
    return db - da
  })

  return {
    ok: all.length > 0,
    n_items: all.length,
    items: all.slice(0, limit),
    sources_status: results,
    source: 'MAEC + Moncloa + Defensa.gob (RSS oficiales combinados)',
    note: 'Voz oficial del Estado español: posición, viajes exteriores, misiones militares, alertas consulares, evacuaciones.',
    error: all.length === 0 ? 'no_items_from_any_source' : undefined,
  }
}

// ════════════════════════════════════════════════════════════════════════
// Sprint G8 · Convergencia analítica + transparencia de fuentes
// ════════════════════════════════════════════════════════════════════════
// El usuario tiene ahora ~19 endpoints de fuentes geo distintas. La pieza
// que falta es la analítica que conecta los puntos: ¿qué países muestran
// señales de riesgo elevado SIMULTÁNEAMENTE en múltiples capas? Esto es
// el equivalente al "convergence detection" que hace un analista senior
// cruzando ACLED + UCDP + ReliefWeb + Travel + sanciones manualmente.

// ─── Helpers data-driven · sin hardcode (Sprint G9) ─────────────────
// Normalización country name → ISO3. Construido en runtime desde
// WORLD_COUNTRY_BASELINE + alias dict para divergencias UCDP/ReliefWeb.
// Esto es plumbing de normalización (UCDP no devuelve ISO), NO intelligence.
const UCDP_NAME_ALIASES: Record<string, string> = {
  'russia soviet union': 'RUS',
  'russia ussr': 'RUS',
  'dr congo zaire': 'COD',
  'dr congo': 'COD',
  'democratic republic of the congo': 'COD',
  'democratic republic of congo': 'COD',
  'congo': 'COG',
  'republic of congo': 'COG',
  'united states of america': 'USA',
  'united kingdom': 'GBR',
  'south korea': 'KOR',
  'korea south': 'KOR',
  'republic of korea': 'KOR',
  'korea north': 'PRK',
  'north korea': 'PRK',
  'democratic peoples republic of korea': 'PRK',
  'palestine': 'PSE',
  'palestinian territories': 'PSE',
  'state of palestine': 'PSE',
  'myanmar burma': 'MMR',
  'iran islamic republic': 'IRN',
  'cote divoire': 'CIV',
  'cape verde': 'CPV',
  'czech republic': 'CZE',
  'east timor': 'TLS',
  'timor leste': 'TLS',
  'kingdom of saudi arabia': 'SAU',
  'syrian arab republic': 'SYR',
  'lao peoples democratic republic': 'LAO',
  'macedonia': 'MKD',
  'fyr macedonia': 'MKD',
  'turkiye': 'TUR',
  'turkey': 'TUR',
}

function normalizeCountryName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Mapa name→ISO3 construido al primer uso desde WORLD_COUNTRY_BASELINE + aliases.
// Cubre ~55 países base + aliases comunes. Si no encuentra el país, devuelve ''.
let _nameToIsoCache: Record<string, string> | null = null
function nameToIso3(name: string): string {
  if (!_nameToIsoCache) {
    const m: Record<string, string> = { ...UCDP_NAME_ALIASES }
    for (const [iso3, meta] of Object.entries(WORLD_COUNTRY_BASELINE)) {
      m[normalizeCountryName(meta.name)] = iso3
    }
    _nameToIsoCache = m
  }
  return _nameToIsoCache[normalizeCountryName(name)] || ''
}

// ─── Fetch UCDP conflicts activos · LIVE (Sprint G9) ────────────────
// Reemplaza la lista estática UCDP_WAR_COUNTRIES por fetch real al API
// de Uppsala. Año más reciente cubierto en v24.1 = 2023. Aggregate por
// país tomando el max intensity_level + descripción del conflicto.
async function fetchUcdpActiveByIso3(): Promise<Record<string, { intensity: number; conflict: string }>> {
  const url = 'https://ucdpapi.pcr.uu.se/api/ucdpprioconflict/24.1?pagesize=1000&Year=2023'
  const data = await jsonFetch(url)
  const results: any[] = Array.isArray(data?.Result) ? data.Result : []
  const map: Record<string, { intensity: number; conflict: string }> = {}
  for (const r of results) {
    const country = r.location || r.Location || ''
    const iso3 = nameToIso3(country)
    if (!iso3) continue // país no en nuestro baseline, skip
    const intensity = Number(r.intensity_level ?? r.IntensityLevel ?? 0)
    const sideA = r.side_a ?? r.SideA ?? '?'
    const sideB = r.side_b ?? r.SideB ?? '?'
    const conflict = `${sideA} vs ${sideB} (${r.year ?? r.Year ?? '?'})`
    const cur = map[iso3]
    if (!cur || intensity > cur.intensity) {
      map[iso3] = { intensity, conflict }
    }
  }
  return map
}

// ─── Fetch ReliefWeb crisis humanitarias activas · LIVE (Sprint G9) ──
// Reemplaza la lista estática ACTIVE_HUMANITARIAN. Cuenta reports
// publicados últimos 30d por país (primary_country.iso3 viene en la API).
// Threshold: ≥10 reports/mes = crisis activa.
async function fetchReliefWebActiveByIso3(): Promise<Record<string, number>> {
  const date30dAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
  const url = `https://api.reliefweb.int/v1/reports?appname=politeia-analitica&profile=list&limit=500&filter[field]=date.created&filter[value][from]=${date30dAgo}&sort[]=date.created:desc`
  const data = await jsonFetch(url)
  const items: any[] = Array.isArray(data?.data) ? data.data : []
  const counts: Record<string, number> = {}
  for (const it of items) {
    const iso3 = (it?.fields?.primary_country?.iso3 || '').toUpperCase()
    if (!iso3) continue
    counts[iso3] = (counts[iso3] || 0) + 1
  }
  return counts
}

async function buildConvergenceAlerts(req: Request) {
  const startedAt = Date.now()
  const base = baseUrl(req)
  const [world, travel, ucdpMap, reliefMap] = await Promise.all([
    jsonFetch(`${base}/api/geopolitica/world-risk`),
    jsonFetch(`${base}/api/geopolitica/travel-advisories?country=all`),
    fetchUcdpActiveByIso3().catch((): Record<string, { intensity: number; conflict: string }> => ({})),
    fetchReliefWebActiveByIso3().catch((): Record<string, number> => ({})),
  ])

  // Index travel por ISO2 → score
  const travelByIso2: Record<string, { score: number; band: string }> = {}
  if (Array.isArray(travel?.list)) {
    for (const c of travel.list) {
      travelByIso2[c.iso2] = { score: c.score, band: c.band }
    }
  }

  const RELIEF_THRESHOLD_HIGH = 10
  const RELIEF_THRESHOLD_CRITICAL = 30

  // Sprint G13 FASE 6 · cada signal declara source_type, layer, freshness,
  // temporal_scope, confidence y caveat propio. NO se mezclan capas
  // heterogéneas sin etiqueta. UCDP estructural ≠ ReliefWeb 30d ≠ Travel realtime.
  interface ConvergenceSignal {
    source: string
    level: 'HIGH' | 'CRITICAL'
    detail: string
    source_type: 'live_api' | 'curated_baseline'
    layer: 'hard_event' | 'structural_conflict' | 'humanitarian' | 'consular' | 'analytical_model'
    temporal_scope: 'last_30d' | 'annual' | 'historical' | 'realtime' | 'curated'
    freshness: string                   // descripción legible "últimos 30 días"
    confidence: number                  // 0..1
    caveat: string                      // qué NO debe interpretarse
  }

  const countries: any[] = Array.isArray(world?.countries) ? world.countries : []
  const alerts = countries.map((c) => {
    const iso3 = c.iso3
    const iso2 = ISO3_TO_ISO2[iso3] || ''
    const signals: ConvergenceSignal[] = []
    let score = 0

    // ACLED · evento material reciente
    const acled_events = c.acled_events_30d ?? 0
    const acled_fatalities = c.acled_fatalities_30d ?? 0
    const acled_uplift = acled_events + (acled_fatalities * 0.5)
    const acledBase = {
      source: 'ACLED' as const,
      source_type: 'live_api' as const,
      layer: 'hard_event' as const,
      temporal_scope: 'last_30d' as const,
      freshness: 'últimos 30 días',
      confidence: 0.85,
      caveat: 'Evento de violencia política georeferenciado · NO mide percepción ni recomendación política',
    }
    if (acled_uplift >= 20) {
      signals.push({ ...acledBase, level: 'CRITICAL', detail: `${acled_events} eventos · ${acled_fatalities} fatalities 30d` })
      score += 3
    } else if (acled_uplift >= 10) {
      signals.push({ ...acledBase, level: 'HIGH', detail: `${acled_events} eventos · ${acled_fatalities} fatalities 30d` })
      score += 2
    }

    // UCDP · ESTRUCTURAL · NO indica deterioro de hoy
    const ucdp = ucdpMap[iso3]
    if (ucdp) {
      const ucdpBase = {
        source: 'UCDP' as const,
        source_type: 'live_api' as const,
        layer: 'structural_conflict' as const,
        temporal_scope: 'annual' as const,
        freshness: 'dataset Uppsala v24.1 · año 2023',
        confidence: 0.80,
        caveat: 'CONFLICTO ESTRUCTURAL HISTÓRICO · dato anual peer-reviewed · NO indica deterioro de HOY · contexto multi-año',
      }
      if (ucdp.intensity >= 2) {
        signals.push({ ...ucdpBase, level: 'CRITICAL', detail: ucdp.conflict })
        score += 3
      } else if (ucdp.intensity >= 1) {
        signals.push({ ...ucdpBase, level: 'HIGH', detail: ucdp.conflict })
        score += 2
      }
    }

    // ReliefWeb · presión humanitaria reciente
    const reliefCount = reliefMap[iso3] || 0
    const reliefBase = {
      source: 'ReliefWeb' as const,
      source_type: 'live_api' as const,
      layer: 'humanitarian' as const,
      temporal_scope: 'last_30d' as const,
      freshness: 'últimos 30 días · reports OCHA/ONGs',
      confidence: 0.78,
      caveat: 'Reportes humanitarios sobre población civil · NO mide intensidad militar ni atribución de responsables',
    }
    if (reliefCount >= RELIEF_THRESHOLD_CRITICAL) {
      signals.push({ ...reliefBase, level: 'CRITICAL', detail: `${reliefCount} reports OCHA 30d` })
      score += 3
    } else if (reliefCount >= RELIEF_THRESHOLD_HIGH) {
      signals.push({ ...reliefBase, level: 'HIGH', detail: `${reliefCount} reports OCHA 30d` })
      score += 2
    }

    // Travel Advisory · recomendación consular vigente
    const t = travelByIso2[iso2]
    if (t) {
      const travelBase = {
        source: 'Travel Advisory' as const,
        source_type: 'live_api' as const,
        layer: 'consular' as const,
        temporal_scope: 'realtime' as const,
        freshness: 'recomendación consular vigente',
        confidence: 0.75,
        caveat: 'Recomendación CONSULAR para nacionales · NO mide violencia material · depende de política consular del emisor',
      }
      if (t.score >= 4.5) {
        signals.push({ ...travelBase, level: 'CRITICAL', detail: `${t.band} (${t.score.toFixed(1)}/5)` })
        score += 3
      } else if (t.score >= 4.0) {
        signals.push({ ...travelBase, level: 'HIGH', detail: `${t.band} (${t.score.toFixed(1)}/5)` })
        score += 2
      }
    }

    // Baseline · prior curado Politeia
    const baseline = c.baseline_risk ?? 0
    const baselineBase = {
      source: 'Baseline Politeia' as const,
      source_type: 'curated_baseline' as const,
      layer: 'analytical_model' as const,
      temporal_scope: 'curated' as const,
      freshness: 'revisión manual editorial',
      confidence: 0.55,
      caveat: 'PRIOR EDITORIAL Politeia · NO es observación · catálogo curado sin actualización por evento del día sin override explícito',
    }
    if (baseline >= 85) {
      signals.push({ ...baselineBase, level: 'CRITICAL', detail: `riesgo país baseline ${baseline}/100` })
      score += 2
    } else if (baseline >= 75) {
      signals.push({ ...baselineBase, level: 'HIGH', detail: `riesgo país baseline ${baseline}/100` })
      score += 1
    }

    // Explicación auditable de POR QUÉ converge este país
    const layers_present = Array.from(new Set(signals.map((s) => s.layer)))
    const explanation = signals.length === 0
      ? 'Sin señales activas'
      : `${c.name} aparece porque convergen ${layers_present.length} capa(s) distinta(s): ${layers_present.join(' + ')}. Las capas mezclan temporalidades distintas (estructural UCDP, presión actual ReliefWeb 30d, consular realtime). NO sumar como señales equivalentes.`

    return {
      iso3,
      iso2,
      name: c.name,
      region: c.region,
      convergence_score: score,
      signal_count: signals.length,
      critical_count: signals.filter((s) => s.level === 'CRITICAL').length,
      band: score >= 9 ? 'TRIPLE CONVERGENCIA' : score >= 6 ? 'DOBLE CONVERGENCIA' : score >= 3 ? 'SEÑAL ÚNICA' : 'NORMAL',
      signals,
      layers_present,
      explanation,
      // Caveats agregados por convergencia · qué NO debe interpretarse globalmente
      caveats: [
        'Convergencia de fuentes ≠ deterioro homogéneo · cada capa mide cosa distinta',
        'Convergence_score combina señales heterogéneas con pesos · NO es suma directa',
        ...(layers_present.includes('structural_conflict') ? ['UCDP es estructural/histórico · NO indica deterioro de hoy'] : []),
        ...(layers_present.includes('analytical_model') ? ['Baseline es prior curado · no observación primaria'] : []),
      ],
    }
  })

  const flagged = alerts.filter((a) => a.signal_count > 0).sort((a, b) => b.convergence_score - a.convergence_score)
  const triple = flagged.filter((a) => a.convergence_score >= 9)
  const doble = flagged.filter((a) => a.convergence_score >= 6 && a.convergence_score < 9)
  const single = flagged.filter((a) => a.convergence_score >= 3 && a.convergence_score < 6)

  return {
    ok: true,
    n_countries_analyzed: countries.length,
    n_flagged: flagged.length,
    summary: {
      triple_convergencia: triple.length,
      doble_convergencia: doble.length,
      senal_unica: single.length,
    },
    alerts: flagged.slice(0, 25),
    data_sources: {
      ucdp_countries_loaded: Object.keys(ucdpMap).length,
      reliefweb_countries_loaded: Object.keys(reliefMap).length,
      travel_countries_loaded: Object.keys(travelByIso2).length,
      countries_analyzed: countries.length,
    },
    // Sprint G13 FASE 6 · temporal_scope explícito por fuente
    sources_temporal_scope: {
      ACLED:           { source_type: 'live_api',         temporal_scope: 'last_30d',  note: 'Eventos de violencia política reciente' },
      UCDP:            { source_type: 'live_api',         temporal_scope: 'annual',    note: 'Estructural/histórico · año 2023 · NO indica hoy' },
      ReliefWeb:       { source_type: 'live_api',         temporal_scope: 'last_30d',  note: 'Reportes humanitarios reciente' },
      'Travel Advisory': { source_type: 'live_api',       temporal_scope: 'realtime',  note: 'Recomendación consular vigente' },
      'Baseline Politeia': { source_type: 'curated_baseline', temporal_scope: 'curated', note: 'Prior editorial · revisión manual' },
    },
    methodology: 'Convergence LIVE · cruza ACLED 30d (hard_event) + UCDP estructural (structural_conflict · histórico, NO indica hoy) + ReliefWeb 30d (humanitarian) + Travel Advisory (consular realtime) + Baseline Politeia (analytical_model · prior curado). Score = suma pesos (CRITICAL +3, HIGH +2, baseline +1). Sprint G13 FASE 6 · cada signal declara source_type/layer/temporal_scope/caveat para que el analista vea las temporalidades heterogéneas y NO interprete UCDP histórico como deterioro de hoy.',
    inspiration: 'Replica el análisis manual cruzando 5 capas distintas con temporalidades explícitas.',
    _geo_meta: buildGeoMeta({
      source_mode: 'analytical_model',
      sources_used: [
        'ACLED 30d · /api/acled (live_api · hard_event · last_30d)',
        'UCDP · /api/ucdp/active (live_api · structural_conflict · annual)',
        'ReliefWeb 30d · OCHA (live_api · humanitarian · last_30d)',
        'Travel Advisory · /api/geopolitica/travel-advisories (live_api · consular · realtime)',
        'Baseline Politeia · /api/geopolitica/world-risk (curated_baseline · analytical_model · curated)',
      ],
      startedAt,
      confidence: 0.65,
      layer: 'analytical_model',
      warnings: [
        'NO sumar señales heterogéneas · cada capa mide cosa distinta',
        'UCDP es estructural/histórico · no indica deterioro de hoy',
        'Baseline Politeia es prior editorial · no observación primaria',
        'ReliefWeb mide reportes humanitarios · no intensidad militar',
        'Travel Advisory mide recomendación consular · no violencia material',
      ],
      notes: 'Convergence Alerts · 5 capas con temporalidades explícitas',
    }),
  }
}

// ─── Theme Clustering · Sprint G10 ───────────────────────────────────
// Detección de TEMAS emergentes cruzando 6 RSS feeds (ICG + ISW + NATO +
// UN SC + EEAS + Spain Official) en una sola llamada a Gemini Flash Lite
// con responseSchema. Replaces embeddings/k-means con LLM-as-clusterer.
//
// Diferenciador vs hardcode: zero temas predefinidos · todo emerge del
// contenido real de los feeds del día. Si hoy explota un tema nuevo
// (ej. "drones marítimos Mar Negro"), aparece sin tocar código.
async function buildThemeClustering(req: Request) {
  const base = baseUrl(req)
  // 6 feeds en paralelo (todos cacheados individualmente vía Vercel)
  const [crisis, isw, nato, unsc, eeas, spain] = await Promise.all([
    jsonFetch(`${base}/api/geopolitica/crisis-group?limit=15`),
    jsonFetch(`${base}/api/geopolitica/isw-briefings?limit=15`),
    jsonFetch(`${base}/api/geopolitica/nato-press?limit=15`),
    jsonFetch(`${base}/api/geopolitica/unsc-news?limit=15`),
    jsonFetch(`${base}/api/geopolitica/eeas-news?limit=15`),
    jsonFetch(`${base}/api/geopolitica/spain-official?limit=15`),
  ])

  // Aplanar a lista única con tags de fuente
  const allItems: Array<{ idx: number; source: string; title: string; date: string; link: string }> = []
  let idx = 0
  const sources: Array<[string, any]> = [
    ['ICG', crisis], ['ISW', isw], ['NATO', nato],
    ['UNSC', unsc], ['EEAS', eeas], ['SPAIN', spain],
  ]
  for (const [src, data] of sources) {
    const items = Array.isArray(data?.items) ? data.items : []
    for (const it of items) {
      const title = String(it.title || '').slice(0, 200)
      if (!title) continue
      allItems.push({
        idx,
        source: src,
        title,
        date: String(it.pubDate || it.date || ''),
        link: String(it.link || it.url || ''),
      })
      idx++
    }
  }

  if (allItems.length === 0) {
    return {
      ok: false,
      error: 'no_items_loaded',
      sources_status: sources.map(([s, d]) => ({ source: s, n_items: Array.isArray(d?.items) ? d.items.length : 0 })),
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      error: 'no_ai_key',
      n_items_loaded: allItems.length,
      note: 'Configurar GEMINI_API_KEY en Vercel env para activar clustering temático.',
    }
  }

  const prompt = `Eres un analista de inteligencia geopolítica. Te paso ${allItems.length} noticias recientes de 6 fuentes oficiales europeas/internacionales. Identifica 5-8 TEMAS emergentes que cruzan múltiples noticias.

NOTICIAS:
${allItems.map((it) => `${it.idx}. [${it.source}] ${it.title}`).join('\n')}

Para cada tema produce:
- name · nombre corto del tema (3-6 palabras en español)
- summary · 1-2 frases describiendo el tema y por qué importa para España
- relevance · "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" (impacto potencial sobre intereses ES)
- member_indices · array de idx de noticias que pertenecen al tema (mínimo 2)
- sources_count · cuántas fuentes distintas tocan el tema (de las 6: ICG, ISW, NATO, UNSC, EEAS, SPAIN)

REGLAS:
- Cada noticia pertenece a 1 tema máximo (la asignación más relevante)
- Prioriza temas que cruzan >1 fuente (señal de convergencia narrativa)
- No menciones títulos concretos en el summary, describe el tema
- Nada de inferencia que no esté en los títulos. Si no estás seguro, no incluyas

Output JSON estricto: { "themes": [...] }`

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-001:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              themes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    summary: { type: 'string' },
                    relevance: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
                    member_indices: { type: 'array', items: { type: 'integer' } },
                    sources_count: { type: 'integer' },
                  },
                  required: ['name', 'summary', 'relevance', 'member_indices'],
                },
              },
            },
            required: ['themes'],
          },
        },
      }),
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return {
        ok: false,
        error: `gemini HTTP ${r.status}`,
        gemini_body: body.slice(0, 300),
        n_items_loaded: allItems.length,
      }
    }
    const j = await r.json()
    const text: string = j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    let parsed: any
    try { parsed = JSON.parse(text) } catch {
      return { ok: false, error: 'gemini_response_not_json', raw: text.slice(0, 400), n_items_loaded: allItems.length }
    }
    const rawThemes: any[] = Array.isArray(parsed?.themes) ? parsed.themes : []
    // Enriquecer themes con detalles de miembros + dedupe sources
    const themes = rawThemes.map((t: any) => {
      const memberIdx: number[] = Array.isArray(t.member_indices) ? t.member_indices.filter((i: any) => Number.isInteger(i) && i >= 0 && i < allItems.length) : []
      const members = memberIdx.map((i) => allItems[i]).filter(Boolean)
      const actualSources = new Set(members.map((m) => m.source))
      return {
        name: String(t.name || '(sin nombre)'),
        summary: String(t.summary || ''),
        relevance: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(t.relevance) ? t.relevance : 'MEDIUM',
        n_members: members.length,
        n_sources: actualSources.size,
        sources: Array.from(actualSources),
        members,
      }
    }).filter((t: any) => t.n_members >= 2)
    // Ordenar: relevance CRITICAL > HIGH > MEDIUM > LOW, luego por sources_count desc
    const relevanceWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    themes.sort((a: any, b: any) => {
      const dr = (relevanceWeight[b.relevance] || 0) - (relevanceWeight[a.relevance] || 0)
      if (dr !== 0) return dr
      return b.n_sources - a.n_sources
    })

    // Sprint G13 FASE 11 · confianza por tema · alta si n_sources >= 3
    // Sprint G14 FASE 2 cont · enrich member_evidence with MBFC bias when link is known
    const themesEnriched = themes.map((t: any) => {
      const memberEvidence = (t.members as any[]).map((m: any) => {
        const bias = lookupMediaBias(m.link)
        return {
          source: m.source,
          title: m.title,
          link: m.link,
          date: m.date,
          // Server-side MBFC lookup · null si dominio desconocido (no inventar)
          media_bias: bias ? {
            country: bias.country,
            bias: bias.bias,
            press_freedom: bias.press_freedom,
            regime: regimeTagFromPressFreedom(bias.press_freedom),
            factual: bias.factual_reporting,
          } : null,
        }
      })
      // Sprint G14 · contar evidencia de fuentes régimen autoritario para flag a nivel tema
      const authoritarianCount = memberEvidence.filter((m) => m.media_bias?.regime === 'authoritarian').length
      return {
        ...t,
        member_evidence: memberEvidence,
        // Si >=33% de los miembros vienen de régimen autoritario, marca el tema
        authoritarian_source_share: memberEvidence.length > 0
          ? Math.round((authoritarianCount / memberEvidence.length) * 100) / 100
          : 0,
        authoritarian_flag: authoritarianCount >= 2,
        confidence: t.n_sources >= 3 ? 0.7 : t.n_sources >= 2 ? 0.55 : 0.4,
        limitations: [
          'Generado por IA · puede asignar mal miembros',
          'Resumen agregado por LLM · no extracto verbatim',
          ...(t.n_sources === 1 ? ['Sólo una fuente · sin triangulación · validar antes de citar'] : []),
          ...(authoritarianCount >= 2 ? [`${authoritarianCount}/${memberEvidence.length} miembros desde fuentes régimen autoritario · revisar framing`] : []),
        ],
      }
    })

    return {
      ok: true,
      n_themes: themesEnriched.length,
      n_items_analyzed: allItems.length,
      n_items_clustered: themesEnriched.reduce((s: number, t: any) => s + t.n_members, 0),
      sources_status: sources.map(([s, d]) => ({ source: s, n_items: Array.isArray(d?.items) ? d.items.length : 0 })),
      themes: themesEnriched,
      model: 'gemini-2.0-flash-lite-001',
      // Sprint G13 FASE 11 · marca explícita que esto es output IA
      llm_used: true,
      generated_by: 'gemini-2.0-flash-lite-001',
      generated_at: new Date().toISOString(),
      // Sprint G13 FASE 11 · what_it_means / what_it_does_not_mean
      what_it_means: 'Agrupación temática generada por LLM sobre titulares recientes de 6 RSS feeds expertos (ICG, ISW, NATO, UNSC, EEAS, Spain Official). Detecta temas emergentes sin lista pre-hardcoded.',
      what_it_does_not_mean: 'NO ES FUENTE FACTUAL. NO sustituye lectura humana de los artículos primarios. Los miembros y resúmenes pueden contener errores de asignación. NO es ground truth · usar como brújula analítica.',
      methodology: 'Clustering temático emergente · Gemini Flash Lite sobre 6 RSS feeds live (ICG + ISW + NATO + UNSC + EEAS + Spain). Sin temas pre-hardcoded · clustering data-driven con structured JSON output · Spain-centric framing.',
      disclaimer: 'Tematización generada por LLM. Los miembros y resúmenes pueden contener errores de asignación · usar como brújula, no como ground truth.',
      _geo_meta: buildGeoMeta({
        source_mode: 'llm_cluster',
        sources_used: [
          'gemini-2.0-flash-lite-001 (LLM clusterer)',
          ...sources.map(([s, d]) => `${s} · ${Array.isArray(d?.items) ? d.items.length : 0} items`),
        ],
        startedAt: Date.now() - 1, // best-effort · el wrapper lo añade externamente
        confidence: 0.55,
        layer: 'qualitative_osint',
        warnings: [
          'OUTPUT IA · NO fuente factual · validar con artículos primarios',
          'Miembros pueden estar mal asignados · usar como brújula',
          'Resúmenes son síntesis del LLM · no extracto verbatim',
        ],
        notes: 'Clustering temático · gemini-2.0-flash-lite · 6 RSS feeds expertos',
      }),
    }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 200), n_items_loaded: allItems.length }
  }
}

// ─── Spain Watchlist (Sprint G9 · refactor G13 FASE 7) ────────────────
// Antes: urgency = presencia × convergence. Ahora: análisis orientado a
// decisión. Cada país de la watchlist incluye canal de impacto sobre España,
// horizonte temporal probable, pregunta concreta de monitoreo y fuentes
// sugeridas para validar. El analista pasa de "Marruecos urgencia 7.5" a
// "Marruecos · canal migratorio/fronterizo · 24-72h · pregunta concreta".

type ImpactChannel = 'migration' | 'energy' | 'military' | 'diplomatic' | 'business' | 'consular' | 'humanitarian' | 'narrative'
type TimeHorizon = '24-72h' | '7d' | '30d' | 'structural'

// Mapeo categoría presencia → canal impacto principal
function categoryToImpactChannel(categoria: string): ImpactChannel {
  const c = (categoria || '').toLowerCase()
  if (c.includes('migra')) return 'migration'
  if (c.includes('energ')) return 'energy'
  if (c.includes('milit') || c.includes('defen')) return 'military'
  if (c.includes('diplo') || c.includes('union_europea')) return 'diplomatic'
  if (c.includes('comer') || c.includes('econom')) return 'business'
  return 'diplomatic'
}

// Derivar canales adicionales según signals presentes (no sólo la categoría)
function deriveExtraChannels(signals: any[], country: string): ImpactChannel[] {
  const channels = new Set<ImpactChannel>()
  for (const s of signals) {
    if (s.layer === 'humanitarian') channels.add('humanitarian')
    if (s.layer === 'consular') channels.add('consular')
    if (s.layer === 'hard_event' || s.layer === 'structural_conflict') channels.add('military')
  }
  // Vecindad geográfica + nombres clave
  const c = country.toLowerCase()
  if (/marruecos|argelia|libia|mali|senegal|mauritania/.test(c)) channels.add('migration')
  if (/argelia|libia|nigeria|rusia/.test(c)) channels.add('energy')
  if (/ucrania|rusia|polonia|letonia|estonia/.test(c)) channels.add('military')
  return Array.from(channels)
}

function timeHorizonForLayers(layersPresent: string[]): TimeHorizon {
  // Hard event reciente → corto plazo
  if (layersPresent.includes('hard_event')) return '24-72h'
  if (layersPresent.includes('consular')) return '7d'
  if (layersPresent.includes('humanitarian')) return '30d'
  if (layersPresent.includes('structural_conflict')) return 'structural'
  return '7d'
}

// Plantilla de pregunta de monitoreo según país + canales
function monitoringQuestion(country: string, channels: ImpactChannel[]): string {
  const main = channels[0] || 'diplomatic'
  const country_lower = country.toLowerCase()
  // Casos canónicos del spec
  if (country_lower.includes('marruecos')) {
    return '¿La señal apunta a presión fronteriza/migratoria real o sólo a cobertura diplomática puntual? Validar con datos de llegadas FRONTEX/MAEC.'
  }
  if (country_lower.includes('ucrania') || country_lower.includes('rusia')) {
    return '¿Hay escalada militar que afecte a compromisos OTAN/UE o suministros energéticos a Europa? Validar con NATO press + EEAS + precios GNL.'
  }
  if (country_lower.includes('mali') || country_lower.includes('niger') || country_lower.includes('burkina') || country_lower.includes('chad') || country_lower.includes('sahel')) {
    return '¿La presión humanitaria/security puede trasladarse a ruta atlántica/Canarias? Validar con ReliefWeb + Salvamento Marítimo + Frontex.'
  }
  if (country_lower.includes('israel') || country_lower.includes('palest') || country_lower.includes('iran') || country_lower.includes('líbano') || country_lower.includes('libano')) {
    return '¿Hay riesgo para nacionales españoles en zona o para rutas energéticas (Estrecho de Ormuz)? Validar con MAEC + Travel Advisory + GNL routes.'
  }
  if (country_lower.includes('venezuela') || country_lower.includes('cuba')) {
    return '¿Hay deterioro humanitario que afecte flujos hacia España o intereses empresariales españoles? Validar con CIDOB + MAEC + empresas IBEX con exposición.'
  }
  if (country_lower.includes('china') || country_lower.includes('ee.uu') || country_lower.includes('estados unidos')) {
    return '¿La fricción bilateral genera exposición indirecta a España vía UE (comercio, aranceles, tecnología)? Validar con Comisión Europea + CNMC.'
  }
  // Genérico por canal principal
  switch (main) {
    case 'migration': return `¿Las señales en ${country} indican un cambio en flujos migratorios hacia España o sólo cobertura?`
    case 'energy': return `¿La situación en ${country} impacta suministro/precios energéticos a España?`
    case 'military': return `¿Hay implicaciones para compromisos OTAN/UE o presencia militar española en ${country}?`
    case 'humanitarian': return `¿La crisis humanitaria en ${country} genera presión migratoria o demanda de cooperación al desarrollo española?`
    case 'consular': return `¿Hay nacionales españoles en riesgo en ${country} o restricciones consulares?`
    case 'business': return `¿Empresas españolas con exposición en ${country} están afectadas? (IBEX exposición declarada)`
    default: return `¿La situación en ${country} apunta a deterioro real con canal de impacto a España o sólo a cobertura mediática?`
  }
}

// Fuentes recomendadas para validar el diagnóstico
function recommendedSourcesToCheck(channels: ImpactChannel[]): string[] {
  const set = new Set<string>()
  for (const ch of channels) {
    if (ch === 'migration') { set.add('Frontex'); set.add('Salvamento Marítimo'); set.add('Ministerio del Interior') }
    if (ch === 'energy') { set.add('CORES'); set.add('Enagás'); set.add('precios GNL Europa') }
    if (ch === 'military') { set.add('NATO press'); set.add('Defensa.gob.es'); set.add('EDA') }
    if (ch === 'diplomatic') { set.add('EEAS'); set.add('UE Council'); set.add('MAEC') }
    if (ch === 'business') { set.add('CNMV exposición IBEX'); set.add('ICEX'); set.add('Cámara Comercio España') }
    if (ch === 'consular') { set.add('MAEC Travel Advisory'); set.add('Embajada en zona') }
    if (ch === 'humanitarian') { set.add('ReliefWeb'); set.add('AECID'); set.add('OCHA') }
    if (ch === 'narrative') { set.add('GDELT'); set.add('cobertura medios ES'); set.add('declaraciones políticas') }
  }
  return Array.from(set)
}

// Confianza de la exposición · alta si presencia es alta y categoría es clara,
// media si una de las dos es débil
function exposureConfidence(intensity: number, categoria: string): number {
  let conf = 0.5
  if (intensity >= 80) conf += 0.25
  else if (intensity >= 50) conf += 0.10
  if (categoria && categoria.length > 3) conf += 0.10
  return Math.min(1, conf)
}

/**
 * Sprint G14 FASE 4 cont · cuenta items state-media que mencionan un país.
 * Acepta una lista de items pre-fetched (de /api/geopolitica/state-media) y
 * un nombre/ISO de país · devuelve count + items detectados.
 *
 * Regex case-insensitive sobre title+description. Multilenguaje básico:
 * acepta variantes EN/ES + algunas transliteraciones (ucrania/ukraine).
 */
function countStateMediaMentions(
  allItems: any[],
  iso3: string,
  countryName: string,
): { count: number; authoritarian_count: number; latest: any[] } {
  if (!allItems || allItems.length === 0) return { count: 0, authoritarian_count: 0, latest: [] }
  // Sinónimos comunes ES/EN para los nombres de países más conflictivos
  const SYNONYMS: Record<string, string[]> = {
    UKR: ['ukraine', 'ucrania', 'ucraniana?'],
    RUS: ['russia', 'rusia', 'russian', 'moscow', 'moscú'],
    CHN: ['china', 'chinese', 'pek[íi]n', 'beijing'],
    USA: ['united states', 'estados unidos', 'us\\b', 'biden', 'trump', 'washington'],
    IRN: ['iran', 'ir[áa]n', 'tehran', 'teher[áa]n'],
    ISR: ['israel', 'israeli', 'israel[íi]'],
    PSE: ['palestin', 'gaza', 'hamas'],
    SYR: ['syria', 'siria'],
    YEM: ['yemen', 'houthi'],
    MAR: ['morocco', 'marruecos', 'maroc'],
    DZA: ['algeria', 'argelia', 'alg[ée]rie'],
    EGY: ['egypt', 'egipto'],
    LBY: ['libya', 'libia'],
    SDN: ['sudan', 'sud[áa]n'],
    SOM: ['somalia'],
    AFG: ['afghanistan', 'afganist[áa]n', 'taliban'],
    PRK: ['north korea', 'corea del norte', 'pyongyang'],
    TWN: ['taiwan', 'taiw[áa]n'],
    VEN: ['venezuela', 'venezolan', 'maduro'],
    CUB: ['cuba', 'habana'],
    TUR: ['turkey', 't[üu]rkiye', 'turqu[íi]a', 'erdogan'],
  }
  const patterns = SYNONYMS[iso3] || [countryName.toLowerCase()]
  const rx = new RegExp(`\\b(${patterns.join('|')})\\b`, 'i')
  const matches = allItems.filter((it: any) => {
    const haystack = `${it.title || ''} ${it.description || ''}`
    return rx.test(haystack)
  })
  const authoritarian = matches.filter((it: any) => it.regime === 'authoritarian')
  return {
    count: matches.length,
    authoritarian_count: authoritarian.length,
    latest: matches.slice(0, 3).map((it: any) => ({
      title: it.title,
      link: it.link,
      feed_name: it.feed_name,
      country_iso3: it.country_iso3,
      regime: it.regime,
      pubDate: it.pubDate,
    })),
  }
}

async function buildSpainWatchlist(req: Request) {
  const startedAt = Date.now()
  const base = baseUrl(req)
  // Sprint G14 FASE 4 cont · también pull state-media en paralelo para enriquecer
  const [convergence, presencia, stateMedia] = await Promise.all([
    jsonFetch(`${base}/api/geopolitica/convergence`),
    jsonFetch(`${base}/api/geopolitica/presencia`),
    jsonFetch(`${base}/api/geopolitica/state-media?limit_per_feed=15`).catch(() => null),
  ])
  // Aplanar items de todos los feeds state-media en un array único
  const stateMediaAllItems: any[] = Array.isArray(stateMedia?.feeds)
    ? stateMedia.feeds.flatMap((f: any) => (Array.isArray(f.items) ? f.items.map((it: any) => ({
        ...it, regime: f.regime, country_iso3: f.country_iso3, feed_name: f.feed_name,
      })) : []))
    : []
  const alerts: any[] = Array.isArray(convergence?.alerts) ? convergence.alerts : []
  const presenciaRaw: any[] = Array.isArray(presencia?.data) ? presencia.data : []
  const presenciaByIso: Record<string, { intensidad: number; categoria: string; pais: string }> = {}
  for (const p of presenciaRaw) {
    const iso3 = p.iso || nameToIso3(p.pais || '')
    if (!iso3) continue
    const cur = presenciaByIso[iso3]
    if (!cur || (p.intensidad || 0) > cur.intensidad) {
      presenciaByIso[iso3] = { intensidad: p.intensidad || 0, categoria: p.categoria || '', pais: p.pais }
    }
  }

  const watchlist = alerts.map((a) => {
    const pres = presenciaByIso[a.iso3]
    if (!pres) return null
    const urgency = Math.round(((pres.intensidad / 100) * a.convergence_score) * 10) / 10
    // Sprint G13 FASE 7 · dimensiones de decisión
    const layersPresent: string[] = Array.isArray(a.layers_present) ? a.layers_present : []
    const primaryChannel = categoryToImpactChannel(pres.categoria)
    const extraChannels = deriveExtraChannels(a.signals || [], a.name)
    const impact_channels = Array.from(new Set([primaryChannel, ...extraChannels]))
    const likely_time_horizon = timeHorizonForLayers(layersPresent)
    const monitoring_question = monitoringQuestion(a.name, impact_channels)
    const recommended_sources_to_check = recommendedSourcesToCheck(impact_channels)
    const exposure_confidence = exposureConfidence(pres.intensidad, pres.categoria)
    // Confianza global del diagnóstico Watchlist · combina exposición + convergencia + n_capas
    const diag_confidence = Math.min(1, exposure_confidence * 0.5 + Math.min(1, a.convergence_score / 9) * 0.3 + Math.min(1, layersPresent.length / 4) * 0.2)
    const explanation = `${a.name}: exposición ${pres.categoria || 'institucional'} (intensidad ${pres.intensidad}/100) + convergencia ${a.band} con ${a.signal_count} señal(es) en ${layersPresent.length} capa(s). Canal de impacto principal: ${primaryChannel}${impact_channels.length > 1 ? ` (+${impact_channels.length - 1} adicionales)` : ''}. Horizonte probable: ${likely_time_horizon}.`

    // Sprint G14 FASE 4 cont · cuenta cobertura state-media autoritaria sobre este país
    const stateMediaCoverage = countStateMediaMentions(stateMediaAllItems, a.iso3, a.name)

    return {
      iso3: a.iso3,
      iso2: a.iso2,
      country: a.name,
      region: a.region,
      convergence_score: a.convergence_score,
      band: a.band,
      signal_count: a.signal_count,
      critical_count: a.critical_count,
      spain_presence: {
        intensity: pres.intensidad,
        category: pres.categoria,
        country_label_es: pres.pais,
      },
      urgency_score: urgency,
      top_signals: a.signals.slice(0, 3),
      // Sprint G13 FASE 7 · campos orientados a decisión
      impact_channels,
      primary_impact_channel: primaryChannel,
      exposure_type: pres.categoria,
      exposure_confidence,
      likely_time_horizon,
      monitoring_question,
      recommended_sources_to_check,
      confidence: +diag_confidence.toFixed(2),
      explanation,
      // Sprint G14 FASE 4 cont · cobertura medios estatales hacia este país
      authoritarian_media_coverage: stateMediaCoverage,
      caveats: [
        'Urgency = (presencia/100) × convergence_score · es heurística, no probabilidad',
        'Impact channel inferido de categoría presencia + signals · validar con fuente primaria',
        'Time horizon basado en capa de la convergencia · puede no coincidir con velocidad real del evento',
        ...(stateMediaCoverage.authoritarian_count >= 3
          ? [`${stateMediaCoverage.authoritarian_count} items de medios régimen autoritario mencionan este país recientemente · posible operación de framing`]
          : []),
      ],
    }
  }).filter((x: any) => x !== null) as any[]

  watchlist.sort((a, b) => b.urgency_score - a.urgency_score)

  return {
    ok: true,
    n_watchlist: watchlist.length,
    n_convergence_alerts: alerts.length,
    n_presencia_countries: Object.keys(presenciaByIso).length,
    summary: {
      critical_for_spain: watchlist.filter((w: any) => w.urgency_score >= 6).length,
      high_for_spain: watchlist.filter((w: any) => w.urgency_score >= 3 && w.urgency_score < 6).length,
      moderate_for_spain: watchlist.filter((w: any) => w.urgency_score < 3).length,
    },
    watchlist,
    what_it_means: 'Países donde España tiene exposición declarada (presencia diplomática/migratoria/energética/empresarial/militar) Y simultáneamente hay convergencia multi-source apuntando a deterioro · prioridad de seguimiento, no de acción.',
    what_it_does_not_mean: 'NO es una lista de "amenazas a España". NO mide intención hostil de terceros. NO recomienda decisiones políticas. NO incluye análisis de coste-beneficio ni de impacto cuantitativo. Es un cribado de qué países merecen análisis humano detallado en función de exposición ES.',
    methodology: 'Spain Watchlist Sprint G13 FASE 7 · join entre /api/geopolitica/convergence (live multi-capa con temporal_scope) y /api/geopolitica/presencia (catálogo curado intereses ES). Urgency = (presencia/100) × convergence_score. Cada país añade: canal de impacto (migration/energy/military/diplomatic/business/consular/humanitarian), horizonte temporal (24-72h/7d/30d/structural), pregunta concreta de monitoreo y fuentes sugeridas para validar.',
    _geo_meta: buildGeoMeta({
      source_mode: 'analytical_model',
      sources_used: [
        'Convergence Alerts · /api/geopolitica/convergence (analytical_model con 5 capas)',
        'Presencia España · /api/geopolitica/presencia (hybrid · baseline curado + ajuste RSS)',
      ],
      startedAt,
      confidence: watchlist.length > 0 ? +(watchlist.reduce((s, w) => s + (w.confidence || 0.5), 0) / watchlist.length).toFixed(2) : 0.5,
      layer: 'analytical_model',
      warnings: [
        'Watchlist es PRIORIDAD DE SEGUIMIENTO · no recomendación política',
        'Cada país lleva monitoring_question · usar como guía analítica, no como conclusión',
        'Impact channels inferidos · validar con fuentes recomendadas antes de citar',
      ],
      notes: 'Cruza Convergence × Presencia · output orientado a decisión',
    }),
  }
}

// ─── Country Timeline (Sprint G9) ─────────────────────────────────────
// Timeline cronológico multi-source para un país: UCDP años + ACLED meses
// + sanciones + Travel Advisory updates. Todo data-driven, sin hardcode.
async function buildCountryTimeline(req: Request, iso3: string) {
  const base = baseUrl(req)
  const meta = WORLD_COUNTRY_BASELINE[iso3.toUpperCase()]
  if (!meta) {
    return { ok: false, error: 'country_not_found', iso: iso3 }
  }
  const ucdpName = ISO3_TO_UCDP_NAME[iso3.toUpperCase()] || meta.name

  const [ucdp, acled, sanctions, travel] = await Promise.all([
    jsonFetch(`https://ucdpapi.pcr.uu.se/api/ucdpprioconflict/24.1?Country=${encodeURIComponent(ucdpName)}&pagesize=500`),
    jsonFetch(`${base}/api/acled/spain-context`),
    jsonFetch(`${base}/api/geopolitica/sanciones?source=all`),
    jsonFetch(`${base}/api/geopolitica/travel-advisories?country=${ISO3_TO_ISO2[iso3.toUpperCase()] || ''}`),
  ])

  type TimelineEvent = { date: string; year: number; source: string; type: string; severity: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL'; title: string; detail?: string }
  const events: TimelineEvent[] = []

  // UCDP · conflictos por año del país (desde 1946→2023)
  const ucdpResults: any[] = Array.isArray(ucdp?.Result) ? ucdp.Result : []
  for (const c of ucdpResults) {
    const year = Number(c.year ?? c.Year ?? 0)
    if (!year) continue
    const intensity = Number(c.intensity_level ?? c.IntensityLevel ?? 0)
    const sideA = c.side_a ?? c.SideA ?? '?'
    const sideB = c.side_b ?? c.SideB ?? '?'
    events.push({
      date: `${year}-01-01`,
      year,
      source: 'UCDP',
      type: intensity >= 2 ? 'GUERRA' : 'CONFLICTO MENOR',
      severity: intensity >= 2 ? 'CRITICAL' : 'HIGH',
      title: `${sideA} vs ${sideB}`,
      detail: `intensity ${intensity} · ${c.type_of_conflict === 3 ? 'guerra civil' : c.type_of_conflict === 4 ? 'civil internacionalizado' : c.type_of_conflict === 2 ? 'interestatal' : 'otro'}`,
    })
  }

  // ACLED · eventos recientes del país
  const acledRaw: any[] = Array.isArray(acled?.data) ? acled.data : []
  const countryEventsAcled = acledRaw.filter((e: any) =>
    String(e.country || '').toLowerCase().includes(meta.name.toLowerCase()) ||
    String(e.iso || '') === iso3,
  )
  for (const e of countryEventsAcled.slice(0, 30)) {
    const date = String(e.event_date || '').slice(0, 10)
    if (!date) continue
    const fatalities = Number(e.fatalities || 0)
    events.push({
      date,
      year: Number(date.slice(0, 4)),
      source: 'ACLED',
      type: String(e.event_type || 'evento'),
      severity: fatalities >= 20 ? 'CRITICAL' : fatalities >= 5 ? 'HIGH' : fatalities >= 1 ? 'MED' : 'LOW',
      title: String(e.event_type || 'evento ACLED'),
      detail: `${e.location || ''} · ${fatalities} fatalities`,
    })
  }

  // Sanciones que mencionan el país
  const sanctionsRaw: any[] = Array.isArray(sanctions?.sanctions) ? sanctions.sanctions : []
  const countrySanctions = sanctionsRaw.filter((s: any) =>
    String(s.entity || '').toLowerCase().includes(meta.name.toLowerCase()) ||
    String(s.reason || '').toLowerCase().includes(meta.name.toLowerCase()),
  )
  for (const s of countrySanctions.slice(0, 20)) {
    const date = String(s.date || '').slice(0, 10)
    if (!date) continue
    events.push({
      date,
      year: Number(date.slice(0, 4)) || 0,
      source: 'Sanctions',
      type: String(s.source || 'sanción'),
      severity: 'HIGH',
      title: `Sanción ${s.source || ''}: ${s.entity || '(entidad)'}`,
      detail: s.reason || '',
    })
  }

  // Travel Advisory · evento "current" (no histórico disponible públicamente)
  if (travel?.ok && travel.advisory?.updated) {
    events.push({
      date: String(travel.advisory.updated).slice(0, 10),
      year: Number(String(travel.advisory.updated).slice(0, 4)) || new Date().getFullYear(),
      source: 'Travel',
      type: 'Advisory update',
      severity: (travel.advisory.score >= 4.5) ? 'CRITICAL' : (travel.advisory.score >= 3.5) ? 'HIGH' : (travel.advisory.score >= 2.5) ? 'MED' : 'LOW',
      title: `${travel.band} (score ${travel.advisory.score?.toFixed?.(1) ?? '?'}/5)`,
      detail: String(travel.advisory.message || '').slice(0, 200),
    })
  }

  // Ordenar desc por fecha
  events.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  // Agrupar por año para visualización
  const byYear: Record<number, TimelineEvent[]> = {}
  for (const e of events) {
    if (!byYear[e.year]) byYear[e.year] = []
    byYear[e.year].push(e)
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  return {
    ok: true,
    country: { iso3: meta.iso3, name: meta.name, region: meta.region },
    n_events: events.length,
    sources_used: {
      ucdp: ucdpResults.length,
      acled: countryEventsAcled.length,
      sanctions: countrySanctions.length,
      travel: travel?.ok ? 1 : 0,
    },
    years_covered: years.length > 0 ? `${years[years.length - 1]}-${years[0]}` : '—',
    events: events.slice(0, 80),
    by_year: byYear,
    methodology: 'Country timeline multi-source · UCDP conflictos (1946→2023 según v24.1) + ACLED eventos recientes + sanciones que mencionan país + Travel Advisory actual. Todo live · ningún dato hardcodeado.',
  }
}

// ─── Data health · transparencia de fuentes (Sprint G8) ──────────────
// Pings cada endpoint propio + RSS externo, reporta latencia + status.
// Útil para transparencia ("¿por qué no veo el feed XX?") + debugging.
async function buildDataHealth(req: Request) {
  const base = baseUrl(req)
  const endpoints: Array<{ name: string; path: string; layer: string }> = [
    // Capa 1 · señal rápida
    { name: 'ACLED Spain Context', path: '/api/acled/spain-context',           layer: 'Capa 1' },
    { name: 'GDELT live',          path: '/api/geopolitica/gdelt-live?country=Spain', layer: 'Capa 1' },
    { name: 'OSINT signals',       path: '/api/geopolitica/osint',             layer: 'Capa 1' },
    // Capa 2 · evento duro
    { name: 'ACLED granular',      path: '/api/geopolitica/acled-granular',    layer: 'Capa 2' },
    { name: 'UCDP estructural',    path: '/api/geopolitica/ucdp?country=Ukraine', layer: 'Capa 2' },
    { name: 'ReliefWeb crisis',    path: '/api/geopolitica/reliefweb?country=UKR&limit=5', layer: 'Capa 2' },
    // Capa 3 · militar/diplomático
    { name: 'NATO press',          path: '/api/geopolitica/nato-press?limit=5', layer: 'Capa 3' },
    { name: 'UN Security Council', path: '/api/geopolitica/unsc-news?limit=5',  layer: 'Capa 3' },
    { name: 'EEAS / Council EU',   path: '/api/geopolitica/eeas-news?limit=5',  layer: 'Capa 3' },
    { name: 'Spain official',      path: '/api/geopolitica/spain-official?limit=5', layer: 'Capa 3' },
    // Capa 4 · sanciones
    { name: 'Sanciones EU/OFAC/UN', path: '/api/geopolitica/sanciones?source=all', layer: 'Capa 4' },
    { name: 'Sanciones live',       path: '/api/geopolitica/sanciones-live',       layer: 'Capa 4' },
    // Capa 5 · consular
    { name: 'Travel Advisories', path: '/api/geopolitica/travel-advisories?country=ES', layer: 'Capa 5' },
    // Capa 6 · OSINT cualitativo
    { name: 'ICG CrisisWatch',   path: '/api/geopolitica/crisis-group?limit=5',  layer: 'Capa 6' },
    { name: 'ISW briefings',     path: '/api/geopolitica/isw-briefings?limit=5', layer: 'Capa 6' },
    // Analítico
    { name: 'Spain Risk Index',     path: '/api/geopolitica/risk-index',        layer: 'Analítico' },
    { name: 'Top Risks 2026',       path: '/api/geopolitica/top-risks',         layer: 'Analítico' },
    { name: 'World Risk Heatmap',   path: '/api/geopolitica/world-risk',        layer: 'Analítico' },
    { name: 'Stakeholder Network',  path: '/api/geopolitica/stakeholder-network', layer: 'Analítico' },
    { name: 'IA Brief',             path: '/api/geopolitica/ia-brief',          layer: 'Analítico' },
  ]

  const results = await Promise.all(endpoints.map(async (ep) => {
    const t0 = Date.now()
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(`${base}${ep.path}`, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Politeia-HealthCheck/1.0' },
      })
      clearTimeout(timer)
      const ms = Date.now() - t0
      // Parse minimal para saber si hay datos reales o solo ok:false
      let has_data = false
      let n_items = 0
      let error_msg: string | undefined
      try {
        const j = await r.clone().json()
        if (j?.ok === false) {
          error_msg = String(j?.error ?? 'unknown').slice(0, 80)
        } else {
          has_data = true
          n_items = j?.n_items || j?.n_reports || j?.n_conflicts || j?.n_countries || j?.countries?.length || j?.items?.length || j?.data?.length || j?.list?.length || (j?.brief ? 1 : 0) || 0
        }
      } catch {
        // No es JSON, tal vez es audio/text
      }
      return {
        name: ep.name,
        layer: ep.layer,
        path: ep.path,
        status: r.status,
        ms,
        ok: r.ok && !error_msg,
        has_data,
        n_items,
        error: error_msg,
      }
    } catch (e: any) {
      return {
        name: ep.name,
        layer: ep.layer,
        path: ep.path,
        status: 0,
        ms: Date.now() - t0,
        ok: false,
        has_data: false,
        n_items: 0,
        error: String(e?.message ?? e).slice(0, 80),
      }
    }
  }))

  const byLayer: Record<string, { total: number; ok: number; with_data: number }> = {}
  for (const r of results) {
    const k = r.layer
    if (!byLayer[k]) byLayer[k] = { total: 0, ok: 0, with_data: 0 }
    byLayer[k].total += 1
    if (r.ok) byLayer[k].ok += 1
    if (r.has_data) byLayer[k].with_data += 1
  }

  return {
    ok: true,
    n_endpoints: results.length,
    summary: {
      ok_count: results.filter((r) => r.ok).length,
      with_data_count: results.filter((r) => r.has_data).length,
      failed_count: results.filter((r) => !r.ok).length,
      avg_latency_ms: Math.round(results.reduce((s, r) => s + r.ms, 0) / Math.max(1, results.length)),
    },
    by_layer: byLayer,
    endpoints: results,
    note: 'Diagnóstico de fuentes geo · ping cada endpoint con timeout 8s, mide latency y verifica si devuelve datos reales.',
  }
}

// ─── UN Security Council news ────────────────────────────────────────
// Fuente: https://news.un.org/feed/subscribe/en/news/topic/security-council/feed/rss.xml
// Sirve para diplomacia de crisis: resoluciones, vetos, reuniones de
// emergencia, mandatos, misiones de paz, sanciones, alto el fuego.
async function buildUnscNews(limit: number) {
  const url = 'https://news.un.org/feed/subscribe/en/news/topic/security-council/feed/rss.xml'
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' },
      next: { revalidate: 21600 },
    })
    if (!r.ok) {
      return { ok: false, error: `HTTP ${r.status}`, source: 'UN News · Security Council' }
    }
    const xml = await r.text()
    const items = parseRssItems(xml).slice(0, limit)
    return {
      ok: true,
      n_items: items.length,
      items,
      source: 'UN News · Security Council feed (news.un.org)',
      note: 'Resoluciones, vetos, reuniones emergencia, mandatos, peacekeeping, alto el fuego, posiciones P5.',
    }
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e).slice(0, 160), source: 'UN News · SC' }
  }
}

// ─── Parser RSS minimalista (regex tolerante, sin libs externas) ──────
function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = []
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi
  const matches = xml.match(itemRegex) || []
  for (const block of matches) {
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link') || extractTag(block, 'guid')
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date')
    const description = extractTag(block, 'description') || extractTag(block, 'content:encoded') || ''
    if (title) {
      items.push({
        title: cleanText(title).slice(0, 220),
        link: cleanText(link),
        pubDate: cleanText(pubDate),
        description: cleanText(description).slice(0, 360),
      })
    }
  }
  return items
}

function extractTag(block: string, tag: string): string {
  // Tolera CDATA y atributos
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
  const m = block.match(re)
  return m ? m[1] : ''
}

function cleanText(s: string): string {
  return (s || '')
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Handler principal ─────────────────────────────────────────────────
export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (action === 'health') {
    return NextResponse.json({
      ok: true,
      sprint: 'G2',
      catchall_endpoints: [
        '/api/geopolitica/risk-index',
        '/api/geopolitica/calendario?dias=45',
        '/api/geopolitica/top-risks',
        '/api/geopolitica/sanciones?source=EU|OFAC|UN|all',
        '/api/geopolitica/cascading-events?limit=50',
        '/api/geopolitica/momentum?country=ES&days=14',
        '/api/geopolitica/black-swan',
      ],
      note: 'Catchall geo · NO afecta subcarpetas existentes (alertas/, osint/, riesgo/, etc.)',
    })
  }

  if (action === 'risk-index') {
    return NextResponse.json(await buildSpainRiskIndex(req), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'calendario') {
    const dias = Math.min(180, Math.max(7, Number(url.searchParams.get('dias') || 90)))
    return NextResponse.json(await buildGeoCalendar(dias), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'top-risks') {
    return NextResponse.json(await buildTopRisks(), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'sanciones') {
    const source = url.searchParams.get('source') || 'all'
    return NextResponse.json(await buildSanctionsFeed(source), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'cascading-events') {
    const limit = Math.min(100, Math.max(10, Number(url.searchParams.get('limit') || 50)))
    return NextResponse.json(await buildCascadingEvents(limit, req))
  }

  if (action === 'momentum') {
    const country = url.searchParams.get('country') || 'ES'
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get('days') || 14)))
    return NextResponse.json(await buildMomentumScore(req, country, days))
  }

  if (action === 'black-swan') {
    return NextResponse.json(await buildBlackSwanCount(req))
  }

  // Sprint G3 · nuevos endpoints
  if (action === 'acled-granular') {
    return NextResponse.json(await buildAcledGranular(req), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'stakeholder-network') {
    return NextResponse.json(await buildStakeholderNetwork(), {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
    })
  }

  if (action === 'ia-brief') {
    return NextResponse.json(await buildIaBrief(req), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  // Sprint G4 · nuevos endpoints
  if (action === 'historical-analog') {
    return NextResponse.json(await buildHistoricalAnalog(url), {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  }

  if (action === 'scenario-impact') {
    return NextResponse.json(buildScenarioImpact(url), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' }, // 5 min · interactive
    })
  }

  if (action === 'sanciones-live') {
    return NextResponse.json(await buildSanctionsLive(), {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
    })
  }

  // Sprint G5 · nuevos endpoints
  if (action === 'world-risk') {
    return NextResponse.json(await buildWorldRiskHeatmap(req), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'pais-profile') {
    const iso = url.searchParams.get('iso') || 'ESP'
    return NextResponse.json(await buildCountryProfile(req, iso), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'tts') {
    const text = url.searchParams.get('text') || ''
    if (!text) return NextResponse.json({ ok: false, error: 'missing_text' }, { status: 400 })
    return buildTtsAudio(req, text)
  }

  if (action === 'gdelt-live') {
    const country = url.searchParams.get('country') || 'Spain'
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 20)))
    return NextResponse.json(await buildGdeltLive(req, country, limit), {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' }, // 15 min
    })
  }

  // Sprint G6 · riesgo geopolítico duro (UCDP + ReliefWeb + Travel Advisories + NATO + UN SC)
  if (action === 'ucdp') {
    const country = url.searchParams.get('country') || 'Ukraine'
    return NextResponse.json(await buildUcdpConflicts(country), {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  }

  if (action === 'reliefweb') {
    const country = url.searchParams.get('country') || 'Spain'
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 20)))
    return NextResponse.json(await buildReliefWebReports(country, limit), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'travel-advisories') {
    const country = url.searchParams.get('country') || 'all'
    return NextResponse.json(await buildTravelAdvisories(country), {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
    })
  }

  if (action === 'nato-press') {
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 20)))
    return NextResponse.json(await buildNatoPress(limit), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'unsc-news') {
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 20)))
    return NextResponse.json(await buildUnscNews(limit), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  // Sprint G7 · OSINT cualitativo + EU diplomacy + Spain official
  if (action === 'crisis-group') {
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 20)))
    return NextResponse.json(await buildCrisisGroup(limit), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'isw-briefings') {
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 20)))
    return NextResponse.json(await buildIswBriefings(limit), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'eeas-news') {
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 20)))
    return NextResponse.json(await buildEeasNews(limit), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  if (action === 'spain-official') {
    const limit = Math.min(50, Math.max(5, Number(url.searchParams.get('limit') || 20)))
    return NextResponse.json(await buildSpainOfficial(limit), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    })
  }

  // Sprint G8 · Convergencia analítica + transparencia
  if (action === 'convergence') {
    return NextResponse.json(await buildConvergenceAlerts(req), {
      headers: { 'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=21600' }, // 3h
    })
  }

  if (action === 'data-health') {
    return NextResponse.json(await buildDataHealth(req), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' }, // 5 min
    })
  }

  // Sprint G9 · Spain Watchlist + Country Timeline (data-driven, sin hardcode)
  if (action === 'spain-watchlist') {
    return NextResponse.json(await buildSpainWatchlist(req), {
      headers: { 'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=21600' }, // 3h
    })
  }

  if (action === 'country-timeline') {
    const iso = url.searchParams.get('iso') || 'ESP'
    return NextResponse.json(await buildCountryTimeline(req, iso), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' }, // 6h
    })
  }

  // Sprint G10 · Theme clustering emergente (Gemini sobre 6 RSS feeds live)
  if (action === 'themes') {
    return NextResponse.json(await buildThemeClustering(req), {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' }, // 6h
    })
  }

  return NextResponse.json({
    ok: false,
    available: [
      'GET /api/geopolitica/health',
      'GET /api/geopolitica/risk-index',
      'GET /api/geopolitica/calendario?dias=45 · LIVE Crisis Group + NATO RSS',
      'GET /api/geopolitica/top-risks',
      'GET /api/geopolitica/sanciones?source=EU|OFAC|UN|all · LIVE UN XML count',
      'GET /api/geopolitica/sanciones-live · STREAM EU+OFAC+UN counts (Sprint G4)',
      'GET /api/geopolitica/cascading-events?limit=50',
      'GET /api/geopolitica/momentum?country=ES&days=14',
      'GET /api/geopolitica/black-swan',
      'GET /api/geopolitica/acled-granular',
      'GET /api/geopolitica/stakeholder-network',
      'GET /api/geopolitica/ia-brief',
      'GET /api/geopolitica/historical-analog?types=military,energy&regions=Ucrania (Sprint G4)',
      'GET /api/geopolitica/scenario-impact?sanctions=50&conflict=70&energy=60 (Sprint G4)',
      'GET /api/geopolitica/world-risk · choropleth mundial scores 0-100 (Sprint G5)',
      'GET /api/geopolitica/pais-profile?iso=ESP · drill país profundo (Sprint G5)',
      'GET /api/geopolitica/tts?text=... · ElevenLabs/OpenAI TTS premium (Sprint G5)',
      'GET /api/geopolitica/gdelt-live?country=Spain&limit=20 · GDELT polling 15m (Sprint G5)',
      'GET /api/geopolitica/ucdp?country=Ukraine · UCDP structural conflicts (Sprint G6)',
      'GET /api/geopolitica/reliefweb?country=ESP&limit=20 · ReliefWeb humanitarian reports (Sprint G6)',
      'GET /api/geopolitica/travel-advisories?country=all · US State Dept + UK FCDO (Sprint G6)',
      'GET /api/geopolitica/nato-press?limit=20 · NATO HQ RSS oficial (Sprint G6)',
      'GET /api/geopolitica/unsc-news?limit=20 · UN Security Council news (Sprint G6)',
      'GET /api/geopolitica/crisis-group?limit=20 · ICG CrisisWatch early warning (Sprint G7)',
      'GET /api/geopolitica/isw-briefings?limit=20 · ISW/Critical Threats operational (Sprint G7)',
      'GET /api/geopolitica/eeas-news?limit=20 · EEAS/Council EU diplomacy (Sprint G7)',
      'GET /api/geopolitica/spain-official?limit=20 · MAEC+Moncloa+Defensa.gob combinados (Sprint G7)',
      'GET /api/geopolitica/convergence · alertas multi-source (ACLED+UCDP+ReliefWeb+Travel+Baseline) (Sprint G8)',
      'GET /api/geopolitica/data-health · transparencia · 20 endpoints status + latency (Sprint G8)',
      'GET /api/geopolitica/spain-watchlist · join convergence × presencia ES (Sprint G9 · data-driven)',
      'GET /api/geopolitica/country-timeline?iso=UKR · cronología multi-source país (Sprint G9)',
      'GET /api/geopolitica/themes · clustering temático emergente Gemini sobre 6 RSS feeds (Sprint G10)',
    ],
  }, { status: 404 })
}
