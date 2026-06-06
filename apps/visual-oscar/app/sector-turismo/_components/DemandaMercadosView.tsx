'use client'
/**
 * <DemandaMercadosView /> · Turismo v3 · TurismoShell · Sprint T4
 *
 * Demanda y mercados emisores. Profundiza la pestaña con cuatro bloques, todos
 * sobre fuentes vivas (envelope Politeia `{ok,data,...}`), sin hardcodear y con
 * degradación honesta por bloque/serie/país:
 *
 *   1. Mercados emisores (FRONTUR) — treemap/ranking de turistas por país de
 *      residencia (cuota + variación interanual, color por crecimiento) +
 *      tendencia mensual del total de llegadas.
 *   2. Gasto (EGATUR) — KPIs gasto total / medio por turista / medio diario /
 *      estancia media + series.
 *   3. Turismo de residentes (ETR) — viajes/pernoctaciones, interno vs emisor.
 *   4. Estacionalidad de la demanda — curva mensual del índice (pico/valle) +
 *      temperatura (AEMET) si disponible.
 *
 * El heatmap mercado×mes se OMITE: los endpoints vivos (FRONTUR por país da el
 * último mes; estacionalidad es agregada) no exponen el cruce país×mes. Se
 * documenta como nota honesta en lugar de simularlo (CLAUDE.md).
 *
 * Reusa <HeroKpis> (primitiva compartida de energía) y recharts (patrón del
 * repo). Cero emojis · Unicode geométrico.
 */
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Panel, SectorHero } from '@/components/SectorialWidgets'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import {
  fetchEnvelope, fmtMillones, periodTick, TOOLTIP_STYLE, ACCENT, ACCENT_DARK,
  type FronturData, type EgaturData, type ResidentesData, type EstacionalidadData,
} from './shared/demandaUtils'
import { DemandaMercadosTreemap } from './DemandaMercadosTreemap'
import { DemandaGastoPanel } from './DemandaGastoPanel'
import { DemandaResidentesPanel } from './DemandaResidentesPanel'
import { DemandaEstacionalidad } from './DemandaEstacionalidad'

const REFRESH_MS = 60 * 60 * 1000

interface Blocks {
  frontur: FronturData | null
  egatur: EgaturData | null
  residentes: ResidentesData | null
  estacionalidad: EstacionalidadData | null
}

const INE_FRONTUR_URL = 'https://www.ine.es/dynt3/inebase/index.htm?padre=10256'
const INE_EGATUR_URL = 'https://www.ine.es/dynt3/inebase/index.htm?padre=10254'
const INE_ETR_URL = 'https://www.ine.es/dynt3/inebase/index.htm?padre=10210'

export function DemandaMercadosView() {
  const [blocks, setBlocks] = useState<Blocks>({ frontur: null, egatur: null, residentes: null, estacionalidad: null })
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [fetchMs, setFetchMs] = useState<number | undefined>(undefined)

  const refresh = async () => {
    setLoading(true)
    const t0 = Date.now()
    const [frontur, egatur, residentes, estacionalidad] = await Promise.all([
      fetchEnvelope<FronturData>('/api/turismo/frontur?months=24'),
      fetchEnvelope<EgaturData>('/api/turismo/egatur?n=10'),
      fetchEnvelope<ResidentesData>('/api/turismo/residentes?n=12'),
      fetchEnvelope<EstacionalidadData>('/api/turismo/estacionalidad'),
    ])
    setBlocks({
      frontur: frontur.ok ? frontur.data : null,
      egatur: egatur.ok ? egatur.data : null,
      residentes: residentes.ok ? residentes.data : null,
      estacionalidad: estacionalidad.ok ? estacionalidad.data : null,
    })
    setFetchMs(Date.now() - t0)
    setUpdatedAt(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { frontur, egatur, residentes, estacionalidad } = blocks

  // ── Hero KPIs (cross-bloque) ──────────────────────────────────────────────
  const heroItems: HeroKpiItem[] = [
    {
      label: `Turistas mes${frontur?.last_period ? ` (${frontur.last_period})` : ''}`,
      value: frontur?.last?.value != null ? Math.round(frontur.last.value / 1_000_000) : null,
      unit: 'M',
      color: '#86EFAC',
      decimals: 1,
    },
    {
      label: 'Llegadas · interanual',
      value: frontur?.yoy_pct ?? null,
      unit: '%',
      color: '#FCD34D',
      decimals: 1,
    },
    {
      label: `Gasto medio${egatur?.last_period ? ` (${egatur.last_period})` : ''}`,
      value: egatur?.gasto_medio_persona.last?.value ?? null,
      unit: '€',
      color: '#7DD3FC',
      decimals: 0,
    },
    {
      label: 'Estancia media',
      value: egatur?.estancia_media.last?.value ?? null,
      unit: 'noches',
      color: '#FCA5A5',
      decimals: 2,
    },
  ]

  // Tendencia mensual del total de llegadas (FRONTUR serie_total).
  const totalSerie = (frontur?.serie_total ?? []).filter((p) => p.value != null).map((p) => ({ period: p.period, value: p.value }))

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="TURISMO · DEMANDA Y MERCADOS EMISORES · INE FRONTUR + EGATUR + ETR"
        title="Demanda turística y mercados emisores"
        sub="Llegadas por país de residencia (FRONTUR), gasto por turista (EGATUR), turismo de residentes (ETR) y estacionalidad de la demanda. Color por crecimiento interanual. Datos vivos del INE; degradación honesta por bloque."
        updatedAt={updatedAt}
        fetchMs={fetchMs}
        onRefresh={refresh}
        kpis={<HeroKpis items={heroItems} loading={loading && frontur == null && egatur == null} />}
      />

      {/* 1 · Mercados emisores ─────────────────────────────────────────────── */}
      <Panel
        title="Mercados emisores · turistas por país de residencia"
        subtitle="INE FRONTUR · último mes · área = volumen · color = variación anual"
        sourceUrl={INE_FRONTUR_URL}
        sourceLabel="INE"
        sourceTooltip="FRONTUR · turistas por país de residencia · INE"
        marginBottom
      >
        {frontur ? (
          <DemandaMercadosTreemap paises={frontur.por_pais} lastPeriod={frontur.last_period} />
        ) : (
          <Degraded loading={loading} label="FRONTUR por mercado emisor" />
        )}
      </Panel>

      {/* Tendencia mensual del total de llegadas */}
      <Panel
        title="Llegadas internacionales · tendencia mensual"
        subtitle="INE FRONTUR · total nacional · últimos 24 meses"
        sourceUrl={INE_FRONTUR_URL}
        sourceLabel="INE"
        sourceTooltip="FRONTUR · serie mensual total · INE"
        marginBottom
      >
        {totalSerie.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={totalSerie} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#F5F5F7" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#86868b' }} tickLine={false} axisLine={false} tickFormatter={periodTick} minTickGap={24} />
              <YAxis tick={{ fontSize: 10, fill: '#86868b' }} tickLine={false} axisLine={false} width={42} tickFormatter={(v) => fmtMillones(v, 0)} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${fmtMillones(value, 2)} turistas`, 'Llegadas']} labelFormatter={(p) => String(p)} />
              <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2.4} dot={false} activeDot={{ r: 4.5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Degraded loading={loading} label="serie mensual de llegadas" />
        )}
      </Panel>

      {/* 2 · Gasto (EGATUR) ────────────────────────────────────────────────── */}
      <Panel
        title="Gasto turístico · EGATUR"
        subtitle="INE EGATUR · gasto total · medio por turista · medio diario · estancia media"
        sourceUrl={INE_EGATUR_URL}
        sourceLabel="INE"
        sourceTooltip="EGATUR · Encuesta de Gasto Turístico · INE"
        marginBottom
      >
        {egatur ? (
          <DemandaGastoPanel data={egatur} />
        ) : (
          <Degraded loading={loading} label="EGATUR (gasto turístico)" />
        )}
      </Panel>

      {/* 3 · Turismo de residentes (ETR) ───────────────────────────────────── */}
      <Panel
        title="Turismo de residentes · ETR"
        subtitle="INE ETR/FAMILITUR · demanda doméstica · interno vs emisor"
        sourceUrl={INE_ETR_URL}
        sourceLabel="INE"
        sourceTooltip="ETR · Encuesta de Turismo de Residentes · INE"
        marginBottom
      >
        {residentes ? (
          <DemandaResidentesPanel data={residentes} />
        ) : (
          <Degraded loading={loading} label="ETR (turismo de residentes)" />
        )}
      </Panel>

      {/* 4 · Estacionalidad de la demanda ──────────────────────────────────── */}
      <Panel
        title="Estacionalidad de la demanda"
        subtitle="INE FRONTUR + EOH · índice mensual · clima AEMET (si disponible)"
        sourceUrl={INE_FRONTUR_URL}
        sourceLabel="INE"
        sourceTooltip="Patrón estacional · FRONTUR + EOH · INE · clima AEMET"
        marginBottom
      >
        {estacionalidad ? (
          <DemandaEstacionalidad data={estacionalidad} />
        ) : (
          <Degraded loading={loading} label="estacionalidad de la demanda" />
        )}
      </Panel>

      {/* Nota de no-simulación del heatmap mercado×mes (degradación honesta) */}
      <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '4px 2px 0', lineHeight: 1.5 }}>
        Nota · el heatmap mercado×mes se omite intencionadamente: las fuentes vivas exponen el desglose por mercado del último mes (FRONTUR) y la estacionalidad agregada del conjunto, pero no el cruce país×mes. No se simula.
      </p>
    </div>
  )
}

/** Estado de carga / degradación honesta de un bloque. */
function Degraded({ loading, label }: { loading: boolean; label: string }) {
  return (
    <p style={{ fontSize: 12, color: '#86868b', margin: '8px 0', lineHeight: 1.5 }}>
      {loading ? `Cargando ${label}…` : `Datos de ${label} no disponibles en este momento (la fuente degradó). No se simulan.`}
    </p>
  )
}

export default DemandaMercadosView
