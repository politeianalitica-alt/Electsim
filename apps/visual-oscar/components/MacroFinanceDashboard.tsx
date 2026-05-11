'use client'
/**
 * MacroFinanceDashboard — datos macro y financieros internacionales en vivo.
 *
 * 8 pestañas:
 *  1. Panorama — KPIs ES (PIB/HICP/paro/spread/vivienda/EURUSD/BCE)
 *  2. Mercados — yields 10Y comparativa + spreads
 *  3. Inflación — HICP por país (ES/FR/IT/DE/PT/EU)
 *  4. Empleo — paro armonizado + paro juvenil
 *  5. Vivienda — HPI interanual por país
 *  6. Reservas — IMF COFER (USD/EUR/CNY/GBP/JPY)
 *  7. Comercio — IMF DOTS bilateral
 *  8. Nightlights — World Bank acceso eléctrico + PIB pc PPP
 *
 * Plus footer: salud de fuentes + botón ingest.
 */
import { useEffect, useMemo, useState } from 'react'
import type { MacroPanorama } from '@/app/api/macro-finance/panorama/route'
import type { MacroMarkets } from '@/app/api/macro-finance/markets/route'
import type { YieldsData } from '@/app/api/macro-finance/yields/route'
import type { CountryInflation } from '@/app/api/macro-finance/hicp/route'
import type { CountryLabor } from '@/app/api/macro-finance/labor/route'
import type { CoferReserves } from '@/app/api/macro-finance/cofer/route'
import type { DotsTrade } from '@/app/api/macro-finance/dots/route'
import type { NTLData } from '@/app/api/macro-finance/ntl/route'
import type { BopSeries } from '@/app/api/macro-finance/bop/route'
import type { SourcesHealth } from '@/app/api/macro-finance/sources/route'

type Tab = 'panorama' | 'markets' | 'inflation' | 'labor' | 'housing' | 'reserves' | 'trade' | 'ntl' | 'sources'
const TAB_LABELS: Record<Tab, string> = {
  panorama:  'Panorama España',
  markets:   'Mercados y spreads',
  inflation: 'Inflación',
  labor:     'Empleo',
  housing:   'Vivienda',
  reserves:  'Reservas globales',
  trade:     'Comercio bilateral',
  ntl:       'Nightlights / PIB alt.',
  sources:   'Fuentes',
}

const COUNTRY_COLORS: Record<string, string> = {
  ES: '#AA151B', FR: '#0055A4', IT: '#008C45', DE: '#222', PT: '#046A38',
  GB: '#012169', EU: '#003399', US: '#3C3B6E',
  USD: '#4285F4', EUR: '#003399', CNY: '#DE2910', GBP: '#C8102E', JPY: '#BC002D',
  RU: '#CC0000', UA: '#FFD500', IR: '#239F40', VE: '#FCDD09', KP: '#FF6600', CN: '#DE2910',
}
const colorFor = (k: string) => COUNTRY_COLORS[k.toUpperCase()] ?? '#6e6e73'

export default function MacroFinanceDashboard() {
  const [tab, setTab] = useState<Tab>('panorama')

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #ECECEF',
      borderRadius: 14,
      padding: '20px 22px',
      marginTop: 22,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <header style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Datos macro y financieros internacionales · en vivo
        </span>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.018em', margin: '4px 0 4px', color: '#1d1d1f' }}>
          Seguimiento macro &amp; financiero
        </h2>
        <p style={{ fontSize: 12.5, color: '#3a3a3d', margin: 0, lineHeight: 1.55 }}>
          Fuentes públicas: ECB SDMX (yields, EURUSD, BCE rate), Eurostat (HICP, paro, HPI), IMF (DOTS, COFER, WEO),
          World Bank (NTL proxy, acceso eléctrico), BIS LBS. Las pestañas <strong>siguen</strong> al termómetro
          macro-político de arriba con una capa adicional de datos internacionales actualizados a diario/mensual.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: '#F5F5F7', borderRadius: 999, padding: 3, marginBottom: 16 }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => {
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              background: active ? '#fff' : 'transparent',
              color: active ? '#1d1d1f' : '#6e6e73',
              border: 'none', borderRadius: 999, padding: '7px 14px',
              fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}>
              {TAB_LABELS[t]}
            </button>
          )
        })}
      </div>

      {tab === 'panorama'  && <Panorama/>}
      {tab === 'markets'   && <Markets/>}
      {tab === 'inflation' && <Inflation/>}
      {tab === 'labor'     && <Labor/>}
      {tab === 'housing'   && <Housing/>}
      {tab === 'reserves'  && <Reserves/>}
      {tab === 'trade'     && <Trade/>}
      {tab === 'ntl'       && <Nightlights/>}
      {tab === 'sources'   && <SourcesPane/>}
    </section>
  )
}

// ── Formatters ─────────────────────────────────────────────────────────────

function fmt(value: number | null, unit: string): string {
  if (value == null || !isFinite(value)) return '—'
  if (unit === 'PCT')   return value.toFixed(2) + '%'
  if (unit === 'BP')    return value.toFixed(0) + ' pb'
  if (unit === 'INDEX') return value.toFixed(4)
  if (unit === 'USD' || unit === 'USD_BN' || unit === 'EUR_BN') {
    if (Math.abs(value) > 1000) return (value / 1000).toFixed(1) + 'K'
    return value.toFixed(0)
  }
  return value.toFixed(2)
}

function deltaText(delta: number | null, deltaPct: number | null, unit: string): { txt: string; sign: 1 | -1 | 0 } {
  if (delta == null) return { txt: '—', sign: 0 }
  const sign: 1 | -1 | 0 = delta > 0 ? 1 : (delta < 0 ? -1 : 0)
  const prefix = delta > 0 ? '+' : ''
  if (unit === 'PCT' || unit === 'BP') {
    return { txt: prefix + delta.toFixed(2) + (unit === 'BP' ? ' pb' : ' pp'), sign }
  }
  if (deltaPct != null) return { txt: prefix + deltaPct.toFixed(1) + '%', sign }
  return { txt: prefix + delta.toFixed(2), sign }
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Panorama (KPI cards)
// ─────────────────────────────────────────────────────────────────────────

function Panorama() {
  const [data, setData] = useState<MacroPanorama | null>(null)
  const [meta, setMeta] = useState<{ source: string }>({ source: 'loading' })

  useEffect(() => {
    fetch('/api/macro-finance/panorama?country=ES')
      .then(r => r.json())
      .then(j => { setData(j); setMeta({ source: j._meta?.source ?? 'unknown' }) })
      .catch(() => setMeta({ source: 'error' }))
  }, [])

  if (!data) return <Loading/>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          Indicadores clave España · variación reciente
        </h3>
        <SourceBadge source={meta.source}/>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {data.indicators.map(ind => {
          const d = deltaText(ind.delta, ind.delta_pct, ind.unit)
          const color = d.sign === 1 ? '#DC2626' : d.sign === -1 ? '#16A34A' : '#94a3b8'
          return (
            <article key={ind.label_id} style={{
              border: '1px solid #ECECEF', borderRadius: 10, padding: '12px 14px',
              background: '#FAFAFB',
            }}>
              <div style={{ fontSize: 10, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', minHeight: 24 }}>
                {ind.display_name}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', lineHeight: 1.1, marginTop: 4 }}>
                {fmt(ind.current, ind.unit)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{d.txt}</span>
                <span style={{ fontSize: 9.5, color: '#94a3b8' }}>
                  {ind.as_of ? new Date(ind.as_of).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }) : '—'}
                </span>
              </div>
              <div style={{ fontSize: 9, color: '#a8a8af', marginTop: 4 }}>
                fuente: {ind.source_id}
              </div>
            </article>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 12, lineHeight: 1.5 }}>
        Yield: rendimiento del bono soberano a 10 años (ECB SDMX). Spread: vs. Bund alemán (puntos básicos).
        HICP: índice armonizado de precios de consumo, variación interanual (Eurostat). Paro: tasa armonizada SA (Eurostat).
        HPI: índice de precios de vivienda, variación interanual (Eurostat).
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Markets
// ─────────────────────────────────────────────────────────────────────────

function Markets() {
  const [data, setData] = useState<MacroMarkets | null>(null)
  const [days, setDays] = useState(365)
  useEffect(() => {
    fetch(`/api/macro-finance/markets?days=${days}&country=ES`).then(r => r.json()).then(setData)
  }, [days])
  if (!data) return <Loading/>
  return (
    <div>
      <HorizonSelector days={days} setDays={setDays}/>
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '14px 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Rendimientos soberanos 10 años — España y comparables
      </h3>
      <MultiLineChart series={data.series} keys={['yield_es_10y','yield_de_10y','yield_it_10y','yield_fr_10y','yield_pt_10y']}
        labels={{ yield_es_10y: 'España', yield_de_10y: 'Alemania', yield_it_10y: 'Italia', yield_fr_10y: 'Francia', yield_pt_10y: 'Portugal' }}
        yUnit="%" />
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '14px 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Spreads vs. Alemania 10Y (pb)
      </h3>
      <MultiLineChart series={data.series} keys={['spread_es_de_10y','spread_it_de_10y','spread_fr_de_10y','spread_pt_de_10y']}
        labels={{ spread_es_de_10y: 'ES-DE', spread_it_de_10y: 'IT-DE', spread_fr_de_10y: 'FR-DE', spread_pt_de_10y: 'PT-DE' }}
        yUnit=" pb" />
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 8 }}>
        Fuente: ECB Statistical Data Warehouse (long-term interest rates, monthly).
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Inflation
// ─────────────────────────────────────────────────────────────────────────

function Inflation() {
  const [data, setData] = useState<CountryInflation | null>(null)
  useEffect(() => {
    fetch('/api/macro-finance/hicp?countries=ES,FR,IT,DE,PT,EU&days=1825').then(r => r.json()).then(setData)
  }, [])
  if (!data) return <Loading/>
  const series: Record<string, Array<{ date: string; value: number }>> = {}
  for (const c of Object.keys(data.series)) {
    series[c] = data.series[c]
      .filter(p => p.metric === 'hicp_yoy')
      .map(p => ({ date: p.date, value: p.value }))
  }
  const keys = Object.keys(series).filter(k => series[k].length > 0)
  return (
    <div>
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Inflación armonizada HICP interanual (Eurostat)
      </h3>
      <MultiLineChart series={series} keys={keys} labels={Object.fromEntries(keys.map(k => [k, countryName(k)]))} yUnit="%" />
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 8 }}>
        Fuente: Eurostat <code>prc_hicp_manr</code>. Tasa interanual mensual de los índices armonizados.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Labor
// ─────────────────────────────────────────────────────────────────────────

function Labor() {
  const [data, setData] = useState<CountryLabor | null>(null)
  useEffect(() => {
    fetch('/api/macro-finance/labor?countries=ES,FR,IT,DE,PT,EU&days=1825').then(r => r.json()).then(setData)
  }, [])
  if (!data) return <Loading/>
  const series: Record<string, Array<{ date: string; value: number }>> = {}
  const youth: Record<string, Array<{ date: string; value: number }>> = {}
  for (const c of Object.keys(data.series)) {
    series[c] = data.series[c].filter(p => p.metric === 'unemployment_rate').map(p => ({ date: p.date, value: p.value }))
    youth[c]  = data.series[c].filter(p => p.metric === 'youth_unemployment').map(p => ({ date: p.date, value: p.value }))
  }
  const keys = Object.keys(series).filter(k => series[k].length > 0)
  const yKeys = Object.keys(youth).filter(k => youth[k].length > 0)
  return (
    <div>
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Tasa de paro armonizada (SA)
      </h3>
      <MultiLineChart series={series} keys={keys} labels={Object.fromEntries(keys.map(k => [k, countryName(k)]))} yUnit="%" />
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '16px 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Paro juvenil (menores de 25)
      </h3>
      <MultiLineChart series={youth} keys={yKeys} labels={Object.fromEntries(yKeys.map(k => [k, countryName(k)]))} yUnit="%" />
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 8 }}>
        Fuente: Eurostat <code>une_rt_m</code>. Datos mensuales desestacionalizados.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Housing
// ─────────────────────────────────────────────────────────────────────────

function Housing() {
  const [data, setData] = useState<{ series: Record<string, Array<{ date: string; metric: string; value: number }>> } | null>(null)
  useEffect(() => {
    fetch('/api/macro-finance/housing?countries=ES,FR,IT,DE,PT,EU&days=3650')
      .then(r => r.json())
      .then(setData)
  }, [])
  if (!data) return <Loading/>
  const series: Record<string, Array<{ date: string; value: number }>> = {}
  for (const c of Object.keys(data.series ?? {})) {
    series[c] = (data.series[c] ?? [])
      .filter(p => p.metric === 'hpi_yoy')
      .map(p => ({ date: p.date, value: p.value }))
  }
  const keys = Object.keys(series).filter(k => series[k].length > 0)
  return (
    <div>
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Índice de precios de vivienda (HPI) — variación interanual
      </h3>
      {keys.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          Sin datos HPI cargados. Lanza ingesta desde Fuentes.
        </div>
      ) : (
        <MultiLineChart
          series={series}
          keys={keys}
          labels={Object.fromEntries(keys.map(k => [k, countryName(k)]))}
          yUnit="%"
        />
      )}
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 8 }}>
        Fuente: Eurostat <code>prc_hpi_q</code>. Datos trimestrales del HPI total (compra).
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Reserves (COFER)
// ─────────────────────────────────────────────────────────────────────────

function Reserves() {
  const [data, setData] = useState<CoferReserves | null>(null)
  useEffect(() => {
    fetch('/api/macro-finance/cofer?days=4380').then(r => r.json()).then(setData)
  }, [])
  if (!data) return <Loading/>
  const keys = Object.keys(data.series ?? {})
  const labels: Record<string, string> = {
    cofer_usd_share: 'USD', cofer_eur_share: 'EUR', cofer_cny_share: 'CNY/RMB',
    cofer_gbp_share: 'GBP', cofer_jpy_share: 'JPY', cofer_other_share: 'Otras',
  }
  const colors: Record<string, string> = {
    cofer_usd_share: '#4285F4', cofer_eur_share: '#003399', cofer_cny_share: '#DE2910',
    cofer_gbp_share: '#C8102E', cofer_jpy_share: '#BC002D', cofer_other_share: '#94a3b8',
  }
  if (keys.length === 0) {
    return (
      <div>
        <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Composición de reservas oficiales globales (IMF COFER)
        </h3>
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          Sin datos COFER cargados. La API IMF requiere ajuste de endpoint — lanza ingesta manualmente desde la pestaña Fuentes.
        </div>
      </div>
    )
  }
  return (
    <div>
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Composición de reservas oficiales globales (IMF COFER)
      </h3>
      <MultiLineChart series={data.series} keys={keys} labels={labels} colors={colors} yUnit="%"/>
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 8 }}>
        Fuente: IMF COFER (Currency Composition of Official Foreign Exchange Reserves), datos trimestrales.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Trade (IMF DOTS)
// ─────────────────────────────────────────────────────────────────────────

function Trade() {
  const [data, setData] = useState<DotsTrade | null>(null)
  const [reporter, setReporter] = useState('ES')
  useEffect(() => {
    fetch(`/api/macro-finance/dots?reporter=${reporter}&months=120`).then(r => r.json()).then(setData)
  }, [reporter])
  if (!data) return <Loading/>
  const series = {
    exports: data.series?.exports ?? [],
    imports: data.series?.imports ?? [],
    balance: data.series?.balance ?? [],
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['ES','FR','IT','DE','PT','GB'].map(c => (
          <button key={c} onClick={() => setReporter(c)} style={{
            background: reporter === c ? '#1d1d1f' : '#fff',
            color: reporter === c ? '#fff' : '#3a3a3d',
            border: '1px solid #ECECEF', borderRadius: 6,
            padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>{countryName(c)}</button>
        ))}
      </div>
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Comercio bilateral vs. mundo (IMF DOTS, USD Bn)
      </h3>
      {series.exports.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
          Sin datos DOTS cargados. Endpoint IMF requiere ajuste — lanza ingesta desde Fuentes.
        </div>
      ) : (
        <MultiLineChart
          series={{ Exportaciones: series.exports, Importaciones: series.imports, Balanza: series.balance }}
          keys={['Exportaciones','Importaciones','Balanza']}
          labels={{ Exportaciones: 'Exportaciones FOB', Importaciones: 'Importaciones CIF', Balanza: 'Balance' }}
          colors={{ Exportaciones: '#16A34A', Importaciones: '#DC2626', Balanza: '#1d1d1f' }}
          yUnit=" $Bn" />
      )}
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 8 }}>
        Fuente: IMF Direction of Trade Statistics (mensual, USD).
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Nightlights / NTL
// ─────────────────────────────────────────────────────────────────────────

function Nightlights() {
  const [data, setData] = useState<NTLData | null>(null)
  useEffect(() => {
    fetch('/api/macro-finance/ntl?countries=ES,DE,FR,IT,RU,UA,IR,VE,KP,CN').then(r => r.json()).then(setData)
  }, [])
  if (!data) return <Loading/>
  const elec: Record<string, Array<{ date: string; value: number }>> = {}
  const gdp:  Record<string, Array<{ date: string; value: number }>> = {}
  for (const c of Object.keys(data.series ?? {})) {
    elec[c] = data.series[c].filter(p => p.metric === 'ntl_electricity_access').map(p => ({ date: p.date, value: p.value }))
    gdp[c]  = data.series[c].filter(p => p.metric === 'ntl_gdp_pc_ppp').map(p => ({ date: p.date, value: p.value }))
  }
  const elecKeys = Object.keys(elec).filter(k => elec[k].length > 0)
  const gdpKeys  = Object.keys(gdp).filter(k => gdp[k].length > 0)
  return (
    <div>
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Acceso a electricidad (proxy NTL · World Bank)
      </h3>
      <MultiLineChart series={elec} keys={elecKeys} labels={Object.fromEntries(elecKeys.map(k => [k, countryName(k)]))} yUnit="%" />
      <h3 style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f', margin: '16px 0 8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        PIB per cápita PPP (USD 2017)
      </h3>
      <MultiLineChart series={gdp} keys={gdpKeys} labels={Object.fromEntries(gdpKeys.map(k => [k, countryName(k)]))} yUnit=" $" />
      <p style={{ fontSize: 11, color: '#86868b', marginTop: 8 }}>
        Fuente: World Bank Open Data API. Para radiancia VIIRS bruta (NASA Black Marble) se requiere token NASA Earthdata.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Tab: Sources health + ingest trigger
// ─────────────────────────────────────────────────────────────────────────

function SourcesPane() {
  const [data, setData] = useState<SourcesHealth | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [last, setLast] = useState<string | null>(null)
  const load = () => fetch('/api/macro-finance/sources').then(r => r.json()).then(setData)
  useEffect(() => { void load() }, [])
  const ingest = async () => {
    setIngesting(true)
    try {
      const j = await fetch('/api/macro-finance/ingest', { method: 'POST' }).then(r => r.json())
      setLast(`${j.n_ok}/${j.n_connectors} OK · ${j.total_rows} filas · ${j.n_stub} stub · ${j.n_failed} fallos`)
      void load()
    } finally { setIngesting(false) }
  }
  if (!data) return <Loading/>
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <p style={{ fontSize: 12, color: '#3a3a3d', margin: 0, lineHeight: 1.55, maxWidth: 720 }}>
          Lanza el orquestador macro v2: descarga datos en vivo de ECB SDMX, Eurostat, IMF, World Bank.
          BIS LBS, NASA VIIRS y BdE BoP requieren auth o setup adicional (stubs).
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {last && <span style={{ fontSize: 11.5, color: '#3a3a3d' }}>{last}</span>}
          <button onClick={ingest} disabled={ingesting} style={{
            background: ingesting ? '#94a3b8' : '#1d1d1f', color: '#fff', border: 'none',
            borderRadius: 7, padding: '7px 14px', fontSize: 11.5, fontWeight: 700,
            cursor: ingesting ? 'wait' : 'pointer',
          }}>
            {ingesting ? 'Ingestando…' : 'Lanzar ingesta ahora'}
          </button>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr style={{ background: '#FAFAFB', borderBottom: '2px solid #ECECEF' }}>
            {['Fuente','Categoría','Cadencia','Filas en DB','Último dato','Último fetch','Estado'].map(h => (
              <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 9.5, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.sources.map(s => {
            const status = s.last_error
              ? { color: '#DC2626', text: s.last_error }
              : s.last_fetch
                ? { color: '#16A34A', text: 'OK' }
                : { color: '#94a3b8', text: 'sin ejecutar' }
            return (
              <tr key={s.source_id} style={{ borderBottom: '1px solid #F5F5F7' }}>
                <td style={{ padding: '7px 10px', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: '7px 10px', color: '#6e6e73' }}>{s.category}</td>
                <td style={{ padding: '7px 10px', color: '#6e6e73' }}>{s.cadencia}</td>
                <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#1d1d1f' }}>{s.n_rows.toLocaleString('es-ES')}</td>
                <td style={{ padding: '7px 10px', color: '#86868b' }}>{s.latest_data ?? '—'}</td>
                <td style={{ padding: '7px 10px', color: '#86868b' }}>{s.last_fetch ? new Date(s.last_fetch).toLocaleString('es-ES') : '—'}</td>
                <td style={{ padding: '7px 10px', color: status.color, fontSize: 10.5, fontWeight: 700, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.text}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Shared UI
// ─────────────────────────────────────────────────────────────────────────

function Loading() {
  return <div style={{ padding: 30, textAlign: 'center', color: '#6e6e73', fontSize: 12 }}>Cargando…</div>
}

function HorizonSelector({ days, setDays }: { days: number; setDays: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[90, 365, 730, 1825].map(d => (
        <button key={d} onClick={() => setDays(d)} style={{
          background: days === d ? '#1d1d1f' : '#fff',
          color: days === d ? '#fff' : '#3a3a3d',
          border: '1px solid #ECECEF', borderRadius: 6,
          padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>{d === 365 ? '1 año' : d === 730 ? '2 años' : d === 1825 ? '5 años' : `${d} d`}</button>
      ))}
    </div>
  )
}

function SourceBadge({ source }: { source: string }) {
  const color = source === 'backend' ? '#16A34A' : source === 'mock' ? '#F59E0B' : '#94A3B8'
  const label = source === 'backend' ? 'Datos en vivo' : source === 'mock' ? 'Sin backend' : source
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color, letterSpacing: '0.04em' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }}/>
      {label}
    </span>
  )
}

function countryName(code: string): string {
  const map: Record<string, string> = {
    ES: 'España', FR: 'Francia', IT: 'Italia', DE: 'Alemania', PT: 'Portugal',
    GB: 'Reino Unido', US: 'EE.UU.', EU: 'UE-27', CN: 'China', RU: 'Rusia',
    UA: 'Ucrania', IR: 'Irán', VE: 'Venezuela', KP: 'Corea del Norte',
  }
  return map[code] ?? code
}

// Multi-line SVG chart
function MultiLineChart({
  series, keys, labels, colors, yUnit,
}: {
  series: Record<string, Array<{ date: string; value: number }>>
  keys: string[]
  labels: Record<string, string>
  colors?: Record<string, string>
  yUnit?: string
}) {
  const W = 800, H = 280, padX = 38, padY = 22
  const allPoints = keys.flatMap(k => (series[k] ?? []))
  if (allPoints.length === 0) {
    return <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Sin datos para este horizonte.</div>
  }
  const dates = Array.from(new Set(allPoints.map(p => p.date))).sort()
  const xScale = (d: string) => padX + (dates.indexOf(d) / Math.max(1, dates.length - 1)) * (W - padX * 2)
  const vals = allPoints.map(p => p.value).filter(v => isFinite(v))
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const span = (maxV - minV) || 1
  const yScale = (v: number) => padY + (1 - (v - minV) / span) * (H - padY * 2)
  const ticks = 5
  const tickValues: number[] = []
  for (let i = 0; i < ticks; i++) tickValues.push(minV + (span * i) / (ticks - 1))
  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 'auto' }}>
      {tickValues.map((t, i) => (
        <g key={i}>
          <line x1={padX} y1={yScale(t)} x2={W - padX} y2={yScale(t)} stroke="#F5F5F7" strokeWidth={1}/>
          <text x={padX - 4} y={yScale(t) + 3} textAnchor="end" style={{ fontSize: 9, fill: '#94a3b8' }}>{t.toFixed(t > 100 ? 0 : 1)}{yUnit ?? ''}</text>
        </g>
      ))}
      {keys.map(k => {
        const pts = (series[k] ?? []).filter(p => isFinite(p.value))
        if (pts.length < 2) return null
        const col = colors?.[k] ?? colorFor(k.replace(/^(yield|spread|cofer)_/, '').replace(/_de_10y$/,'').replace(/_share$/, '').replace(/_10y$/, '').slice(0,2).toUpperCase())
        const d = pts.map((p, i) =>
          `${i === 0 ? 'M' : 'L'} ${xScale(p.date).toFixed(1)} ${yScale(p.value).toFixed(1)}`
        ).join(' ')
        return <path key={k} d={d} fill="none" stroke={col} strokeWidth={1.7} opacity={0.85}/>
      })}
      <g transform={`translate(${padX}, ${H + 12})`}>
        {keys.map((k, i) => {
          const col = colors?.[k] ?? colorFor(k.replace(/^(yield|spread|cofer)_/, '').replace(/_de_10y$/,'').replace(/_share$/, '').replace(/_10y$/, '').slice(0,2).toUpperCase())
          return (
            <g key={k} transform={`translate(${i * 110}, 0)`}>
              <rect width={10} height={10} fill={col} rx={2}/>
              <text x={14} y={9} style={{ fontSize: 9.5, fill: '#3a3a3d', fontWeight: 600 }}>{labels[k] ?? k}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
