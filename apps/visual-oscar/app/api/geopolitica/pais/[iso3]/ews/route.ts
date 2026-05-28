/**
 * /api/geopolitica/pais/[iso3]/ews · Sprint GEO-RP C1
 *
 * Señales EWS (Early Warning System) por país · Sub-tab 1 vista expandida.
 * 5 bloques según spec:
 *   1. Actividad portuaria · PortWatch
 *   2. Pulso mediático · GDELT (tono + themes + cobertura geográfica)
 *   3. Mercados financieros · Finnhub (placeholder · CDS pendiente)
 *   4. Flujos comerciales · UN Comtrade (skipped en este endpoint · ver /comercio)
 *   5. Desplazamiento humanitario · UNHCR
 *
 * Cache: s-maxage=1800 (datos cambian a ritmo distinto · 30 min compromiso).
 */
import { NextRequest, NextResponse } from 'next/server'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'
import { fetchPortActivityByCountry, getPortAnomalyScore } from '@/lib/portwatch/client'
import { fetchDisplacement, getLatestDisplacement } from '@/lib/unhcr/client'
import { buildGdeltDocUrl, fetchGdeltJson } from '@/lib/gdelt/build-query'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_req: NextRequest, { params }: { params: { iso3: string } }) {
  const iso3 = params.iso3.toUpperCase()
  const coord = COUNTRY_COORDS[iso3]
  if (!coord) {
    return NextResponse.json({ ok: false, error: `iso3_unknown · ${iso3}` }, { status: 404 })
  }
  const startedAt = new Date().toISOString()

  // 4 fetches paralelos · cada uno con manejo de fallo independiente
  const [ports, displacement, gdeltArticles, gdeltTopThemes] = await Promise.all([
    fetchPortActivityByCountry(iso3).catch(() => null),
    fetchDisplacement(iso3).catch(() => null),
    fetchGdeltJson<any>(
      buildGdeltDocUrl({
        query: coord.name_en,
        timespan: '30d',
        mode: 'artlist',
        maxrecords: 100,
        sort: 'datedesc',
      }),
      { timeoutMs: 9000, maxRetries: 1 },
    ).catch(() => null),
    fetchGdeltJson<any>(
      buildGdeltDocUrl({
        query: coord.name_en,
        timespan: '14d',
        mode: 'tonechart',
        maxrecords: 100,
      }),
      { timeoutMs: 9000, maxRetries: 1 },
    ).catch(() => null),
  ])

  // ──────── Bloque 1 · PortWatch ────────
  const portsData = ports?.ok ? ports.data : []
  const portAnomalyScore = await getPortAnomalyScore(iso3).catch(() => null)
  const portsTop = portsData.slice(0, 5)
  const portsBlock = {
    available: portsData.length > 0,
    anomaly_score: portAnomalyScore,
    ports_count: portsData.length,
    top_ports: portsTop,
    deviation_avg: portsTop.length > 0
      ? Math.round((portsTop.reduce((s, p) => s + p.deviation_pct, 0) / portsTop.length) * 10) / 10
      : null,
    alert: portAnomalyScore !== null && portAnomalyScore >= 50,
  }

  // ──────── Bloque 2 · Pulso mediático GDELT ────────
  const articles = (gdeltArticles?.articles || []) as any[]
  const tones = articles.map((a) => a.tone).filter((t) => typeof t === 'number')
  const avgTone = tones.length > 0 ? Math.round((tones.reduce((s, t) => s + t, 0) / tones.length) * 100) / 100 : null

  // Divergencia local vs internacional (locales = mismo iso2 país, internacional = resto)
  let localToneSum = 0, localN = 0, intlToneSum = 0, intlN = 0
  for (const a of articles) {
    if (typeof a.tone !== 'number') continue
    const sc = (a.sourcecountry || '').toUpperCase()
    if (sc === coord.iso2) { localToneSum += a.tone; localN++ }
    else if (sc) { intlToneSum += a.tone; intlN++ }
  }
  const divergencia = (localN > 0 && intlN > 0)
    ? {
      local: Math.round((localToneSum / localN) * 100) / 100,
      international: Math.round((intlToneSum / intlN) * 100) / 100,
      gap: Math.round(((localToneSum / localN) - (intlToneSum / intlN)) * 100) / 100,
    }
    : null

  // Top themes
  const themeCount = new Map<string, number>()
  for (const a of articles) {
    const themes = (a.themes || '').split(';').filter(Boolean) as string[]
    for (const t of themes) themeCount.set(t, (themeCount.get(t) || 0) + 1)
  }
  const topThemes = [...themeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([theme, count]) => ({ theme, count }))

  // Cobertura geográfica · de qué países viene la noticia
  const countryCount = new Map<string, number>()
  for (const a of articles) {
    const sc = (a.sourcecountry || '').toUpperCase()
    if (sc) countryCount.set(sc, (countryCount.get(sc) || 0) + 1)
  }
  const coverageByCountry = [...countryCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([iso2, count]) => ({ iso2, count }))

  const mediaBlock = {
    available: articles.length > 0,
    total_articles_30d: articles.length,
    avg_tone: avgTone,
    divergencia_local_internacional: divergencia,
    top_themes: topThemes,
    coverage_by_source_country: coverageByCountry,
    alert: avgTone !== null && avgTone < -3,
  }

  // ──────── Bloque 3 · Mercados financieros ────────
  // Placeholder · Finnhub CDS bonds requiere premium tier. Mantenemos shape.
  const marketsBlock = {
    available: false,
    pending: true,
    note: 'CDS soberano + curva tipos pendiente · Finnhub bonds requiere upgrade. Por ahora solo cotizaciones empresas vía /pais/[iso3]/empresas',
    fx_usd: null,
    cds_5y_bps: null,
    sovereign_bonds_10y_pct: null,
    reserves_months_imports: null,                    // pendiente IMF IFS
    alert: false,
  }

  // ──────── Bloque 4 · Flujos comerciales ────────
  // Skip aquí · datos en /pais/[iso3]/comercio (más caro, on-demand)
  const tradeBlock = {
    available: false,
    pending: true,
    note: 'Datos UN Comtrade pesados · ver /api/geopolitica/pais/[iso3]/comercio',
  }

  // ──────── Bloque 5 · Desplazamiento UNHCR ────────
  const outflow = displacement?.outflow_series || []
  const inflow = displacement?.inflow_series || []
  const latestOutflow = getLatestDisplacement(outflow)
  const latestInflow = getLatestDisplacement(inflow)
  const displacementBlock = {
    available: outflow.length > 0 || inflow.length > 0,
    refugees_originated: latestOutflow,
    refugees_received: latestInflow,
    net_flow: (latestInflow ?? 0) - (latestOutflow ?? 0),     // positivo = recibe más
    outflow_series: outflow.slice(-10),
    inflow_series: inflow.slice(-10),
    alert: latestOutflow !== null && latestOutflow > 500_000,
  }

  // Resumen alertas activas
  const alertsCount = [portsBlock.alert, mediaBlock.alert, marketsBlock.alert, displacementBlock.alert]
    .filter(Boolean).length

  return NextResponse.json({
    ok: true,
    iso3,
    country_name: coord.name_es,
    ews: {
      ports: portsBlock,
      media: mediaBlock,
      markets: marketsBlock,
      trade: tradeBlock,
      displacement: displacementBlock,
    },
    alerts_active: alertsCount,
    fetched_at: startedAt,
    _meta: {
      sources_consulted: ['PortWatch IMF', 'GDELT 30d', 'GDELT tonechart 14d', 'UNHCR Refugee Stats'],
      pending_sources: ['Finnhub CDS bonds (premium)', 'IMF IFS reservas', 'UN Comtrade (endpoint propio)'],
      cache_ttl_seconds: 1800,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200' },
  })
}
