'use client'
/**
 * <VisionGlobalTurismoView /> · Turismo v3 · TurismoShell · sección por defecto
 *
 * CUADRO EJECUTIVO del sector turístico (re-enfocado en Sprint T3). Principio de
 * diseño: SNAPSHOTS, NO detalle. Esta vista da el veredicto de cabecera; el
 * detalle fino vive en sus pestañas y aquí NO se replica:
 *   - desglose por mercado emisor (FRONTUR por país), series de gasto EGATUR,
 *     residentes ETR, estacionalidad por mercado → pestaña «Demanda y mercados».
 *   - ocupación/ADR/RevPAR por tipo de alojamiento → «Alojamiento».
 *   - mapa CCAA, destinos, tasa turística, saturación VT → «Destinos y territorio».
 *   - sol&playa, MICE, cruceros, salud, … → «Tipos de turismo».
 *   - AENA, aerolíneas, coste aéreo, cruceros por puerto → «Conectividad».
 *   - %PIB desglosado, empleo, PERTE, empresas cotizadas → «Impacto económico».
 *
 * Lo que SÍ vive aquí (cabecera ejecutiva):
 *   - Fila de KPIs hero ampliada (<HeroKpis>): turistas del mes (FRONTUR), gasto
 *     total y gasto medio/turista (EGATUR), pernoctaciones (EOH), %PIB turístico
 *     y empleo HORECA (impacto-económico). Solo TITULARES.
 *   - <GlobalTurStatus /> · semáforo turístico (demanda YoY · presión/estacional
 *     · comparativa UE) con 1 línea de lectura.
 *   - <VisionTComparativaUe /> · barras ES vs FR/IT/PT/UE (snapshot comparativo).
 *   - <VisionTEstacionalidad /> · mini-estacionalidad (pico/valle/ratio).
 *   - Los 2 gráficos de serie mensual preservados (FRONTUR + pernoctaciones EOH).
 *   - <SectorIntelPanel sector="turismo" /> + <CuadernoEntityWidget slug="turismo" />.
 *
 * Un solo Promise.all alimenta toda la vista (resumen + 5 endpoints turismo). Las
 * primitivas <HeroKpis> y <CommoditySnapshot>/<...> son compartidas (CLAUDE.md:
 * una sola implementación). Degradación honesta: valores `null` → '—', nunca se
 * inventan datos. Cero emojis · Unicode geométrico.
 */
import { useEffect, useState } from 'react'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { Panel, SerieLineChart, SectorHero } from '@/components/SectorialWidgets'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
// Primitiva GENÉRICA reutilizada del sector energía (CLAUDE.md: una sola
// implementación; el spec pide importar/reusar HeroKpis, no duplicarla).
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import { GlobalTurStatus } from './GlobalTurStatus'
import { VisionTComparativaUe, type ComparativaPayload } from './VisionTComparativaUe'
import { VisionTEstacionalidad, type EstacionalidadPayload } from './VisionTEstacionalidad'

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

// Envelope mínimo `{ ok, data, ... }` de los endpoints turismo.
interface Envelope<T> {
  ok?: boolean
  data?: T | null
}
interface FronturData {
  last?: { value: number | null; period?: string | null } | null
  yoy_pct?: number | null
  last_period?: string | null
}
interface EgaturMetric {
  last?: { value: number | null } | null
}
interface EgaturData {
  gasto_total?: EgaturMetric
  gasto_medio_persona?: EgaturMetric
  last_period?: string | null
}
interface ImpactoData {
  pib_turistico_pct?: number | null
  empleo_horeca?: number | null
  empleo_horeca_period?: string | null
}

/** Fetch helper: parsea envelope y devuelve `data` o null (degradación honesta). */
async function getData<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    const j = (await r.json()) as Envelope<T>
    return j?.data ?? null
  } catch {
    return null
  }
}

export function VisionGlobalTurismoView() {
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [frontur, setFrontur] = useState<FronturData | null>(null)
  const [egatur, setEgatur] = useState<EgaturData | null>(null)
  const [comparativa, setComparativa] = useState<ComparativaPayload | null>(null)
  const [estacionalidad, setEstacionalidad] = useState<EstacionalidadPayload | null>(null)
  const [impacto, setImpacto] = useState<ImpactoData | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = async () => {
    const [r, fr, eg, cu, es, im] = await Promise.all([
      fetch('/api/sectores/turismo/resumen', { cache: 'no-store' })
        .then((x) => (x.ok ? (x.json() as Promise<Resumen>) : null))
        .catch(() => null),
      getData<FronturData>('/api/turismo/frontur?months=24'),
      getData<EgaturData>('/api/turismo/egatur'),
      getData<ComparativaPayload>('/api/turismo/comparativa-ue'),
      getData<EstacionalidadPayload>('/api/turismo/estacionalidad'),
      getData<ImpactoData>('/api/turismo/impacto-economico'),
    ])
    setResumen(r)
    setFrontur(fr)
    setEgatur(eg)
    setComparativa(cu)
    setEstacionalidad(es)
    setImpacto(im)
    setUpdatedAt(new Date())
    setLoaded(true)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  // ── KPIs hero ampliados (6 titulares). FRONTUR/EOH del resumen (preservado) +
  //    EGATUR (gasto) + impacto-económico (%PIB, empleo). Solo titulares; el
  //    detalle de cada métrica vive en su pestaña.
  const turistasMes = resumen?.kpis.turistas_mes ?? null
  const yoy = frontur?.yoy_pct ?? resumen?.kpis.turistas_var_anual ?? null
  const gastoTotal = egatur?.gasto_total?.last?.value ?? null
  const gastoMedio = egatur?.gasto_medio_persona?.last?.value ?? null
  const pernoctaciones = resumen?.kpis.pernoctaciones_mes ?? null
  const pibTuristico = impacto?.pib_turistico_pct ?? null
  const empleoHoreca = impacto?.empleo_horeca ?? null

  const heroItems: HeroKpiItem[] = [
    {
      label: `Turistas mes (${resumen?.kpis.turistas_periodo || frontur?.last_period || '—'})`,
      value: turistasMes != null ? Math.round(turistasMes / 1000) : null,
      unit: 'k',
      color: '#86EFAC',
      decimals: 0,
      footer: yoy != null ? `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}% interanual` : 'INE FRONTUR',
    },
    {
      label: `Gasto total (${egatur?.last_period || '—'})`,
      value: gastoTotal != null ? Math.round(gastoTotal / 1000) : null,
      unit: 'mil M€',
      color: '#FCD34D',
      decimals: 1,
      footer: 'INE EGATUR · anual',
    },
    {
      label: 'Gasto medio / turista',
      value: gastoMedio != null ? Math.round(gastoMedio) : null,
      unit: '€',
      color: '#FDBA74',
      decimals: 0,
      footer: 'INE EGATUR',
    },
    {
      label: `Pernoctaciones (${resumen?.kpis.pernoctaciones_periodo || '—'})`,
      value: pernoctaciones != null ? Math.round(pernoctaciones / 1000) : null,
      unit: 'k',
      color: '#7DD3FC',
      decimals: 0,
      footer: 'INE EOH · hoteles',
    },
    {
      label: '% PIB turístico',
      value: pibTuristico ?? null,
      unit: '%',
      color: '#C4B5FD',
      decimals: 1,
      footer: 'Eurostat · ingresos viajes',
    },
    {
      label: `Empleo HORECA (${impacto?.empleo_horeca_period || '—'})`,
      value: empleoHoreca != null ? Math.round(empleoHoreca) : null,
      unit: 'k pers.',
      color: '#FCA5A5',
      decimals: 0,
      footer: 'Eurostat · NACE I',
    },
  ]

  return (
    <div>
      <SectorHero
        accent={ACCENT}
        accentDark={ACCENT_DARK}
        eyebrow="SECTORIAL · TURISMO & HOSTELERÍA · CUADRO EJECUTIVO"
        title="Mercado turístico español · visión global"
        sub="Titulares en vivo (FRONTUR · EGATUR · EOH · Eurostat). El detalle por mercado emisor, tipo de alojamiento, destino, tipo de turismo, conectividad e impacto económico vive en las pestañas superiores."
        updatedAt={updatedAt}
        fetchMs={resumen?.fetch_ms}
        onRefresh={refresh}
        kpis={
          <div style={{ gridColumn: '1 / -1' }}>
            <HeroKpis items={heroItems} loading={!loaded} />
          </div>
        }
      />

      {/* ───── Semáforo turístico · veredicto de cabecera ───── */}
      <div style={{ marginBottom: 14 }}>
        <GlobalTurStatus
          demandaYoyPct={yoy}
          demandaPeriod={frontur?.last_period ?? resumen?.kpis.turistas_periodo ?? null}
          ratioPicoValle={estacionalidad?.ratio_pico_valle ?? null}
          pibTuristicoEs={comparativa?.paises?.find((p) => p.pais === 'España')?.pib_turistico_pct ?? pibTuristico ?? null}
          pibTuristicoUe={comparativa?.paises?.find((p) => p.es_ue)?.pib_turistico_pct ?? null}
          loading={!loaded}
        />
      </div>

      {/* ───── Snapshots comparativos: comparativa UE + estacionalidad ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="España en Europa · comparativa UE"
          subtitle="ES vs Francia · Italia · Portugal · UE-27"
          sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/tour_occ_ninat"
          sourceLabel="Eurostat"
          sourceTooltip="tour_occ_ninat / tour_occ_arnat / bop_its6_det ÷ nama_10_gdp"
          apiUrl="/api/turismo/comparativa-ue"
        >
          <VisionTComparativaUe data={comparativa} accent={ACCENT} loading={!loaded} />
        </Panel>
        <Panel
          title="Estacionalidad de la demanda"
          subtitle="Índice mensual (media = 100) + clima"
          sourceUrl="https://www.ine.es/"
          sourceLabel="INE + AEMET"
          sourceTooltip="Índice FRONTUR/EOH cruzado con temperatura media AEMET"
          apiUrl="/api/turismo/estacionalidad"
        >
          <VisionTEstacionalidad data={estacionalidad} accent={ACCENT} loading={!loaded} />
        </Panel>
      </div>

      {/* ───── Series preservadas: FRONTUR + pernoctaciones EOH ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Turistas internacionales · serie mensual"
          subtitle="INE FRONTUR · Total Nacional dato base"
          sourceUrl="https://www.ine.es/dynt3/inebase/index.htm?padre=10256"
          sourceLabel="INE"
          sourceTooltip="FRONTUR · Estadística de Movimientos Turísticos · INE"
          apiUrl="/api/sectores/turismo/resumen"
        >
          {resumen && (
            <SerieLineChart
              points={resumen.serie_turistas.map((p) => ({ t: p.t, v: p.v != null ? p.v / 1_000_000 : null }))}
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
          {resumen && (
            <SerieLineChart
              points={resumen.serie_pernoctaciones.map((p) => ({ t: p.t, v: p.v != null ? p.v / 1000 : null }))}
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
