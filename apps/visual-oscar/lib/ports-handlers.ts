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

function isAllowSynth(): boolean {
  // En el frontend serverless · siempre sintético opt-in (ON por default cuando
  // no hay backend, para que /puertos no esté vacío). El usuario puede
  // configurar AISSTREAM_API_KEY en el backend cuando esté desplegado.
  return process.env.PORTS_FORCE_NO_SYNTH !== '1'
}

// ─────────────────────────────────────────────────────────────────
// Catálogos · sin red
// ─────────────────────────────────────────────────────────────────

export function catalogPorts(params: URLSearchParams) {
  const country = params.get('country')
  const type_ = params.get('type_') || params.get('type')
  const region = params.get('region')
  let items: any[] = PORTS_SEED as any[]
  if (country) items = items.filter((p) => p.country_iso === country.toUpperCase())
  if (type_) items = items.filter((p) => p.type === type_)
  if (region) items = items.filter((p) => p.region === region)
  return { n_items: items.length, items }
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
  const region = params.get('region')
  const limit = parseInt(params.get('limit') || '40', 10)
  const allow = isAllowSynth()
  const portsList = (region
    ? (PORTS_SEED as any[]).filter((p) => p.region === region)
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
    }
  })
  return {
    n_items: items.length,
    items,
    data_source: allow ? 'synthetic' : 'requires_aisstream',
    ais_live: false,
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
    }
  })
  return { port_slug: slug, n_vessels: items.length, data_source: 'synthetic', items }
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
      return { ...idx, last_price: null, change_pct: null, signal: 'unknown' }
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
    }
  })
  return { n_items: items.length, data_source: allow ? 'synthetic' : 'requires_yahoo', items }
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
      return { ...ck, risk_score: score, risk_level: level, n_events_30d: events, recent_events: [], data_source: 'synthetic' }
    })
    .sort((a, b) => b.risk_score - a.risk_score)
  return { n_items: items.length, days, items }
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
  const hsCode = params.get('hs_code') || null
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
  let items = TRADE_SEED.filter((t) => t.reporter_iso === 'ESP')
  if (flow) items = items.filter((t) => t.flow_kind === flow)
  const enriched = items.map((t) => ({ ...t, hs_code: 'TOTAL', period_ym: period, source: 'comext' }))
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
