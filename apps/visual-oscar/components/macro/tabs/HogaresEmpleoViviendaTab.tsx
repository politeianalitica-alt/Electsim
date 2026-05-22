'use client'
/**
 * `<HogaresEmpleoViviendaTab />` · Tab 10 · Hogares, empleo, vivienda PROFUNDO.
 *
 * Fuentes vivas:
 *  - INE EPA86913 paro general + breakdown edad
 *  - INE IPV tabla 76201 (precio vivienda)
 *  - INE ETCL coste laboral
 *  - IMF LUR paro % activos
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { IndicatorDrill } from '../IndicatorDrill'
import { EncuestaConsumoPanel } from '../EncuestaConsumoPanel'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'

export function HogaresEmpleoViviendaTab() {
  const tab = getTab('hogares-empleo-vivienda')
  const { openDrill } = useMacroDrawer()
  const [epa, setEpa] = useState<any>(null)
  const [ipv, setIpv] = useState<any>(null)
  const [etcl, setEtcl] = useState<any>(null)
  const [imfUnemp, setImfUnemp] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/ine/epa?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/ipv?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/etcl?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=LUR', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([e, i, et, u]) => {
      if (!alive) return
      setEpa(e); setIpv(i); setEtcl(et); setImfUnemp(u); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const rev = (pts: any[] = []) => pts.slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const epaGeneralSeries = rev(epa?.general?.points)
  const epaJovenesSeries = rev(epa?.menores_25?.points)
  const epaGeneralLast = epa?.general?.points?.[0]
  const epaJovenesLast = epa?.menores_25?.points?.[0]
  const ipvGeneralSeries = rev(ipv?.general?.points)
  const ipvNuevaSeries = rev(ipv?.nueva?.points)
  const ipvSegundaSeries = rev(ipv?.segunda?.points)
  const ipvLast = ipv?.general?.points?.[0]
  const etclSeries = rev(etcl?.total?.points)
  const etclLast = etcl?.total?.points?.[0]

  const cy = new Date().getFullYear()
  const imfHist = (imfUnemp?.series || []).filter((s: any) => s.value != null && s.year <= cy).map((s: any) => ({ period: String(s.year), value: s.value }))
  const imfFc = (imfUnemp?.series || []).filter((s: any) => s.value != null && s.year > cy).map((s: any) => ({ period: String(s.year), value: s.value }))

  const openEpaDrill = () => {
    openDrill({
      title: 'EPA · Tasa de paro España',
      subtitle: 'INE EPA86913 · serie trimestral nacional',
      accent: tab.themeAccent,
      content: (
        <IndicatorDrill
          label="Tasa paro general"
          unit="%"
          decimals={2}
          series={epaGeneralSeries}
          sourceCode="EPA86913"
          sourceName="INE EPA"
          imfCompareIndicator="LUR"
          threshold={{ amber: 12, red: 18, goodAbove: false }}
          accent={tab.themeAccent}
        />
      ),
      source: { name: 'INE EPA', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=4247' },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {epaGeneralLast && (
          <MacroKpiCard
            label="Tasa paro general"
            value={epaGeneralLast.value}
            color={tab.themeAccent}
            spark={epaGeneralSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            footer={`INE EPA86913 · ${epaGeneralLast.period}`}
            onClick={epaGeneralSeries.length > 1 ? openEpaDrill : undefined}
            loading={loading}
          />
        )}
        {epaJovenesLast && (
          <MacroKpiCard
            label="Paro juvenil <25"
            value={epaJovenesLast.value}
            color="#dc2626"
            spark={epaJovenesSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            footer={`INE EPA86912 · ${epaJovenesLast.period}`}
            loading={loading}
          />
        )}
        {ipvLast && (
          <MacroKpiCard
            label="IPV vivienda"
            value={ipvLast.value}
            unit=""
            color="#16a34a"
            spark={ipvGeneralSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            decimals={1}
            footer={`INE IPV · ${ipvLast.period} · base 2015`}
            loading={loading}
          />
        )}
        {etclLast && (
          <MacroKpiCard
            label="Coste laboral / mes"
            value={etclLast.value}
            unit=" €"
            color="#7c3aed"
            decimals={0}
            footer={`INE ETCL · ${etclLast.period}`}
            loading={loading}
          />
        )}
      </div>

      {/* EPA serie larga + breakdown edad */}
      {epaGeneralSeries.length > 5 && (
        <MacroPanel
          accent={tab.themeAccent}
          title="EPA · Paro España · 24 trimestres"
          subtitle="Tasa paro general vs juvenil <25 · INE trimestral nacional"
          status="live"
        >
          <DeepLineChart
            series={[
              { id: 'g', label: 'General', color: tab.themeAccent, points: epaGeneralSeries, fillBelow: true },
              { id: 'j', label: '<25 años', color: '#dc2626', points: epaJovenesSeries, dashed: true },
            ]}
            height={220}
            yLabel="Tasa paro %"
            formatValue={(v) => `${v.toFixed(1)}%`}
            onPointClick={openEpaDrill}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Tasa paro general"
              unit="%"
              decimals={2}
              series={epaGeneralSeries as any}
              threshold={{ amber: 12, red: 18, goodAbove: false }}
              accent={tab.themeAccent}
            />
          </div>
        </MacroPanel>
      )}

      {/* IMF Paro 20y + forecast */}
      {imfHist.length > 5 && (
        <MacroPanel
          accent="#f59e0b"
          title="IMF WEO · Paro España 20y + forecast"
          subtitle="LUR · histórica + proyección 5y · % población activa"
          status="live"
        >
          <DeepLineChart
            series={[{
              id: 'imf',
              label: 'Tasa paro %',
              color: '#f59e0b',
              points: [...imfHist, ...imfFc],
              forecastFromIndex: imfHist.length,
              fillBelow: true,
            }]}
            height={220}
            yLabel="Tasa paro %"
            annotations={[
              { period: '2013', label: '26% pico', color: '#dc2626' },
              { period: '2020', label: 'COVID', color: '#dc2626' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Tasa paro IMF"
              unit="%"
              decimals={2}
              series={imfHist}
              forecast={imfFc}
              threshold={{ amber: 12, red: 18, goodAbove: false }}
              accent="#f59e0b"
            />
          </div>
        </MacroPanel>
      )}

      {/* IPV serie larga + breakdown */}
      {ipvGeneralSeries.length > 5 && (
        <MacroPanel
          accent="#16a34a"
          title="IPV · Índice Precio Vivienda España"
          subtitle="INE base 2015 · trimestral · general + nueva + segunda mano"
          status="live"
        >
          <DeepLineChart
            series={[
              { id: 'g', label: 'IPV general', color: '#16a34a', points: ipvGeneralSeries, fillBelow: true },
              ...(ipvNuevaSeries.length > 0 ? [{ id: 'n', label: 'Vivienda nueva', color: '#10b981', points: ipvNuevaSeries }] : []),
              ...(ipvSegundaSeries.length > 0 ? [{ id: 's', label: 'Segunda mano', color: '#0d9488', points: ipvSegundaSeries, dashed: true }] : []),
            ]}
            height={220}
            yLabel="IPV (base 2015=100)"
            formatValue={(v) => v.toFixed(1)}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="IPV general"
              unit=""
              decimals={1}
              series={ipvGeneralSeries as any}
              accent="#16a34a"
            />
          </div>
        </MacroPanel>
      )}

      {/* ETCL coste laboral */}
      {etclSeries.length > 5 && (
        <MacroPanel
          accent="#7c3aed"
          title="ETCL · Coste laboral medio por trabajador y mes"
          subtitle="INE ETCL trimestral · euros · serie 24 trimestres"
          status="live"
        >
          <DeepLineChart
            series={[{ id: 'etcl', label: 'Coste laboral', color: '#7c3aed', points: etclSeries, fillBelow: true }]}
            height={200}
            yLabel="€/mes"
            formatValue={(v) => `${Math.round(v).toLocaleString('es-ES')}€`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Coste laboral medio"
              unit=" €"
              decimals={0}
              series={etclSeries as any}
              accent="#7c3aed"
            />
          </div>
        </MacroPanel>
      )}

      {/* CountryCompare paro */}
      <MacroPanel accent="#f59e0b" title="Paro · España vs peers UE" subtitle="IMF LUR · último año disponible" status="live">
        <CountryCompareBars
          indicator="LUR"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'GRC']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={2}
        />
      </MacroPanel>

      {/* EPF · Encuesta Presupuestos Familiares · comportamiento gasto hogares */}
      <EncuestaConsumoPanel />
    </div>
  )
}

export default HogaresEmpleoViviendaTab
