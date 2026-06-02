'use client'
/**
 * <GasView /> · Sprint Energía S8
 *
 * Vista "Gas" del EnergiaShell. Foto completa del gas natural + España:
 *
 *   - Hero · 4 KPIs gas (Henry Hub $/MMBtu · TTF €/MWh · almacenamiento UE %
 *     lleno · almacenamiento ES % lleno). Spot/serie reales + AGSI.
 *   - Precios gas (series): Henry Hub histórico (commodities S7). TTF si
 *     aparece fuente; si no, empty-state marcado. MIBGAS (hub español) sin
 *     fuente gratuita fiable → empty marcado (contexto en catálogo).
 *   - Almacenamiento gas Europa + ES (GIE AGSI): % lleno + evolución estacional
 *     + inyección/extracción (GWh/d). Gráfico de nivel de llenado.
 *   - Importaciones GNL ES (catálogo Enagás/CORES): plantas de regasificación +
 *     orígenes del GNL + dependencia/diversificación.
 *   - Empresas: Naturgy/Enagás (ES) + majors gas (Shell/TotalEnergies/Equinor/
 *     ExxonMobil/Chevron/ENGIE) · strip cotización Finnhub.
 *   - <SectorIntelPanel sector="energia" compact />.
 *
 * Fuentes reales: GIE AGSI+ (almacenamiento · requiere GIE_API_KEY gratis),
 * Alpha Vantage/Nasdaq DL/Yahoo (Henry Hub · cascada), Finnhub (cotización),
 * catálogo Enagás/CORES (GNL). Empty-state honesto cuando falta dato
 * (CLAUDE.md). Cero emojis · Unicode (⇡ ⇣ ⟶ ◐).
 */
import { useEffect, useMemo, useState } from 'react'
import { Panel } from '@/components/SectorPanel'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { GNL_ESPANA, EMPRESAS_ENERGIA } from '@/lib/energia/catalog'
import type {
  EnergyCommodityResponse,
  EnergyCommoditySeries,
  EnergyCommoditySymbol,
  GasStorage,
  GasStorageResponse,
} from '@/lib/energia/types'
import CommodityStrip from './CommodityStrip'

const GAS = '#1D4ED8'
const GAS_DARK = '#1E3A8A'

type DataMap = Record<string, EnergyCommodityResponse>

export function GasView() {
  const [commodities, setCommodities] = useState<DataMap | null>(null)
  const [euStorage, setEuStorage] = useState<GasStorage | null>(null)
  const [esStorage, setEsStorage] = useState<GasStorage | null>(null)
  const [storageErr, setStorageErr] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [comm, eu, es] = await Promise.all([
      fetch('/api/energia/commodities?category=gas&days=90', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/energia/gas-storage?country=eu&days=120', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/energia/gas-storage?country=es&days=120', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
    setCommodities((comm?.data as DataMap) ?? {})
    const euResp = eu as GasStorageResponse | null
    const esResp = es as GasStorageResponse | null
    setEuStorage(euResp?.ok ? euResp.data ?? null : null)
    setEsStorage(esResp?.ok ? esResp.data ?? null : null)
    // Un único mensaje de degradación (la key suele faltar para ambos a la vez).
    setStorageErr(euResp?.ok ? null : euResp?.error ?? esResp?.error ?? 'sin datos')
    setUpdatedAt(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const henry = seriesOf(commodities, 'henry-hub')
  const ttf = seriesOf(commodities, 'ttf')

  return (
    <>
      {/* ───── HERO con KPIs gas ───── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${GAS} 0%, ${GAS_DARK} 100%)`,
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
            SECTORIAL · ENERGÍA Y SUMINISTROS · GAS
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.024em', margin: '0 0 10px', lineHeight: 1.05 }}>
            Gas natural <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.75 }}>en España y Europa</em>
          </h1>
          <p style={{ fontSize: 13, opacity: 0.82, margin: 0, lineHeight: 1.5 }}>
            Precios del gas de referencia (Henry Hub US, TTF europeo), nivel de llenado de los
            almacenamientos de Europa y España (GIE AGSI+), las plantas de regasificación de GNL
            españolas (la mayor capacidad de la UE) y la diversificación de orígenes tras 2022.
          </p>
          {updatedAt && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#93C5FD', boxShadow: '0 0 8px #93C5FD' }} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          <HeroKPI label="Henry Hub" value={henry?.latest ?? null} unit="$/MMBtu" chg={henry?.change_24h ?? null} accent="#93C5FD" pending={henry ? undefined : 'sin dato'} />
          <HeroKPI label="TTF (hub UE)" value={ttf?.latest ?? null} unit="€/MWh" chg={ttf?.change_24h ?? null} accent="#BFDBFE" pending={ttf ? undefined : 'sin fuente'} />
          <HeroKPI label="Almacén UE" value={euStorage?.full_pct ?? null} unit="% lleno" accent="#DBEAFE" sub={euStorage ? faseLabel(euStorage.fase) : undefined} pending={euStorage ? undefined : 'GIE AGSI'} />
          <HeroKPI label="Almacén ES" value={esStorage?.full_pct ?? null} unit="% lleno" accent="#A7C7FF" sub={esStorage ? faseLabel(esStorage.fase) : undefined} pending={esStorage ? undefined : 'GIE AGSI'} />
        </div>
      </section>

      {/* ───── ROW 1: Precios gas (series) ───── */}
      <Panel
        title="Precios del gas · serie histórica"
        subtitle="Henry Hub (US · NYMEX) · TTF (hub europeo) · MIBGAS (hub español)"
        marginBottom
        sourceUrl="https://www.alphavantage.co/documentation/#commodities"
        sourceTooltip="Alpha Vantage NATURAL_GAS (Henry Hub) · TTF/MIBGAS sin fuente gratuita fiable"
      >
        <GasPricesChart henry={henry} ttf={ttf} loading={loading} />
      </Panel>

      {/* ───── ROW 2: Almacenamiento gas (AGSI) ───── */}
      <Panel
        title="Almacenamiento de gas · Europa y España"
        subtitle="Nivel de llenado (% lleno) y ciclo estacional inyección/extracción · GIE AGSI+"
        marginBottom
        sourceUrl="https://agsi.gie.eu"
        sourceTooltip="GIE AGSI+ · Aggregated Gas Storage Inventory"
      >
        <StoragePanel eu={euStorage} es={esStorage} err={storageErr} loading={loading} />
      </Panel>

      {/* ───── ROW 3: GNL ES (plantas) + Dependencia/diversificación ───── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel
          title="Importaciones de GNL · plantas de regasificación"
          subtitle={`${GNL_ESPANA.plantas.filter((p) => p.estado === 'operativa').length} plantas operativas · España, mayor capacidad de la UE · ${GNL_ESPANA.ano_ref}`}
          sourceUrl={GNL_ESPANA.fuente_url}
          sourceTooltip="Enagás · operador del sistema gasista español"
        >
          <PlantasGnl />
        </Panel>
        <Panel
          title="Diversificación · orígenes del GNL"
          subtitle={`~${GNL_ESPANA.cuota_gnl_pct}% del gas llega como GNL · resto por gasoducto (Argelia)`}
          sourceUrl={GNL_ESPANA.fuente_url}
          sourceTooltip="Enagás / CORES · estadística de hidrocarburos"
        >
          <OrigenesGnl />
        </Panel>
      </div>

      {/* ───── ROW 4: Empresas (Naturgy/Enagás + majors) ───── */}
      <div style={{ marginBottom: 14 }}>
        <EmpresasGas />
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

export default GasView

// ─── Helpers de datos ────────────────────────────────────────────────────
function seriesOf(data: DataMap | null, sym: EnergyCommoditySymbol): EnergyCommoditySeries | null {
  const r = data?.[sym]
  return r?.ok ? r.data ?? null : null
}

function faseLabel(fase: GasStorage['fase']): string {
  if (fase === 'inyeccion') return 'inyectando'
  if (fase === 'extraccion') return 'extrayendo'
  if (fase === 'equilibrio') return 'en equilibrio'
  return ''
}

// ─── HeroKPI ──────────────────────────────────────────────────────────────
function HeroKPI({
  label,
  value,
  unit,
  accent,
  sub,
  chg,
  pending,
}: {
  label: string
  value: number | null | undefined
  unit: string
  accent: string
  sub?: string
  chg?: number | null
  pending?: string
}) {
  const display = value == null ? '—' : value.toLocaleString('es-ES', { maximumFractionDigits: Math.abs(value) >= 100 ? 1 : 2 })
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.72, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: accent }}>
        {display}
        {unit && value != null && <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 5, opacity: 0.85 }}>{unit}</span>}
      </div>
      {value != null && chg != null ? (
        <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2, color: chg >= 0 ? '#86EFAC' : '#FCA5A5' }}>
          {chg >= 0 ? '⇡' : '⇣'} {Math.abs(chg).toFixed(2)}% · 24h
        </div>
      ) : value != null && sub ? (
        <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 2 }}>{sub}</div>
      ) : value == null && pending ? (
        <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 2 }}>{pending}</div>
      ) : null}
    </div>
  )
}

// ─── Precios gas · serie con selector Henry Hub / TTF / MIBGAS ───────────────
const GAS_COLORS: Record<string, string> = { 'henry-hub': '#1D4ED8', ttf: '#7C3AED', mibgas: '#0891B2' }

function GasPricesChart({
  henry,
  ttf,
  loading,
}: {
  henry: EnergyCommoditySeries | null
  ttf: EnergyCommoditySeries | null
  loading: boolean
}) {
  const available = useMemo(
    () => [
      { key: 'henry-hub', label: 'Henry Hub', s: henry },
      { key: 'ttf', label: 'TTF', s: ttf },
    ].filter((x) => x.s && x.s.series.length > 1),
    [henry, ttf],
  )
  const [active, setActive] = useState<string>('henry-hub')
  const current = available.find((x) => x.key === active) ?? available[0]

  if (loading) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Cargando series de gas…</div>
  }
  if (available.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.5 }}>
        Sin series de gas disponibles ahora. El endpoint recorre Alpha Vantage (NATURAL_GAS →
        Henry Hub, rate-limit 25/día) y Yahoo Finance. <strong>TTF</strong> (hub europeo) y
        <strong> MIBGAS</strong> (hub español) no tienen fuente gratuita fiable en las APIs
        configuradas, por lo que se muestran como pendientes. Reintenta en unos minutos.
      </div>
    )
  }

  const s = current.s as EnergyCommoditySeries

  return (
    <div>
      {/* Selector de hub */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {available.map((x) => {
          const on = x.key === current.key
          const col = GAS_COLORS[x.key] ?? GAS
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
        {/* Pendientes marcados (sin fuente) */}
        {!ttf && <PendingChip label="TTF · sin fuente gratuita" />}
        <PendingChip label="MIBGAS · sin fuente gratuita" />
      </div>

      {/* Métricas inline */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
        <InlineMetric label="Spot" value={s.latest != null ? `${s.latest.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ${s.unit}` : '—'} highlight color={GAS_COLORS[current.key]} />
        <InlineMetric label="24h" value={pct(s.change_24h)} color={changeColor(s.change_24h)} />
        <InlineMetric label="7d" value={pct(s.change_7d)} color={changeColor(s.change_7d)} />
        <InlineMetric label="30d" value={pct(s.change_30d)} color={changeColor(s.change_30d)} />
      </div>

      <LineChart series={s.series} color={GAS_COLORS[current.key] ?? GAS} unit={s.unit} />

      <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Fuente: {s.source_label}. Henry Hub (NYMEX) es el benchmark del gas en EE. UU.; el TTF
        neerlandés es la referencia del gas en Europa y el MIBGAS el hub español. TTF y MIBGAS
        cotizan en €/MWh y no se exponen en las APIs gratuitas configuradas, por lo que aparecen
        como pendientes hasta conectar una fuente (p. ej. ICE o el propio MIBGAS).
      </p>
    </div>
  )
}

function PendingChip({ label }: { label: string }) {
  return (
    <span
      title="Sin fuente gratuita fiable en las APIs configuradas"
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        padding: '5px 12px',
        borderRadius: 999,
        border: '1px dashed #CBD5E1',
        background: '#F8FAFC',
        color: '#94A3B8',
      }}
    >
      {label}
    </span>
  )
}

// ─── Almacenamiento (AGSI) · nivel UE + ES + estacional ──────────────────────
function StoragePanel({
  eu,
  es,
  err,
  loading,
}: {
  eu: GasStorage | null
  es: GasStorage | null
  err: string | null
  loading: boolean
}) {
  const [zone, setZone] = useState<'eu' | 'es'>('eu')

  if (loading) {
    return <div style={{ fontSize: 12, color: '#86868b' }}>Cargando almacenamiento de gas…</div>
  }
  if (!eu && !es) {
    const keyMissing = /no_key|GIE_API_KEY|unauthorized|api key/i.test(err ?? '')
    return (
      <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.55 }}>
        <p style={{ margin: '0 0 8px' }}>
          Almacenamiento de gas no disponible ahora{err ? ` (${err.split('·')[0].trim()})` : ''}.
        </p>
        {keyMissing ? (
          <p style={{ margin: 0 }}>
            La API de <strong>GIE AGSI+</strong> requiere una clave gratuita pero obligatoria.
            Regístrate en{' '}
            <a href="https://agsi.gie.eu/account" target="_blank" rel="noreferrer" style={{ color: GAS, fontWeight: 600, textDecoration: 'none' }}>
              agsi.gie.eu/account
            </a>{' '}
            y añade <code style={{ fontFamily: 'monospace', background: '#F1F5F9', padding: '1px 4px', borderRadius: 3 }}>GIE_API_KEY</code> en
            las variables de entorno de Vercel. Mientras tanto, el resto de la vista (precios,
            GNL, empresas) sigue operativa.
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            La fuente (GIE AGSI+) no respondió. Se reintenta automáticamente; los datos son
            diarios (gas-day) y se cachean 6 horas.
          </p>
        )}
      </div>
    )
  }

  const current = zone === 'eu' ? eu : es
  const other = zone === 'eu' ? es : eu

  return (
    <div>
      {/* Selector de zona */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['eu', 'es'] as const).map((z) => {
          const on = z === zone
          const enabled = z === 'eu' ? !!eu : !!es
          const label = z === 'eu' ? 'Unión Europea' : 'España'
          return (
            <button
              key={z}
              onClick={() => enabled && setZone(z)}
              disabled={!enabled}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: '5px 14px',
                borderRadius: 999,
                border: `1px solid ${on ? GAS : '#E5E7EB'}`,
                background: on ? GAS : '#fff',
                color: !enabled ? '#C0C0C5' : on ? '#fff' : '#3a3a3d',
                cursor: enabled ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {current ? (
        <>
          {/* KPIs del nivel actual */}
          <div style={{ display: 'flex', gap: 28, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>% lleno</div>
              <div style={{ fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-display)', color: GAS, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {current.full_pct != null ? `${current.full_pct.toFixed(1)}%` : '—'}
              </div>
            </div>
            <FillBar pct={current.full_pct} />
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
            <InlineMetric label="Gas almacenado" value={current.gas_in_storage_twh != null ? `${current.gas_in_storage_twh.toLocaleString('es-ES', { maximumFractionDigits: 1 })} TWh` : '—'} />
            <InlineMetric label="Capacidad técnica" value={current.working_gas_volume_twh != null ? `${current.working_gas_volume_twh.toLocaleString('es-ES', { maximumFractionDigits: 1 })} TWh` : '—'} />
            <InlineMetric label="Inyección" value={current.injection_gwh != null ? `${current.injection_gwh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} GWh/d` : '—'} color="#16A34A" />
            <InlineMetric label="Extracción" value={current.withdrawal_gwh != null ? `${current.withdrawal_gwh.toLocaleString('es-ES', { maximumFractionDigits: 0 })} GWh/d` : '—'} color="#DC2626" />
            <InlineMetric label="Fase" value={faseLabel(current.fase) || '—'} color={current.fase === 'extraccion' ? '#DC2626' : current.fase === 'inyeccion' ? '#16A34A' : '#6e6e73'} />
          </div>

          {/* Serie de nivel de llenado */}
          <FillSeriesChart series={current.series} />

          <p style={{ margin: '8px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
            GIE AGSI+ · gas-day {current.latest_date ?? '—'}. El nivel de llenado sigue un ciclo
            estacional: se <strong>inyecta</strong> en verano (precios bajos, demanda baja) y se
            <strong> extrae</strong> en invierno. La UE fijó objetivos de llenado mínimos (≈90% a
            1 de noviembre) tras la crisis de 2022. {other ? `${other.zone_label}: ${other.full_pct != null ? other.full_pct.toFixed(1) + '% lleno' : 'sin dato'}.` : ''}
          </p>
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#86868b' }}>Zona sin datos disponibles ahora.</div>
      )}
    </div>
  )
}

function FillBar({ pct }: { pct: number | null }) {
  const v = pct ?? 0
  // Color por nivel: rojo bajo, ámbar medio, verde alto.
  const col = v >= 70 ? '#16A34A' : v >= 40 ? '#D97706' : '#DC2626'
  return (
    <div style={{ flex: '1 1 240px', minWidth: 200 }}>
      <div style={{ height: 16, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: '100%', background: col, transition: 'width 300ms ease' }} />
        {/* marca objetivo 90% */}
        <div style={{ position: 'absolute', left: '90%', top: 0, bottom: 0, width: 2, background: '#1d1d1f', opacity: 0.35 }} title="Objetivo UE ≈90% a 1-nov" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, color: '#94A3B8' }}>
        <span>0%</span>
        <span>objetivo UE ~90%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

function FillSeriesChart({ series }: { series: GasStorage['series'] }) {
  const pts = useMemo(
    () => series.filter((p) => p.full_pct != null).map((p) => ({ date: p.date, value: p.full_pct as number })),
    [series],
  )
  if (pts.length < 2) {
    return <div style={{ fontSize: 11.5, color: '#86868b' }}>Serie de llenado insuficiente para graficar.</div>
  }
  return <LineChart series={pts} color={GAS} unit="% lleno" yMax={100} yMin={0} />
}

// ─── GNL · plantas de regasificación (catálogo) ──────────────────────────────
function PlantasGnl() {
  const plantas = GNL_ESPANA.plantas
  const maxEmision = Math.max(...plantas.map((p) => p.emision_gwh_dia ?? 0), 1)
  return (
    <div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plantas.map((p) => {
          const op = p.estado === 'operativa'
          return (
            <li key={p.nombre} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 86px', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: op ? '#1d1d1f' : '#94A3B8' }}>{p.nombre}</div>
                <div style={{ fontSize: 9.5, color: '#86868b' }}>{p.ubicacion}</div>
              </div>
              <div style={{ height: 9, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${((p.emision_gwh_dia ?? 0) / maxEmision) * 100}%`,
                    height: '100%',
                    background: op ? GAS : '#CBD5E1',
                    transition: 'width 250ms ease',
                  }}
                />
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: op ? '#1d1d1f' : '#94A3B8', textAlign: 'right' }}>
                {p.emision_gwh_dia != null ? `${p.emision_gwh_dia} GWh/d` : 'puesta en marcha'}
              </span>
            </li>
          )
        })}
      </ul>
      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        Capacidad de emisión (regasificación) en GWh/día, orden de magnitud · {GNL_ESPANA.fuente}
        {' '}España concentra ~1/3 de la capacidad de regasificación de la UE, pero su escasa
        interconexión por gasoducto con el centro de Europa limita su papel como puerta de entrada.
      </p>
    </div>
  )
}

// ─── GNL · orígenes (catálogo) ───────────────────────────────────────────────
function OrigenesGnl() {
  const d = GNL_ESPANA
  const max = Math.max(...d.origenes.map((o) => o.cuota_pct))
  return (
    <div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {d.origenes.map((o) => {
          const resto = o.pais === 'Resto'
          return (
            <li key={o.pais} style={{ display: 'grid', gridTemplateColumns: '128px 1fr 40px', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: resto ? '#9CA3AF' : '#3a3a3d', fontWeight: resto ? 500 : 600 }}>{o.pais}</span>
              <div style={{ height: 9, background: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${(o.cuota_pct / max) * 100}%`, height: '100%', background: resto ? '#CBD5E1' : GAS, transition: 'width 250ms ease' }} />
              </div>
              <span style={{ fontSize: 11.5, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1d1d1f', textAlign: 'right' }}>{o.cuota_pct}%</span>
            </li>
          )
        })}
      </ul>
      <p style={{ margin: '12px 0 0', fontSize: 10, color: '#A0A0A5', lineHeight: 1.5 }}>
        {d.nota}
      </p>
    </div>
  )
}

// ─── Empresas gas (Finnhub) ──────────────────────────────────────────────────
interface Quote {
  slug: string
  symbol: string | null
  name: string
  rol: string
  es_espanola: boolean
  price: number | null
  change_percent: number | null
  available: boolean
}

// Españolas gasistas (Naturgy comercializa · Enagás infraestructura) + majors con
// fuerte negocio de gas/GNL.
const GAS_COMPANY_SLUGS = ['naturgy', 'enagas', 'engie', 'totalenergies', 'shell', 'equinor', 'exxonmobil', 'chevron']

function rolFor(slug: string): string {
  if (slug === 'naturgy') return 'ES · gas + integrada'
  if (slug === 'enagas') return 'ES · infraestructura gasista'
  if (slug === 'engie') return 'UE · gas + utility'
  if (slug === 'equinor') return 'Mayor exportador de gas a Europa'
  return 'Major · gas / GNL'
}

function EmpresasGas() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const companies = GAS_COMPANY_SLUGS.map((slug) => EMPRESAS_ENERGIA.find((c) => c.slug === slug)).filter(
        (c): c is NonNullable<typeof c> => !!c,
      )
      const qs = await Promise.all(
        companies.map(async (c): Promise<Quote> => {
          const base: Quote = {
            slug: c.slug,
            symbol: c.ticker || null,
            name: c.nombre,
            rol: rolFor(c.slug),
            es_espanola: c.es_espanola,
            price: null,
            change_percent: null,
            available: false,
          }
          if (!c.ticker) return base
          try {
            const r = await fetch(`/api/finnhub/quote/${encodeURIComponent(c.ticker)}`, { cache: 'no-store' })
            const j: any = await r.json()
            if (j?.ok && j.price != null) {
              return { ...base, price: j.price, change_percent: j.change_percent ?? null, available: true }
            }
          } catch {
            /* degradación silenciosa */
          }
          return base
        }),
      )
      if (alive) setQuotes(qs)
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
            Empresas del gas
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Españolas (Naturgy · Enagás) y majors con negocio de gas/GNL · cotización
          </p>
        </div>
        <a href="https://finnhub.io" target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: GAS, textDecoration: 'none' }}>
          Finnhub · tiempo real
        </a>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {quotes == null &&
          Array.from({ length: GAS_COMPANY_SLUGS.length }).map((_, i) => (
            <div key={i} style={{ height: 86, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }} />
          ))}
        {quotes?.map((q) => (
          <div key={q.slug} style={{ padding: '10px 12px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {q.name}
            </div>
            <div style={{ fontSize: 9.5, color: '#86868b', fontFamily: 'monospace', marginTop: 1 }}>{q.symbol ?? '—'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 5, gap: 6 }}>
              {q.available ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>
                    {q.price!.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                  </span>
                  {q.change_percent != null && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: q.change_percent >= 0 ? '#16A34A' : '#DC2626' }}>
                      {q.change_percent >= 0 ? '⇡' : '⇣'} {Math.abs(q.change_percent).toFixed(2)}%
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 10.5, color: '#C0C0C5' }} title={q.symbol ? 'Sin cotización (rate-limit o ticker no soportado en free tier)' : 'Empresa privada · no cotiza en bolsa'}>
                  {q.symbol ? '— sin cotización' : '— no cotiza'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 9, color: GAS, fontWeight: 700, marginTop: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {q.rol}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Primitivas compartidas ──────────────────────────────────────────────────
function InlineMetric({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-display)', color: highlight ? color ?? GAS : color ?? '#1d1d1f', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function LineChart({
  series,
  color,
  unit,
  yMax,
  yMin,
}: {
  series: Array<{ date: string; value: number }>
  color: string
  unit: string
  /** Fija el techo del eje Y (ej. 100 para %). */
  yMax?: number
  /** Fija el suelo del eje Y (ej. 0 para %). */
  yMin?: number
}) {
  const pts = series.filter((p) => Number.isFinite(p.value))
  if (pts.length < 2) return <div style={{ fontSize: 12, color: '#86868b' }}>Serie insuficiente.</div>

  const W = 1080, H = 220, P = 12
  const vals = pts.map((p) => p.value)
  let max = yMax != null ? yMax : Math.max(...vals)
  let min = yMin != null ? yMin : Math.min(...vals)
  if (yMax == null || yMin == null) {
    const pad = (max - min) * 0.08 || 1
    if (yMax == null) max += pad
    if (yMin == null) min -= pad
  }
  const range = max - min || 1
  const n = pts.length
  const x = (i: number) => P + (i / Math.max(1, n - 1)) * (W - 2 * P)
  const y = (v: number) => P + (1 - (v - min) / range) * (H - 2 * P)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)},${(H - P).toFixed(1)} L${x(0).toFixed(1)},${(H - P).toFixed(1)} Z`
  const gradId = `gasArea_${color.replace('#', '')}`

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
      <path d={area} fill={`url(#${gradId})`} stroke="none" />
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
