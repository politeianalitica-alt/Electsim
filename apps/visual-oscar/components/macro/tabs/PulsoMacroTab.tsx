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

export function PulsoMacroTab() {
  const tab = getTab('pulso-macro')
  const { openDrill } = useMacroDrawer()

  const [cnt, setCnt] = useState<CntDesglose | null>(null)
  const [cntExtra, setCntExtra] = useState<CntExtra | null>(null)
  const [imfGrowth, setImfGrowth] = useState<ImfSeries | null>(null)
  const [imfUnemp, setImfUnemp] = useState<ImfSeries | null>(null)
  const [imfInfl, setImfInfl] = useState<ImfSeries | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/cnt-desglose?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/cnt-extra?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=NGDP_RPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=LUR', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=PCPIPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([c, ce, g, u, i]) => {
      if (!alive) return
      setCnt(c); setCntExtra(ce); setImfGrowth(g); setImfUnemp(u); setImfInfl(i); setLoading(false)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

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
      </div>

      {/* PIB Chart profundo · serie 24 trimestres + lectura */}
      {pibSeries.length > 2 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="PIB España · serie 24 trimestres"
          subtitle="Variación interanual · volumen encadenado · datos ajustados de estacionalidad y calendario"
          status="live"
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

      {/* Descomposición demanda · multi-line chart */}
      {consHSeries.length > 2 && (
        <MacroPanel
          accent="#10b981"
          title="Descomposición demanda interna"
          subtitle="Consumo hogares · Consumo AAPP · Inversión FBCF · contribución anual · datos SA"
          status="live"
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

      {/* IMF Growth long-history + forecast */}
      {imfGrowthHist.length > 5 && (
        <MacroPanel
          accent="#7c3aed"
          title="IMF WEO · Crecimiento PIB España"
          subtitle="Serie histórica 20+ años + proyección 5 años · variable NGDP_RPCH"
          status="live"
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
        </MacroPanel>
      )}

      {/* IMF Inflación long-history */}
      {imfInflHist.length > 5 && (
        <MacroPanel
          accent="#dc2626"
          title="IMF WEO · Inflación España"
          subtitle="IPC % var anual · serie histórica + forecast · variable PCPIPCH"
          status="live"
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
        </MacroPanel>
      )}

      {/* IMF panel completo (componente existente) */}
      <ImfWeoForecast />
    </div>
  )
}

export default PulsoMacroTab
