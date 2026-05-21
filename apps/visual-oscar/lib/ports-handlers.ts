/**
 * Standalone handlers para el módulo Puertos.
 *
 * Sirve datos sin necesidad de backend Python desplegado:
 *  - Catálogos (puertos, vessels, freight, chokepoints) → seed embebido
 *  - APIs externas públicas (World Bank, ECB, GLEIF, GPSJam, EMSC, GIE AGSI,
 *    Comtrade, OFAC/EU/UN consolidated) → fetch directo desde Next.js
 *
 * El proxy `/api/ports/[...path]/route.ts` delega aquí cuando BACKEND_URL
 * no está configurado, garantizando que la UI nunca quede vacía.
 */
import { PORTS_SEED, VESSELS_SEED, FREIGHT_SEED, CHOKEPOINTS_SEED } from './ports-seed'
import { TERMINALS_SEED } from './ports-terminals-seed'
import { SHIPPING_LINES_SEED, CARRIER_SERVICES_SEED } from './ports-shipping-seed'

// Tipos derivados de los seeds
type Port = (typeof PORTS_SEED)[number]
type Vessel = (typeof VESSELS_SEED)[number]
type FreightIdx = (typeof FREIGHT_SEED)[number]
type Chokepoint = (typeof CHOKEPOINTS_SEED)[number]

// ─────────────────────────────────────────────────────────────────
// Helpers · determinístico por hash de string (parity con Python)
// ─────────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * Convergencia env-vars · una sola variable canónica.
 *
 *   PORTS_SYNTH_MODE=allow     · default · permite synthetic (modo demo)
 *   PORTS_SYNTH_MODE=disallow  · KPIs reales o missing (recomendado prod backend)
 *   PORTS_SYNTH_MODE=force     · siempre sintético (testing/QA visual)
 *
 * Backward-compat:
 *   - `PORTS_FORCE_NO_SYNTH=1` → mapea a 'disallow'
 *   - `PORTS_ALLOW_SYNTH=1`    → mapea a 'allow'
 */
type SynthMode = 'allow' | 'disallow' | 'force'
function synthMode(): SynthMode {
  const explicit = (process.env.PORTS_SYNTH_MODE || '').toLowerCase()
  if (explicit === 'allow' || explicit === 'disallow' || explicit === 'force') {
    return explicit
  }
  if (process.env.PORTS_FORCE_NO_SYNTH === '1') return 'disallow'
  if (process.env.PORTS_ALLOW_SYNTH === '1') return 'allow'
  return 'allow'
}
function isAllowSynth(): boolean {
  const m = synthMode()
  return m === 'allow' || m === 'force'
}

/**
 * Helper `quality(source_type, source_name, opts?)` → embebido en cada response
 * para que el frontend pinte el `<DataQualityBadge />` correcto sin adivinar.
 *
 * Convenciones:
 *   - 'live'      → datos del proveedor en esta request (httpx/fetch OK)
 *   - 'cache'     → DB/memoria con TTL fresco
 *   - 'seed'      → catálogo curado estático
 *   - 'synthetic' → calculado por hash determinista (NO real)
 *   - 'missing'   → no disponible
 */
type QualityKind = 'live' | 'cache' | 'seed' | 'synthetic' | 'missing'
function quality(
  source_type: QualityKind,
  source_name: string,
  opts: { retrieved_at?: string; confidence_score?: number; note?: string } = {},
) {
  const base: Record<string, any> = { source_type, source_name }
  if (opts.retrieved_at) base.retrieved_at = opts.retrieved_at
  if (opts.confidence_score != null) base.confidence_score = opts.confidence_score
  if (opts.note) base.note = opts.note
  return base
}

// ─────────────────────────────────────────────────────────────────
// Catálogos · sin red
// ─────────────────────────────────────────────────────────────────

// Alias legacy → canónico inglés. Mantiene compat con URLs cacheadas / frontend antiguo.
const REGION_ALIASES: Record<string, string> = {
  espana: 'spain', es: 'spain', spain: 'spain',
  europa: 'europe', eu: 'europe', europe: 'europe',
  asia_pacifico: 'asia_pacific', asia_pacific: 'asia_pacific',
  norteamerica: 'north_america', north_america: 'north_america',
  oriente_medio: 'middle_east', middle_east: 'middle_east',
  latinoamerica: 'latin_america', latin_america: 'latin_america',
  africa: 'africa',
  chokepoint: 'chokepoint',
}
function normalizeRegion(r: string | null | undefined): string | undefined {
  if (!r) return undefined
  const k = r.trim().toLowerCase()
  return REGION_ALIASES[k] ?? k
}

export function catalogPorts(params: URLSearchParams) {
  const country = params.get('country')
  const type_ = params.get('type_') || params.get('type')
  const region = normalizeRegion(params.get('region'))
  let items: any[] = PORTS_SEED as any[]
  if (country) items = items.filter((p) => p.country_iso === country.toUpperCase())
  if (type_) items = items.filter((p) => p.type === type_)
  if (region) items = items.filter((p) => normalizeRegion(p.region) === region)
  return {
    n_items: items.length,
    items,
    data_quality: quality('seed', 'Catálogo curado', {
      note: '40 puertos críticos · ampliable con World Port Index (NGA Pub. 150)',
    }),
  }
}

export function catalogVessels(params: URLSearchParams) {
  const type_ = params.get('type_') || params.get('type')
  const flag = params.get('flag')
  const operator = params.get('operator')
  let items: any[] = VESSELS_SEED as any[]
  if (type_) items = items.filter((v) => v.type === type_)
  if (flag) items = items.filter((v) => v.flag_iso === flag.toUpperCase())
  if (operator) {
    const q = operator.toLowerCase()
    items = items.filter((v) => (v.operator || '').toLowerCase().includes(q))
  }
  return { n_items: items.length, items }
}

export function snapshotAll(params: URLSearchParams) {
  const region = normalizeRegion(params.get('region'))
  const limit = parseInt(params.get('limit') || '40', 10)
  const allow = isAllowSynth()
  const portsList = (region
    ? (PORTS_SEED as any[]).filter((p) => normalizeRegion(p.region) === region)
    : (PORTS_SEED as any[])
  ).slice(0, limit)
  const items = portsList.map((p) => {
    if (!allow) {
      return {
        ...p,
        vessels_anchored: null,
        arrivals_24h: null,
        congestion_pct: null,
        data_source: 'requires_aisstream',
        available: false,
        data_quality: quality('missing', 'AISStream', {
          note: 'AISSTREAM_API_KEY no configurada · activar para KPIs live.',
        }),
      }
    }
    const h = hashStr(p.slug)
    return {
      ...p,
      vessels_anchored: (h % 80) + 5,
      arrivals_24h: ((h >>> 7) % 40) + 2,
      congestion_pct: ((h >>> 14) % 50) + 10,
      data_source: 'synthetic',
      available: true,
      data_quality: quality('synthetic', 'Hash determinista', {
        note: 'Sin AIS real · KPIs generados desde slug del puerto.',
      }),
    }
  })
  return {
    n_items: items.length,
    items,
    data_source: allow ? 'synthetic' : 'requires_aisstream',
    ais_live: false,
    data_quality: quality(allow ? 'synthetic' : 'missing', 'AISStream', {
      note: allow
        ? 'Sin AISSTREAM_API_KEY · KPIs estimados con hash determinista.'
        : 'AIS no disponible · configurar AISSTREAM_API_KEY en backend.',
    }),
    note: allow
      ? 'Sin AISSTREAM_API_KEY en backend · KPIs estimados (deterministic seed).'
      : null,
  }
}

export function portOverview(slug: string) {
  const p = (PORTS_SEED as any[]).find((x) => x.slug === slug)
  if (!p) return { __404: true }
  const allow = isAllowSynth()
  const h = hashStr(slug)
  const va = allow ? (h % 80) + 5 : null
  const ar = allow ? ((h >>> 7) % 40) + 2 : null
  const cp = allow ? ((h >>> 14) % 50) + 10 : null
  const operators = ['Maersk', 'MSC', 'CMA CGM', 'Hapag-Lloyd', 'COSCO', 'Evergreen', 'ONE', 'Yang Ming']
  // Shape canónico: { name, n_vessels, calls? } · alineado con etl/sources/ports/port_intel.compute_top_operators
  const top_operators = operators.slice(0, 5).map((name, i) => ({
    name,
    n_vessels: allow ? Math.max(1, ((h >>> (i * 3)) % 12) + 1) : 0,
  }))
  return {
    ...p,
    kpis_24h: {
      vessels_anchored: va,
      arrivals_24h: ar,
      congestion_pct: cp,
      avg_wait_h: allow ? ((h >>> 21) % 18) + 2 : null,
      teu_estimated: allow && p.type === 'container' ? ((h % 8000) + 4000) * 30 : null,
    },
    top_operators,
    cargo_mix: allow
      ? [
          { cargo: 'container', pct: (h % 40) + 20 },
          { cargo: 'bulk', pct: ((h >>> 4) % 30) + 10 },
          { cargo: 'tanker', pct: ((h >>> 8) % 25) + 5 },
        ]
      : [],
    data_source: allow ? 'synthetic' : 'requires_aisstream',
    data_quality: quality(allow ? 'synthetic' : 'missing', 'AISStream + seed', {
      note: allow
        ? 'KPIs y top_operators estimados con hash · ficha base (lat/lon/UNLOCODE) viene de seed.'
        : 'AIS no disponible · activar AISSTREAM_API_KEY para datos reales.',
    }),
  }
}

export function portVessels(slug: string, params: URLSearchParams) {
  const limit = parseInt(params.get('limit') || '50', 10)
  const port = (PORTS_SEED as any[]).find((p) => p.slug === slug)
  if (!port) return { __404: true }
  if (!isAllowSynth()) {
    return { port_slug: slug, n_vessels: 0, data_source: 'requires_aisstream', items: [] }
  }
  const h = hashStr(slug)
  const items = (VESSELS_SEED as any[]).slice(0, Math.min(limit, 50)).map((v, i) => {
    const lat = port.lat + (((h >>> i) % 11) - 5) / 8
    const lon = port.lon + (((h >>> (i * 2)) % 11) - 5) / 6
    return {
      imo: v.imo,
      mmsi: v.mmsi,
      name: v.name,
      ts: new Date().toISOString(),
      lat,
      lon,
      sog: ((h >>> (i * 3)) % 18) / 10,
      cog: ((h >>> (i * 5)) % 360),
      nav_status: 'at anchor',
      near_port_slug: slug,
      flag_iso: v.flag_iso,
      type: v.type,
      operator: v.operator,
      is_synthetic: true, // Marca visible · UI lo pinta en ámbar punteado
    }
  })
  return {
    port_slug: slug,
    n_vessels: items.length,
    data_source: 'synthetic',
    items,
    data_quality: quality('synthetic', 'AISStream', {
      note: 'Buques posicionados sinteticamente alrededor del puerto · NO son AIS real.',
    }),
  }
}

export function portCalls(slug: string, params: URLSearchParams) {
  const daysBack = parseInt(params.get('days_back') || '7', 10)
  const limit = parseInt(params.get('limit') || '100', 10)
  if (!(PORTS_SEED as any[]).find((p) => p.slug === slug)) return { __404: true }
  if (!isAllowSynth()) {
    return { port_slug: slug, days_back: daysBack, n_items: 0, items: [] }
  }
  const h = hashStr(slug)
  const now = Date.now()
  const items = (VESSELS_SEED as any[]).slice(0, Math.min(limit, 40)).map((v, i) => {
    const ms = now - ((i + 1) * (h % 18 + 6)) * 3600 * 1000
    const dur = ((h >>> i) % 36 + 6) * 60
    return {
      imo: v.imo,
      vessel_name: v.name,
      arrival_ts: new Date(ms).toISOString(),
      departure_ts: new Date(ms + dur * 60_000).toISOString(),
      duration_min: dur,
      cargo_inferred: v.type,
      source_kind: 'synthetic',
    }
  })
  return { port_slug: slug, days_back: daysBack, n_items: items.length, items }
}

export function portCongestion(slug: string, params: URLSearchParams) {
  const days = parseInt(params.get('days') || '30', 10)
  if (!(PORTS_SEED as any[]).find((p) => p.slug === slug)) return { __404: true }
  const allow = isAllowSynth()
  const h = hashStr(slug)
  const series = Array.from({ length: days }).map((_, i) => {
    const ts = new Date(Date.now() - (days - i - 1) * 86_400_000).toISOString()
    return {
      ts,
      vessels_anchored: allow ? (((h >>> i) % 60) + 10) : 0,
      arrivals_24h: allow ? (((h >>> (i * 2)) % 30) + 4) : 0,
    }
  })
  const last = series[series.length - 1]
  return {
    port_slug: slug,
    days,
    series,
    current: allow
      ? {
          vessels_anchored: last.vessels_anchored,
          arrivals_24h: last.arrivals_24h,
          avg_wait_h: ((h >>> 11) % 18) + 2,
          congestion_pct: ((h >>> 14) % 50) + 10,
        }
      : null,
    data_source: allow ? 'synthetic' : 'requires_aisstream',
  }
}

// ─────────────────────────────────────────────────────────────────
// Vessels detail · seed
// ─────────────────────────────────────────────────────────────────

export function vesselLookup(imo: string) {
  const v = (VESSELS_SEED as any[]).find((x) => x.imo === imo || x.imo === `IMO${imo}`)
  if (!v) return { __404: true }
  const h = hashStr(v.imo)
  const allow = isAllowSynth()
  // Posición sintética sobre algún puerto pseudo-aleatorio
  const port = (PORTS_SEED as any[])[h % PORTS_SEED.length]
  return {
    ...v,
    ts: new Date().toISOString(),
    lat: allow ? port.lat + (((h % 11) - 5) / 8) : null,
    lon: allow ? port.lon + ((((h >>> 4) % 11) - 5) / 6) : null,
    sog: allow ? ((h % 200) / 10) : null,
    cog: allow ? (h % 360) : null,
    nav_status: allow ? 'at anchor' : 'unknown',
    near_port_slug: allow ? port.slug : null,
    data_source: allow ? 'synthetic' : 'requires_aisstream',
  }
}

export function vesselTrack(imo: string, params: URLSearchParams) {
  const hours = parseInt(params.get('hours') || '48', 10)
  const max = parseInt(params.get('max_points') || '100', 10)
  const v = (VESSELS_SEED as any[]).find((x) => x.imo === imo)
  if (!v) return { __404: true }
  const allow = isAllowSynth()
  if (!allow) {
    return { imo, vessel_name: v.name, hours, n_points: 0, points: [], data_source: 'requires_aisstream' }
  }
  const h = hashStr(v.imo)
  const start = (PORTS_SEED as any[])[h % PORTS_SEED.length]
  const n = Math.min(max, Math.max(6, hours / 2))
  const points = Array.from({ length: Math.floor(n) }).map((_, i) => {
    const dt = new Date(Date.now() - (n - i) * 3_600_000 * (hours / n)).toISOString()
    return {
      ts: dt,
      lat: start.lat + ((i * ((h % 7) + 1)) / 50),
      lon: start.lon + ((i * (((h >>> 5) % 7) + 1)) / 30),
      sog: ((h >>> i) % 200) / 10,
    }
  })
  return { imo, vessel_name: v.name, hours, n_points: points.length, points, data_source: 'synthetic' }
}

// ─────────────────────────────────────────────────────────────────
// Freight · seed + intento real World Bank
// ─────────────────────────────────────────────────────────────────

export function freightSnapshot() {
  const allow = isAllowSynth()
  const items = (FREIGHT_SEED as any[]).map((idx) => {
    if (!allow) {
      return {
        ...idx,
        last_price: null,
        change_pct: null,
        signal: 'estable',
        data_quality: quality('missing', 'Yahoo Finance', {
          note: 'Activar fetch real desde yfinance para precios actualizados.',
        }),
      }
    }
    const h = hashStr(idx.slug)
    const lastPrice = idx.base_level * (1 + (((h % 1000) - 500) / 5000))
    const changePct = ((h % 600) - 300) / 100
    let signal = 'estable'
    if (changePct >= 4) signal = 'fuerte_subida'
    else if (changePct >= 1) signal = 'subida'
    else if (changePct <= -4) signal = 'fuerte_bajada'
    else if (changePct <= -1) signal = 'bajada'
    return {
      ...idx,
      last_price: Math.round(lastPrice * 100) / 100,
      change_pct: Math.round(changePct * 100) / 100,
      signal,
      data_quality: quality('synthetic', 'Yahoo Finance', {
        note: `Precio estimado · activar yfinance para ${idx.yahoo_ticker ?? idx.slug}`,
      }),
    }
  })
  return {
    n_items: items.length,
    data_source: allow ? 'synthetic' : 'requires_yahoo',
    items,
    data_quality: quality(allow ? 'synthetic' : 'missing', 'Yahoo Finance', {
      note: allow ? 'Snapshot fletes con hash determinista.' : 'Yahoo no accesible.',
    }),
  }
}

export function freightPrice(slug: string, params: URLSearchParams) {
  const range = params.get('range') || '6mo'
  const idx = (FREIGHT_SEED as any[]).find((x) => x.slug === slug)
  if (!idx) return { __404: true }
  const days =
    range === '1mo' ? 30 : range === '3mo' ? 90 : range === '1y' ? 365 : 180
  const h = hashStr(slug)
  const ohlc = Array.from({ length: days }).map((_, i) => {
    const seed = (h + i * 31) >>> 0
    const close = idx.base_level * (1 + (((seed % 200) - 100) / 2000))
    const open = close * (1 + (((seed >>> 10) % 30 - 15) / 2000))
    const high = Math.max(open, close) * (1 + ((seed % 30) / 2000))
    const low = Math.min(open, close) * (1 - (((seed >>> 5) % 30) / 2000))
    return {
      ts: new Date(Date.now() - (days - i - 1) * 86_400_000).toISOString().slice(0, 10),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    }
  })
  return { slug, name: idx.name, range, n_points: ohlc.length, ohlc, data_source: 'synthetic' }
}

// ─────────────────────────────────────────────────────────────────
// Chokepoints · seed con risk score determinista
// ─────────────────────────────────────────────────────────────────

export function chokepointsList(params: URLSearchParams) {
  const days = parseInt(params.get('days') || '30', 10)
  const items = (CHOKEPOINTS_SEED as any[])
    .map((ck) => {
      const h = hashStr(ck.slug)
      const events = (h >>> 3) % 10
      const score = Math.min(100, ck.score_base + Math.min(events * 5, 50))
      let level = 'minimo'
      if (score >= 80) level = 'critico'
      else if (score >= 60) level = 'alto'
      else if (score >= 40) level = 'medio'
      else if (score >= 20) level = 'bajo'
      return {
        ...ck,
        risk_score: score,
        risk_level: level,
        n_events_30d: events,
        recent_events: [],
        data_source: 'synthetic',
        data_quality: quality('synthetic', 'ACLED + seed', {
          note: 'Score base de seed + boost determinista · activar ACLED_API_KEY para eventos reales.',
        }),
      }
    })
    .sort((a, b) => b.risk_score - a.risk_score)
  return {
    n_items: items.length,
    days,
    items,
    data_quality: quality('seed', 'Chokepoints curados', {
      note: '6 corredores marítimos críticos · score base curado, boost sintético sin ACLED real.',
    }),
  }
}

export function chokepointDetail(slug: string, params: URLSearchParams) {
  const ck = (CHOKEPOINTS_SEED as any[]).find((x) => x.slug === slug)
  if (!ck) return { __404: true }
  const days = parseInt(params.get('days') || '30', 10)
  const h = hashStr(slug)
  const events = (h >>> 3) % 10
  const score = Math.min(100, ck.score_base + Math.min(events * 5, 50))
  let level = 'minimo'
  if (score >= 80) level = 'critico'
  else if (score >= 60) level = 'alto'
  else if (score >= 40) level = 'medio'
  else if (score >= 20) level = 'bajo'
  const recent_events = Array.from({ length: events }).map((_, i) => ({
    ts: new Date(Date.now() - (i + 1) * 86_400_000 * 2).toISOString(),
    event_type: ['protest', 'armed_clash', 'remote_violence', 'attack_civilians'][i % 4],
    fatalities: (h >>> i) % 6,
    notes: 'Synthetic placeholder · activa ACLED_API_KEY para eventos reales',
  }))
  return {
    ...ck,
    risk_score: score,
    risk_level: level,
    n_events_30d: events,
    recent_events,
    days,
    data_source: 'synthetic',
    data_quality: quality('synthetic', 'ACLED + seed', {
      note: 'Eventos placeholder · activar ACLED para detalle real.',
    }),
  }
}

// ─────────────────────────────────────────────────────────────────
// Sanciones · stub determinista
// ─────────────────────────────────────────────────────────────────

export function vesselScreen(imo: string) {
  const v = (VESSELS_SEED as any[]).find((x) => x.imo === imo)
  if (!v) return { __404: true }
  return {
    ok: true,
    imo: v.imo,
    vessel_name: v.name,
    operator: v.operator,
    flag_iso: v.flag_iso,
    type: v.type,
    hit: false,
    risk_score: 0,
    risk_level: 'CLEAR',
    sources: [],
    checks: [
      { query: v.name, type: 'vessel_name', risk_score: 0, risk_level: 'CLEAR', n_hits: 0 },
    ],
  }
}

export function sanctionsScreen(body: any) {
  const vessels: string[] = body?.vessels || []
  const operators: string[] = body?.operators || []
  const vs = vessels.map((imo) => vesselScreen(imo)).filter((r) => !(r as any).__404) as any[]
  const ops = operators.map((name) => ({
    ok: true,
    operator: name,
    risk_score: 0,
    risk_level: 'CLEAR',
    hit: false,
    sources: [],
  }))
  return {
    ok: true,
    vessels: vs,
    operators: ops,
    summary: {
      n_vessels_checked: vs.length,
      n_vessels_hit: 0,
      n_operators_checked: ops.length,
      n_operators_hit: 0,
      any_hit: false,
    },
  }
}

// ─────────────────────────────────────────────────────────────────
// Trade · seed mínimo (ES con principales socios)
// ─────────────────────────────────────────────────────────────────

const TRADE_SEED = [
  { reporter_iso: 'ESP', partner_iso: 'DEU', value_usd: 33_400_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'DEU', value_usd: 39_100_000_000, flow_kind: 'import' },
  { reporter_iso: 'ESP', partner_iso: 'FRA', value_usd: 50_800_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'FRA', value_usd: 31_200_000_000, flow_kind: 'import' },
  { reporter_iso: 'ESP', partner_iso: 'ITA', value_usd: 28_500_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'ITA', value_usd: 22_400_000_000, flow_kind: 'import' },
  { reporter_iso: 'ESP', partner_iso: 'PRT', value_usd: 27_100_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'GBR', value_usd: 22_300_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'USA', value_usd: 19_200_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'USA', value_usd: 16_900_000_000, flow_kind: 'import' },
  { reporter_iso: 'ESP', partner_iso: 'CHN', value_usd: 7_300_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'CHN', value_usd: 38_800_000_000, flow_kind: 'import' },
  { reporter_iso: 'ESP', partner_iso: 'MAR', value_usd: 12_100_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'NLD', value_usd: 13_400_000_000, flow_kind: 'export' },
  { reporter_iso: 'ESP', partner_iso: 'TUR', value_usd: 7_800_000_000, flow_kind: 'export' },
]

const EU_27 = new Set([
  'ES', 'DE', 'FR', 'IT', 'PT', 'NL', 'BE', 'GB', 'IE', 'PL', 'GR', 'AT', 'DK', 'FI', 'SE',
  'CZ', 'RO', 'HU', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY',
  'ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'BEL', 'GBR', 'IRL', 'POL', 'GRC', 'AUT',
  'DNK', 'FIN', 'SWE', 'CZE', 'ROU', 'HUN', 'BGR', 'HRV', 'SVK', 'SVN', 'LTU', 'LVA',
  'EST', 'LUX', 'MLT', 'CYP',
])

export function tradeBilateral(params: URLSearchParams) {
  const reporter = (params.get('reporter') || '').toUpperCase()
  const partner = (params.get('partner') || '').toUpperCase()
  // Acepta `hs_code` (frontend canónico) y `hs` (backend Python legacy)
  const hsCode = params.get('hs_code') || params.get('hs') || null
  const period = params.get('period') || '2024-12'
  const flow = params.get('flow')
  const useSource = EU_27.has(reporter) && EU_27.has(partner) ? 'comext' : 'comtrade'
  let items = TRADE_SEED.filter(
    (t) => t.reporter_iso === reporter && t.partner_iso === partner,
  )
  if (flow) items = items.filter((t) => t.flow_kind === flow)
  const enriched = items.map((t) => ({
    ...t,
    hs_code: hsCode || 'TOTAL',
    period_ym: period,
    qty: null,
    unit: null,
    source: useSource,
  }))
  return {
    ok: true,
    reporter_iso: reporter,
    partner_iso: partner,
    hs_code: hsCode,
    period_ym: period,
    flow_kind: flow,
    use_source: useSource,
    n_items: enriched.length,
    items: enriched,
  }
}

export function tradeSpainFlows(params: URLSearchParams) {
  const period = params.get('period') || '2024-12'
  const flow = params.get('flow')
  // Acepta `hs_code` (canónico) y `hs` (alias backend)
  const hsCode = params.get('hs_code') || params.get('hs') || null
  let items = TRADE_SEED.filter((t) => t.reporter_iso === 'ESP')
  if (flow) items = items.filter((t) => t.flow_kind === flow)
  const enriched = items.map((t) => ({ ...t, hs_code: hsCode || 'TOTAL', period_ym: period, source: 'comext' }))
  return {
    ok: true,
    reporter_iso: 'ESP',
    period_ym: period,
    flow_kind: flow,
    n_items: enriched.length,
    items: enriched,
  }
}

export function tradeTopPartners(params: URLSearchParams) {
  const reporter = (params.get('reporter') || 'ESP').toUpperCase()
  const flow = (params.get('flow') || 'export') as 'export' | 'import'
  const limit = parseInt(params.get('limit') || '10', 10)
  const items = TRADE_SEED
    .filter((t) => t.reporter_iso === reporter && t.flow_kind === flow)
    .sort((a, b) => b.value_usd - a.value_usd)
    .slice(0, limit)
  const total = items.reduce((s, x) => s + x.value_usd, 0)
  return {
    ok: true,
    reporter_iso: reporter,
    flow_kind: flow,
    n_items: items.length,
    items: items.map((t) => ({
      partner_iso: t.partner_iso,
      value_usd: t.value_usd,
      share_pct: total > 0 ? Math.round((t.value_usd / total) * 1000) / 10 : 0,
    })),
  }
}

// ─────────────────────────────────────────────────────────────────
// APIs externas públicas · fetch directo desde Next.js
// ─────────────────────────────────────────────────────────────────

const WB_BASE = 'https://api.worldbank.org/v2/en/indicator'
const ECB_BASE = 'https://data-api.ecb.europa.eu/service/data'
const GLEIF_BASE = 'https://api.gleif.org/api/v1'
const GPSJAM_BASE = 'https://gpsjam.org/data'
const EMSC_BASE = 'https://www.seismicportal.eu/fdsnws/event/1/query'
const AGSI_BASE = 'https://agsi.gie.eu/api'

const WB_INDICATORS: Record<string, { wb_code: string; name: string; category: string; unit: string }> = {
  energy_index: { wb_code: 'PNRG_INDEX', name: 'Energy Commodity Index (WB)', category: 'energy', unit: 'index 2010=100' },
  food_index: { wb_code: 'PFOOD_INDEX', name: 'Food Price Index (WB)', category: 'food', unit: 'index 2010=100' },
  metals_index: { wb_code: 'PMETA_INDEX', name: 'Metals & Minerals Index (WB)', category: 'metals', unit: 'index 2010=100' },
  agriraw_index: { wb_code: 'PRAWM_INDEX', name: 'Agricultural Raw Materials Index (WB)', category: 'agri', unit: 'index 2010=100' },
}

export async function worldBankSnapshot() {
  const items: any[] = []
  await Promise.all(
    Object.entries(WB_INDICATORS).map(async ([slug, cfg]) => {
      try {
        const url = `${WB_BASE}/${cfg.wb_code}?format=json&per_page=24`
        const r = await fetch(url, { next: { revalidate: 3600 } })
        if (!r.ok) {
          items.push({ slug, ...cfg, last_value: null, data_source: 'unavailable' })
          return
        }
        const data = await r.json()
        if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
          items.push({ slug, ...cfg, last_value: null, data_source: 'unavailable' })
          return
        }
        const series = (data[1] as any[])
          .filter((row) => row.value != null)
          .map((row) => ({ ts: row.date, value: Number(row.value) }))
          .sort((a, b) => a.ts.localeCompare(b.ts))
        const last = series[series.length - 1]
        const prev = series[series.length - 2]
        const changePct = last && prev && prev.value ? ((last.value / prev.value) - 1) * 100 : null
        items.push({
          slug,
          ...cfg,
          last_value: last ? last.value : null,
          last_ts: last ? last.ts : null,
          change_pct: changePct != null ? Math.round(changePct * 100) / 100 : null,
          data_source: 'world_bank',
        })
      } catch (e) {
        items.push({ slug, ...cfg, last_value: null, data_source: 'error' })
      }
    }),
  )
  return { n_items: items.length, items, data_source: 'world_bank' }
}

export async function worldBankSeries(slug: string, params: URLSearchParams) {
  const perPage = parseInt(params.get('per_page') || '60', 10)
  const cfg = WB_INDICATORS[slug]
  if (!cfg) return { __404: true }
  try {
    const url = `${WB_BASE}/${cfg.wb_code}?format=json&per_page=${perPage}`
    const r = await fetch(url, { next: { revalidate: 3600 } })
    if (!r.ok) return { ok: false, slug, series: [] }
    const data = await r.json()
    if (!Array.isArray(data) || data.length < 2) return { ok: false, slug, series: [] }
    const series = (data[1] as any[])
      .filter((row) => row.value != null)
      .map((row) => ({ ts: row.date, value: Number(row.value) }))
      .sort((a, b) => a.ts.localeCompare(b.ts))
    return { ok: true, slug, indicator: cfg, n_points: series.length, series, data_source: 'world_bank' }
  } catch (e) {
    return { ok: false, slug, series: [], error: String(e) }
  }
}

export async function ecbFx(currency: string, params: URLSearchParams) {
  const lastN = parseInt(params.get('last_n') || '24', 10)
  const cur = currency.toUpperCase()
  try {
    const url = `${ECB_BASE}/EXR/M.${cur}.EUR.SP00.A?format=csvdata&lastNObservations=${lastN}`
    const r = await fetch(url, { headers: { Accept: 'text/csv' }, next: { revalidate: 3600 } })
    if (!r.ok) return { ok: false, currency: cur, series: [] }
    const text = await r.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return { ok: true, currency: cur, n_points: 0, series: [], data_source: 'ecb_sdw' }
    const header = lines[0].split(',').map((h) => h.replace(/"/g, '').trim())
    const idxPeriod = header.indexOf('TIME_PERIOD')
    const idxValue = header.indexOf('OBS_VALUE')
    const series = lines.slice(1).map((row) => {
      const cells = row.split(',').map((c) => c.replace(/"/g, '').trim())
      return { ts: cells[idxPeriod], value: parseFloat(cells[idxValue]) }
    }).filter((p) => p.ts && !isNaN(p.value))
    series.sort((a, b) => a.ts.localeCompare(b.ts))
    return { ok: true, currency: cur, n_points: series.length, series, data_source: 'ecb_sdw' }
  } catch (e) {
    return { ok: false, currency: cur, series: [], error: String(e) }
  }
}

export async function gleifSearch(params: URLSearchParams) {
  const name = params.get('name') || ''
  const limit = parseInt(params.get('limit') || '5', 10)
  if (!name) return { ok: false, query: name, items: [] }
  try {
    const url = `${GLEIF_BASE}/lei-records?filter[entity.legalName]=${encodeURIComponent(name)}&page[size]=${limit}`
    const r = await fetch(url, { headers: { Accept: 'application/vnd.api+json' }, next: { revalidate: 1800 } })
    if (!r.ok) return { ok: false, query: name, items: [] }
    const data = await r.json()
    const items = (data?.data || []).map((rec: any) => {
      const attrs = rec.attributes || {}
      const entity = attrs.entity || {}
      return {
        lei: rec.id,
        legal_name: entity.legalName?.name || '',
        status: entity.status,
        jurisdiction: entity.jurisdiction,
        legal_address: entity.legalAddress,
      }
    })
    return { ok: true, query: name, n_items: items.length, items }
  } catch (e) {
    return { ok: false, query: name, items: [], error: String(e) }
  }
}

export async function gpsjamLatest() {
  const today = new Date()
  for (let back = 1; back <= 5; back++) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - back)
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    try {
      const r = await fetch(`${GPSJAM_BASE}/${yyyy}/${mm}/${dd}.geojson`, { next: { revalidate: 3600 } })
      if (r.ok) {
        const data = await r.json()
        if (data?.features?.length) {
          return { ok: true, date: `${yyyy}-${mm}-${dd}`, n_features: data.features.length, geojson: data }
        }
      }
    } catch {}
  }
  return { ok: false, reason: 'GPSJam no respondió en los últimos 5 días', features: [] }
}

export async function seismicRecent(params: URLSearchParams) {
  const minMag = parseFloat(params.get('min_mag') || '4.0')
  const days = parseInt(params.get('days') || '30', 10)
  const limit = parseInt(params.get('limit') || '200', 10)
  const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19)
  try {
    const url = `${EMSC_BASE}?format=json&limit=${limit}&minmag=${minMag}&starttime=${start}`
    const r = await fetch(url, { next: { revalidate: 1800 } })
    if (!r.ok) return { ok: false, items: [] }
    const data = await r.json()
    const items = (data?.features || []).map((feat: any) => {
      const p = feat.properties || {}
      const c = feat.geometry?.coordinates || []
      return {
        ts: p.time,
        magnitude: p.mag,
        depth_km: p.depth,
        region: p.flynn_region,
        lat: c[1],
        lon: c[0],
        url: p.url,
        id: feat.id,
      }
    })
    return { ok: true, n_items: items.length, items, data_source: 'emsc' }
  } catch (e) {
    return { ok: false, items: [], error: String(e) }
  }
}

export async function gasStorageEu() {
  try {
    const res = await fetch(`${AGSI_BASE}?type=eu&date=${new Date().toISOString().slice(0, 10)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { ok: false, n_items: 0, items: [], reason: `agsi status ${res.status}` }
    const data = await res.json()
    const rows = Array.isArray(data?.data) ? data.data : []
    return {
      ok: true,
      n_items: rows.length,
      items: rows.map((r: any) => ({
        country_iso: r.code || r.country || '',
        full_pct: r.full,
        gas_in_storage_twh: r.gasInStorage,
        trend: r.trend,
        date: r.gasDayStart,
      })),
      data_source: 'gie_agsi',
    }
  } catch (e) {
    return { ok: false, n_items: 0, items: [], error: String(e) }
  }
}

// ─────────────────────────────────────────────────────────────────
// Data sources status · standalone reporter
// ─────────────────────────────────────────────────────────────────

export function dataSourcesStatus() {
  const items = [
    { key: 'aisstream', label: 'AIS · AISstream', category: 'vessel_positions', live: false,
      reason: 'AISSTREAM_API_KEY no configurada en backend · KPIs sintéticos para demo',
      env_hint: 'AISSTREAM_API_KEY' },
    { key: 'comtrade', label: 'UN Comtrade', category: 'trade_flows', live: false,
      reason: 'Backend Python no desplegado · usando seed comercial top-15 socios España',
      env_hint: 'COMTRADE_API_KEY' },
    { key: 'comext', label: 'Eurostat Comext', category: 'trade_flows_eu', live: false,
      reason: 'Backend Python no desplegado · usando seed Comext',
      env_hint: null },
    { key: 'yahoo_freight', label: 'Yahoo Finance · Freight', category: 'freight', live: false,
      reason: 'Backend Python no desplegado · usando OHLC sintético para BDI/FBX',
      env_hint: null },
    { key: 'acled', label: 'ACLED · Eventos geopolíticos', category: 'chokepoint_risk', live: false,
      reason: 'Backend Python no desplegado · risk_score solo con score_base',
      env_hint: 'ACLED_API_KEY + ACLED_EMAIL' },
    { key: 'opensanctions', label: 'OpenSanctions API', category: 'sanctions', live: false,
      reason: 'Backend Python no desplegado · screening retorna CLEAR',
      env_hint: 'OPENSANCTIONS_API_URL' },
    { key: 'world_bank', label: 'World Bank · Commodity Indices', category: 'freight', live: true,
      reason: 'API pública sin auth · fetch directo desde frontend',
      env_hint: null },
    { key: 'ecb_sdw', label: 'ECB · Statistical Data Warehouse', category: 'macro_fx', live: true,
      reason: 'API pública sin auth · fetch directo',
      env_hint: null },
    { key: 'gleif', label: 'GLEIF · LEI / corporate', category: 'corporate', live: true,
      reason: 'API pública sin auth · fetch directo',
      env_hint: null },
    { key: 'gpsjam', label: 'GPSJam · GNSS jamming', category: 'gnss_risk', live: true,
      reason: 'GeoJSON público diario · fetch directo',
      env_hint: null },
    { key: 'emsc', label: 'EMSC · Eventos sísmicos', category: 'geophysical_risk', live: true,
      reason: 'FDSN público · fetch directo',
      env_hint: null },
    { key: 'gie_agsi', label: 'GIE AGSI+ · Gas storage EU', category: 'energy_storage', live: true,
      reason: 'API pública · fetch directo (registro opcional para premium)',
      env_hint: 'GIE_API_KEY' },
  ]
  const nLive = items.filter((s) => s.live).length
  return {
    n_sources: items.length,
    n_live: nLive,
    all_live: nLive === items.length,
    any_live: nLive > 0,
    items,
    standalone_mode: true,
  }
}

// ─────────────────────────────────────────────────────────────────
// Sprint 2 Fase C · port_terminals / port_traffic / port_connectivity
// ─────────────────────────────────────────────────────────────────

export function portTerminals(slug: string, _params: URLSearchParams) {
  const port = (PORTS_SEED as any[]).find((x) => x.slug === slug)
  if (!port) return { __404: true }
  const items = (TERMINALS_SEED as any[]).filter((t) => t.port_slug === slug)
  return {
    port_slug: slug,
    n_items: items.length,
    items: items.map((t) => ({
      ...t,
      data_quality: quality('seed', 'Catálogo curado · terminales', {
        note: 'Operador y capacidad TEU de fuente pública · refrescable desde aapp.',
        confidence_score: 0.85,
      }),
    })),
    data_quality: quality('seed', 'port_terminals_seed.yaml', {
      note: `${items.length} terminales en ${slug} · curado para Sprint 2.`,
    }),
  }
}

/**
 * Tráfico mensual del puerto · TEU/toneladas · serie de N meses.
 *
 * Sin backend Python ni Puertos del Estado scraping, deriva una serie
 * sintética determinista desde anuales públicos conocidos (Algeciras 5.2M TEU,
 * Valencia 5.4M, etc.) con variación estacional sinusoidal ±12 %. Marcada
 * como `synthetic` en data_quality para que el usuario lo vea.
 *
 * Cuando se ejecute `python -m etl.sources.ports.puertos_estado --demo`
 * la tabla `port_monthly_traffic` se poblará con los mismos valores; el
 * backend Python servirá entonces el endpoint real.
 */
const ANNUAL_TEU_ESTIMATES: Record<string, number> = {
  algeciras: 5200000,
  valencia: 5400000,
  barcelona: 3550000,
  bilbao: 640000,
  las_palmas: 830000,
  cartagena_es: 40000,
  rotterdam: 14500000,
  antwerp: 12500000,
  hamburg: 8300000,
  felixstowe: 4000000,
  le_havre: 3000000,
  genoa: 2700000,
  piraeus: 5400000,
  gioia_tauro: 3500000,
  singapore: 37000000,
  shanghai: 49000000,
  ningbo: 35000000,
  shenzhen: 30000000,
  busan: 23000000,
  hong_kong: 14000000,
  kaohsiung: 9500000,
  tokyo: 4300000,
  port_klang: 13000000,
  tanjung_pelepas: 10000000,
  los_angeles: 9200000,
  long_beach: 8300000,
  ny_nj: 9300000,
  houston: 4000000,
  vancouver: 3700000,
  savannah: 5400000,
  jebel_ali: 14000000,
  jeddah: 5300000,
  khor_fakkan: 4500000,
  hamad: 1500000,
  port_said: 4000000,
  suez_north: 100000,
  suez_south: 100000,
  salalah: 4400000,
  colombo: 7000000,
  tanger_med: 10000000,
  panama_cristobal: 3500000,
}

export function portTraffic(slug: string, params: URLSearchParams) {
  const port = (PORTS_SEED as any[]).find((x) => x.slug === slug)
  if (!port) return { __404: true }

  const months = parseInt(params.get('months') || '24', 10)
  const from = params.get('from') // 'YYYY-MM'
  const to = params.get('to')
  const annualTeu = ANNUAL_TEU_ESTIMATES[slug] ?? null
  const annualTonnes = annualTeu ? annualTeu * 16 : null // proxy mediano TEU→tonnes

  const items: any[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const period_ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (from && period_ym < from) continue
    if (to && period_ym > to) continue
    // variación estacional ±12 % · pico en verano (mes 7), mínimo en febrero
    const seasonal = 1.0 + 0.12 * Math.sin(((d.getMonth() + 1) / 12) * 2 * Math.PI - 1.0)
    items.push({
      port_slug: slug,
      period_ym,
      teu_total: annualTeu != null ? Math.round((annualTeu / 12) * seasonal) : null,
      tonnes_total: annualTonnes != null ? Math.round((annualTonnes / 12) * seasonal) : null,
      source: 'estimate',
      data_quality: 'synthetic',
    })
  }

  return {
    port_slug: slug,
    from_period: items[0]?.period_ym ?? null,
    to_period: items[items.length - 1]?.period_ym ?? null,
    n_items: items.length,
    items,
    data_quality: quality(annualTeu != null ? 'synthetic' : 'missing', 'Estimación anual + estacional', {
      note: annualTeu != null
        ? 'Serie derivada de TEU anual público con variación estacional ±12%. Real cuando se ejecuta puertos_estado.py'
        : 'Sin estimación anual conocida · puertos.es no cubre este puerto.',
      confidence_score: 0.5,
    }),
  }
}

/**
 * Connectivity bilateral del puerto · qué otros puertos conecta vía servicios.
 *
 * Sprint 2 Fase D poblará esto desde `carrier_services.port_rotation`. Por
 * ahora devuelve seed sintético con los 5-6 partners más obvios por región.
 */
const CONNECTIVITY_SEED: Record<string, string[]> = {
  algeciras: ['rotterdam', 'shanghai', 'singapore', 'jebel_ali', 'tanger_med', 'panama_cristobal'],
  valencia: ['rotterdam', 'shanghai', 'jebel_ali', 'savannah', 'algeciras'],
  rotterdam: ['shanghai', 'singapore', 'ny_nj', 'savannah', 'hamburg', 'antwerp'],
  shanghai: ['singapore', 'rotterdam', 'los_angeles', 'long_beach', 'ningbo', 'busan'],
  singapore: ['shanghai', 'rotterdam', 'jebel_ali', 'colombo', 'port_klang'],
  jebel_ali: ['singapore', 'rotterdam', 'jeddah', 'khor_fakkan', 'hamad'],
  los_angeles: ['shanghai', 'busan', 'ningbo', 'tokyo', 'long_beach'],
}

// ─────────────────────────────────────────────────────────────────
// Sprint 2 Fase F · vessel sisters + AIS anomalies
// ─────────────────────────────────────────────────────────────────

/**
 * Sister vessels · buques de la misma clase, builder y year ±2.
 *
 * Sin tabla `vessels_master` poblada, heurística sobre VESSELS_SEED:
 * mismo `type` + mismo `operator` + año de construcción dentro de ±3 años.
 */
export function vesselSisters(imo: string) {
  const ref = (VESSELS_SEED as any[]).find((v) => v.imo === imo)
  if (!ref) return { __404: true }
  const sisters = (VESSELS_SEED as any[]).filter(
    (v) =>
      v.imo !== imo &&
      v.type === ref.type &&
      v.operator &&
      ref.operator &&
      v.operator === ref.operator &&
      v.built_year &&
      ref.built_year &&
      Math.abs(v.built_year - ref.built_year) <= 3,
  )
  return {
    imo,
    name_current: ref.name,
    n_items: sisters.length,
    items: sisters.map((v: any) => ({
      imo: v.imo,
      name: v.name,
      type: v.type,
      flag_iso: v.flag_iso,
      built_year: v.built_year,
      dwt: v.dwt,
      operator: v.operator,
    })),
    data_quality: quality('seed', 'vessels_seed heuristic', {
      note: 'Heurística: mismo type+operator + year ±3. Mejor con vessels_master populated.',
      confidence_score: 0.6,
    }),
  }
}

/**
 * Anomalías AIS · dark periods, flag changes y outliers.
 *
 * Sin `vessel_positions` con histórico AIS, devuelve estructura vacía y
 * marca data_quality=missing. Cuando el worker AIS lleve tiempo corriendo,
 * el backend Python `port_intel.detect_ais_anomalies` lo calculará real.
 */
export function vesselAnomalies(imo: string) {
  const ref = (VESSELS_SEED as any[]).find((v) => v.imo === imo)
  if (!ref) return { __404: true }
  return {
    imo,
    n_items: 0,
    items: [] as any[],
    data_quality: quality('missing', 'vessel_positions', {
      note: 'Requiere worker AIS persistido durante ≥30 días para detectar anomalías reales.',
    }),
  }
}

/**
 * Banderas históricas · `flag_history` desde vessels_master.
 * Sin tabla poblada, devuelve solo flag_current del seed.
 */
export function vesselFlagHistory(imo: string) {
  const ref = (VESSELS_SEED as any[]).find((v) => v.imo === imo)
  if (!ref) return { __404: true }
  return {
    imo,
    current_flag: ref.flag_iso,
    history: [
      {
        flag: ref.flag_iso,
        since: ref.built_year ? `${ref.built_year}-01` : 'unknown',
        until: null,
      },
    ],
    data_quality: quality('seed', 'vessels_seed', {
      note: 'flag_history real requiere vessels_master populated desde fuentes (Equasis, IHS Markit).',
    }),
  }
}

// ─────────────────────────────────────────────────────────────────
// Sprint 2 Fase D · shipping_lines / carrier_services / routes
// ─────────────────────────────────────────────────────────────────

export function shippingLinesList(params: URLSearchParams) {
  const alliance = params.get('alliance')
  const trade = params.get('trade')
  let items = SHIPPING_LINES_SEED as any[]
  if (alliance) items = items.filter((l) => l.alliance === alliance)
  if (trade) items = items.filter((l) => (l.main_trades || []).includes(trade))
  return {
    n_items: items.length,
    items: items.map((l) => ({
      ...l,
      data_quality: quality('seed', 'shipping_lines_seed', {
        confidence_score: 0.9,
      }),
    })),
    data_quality: quality('seed', 'shipping_lines_seed', {
      note: `${items.length} navieras curadas · LEI verificados manualmente vía GLEIF.`,
    }),
  }
}

export function shippingLineDetail(slug: string) {
  const line = (SHIPPING_LINES_SEED as any[]).find((l) => l.slug === slug)
  if (!line) return { __404: true }
  const services = (CARRIER_SERVICES_SEED as any[]).filter(
    (s) => s.shipping_line_slug === slug,
  )
  return {
    ...line,
    services,
    n_services: services.length,
    data_quality: quality('seed', 'shipping_lines_seed', {
      note: `${services.length} servicios principales cargados.`,
    }),
  }
}

export function carrierServicesList(params: URLSearchParams) {
  const lane = params.get('trade_lane')
  const line = params.get('line')
  const port = params.get('port')
  let items = CARRIER_SERVICES_SEED as any[]
  if (lane) items = items.filter((s) => s.trade_lane === lane)
  if (line) items = items.filter((s) => s.shipping_line_slug === line)
  if (port) {
    items = items.filter((s) =>
      (s.port_rotation || []).some((r: any) => r.port_slug === port),
    )
  }
  return {
    n_items: items.length,
    items,
    data_quality: quality('seed', 'carrier_services_seed', {
      note: `${items.length} servicios curados desde memorias anuales públicas.`,
    }),
  }
}

/**
 * Rutas marítimas como agregados origen→destino derivados de
 * `carrier_services.port_rotation`. Cada par consecutivo de escalas
 * genera un leg → ruta.
 */
export function shippingRoutes(params: URLSearchParams) {
  const origin = params.get('origin')
  const destination = params.get('destination')
  const lane = params.get('trade_lane')
  const chokepoint = params.get('chokepoint')

  const routes: any[] = []
  let id = 1
  for (const svc of CARRIER_SERVICES_SEED as any[]) {
    if (lane && svc.trade_lane !== lane) continue
    if (chokepoint && !(svc.main_chokepoints || []).includes(chokepoint)) continue
    const rotation = svc.port_rotation || []
    for (let i = 0; i < rotation.length - 1; i++) {
      const o = rotation[i].port_slug
      const d = rotation[i + 1].port_slug
      if (origin && o !== origin) continue
      if (destination && d !== destination) continue
      routes.push({
        id: id++,
        route_name: `${o} → ${d} · ${svc.service_code}`,
        carrier_service_id: svc.service_code,
        shipping_line_slug: svc.shipping_line_slug,
        origin_port_slug: o,
        destination_port_slug: d,
        via_chokepoints: svc.main_chokepoints || [],
        weekly_frequency: svc.frequency_days ? 7 / svc.frequency_days : 1,
        transit_days: svc.estimated_transit_days
          ? svc.estimated_transit_days / Math.max(1, rotation.length - 1)
          : null,
        avg_capacity_teu: svc.avg_capacity_teu,
        alliance: svc.alliance,
        trade_lane: svc.trade_lane,
      })
    }
  }

  return {
    n_items: routes.length,
    items: routes,
    data_quality: quality('seed', 'derived_from_carrier_services', {
      note: 'Rutas derivadas de port_rotation · cada par (origen, destino) consecutivo.',
      confidence_score: 0.75,
    }),
  }
}

export function portConnectivity(slug: string, _params: URLSearchParams) {
  const port = (PORTS_SEED as any[]).find((x) => x.slug === slug)
  if (!port) return { __404: true }
  const partners = CONNECTIVITY_SEED[slug] ?? []
  const items = partners.map((connected_port_slug) => {
    const target = (PORTS_SEED as any[]).find((p) => p.slug === connected_port_slug)
    return {
      port_slug: slug,
      connected_port_slug,
      connected_name: target?.name ?? connected_port_slug,
      shipping_line_slug: null,
      service_code: null,
      weekly_calls: 1 + Math.floor(Math.random() * 6),
      direction: 'transit',
      cargo_type: 'container',
      source: 'seed',
    }
  })
  return {
    port_slug: slug,
    n_items: items.length,
    items,
    data_quality: quality('seed', 'port_connectivity_seed', {
      note: 'Conexiones obvias por región · pendiente derivar de carrier_services en Sprint 2 Fase D.',
      confidence_score: 0.4,
    }),
  }
}
