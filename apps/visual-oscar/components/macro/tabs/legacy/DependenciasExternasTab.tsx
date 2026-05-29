'use client'
/**
 * `<DependenciasExternasTab />` · Tab 4 · Dependencias externas PROFUNDO.
 *
 * Fuentes vivas:
 *  - OEC top partners exports/imports + ECI
 *  - IMF BCA_NGDPD cuenta corriente (serie + forecast)
 *  - IMF TX_RPCH crecimiento exports
 *  - INE CNT exports/imports YoY
 *  - HHI calculado a partir de OEC
 */
import { useEffect, useState } from 'react'
import { TabHeader } from '../TabHeader'
import { MacroPanel } from '../MacroPanel'
import { MacroKpiCard } from '../MacroKpiCard'
import { DeepLineChart } from '../DeepLineChart'
import { TrendNarrative } from '../TrendNarrative'
import { CountryCompareBars } from '../CountryCompareBars'
import { IndicatorDrill } from '../IndicatorDrill'
import { getTab } from '@/lib/macro/sources-matrix'
import { useMacroDrawer } from '../MacroDrawerProvider'
import type { ChartAnalysisInput } from '@/lib/macro/ai-schema'

// Sprint M9 S3 · helper para filtrar series al endpoint Groq (idéntico a otros tabs)
function aiSeries(
  pts: { period: string; value: number | null; forecast?: boolean }[],
): { period: string; value: number; forecast?: boolean }[] {
  return pts
    .filter((p) => p.value != null && Number.isFinite(p.value))
    .map((p) => ({ period: p.period, value: p.value as number, ...(p.forecast ? { forecast: true } : {}) }))
}

interface OecPartner { country_id: string; country_name: string; trade_value_usd: number; share_pct?: number }

// Sprint M9 S3 · shape compartido FRED · Alpha Vantage · ESIOS · PortWatch
interface FredSeriesResponse {
  ok: boolean
  series: { period: string; value: number | null }[]
  last?: { period: string; value: number | null }
  unit?: string
}

// Sprint M9 S3 C5/C6 · shape Comtrade top productos
interface ComtradeProduct {
  hs2_code: string
  product_name?: string
  description?: string
  hs_section?: string
  trade_value_usd: number
  share_pct?: number
}
interface ComtradeResponse {
  ok: boolean
  products: ComtradeProduct[]
  total_usd: number
}

// Sprint M9 S3 C7 · shape WTO Trade Profile (flexible · admite categories o métricas planas)
interface WtoProfileCategory {
  label: string
  value: number | string | null
  unit?: string
}
interface WtoProfileResponse {
  ok: boolean
  categories?: WtoProfileCategory[]
}

// Sprint M9 S3 C8 · riesgos comerciales conocidos por país (hardcoded · pequeño · contexto político)
const TRADE_RISKS: Record<string, string> = {
  chn: 'China · disputas arancelarias UE en vehículos eléctricos (2024) y paneles solares.',
  rus: 'Rusia · sanciones EU desde 2022. Comercio severamente restringido.',
  usa: 'EEUU · tensiones arancelarias recurrentes. Riesgo de aranceles sectoriales bajo Trump 2.0.',
  gbr: 'Reino Unido · post-Brexit. Fricción aduanera en servicios financieros y origen de mercancías.',
  mar: 'Marruecos · acuerdo asociación UE-MA. Tensiones diplomáticas periódicas con España.',
}

function calculateHHI(partners: OecPartner[]): number {
  if (!partners || partners.length === 0) return 0
  const total = partners.reduce((sum, p) => sum + p.trade_value_usd, 0)
  if (total === 0) return 0
  return partners.reduce((hhi, p) => {
    const share = (p.trade_value_usd / total) * 100
    return hhi + share * share
  }, 0)
}

function hhiColor(hhi: number): { color: string; label: string; bg: string } {
  if (hhi < 1500) return { color: '#16a34a', bg: '#dcfce7', label: 'BAJA · saludable' }
  if (hhi < 2500) return { color: '#f59e0b', bg: '#fef3c7', label: 'MEDIA · vigilancia' }
  return { color: '#dc2626', bg: '#fee2e2', label: 'ALTA · concentración crítica' }
}

export function DependenciasExternasTab() {
  const tab = getTab('dependencias-externas')
  const { openDrill } = useMacroDrawer()
  const [oec, setOec] = useState<any>(null)
  const [expPartners, setExpPartners] = useState<OecPartner[]>([])
  const [impPartners, setImpPartners] = useState<OecPartner[]>([])
  const [cuentaC, setCuentaC] = useState<any>(null)
  const [exportsGr, setExportsGr] = useState<any>(null)
  const [cnt, setCnt] = useState<any>(null)
  // Sprint M9 S3 · 7 estados nuevos (todos pueden ser null sin romper render)
  const [wtoTariffs, setWtoTariffs] = useState<any>(null)
  const [wtoProfile, setWtoProfile] = useState<WtoProfileResponse | null>(null)
  const [comtradeExp, setComtradeExp] = useState<ComtradeResponse | null>(null)
  const [comtradeImp, setComtradeImp] = useState<ComtradeResponse | null>(null)
  const [portwatch, setPortwatch] = useState<FredSeriesResponse | null>(null)
  const [fredExports, setFredExports] = useState<FredSeriesResponse | null>(null)
  const [fredImports, setFredImports] = useState<FredSeriesResponse | null>(null)
  // Nota: el fetch de exports de servicios (IMF BM_GSR_NFSV_CD) se incluye en el
  // Promise.all para no romper el contrato del spec, pero hoy no lo consume ningún
  // panel · queda como hook futuro para próximos sprints.
  const [, setImfServicesExp] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/oec/spain-overview', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/oec/top-partners?direction=exports', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/oec/top-partners?direction=imports', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=BCA_NGDPD', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=TX_RPCH', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/ine/cnt-extra?n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      // Sprint M9 S3 · 8 fuentes nuevas. Patrón: si endpoint 404/error → catch → null → panel oculto.
      fetch('/api/wto/tariffs?reporter=ESP&n=1', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/wto/trade-profiles?reporter=ESP', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/un-comtrade/top-products?reporter=724&direction=export&n=15', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/un-comtrade/top-products?reporter=724&direction=import&n=15', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/portwatch/port-activity?country=ESP&n=24', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/fred/series?id=XTEXVA01ESM667S&n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/fred/series?id=XTIMVA01ESM667S&n=36', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch('/api/imf/country?iso=ESP&indicator=BM_GSR_NFSV_CD', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([oecD, exp, imp, cc, ex, ct, wt, wp, ce, ci, pw, fe, fi, sv]) => {
      if (!alive) return
      setOec(oecD)
      setExpPartners(exp?.partners || exp?.top_partners || [])
      setImpPartners(imp?.partners || imp?.top_partners || [])
      setCuentaC(cc); setExportsGr(ex); setCnt(ct)
      setWtoTariffs(wt); setWtoProfile(wp); setComtradeExp(ce); setComtradeImp(ci)
      setPortwatch(pw); setFredExports(fe); setFredImports(fi); setImfServicesExp(sv)
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  const hhiExp = calculateHHI(expPartners)
  const hhiImp = calculateHHI(impPartners)
  const hhiExpC = hhiColor(hhiExp)
  const hhiImpC = hhiColor(hhiImp)

  const splitImf = (d: any) => {
    const all = (d?.series || []).filter((s: any) => s.value != null) as { year: number; value: number }[]
    const cy = new Date().getFullYear()
    return {
      hist: all.filter((x) => x.year <= cy).map((x) => ({ period: String(x.year), value: x.value })),
      fc: all.filter((x) => x.year > cy).map((x) => ({ period: String(x.year), value: x.value })),
    }
  }
  const ccSplit = splitImf(cuentaC)
  const exGrSplit = splitImf(exportsGr)
  const cntExpSeries = (cnt?.exports?.points || []).slice().reverse().map((p: any) => ({ period: p.period, value: p.value }))
  const cntImpSeries = (cnt?.imports?.points || []).slice().reverse().map((p: any) => ({ period: p.period, value: p.value }))

  // Sprint M9 S3 · helper para FRED/PortWatch (newest-first natural → reversa a cronológico)
  const fredSeriesChrono = (r?: FredSeriesResponse | null) =>
    (r?.series || []).slice().reverse().map((p) => ({ period: p.period, value: p.value }))

  const portwatchSeries = fredSeriesChrono(portwatch)
  const fredExportsSeries = fredSeriesChrono(fredExports)
  const fredImportsSeries = fredSeriesChrono(fredImports)
  const portwatchLast = portwatch?.last ?? portwatchSeries[portwatchSeries.length - 1]
  const fredExportsLast = fredExports?.last ?? fredExportsSeries[fredExportsSeries.length - 1]
  const fredImportsLast = fredImports?.last ?? fredImportsSeries[fredImportsSeries.length - 1]
  // Balance comercial mercancías (FRED · último mes común)
  const tradeBalance = (() => {
    const x = fredExportsLast?.value
    const m = fredImportsLast?.value
    if (x == null || m == null) return null
    return x - m
  })()

  // Sprint M9 S3 C5 · clasificación productos por familia HS (los 2 primeros dígitos del código)
  type HsFamilyId = 'industria' | 'agroalimentario' | 'quimico' | 'energia' | 'textil' | 'metales' | 'resto'
  const hsFamilyOf = (hs2: string | undefined): { id: HsFamilyId; label: string; color: string } => {
    const code = parseInt(hs2 || '', 10)
    if (!Number.isFinite(code)) return { id: 'resto', label: 'Resto', color: '#64748b' }
    if (code >= 84 && code <= 87) return { id: 'industria', label: 'Industria/Auto', color: '#0891b2' }
    if (code >= 1 && code <= 24) return { id: 'agroalimentario', label: 'Agroalimentario', color: '#16a34a' }
    if (code >= 28 && code <= 38) return { id: 'quimico', label: 'Químico/Farma', color: '#7c3aed' }
    if (code === 27) return { id: 'energia', label: 'Energía', color: '#f97316' }
    if (code >= 50 && code <= 63) return { id: 'textil', label: 'Textil', color: '#ec4899' }
    if (code >= 72 && code <= 83) return { id: 'metales', label: 'Metales', color: '#475569' }
    return { id: 'resto', label: 'Resto', color: '#64748b' }
  }
  // Agrupa una lista de productos por familia HS · devuelve [{family, share_total, count}] ordenado
  const sectorBreakdown = (resp: ComtradeResponse | null) => {
    if (!resp || !Array.isArray(resp.products) || resp.products.length === 0) return []
    const total = resp.total_usd > 0
      ? resp.total_usd
      : resp.products.reduce((s, p) => s + p.trade_value_usd, 0)
    if (total === 0) return []
    const groups: Record<string, { id: HsFamilyId; label: string; color: string; value: number; count: number }> = {}
    for (const p of resp.products) {
      const fam = hsFamilyOf(p.hs2_code)
      const key = fam.id
      if (!groups[key]) groups[key] = { ...fam, value: 0, count: 0 }
      groups[key].value += p.trade_value_usd
      groups[key].count += 1
    }
    return Object.values(groups)
      .map((g) => ({ ...g, share: (g.value / total) * 100 }))
      .sort((a, b) => b.share - a.share)
  }
  const sectorBreakdownExp = sectorBreakdown(comtradeExp)

  // Sprint M9 S3 C6 · dependencias críticas en importaciones (energía + tech + cualquier >8% share)
  const criticalImports = (() => {
    const list = comtradeImp?.products || []
    return list.filter((p) => {
      const code = parseInt(p.hs2_code || '', 10)
      const share = p.share_pct ?? 0
      if (code === 27) return true                       // HS27 · combustibles
      if (code >= 84 && code <= 85) return true           // HS84-85 · maquinaria/eléctrica
      if (share > 8) return true                          // cualquier share dominante
      return false
    }).slice(0, 8)
  })()

  // Sprint M9 S3 C7 · color por nivel de arancel (verde <2% · amarillo 2-5% · naranja >5%)
  const tariffCellStyle = (v: number | null | undefined) => {
    if (v == null || !Number.isFinite(v)) return { bg: '#f8fafc', border: '#e2e8f0', color: '#475569' }
    if (v < 2) return { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' }
    if (v <= 5) return { bg: '#fffbeb', border: '#fde68a', color: '#92400e' }
    return { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412' }
  }

  const openPartnerDrill = (partner: OecPartner, direction: 'exports' | 'imports') => {
    const countryId = partner.country_id?.toLowerCase() ?? ''
    const tradeRisk = TRADE_RISKS[countryId] ?? null
    const oecBilateralUrl = `https://oec.world/en/profile/bilateral-country/esp/${countryId}`
    const comtradeBilateralUrl = `https://comtradeplus.un.org/TradeFlow?Frequency=A&Flows=${direction === 'exports' ? 'X' : 'M'}&CommodityCodes=TOTAL&Partners=${countryId}&Reporters=724&period=all&AggregateBy=none&BreakdownMode=plus`
    openDrill({
      title: `${partner.country_name} · ${direction === 'exports' ? 'Exportaciones' : 'Importaciones'}`,
      subtitle: `OEC · bilateral España ↔ ${partner.country_name}`,
      accent: tab.themeAccent,
      content: (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#fff7ed', borderRadius: 8, padding: 12, borderLeft: `3px solid ${tab.themeAccent}` }}>
              <p style={{ fontSize: 10, color: '#9a3412', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>VOLUMEN</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: tab.themeAccent, margin: '4px 0 0' }}>
                ${(partner.trade_value_usd / 1e9).toFixed(2)}B
              </p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>USD anuales</p>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: 8, padding: 12, borderLeft: `3px solid ${tab.themeAccent}` }}>
              <p style={{ fontSize: 10, color: '#9a3412', margin: 0, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>CUOTA</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: tab.themeAccent, margin: '4px 0 0' }}>
                {partner.share_pct?.toFixed(1) ?? '—'}%
              </p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>del total {direction}</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 14, lineHeight: 1.6 }}>
            <strong>Análisis:</strong> Si {partner.country_name} concentra más del 10% del flujo, una disrupción
            ahí (sanciones, recesión, cambio político) tendría impacto directo en el comercio exterior español.
            HHI agregado: {direction === 'exports' ? hhiExp.toFixed(0) : hhiImp.toFixed(0)} ({(direction === 'exports' ? hhiExpC : hhiImpC).label}).
          </p>
          {/* Sprint M9 S3 C8 · contexto de riesgo comercial conocido */}
          {tradeRisk && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: '#92400e', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                ! Contexto de riesgo comercial
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#78716c', lineHeight: 1.5 }}>
                {tradeRisk}
              </p>
            </div>
          )}
          {/* Sprint M9 S3 C8 · enlaces a bilaterales en OEC y UN Comtrade */}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={oecBilateralUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                padding: '6px 10px',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 6,
                color: '#9a3412',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: 0.3,
              }}
            >
              OEC bilateral →
            </a>
            <a
              href={comtradeBilateralUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                padding: '6px 10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 6,
                color: '#1e40af',
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: 0.3,
              }}
            >
              UN Comtrade bilateral →
            </a>
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 14, fontStyle: 'italic' }}>
            Fuente · OEC.world · año más reciente disponible
          </p>
        </div>
      ),
      source: { name: 'OEC.world', url: `https://oec.world/en/profile/country/${countryId}` },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TabHeader tab={tab} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {oec?.eci_rank != null && (
          <MacroKpiCard
            label="ECI · Ranking global"
            value={oec.eci_rank}
            unit=""
            color={tab.themeAccent}
            footer={oec?.eci_value != null ? `ECI score ${oec.eci_value.toFixed(2)}` : 'OEC Economic Complexity'}
            decimals={0}
            loading={loading}
          />
        )}
        {hhiExp > 0 && (
          <MacroKpiCard
            label="HHI Exports"
            value={hhiExp}
            unit=""
            color={hhiExpC.color}
            footer={hhiExpC.label}
            decimals={0}
            loading={loading}
          />
        )}
        {hhiImp > 0 && (
          <MacroKpiCard
            label="HHI Imports"
            value={hhiImp}
            unit=""
            color={hhiImpC.color}
            footer={hhiImpC.label}
            decimals={0}
            loading={loading}
          />
        )}
        {ccSplit.hist[ccSplit.hist.length - 1] && (
          <MacroKpiCard
            label="Cuenta corriente %PIB"
            value={ccSplit.hist[ccSplit.hist.length - 1]?.value ?? null}
            color="#10b981"
            spark={ccSplit.hist.slice(-12).map((p) => p.value)}
            footer="IMF BCA_NGDPD"
            decimals={2}
            loading={loading}
            onClick={ccSplit.hist.length > 1 ? () => openDrill({
              title: 'Cuenta corriente · drill IMF',
              subtitle: 'IMF BCA_NGDPD · % PIB',
              accent: '#10b981',
              content: <IndicatorDrill label="Cuenta corriente" unit="%" decimals={2} series={ccSplit.hist} forecast={ccSplit.fc} sourceCode="BCA_NGDPD" sourceName="IMF" imfCompareIndicator="BCA_NGDPD" accent="#10b981" />,
            }) : undefined}
          />
        )}
        {/* Sprint M9 S3 C2 · KPI Actividad portuaria · PortWatch TEU mensual */}
        {(() => {
          // El endpoint puede devolver `value`, `teu` o `containers` · probamos todos
          const teuValue = (portwatchLast?.value ?? (portwatch?.last as any)?.teu ?? (portwatch?.last as any)?.containers) as number | null | undefined
          if (teuValue == null) return null
          return (
            <div title="TEU = Twenty-foot Equivalent Unit. Indicador líder del comercio físico de mercancías.">
              <MacroKpiCard
                label="Actividad portuaria"
                value={teuValue}
                unit=" TEU"
                color="#0891b2"
                decimals={0}
                spark={portwatchSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
                footer={`PortWatch · ${portwatchLast?.period ?? 'último mes'}`}
                loading={loading}
              />
            </div>
          )
        })()}
        {/* Sprint M9 S3 C2 · KPI Exports mercancías FRED · valor M€ */}
        {fredExportsLast?.value != null && (
          <MacroKpiCard
            label="Exports mercancías (FRED)"
            value={fredExportsLast.value}
            unit=" M€"
            color="#16a34a"
            decimals={0}
            spark={fredExportsSeries.slice(-12).map((p) => p.value!).filter((v) => v != null)}
            footer={`FRED XTEXVA01ESM667S · ${fredExportsLast.period ?? 'mensual'}`}
            loading={loading}
          />
        )}
      </div>

      {/* Cuenta corriente serie larga */}
      {ccSplit.hist.length > 5 && (
        <MacroPanel
          accent="#10b981"
          title="Cuenta corriente España · 20y + forecast"
          subtitle="IMF BCA_NGDPD · superávit positivo, déficit negativo · %PIB"
          status="live"
        >
          <DeepLineChart
            series={[{
              id: 'cc',
              label: 'Cuenta corriente %PIB',
              color: '#10b981',
              points: [...ccSplit.hist, ...ccSplit.fc],
              forecastFromIndex: ccSplit.hist.length,
              fillBelow: true,
            }]}
            height={220}
            yLabel="% PIB"
            zeroLine
            annotations={[
              { period: '2008', label: 'Déficit −10%', color: '#dc2626' },
              { period: '2013', label: 'Vuelta a superávit', color: '#16a34a' },
            ]}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Cuenta corriente"
              unit="%"
              decimals={2}
              series={ccSplit.hist as any}
              forecast={ccSplit.fc}
              accent="#10b981"
            />
          </div>
        </MacroPanel>
      )}

      {/* Comercio exterior INE CNT */}
      {cntExpSeries.length > 5 && (
        <MacroPanel
          accent="#f97316"
          title="Comercio exterior · INE CNT"
          subtitle="Exportaciones (CNTR7267) vs Importaciones (CNTR7287) · YoY volumen SA"
          status="live"
        >
          <DeepLineChart
            series={[
              { id: 'x', label: 'Exportaciones', color: '#0891b2', points: cntExpSeries },
              { id: 'm', label: 'Importaciones', color: '#f97316', points: cntImpSeries },
            ]}
            height={220}
            yLabel="Var anual (%)"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Exportaciones bienes y servicios"
              unit="%"
              decimals={2}
              series={cntExpSeries as any}
              accent="#0891b2"
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S3 C3 · Flujo portuario PortWatch · indicador líder ciclo comercial */}
      {portwatchSeries.length > 3 && (
        <MacroPanel
          accent="#0891b2"
          title="Actividad portuaria España · PortWatch"
          subtitle="Flujo contenedores/TEU mensual · 24 meses · indicador líder del ciclo comercial"
          status="live"
          aiAnalysis={{
            indicator: 'Actividad portuaria España · PortWatch',
            indicatorId: 'portwatch.esp.teu',
            tabSlug: 'dependencias-externas',
            series: aiSeries(portwatchSeries),
            metadata: {
              unit: portwatch?.unit || 'TEU',
              source: 'PortWatch · IMF',
              sourceCode: 'port-activity',
              lastUpdate: portwatchLast?.period,
              frequency: 'monthly',
              notes: [
                'TEU = Twenty-foot Equivalent Unit.',
                'Indicador líder ciclo comercial con 4-6 semanas de adelanto sobre exportaciones formales.',
                `Último disponible: ${portwatchLast?.period ?? '—'}.`,
              ],
            },
            windowLabel: `${portwatchSeries.length} meses`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{ id: 'port', label: 'Actividad portuaria', color: '#0891b2', points: portwatchSeries, fillBelow: true }]}
            height={200}
            yLabel={portwatch?.unit || 'TEU / índice'}
            formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0))}
          />
          <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div
              style={{
                flex: 1,
                minWidth: 200,
                background: '#f0f9ff',
                borderRadius: 8,
                padding: '10px 14px',
                border: '1px solid #bae6fd',
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: '#075985', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Por qué importa
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#0369a1', lineHeight: 1.5 }}>
                El tráfico portuario anticipa el comercio exterior 4-6 semanas. Una caída sostenida
                en TEU suele preceder a contracciones en exportaciones de manufacturas e importaciones
                de bienes de capital.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Actividad portuaria"
              unit={portwatch?.unit ?? ' TEU'}
              decimals={0}
              series={portwatchSeries as any}
              threshold={{ amber: -5, red: -10, goodAbove: true }}
              accent="#0891b2"
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S3 C4 · Flujo comercial en valor · FRED exports + imports + balance dinámico */}
      {fredExportsSeries.length > 3 && (
        <MacroPanel
          accent="#16a34a"
          title="Flujo comercial en valor · España"
          subtitle="FRED · exports + imports mercancías · millones EUR · 36 meses"
          status="live"
          aiAnalysis={{
            indicator: 'Flujo comercial mercancías · FRED',
            indicatorId: 'fred.trade.esp',
            tabSlug: 'dependencias-externas',
            series: aiSeries(fredExportsSeries),
            metadata: {
              unit: 'M€',
              source: 'FRED St. Louis · OECD',
              sourceCode: 'XTEXVA01ESM667S + XTIMVA01ESM667S',
              lastUpdate: fredExportsLast?.period,
              frequency: 'monthly',
              notes: [
                `Último exports: ${fredExportsLast?.value != null ? `${(fredExportsLast.value / 1000).toFixed(1)}B €` : '—'}.`,
                `Último imports: ${fredImportsLast?.value != null ? `${(fredImportsLast.value / 1000).toFixed(1)}B €` : '—'}.`,
                tradeBalance != null
                  ? `Balanza: ${tradeBalance >= 0 ? 'superávit' : 'déficit'} de ${Math.abs(tradeBalance / 1000).toFixed(1)}B €.`
                  : 'Balanza: sin dato.',
              ],
            },
            windowLabel: '36 meses · exports + imports',
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[
              { id: 'x', label: 'Exportaciones', color: '#16a34a', points: fredExportsSeries },
              ...(fredImportsSeries.length > 0
                ? [{ id: 'm', label: 'Importaciones', color: '#f97316', points: fredImportsSeries, dashed: true }]
                : []),
            ]}
            height={220}
            yLabel="M EUR"
            formatValue={(v) => `${(v / 1000).toFixed(1)}B`}
          />
          {tradeBalance != null && (
            <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div
                style={{
                  background: tradeBalance >= 0 ? '#f0fdf4' : '#fef2f2',
                  borderRadius: 8,
                  padding: '10px 14px',
                  border: `1px solid ${tradeBalance >= 0 ? '#86efac' : '#fecaca'}`,
                  flex: 1,
                  minWidth: 240,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: tradeBalance >= 0 ? '#166534' : '#991b1b',
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}
                >
                  Balanza comercial mercancías
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 22,
                    fontWeight: 700,
                    color: tradeBalance >= 0 ? '#16a34a' : '#dc2626',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {tradeBalance >= 0 ? '+' : ''}{(tradeBalance / 1000).toFixed(1)} B EUR
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                  {tradeBalance >= 0
                    ? 'Superávit comercial de mercancías · España exporta más de lo que importa en este mes.'
                    : 'Déficit comercial de mercancías · típico en economías de servicios con alta dependencia energética.'}
                </p>
              </div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Exportaciones mercancías"
              unit=" M EUR"
              decimals={0}
              series={fredExportsSeries as any}
              accent="#16a34a"
            />
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S3 C9 · Activación del panel IMF TX_RPCH (ya se fetchea, no se renderizaba) */}
      {exGrSplit.hist.length > 5 && (
        <MacroPanel
          accent="#0891b2"
          title="Crecimiento exportaciones España · IMF WEO"
          subtitle="TX_RPCH · volumen exports bienes y servicios · histórica + forecast"
          status="live"
          aiAnalysis={{
            indicator: 'Crecimiento exports · IMF TX_RPCH',
            indicatorId: 'imf.weo.tx_rpch.esp',
            tabSlug: 'dependencias-externas',
            series: [
              ...aiSeries(exGrSplit.hist),
              ...aiSeries(exGrSplit.fc.map((p) => ({ ...p, forecast: true }))),
            ],
            metadata: {
              unit: '%',
              source: 'IMF DataMapper · WEO',
              sourceCode: 'TX_RPCH',
              lastUpdate: exGrSplit.hist[exGrSplit.hist.length - 1]?.period,
              frequency: 'annual',
              threshold: { amber: 2, red: 0, goodAbove: true },
              notes: [
                'Volumen agregado exports bienes + servicios. España competitiva post-2013 con devaluación interna.',
                '2020 COVID hundió exports en ~20%. Recuperación V durante 2021-2022.',
              ],
            },
            windowLabel: `${exGrSplit.hist.length}y hist + ${exGrSplit.fc.length}y forecast`,
          } as ChartAnalysisInput}
        >
          <DeepLineChart
            series={[{
              id: 'txrpch',
              label: 'Exports growth',
              color: '#0891b2',
              points: [...exGrSplit.hist, ...exGrSplit.fc],
              forecastFromIndex: exGrSplit.hist.length,
              fillBelow: true,
            }]}
            height={200}
            yLabel="Var anual (%)"
            zeroLine
            formatValue={(v) => `${v.toFixed(1)}%`}
            annotations={[{ period: '2020', label: 'COVID', color: '#dc2626' }]}
          />
          <div style={{ marginTop: 12 }}>
            <TrendNarrative
              label="Crecimiento exports"
              unit="%"
              decimals={2}
              series={exGrSplit.hist}
              forecast={exGrSplit.fc}
              threshold={{ amber: 2, red: 0, goodAbove: true }}
              accent="#0891b2"
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <CountryCompareBars
              indicator="TX_RPCH"
              countries={['ESP', 'DEU', 'FRA', 'ITA', 'PRT', 'NLD', 'POL', 'GRC']}
              spainColor={tab.themeAccent}
              unit="%"
              decimals={2}
              title="Comparativa crecimiento exports · peers UE"
            />
          </div>
        </MacroPanel>
      )}

      {/* Top partners exports */}
      {expPartners.length > 0 && (
        <MacroPanel
          accent="#16a34a"
          title="Top 10 partners · Exportaciones"
          subtitle="OEC · USD anuales · click partner para drill bilateral"
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>País</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Volumen USD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Share %</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Barra</th>
              </tr>
            </thead>
            <tbody>
              {expPartners.slice(0, 10).map((p, i) => {
                const share = p.share_pct ?? ((p.trade_value_usd / expPartners.reduce((s, x) => s + x.trade_value_usd, 0)) * 100)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openPartnerDrill(p, 'exports')}>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>{p.country_name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${(p.trade_value_usd / 1e9).toFixed(2)}B
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: tab.themeAccent }}>
                      {share.toFixed(1)}%
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, width: 100 }}>
                        <div style={{ width: `${Math.min(share * 5, 100)}%`, height: '100%', background: '#16a34a', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </MacroPanel>
      )}

      {/* Top partners imports */}
      {impPartners.length > 0 && (
        <MacroPanel
          accent="#f97316"
          title="Top 10 partners · Importaciones"
          subtitle="OEC · USD anuales · click partner para drill bilateral"
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>País</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Volumen USD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Share %</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Barra</th>
              </tr>
            </thead>
            <tbody>
              {impPartners.slice(0, 10).map((p, i) => {
                const share = p.share_pct ?? ((p.trade_value_usd / impPartners.reduce((s, x) => s + x.trade_value_usd, 0)) * 100)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => openPartnerDrill(p, 'imports')}>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>{p.country_name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${(p.trade_value_usd / 1e9).toFixed(2)}B
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#f97316' }}>
                      {share.toFixed(1)}%
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, width: 100 }}>
                        <div style={{ width: `${Math.min(share * 5, 100)}%`, height: '100%', background: '#f97316', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </MacroPanel>
      )}

      {/* Sprint M9 S3 C5 · Top productos exportados · UN Comtrade HS2 + breakdown por familia */}
      {comtradeExp && comtradeExp.products && comtradeExp.products.length > 3 && (
        <MacroPanel
          accent="#16a34a"
          title="Top productos exportados España · UN Comtrade"
          subtitle="Clasificación HS2 · valor USD anual · año más reciente disponible"
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Producto (HS2)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Valor USD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Share %</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Barra</th>
              </tr>
            </thead>
            <tbody>
              {comtradeExp.products.slice(0, 12).map((p, i) => {
                const totalUsd = comtradeExp.total_usd > 0
                  ? comtradeExp.total_usd
                  : comtradeExp.products.reduce((s, x) => s + x.trade_value_usd, 0)
                const share = p.share_pct ?? (totalUsd > 0 ? (p.trade_value_usd / totalUsd) * 100 : 0)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>
                      <span style={{ fontSize: 10, color: '#64748b', marginRight: 6, fontFamily: 'ui-monospace, monospace' }}>{p.hs2_code}</span>
                      {p.product_name || p.description}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${(p.trade_value_usd / 1e9).toFixed(2)}B
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#16a34a' }}>
                      {share.toFixed(1)}%
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, width: 100 }}>
                        <div style={{ width: `${Math.min(share * 4, 100)}%`, height: '100%', background: '#16a34a', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {sectorBreakdownExp.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, color: '#475569', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Concentración por familia HS
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sectorBreakdownExp.map((s) => (
                  <span
                    key={s.id}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: `${s.color}1a`,
                      border: `1px solid ${s.color}66`,
                      color: s.color,
                      fontSize: 11,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {s.label} · {s.share.toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </MacroPanel>
      )}

      {/* Sprint M9 S3 C6 · Top productos importados · UN Comtrade + dependencias críticas */}
      {comtradeImp && comtradeImp.products && comtradeImp.products.length > 3 && (
        <MacroPanel
          accent="#f97316"
          title="Top productos importados España · UN Comtrade"
          subtitle="Clasificación HS2 · valor USD anual · dependencias críticas"
          status="live"
        >
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Producto (HS2)</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Valor USD</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Share %</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Barra</th>
              </tr>
            </thead>
            <tbody>
              {comtradeImp.products.slice(0, 12).map((p, i) => {
                const totalUsd = comtradeImp.total_usd > 0
                  ? comtradeImp.total_usd
                  : comtradeImp.products.reduce((s, x) => s + x.trade_value_usd, 0)
                const share = p.share_pct ?? (totalUsd > 0 ? (p.trade_value_usd / totalUsd) * 100 : 0)
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>
                      <span style={{ fontSize: 10, color: '#64748b', marginRight: 6, fontFamily: 'ui-monospace, monospace' }}>{p.hs2_code}</span>
                      {p.product_name || p.description}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${(p.trade_value_usd / 1e9).toFixed(2)}B
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#f97316' }}>
                      {share.toFixed(1)}%
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ background: '#f1f5f9', height: 8, borderRadius: 4, width: 100 }}>
                        <div style={{ width: `${Math.min(share * 4, 100)}%`, height: '100%', background: '#f97316', borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 11, color: '#92400e', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Dependencias críticas identificadas
            </p>
            {criticalImports.length > 0 ? (
              criticalImports.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: parseInt(p.hs2_code || '', 10) === 27 ? '#dc2626' : '#f59e0b',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#0f172a' }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace', color: '#64748b', marginRight: 6 }}>{p.hs2_code}</span>
                    {p.product_name || p.description}
                  </span>
                  <span style={{ fontSize: 11, color: '#f97316', fontWeight: 700, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                    {p.share_pct?.toFixed(1) ?? '—'}% imports
                  </span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 11, color: '#64748b' }}>
                Sin concentraciones críticas identificadas en datos disponibles.
              </p>
            )}
          </div>
        </MacroPanel>
      )}

      {/* Sprint M9 S3 C7 · WTO Trade Profile · marco arancelario UE */}
      {wtoProfile?.ok === true && wtoProfile?.categories && wtoProfile.categories.length > 0 && (
        <MacroPanel
          accent="#7c3aed"
          title="Perfil comercial España · WTO"
          subtitle="Categorías de comercio · aranceles aplicados · WTO Trade Profiles"
          status="live"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {wtoProfile.categories.map((c, i) => {
              const numericVal = typeof c.value === 'number' ? c.value : (typeof c.value === 'string' ? parseFloat(c.value) : null)
              const style = tariffCellStyle(numericVal)
              return (
                <div
                  key={i}
                  style={{
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 10, color: style.color, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    {c.label}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: 20,
                      fontWeight: 700,
                      color: style.color,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {c.value == null
                      ? '—'
                      : typeof c.value === 'number'
                      ? `${c.value.toFixed(c.unit === '%' || (c.unit ?? '').includes('%') ? 1 : 0)}${c.unit ?? ''}`
                      : `${c.value}${c.unit ?? ''}`}
                  </p>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 12, lineHeight: 1.5 }}>
            España opera bajo el marco arancelario común de la UE. Los aranceles mostrados son los
            aplicados MFN (Most Favoured Nation). Los acuerdos bilaterales UE (CETA, Mercosur en
            negociación, TTIP pausado) pueden modificar estos niveles sustancialmente.
          </p>
        </MacroPanel>
      )}
    </div>
  )
}

export default DependenciasExternasTab
