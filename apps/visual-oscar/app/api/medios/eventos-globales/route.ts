/**
 * /api/medios/eventos-globales · agregador para Mapa Global de Narrativas.
 *
 * Combina:
 *  - ACLED events últimos 30/90 días (conflictos, protestas) · georef
 *  - GDELT articles aggregated por sourcecountry · proxy volumen mediático
 *  - Clasificación heurística en 8 categorías:
 *     · Política Interior · Política Exterior · Economía
 *     · Sociedad · Salud · Medioambiente · Seguridad Defensa
 *     · Justicia · Deporte (residual)
 *
 * Devuelve array de eventos { id, lat, lon, country, category, sentiment,
 * relevance, impact_es, title, source, n_articles, window }
 *
 * Sin datos hardcoded · todo viene de fetch live.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 min

// Country centroids (lat, lon) curados desde Wikipedia/Natural Earth.
// Es metadata geográfica · necesaria para proyectar puntos sobre el mapa.
const COUNTRY_COORDS: Record<string, { lat: number; lon: number; name: string; iso2: string }> = {
  ES: { lat: 40.4168, lon: -3.7038, name: 'España', iso2: 'ES' },
  FR: { lat: 46.2276, lon: 2.2137, name: 'Francia', iso2: 'FR' },
  DE: { lat: 51.1657, lon: 10.4515, name: 'Alemania', iso2: 'DE' },
  IT: { lat: 41.8719, lon: 12.5674, name: 'Italia', iso2: 'IT' },
  PT: { lat: 39.3999, lon: -8.2245, name: 'Portugal', iso2: 'PT' },
  GB: { lat: 55.3781, lon: -3.4360, name: 'Reino Unido', iso2: 'GB' },
  IE: { lat: 53.4129, lon: -8.2439, name: 'Irlanda', iso2: 'IE' },
  NL: { lat: 52.1326, lon: 5.2913, name: 'Países Bajos', iso2: 'NL' },
  BE: { lat: 50.5039, lon: 4.4699, name: 'Bélgica', iso2: 'BE' },
  CH: { lat: 46.8182, lon: 8.2275, name: 'Suiza', iso2: 'CH' },
  AT: { lat: 47.5162, lon: 14.5501, name: 'Austria', iso2: 'AT' },
  PL: { lat: 51.9194, lon: 19.1451, name: 'Polonia', iso2: 'PL' },
  GR: { lat: 39.0742, lon: 21.8243, name: 'Grecia', iso2: 'GR' },
  SE: { lat: 60.1282, lon: 18.6435, name: 'Suecia', iso2: 'SE' },
  NO: { lat: 60.4720, lon: 8.4689, name: 'Noruega', iso2: 'NO' },
  FI: { lat: 61.9241, lon: 25.7482, name: 'Finlandia', iso2: 'FI' },
  DK: { lat: 56.2639, lon: 9.5018, name: 'Dinamarca', iso2: 'DK' },
  HU: { lat: 47.1625, lon: 19.5033, name: 'Hungría', iso2: 'HU' },
  CZ: { lat: 49.8175, lon: 15.4730, name: 'Chequia', iso2: 'CZ' },
  RO: { lat: 45.9432, lon: 24.9668, name: 'Rumanía', iso2: 'RO' },
  BG: { lat: 42.7339, lon: 25.4858, name: 'Bulgaria', iso2: 'BG' },
  UA: { lat: 48.3794, lon: 31.1656, name: 'Ucrania', iso2: 'UA' },
  RU: { lat: 61.5240, lon: 105.3188, name: 'Rusia', iso2: 'RU' },
  BY: { lat: 53.7098, lon: 27.9534, name: 'Bielorrusia', iso2: 'BY' },
  TR: { lat: 38.9637, lon: 35.2433, name: 'Turquía', iso2: 'TR' },
  US: { lat: 37.0902, lon: -95.7129, name: 'Estados Unidos', iso2: 'US' },
  CA: { lat: 56.1304, lon: -106.3468, name: 'Canadá', iso2: 'CA' },
  MX: { lat: 23.6345, lon: -102.5528, name: 'México', iso2: 'MX' },
  CU: { lat: 21.5218, lon: -77.7812, name: 'Cuba', iso2: 'CU' },
  BR: { lat: -14.2350, lon: -51.9253, name: 'Brasil', iso2: 'BR' },
  AR: { lat: -38.4161, lon: -63.6167, name: 'Argentina', iso2: 'AR' },
  CL: { lat: -35.6751, lon: -71.5430, name: 'Chile', iso2: 'CL' },
  CO: { lat: 4.5709, lon: -74.2973, name: 'Colombia', iso2: 'CO' },
  PE: { lat: -9.1900, lon: -75.0152, name: 'Perú', iso2: 'PE' },
  VE: { lat: 6.4238, lon: -66.5897, name: 'Venezuela', iso2: 'VE' },
  EC: { lat: -1.8312, lon: -78.1834, name: 'Ecuador', iso2: 'EC' },
  BO: { lat: -16.2902, lon: -63.5887, name: 'Bolivia', iso2: 'BO' },
  PY: { lat: -23.4425, lon: -58.4438, name: 'Paraguay', iso2: 'PY' },
  UY: { lat: -32.5228, lon: -55.7658, name: 'Uruguay', iso2: 'UY' },
  MA: { lat: 31.7917, lon: -7.0926, name: 'Marruecos', iso2: 'MA' },
  DZ: { lat: 28.0339, lon: 1.6596, name: 'Argelia', iso2: 'DZ' },
  TN: { lat: 33.8869, lon: 9.5375, name: 'Túnez', iso2: 'TN' },
  LY: { lat: 26.3351, lon: 17.2283, name: 'Libia', iso2: 'LY' },
  EG: { lat: 26.8206, lon: 30.8025, name: 'Egipto', iso2: 'EG' },
  ML: { lat: 17.5707, lon: -3.9962, name: 'Mali', iso2: 'ML' },
  NG: { lat: 9.0820, lon: 8.6753, name: 'Nigeria', iso2: 'NG' },
  ZA: { lat: -30.5595, lon: 22.9375, name: 'Sudáfrica', iso2: 'ZA' },
  KE: { lat: -0.0236, lon: 37.9062, name: 'Kenia', iso2: 'KE' },
  ET: { lat: 9.1450, lon: 40.4897, name: 'Etiopía', iso2: 'ET' },
  SN: { lat: 14.4974, lon: -14.4524, name: 'Senegal', iso2: 'SN' },
  SD: { lat: 12.8628, lon: 30.2176, name: 'Sudán', iso2: 'SD' },
  CN: { lat: 35.8617, lon: 104.1954, name: 'China', iso2: 'CN' },
  JP: { lat: 36.2048, lon: 138.2529, name: 'Japón', iso2: 'JP' },
  KR: { lat: 35.9078, lon: 127.7669, name: 'Corea del Sur', iso2: 'KR' },
  KP: { lat: 40.3399, lon: 127.5101, name: 'Corea del Norte', iso2: 'KP' },
  IN: { lat: 20.5937, lon: 78.9629, name: 'India', iso2: 'IN' },
  PK: { lat: 30.3753, lon: 69.3451, name: 'Pakistán', iso2: 'PK' },
  ID: { lat: -0.7893, lon: 113.9213, name: 'Indonesia', iso2: 'ID' },
  TH: { lat: 15.8700, lon: 100.9925, name: 'Tailandia', iso2: 'TH' },
  VN: { lat: 14.0583, lon: 108.2772, name: 'Vietnam', iso2: 'VN' },
  PH: { lat: 12.8797, lon: 121.7740, name: 'Filipinas', iso2: 'PH' },
  AU: { lat: -25.2744, lon: 133.7751, name: 'Australia', iso2: 'AU' },
  NZ: { lat: -40.9006, lon: 174.8860, name: 'Nueva Zelanda', iso2: 'NZ' },
  IL: { lat: 31.0461, lon: 34.8516, name: 'Israel', iso2: 'IL' },
  PS: { lat: 31.9522, lon: 35.2332, name: 'Palestina', iso2: 'PS' },
  SY: { lat: 34.8021, lon: 38.9968, name: 'Siria', iso2: 'SY' },
  LB: { lat: 33.8547, lon: 35.8623, name: 'Líbano', iso2: 'LB' },
  IR: { lat: 32.4279, lon: 53.6880, name: 'Irán', iso2: 'IR' },
  IQ: { lat: 33.2232, lon: 43.6793, name: 'Iraq', iso2: 'IQ' },
  SA: { lat: 23.8859, lon: 45.0792, name: 'Arabia Saudí', iso2: 'SA' },
  AE: { lat: 23.4241, lon: 53.8478, name: 'EAU', iso2: 'AE' },
  YE: { lat: 15.5527, lon: 48.5164, name: 'Yemen', iso2: 'YE' },
  AF: { lat: 33.9391, lon: 67.7100, name: 'Afganistán', iso2: 'AF' },
}

// Mapping ACLED event_type → categoría Politeia
function acledCategoryMap(eventType: string, subEvent?: string): string {
  const t = (eventType || '').toLowerCase()
  const s = (subEvent || '').toLowerCase()
  if (t.includes('battle') || t.includes('violence against civilians') || s.includes('attack')) return 'Seguridad Defensa'
  if (t.includes('protest') || t.includes('riot') || t.includes('strategic developments')) return 'Política Interior'
  if (t.includes('explosion') || t.includes('remote')) return 'Seguridad Defensa'
  return 'Sociedad'
}

// Heurística para impacto sobre España: si país es vecino o socio top
const HIGH_IMPACT_FOR_ES = new Set(['MA', 'PT', 'FR', 'IT', 'DZ', 'GB', 'DE', 'US', 'MX', 'AR', 'VE', 'CO', 'CN', 'RU', 'UA'])

function baseUrlFromReq(req: Request): string {
  const host = req.headers.get('host')
  if (!host) return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

async function acledFetch(req: Request): Promise<any[]> {
  try {
    const r = await fetch(`${baseUrlFromReq(req)}/api/acled/by-country?days=30`, {
      next: { revalidate: 3600 },
    } as RequestInit)
    if (!r.ok) return []
    const d = await r.json()
    return d.items || d.countries || []
  } catch {
    return []
  }
}

async function gdeltGlobalFetch(req: Request): Promise<any[]> {
  try {
    const r = await fetch(`${baseUrlFromReq(req)}/api/gdelt/articles?query=politics+OR+economy+OR+conflict&timespan=24h&maxrows=250`, {
      next: { revalidate: 1800 },
    } as RequestInit)
    if (!r.ok) return []
    const d = await r.json()
    return d.articles || []
  } catch {
    return []
  }
}

// Sentiment heurístico básico ES/EN
const POS_KW = ['mejora','recuperación','éxito','acuerdo','crece','positivo','récord','optimista','recovery','agreement','breakthrough','success']
const NEG_KW = ['crisis','ataque','muerte','víctimas','guerra','protesta','corrupción','escándalo','attack','death','war','strike','crisis','threat']
function sentimentText(s: string): number {
  const t = (s || '').toLowerCase()
  let p = 0, n = 0
  for (const k of POS_KW) if (t.includes(k)) p++
  for (const k of NEG_KW) if (t.includes(k)) n++
  if (p === 0 && n === 0) return 0
  return (p - n) / (p + n)
}

// Detect category from title keywords
const CATEGORY_KW: Record<string, string[]> = {
  'Política Interior':   ['gobierno','parlamento','elecciones','sánchez','feijóo','moncloa','psoe','pp','vox','sumar','congreso','election'],
  'Política Exterior':   ['ue','unión europea','otan','onu','embajador','exteriores','diplom','foreign','treaty','summit'],
  'Economía':            ['pib','inflación','bce','euro','mercados','empleo','paro','déficit','deuda','economy','inflation','market','jobs','recession'],
  'Sociedad':            ['vivienda','educación','sanidad','social','manifestación','huelga','society','protest','strike'],
  'Salud':               ['salud','sanidad','hospital','medicamento','vacuna','pandemic','virus','health','disease','vaccine'],
  'Medioambiente':       ['clima','medio ambiente','renovable','co2','contaminación','energy','climate','environment','renewable','flood','drought'],
  'Seguridad Defensa':   ['ejército','militar','frontera','terror','atentado','guardia civil','policía','army','military','attack','terror','war'],
  'Justicia':            ['tribunal','juez','fiscal','condena','imputado','court','judge','indictment','trial'],
  'Deporte':             ['fútbol','liga','olimp','atleta','tenis','football','league','olympic'],
}

function detectCategory(text: string): string {
  const t = (text || '').toLowerCase()
  let best = 'Sociedad', bestScore = 0
  for (const [cat, kws] of Object.entries(CATEGORY_KW)) {
    let score = 0
    for (const k of kws) if (t.includes(k)) score++
    if (score > bestScore) { bestScore = score; best = cat }
  }
  return best
}

// Map GDELT sourcecountry text → iso2
const GDELT_COUNTRY_TO_ISO: Record<string, string> = {
  'Spain': 'ES', 'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Portugal': 'PT',
  'United Kingdom': 'GB', 'Ireland': 'IE', 'Netherlands': 'NL', 'Belgium': 'BE',
  'Switzerland': 'CH', 'Austria': 'AT', 'Poland': 'PL', 'Greece': 'GR',
  'United States': 'US', 'Canada': 'CA', 'Mexico': 'MX', 'Brazil': 'BR',
  'Argentina': 'AR', 'Chile': 'CL', 'Colombia': 'CO', 'Venezuela': 'VE',
  'Morocco': 'MA', 'Algeria': 'DZ', 'Egypt': 'EG', 'Nigeria': 'NG', 'South Africa': 'ZA',
  'China': 'CN', 'Japan': 'JP', 'South Korea': 'KR', 'India': 'IN', 'Pakistan': 'PK',
  'Australia': 'AU', 'Israel': 'IL', 'Iran': 'IR', 'Saudi Arabia': 'SA',
  'Russia': 'RU', 'Ukraine': 'UA', 'Turkey': 'TR',
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const region = url.searchParams.get('region') || 'global'
  const category = url.searchParams.get('category') || 'todas'
  const minRelevance = Number(url.searchParams.get('minRelevance') || '0')

  // Fetch ACLED + GDELT en paralelo
  const [acledItems, gdeltArticles] = await Promise.all([acledFetch(req), gdeltGlobalFetch(req)])

  // Aggregate por país
  const byCountry = new Map<string, {
    iso2: string
    country: string
    lat: number
    lon: number
    n_acled: number
    n_gdelt: number
    titles: string[]
    cat_counts: Record<string, number>
    sentiment_sum: number
    sentiment_n: number
  }>()

  // Ingest ACLED items
  for (const it of acledItems) {
    const iso2 = it.iso?.toUpperCase?.() || it.country_iso?.toUpperCase?.() || it.iso2
    if (!iso2 || !COUNTRY_COORDS[iso2]) continue
    const c = COUNTRY_COORDS[iso2]
    if (!byCountry.has(iso2)) {
      byCountry.set(iso2, {
        iso2, country: c.name, lat: c.lat, lon: c.lon,
        n_acled: 0, n_gdelt: 0, titles: [], cat_counts: {}, sentiment_sum: 0, sentiment_n: 0,
      })
    }
    const entry = byCountry.get(iso2)!
    entry.n_acled += (it.count || it.n || 1)
    const evType = it.event_type || it.dominant_event_type || 'protest'
    const cat = acledCategoryMap(evType, it.sub_event_type)
    entry.cat_counts[cat] = (entry.cat_counts[cat] || 0) + (it.count || 1)
  }

  // Ingest GDELT articles
  for (const a of gdeltArticles) {
    const country = a.sourcecountry
    const iso2 = GDELT_COUNTRY_TO_ISO[country]
    if (!iso2 || !COUNTRY_COORDS[iso2]) continue
    const c = COUNTRY_COORDS[iso2]
    if (!byCountry.has(iso2)) {
      byCountry.set(iso2, {
        iso2, country: c.name, lat: c.lat, lon: c.lon,
        n_acled: 0, n_gdelt: 0, titles: [], cat_counts: {}, sentiment_sum: 0, sentiment_n: 0,
      })
    }
    const entry = byCountry.get(iso2)!
    entry.n_gdelt++
    if (a.title && entry.titles.length < 5) entry.titles.push(a.title)
    const cat = detectCategory(a.title || '')
    entry.cat_counts[cat] = (entry.cat_counts[cat] || 0) + 1
    const s = sentimentText(a.title || '')
    entry.sentiment_sum += s
    entry.sentiment_n++
  }

  // Build event array (per country = 1 evento agregado)
  const eventos = Array.from(byCountry.values()).map((c) => {
    const dominantCat = Object.entries(c.cat_counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sociedad'
    const totalN = c.n_acled + c.n_gdelt
    // Relevance: 0-100, basado en volumen + impacto ES
    const relevance = Math.min(100, totalN * 2 + (HIGH_IMPACT_FOR_ES.has(c.iso2) ? 20 : 0))
    const sentiment = c.sentiment_n > 0 ? c.sentiment_sum / c.sentiment_n : 0
    return {
      id: c.iso2,
      iso2: c.iso2,
      country: c.country,
      lat: c.lat,
      lon: c.lon,
      category: dominantCat,
      relevance,
      impact_es: HIGH_IMPACT_FOR_ES.has(c.iso2) || c.iso2 === 'ES',
      sentiment,
      n_acled: c.n_acled,
      n_gdelt: c.n_gdelt,
      n_total: totalN,
      titles: c.titles,
      cat_counts: c.cat_counts,
    }
  })

  // Apply filters
  let filtered = eventos
  if (minRelevance > 0) filtered = filtered.filter((e) => e.relevance >= minRelevance)
  if (category !== 'todas') filtered = filtered.filter((e) => e.category === category)

  // Region filter
  const REGION_ISOS: Record<string, string[]> = {
    'europa': ['ES','FR','DE','IT','PT','GB','IE','NL','BE','CH','AT','PL','GR','SE','NO','FI','DK','HU','CZ','RO','BG','UA','RU','BY','TR'],
    'n-america': ['US','CA','MX'],
    's-america': ['BR','AR','CL','CO','PE','VE','EC','BO','PY','UY','CU'],
    'asia': ['CN','JP','KR','KP','IN','PK','ID','TH','VN','PH','IL','PS','SY','LB','IR','IQ','SA','AE','YE','AF'],
    'africa': ['MA','DZ','TN','LY','EG','ML','NG','ZA','KE','ET','SN','SD'],
  }
  if (region !== 'global' && REGION_ISOS[region]) {
    filtered = filtered.filter((e) => REGION_ISOS[region].includes(e.iso2))
  }

  // KPIs
  const eventosActivos = filtered.length
  const relevanciaCritica = filtered.filter((e) => e.relevance >= 60).length
  const impactoAltoES = filtered.filter((e) => e.impact_es).length
  const sentimientoMedio = filtered.length > 0
    ? filtered.reduce((s, e) => s + e.sentiment, 0) / filtered.length
    : 0
  const sentimientoNegPct = filtered.length > 0
    ? (filtered.filter((e) => e.sentiment < -0.15).length / filtered.length) * 100
    : 0
  const sentimientoPosPct = filtered.length > 0
    ? (filtered.filter((e) => e.sentiment > 0.15).length / filtered.length) * 100
    : 0

  // Sort by relevance desc
  filtered.sort((a, b) => b.relevance - a.relevance)

  return NextResponse.json({
    ok: true,
    data_quality: { source_type: 'live', source_name: 'ACLED + GDELT · aggregator' },
    window: '24h-30d',
    region,
    category,
    minRelevance,
    n_eventos: filtered.length,
    kpis: {
      eventos_activos: eventosActivos,
      relevancia_critica: relevanciaCritica,
      impacto_alto_es: impactoAltoES,
      sentimiento_medio: sentimientoMedio,
      sentimiento_neg_pct: sentimientoNegPct,
      sentimiento_pos_pct: sentimientoPosPct,
    },
    eventos: filtered,
    categories_available: Object.keys(CATEGORY_KW),
    sources: { n_acled_countries: acledItems.length, n_gdelt_articles: gdeltArticles.length },
  })
}
