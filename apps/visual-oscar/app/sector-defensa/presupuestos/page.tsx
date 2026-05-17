'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { Panel } from '@/components/SectorPanel'
import { BudgetTimeseriesChart } from './_components/BudgetTimeseriesChart'
import { BudgetWaterfall } from './_components/BudgetWaterfall'
import { NatoComplianceTable } from './_components/NatoComplianceTable'
import { BudgetChoropleth } from './_components/BudgetChoropleth'
import { BudgetProjectionChart } from './_components/BudgetProjection'
import { proyectarPresupuesto } from '@/lib/defense/analisis-defensa'

interface MultiSeries {
  series: Array<{ iso3: string; label: string; color: string; data: Array<{ year: number; value: number | null }> }>
  from: number
  to: number
}
interface WaterfallResp {
  items: Array<{ iso3: string; label: string; value_usd_b: number | null; delta_usd_m: number | null; delta_pct: number | null; highlighted: boolean }>
  year: number
  prev_year: number
}
interface OtanResp {
  items: Array<{ iso3: string; pais: string; pct_pib: number | null; year: number | null; cumple_otan: boolean | null; destacado?: boolean }>
  year: number
  media_otan: number
  cumplen_pct: number
}

const CURRENT_YEAR = new Date().getFullYear() - 1

export default function PresupuestosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [multi, setMulti]         = useState<MultiSeries | null>(null)
  const [waterfall, setWaterfall] = useState<WaterfallResp | null>(null)
  const [otan, setOtan]           = useState<OtanResp | null>(null)
  const [loading, setLoading]     = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = async () => {
    setLoading(true)
    const [m, w, o] = await Promise.all([
      fetch('/api/sectores/defensa/sipri-multipais?from=2005').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/sectores/defensa/waterfall?year=${CURRENT_YEAR}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/sectores/defensa/comparativa-otan').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    setMulti(m); setWaterfall(w); setOtan(o)
    setUpdatedAt(new Date()); setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  // Items para el choropleth: combina datos OTAN con los del multi-series
  const choroplethItems = otan?.items.map(it => ({ iso3: it.iso3, pct_pib: it.pct_pib })) ?? []

  return (
    <div style={{ paddingTop: 24 }}>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }}>
            DEFENSA · PRESUPUESTOS MILITARES
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.022em', margin: 0, color: '#1d1d1f' }}>
            Gasto militar global
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {updatedAt && (
            <span style={{ fontSize: 11, color: '#86868b' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399', display: 'inline-block', marginRight: 5 }} />
              {updatedAt.toLocaleTimeString('es-ES')}
            </span>
          )}
          <button
            onClick={refresh}
            style={{
              fontSize: 11, padding: '6px 14px', borderRadius: 999,
              border: '1px solid #DDDDE3', background: '#fff', color: '#3a3a3d',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* ROW 1: Series temporales multi-país (full width) */}
      <Panel
        title="Gasto militar por país · serie temporal"
        subtitle={multi ? `${multi.from}–${multi.to} · % PIB · ${multi.series.length} países · línea roja = objetivo OTAN 2%` : 'Cargando…'}
        sourceUrl="https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS"
        sourceLabel="World Bank"
        sourceTooltip="MS.MIL.XPND.GD.ZS · Military expenditure % of GDP"
        apiUrl="/api/sectores/defensa/sipri-multipais"
        marginBottom
      >
        {multi && <BudgetTimeseriesChart series={multi.series} from={multi.from} to={multi.to} />}
      </Panel>

      {/* ROW 2: Waterfall + NATO compliance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Variación interanual del gasto"
          subtitle={waterfall ? `${waterfall.prev_year} → ${waterfall.year} · Δ% · España destacada en azul` : 'Cargando…'}
          sourceUrl="https://data.worldbank.org/indicator/MS.MIL.XPND.CD"
          sourceLabel="World Bank"
          sourceTooltip="MS.MIL.XPND.CD · Military expenditure USD"
          apiUrl={`/api/sectores/defensa/waterfall?year=${CURRENT_YEAR}`}
        >
          {waterfall && <BudgetWaterfall items={waterfall.items} year={waterfall.year} prev_year={waterfall.prev_year} />}
        </Panel>

        <Panel
          title="Compliance OTAN · objetivos 2% y 5%"
          subtitle={otan ? `Año ${otan.year} · media alianza ${otan.media_otan?.toFixed(2)}% PIB · ${otan.cumplen_pct}/${otan.items.length} cumplen 2%` : 'Cargando…'}
          sourceUrl="https://www.nato.int/cps/en/natohq/topics_49198.htm"
          sourceLabel="OTAN"
          sourceTooltip="Defence Expenditure · NATO Annual Report"
          apiUrl="/api/sectores/defensa/comparativa-otan"
        >
          {otan && (
            <NatoComplianceTable
              items={otan.items}
              year={otan.year}
              media_otan={otan.media_otan}
              cumplen_pct={otan.cumplen_pct}
            />
          )}
        </Panel>
      </div>

      {/* ROW 2.5: Proyecciones presupuestarias 2026-2030 */}
      {multi && (() => {
        const serieEspana = multi.series.find(s => s.iso3 === 'ESP')
        if (!serieEspana) return null
        const proy = proyectarPresupuesto(
          serieEspana.data.map(p => ({ year: p.year, pct_pib: p.value })),
          2030,
        )
        return (
          <Panel
            title="Proyecciones presupuestarias España · 2026-2030"
            subtitle={`CAGR observado ${proy.cagr > 0 ? '+' : ''}${proy.cagr}% · ${proy.serieHistorica.length} años de histórico · 3 escenarios`}
            sourceUrl="https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS?locations=ES"
            sourceLabel="World Bank + modelo CAGR"
            sourceTooltip="Modelo: CAGR últimos 5 años · trayectorias lineales al 2% y 5%"
            apiUrl="/api/sectores/defensa/sipri-multipais"
            marginBottom
          >
            <BudgetProjectionChart proy={proy}/>
          </Panel>
        )
      })()}

      {/* ROW 3: Choropleth mapa mundial */}
      <Panel
        title="Mapa mundial de gasto militar"
        subtitle={`% PIB · año ${CURRENT_YEAR} · verde = bajo gasto, rojo = alto gasto, naranja = zona objetivo OTAN`}
        sourceUrl="https://data.worldbank.org/indicator/MS.MIL.XPND.GD.ZS"
        sourceLabel="World Bank"
        sourceTooltip="MS.MIL.XPND.GD.ZS comparativa global"
        apiUrl="/api/sectores/defensa/comparativa-otan"
        marginBottom
      >
        {choroplethItems.length > 0 && <BudgetChoropleth items={choroplethItems} />}
      </Panel>

      {loading && <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#86868b' }}>Cargando datos…</div>}
    </div>
  )
}
