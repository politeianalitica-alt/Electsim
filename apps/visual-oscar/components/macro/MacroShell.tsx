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
    { id: 'de-cuenta-corriente', label: 'CC %PIB', unit: '%', goodHigh: true, amber: -2, red: -4 },
    { id: 'de-exports-yoy-imf', label: 'Exports YoY', unit: '%', goodHigh: true, amber: 2, red: 0 },
    { id: 'de-iip-eurostat', label: 'IIP %PIB', unit: '%', goodHigh: true, amber: -50, red: -80 },
    { id: 'de-yield-10y', label: '10Y yield', unit: '%', goodHigh: false, amber: 3.5, red: 5 },
  ],
  'riesgo-sistemico': [
    { id: 'rs-yield-10y', label: '10Y yield', unit: '%', goodHigh: false, amber: 3.5, red: 5 },
    { id: 'rs-spread-bund', label: 'Spread Bund', unit: 'pb', goodHigh: false, amber: 80, red: 150 },
    { id: 'rs-vix', label: 'VIX', unit: '', goodHigh: false, amber: 20, red: 30 },
    { id: 'rs-cds-spain', label: 'CDS 5Y', unit: 'pb', goodHigh: false, amber: 60, red: 120 },
  ],
  'mercados-activos': [
    { id: 'ma-ibex35', label: 'IBEX 35', unit: '' },
    { id: 'ma-eurusd', label: 'EUR/USD', unit: '' },
    { id: 'ma-10y-yield', label: '10Y yield', unit: '%', goodHigh: false, amber: 3.5, red: 5 },
    { id: 'ma-brent', label: 'Brent', unit: '$' },
  ],
  'flujos-capital': [
    { id: 'fc-iip-eurostat', label: 'IIP %PIB', unit: '%', goodHigh: true, amber: -50, red: -80 },
    { id: 'fc-ied-inbound', label: 'IED in', unit: '%', goodHigh: true, amber: 1, red: 0 },
    { id: 'fc-cta-financiera', label: 'Cta. financ.', unit: '%' },
    { id: 'fc-yield-10y', label: '10Y yield', unit: '%', goodHigh: false, amber: 3.5, red: 5 },
  ],
  'productividad-competitividad': [
    { id: 'pc-pib-ocupado', label: 'PIB/ocup.', unit: '', goodHigh: true },
    { id: 'pc-ulc', label: 'ULC', unit: '%', goodHigh: false, amber: 3, red: 5 },
    { id: 'pc-id-pib', label: 'I+D %PIB', unit: '%', goodHigh: true, amber: 1.4, red: 1.0 },
    { id: 'pc-patentes-epo', label: 'Patentes', unit: '', goodHigh: true },
  ],
  'empresas-beneficios': [
    { id: 'eb-ibex35', label: 'IBEX 35', unit: '' },
    { id: 'eb-conf-industrial', label: 'Conf. ind.', unit: '' },
    { id: 'eb-dirce-stock', label: 'Stock empr.', unit: '' },
    { id: 'eb-renta-agraria', label: 'Renta agro', unit: '%' },
  ],
  'hogares-empleo-vivienda': [
    { id: 'hev-paro-epa-general', label: 'Paro EPA', unit: '%', goodHigh: false, amber: 12, red: 18 },
    { id: 'hev-etcl-coste-laboral', label: 'Coste lab.', unit: '€' },
    { id: 'hev-ipv-general', label: 'IPV', unit: '%', goodHigh: false, amber: 5, red: 10 },
    { id: 'hev-ipc-anual', label: 'IPC', unit: '%', goodHigh: false, amber: 2, red: 4 },
  ],
  'demografia-territorio': [
    { id: 'dt-poblacion-total', label: 'Población', unit: '' },
    { id: 'dt-saldo-migratorio', label: 'Saldo migr.', unit: '' },
    { id: 'dt-tasa-natalidad', label: 'Natalidad', unit: '‰' },
    { id: 'dt-edad-mediana', label: 'Edad med.', unit: 'a' },
  ],
  'sociedad-bienestar': [
    { id: 'sb-arope', label: 'AROPE', unit: '%', goodHigh: false, amber: 22, red: 27 },
    { id: 'sb-gini', label: 'Gini', unit: '', goodHigh: false, amber: 32, red: 36 },
    { id: 'sb-tasa-pobreza', label: 'Pobreza', unit: '%', goodHigh: false, amber: 18, red: 22 },
    { id: 'sb-paro-juvenil', label: 'Paro juv.', unit: '%', goodHigh: false, amber: 25, red: 35 },
  ],
  'medio-rural': [
    { id: 'mr-pob-rural', label: 'Pob. rural', unit: '%' },
    { id: 'mr-empleo-agro', label: 'Empleo agro', unit: '%' },
    { id: 'mr-densidad', label: 'Densidad', unit: 'hab/km²' },
    { id: 'mr-municipios-100', label: 'Munic. <100', unit: '' },
  ],
  'cultura-ocio': [
    { id: 'co-gasto-cultura', label: 'Gasto cult.', unit: '€' },
    { id: 'co-asistencia-cine', label: 'Asist. cine', unit: '%' },
    { id: 'co-empleo-cultural', label: 'Empleo cult.', unit: '' },
    { id: 'co-libros-editados', label: 'Libros ed.', unit: '' },
  ],
  'instituciones-estado': [
    { id: 'ie-confianza-gobierno', label: 'Conf. gob.', unit: '%' },
    { id: 'ie-confianza-jueces', label: 'Conf. just.', unit: '%' },
    { id: 'ie-corrupcion-cpi', label: 'CPI Trans.', unit: '' },
    { id: 'ie-empleo-publico', label: 'Emp. público', unit: '%' },
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
    const last = overview?.byId?.[spec.id]?.last
    return {
      label: spec.label,
      value: fmt(last?.value ?? null, spec.unit),
      unit: spec.unit,
      period: last?.period || null,
      color: colorForKpi(last?.value ?? null, spec.goodHigh, spec.amber, spec.red),
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
          {flashKpis.map((kpi) => (
            <div key={kpi.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.6, color: 'rgba(255,255,255,0.55)', margin: 0, textTransform: 'uppercase' }}>
                {kpi.label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color: kpi.color, margin: '3px 0 0', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                {kpi.value}
                {kpi.unit && kpi.value !== '—' && <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2, opacity: 0.7 }}>{kpi.unit}</span>}
              </p>
              {kpi.period && (
                <p style={{ margin: '2px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{kpi.period}</p>
              )}
            </div>
          ))}
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
