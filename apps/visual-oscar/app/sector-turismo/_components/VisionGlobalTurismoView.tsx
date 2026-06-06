'use client'
/**
 * <VisionGlobalTurismoView /> · Turismo v3 · TurismoShell · sección por defecto
 *
 * Landing cross-turismo del shell /sector-turismo. En T1 PRESERVA la
 * funcionalidad que tenía la página plana anterior para no perder nada durante
 * el build incremental:
 *
 *   - Hero (SectorHero) con los 4 KPIs vivos, ahora migrados a la primitiva
 *     compartida <HeroKpis /> (label · value · unit · color · footer · decimals):
 *       · Turistas internacionales del mes (FRONTUR) — en miles.
 *       · Variación anual de turistas (%).
 *       · Pernoctaciones hoteleras del mes (EOH) — en miles.
 *       · Viajeros en hoteles del mes (EOH) — en miles.
 *   - Los 2 gráficos de serie mensual existentes (FRONTUR + pernoctaciones EOH)
 *     con su fetch a `/api/sectores/turismo/resumen` (sin cambios de fuente).
 *   - <SectorIntelPanel sector="turismo" /> (tracker en vivo + mapa OSINT).
 *   - <CuadernoEntityWidget slug="turismo" /> (notas del Cuaderno).
 *
 * La Ola 2 (Sprint T3) reenfocará esta vista a "snapshots ejecutivos"
 * (estacionalidad, comparativa UE, semáforo) y moverá el detalle a sus
 * pestañas. Aquí queda la base viva. Degradación honesta (CLAUDE.md): valores
 * `null` → '—', nunca se inventan datos. Cero emojis · Unicode geométrico.
 */
import { useEffect, useState } from 'react'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { Panel, SerieLineChart, SectorHero } from '@/components/SectorialWidgets'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
// Primitiva GENÉRICA reutilizada del sector energía (CLAUDE.md: una sola
// implementación; el spec T1 pide importar/reusar HeroKpis, no duplicarla).
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'

const ACCENT = '#0EA5E9'
const ACCENT_DARK = '#075985'
const REFRESH_MS = 60 * 60 * 1000

interface Resumen {
  kpis: {
    turistas_mes: number | null
    turistas_periodo?: string
    turistas_var_anual: number | null
    pernoctaciones_mes: number | null
    pernoctaciones_periodo?: string
    viajeros_mes: number | null
    viajeros_periodo?: string
  }
  serie_turistas: Array<{ t: string; v: number | null }>
  serie_pernoctaciones: Array<{ t: string; v: number | null }>
  serie_viajeros: Array<{ t: string; v: number | null }>
  fetch_ms: number
}

export function VisionGlobalTurismoView() {
  const [data, setData] = useState<Resumen | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = async () => {
    const r = await fetch('/api/sectores/turismo/resumen')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
    setData(r)
    setUpdatedAt(new Date())
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  // 4 KPIs hero migrados a la primitiva compartida <HeroKpis />.
  const heroItems: HeroKpiItem[] = [
    {
      label: `Turistas mes (${data?.kpis.turistas_periodo || '—'})`,
      value: data?.kpis.turistas_mes != null ? Math.round(data.kpis.turistas_mes / 1000) : null,
      unit: 'k',
      color: '#86EFAC',
      decimals: 0,
    },
    {
      label: 'Variación anual',
      value: data?.kpis.turistas_var_anual ?? null,
      unit: '%',
      color: '#FCD34D',
      decimals: 1,
    },
    {
      label: `Pernoctaciones (${data?.kpis.pernoctaciones_periodo || '—'})`,
      value: data?.kpis.pernoctaciones_mes != null ? Math.round(data.kpis.pernoctaciones_mes / 1000) : null,
      unit: 'k',
      color: '#7DD3FC',
      decimals: 0,
    },
    {
      label: `Viajeros hoteles (${data?.kpis.viajeros_periodo || '—'})`,
      value: data?.kpis.viajeros_mes != null ? Math.round(data.kpis.viajeros_mes / 1000) : null,
      unit: 'k',
      color: '#FCA5A5',
      decimals: 0,
    },
  ]

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="SECTORIAL · TURISMO & HOSTELERÍA · INE FRONTUR + EOH"
        title="Mercado turístico español en tiempo real"
        sub="Turistas internacionales (Frontur) · pernoctaciones y viajeros hoteleros (EOH). El detalle por mercado emisor, tipo de alojamiento, destino, tipo de turismo, conectividad e impacto económico vive en las pestañas superiores."
        updatedAt={updatedAt}
        fetchMs={data?.fetch_ms}
        onRefresh={refresh}
        kpis={<HeroKpis items={heroItems} loading={data == null} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Turistas internacionales · serie mensual"
          subtitle="INE FRONTUR · Total Nacional dato base"
          sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=10256"
          sourceLabel="INE"
          sourceTooltip="FRONTUR · Estadística de Movimientos Turísticos · INE"
          apiUrl="/api/sectores/turismo/resumen"
        >
          {data && (
            <SerieLineChart
              points={data.serie_turistas.map((p) => ({ t: p.t, v: p.v != null ? p.v / 1_000_000 : null }))}
              color={ACCENT}
              formatY={(n) => `${n.toFixed(1)}M`}
            />
          )}
        </Panel>
        <Panel
          title="Pernoctaciones hoteleras · serie mensual"
          subtitle="INE EOH · Total Nacional"
          sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=10257"
          sourceLabel="INE"
          sourceTooltip="EOH · Encuesta Ocupación Hotelera · INE"
          apiUrl="/api/sectores/turismo/resumen"
        >
          {data && (
            <SerieLineChart
              points={data.serie_pernoctaciones.map((p) => ({ t: p.t, v: p.v != null ? p.v / 1000 : null }))}
              color="#7C3AED"
              formatY={(n) => `${n.toFixed(0)}k`}
            />
          )}
        </Panel>
      </div>

      {/* Politeia intel · tourism_destinations + AENA + cruceros */}
      <SectorIntelPanel sector="turismo" accent={ACCENT} />

      {/* Cuaderno · notas que mencionan el sector Turismo */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="turismo" name="Sector Turismo" accentColor="#06B6D4" />
      </div>
    </div>
  )
}

export default VisionGlobalTurismoView
