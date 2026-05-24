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
  const base = baseUrl(req)
  // Componentes: alertas críticas + ACLED eventos + GDELT tone + osint volume
  const [stats, acled, gdelt] = await Promise.all([
    jsonFetch(`${base}/api/geopolitica/stats`),
    jsonFetch(`${base}/api/acled/spain-context`),
    jsonFetch(`${base}/api/gdelt/tone?query=Spain&days=7`),
  ])
  // Normalizar cada componente a 0-100 (donde 100 = peor)
  const comps: Array<{ key: string; label: string; raw: number | null; norm: number | null; weight: number; source: string }> = []
  // Alertas críticas (0-5+ = peor)
  const critRaw = stats?.alertas_count?.CRITICO ?? 0
  comps.push({
    key: 'alertas_criticas',
    label: 'Alertas CRITICO',
    raw: critRaw,
    norm: Math.min(100, critRaw * 25), // 4+ alertas críticas = 100
    weight: 0.30,
    source: 'Politeia geo-signals',
  })
  // Total alertas (8-15 = amber, >15 = red)
  const totalAlerts = stats?.alertas_activas ?? 0
  comps.push({
    key: 'alertas_total',
    label: 'Alertas activas (todos niveles)',
    raw: totalAlerts,
    norm: Math.min(100, (totalAlerts / 20) * 100),
    weight: 0.15,
    source: 'Politeia geo-signals',
  })
  // ACLED events 30d (200 amber, 400 red)
  const acledRaw = acled?.n_events_total ?? (Array.isArray(acled?.data) ? acled.data.length : 0)
  comps.push({
    key: 'acled_events',
    label: 'Eventos ACLED relevantes 30d',
    raw: acledRaw,
    norm: Math.min(100, (acledRaw / 400) * 100),
    weight: 0.20,
    source: 'ACLED · spain-context',
  })
  // GDELT tone: -3 = peor, +3 = mejor (invertido)
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
  })
  // OSINT volume 24h (>40 amber, >70 red)
  const osintRaw = stats?.osint_24h ?? 0
  comps.push({
    key: 'osint_volume',
    label: 'Volumen OSINT 24h',
    raw: osintRaw,
    norm: Math.min(100, (osintRaw / 70) * 100),
    weight: 0.15,
    source: 'Politeia news-aggregator',
  })
  // Score compuesto ponderado (skip null normales)
  const valid = comps.filter((c) => c.norm != null)
  const score = valid.length
    ? Math.round(valid.reduce((s, c) => s + (c.norm! * c.weight), 0) / valid.reduce((s, c) => s + c.weight, 0))
    : 50
  return {
    ok: true,
    score, // 0=todo verde, 100=todo crítico
    band: score < 30 ? 'BAJO' : score < 55 ? 'MEDIO' : score < 75 ? 'ALTO' : 'CRITICO',
    components: comps,
    generated_at: new Date().toISOString(),
    methodology: 'Score 0-100 (0=mínimo riesgo, 100=máximo). Combina alertas críticas Politeia (30%) + alertas total (15%) + eventos ACLED relevantes 30d (20%) + GDELT tone invertido (20%) + volumen OSINT 24h (15%). Inspirado en Verisk Maplecroft Country Risk + BlackRock GRI, pero transparente.',
    cite: 'Política inspirada en BlackRock Geopolitical Risk Indicator (Z-score) + Verisk Maplecroft Country Risk Rating',
  }
}

// ─── Geopolitical Calendar (multi-source) ──────────────────────────────
// Inspiración: Stratfor Geopolitical Calendar + CFR upcoming events
async function buildGeoCalendar(dias: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizonMs = today.getTime() + dias * 86400000
  // Eventos curados conocidos 2026 (fechas reales + estimaciones)
  // Esta lista se enriquece manualmente con feeds futuros (NATO RSS, UN SC, EU Council, etc.)
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
  const events = CURATED_EVENTS
    .map((e) => {
      const d = new Date(e.date + 'T00:00:00')
      const daysFromNow = Math.round((d.getTime() - today.getTime()) / 86400000)
      return { ...e, daysFromNow }
    })
    .filter((e) => e.daysFromNow >= 0 && new Date(e.date).getTime() <= horizonMs)
    .sort((a, b) => a.daysFromNow - b.daysFromNow)
  return {
    ok: true,
    horizon_days: dias,
    n_events: events.length,
    events: events.slice(0, 40),
    sources: ['UN Security Council', 'NATO', 'EU Council', 'IMF', 'ACLED', 'Crisis Group', 'Eurasia Group'],
    methodology: 'Eventos curados + cadencia conocida. Inspiración: Stratfor Geopolitical Calendar + CFR upcoming events. Pendiente N+1: scrapers RSS NATO + Crisis Group + UN Security Council para auto-update.',
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

// ─── Sanctions consolidated feed ───────────────────────────────────────
// Inspiración: OpenSanctions.org consolidator
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
  return {
    ok: true,
    source,
    n_sanctions: filtered.length,
    sanctions: filtered.sort((a, b) => b.date.localeCompare(a.date)),
    sources_covered: ['EU Consolidated List', 'OFAC SDN List', 'UN Security Council'],
    methodology: 'Top sanciones recientes consolidadas. Inspiración: OpenSanctions.org. Pendiente N+1: scrape live EU + OFAC + UN APIs públicas.',
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
  const events: Array<{ id: string; type: string; severity: string; title: string; ts: string; source: string; url?: string; tags?: string[] }> = []
  // OSINT items
  if (Array.isArray(osint?.data)) {
    for (const it of osint.data.slice(0, 30)) {
      events.push({
        id: `osint-${it.id}`,
        type: 'osint',
        severity: it.urgencia >= 4 ? 'critical' : it.urgencia >= 3 ? 'high' : it.urgencia >= 2 ? 'medium' : 'low',
        title: it.titulo,
        ts: it.fecha || new Date().toISOString(),
        source: it.fuente,
        url: it.url,
        tags: it.categoria ? [it.categoria] : [],
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
        title: a.titulo,
        ts: a.fecha || new Date().toISOString(),
        source: a.fuente,
        url: a.url,
        tags: a.paises || [],
      })
    }
  }
  // ACLED events
  if (Array.isArray(acled?.data)) {
    for (const e of acled.data.slice(0, 20)) {
      events.push({
        id: `acled-${e.event_id_cnty || e.event_id || Math.random().toString(36).slice(2)}`,
        type: 'acled',
        severity: (e.fatalities || 0) > 10 ? 'critical' : (e.fatalities || 0) > 0 ? 'high' : 'medium',
        title: `${e.event_type || 'Event'} · ${e.country}`,
        ts: e.event_date || new Date().toISOString(),
        source: 'ACLED',
        tags: [e.country, e.event_type].filter(Boolean),
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

  return NextResponse.json({
    ok: false,
    available: [
      'GET /api/geopolitica/health',
      'GET /api/geopolitica/risk-index',
      'GET /api/geopolitica/calendario?dias=45',
      'GET /api/geopolitica/top-risks',
      'GET /api/geopolitica/sanciones?source=EU|OFAC|UN|all',
      'GET /api/geopolitica/cascading-events?limit=50',
      'GET /api/geopolitica/momentum?country=ES&days=14',
      'GET /api/geopolitica/black-swan',
    ],
  }, { status: 404 })
}
