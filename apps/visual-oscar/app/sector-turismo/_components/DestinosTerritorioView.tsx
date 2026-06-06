'use client'
/**
 * <DestinosTerritorioView /> · Turismo v3 · TurismoShell · Sprint T6
 *
 * Destinos y territorio. Esta vista (Ola 2) sustituye al stub T1 con la
 * distribución TERRITORIAL del turismo español:
 *
 *   1. Mapa CCAA (choropleth) de pernoctaciones / presión por comunidad,
 *      reutilizando el hexmap compartido `components/macro/charts/CCAAHexmap`
 *      (CLAUDE.md §0.6 · se CONSUME, no se duplica) → <DestinosCcaaMap />.
 *   2. Mapa de destinos posicionados por lat/lon sobre silueta SVG procedural
 *      con inset de Canarias (patrón H2ProjectsMap) → <DestinosEspanaMap />.
 *   3. Ranking de CCAA por pernoctaciones (barras + cuota + YoY)
 *      → <DestinosRankingCcaa />.
 *   4. Tabla de destinos enriquecida con filtro por tipo + drill
 *      → <DestinosTabla /> + <DestinoDetalle />.
 *   5. Presión turística / saturación (pernoctaciones por habitante +
 *      concentración top-3/5) → <DestinosSaturacion />.
 *
 * Datos (envelope Politeia `{ ok, data, ... }`):
 *   - GET /api/turismo/ccaa            → pernoctaciones + cuota + YoY por CCAA.
 *   - GET /api/turismo/destinos?tipo=  → catálogo de destinos enriquecido.
 *
 * La población por comunidad (para la presión per-cápita y la métrica del mapa)
 * sale de `CCAA_CATALOG` (constante demográfica). Degradación honesta: null →
 * '—', nunca se inventan datos. Cero emojis · Unicode geométrico (◔ ◉ ◍).
 *
 * REGLAS T6: esta vista + sus sub-componentes `Destinos*` son lo único editable;
 * NO se tocan TurismoShell, lib/, app/api/, sectorial-data.ts ni CCAAHexmap.
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import { CCAA_CATALOG } from '@/lib/macro/ccaa-catalog'
import { HeroKpis, type HeroKpiItem } from '../../sector-energia/_components/shared/HeroKpis'
import { DestinosCcaaMap } from './DestinosCcaaMap'
import { DestinosEspanaMap } from './DestinosEspanaMap'
import { DestinosRankingCcaa } from './DestinosRankingCcaa'
import { DestinosTabla, DestinoDetalle } from './DestinosTabla'
import { DestinosSaturacion } from './DestinosSaturacion'

const ACCENT = '#0EA5E9'

// ─────────────────────────────────────────────────────────────────────────
// Tipos canónicos de la vista (espejo de los endpoints · fuente para los
// sub-componentes Destinos*). No se importan de lib (regla T6: solo consumir
// los endpoints), se declaran aquí.
// ─────────────────────────────────────────────────────────────────────────

export type TurismoMetric = 'pernoctaciones' | 'per_capita'

export type DestinoTipo =
  | 'ciudad'
  | 'costa'
  | 'isla'
  | 'rural'
  | 'interior'
  | 'cultural'
  | 'esqui'
  | 'naturaleza'
  | 'gastronomico'
  | 'religioso'

export interface CcaaRow {
  ccaa: string
  ccaa_iso: string
  nuts2: string
  pernoctaciones: number | null
  cuota_pct: number | null
  yoy_pct: number | null
  llegadas: number | null
  llegadas_cuota_pct: number | null
}

export interface Destino {
  slug: string
  nombre: string
  ccaa: string
  ccaa_iso: string
  tipo: DestinoTipo[]
  lat: number
  lon: number
  fuente: string
  fecha_ref: string
  pernoctaciones_ccaa: number | null
  pernoctaciones_period?: string | null
  live: boolean
}

interface CcaaEnvelope {
  ok: boolean
  data: {
    rows: CcaaRow[]
    year: number | null
    total_pernoctaciones: number | null
  } | null
}

interface DestinosEnvelope {
  ok: boolean
  data: {
    destinos: Destino[]
    n_live: number
    n_total: number
  } | null
}

// Población por NUTS2 (constante demográfica del catálogo · para per-cápita).
const POBLACION_BY_NUTS2: Record<string, number> = Object.fromEntries(
  CCAA_CATALOG.map((c) => [c.nuts2, c.population]),
)

function fmtMillones(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}`
  return `${(v / 1_000).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
}

export function DestinosTerritorioView() {
  const [ccaaRows, setCcaaRows] = useState<CcaaRow[]>([])
  const [year, setYear] = useState<number | null>(null)
  const [totalPernoct, setTotalPernoct] = useState<number | null>(null)
  const [ccaaLoading, setCcaaLoading] = useState(true)

  const [destinos, setDestinos] = useState<Destino[]>([])
  const [nLive, setNLive] = useState(0)
  const [nTotal, setNTotal] = useState(0)
  const [destinosLoading, setDestinosLoading] = useState(true)

  const [metric, setMetric] = useState<TurismoMetric>('pernoctaciones')
  const [tipoFilter, setTipoFilter] = useState<DestinoTipo | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  // ── Fetch CCAA (una vez) ──────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    setCcaaLoading(true)
    fetch('/api/turismo/ccaa', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: CcaaEnvelope | null) => {
        if (!alive) return
        if (j?.ok && j.data) {
          setCcaaRows(Array.isArray(j.data.rows) ? j.data.rows : [])
          setYear(j.data.year ?? null)
          setTotalPernoct(j.data.total_pernoctaciones ?? null)
        } else {
          setCcaaRows([])
        }
        setCcaaLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // ── Fetch destinos (reactivo al filtro de tipo) ───────────────────────
  useEffect(() => {
    let alive = true
    setDestinosLoading(true)
    const qs = tipoFilter ? `?tipo=${encodeURIComponent(tipoFilter)}` : ''
    fetch(`/api/turismo/destinos${qs}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j: DestinosEnvelope | null) => {
        if (!alive) return
        if (j?.ok && j.data) {
          setDestinos(Array.isArray(j.data.destinos) ? j.data.destinos : [])
          setNLive(j.data.n_live ?? 0)
          setNTotal(j.data.n_total ?? 0)
        } else {
          setDestinos([])
          setNLive(0)
          setNTotal(0)
        }
        setDestinosLoading(false)
      })
    return () => {
      alive = false
    }
  }, [tipoFilter])

  const selectedDestino = useMemo(
    () => destinos.find((d) => d.slug === selectedSlug) ?? null,
    [destinos, selectedSlug],
  )

  // ── KPIs hero ─────────────────────────────────────────────────────────
  const heroItems: HeroKpiItem[] = useMemo(() => {
    const withPernoct = ccaaRows.filter((r) => r.pernoctaciones != null)
    const lider = withPernoct.length
      ? withPernoct.reduce((a, b) => ((a.pernoctaciones ?? 0) >= (b.pernoctaciones ?? 0) ? a : b))
      : null
    const liderTxt = lider ? `${lider.ccaa} (${lider.cuota_pct != null ? lider.cuota_pct.toFixed(0) : '—'}%)` : '—'
    return [
      {
        label: `Pernoctaciones total${year ? ` · ${year}` : ''}`,
        value: fmtMillones(totalPernoct),
        unit: 'M',
        color: '#7DD3FC',
        footer: 'Eurostat NUTS2 · suma CCAA',
      },
      {
        label: 'Comunidad líder',
        value: liderTxt,
        color: '#86EFAC',
        footer: 'mayor cuota de pernoctaciones',
      },
      {
        label: 'Destinos catalogados',
        value: nTotal || destinos.length,
        unit: '',
        color: '#FCD34D',
        decimals: 0,
        footer: `${nLive} con dato live`,
      },
      {
        label: 'Comunidades con dato',
        value: ccaaRows.filter((r) => r.pernoctaciones != null).length,
        unit: '/ 19',
        color: '#FCA5A5',
        decimals: 0,
        footer: 'cobertura territorial',
      },
    ]
  }, [ccaaRows, totalPernoct, year, nTotal, nLive, destinos.length])

  const noData = !ccaaLoading && ccaaRows.length === 0 && !destinosLoading && destinos.length === 0

  return (
    <div>
      {/* ── Cabecera de sección ── */}
      <header
        style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, #075985 100%)`,
          borderRadius: 16,
          padding: '22px 24px',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>
          TURISMO · DESTINOS Y TERRITORIO
        </p>
        <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Distribución territorial del turismo
        </h2>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, opacity: 0.9, maxWidth: 720, lineHeight: 1.5 }}>
          Mapa por comunidad autónoma (pernoctaciones y presión), mapa de destinos por coordenadas, ranking de
          comunidades y tabla de destinos por tipo de turismo. Fuentes: Eurostat NUTS2 (pernoctaciones) +
          catálogo Politeia de destinos.
        </p>
        <HeroKpis items={heroItems} loading={ccaaLoading} />
      </header>

      {noData ? (
        <Panel title="Distribución territorial" marginBottom>
          <div style={{ padding: '24px 16px', textAlign: 'center', background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 12 }}>
            <div style={{ fontSize: 24, color: ACCENT, marginBottom: 6 }} aria-hidden="true">◔</div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>Datos territoriales no disponibles</p>
            <p style={{ margin: '6px auto 0', fontSize: 11.5, color: '#6e6e73', maxWidth: 460, lineHeight: 1.5 }}>
              Ni el servicio de pernoctaciones por CCAA (Eurostat) ni el catálogo de destinos devolvieron datos.
              Vuelve a intentarlo más tarde; no se muestran cifras inventadas.
            </p>
          </div>
        </Panel>
      ) : (
        <>
          {/* ── Fila 1: choropleth CCAA + ranking ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
            <Panel
              title="Mapa por comunidad autónoma"
              subtitle="Pernoctaciones / presión · choropleth"
              sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/tour_occ_nin2"
              sourceLabel="Eurostat"
              sourceTooltip="Eurostat · tour_occ_nin2 (pernoctaciones NUTS2)"
            >
              <DestinosCcaaMap
                rows={ccaaRows}
                metric={metric}
                onMetricChange={setMetric}
                poblacionByNuts2={POBLACION_BY_NUTS2}
                year={year}
                loading={ccaaLoading}
              />
            </Panel>

            <Panel
              title="Ranking de comunidades por pernoctaciones"
              subtitle="Cuota nacional + variación interanual"
              sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/tour_occ_nin2"
              sourceLabel="Eurostat"
              sourceTooltip="Eurostat · tour_occ_nin2 (pernoctaciones NUTS2)"
            >
              <DestinosRankingCcaa rows={ccaaRows} loading={ccaaLoading} />
            </Panel>
          </div>

          {/* ── Fila 2: mapa de destinos por lat/lon + detalle drill ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, 1fr)', gap: 14, marginBottom: 14 }}>
            <Panel
              title="Mapa de destinos turísticos"
              subtitle="Posicionados por coordenadas · color por intensidad de su CCAA"
              sourceUrl="https://www.ine.es/dyngs/INEbase/es/categoria.htm?c=Estadistica_P&cid=1254735576863"
              sourceLabel="INE / Turespaña"
              sourceTooltip="Catálogo Politeia de destinos (coordenadas + tipología INE/Turespaña) enriquecido con Eurostat"
            >
              <DestinosEspanaMap
                destinos={destinos}
                selectedSlug={selectedSlug}
                onSelect={setSelectedSlug}
                nLive={nLive}
                nTotal={nTotal}
                loading={destinosLoading}
              />
            </Panel>

            <Panel title="Detalle del destino" subtitle="Selección del mapa o la tabla">
              <DestinoDetalle destino={selectedDestino} year={year} />
            </Panel>
          </div>

          {/* ── Fila 3: tabla enriquecida con filtro por tipo ── */}
          <Panel
            title="Destinos por tipo de turismo"
            subtitle="Filtra por tipo · pulsa una fila para su detalle"
            sourceUrl="https://www.ine.es/dyngs/INEbase/es/categoria.htm?c=Estadistica_P&cid=1254735576863"
            sourceLabel="INE / Turespaña"
            sourceTooltip="Catálogo Politeia de destinos enriquecido con pernoctaciones por CCAA (Eurostat NUTS2)"
            marginBottom
          >
            <DestinosTabla
              destinos={destinos}
              tipoFilter={tipoFilter}
              onTipoChange={(t) => {
                setTipoFilter(t)
                setSelectedSlug(null)
              }}
              selectedSlug={selectedSlug}
              onSelect={setSelectedSlug}
              loading={destinosLoading}
            />
          </Panel>

          {/* ── Fila 4: presión / saturación ── */}
          <Panel
            title="Presión turística y concentración territorial"
            subtitle="Pernoctaciones por habitante + concentración top CCAA"
            sourceUrl="https://ec.europa.eu/eurostat/databrowser/view/tour_occ_nin2"
            sourceLabel="Eurostat + padrón"
            sourceTooltip="Eurostat (pernoctaciones NUTS2) ÷ población residente (INE · CCAA_CATALOG)"
          >
            <DestinosSaturacion
              rows={ccaaRows}
              poblacionByNuts2={POBLACION_BY_NUTS2}
              totalPernoctaciones={totalPernoct}
              year={year}
              loading={ccaaLoading}
            />
          </Panel>
        </>
      )}
    </div>
  )
}

export default DestinosTerritorioView
