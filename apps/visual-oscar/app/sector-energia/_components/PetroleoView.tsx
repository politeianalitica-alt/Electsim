'use client'
/**
 * <PetroleoView /> · Sprint Energía S7 · profundizado en E6 (Petróleo profundo)
 *
 * Vista "Petróleo" del EnergiaShell. Foto completa del crudo + España:
 *
 *   - Hero · 4 KPIs petróleo (Brent $/bbl · WTI $/bbl · spread Brent-WTI ·
 *     cesta OPEP). Spot + variación 24h desde series reales.
 *   - Precios crudo (series): Brent / WTI / OPEP histórico (línea) con
 *     selector + variaciones 24h/7d/30d. Fuente real en cascada.
 *   - Spread Brent-WTI: serie del spread (Brent − WTI por fecha alineada).
 *   - Estructura temporal del Brent (E6): spread + marco contango/backwardation,
 *     sin inventar forward curve (no hay fuente de la curva por vencimientos).
 *   - Productos refinados: gasolina (RBOB) + diésel (heating oil) · series.
 *   - Crack spread / margen de refino (E6): gasolina/diésel × 42 − Brent y blend
 *     3-2-1, normalizado a $/bbl · cálculo propio sobre las series ya cargadas.
 *   - Logística energética (E6): chokepoints + Baltic Dry + buques vía el
 *     endpoint cross-source /api/energia/energy-logistics (origen seed/heurístico
 *     marcado).
 *   - OPEP cuota vs producción + reservas estratégicas ES (E6): tarjetas curadas
 *     con fuente y fecha (no se inventa el dato del día).
 *   - Dependencia/importaciones ES: catálogo curado CORES (PETROLEO_DEPENDENCIA_ES).
 *   - Geopolítica: link a /geopolitica + nota chokepoints (Ormuz/Suez).
 *   - Empresas: Repsol/Cepsa (ES) + majors (Shell/BP/Total/Exxon/Chevron/
 *     Equinor) · strip cotización Finnhub (vía CompanyQuotePanel).
 *   - <SectorIntelPanel sector="energia" compact />.
 *
 * Fuentes reales: Alpha Vantage / Nasdaq DL / Yahoo (crudo · cascada),
 * Finnhub (cotización), Puertos standalone (logística · seed/heurístico),
 * catálogo CORES (dependencia) + curado datado (OPEP, reservas). Empty-state
 * honesto cuando falta dato (CLAUDE.md). Cero emojis · Unicode (⇡ ⇣ ⟶ ◐).
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { PETROLEO_DEPENDENCIA_ES } from '@/lib/energia/catalog'
import { CompanyQuotePanel } from './shared/CompanyQuotePanel'
import { brentWtiSpread } from '@/lib/energia/commodities'
import type {
  EnergyCommodityResponse,
  EnergyCommoditySeries,
  EnergyCommoditySymbol,
} from '@/lib/energia/types'
import CommodityStrip from './CommodityStrip'
import { HeroKpis } from './shared/HeroKpis'
import { PetroleoCrackSpread } from './PetroleoCrackSpread'
import { PetroleoTermStructure } from './PetroleoTermStructure'
import { PetroleoLogistics } from './PetroleoLogistics'
import { PetroleoOpecQuota } from './PetroleoOpecQuota'
import { PetroleoReservasES } from './PetroleoReservasES'

const OIL = '#0F766E'
const OIL_DARK = '#134E4A'
const REFRESH_MS = 5 * 60 * 1000

type DataMap = Record<string, EnergyCommodityResponse>

export function PetroleoView() {
  const [data, setData] = useState<DataMap | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const j = await fetch('/api/energia/commodities?category=all&days=90', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
    setData((j?.data as DataMap) ?? {})
    setUpdatedAt(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  const brent = seriesOf(data, 'brent')
  const wti = seriesOf(data, 'wti')
  const opec = seriesOf(data, 'opec')
  const gasolina = seriesOf(data, 'gasolina')
  const diesel = seriesOf(data, 'diesel')

  const spread = brentWtiSpread(brent?.latest ?? null, wti?.latest ?? null)

  return (
    <>
      {/* ───── HERO con KPIs petróleo ───── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${OIL} 0%, ${OIL_DARK} 100%)`,
          borderRadius: 18,
          padding: '28px 36px',
          marginBottom: 18,
          color: '#fff',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 32,
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', opacity: 0.8, textTransform: 'uppercase', margin: '0 0 8px' }}>
            SECTORIAL · ENERGÍA Y SUMINISTROS · PETRÓLEO
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
            Petróleo y crudo <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.75 }}>en España y el mundo</em>
          </h1>
          <p style={{ fontSize: 13, opacity: 0.82, margin: 0, lineHeight: 1.5 }}>
            Precios del crudo de referencia (Brent, WTI, cesta OPEP) con serie histórica,
            spread Brent-WTI, productos refinados y la dependencia de importación de España
            (~99% del crudo se importa). Datos en cascada Alpha Vantage · Nasdaq Data Link · Yahoo.
          </p>
          {updatedAt && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5EEAD4', boxShadow: '0 0 8px #5EEAD4' }} />
              Última actualización · {updatedAt.toLocaleTimeString('es-ES')}
              <button
                onClick={refresh}
                style={{ marginLeft: 8, fontSize: 10.5, padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ↻ Actualizar
              </button>
            </div>
          )}
        </div>
        <HeroKpis
          loading={loading && !data}
          items={[
            { label: 'Brent', value: brent?.latest ?? null, unit: '$/bbl', color: '#5EEAD4', footer: chgFooter(brent?.change_24h ?? null, brent ? undefined : 'sin dato') },
            { label: 'WTI', value: wti?.latest ?? null, unit: '$/bbl', color: '#99F6E4', footer: chgFooter(wti?.change_24h ?? null, wti ? undefined : 'sin dato') },
            { label: 'Spread Brent-WTI', value: spread, unit: '$/bbl', color: '#CCFBF1', footer: spread == null ? 'sin dato' : 'prima del Brent' },
            { label: 'Cesta OPEP (ORB)', value: opec?.latest ?? null, unit: '$/bbl', color: '#A7F3D0', footer: chgFooter(opec?.change_24h ?? null, opec ? undefined : 'sin Nasdaq DL') },
          ]}
        />
      </section>

      {/* ───── ROW 1: Precios crudo (series con selector) ───── */}
      <Panel
        title="Precios del crudo · serie histórica"
        subtitle="Brent · WTI · cesta OPEP · cierre diario (hasta 90 días)"
        marginBottom
        sourceUrl="https://www.alphavantage.co/documentation/#commodities"
        sourceTooltip="Alpha Vantage · commodities (BRENT/WTI/NATURAL_GAS)"
      >
        <CrudePricesChart brent={brent} wti={wti} opec={opec} loading={loading} />
      </Panel>

      {/* ───── ROW 2: Spread Brent-WTI (serie) ───── */}
      <Panel
        title="Spread Brent-WTI · serie"
        subtitle="Diferencial Brent − WTI por fecha alineada · prima del crudo europeo sobre el americano"
        marginBottom
      >
        <SpreadChart brent={brent} wti={wti} />
      </Panel>

      {/* ───── ROW 2b: Estructura temporal del Brent (contango/backwardation) ───── */}
      <Panel
        title="Estructura temporal del Brent"
        subtitle="Spread Brent-WTI actual + marco contango/backwardation · sin forward curve (no hay fuente de curva)"
        marginBottom
      >
        <PetroleoTermStructure brent={brent} wti={wti} />
      </Panel>

      {/* ───── ROW 3: Productos refinados (gasolina + diésel) ───── */}
      <Panel
        title="Productos refinados · gasolina y diésel"
        subtitle="RBOB gasoline + heating oil (proxy diésel) · referencia NYMEX · nivel + variación + serie"
        marginBottom
        sourceUrl="https://finance.yahoo.com/commodities"
        sourceTooltip="Yahoo Finance · RB=F / HO=F"
      >
        <CommodityStrip symbols={['gasolina', 'diesel']} category="oil" accent={OIL} />
        <p style={{ margin: '12px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
          RBOB y heating oil son los mejores proxies públicos gratuitos de gasolina y diésel; cotizan en
          USD/galón (el crudo en USD/barril, 1 barril ≈ 42 galones). El <strong>crack spread</strong> —
          el margen de refino que sale de estos productos menos el crudo— se calcula, ya normalizado, en
          el panel siguiente.
        </p>
      </Panel>

      {/* ───── ROW 3b: Crack spread (margen de refino) ───── */}
      <Panel
        title="Crack spread · margen de refino"
        subtitle="Producto refinado − crudo, normalizado a $/bbl · gasolina, diésel y blend 3-2-1 · cálculo propio"
        marginBottom
      >
        <PetroleoCrackSpread gasolina={gasolina} diesel={diesel} brent={brent} />
      </Panel>

      {/* ───── ROW 3c: Logística energética (cross-source Puertos) ───── */}
      <Panel
        title="Logística energética · chokepoints, fletes y buques"
        subtitle="Corredores marítimos del crudo/GNL, Baltic Dry Index y conteo de petroleros · cruce con Puertos"
        marginBottom
      >
        <PetroleoLogistics />
      </Panel>

      {/* ───── ROW 3d: OPEP cuota vs producción + Reservas estratégicas ES ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="OPEP+ · objetivo vs producción"
          subtitle="Cuota grupal y recortes vigentes · dato curado con fuente y fecha"
          sourceUrl="https://www.opec.org/monthly-oil-market-report.html"
          sourceTooltip="OPEC · Monthly Oil Market Report (MOMR)"
        >
          <PetroleoOpecQuota />
        </Panel>
        <Panel
          title="Reservas estratégicas de España"
          subtitle="CORES · días de cobertura ≥90 (AIE/UE) · dato curado con fuente y fecha"
          sourceUrl="https://www.cores.es/es/seguridad-suministro/productos-petroliferos/reservas-cores"
          sourceTooltip="CORES · reservas estratégicas de productos petrolíferos"
        >
          <PetroleoReservasES />
        </Panel>
      </div>

      {/* ───── ROW 4: Dependencia ES + Geopolítica ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Dependencia petrolera de España"
          subtitle={`Importación ≈${PETROLEO_DEPENDENCIA_ES.dependencia_importacion_pct}% del crudo · orígenes ${PETROLEO_DEPENDENCIA_ES.ano_ref}`}
          sourceUrl={PETROLEO_DEPENDENCIA_ES.fuente_url}
          sourceTooltip="CORES · estadística de aprovisionamiento de crudo"
        >
          <DependenciaES />
        </Panel>
        <Panel
          title="Geopolítica del crudo"
          subtitle="Chokepoints y exposición · enlace al módulo de geopolítica"
        >
          <GeopoliticaBox />
        </Panel>
      </div>

      {/* ───── ROW 5: Empresas (Repsol/Cepsa + majors) · primitiva compartida ───── */}
      <div style={{ marginBottom: 14 }}>
        <CompanyQuotePanel
          energias={['petroleo']}
          title="Empresas petroleras"
          subtitle="Españolas (Repsol · Cepsa) y majors integradas globales · cotización"
        />
      </div>

      {/* Inteligencia operativa sectorial */}
      <SectorIntelPanel
        sector="energia"
        compact
        detailHref="/commodities?category=energy"
        detailLabel="Ver futuros · Vesper →"
      />

      {/* Cuaderno · notas que mencionan al sector energía */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="energia" name="Sector Energía" accentColor="#F59E0B" />
      </div>
    </>
  )
}

export default PetroleoView

// ─── Helpers de datos ────────────────────────────────────────────────────
function seriesOf(data: DataMap | null, sym: EnergyCommoditySymbol): EnergyCommoditySeries | null {
  const r = data?.[sym]
  return r?.ok ? r.data ?? null : null
}

// ─── Footer del KPI hero (variación 24h o nota de degradación) ───────────────
// Los KPIs del hero usan ahora la primitiva compartida <HeroKpis>, que sólo
// admite un `footer` textual; aquí componemos la variación 24h o el pending.
function chgFooter(chg: number | null, pending?: string): string | undefined {
  if (chg != null && Number.isFinite(chg)) {
    return `${chg >= 0 ? '⇡' : '⇣'} ${Math.abs(chg).toFixed(2)}% · 24h`
  }
  return pending
}

// ─── Precios crudo · serie con selector Brent/WTI/OPEP ───────────────────────
const CRUDE_COLORS: Record<string, string> = { brent: '#0F766E', wti: '#0EA5E9', opec: '#B45309' }

function CrudePricesChart({
  brent,
  wti,
  opec,
  loading,
}: {
  brent: EnergyCommoditySeries | null
  wti: EnergyCommoditySeries | null
  opec: EnergyCommoditySeries | null
  loading: boolean
}) {
  const available = useMemo(
    () => [
      { key: 'brent', label: 'Brent', s: brent },
      { key: 'wti', label: 'WTI', s: wti },
      { key: 'opec', label: 'OPEP', s: opec },
    ].filter((x) => x.s && x.s.series.length > 1),
    [brent, wti, opec],
  )
  const [active, setActive] = useState<string>('brent')
  // Si el activo no tiene datos, saltar al primero disponible.
  const current = available.find((x) => x.key === active) ?? available[0]

  if (loading) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Cargando series de crudo…</div>
  }
  if (available.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        Sin series de crudo disponibles ahora. El endpoint recorre Alpha Vantage (rate-limit 25/día),
        Nasdaq Data Link (cesta OPEP) y Yahoo Finance; si todas fallan se muestra este estado honesto.
        Reintenta en unos minutos.
      </div>
    )
  }

  const s = current.s as EnergyCommoditySeries

  return (
    <div>
      {/* Selector de referencia */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {available.map((x) => {
          const on = x.key === current.key
          const col = CRUDE_COLORS[x.key] ?? OIL
          return (
            <button
              key={x.key}
              onClick={() => setActive(x.key)}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '5px 14px',
                borderRadius: 999,
                border: `1px solid ${on ? col : '#E5E7EB'}`,
                background: on ? col : '#fff',
                color: on ? '#fff' : '#3a3a3d',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {x.label}
            </button>
          )
        })}
      </div>

      {/* Métricas inline */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
        <InlineMetric label="Spot" value={s.latest != null ? `${s.latest.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${s.unit}` : '—'} highlight color={CRUDE_COLORS[current.key]} />
        <InlineMetric label="24h" value={pct(s.change_24h)} color={changeColor(s.change_24h)} />
        <InlineMetric label="7d" value={pct(s.change_7d)} color={changeColor(s.change_7d)} />
        <InlineMetric label="30d" value={pct(s.change_30d)} color={changeColor(s.change_30d)} />
      </div>

      <LineChart series={s.series} color={CRUDE_COLORS[current.key] ?? OIL} unit={s.unit} />

      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Fuente: {s.source_label}. Serie de cierre diario; las variaciones 7d/30d se calculan sobre el
        punto más cercano a esa distancia (tolerando fines de semana). Brent (ICE) es la referencia
        para el crudo europeo/atlántico; WTI (NYMEX) para el americano; ORB es la cesta oficial OPEP.
      </p>
    </div>
  )
}

// ─── Spread Brent-WTI · serie ────────────────────────────────────────────────
function SpreadChart({ brent, wti }: { brent: EnergyCommoditySeries | null; wti: EnergyCommoditySeries | null }) {
  const spreadSeries = useMemo(() => {
    if (!brent || !wti) return []
    const wtiByDate = new Map(wti.series.map((p) => [p.date, p.value]))
    const out: Array<{ date: string; value: number }> = []
    for (const b of brent.series) {
      const w = wtiByDate.get(b.date)
      if (w != null && Number.isFinite(w)) out.push({ date: b.date, value: b.value - w })
    }
    return out
  }, [brent, wti])

  if (spreadSeries.length < 2) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        Spread no disponible: requiere series de Brent y WTI alineadas por fecha. Si una de las dos
        viene de Alpha Vantage (spot EIA, frecuencia distinta) y la otra de Yahoo, puede no haber
        fechas comunes suficientes. Se conecta en cuanto ambas comparten calendario diario.
      </div>
    )
  }

  const last = spreadSeries[spreadSeries.length - 1]
  const avg = spreadSeries.reduce((s, p) => s + p.value, 0) / spreadSeries.length

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
        <InlineMetric label="Spread actual" value={`${last.value >= 0 ? '+' : ''}${last.value.toFixed(2)} $/bbl`} highlight color={OIL} />
        <InlineMetric label="Media periodo" value={`${avg >= 0 ? '+' : ''}${avg.toFixed(2)} $/bbl`} />
      </div>
      <LineChart series={spreadSeries} color={OIL} unit="$/bbl" zeroLine />
      <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#86868b', lineHeight: 1.5 }}>
        El spread suele ser positivo (Brent &gt; WTI) por costes de transporte transatlántico y la
        prima del crudo marino. Se amplía cuando hay exceso de oferta en EE. UU. (cuellos de botella
        en Cushing) o tensión geopolítica en rutas del Brent; se estrecha cuando aumentan las
        exportaciones de crudo americano.
      </p>
    </div>
  )
}

// ─── Dependencia ES (catálogo CORES) ─────────────────────────────────────────
function DependenciaES() {
  const d = PETROLEO_DEPENDENCIA_ES
  const maxCuota = Math.max(...d.origenes.map((o) => o.cuota_pct))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: OIL, letterSpacing: '-0.02em' }}>
          {d.dependencia_importacion_pct}%
        </span>
        <span style={{ fontSize: 12, color: '#6e6e73' }}>del crudo consumido se importa</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {d.origenes.map((o) => (
          <li key={o.pais} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 44px', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: o.pais === 'Resto' ? '#9CA3AF' : '#3a3a3d', fontWeight: o.pais === 'Resto' ? 500 : 600 }}>{o.pais}</span>
            <div style={{ height: 9, background: '#F5F5F7', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ width: `${(o.cuota_pct / maxCuota) * 100}%`, height: '100%', background: o.pais === 'Resto' ? '#CBD5E1' : OIL, transition: 'width 250ms ease' }} />
            </div>
            <span style={{ fontSize: 11.5, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f', textAlign: 'right' }}>{o.cuota_pct}%</span>
          </li>
        ))}
      </ul>
      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        {d.fuente} Datos {d.ano_ref}, orden de magnitud (las cuotas varían mes a mes según contratos spot).
      </p>
    </div>
  )
}

// ─── Geopolítica box ─────────────────────────────────────────────────────────
function GeopoliticaBox() {
  const d = PETROLEO_DEPENDENCIA_ES
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, color: '#3a3a3d', lineHeight: 1.5 }}>{d.nota}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Chokepoint name="Estrecho de Ormuz" detail="~20% del petróleo mundial · golfo Pérsico" />
        <Chokepoint name="Canal de Suez" detail="ruta Asia-Europa · crudo y refinados" />
        <Chokepoint name="Bab el-Mandeb" detail="mar Rojo · ataques al tráfico 2024" />
      </div>
      <a
        href="/geopolitica"
        style={{
          marginTop: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: OIL,
          textDecoration: 'none',
        }}
      >
        <span aria-hidden="true">⟶</span> Abrir módulo de geopolítica
      </a>
    </div>
  )
}

function Chokepoint({ name, detail }: { name: string; detail: string }) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, padding: '8px 10px', flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309' }}>{name}</div>
      <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 2, lineHeight: 1.35 }}>{detail}</div>
    </div>
  )
}

// Empresas petroleras → ahora vía <CompanyQuotePanel energias={['petroleo']} /> (shared).

// ─── Primitivas compartidas ──────────────────────────────────────────────────
function InlineMetric({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)', color: highlight ? color ?? OIL : color ?? '#1d1d1f', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function LineChart({
  series,
  color,
  unit,
  zeroLine,
}: {
  series: Array<{ date: string; value: number }>
  color: string
  unit: string
  zeroLine?: boolean
}) {
  const pts = series.filter((p) => Number.isFinite(p.value))
  if (pts.length < 2) return <div style={{ fontSize: 12, color: '#86868b' }}>Serie insuficiente.</div>

  const W = 1080, H = 220, P = 12
  const vals = pts.map((p) => p.value)
  let max = Math.max(...vals)
  let min = Math.min(...vals)
  if (zeroLine) {
    max = Math.max(max, 0)
    min = Math.min(min, 0)
  }
  const pad = (max - min) * 0.08 || 1
  max += pad
  min -= pad
  const range = max - min || 1
  const n = pts.length
  const x = (i: number) => P + (i / Math.max(1, n - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - (v - min) / range) * (H - 2 * P)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - P).toFixed(1)} L${x(0).toFixed(1)},${(H - P).toFixed(1)} Z`
  const gradId = `crudeArea_${color.replace('#', '')}`
  const zeroY = zeroLine ? y(0) : null

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} style={{ display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={P} x2={W - P} y1={P + g * (H - 2 * P)} y2={P + g * (H - 2 * P)} stroke="#F5F5F7" strokeWidth={1} />
      ))}
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.24} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {!zeroLine && <path d={area} fill={`url(#${gradId})`} stroke="none" />}
      {zeroY != null && <line x1={P} x2={W - P} y1={zeroY} y2={zeroY} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 4" />}
      <path d={line} fill="none" stroke={color} strokeWidth={2} />
      {pts.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.value)} r={5} fill="transparent" style={{ cursor: 'crosshair' }}>
          <title>{p.date}: {p.value.toLocaleString('es-ES', { maximumFractionDigits: 2 })} {unit}</title>
        </circle>
      ))}
      <text x={x(0)} y={H + 12} textAnchor="start" style={{ fontSize: 9, fill: '#86868b' }}>{pts[0].date}</text>
      <text x={x(n - 1)} y={H + 12} textAnchor="end" style={{ fontSize: 9, fill: '#86868b' }}>{pts[n - 1].date}</text>
    </svg>
  )
}

function pct(v: number | null | undefined): string {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}
function changeColor(v: number | null | undefined): string {
  if (v == null) return '#86868b'
  return v >= 0 ? '#16A34A' : '#DC2626'
}
