'use client'
/**
 * <AlojamientoView /> · Turismo v3 · TurismoShell · Sprint T5
 *
 * Alojamiento por TIPO. Consume /api/turismo/ocupacion (envelope { ok, data, … }):
 * cuatro tipos de alojamiento colectivo reglado —hoteles (EOH), apartamentos
 * (EOAP), campings (EOAC) y turismo rural (EOTR)— con pernoctaciones + serie,
 * grado de ocupación %, estancia media; y, solo para hoteles, ADR y RevPAR
 * (IRSH). Estructura:
 *
 *   - Hero (SectorHero) + 4 KPIs vivos (HeroKpis): pernoctaciones totales del
 *     mes, ocupación hotelera %, ADR y RevPAR hoteleros.
 *   - <AlojTypeCards /> · comparativa por tipo (tarjetas con métricas + sparkline).
 *   - <AlojSeriesChart /> · pernoctaciones por tipo (líneas múltiples) + grado de
 *     ocupación % por tipo (barras del último mes).
 *   - <AlojRentabilidad /> · ADR vs RevPAR hoteleros + identidad RevPAR = ADR ×
 *     ocupación + estacionalidad de la demanda (serie real de pernoctaciones).
 *   - <AlojViviendaTuristicaCard /> · puente sobrio a /sector-vivienda (la VT NO
 *     se duplica: su detalle vive en el módulo de Vivienda).
 *
 * Degradación honesta (CLAUDE.md): valores null → '—', chips "datos parciales"
 * por tipo, empty-states cuando falta una métrica entera. Cero emojis · Unicode.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel, SectorHero } from '@/components/SectorialWidgets'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import {
  type OcupacionEnvelope,
  type OcupacionTipo,
  ACCENT,
  ACCENT_DARK,
  INE_OCUPACION_URL,
  fmtPernoct,
  fmtPeriod,
} from './AlojShared'
import { AlojTypeCards } from './AlojTypeCards'
import { AlojSeriesChart } from './AlojSeriesChart'
import { AlojRentabilidad } from './AlojRentabilidad'
import { AlojViviendaTuristicaCard } from './AlojViviendaTuristicaCard'

const REFRESH_MS = 60 * 60 * 1000 // ocupación es mensual · refresco horario basta

export function AlojamientoView() {
  const [env, setEnv] = useState<OcupacionEnvelope | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [fetchMs, setFetchMs] = useState<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    const t0 = Date.now()
    const r = await fetch('/api/turismo/ocupacion?months=24', { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<OcupacionEnvelope>) : null))
      .catch(() => null)
    setEnv(r)
    setFetchMs(Date.now() - t0)
    setUpdatedAt(new Date())
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [refresh])

  const tipos: OcupacionTipo[] = env?.data?.tipos ?? []
  const hotel = useMemo(() => tipos.find((t) => t.tipo === 'hoteles'), [tipos])
  const lastPeriod = env?.data?.last_period ?? null
  const loaded = env != null
  const ok = env?.ok === true && tipos.length > 0
  const degraded = env?.partial === true || tipos.some((t) => t.degraded)

  // Pernoctaciones totales del mes (suma de los tipos con dato).
  const pernoctTotal = useMemo(() => {
    const vals = tipos.map((t) => t.pernoctaciones).filter((v): v is number => v != null)
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null
  }, [tipos])

  const heroItems: HeroKpiItem[] = [
    {
      label: 'Pernoctaciones mes (4 tipos)',
      value: pernoctTotal != null ? pernoctTotal / 1_000_000 : null,
      unit: 'M',
      color: '#86EFAC',
      decimals: 2,
      footer: pernoctTotal != null ? 'hotel + apt + camping + rural' : 'sin dato INE',
    },
    {
      label: 'Ocupación hotelera',
      value: hotel?.grado_ocupacion_pct ?? null,
      unit: '%',
      color: '#7DD3FC',
      decimals: 1,
      footer: 'EOH · grado por plazas',
    },
    {
      label: 'ADR hoteles',
      value: hotel?.adr_eur ?? null,
      unit: '€',
      color: '#FCD34D',
      decimals: 2,
      footer: hotel?.adr_eur != null ? 'tarifa media diaria' : 'sin dato IRSH',
    },
    {
      label: 'RevPAR hoteles',
      value: hotel?.revpar_eur ?? null,
      unit: '€',
      color: '#FCA5A5',
      decimals: 2,
      footer: hotel?.revpar_eur != null ? 'por habitación disponible' : 'sin dato IRSH',
    },
  ]

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="SECTORIAL · TURISMO & HOSTELERÍA · ALOJAMIENTO POR TIPO"
        title="Alojamiento por tipo en España"
        sub="Hoteles, apartamentos turísticos, campings y turismo rural (INE EOH/EOAP/EOAC/EOTR): pernoctaciones, grado de ocupación y estancia media; ADR y RevPAR para hoteles. La vivienda turística se analiza en el módulo de Vivienda."
        updatedAt={updatedAt}
        fetchMs={fetchMs}
        onRefresh={refresh}
        kpis={<HeroKpis items={heroItems} loading={!loaded} />}
      />

      {/* Aviso de degradación honesto (no bloquea el render de lo disponible) */}
      {loaded && degraded && ok && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            color: '#92400E',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 11.5,
            marginBottom: 14,
          }}
        >
          <span aria-hidden="true" style={{ fontWeight: 800 }}>!</span>
          Algunas métricas no llegaron de INE en esta carga; se muestra lo disponible y se marca cada tipo afectado.
        </div>
      )}

      {!loaded ? (
        <Panel title="Comparativa por tipo de alojamiento" subtitle="Cargando INE…">
          <div style={{ fontSize: 12, color: '#86868b', padding: 18, textAlign: 'center' }}>Cargando ocupación por tipo…</div>
        </Panel>
      ) : !ok ? (
        <Panel title="Comparativa por tipo de alojamiento" subtitle="INE EOH/EOAP/EOAC/EOTR" sourceUrl={INE_OCUPACION_URL} sourceLabel="INE">
          <div style={{ fontSize: 12, color: '#86868b', padding: 18, textAlign: 'center', lineHeight: 1.5 }}>
            No hay datos de ocupación disponibles en este momento{env?.error ? ` (${env.error})` : ''}. El endpoint está
            operativo; cuando INE responda se mostrará la comparativa por tipo, las series y la rentabilidad hotelera.
          </div>
        </Panel>
      ) : (
        <>
          {/* 1 · Comparativa por tipo */}
          <Panel
            title="Comparativa por tipo de alojamiento"
            subtitle={`Hoteles · apartamentos · campings · rural${lastPeriod ? ` · último dato ${fmtPeriod(lastPeriod)}` : ''}`}
            marginBottom
            sourceUrl={INE_OCUPACION_URL}
            sourceLabel="INE"
            sourceTooltip="INE · EOH / EOAP / EOAC / EOTR + IRSH"
            apiUrl="/api/turismo/ocupacion?months=24"
          >
            <AlojTypeCards tipos={tipos} />
          </Panel>

          {/* 2 · Series */}
          <Panel
            title="Series por tipo · pernoctaciones y ocupación"
            subtitle="Pernoctaciones mensuales (líneas) + grado de ocupación % del último mes (barras)"
            marginBottom
            sourceUrl={INE_OCUPACION_URL}
            sourceLabel="INE"
            sourceTooltip="INE · pernoctaciones y grado de ocupación por tipo"
          >
            <AlojSeriesChart tipos={tipos} />
          </Panel>

          {/* 3 · Rentabilidad hotelera */}
          <Panel
            title="Rentabilidad hotelera · ADR y RevPAR"
            subtitle="Indicadores de rentabilidad hotelera (IRSH) · solo hoteles"
            marginBottom
            sourceUrl={INE_OCUPACION_URL}
            sourceLabel="INE"
            sourceTooltip="INE · Indicadores de Rentabilidad del Sector Hotelero (IRSH)"
          >
            <AlojRentabilidad hotel={hotel} />
          </Panel>

          {/* 4 · Vivienda turística · puente a Vivienda (de-dup) */}
          <div style={{ marginBottom: 14 }}>
            <AlojViviendaTuristicaCard />
          </div>

          <div style={{ fontSize: 10, color: '#86868b', textAlign: 'right' }}>
            Fuente: INE · EOH / EOAP / EOAC / EOTR + IRSH{pernoctTotal != null ? ` · ${fmtPernoct(pernoctTotal)} pernoctaciones agregadas` : ''}
          </div>
        </>
      )}
    </div>
  )
}

export default AlojamientoView
