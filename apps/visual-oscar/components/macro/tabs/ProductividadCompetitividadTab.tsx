'use client'
/**
 * `<ProductividadCompetitividadTab />` · Tab 8 PROFUNDO.
 * Fuentes vivas: OEC ECI, INE ETCL, IMF productividad.
 * Sin empty states OEPM (regla del usuario).
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { OecdMacroPanel } from '../OecdMacroPanel'
import { getTab } from '@/lib/macro/sources-matrix'

export function ProductividadCompetitividadTab() {
  const tab = getTab('productividad-competitividad')
  const [oec, setOec] = useState<any>(null)
  const [etcl, setEtcl] = useState<any>(null)
  const [imfProd, setImfProd] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/oec/spain-overview', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/etcl?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=NGDP_RPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([o, e, p]) => {
      if (!alive) return
      setOec(o); setEtcl(e); setImfProd(p); setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const rev = (pts: any[] = []) => pts.slice().reverse().map((p) => ({ period: p.period, value: p.value }))
  const etclSeries = rev(etcl?.total?.points)
  const etclLast = etcl?.total?.points?.[0]
  const etclYoY = etclSeries.length >= 5 && etclSeries[etclSeries.length - 5]?.value
    ? ((etclLast?.value - etclSeries[etclSeries.length - 5].value) / etclSeries[etclSeries.length - 5].value) * 100
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {oec?.eci_value != null && (
          <MacroKpiCard
            label="ECI · score"
            value={oec.eci_value}
            unit=""
            decimals={3}
            color={tab.themeAccent}
            footer="OEC Economic Complexity Index"
            loading={loading}
          />
        )}
        {oec?.eci_rank != null && (
          <MacroKpiCard
            label="ECI · ranking global"
            value={oec.eci_rank}
            unit=""
            decimals={0}
            color="#0891b2"
            footer="OEC · entre 130 países"
            loading={loading}
          />
        )}
        {etclLast && (
          <MacroKpiCard
            label="Coste laboral / mes"
            value={etclLast.value}
            unit=" €"
            decimals={0}
            color="#7c3aed"
            spark={etclSeries.slice(-12).map((p: any) => p.value).filter((v: any) => v != null)}
            footer={`INE ETCL · ${etclLast.period}`}
            loading={loading}
          />
        )}
        {etclYoY != null && (
          <MacroKpiCard
            label="ETCL · YoY"
            value={etclYoY}
            color="#10b981"
            footer="Coste laboral vs hace 5 trimestres"
            decimals={2}
            loading={loading}
          />
        )}
      </div>

      {/* ETCL serie + lectura */}
      {etclSeries.length > 5 && (
        <MacroPanel
          accent="#7c3aed"
          title="ETCL · Coste laboral medio por trabajador"
          subtitle="INE Encuesta Trimestral Coste Laboral · euros/mes · 24 trimestres"
          status="live"
        >
          <DeepLineChart
            series={[{ id: 'etcl', label: 'Coste laboral', color: '#7c3aed', points: etclSeries, fillBelow: true }]}
            height={220}
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

      {/* OECD panel macro complementario */}
      <MacroPanel
        accent={tab.themeAccent}
        title="OECD · indicadores complementarios"
        subtitle="Productividad + ULC + I+D + Tax revenue"
        status="live"
      >
        <OecdMacroPanel compact />
      </MacroPanel>

      {/* Comparativa peers - productividad y output gap */}
      <MacroPanel accent="#0891b2" title="Crecimiento PIB · España vs peers UE" subtitle="IMF NGDP_RPCH · proxy productividad" status="live">
        <CountryCompareBars
          indicator="NGDP_RPCH"
          countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'IRL']}
          spainColor={tab.themeAccent}
          unit="%"
          decimals={2}
        />
      </MacroPanel>
    </div>
  )
}

export default ProductividadCompetitividadTab
