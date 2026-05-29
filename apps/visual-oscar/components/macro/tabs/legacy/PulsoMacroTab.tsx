'use client'
/**
 * `<PulsoMacroTab />` · Tab 1 · Pulso macro España PROFUNDO.
 *
 * Cada KPI tiene:
 *   - Valor + Δ período + Δ YoY + spark
 *   - Click → drawer con serie completa + forecast IMF + comparativa peers UE + tabla
 *   - TrendNarrative auto-computado debajo
 *
 * Fuentes vivas:
 *  - INE CNT (CNTR6654 PIB, CNTR7158 hogares, CNTR7188 AAPP, CNTR7213 FBCF, CNTR7264 exterior, CNTR7267/7287 exports/imports)
 *  - IMF DataMapper (NGDP_RPCH crecimiento, LUR paro, PCPIPCH inflación, NGDP_FY output gap proxy)
 *  - Eurostat (HICP, producción industrial, confianza consumidor)
 *
 * Fuentes que no devuelven dato NO se muestran (regla del usuario).
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { IndicatorDrill } from '../IndicatorDrill'
import { ImfWeoForecast } from '../ImfWeoForecast'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'
import type { ChartAnalysisInput } from '@/lib/macro/ai-schema'

// Helper para preparar input al endpoint Groq: filtra valores no finitos
// y respeta el formato { period, value, forecast? }.
function aiSeries(
  pts: { period: string; value: number | null; forecast?: boolean }[],
): { period: string; value: number; forecast?: boolean }[] {
  return pts
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ period: p.period, value: p.value as number, ...(p.forecast ? { forecast: true } : {}) }))
}

interface InePoint { period: string; year: number; value: number | null }

interface CntDesglose {
  ok: boolean
  components?: {
    pib_total: { name?: string; points: InePoint[] }
    consumo_hogares: { name?: string; points: InePoint[] }
    consumo_aapp: { name?: string; points: InePoint[] }
    inversion: { name?: string; points: InePoint[] }
    exterior: { name?: string; points: InePoint[] }
  }
}

interface CntExtra {
  ok: boolean
  exports?: { points: InePoint[] }
  imports?: { points: InePoint[] }
}

interface ImfSeries { ok?: boolean; series?: { year: number; value: number | null }[]; indicator?: string }

// Sprint M9 · nuevos endpoints (algunos pueden no existir aún · todos se
// auto-ocultan si el panel no tiene datos suficientes)
interface FredSeriesResponse {
  ok: boolean
  series?: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
}

interface PmiResponse {
  ok: boolean
  composite?: { period: string; value: number }[]
  manufacturing?: { period: string; value: number }[]
  services?: { period: string; value: number }[]
}

interface IpiResponse {
  ok: boolean
  series?: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
}

export function PulsoMacroTab() {
  const tab = getTab('pulso-macro')
  const { openDrill } = useMacroDrawer()

  const [cnt, setCnt] = useState<CntDesglose | null>(null)
  const [cntExtra, setCntExtra] = useState<CntExtra | null>(null)
  const [imfGrowth, setImfGrowth] = useState<ImfSeries | null>(null)
  const [imfUnemp, setImfUnemp] = useState<ImfSeries | null>(null)
  const [imfInfl, setImfInfl] = useState<ImfSeries | null>(null)
  // Sprint M9 · estados nuevos (endpoints opcionales)
  const [fredParo, setFredParo] = useState<FredSeriesResponse | null>(null)
  const [fredCore, setFredCore] = useState<FredSeriesResponse | null>(null)
  const [fredHeadline, setFredHeadline] = useState<FredSeriesResponse | null>(null)
  const [fredBop, setFredBop] = useState<FredSeriesResponse | null>(null)
  const [pmiData, setPmiData] = useState<PmiResponse | null>(null)
  const [imfGap, setImfGap] = useState<ImfSeries | null>(null)
  const [ipi, setIpi] = useState<IpiResponse | null>(null)
  const [markets, setMarkets] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/cnt-desglose?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/cnt-extra?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=NGDP_RPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=LUR', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=PCPIPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      // Sprint M9 · 8 fuentes nuevas. Patrón: si endpoint 404/error → catch → null → panel oculto.
      fetch('/api/fred/series?id=LRHUTTTTESM156S&n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),   // paro mensual EPA
      fetch('/api/fred/series?id=PCPIPCH_ESP_CORE&n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),  // IPC subyacente (FRED CPGRLE01ESM659N)
      fetch('/api/fred/series?id=CPALTT01ESM659N&n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),   // IPC headline mensual FRED
      fetch('/api/fred/series?id=BPBLTT01ESM637S&n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),   // Balanza cuenta corriente
      fetch('/api/nasdaq-datalink/pmi?country=spain&n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // PMI España
      fetch('/api/imf/country?iso=ESP&indicator=NGDP_FY', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null), // Output gap IMF
      fetch('/api/ine/ipi?n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),                          // IPI producción industrial INE
      fetch('/api/macro-finance/markets', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),                 // yield curve para spread ES-DE
    ]).then(([c, ce, g, u, i, fp, fc, fh, fb, pmi, gap, ipiR, mk]) => {
      if (!alive) return
      setCnt(c); setCntExtra(ce); setImfGrowth(g); setImfUnemp(u); setImfInfl(i)
      setFredParo(fp); setFredCore(fc); setFredHeadline(fh); setFredBop(fb)
      setPmiData(pmi); setImfGap(gap); setIpi(ipiR); setMarkets(mk)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // Helpers para extraer último valor y serie inversa (INE devuelve más reciente primero)
  const ineSeries = (pts?: InePoint[]) => (pts || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const ineLast = (pts?: InePoint[]) => pts?.[0]
  const imfHistFromSeries = (s?: ImfSeries) => {
    const all = (s?.series || []).filter((x) => x.value != null) as { year: number; value: number }[]
    const cy = new Date().getFullYear()
    return {
      hist: all.filter((x) => x.year <= cy).map((x) => ({ period: String(x.year), value: x.value })),
      fc: all.filter((x) => x.year > cy).map((x) => ({ period: String(x.year), value: x.value })),
    }
  }

  // Sprint M9 · helpers nuevos
  // FRED: asumimos shape newest-first (como INE) · revierte para charts cronológicos
  const fredSeriesChrono = (r?: FredSeriesResponse | null) =>
    (r?.series || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  // Última observación de una IMF series (no asume orden)
  const imfLastObs = (s?: ImfSeries | null) => {
    const obs = (s?.series || []).filter((x) => x.value != null) as { year: number; value: number }[]
    if (obs.length === 0) return null
    return obs.slice().sort((a, b) => b.year - a.year)[0]
  }
  // Spread ES-DE 10Y a partir de macro-finance markets · null si falta cualquier yield
  const computeSpreadEsDe = () => {
    const yc = markets?.yield_curve
    if (!Array.isArray(yc)) return null
    const findYield = (label: string, country?: string) => {
      const item = yc.find((y: any) => {
        const tenor = String(y.tenor || y.label || '').toUpperCase()
        const c = String(y.country || y.iso || '').toUpperCase()
        const matchesTenor = tenor.includes(label)
        const matchesCountry = country ? c.includes(country) : true
        return matchesTenor && matchesCountry
      })
      const v = item?.value ?? item?.yield
      return typeof v === 'number' ? v : null
    }
    // Intentamos primero diferenciando por country; si todo el yield_curve es ES, no podremos calcular spread sin DE
    const es10 = findYield('10Y', 'ES') ?? findYield('10Y')
    const de10 = findYield('10Y', 'DE') ?? findYield('10Y', 'DEU')
    if (es10 == null || de10 == null) return null
    // pb = puntos básicos (1pp = 100pb)
    return { es: es10, de: de10, spreadBps: (es10 - de10) * 100 }
  }
  // Badge semáforo (verde/amarillo/rojo/gris) para panel resumen ejecutivo
  type SemaforoLevel = 'green' | 'amber' | 'red' | 'na'
  const semaforoFromRanges = (
    v: number | null | undefined,
    ranges: { green: (n: number) => boolean; amber: (n: number) => boolean },
  ): { level: SemaforoLevel; color: string; bg: string; label: string } => {
    if (v == null || !Number.isFinite(v)) return { level: 'na', color: '#94a3b8', bg: '#f1f5f9', label: 'Sin dato' }
    if (ranges.green(v)) return { level: 'green', color: '#16a34a', bg: '#dcfce7', label: 'Normal' }
    if (ranges.amber(v)) return { level: 'amber', color: '#b45309', bg: '#fef3c7', label: 'Alerta' }
    return { level: 'red', color: '#b91c1c', bg: '#fee2e2', label: 'Crítico' }
  }

  const pibLast = ineLast(cnt?.components?.pib_total?.points)
  const consH = ineLast(cnt?.components?.consumo_hogares?.points)
  const consA = ineLast(cnt?.components?.consumo_aapp?.points)
  const inv = ineLast(cnt?.components?.inversion?.points)
  const ext = ineLast(cnt?.components?.exterior?.points)
  const exports = ineLast(cntExtra?.exports?.points)
  const imports = ineLast(cntExtra?.imports?.points)

  const pibSeries = ineSeries(cnt?.components?.pib_total?.points)
  const consHSeries = ineSeries(cnt?.components?.consumo_hogares?.points)
  const consASeries = ineSeries(cnt?.components?.consumo_aapp?.points)
  const invSeries = ineSeries(cnt?.components?.inversion?.points)
  const extSeries = ineSeries(cnt?.components?.exterior?.points)

  const { hist: imfGrowthHist, fc: imfGrowthFc } = imfHistFromSeries(imfGrowth || undefined)
  const { hist: imfUnempHist, fc: imfUnempFc } = imfHistFromSeries(imfUnemp || undefined)
  const { hist: imfInflHist, fc: imfInflFc } = imfHistFromSeries(imfInfl || undefined)

  // Sprint M9 · series chronológicas para charts + últimos valores para KPIs
  const fredParoSeries = fredSeriesChrono(fredParo)
  const fredCoreSeries = fredSeriesChrono(fredCore)
  const fredHeadlineSeries = fredSeriesChrono(fredHeadline)
  const fredBopSeries = fredSeriesChrono(fredBop)
  const ipiSeries = fredSeriesChrono(ipi as any) // mismo shape que FredSeriesResponse
  const fredParoLast = fredParo?.last
  const fredCoreLast = fredCore?.last
  const fredHeadlineLast = fredHeadline?.last
  const fredBopLast = fredBop?.last ?? fredBopSeries[fredBopSeries.length - 1]
  const ipiLast = ipi?.last
  const imfGapLast = imfLastObs(imfGap)
  const spreadEsDe = computeSpreadEsDe()
  // Diferencial IPC headline - subyacente (último mes común)
  const ipcDiff = (() => {
    const h = fredHeadlineLast?.value
    const c = fredCoreLast?.value
    if (h == null || c == null) return null
    return h - c
  })()

  // Drill abrir KPI INE CNT
  const openCntDrill = (
    label: string,
    series: { period: string; value: number | null }[],
    sourceCode: string,
    imfCompareIndicator?: string,
    accent = tab.themeAccent,
  ) => {
    openDrill({
      title: `${label} · drill INE CNT`,
      subtitle: 'CONTABILIDAD NACIONAL TRIMESTRAL · BASE 2010 SA',
      accent,
      content: (
        <IndicatorDrill
          label={label}
          unit="%"
          decimals={2}
          series={series}
          sourceCode={sourceCode}
          sourceName="INE WSTempus · CNT"
          imfCompareIndicator={imfCompareIndicator}
          accent={accent}
        />
      ),
      source: { name: 'INE · tabla 67824', url: `https://www.ine.es/jaxiT3/Tabla.htm?t=67824` },
    })
  }

  const openImfDrill = (
    label: string,
    indicator: string,
    hist: { period: string; value: number }[],
    fc: { period: string; value: number }[],
    accent = '#7c3aed',
    unit = '%',
  ) => {
    openDrill({
      title: `${label} · drill IMF WEO`,
      subtitle: `IMF DataMapper · ${indicator}`,
      accent,
      content: (
        <IndicatorDrill
          label={label}
          unit={unit}
          decimals={2}
          series={hist}
          forecast={fc}
          sourceCode={indicator}
          sourceName="IMF DataMapper"
          imfCompareIndicator={indicator}
          accent={accent}
        />
      ),
      source: { name: 'IMF DataMapper', url: `https://www.imf.org/external/datamapper/${indicator}@WEO/ESP` },
    })
  }

  // Sprint M9 · drill paro mensual EPA (FRED)
  const openFredParoDrill = () => openDrill({
    title: 'Paro mensual EPA · drill FRED',
    subtitle: 'FRED LRHUTTTTESM156S · mensual',
    accent: '#f59e0b',
    content: (
      <IndicatorDrill
        label="Paro mensual EPA"
        unit="%"
        decimals={2}
        series={fredParoSeries}
        sourceCode="LRHUTTTTESM156S"
        sourceName="FRED St. Louis · OECD"
        threshold={{ amber: 14, red: 20, goodAbove: false }}
        accent="#f59e0b"
      />
    ),
    source: { name: 'FRED St. Louis', url: 'https://fred.stlouisfed.org/series/LRHUTTTTESM156S' },
  })

  // Sprint M9 · drill IPC subyacente vs headline (FRED)
  const openIpcCompareDrill = () => openDrill({
    title: 'IPC España · subyacente vs headline',
    subtitle: 'FRED · CPGRLE01ESM659N (core) vs CPALTT01ESM659N (headline)',
    accent: '#dc2626',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <DeepLineChart
          series={[
            { id: 'h', label: 'IPC headline', color: '#dc2626', points: fredHeadlineSeries },
            { id: 'c', label: 'IPC subyacente', color: '#f97316', points: fredCoreSeries, dashed: true },
          ]}
          height={260}
          yLabel="IPC YoY (%)"
          zeroLine
          formatValue={(v) => `${v.toFixed(1)}%`}
        />
        <TrendNarrative
          label="IPC subyacente"
          unit="%"
          decimals={2}
          series={fredCoreSeries}
          threshold={{ amber: 2, red: 4, goodAbove: false }}
          accent="#dc2626"
        />
      </div>
    ),
    source: { name: 'FRED · IPC España', url: 'https://fred.stlouisfed.org/searchresults/?st=spain%20cpi' },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      {/* CTA · landing profundo /macro/pulso */}
      <a
        href="/macro/pulso"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(90deg, #faf5ff 0%, #f0f9ff 100%)',
          border: '1px solid #e9d5ff',
          borderLeft: `4px solid ${tab.themeAccent}`,
          borderRadius: 10,
          padding: '12px 16px',
          color: '#0f172a',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>✦</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: '#7c3aed', textTransform: 'uppercase' }}>
            Vista profunda · /macro/pulso
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>
            18 indicadores agrupados por familia · termómetro 0-100 · lectura ejecutiva IA · alertas · calendario releases · drill 9 subpestañas por indicador
          </p>
        </div>
        <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Abrir →</span>
      </a>

      {/* KPIs principales · click drill */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <MacroKpiCard
          label="PIB YoY · Volumen SA"
          value={pibLast?.value ?? null}
          color={tab.themeAccent}
          spark={pibSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
          footer={pibLast ? `INE CNTR6654 · ${pibLast.period}` : 'INE CNTR6654'}
          decimals={2}
          loading={loading}
          onClick={pibSeries.length > 1 ? () => openCntDrill('PIB volumen YoY SA', pibSeries, 'CNTR6654', 'NGDP_RPCH') : undefined}
        />
        <MacroKpiCard
          label="Consumo Hogares YoY"
          value={consH?.value ?? null}
          color="#16a34a"
          spark={consHSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
          footer={consH ? `INE CNTR7158 · ${consH.period}` : 'INE CNTR7158'}
          decimals={2}
          loading={loading}
          onClick={consHSeries.length > 1 ? () => openCntDrill('Consumo Hogares YoY SA', consHSeries, 'CNTR7158', undefined, '#16a34a') : undefined}
        />
        <MacroKpiCard
          label="Inversión FBCF YoY"
          value={inv?.value ?? null}
          color="#f97316"
          spark={invSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
          footer={inv ? `INE CNTR7213 · ${inv.period}` : 'INE CNTR7213'}
          decimals={2}
          loading={loading}
          onClick={invSeries.length > 1 ? () => openCntDrill('Inversión FBCF YoY SA', invSeries, 'CNTR7213', undefined, '#f97316') : undefined}
        />
        <MacroKpiCard
          label="Sector Exterior aport."
          value={ext?.value ?? null}
          unit="pp"
          color="#7c3aed"
          spark={extSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
          footer={ext ? `INE CNTR7264 · ${ext.period}` : 'INE CNTR7264'}
          decimals={2}
          loading={loading}
          onClick={extSeries.length > 1 ? () => openCntDrill('Sector Exterior aportación YoY', extSeries, 'CNTR7264', undefined, '#7c3aed') : undefined}
        />
        {/* Sprint M9 · 4 KPIs nuevos (cada uno condicional al dato) */}
        {fredParoLast?.value != null && (
          <MacroKpiCard
            label="Paro mensual EPA"
            value={fredParoLast.value}
            unit="%"
            color="#f59e0b"
            spark={fredParoSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED LRHUTTTTESM156S · ${fredParoLast.period ?? 'mensual'}`}
            decimals={2}
            loading={loading}
            onClick={fredParoSeries.length > 1 ? openFredParoDrill : undefined}
          />
        )}
        {fredCoreLast?.value != null && (
          <MacroKpiCard
            label="IPC subyacente"
            value={fredCoreLast.value}
            unit="%"
            color="#dc2626"
            spark={fredCoreSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED CPGRLE01ESM659N · ${fredCoreLast.period ?? 'mensual'}`}
            decimals={2}
            loading={loading}
            onClick={fredCoreSeries.length > 1 && fredHeadlineSeries.length > 1 ? openIpcCompareDrill : undefined}
          />
        )}
        {imfGapLast && (
          <div title="Positivo = economía sobre potencial. Negativo = capacidad ociosa.">
            <MacroKpiCard
              label="Output gap"
              value={imfGapLast.value}
              unit=" pp PIB"
              color="#7c3aed"
              footer={`IMF NGDP_FY · ${imfGapLast.year}`}
              decimals={2}
              loading={loading}
            />
          </div>
        )}
        {ipiLast?.value != null && (
          <MacroKpiCard
            label="Prod. Industrial YoY"
            value={ipiLast.value}
            unit="%"
            color="#0891b2"
            spark={ipiSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`INE IPI · ${ipiLast.period ?? 'mensual'}`}
            decimals={2}
            loading={loading}
          />
        )}
      </div>

      {/* Sprint M9 · Semáforo macro · resumen ejecutivo 5 indicadores clave.
          Cada celda condicional al dato (null → "Sin dato" gris). Sin onclick. */}
      <MacroPanel
        accent={tab.themeAccent}
        title="Estado macro · resumen ejecutivo"
        subtitle="5 indicadores clave · umbrales de alerta · ● Normal · ◐ Alerta · ! Crítico"
        status="live"
      >
        {(() => {
          const cells = [
            {
              label: 'PIB YoY',
              value: pibLast?.value ?? null,
              unit: '%',
              source: pibLast ? `INE CNTR6654 · ${pibLast.period}` : 'INE CNTR6654',
              semaforo: semaforoFromRanges(pibLast?.value ?? null, {
                green: (n) => n > 1,
                amber: (n) => n >= 0 && n <= 1,
              }),
            },
            {
              label: 'IPC headline',
              value: fredHeadlineLast?.value ?? null,
              unit: '%',
              source: fredHeadlineLast ? `FRED CPALTT01ESM659N · ${fredHeadlineLast.period}` : 'FRED · IPC',
              semaforo: semaforoFromRanges(fredHeadlineLast?.value ?? null, {
                green: (n) => n < 3,
                amber: (n) => n >= 3 && n <= 5,
              }),
            },
            {
              label: 'IPC subyacente',
              value: fredCoreLast?.value ?? null,
              unit: '%',
              source: fredCoreLast ? `FRED CPGRLE01ESM659N · ${fredCoreLast.period}` : 'FRED · IPC core',
              semaforo: semaforoFromRanges(fredCoreLast?.value ?? null, {
                green: (n) => n < 2.5,
                amber: (n) => n >= 2.5 && n <= 4,
              }),
            },
            {
              label: 'Paro mensual',
              value: fredParoLast?.value ?? null,
              unit: '%',
              source: fredParoLast ? `FRED LRHUTTTTESM156S · ${fredParoLast.period}` : 'FRED · Paro EPA',
              semaforo: semaforoFromRanges(fredParoLast?.value ?? null, {
                green: (n) => n < 12,
                amber: (n) => n >= 12 && n <= 16,
              }),
            },
            {
              label: 'Output gap',
              value: imfGapLast?.value ?? null,
              unit: 'pp PIB',
              source: imfGapLast ? `IMF NGDP_FY · ${imfGapLast.year}` : 'IMF NGDP_FY',
              semaforo: semaforoFromRanges(imfGapLast?.value ?? null, {
                green: (n) => n >= -1 && n <= 1,
                amber: (n) => (n >= -2 && n < -1) || (n > 1 && n <= 2),
              }),
            },
          ]
          const icon = (lvl: typeof cells[number]['semaforo']['level']) =>
            lvl === 'green' ? '●' : lvl === 'amber' ? '◐' : lvl === 'red' ? '!' : '–'
          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 10,
              }}
            >
              {cells.map((c) => (
                <div
                  key={c.label}
                  style={{
                    background: c.semaforo.bg,
                    border: `1px solid ${c.semaforo.color}33`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <p style={{ margin: 0, fontSize: 10, color: '#475569', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    {c.label}
                  </p>
                  {c.value != null ? (
                    <>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 22,
                          fontWeight: 700,
                          color: c.semaforo.color,
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: 1.1,
                        }}
                      >
                        {c.value > 0 && c.unit === '%' ? '+' : ''}{c.value.toFixed(2)}{c.unit === '%' ? '%' : ` ${c.unit}`}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: c.semaforo.color, letterSpacing: 0.4 }}>
                        <span style={{ fontFamily: 'ui-monospace, monospace', marginRight: 4 }}>{icon(c.semaforo.level)}</span>
                        {c.semaforo.label}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#94a3b8', fontStyle: 'italic' }}>Sin dato</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>endpoint no disponible</p>
                    </>
                  )}
                  <p style={{ margin: '2px 0 0', fontSize: 9, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                    {c.source}
                  </p>
                </div>
              ))}
            </div>
          )
        })()}
      </MacroPanel>

      {/* PIB Chart profundo · serie 24 trimestres + lectura */}
      {pibSeries.length > 2 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="PIB España · serie 24 trimestres"
          subtitle="Variación interanual · volumen encadenado · datos ajustados de estacionalidad y calendario"
          status="live"
          aiAnalysis={{
            indicator: 'PIB volumen YoY · INE CNTR6654',
            indicatorId: 'ine.cntr6654.pib_yoy',
            tabSlug: 'pulso-macro',
            series: aiSeries(pibSeries),
            metadata: {
              unit: '%',
              source: 'INE WSTempus · CNT',
              sourceCode: 'CNTR6654',
              lastUpdate: pibLast?.period,
              frequency: 'quarterly',
              notes: ['Variación interanual, volumen encadenado, ajustado de estacionalidad y calendario.'],
            },
            windowLabel: '24 trimestres',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'pib', label: 'PIB YoY', color: tab.themeAccent,
              points: pibSeries,
              fillBelow: true,
            }]}
            height={220}
            yLabel="PIB YoY (%)"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
            onPointClick={() => openCntDrill('PIB volumen YoY SA', pibSeries, 'CNTR6654', 'NGDP_RPCH')}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="PIB volumen YoY"
              unit="%"
              decimals={2}
              series={pibSeries as any}
              accent={tab.themeAccent}
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 · IPC desagregado · headline vs subyacente (FRED 36m mensual) */}
      {fredHeadlineSeries.length > 3 && fredCoreSeries.length > 3 && (
        <MacroPanel
          accent="#dc2626"
          title="IPC España · subyacente vs headline"
          subtitle="FRED mensual 36m · diferencial de presión inflacionaria"
          status="live"
          aiAnalysis={{
            indicator: 'IPC headline vs subyacente · FRED',
            indicatorId: 'fred.ipc_headline_vs_core.esp',
            tabSlug: 'pulso-macro',
            series: [
              ...aiSeries(fredHeadlineSeries),
              ...aiSeries(fredCoreSeries),
            ],
            metadata: {
              unit: '%',
              source: 'FRED St. Louis · OECD',
              sourceCode: 'CPALTT01ESM659N + CPGRLE01ESM659N',
              lastUpdate: fredHeadlineLast?.period,
              frequency: 'monthly',
              threshold: { amber: 2, red: 4, goodAbove: false },
              notes: [
                `Diferencial último mes (headline − subyacente): ${ipcDiff != null ? `${ipcDiff > 0 ? '+' : ''}${ipcDiff.toFixed(2)}pp` : '—'}.`,
                'Diferencial positivo = energía/alimentos presionando más que inflación estructural.',
                'Diferencial negativo = inflación estructural más persistente que la headline.',
                'Objetivo BCE: 2% headline a medio plazo. Subyacente más rígida → tarda más en bajar.',
              ],
            },
            windowLabel: '36 meses · 2 series FRED',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'h', label: 'IPC headline', color: '#dc2626', points: fredHeadlineSeries },
              { id: 'c', label: 'IPC subyacente', color: '#f97316', points: fredCoreSeries, dashed: true },
            ]}
            height={220}
            yLabel="IPC YoY (%)"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          {ipcDiff != null && (
            <div style={{ marginTop: 14, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>
                Diferencial headline−subyacente: <strong style={{ color: ipcDiff > 1 ? '#dc2626' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{ipcDiff > 0 ? '+' : ''}{ipcDiff.toFixed(1)} pp</strong>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                Diferencial positivo = energía/alimentos presionando más que la inflación estructural. Negativo = inflación estructural más persistente.
              </p>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="IPC subyacente"
              unit="%"
              decimals={2}
              series={fredCoreSeries as any}
              threshold={{ amber: 2, red: 4, goodAbove: false }}
              accent="#dc2626"
            />
          </div>
        </MacroPanel>
      )}

      {/* Descomposición demanda · multi-line chart */}
      {consHSeries.length > 2 && (
        <MacroPanel
          accent="#10b981"
          title="Descomposición demanda interna"
          subtitle="Consumo hogares · Consumo AAPP · Inversión FBCF · contribución anual · datos SA"
          status="live"
          aiAnalysis={{
            indicator: 'Descomposición demanda interna · INE CNT',
            indicatorId: 'ine.cnt.demanda_interna',
            tabSlug: 'pulso-macro',
            // Para la descomposición pasamos como serie principal el consumo
            // de hogares y aportamos las demás componentes en notas para que
            // el modelo razone sobre balance entre demanda interna y exterior.
            series: aiSeries(consHSeries),
            metadata: {
              unit: '%',
              source: 'INE WSTempus · CNT',
              sourceCode: 'CNTR7158/7188/7213/7264',
              lastUpdate: consH?.period,
              frequency: 'quarterly',
              notes: [
                `Última observación demanda hogares (CNTR7158): ${consH?.value ?? '?'}% en ${consH?.period ?? '?'}.`,
                `Consumo AAPP (CNTR7188) último: ${consA?.value ?? '?'}% en ${consA?.period ?? '?'}.`,
                `Inversión FBCF (CNTR7213) último: ${inv?.value ?? '?'}% en ${inv?.period ?? '?'}.`,
                `Sector exterior aportación (CNTR7264) último: ${ext?.value ?? '?'}pp en ${ext?.period ?? '?'}.`,
              ],
            },
            windowLabel: '24 trimestres · 4 componentes',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'h', label: 'Hogares (CNTR7158)', color: '#16a34a', points: consHSeries },
              { id: 'a', label: 'AAPP (CNTR7188)',     color: '#0891b2', points: consASeries },
              { id: 'i', label: 'Inversión (CNTR7213)', color: '#f97316', points: invSeries },
              { id: 'e', label: 'Exterior pp (CNTR7264)', color: '#7c3aed', points: extSeries, dashed: true },
            ]}
            height={240}
            yLabel="Var anual (%)"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
        </MacroPanel>
      )}

      {/* Sprint M9 · PMI España · NASDAQ Data Link · solo si composite tiene ≥3 obs */}
      {pmiData?.ok === true && (pmiData?.composite?.length ?? 0) > 3 && (() => {
        const composite = pmiData?.composite || []
        const manufacturing = pmiData?.manufacturing || []
        const services = pmiData?.services || []
        const lastComposite = composite[composite.length - 1]
        const lastManu = manufacturing[manufacturing.length - 1]
        const lastSvc = services[services.length - 1]
        // Serie referencia y=50 (umbral expansión/contracción) usando los periodos del compuesto
        const refLine = composite.map((p) => ({ period: p.period, value: 50 }))
        const pmiSeries: { id: string; label: string; color: string; points: { period: string; value: number | null }[]; dashed?: boolean }[] = [
          { id: 'comp', label: 'PMI Compuesto', color: '#0891b2', points: composite },
        ]
        if (manufacturing.length > 0) pmiSeries.push({ id: 'manu', label: 'PMI Manufacturas', color: '#f97316', points: manufacturing })
        if (services.length > 0) pmiSeries.push({ id: 'svc', label: 'PMI Servicios', color: '#7c3aed', points: services, dashed: true })
        pmiSeries.push({ id: 'ref', label: 'Umbral 50 · expansión/contracción', color: '#94a3b8', points: refLine, dashed: true })
        const pmiKpi = (
          label: string,
          last: { period: string; value: number } | undefined,
          color: string,
        ) => (
          last ? (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${color}` }}>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 22,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: last.value > 50 ? '#16a34a' : '#dc2626',
                }}
              >
                {last.value.toFixed(1)}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  background: last.value > 50 ? '#dcfce7' : '#fee2e2',
                  color: last.value > 50 ? '#166534' : '#991b1b',
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {last.value > 50 ? 'Expansión' : 'Contracción'}
              </span>
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>{last.period}</p>
            </div>
          ) : null
        )
        return (
          <MacroPanel
            accent="#0891b2"
            title="PMI España · actividad empresarial"
            subtitle="NASDAQ Data Link · composite / manufacturas / servicios · monthly"
            status="live"
            aiAnalysis={{
              indicator: 'PMI España · NASDAQ Data Link',
              indicatorId: 'nasdaq.pmi.esp',
              tabSlug: 'pulso-macro',
              series: aiSeries(composite),
              metadata: {
                unit: 'índice',
                source: 'NASDAQ Data Link',
                sourceCode: 'PMI_ESP',
                lastUpdate: lastComposite?.period,
                frequency: 'monthly',
                threshold: { amber: 50, red: 47, goodAbove: true },
                notes: [
                  'Índice PMI: >50 = expansión · <50 = contracción.',
                  `Último PMI compuesto: ${lastComposite?.value?.toFixed(1) ?? '—'}.`,
                  `Manufacturas: ${lastManu?.value?.toFixed(1) ?? '—'} · Servicios: ${lastSvc?.value?.toFixed(1) ?? '—'}.`,
                ],
              },
              windowLabel: `${composite.length} meses · ${pmiSeries.length - 1} subíndices`,
            } as ChartAnalysisInput}
          >
            <DeepLineChart
              series={pmiSeries}
              height={200}
              yLabel="PMI"
              formatValue={(v) => v.toFixed(1)}
            />
            <div
              style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
              }}
            >
              {pmiKpi('PMI Compuesto', lastComposite, '#0891b2')}
              {pmiKpi('PMI Manufacturas', lastManu, '#f97316')}
              {pmiKpi('PMI Servicios', lastSvc, '#7c3aed')}
            </div>
            <div style={{ marginTop: 12 }}>
              <TrendNarrative
                label="PMI compuesto"
                unit=""
                decimals={1}
                series={composite as any}
                threshold={{ amber: 50, red: 47, goodAbove: true }}
                accent="#0891b2"
              />
            </div>
          </MacroPanel>
        )
      })()}

      {/* Comercio exterior */}
      {cntExtra?.ok && exports && (
        <MacroPanel
          accent="#0891b2"
          title="Comercio exterior · YoY"
          subtitle="Exportaciones (CNTR7267) vs Importaciones (CNTR7287) · volumen SA"
          status="live"
        >
          <DeepLineChart
            series={[
              { id: 'x', label: 'Exportaciones', color: '#0891b2', points: ineSeries(cntExtra.exports?.points) },
              { id: 'm', label: 'Importaciones', color: '#f97316', points: ineSeries(cntExtra.imports?.points) },
            ]}
            height={200}
            yLabel="Var anual (%)"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Exportaciones bienes y servicios"
              unit="%"
              decimals={2}
              series={ineSeries(cntExtra.exports?.points) as any}
              accent="#0891b2"
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 · Balanza cuenta corriente España · FRED BPBLTT01ESM637S */}
      {fredBop?.ok === true && fredBopSeries.length > 3 && (() => {
        const lastBop = fredBopLast?.value
        return (
          <MacroPanel
            accent="#0891b2"
            title="Balanza cuenta corriente España"
            subtitle="FRED BPBLTT01ESM637S · % PIB · trimestral"
            status="live"
            aiAnalysis={{
              indicator: 'Balanza cuenta corriente · FRED BPBLTT01ESM637S',
              indicatorId: 'fred.bop.esp',
              tabSlug: 'pulso-macro',
              series: aiSeries(fredBopSeries),
              metadata: {
                unit: '% PIB',
                source: 'FRED St. Louis · OECD',
                sourceCode: 'BPBLTT01ESM637S',
                lastUpdate: fredBopLast?.period,
                frequency: 'quarterly',
                threshold: { amber: -1, red: -3, goodAbove: true },
                notes: [
                  `Último valor: ${lastBop != null ? `${lastBop.toFixed(2)}% PIB` : '—'}.`,
                  'Positivo = superávit (España exporta más capital del que importa).',
                  'Negativo = déficit (España importa capital · vulnerabilidad externa).',
                  'Umbral académico de alerta: déficit > 3% PIB sostenido.',
                ],
              },
              windowLabel: `${fredBopSeries.length} obs`,
            } as ChartAnalysisInput}
          >
            <DeepLineChart
              series={[{ id: 'bop', label: 'Cuenta corriente', color: '#0891b2', points: fredBopSeries, fillBelow: true }]}
              height={180}
              zeroLine
              yLabel="% PIB"
              formatValue={(v) => `${v.toFixed(1)}%`}
            />
            {lastBop != null && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  background: lastBop >= 0 ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${lastBop >= 0 ? '#a7f3d0' : '#fecaca'}`,
                  borderRadius: 8,
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: lastBop >= 0 ? '#166534' : '#991b1b' }}>
                  {lastBop >= 0 ? 'Superávit por cuenta corriente' : 'Déficit por cuenta corriente'}
                  {' · '}
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{lastBop >= 0 ? '+' : ''}{lastBop.toFixed(2)}% PIB</span>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  {lastBop >= 0
                    ? 'España exporta más capital del que importa · posición acreedora neta vs resto del mundo.'
                    : 'España importa capital · necesita financiación externa para cubrir el déficit.'}
                </p>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <TrendNarrative
                label="Balanza cuenta corriente"
                unit="%"
                decimals={2}
                series={fredBopSeries as any}
                threshold={{ amber: -1, red: -3, goodAbove: true }}
                accent="#0891b2"
              />
            </div>
          </MacroPanel>
        )
      })()}

      {/* IMF Growth long-history + forecast */}
      {imfGrowthHist.length > 5 && (
        <MacroPanel
          accent="#7c3aed"
          title="IMF WEO · Crecimiento PIB España"
          subtitle="Serie histórica 20+ años + proyección 5 años · variable NGDP_RPCH"
          status="live"
          aiAnalysis={{
            indicator: 'Crecimiento PIB · IMF NGDP_RPCH',
            indicatorId: 'imf.weo.ngdp_rpch.esp',
            tabSlug: 'pulso-macro',
            series: [
              ...aiSeries(imfGrowthHist),
              ...aiSeries(imfGrowthFc.map((p) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '%',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'NGDP_RPCH',
              lastUpdate: imfGrowthHist[imfGrowthHist.length - 1]?.period,
              frequency: 'annual',
              notes: [
                'Histórico anual + proyección 5 años del IMF World Economic Outlook.',
                'Hitos: 2008 crisis financiera, 2012 doble recesión, 2020 COVID, 2022 shock energético.',
              ],
            },
            windowLabel: `${imfGrowthHist.length}y hist + ${imfGrowthFc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'imf-g',
              label: 'PIB real % var anual',
              color: '#7c3aed',
              points: [...imfGrowthHist, ...imfGrowthFc],
              forecastFromIndex: imfGrowthHist.length,
              fillBelow: true,
            }]}
            height={220}
            yLabel="% var anual"
            zeroLine
            annotations={[
              { period: '2008', label: 'Crisis financiera', color: '#dc2626' },
              { period: '2020', label: 'COVID-19', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
            onPointClick={() => openImfDrill('Crecimiento PIB IMF', 'NGDP_RPCH', imfGrowthHist, imfGrowthFc, '#7c3aed', '%')}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Crecimiento PIB IMF WEO"
              unit="%"
              decimals={2}
              series={imfGrowthHist}
              forecast={imfGrowthFc}
              accent="#7c3aed"
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <CountryCompareBars
              indicator="NGDP_RPCH"
              title="Crecimiento PIB · España vs peers UE"
              subtitle="IMF WEO · último año disponible"
              spainColor={tab.themeAccent}
            />
          </div>
          {/* Sprint M9 CAMBIO 8 · Spread ES-DE 10Y · prima riesgo soberano periférico.
              Requiere que macro-finance/markets devuelva yields ES y DE en yield_curve.
              Si solo está ES en el catálogo actual, computeSpreadEsDe devuelve null y no se renderiza. */}
          {spreadEsDe && (() => {
            const pb = spreadEsDe.spreadBps
            const badgeColor = pb < 100 ? '#16a34a' : pb <= 200 ? '#b45309' : '#b91c1c'
            const badgeBg = pb < 100 ? '#dcfce7' : pb <= 200 ? '#fef3c7' : '#fee2e2'
            const label = pb < 100 ? 'Bajo' : pb <= 200 ? 'Vigilar' : 'Tensión'
            return (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                  Spread ES-DE 10Y
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: badgeColor, fontVariantNumeric: 'tabular-nums' }}>
                  {pb.toFixed(0)} pb
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    background: badgeBg,
                    color: badgeColor,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                  ECB SDW · ES {spreadEsDe.es.toFixed(2)}% · DE {spreadEsDe.de.toFixed(2)}%
                </span>
              </div>
            )
          })()}
          {/* TODO Sprint M9 · si macro-finance/markets sólo expone yields ES (no DE),
              ampliar el conector para incluir Bund 10Y · sin DE no se puede calcular spread. */}
        </MacroPanel>
      )}

      {/* IMF Inflación long-history */}
      {imfInflHist.length > 5 && (
        <MacroPanel
          accent="#dc2626"
          title="IMF WEO · Inflación España"
          subtitle="IPC % var anual · serie histórica + forecast · variable PCPIPCH"
          status="live"
          aiAnalysis={{
            indicator: 'Inflación IPC · IMF PCPIPCH',
            indicatorId: 'imf.weo.pcpipch.esp',
            tabSlug: 'pulso-macro',
            series: [
              ...aiSeries(imfInflHist),
              ...aiSeries(imfInflFc.map((p) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '%',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'PCPIPCH',
              lastUpdate: imfInflHist[imfInflHist.length - 1]?.period,
              frequency: 'annual',
              threshold: { amber: 2, red: 4, goodAbove: false },
              notes: ['Objetivo BCE: 2% mp. 2022 shock energético post-Ucrania.'],
            },
            windowLabel: `${imfInflHist.length}y hist + ${imfInflFc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'imf-i',
              label: 'IPC % var anual',
              color: '#dc2626',
              points: [...imfInflHist, ...imfInflFc],
              forecastFromIndex: imfInflHist.length,
              fillBelow: true,
            }]}
            height={200}
            yLabel="IPC YoY (%)"
            zeroLine
            annotations={[{ period: '2022', label: 'Shock energético', color: '#f59e0b' }]}
            formatValue={(v) => `${v.toFixed(1)}%`}
            onPointClick={() => openImfDrill('Inflación IPC IMF', 'PCPIPCH', imfInflHist, imfInflFc, '#dc2626', '%')}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Inflación IPC"
              unit="%"
              decimals={2}
              series={imfInflHist}
              forecast={imfInflFc}
              threshold={{ amber: 2, red: 4, goodAbove: false }}
              accent="#dc2626"
            />
          </div>
        </MacroPanel>
      )}

      {/* IMF Paro long-history */}
      {imfUnempHist.length > 5 && (
        <MacroPanel
          accent="#f59e0b"
          title="IMF WEO · Paro España"
          subtitle="Tasa paro % población activa · serie histórica + forecast · variable LUR"
          status="live"
          aiAnalysis={{
            indicator: 'Tasa paro · IMF LUR',
            indicatorId: 'imf.weo.lur.esp',
            tabSlug: 'pulso-macro',
            series: [
              ...aiSeries(imfUnempHist),
              ...aiSeries(imfUnempFc.map((p) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '%',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'LUR',
              lastUpdate: imfUnempHist[imfUnempHist.length - 1]?.period,
              frequency: 'annual',
              threshold: { amber: 12, red: 18, goodAbove: false },
              notes: ['Pico 26.1% en 2013. NAIRU España estimada ~13%.'],
            },
            windowLabel: `${imfUnempHist.length}y hist + ${imfUnempFc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'imf-u',
              label: 'Tasa paro %',
              color: '#f59e0b',
              points: [...imfUnempHist, ...imfUnempFc],
              forecastFromIndex: imfUnempHist.length,
              fillBelow: true,
            }]}
            height={200}
            yLabel="Tasa paro %"
            annotations={[
              { period: '2013', label: 'Pico crisis', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
            onPointClick={() => openImfDrill('Paro IMF', 'LUR', imfUnempHist, imfUnempFc, '#f59e0b', '%')}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Tasa de paro"
              unit="%"
              decimals={2}
              series={imfUnempHist}
              forecast={imfUnempFc}
              threshold={{ amber: 12, red: 18, goodAbove: false }}
              accent="#f59e0b"
            />
          </div>
          {/* Sprint M9 CAMBIO 9 · comparativa de paro vs peers UE */}
          <div style={{ marginTop: 14 }}>
            <CountryCompareBars
              indicator="LUR"
              title="Tasa paro · España vs peers UE"
              subtitle="IMF WEO · último año disponible"
              spainColor="#f59e0b"
              countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'GRC', 'NLD', 'POL']}
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 CAMBIO 7 · Producción industrial España · IPI INE.
          Solo si endpoint devolvió datos · annotation COVID lockdown vertical. */}
      {ipi?.ok === true && ipiSeries.length > 3 && (
        <MacroPanel
          accent="#0891b2"
          title="Producción industrial España · IPI"
          subtitle="INE · variación anual · serie 36 meses · excluye construcción"
          status="live"
          aiAnalysis={{
            indicator: 'IPI variación anual · INE',
            indicatorId: 'ine.ipi.yoy',
            tabSlug: 'pulso-macro',
            series: aiSeries(ipiSeries),
            metadata: {
              unit: '%',
              source: 'INE · Índice Producción Industrial',
              sourceCode: 'IPI',
              lastUpdate: ipiLast?.period,
              frequency: 'monthly',
              threshold: { amber: 0, red: -3, goodAbove: true },
              notes: [
                `Último valor IPI YoY: ${ipiLast?.value != null ? `${ipiLast.value.toFixed(2)}%` : '—'}.`,
                'Excluye construcción. Indicador adelantado del ciclo manufacturero.',
                'Caída marzo 2020 por COVID lockdown · rebote V verano 2020.',
              ],
            },
            windowLabel: '36 meses',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{ id: 'ipi', label: 'IPI YoY', color: '#0891b2', points: ipiSeries, fillBelow: true }]}
            height={180}
            zeroLine
            yLabel="IPI YoY (%)"
            formatValue={(v) => `${v.toFixed(1)}%`}
            annotations={[{ period: '2020-03', label: 'COVID lockdown', color: '#dc2626' }]}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="IPI YoY"
              unit="%"
              decimals={2}
              series={ipiSeries as any}
              threshold={{ amber: 0, red: -3, goodAbove: true }}
              accent="#0891b2"
            />
          </div>
        </MacroPanel>
      )}

      {/* IMF panel completo (componente existente) */}
      <ImfWeoForecast />
      {/* Sprint M9 · orden final 15 paneles:
          1. TabHeader · 2. CTA /macro/pulso · 3. Fila KPIs (4 base + 4 nuevos)
          4. Semáforo macro · 5. PIB Chart · 6. IPC desagregado · 7. Descomposición demanda
          8. PMI España · 9. Comercio exterior · 10. Balanza cuenta corriente
          11. IMF Growth + spread ES-DE · 12. IMF Inflación · 13. IMF Paro + CountryCompare LUR
          14. IPI · 15. ImfWeoForecast */}
    </div>
  )
}

export default PulsoMacroTab
