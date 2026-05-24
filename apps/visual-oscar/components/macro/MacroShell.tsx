'use client'
/**
 * `<MacroShell />` · Layout wrapper de /macro.
 *
 * Sprint N5 (2026-05-23): hero superior DINÁMICO por subtab.
 *  - Antes: termómetro circular fijo (84/100) + 4 KPIs estáticos de fixture.
 *    No cambiaba al navegar entre tabs · el usuario solo veía un score global
 *    independiente del subtab activo.
 *  - Ahora: fetch del overview del subtab activo, score real calculado por
 *    `computePulsoTermometro`, 4 KPIs específicos del subtab desde el catálogo,
 *    y barra horizontal segmentada (rojo/amber/verde) reemplazando al
 *    termómetro circular (el usuario lo pidió explícitamente).
 *
 * Wraps con MacroDrawerProvider para que cualquier tab pueda abrir drawer.
 */
import { ReactNode, useEffect, useState, useMemo } from 'react'
import { MacroDrawerProvider } from './MacroDrawerProvider'
import { MacroDrawer } from './MacroDrawer'
import { TabsNav } from './TabsNav'
import { BriefingButton } from './BriefingButton'
import { getSubtab } from '@/lib/macro/subtab-registry'
import type { MacroTabId } from '@/lib/macro/sources-matrix'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface OverviewResp {
  ok: boolean
  termometro: { score: number }
  coverage: { total: number; live: number; stale: number; missing: number }
  byId: Record<string, PulsoFetchResult>
}

interface MacroShellProps {
  activeId: MacroTabId
  onTabChange: (id: MacroTabId) => void
  children: ReactNode
}

/** Mapping subtab → 4 indicadores clave del catálogo para el hero compacto */
const HERO_KPIS_BY_SUBTAB: Record<string, { id: string; label: string; unit: string; goodHigh?: boolean; amber?: number; red?: number }[]> = {
  'pulso-macro': [
    { id: 'pib-yoy', label: 'PIB YoY', unit: '%', goodHigh: true, amber: 0.5, red: -1 },
    { id: 'paro-epa-general', label: 'Paro EPA', unit: '%', goodHigh: false, amber: 12, red: 18 },
    { id: 'ipc-anual', label: 'IPC', unit: '%', goodHigh: false, amber: 2, red: 4 },
    { id: 'cuenta-corriente', label: 'CC %PIB', unit: '%', goodHigh: true, amber: -2, red: -4 },
  ],
  'regimen-monetario': [
    { id: 'rm-hicp-eurostat', label: 'HICP', unit: '%', goodHigh: false, amber: 2, red: 4 },
    { id: 'rm-tipos-largo-eurostat', label: '10Y yield', unit: '%', goodHigh: false, amber: 3.5, red: 5 },
    { id: 'rm-confianza-consumidor-eurostat', label: 'Conf. cons.', unit: '' },
    { id: 'rm-reer-bis', label: 'REER', unit: '', goodHigh: false, amber: 105, red: 115 },
  ],
  'margen-fiscal': [
    { id: 'mf-deuda-imf', label: 'Deuda %PIB', unit: '%', goodHigh: false, amber: 90, red: 110 },
    { id: 'mf-saldo-total', label: 'Saldo total', unit: '%', goodHigh: true, amber: -3, red: -6 },
    { id: 'mf-saldo-primario', label: 'Saldo primario', unit: '%', goodHigh: true, amber: 0, red: -2 },
    { id: 'mf-id-publico', label: 'I+D público', unit: '%', goodHigh: true, amber: 0.7, red: 0.5 },
  ],
  'dependencias-externas': [
    { id: 'de-apertura-exports', label: 'X %PIB', unit: '%', goodHigh: true, amber: 35, red: 30 },
    { id: 'de-turistas-anual', label: 'Turistas', unit: 'M' },
    { id: 'de-energia-dependence', label: 'Dep. energía', unit: '%', goodHigh: false, amber: 60, red: 75 },
    { id: 'de-reer-narrow', label: 'REER narrow', unit: '', goodHigh: false, amber: 105, red: 115 },
  ],
  'riesgo-sistemico': [
    { id: 'rs-yield-10y-es', label: '10Y ES', unit: '%', goodHigh: false, amber: 3.5, red: 5 },
    { id: 'rs-yield-10y-it', label: '10Y IT', unit: '%', goodHigh: false, amber: 4, red: 6 },
    { id: 'rs-hpi-es', label: 'HPI YoY', unit: '%', goodHigh: false, amber: 7, red: 12 },
    { id: 'rs-credito-pib-es', label: 'Crédito YoY', unit: '%', goodHigh: true, amber: 2, red: 0 },
  ],
  'mercados-activos': [
    { id: 'ma-yield-10y-es', label: '10Y ES', unit: '%', goodHigh: false, amber: 3.5, red: 5 },
    { id: 'ma-yield-10y-de', label: '10Y DE', unit: '%' },
    { id: 'ma-eurusd', label: 'EUR/USD', unit: '' },
    { id: 'ma-reer-bis', label: 'REER', unit: '', goodHigh: false, amber: 105, red: 115 },
  ],
  'flujos-capital': [
    { id: 'fc-iip-neta', label: 'IIP neta', unit: '%', goodHigh: true, amber: -50, red: -80 },
    { id: 'fc-ied-inbound', label: 'IED in', unit: '%', goodHigh: true, amber: 1, red: 0 },
    { id: 'fc-portfolio-net', label: 'Portfolio', unit: '%' },
    { id: 'fc-cuenta-financiera', label: 'Cta. financ.', unit: '%' },
  ],
  'productividad-competitividad': [
    { id: 'pc-productividad-hora', label: 'Prod/hora', unit: '', goodHigh: true, amber: 100, red: 90 },
    { id: 'pc-ulc', label: 'ULC YoY', unit: '%', goodHigh: false, amber: 2, red: 4 },
    { id: 'pc-id-empresarial', label: 'BERD %PIB', unit: '%', goodHigh: true, amber: 1.2, red: 0.8 },
    { id: 'pc-patentes-epo-eurostat', label: 'Patentes', unit: '/Mh', goodHigh: true, amber: 40, red: 25 },
  ],
  'empresas-beneficios': [
    { id: 'eb-prod-industrial', label: 'IPI YoY', unit: '%', goodHigh: true, amber: 0, red: -3 },
    { id: 'eb-volumen-negocios', label: 'Negocios YoY', unit: '%' },
    { id: 'eb-confianza-empresarial-eurostat', label: 'Conf. ind.', unit: '', goodHigh: true, amber: -5, red: -15 },
    { id: 'eb-confianza-servicios', label: 'Conf. serv.', unit: '', goodHigh: true, amber: -5, red: -15 },
  ],
  'hogares-empleo-vivienda': [
    { id: 'hev-paro-epa-general', label: 'Paro EPA', unit: '%', goodHigh: false, amber: 12, red: 18 },
    { id: 'hev-etcl-coste-laboral', label: 'Coste lab.', unit: '€' },
    { id: 'hev-ipv-general', label: 'IPV', unit: '%', goodHigh: false, amber: 5, red: 10 },
    { id: 'hev-ipc-anual', label: 'IPC', unit: '%', goodHigh: false, amber: 2, red: 4 },
  ],
  'demografia-territorio': [
    { id: 'dt-paro-epa-jovenes', label: 'Paro <25', unit: '%', goodHigh: false, amber: 25, red: 35 },
    { id: 'dt-esperanza-vida', label: 'EV nacer', unit: 'a', goodHigh: true },
    { id: 'dt-ratio-dependencia', label: 'Dep. vejez', unit: '%', goodHigh: false, amber: 30, red: 40 },
    { id: 'dt-fertilidad-eurostat', label: 'Fertilidad', unit: 'h/m', goodHigh: true, amber: 1.5, red: 1.2 },
  ],
  'sociedad-bienestar': [
    { id: 'sb-arope-eurostat', label: 'AROPE', unit: '%', goodHigh: false, amber: 22, red: 28 },
    { id: 'sb-pobreza-monetaria', label: 'Pobreza', unit: '%', goodHigh: false, amber: 18, red: 22 },
    { id: 'sb-s80-s20', label: 'S80/S20', unit: '', goodHigh: false, amber: 5.5, red: 6.5 },
    { id: 'sb-abandono-escolar', label: 'Abandono', unit: '%', goodHigh: false, amber: 10, red: 14 },
  ],
  'medio-rural': [
    { id: 'mr-empleo-agrario', label: 'Empleo agro', unit: '%', goodHigh: true, amber: 3.5, red: 3 },
    { id: 'mr-vab-agrario-pib', label: 'VAB agro', unit: '%', goodHigh: true },
    { id: 'mr-arrendamientos-agrarios', label: 'PPRI agro', unit: '%' },
    { id: 'mr-aei-eurostat', label: 'Renta agro', unit: '' },
  ],
  'cultura-ocio': [
    { id: 'co-empleo-hosteleria', label: 'Empleo HORECA', unit: '' },
    { id: 'co-tourism-services-export', label: 'Turismo X', unit: '%', goodHigh: true, amber: 4, red: 3 },
    { id: 'co-frontur', label: 'Turistas', unit: '' },
    { id: 'co-tourism-nights-eurostat', label: 'Pernoct.', unit: '' },
  ],
  'instituciones-estado': [
    { id: 'ie-gasto-aapp', label: 'Gasto AAPP', unit: '%' },
    { id: 'ie-ingresos-aapp', label: 'Ingresos', unit: '%' },
    { id: 'ie-intereses-pib', label: 'Intereses', unit: '%', goodHigh: false, amber: 2.5, red: 4 },
    { id: 'ie-inversion-publica-eurostat', label: 'Inv. pub.', unit: '%', goodHigh: true, amber: 3, red: 2 },
  ],
}

function colorForKpi(v: number | null, goodHigh: boolean | undefined, amber: number | undefined, red: number | undefined): string {
  if (v == null) return 'rgba(255,255,255,0.85)'
  if (goodHigh === undefined || amber === undefined || red === undefined) return 'rgba(255,255,255,0.85)'
  if (goodHigh) {
    if (v < red) return '#FCA5A5'
    if (v < amber) return '#FCD34D'
    return '#86EFAC'
  }
  if (v > red) return '#FCA5A5'
  if (v > amber) return '#FCD34D'
  return '#86EFAC'
}

function fmt(v: number | null, unit: string): string {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1000) return v.toLocaleString('es-ES', { maximumFractionDigits: 0 })
  return v.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}

/**
 * Sparkline mini SVG · 70x18 sobre fondo oscuro del hero.
 * Sprint N7.1 · cada KPI flash muestra trend visual de las últimas 24 observaciones.
 */
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span style={{ display: 'inline-block', width: 70, height: 18 }} />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 70
  const h = 18
  const stepX = w / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / range) * (h - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block', opacity: 0.85 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
      {/* Último punto destacado */}
      <circle cx={(values.length - 1) * stepX} cy={h - ((values[values.length - 1] - min) / range) * (h - 2) - 1} r={1.8} fill={color} />
    </svg>
  )
}

/**
 * Barra horizontal segmentada (rojo 0-30 · amber 30-60 · verde 60-100).
 * Reemplaza el termómetro circular antiguo. Pedido explícito del usuario en N5.
 */
function PressureBar({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, score))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {Math.round(safeScore)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>/ 100</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: 0.7, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
          Score
        </span>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #ef4444 0%, #ef4444 30%, #f59e0b 30%, #f59e0b 60%, #16a34a 60%, #16a34a 100%)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -3, left: `calc(${safeScore}% - 6px)`, width: 12, height: 14, background: '#fff', borderRadius: 2, boxShadow: '0 0 0 2px rgba(0,0,0,0.4)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
        <span>Crítico</span>
        <span>Estable</span>
        <span>Fuerte</span>
      </div>
    </div>
  )
}

export function MacroShell({ activeId, onTabChange, children }: MacroShellProps) {
  const config = getSubtab(activeId)
  const [overview, setOverview] = useState<OverviewResp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setOverview(null)
    fetch(`/api/macro/${activeId}/overview`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setOverview(j as OverviewResp) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activeId])

  const kpiSpecs = HERO_KPIS_BY_SUBTAB[activeId] || []
  const flashKpis = useMemo(() => kpiSpecs.map((spec) => {
    const result = overview?.byId?.[spec.id]
    const last = result?.last
    const series = result?.series || []
    // Calcular YoY: heurística por frecuencia (monthly=12, quarterly=4, annual=1)
    // Inferida del frecuencia del catálogo via heuristic sobre periodicidad de la serie.
    const validPoints = series.filter((p) => p.value != null)
    let yoy: number | null = null
    if (validPoints.length >= 2 && last?.value != null) {
      // detect frequency by counting points per year (~12 → monthly, ~4 → quarterly)
      const lastPeriod = String(last.period || '')
      const firstPeriod = String(validPoints[0]?.period || '')
      const yearsSpan = validPoints.length / 12 // crude proxy
      const lag = lastPeriod.includes('M') || lastPeriod.length === 7 ? 12 : (yearsSpan > 4 ? 4 : 1)
      const yoyIdx = validPoints.length - 1 - lag
      void firstPeriod
      if (yoyIdx >= 0) {
        const yoyPoint = validPoints[yoyIdx]
        if (yoyPoint?.value != null && yoyPoint.value !== 0) {
          yoy = ((last.value - yoyPoint.value) / Math.abs(yoyPoint.value)) * 100
        }
      }
    }
    return {
      label: spec.label,
      value: fmt(last?.value ?? null, spec.unit),
      unit: spec.unit,
      period: last?.period || null,
      color: colorForKpi(last?.value ?? null, spec.goodHigh, spec.amber, spec.red),
      series: validPoints.slice(-24).map((p) => p.value as number),
      yoy,
    }
  }), [kpiSpecs, overview])

  const score = overview?.termometro?.score ?? 50
  const coverage = overview?.coverage
  const tabLabel = config?.label || activeId

  return (
    <MacroDrawerProvider>
      {/* Hero compacto · dinámico por subtab */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0E2A1F 0%, #052016 100%)',
          color: '#fff',
          padding: '14px 24px',
          marginBottom: 0,
          borderRadius: 12,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 22,
          alignItems: 'center',
          minHeight: 96,
        }}
      >
        {/* Barra de presión + label de subtab */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: 'rgba(255,255,255,0.55)', margin: '0 0 6px', textTransform: 'uppercase' }}>
            {tabLabel}
          </p>
          <PressureBar score={score} />
          {coverage && (
            <p style={{ margin: '6px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
              {coverage.live}/{coverage.total} series live · {coverage.stale} stale · {coverage.missing} sin dato
            </p>
          )}
        </div>

        {/* 4 KPIs específicos del subtab activo */}
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
          {flashKpis.length === 0 && !loading && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Sin KPIs configurados para {activeId}</p>
          )}
          {flashKpis.map((kpi) => {
            const yoyColor = kpi.yoy == null
              ? 'rgba(255,255,255,0.4)'
              : kpi.yoy > 0
              ? '#86EFAC'
              : kpi.yoy < 0
              ? '#FCA5A5'
              : 'rgba(255,255,255,0.6)'
            return (
              <div key={kpi.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
                <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.6, color: 'rgba(255,255,255,0.55)', margin: 0, textTransform: 'uppercase' }}>
                  {kpi.label}
                </p>
                <p style={{ fontSize: 20, fontWeight: 700, color: kpi.color, margin: '3px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {kpi.value}
                  {kpi.unit && kpi.value !== '—' && <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2, opacity: 0.7 }}>{kpi.unit}</span>}
                </p>
                {/* Sparkline + variación YoY · Sprint N7.1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <MiniSparkline values={kpi.series} color={kpi.color} />
                  {kpi.yoy != null && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: yoyColor, fontVariantNumeric: 'tabular-nums' as const }}>
                      {kpi.yoy > 0 ? '+' : ''}{kpi.yoy.toFixed(1)}%
                    </span>
                  )}
                </div>
                {kpi.period && (
                  <p style={{ margin: '2px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                    {kpi.period}{kpi.yoy != null && <span style={{ opacity: 0.7 }}> · YoY</span>}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <BriefingButton activeId={activeId} />
      </section>

      <TabsNav activeId={activeId} onChange={onTabChange} />

      <main>{children}</main>

      <MacroDrawer />
    </MacroDrawerProvider>
  )
}

export default MacroShell
