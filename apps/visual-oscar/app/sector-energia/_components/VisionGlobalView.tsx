'use client'
/**
 * <VisionGlobalView /> · Sprint Energía v3 · E9 (cuadro de mando ejecutivo)
 *
 * Landing cross-energía del shell /sector-energia (sección por defecto). Es un
 * RESUMEN EJECUTIVO: snapshots, no detalle. El detalle de cada commodity/serie
 * vive en su pestaña canónica (Petróleo/Gas/Eléctrico…). Aquí, de un vistazo:
 *
 *   - Hero con 8 KPIs vivos (primitiva compartida <HeroKpis />).
 *   - <GlobalEnergyStatus /> · semáforo cross-energía (precios + almacenamiento
 *     gas + riesgo suministro) con 1 línea de lectura para el analista.
 *   - <CommoditySnapshot /> · SNAPSHOT de commodities (valor + cambio %), sin
 *     series largas (de-dup: las series están en Petróleo/Gas).
 *   - <WorldEnergyMap /> · mapa mundial Ember (S2).
 *   - <SupplyRiskGauge /> · semáforo de dimensiones, ENRIQUECIDO con el riesgo
 *     país ponderado de proveedores (prop opcional retrocompatible).
 *   - <GlobalSupplyRiskBoard /> · tabla proveedores por riesgo país (cuota ×
 *     riesgo), V-Dem + sanciones (seed estructural).
 *   - <GlobalEnergyInflation /> · cruce Macro↔Energía (IPC energía vs general,
 *     IPI, EUR/USD + passthrough Brent).
 *   - <SupplyRiskBriefPanel /> · síntesis IA del riesgo (Gemini → heurístico).
 *   - Strip de cotización · majors + utilities (Finnhub) · Áreas estratégicas.
 *   - <SectorIntelPanel sector="energia" compact />
 *
 * De-dup E9: se ELIMINÓ <EnergyPriceMatrix /> (matriz de SERIES con sparkline
 * 24h/7d/30d) de esta vista — las series viven en Petróleo/Gas. Aquí queda solo
 * el SNAPSHOT (valor + cambio %), fiel al principio "Visión Global = snapshots".
 *
 * Fuentes reales: ESIOS/REE (eléctrico ES), Ember (mapa global), Yahoo
 * (Brent/WTI/HenryHub snapshot), Eurostat/ECB (inflación), geopolítica seeds
 * (riesgo proveedores), Finnhub (cotización). Degradación honesta por bloque
 * (CLAUDE.md): nunca se inventan valores. Cero emojis · Unicode (◆ ◉ ⬡ ⇡ ⟶ ●).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SectorIntelPanel } from '@/components/SectorIntelPanel'
import { CuadernoEntityWidget } from '@/components/cuaderno/CuadernoEntityWidget'
import { HeroKpis, type HeroKpiItem } from './shared/HeroKpis'
import { CommoditySnapshot, type CommoditySnapshotItem } from './shared/CommoditySnapshot'
import SupplyRiskGauge from './SupplyRiskGauge'
import WorldEnergyMap from './WorldEnergyMap'
import GlobalEnergyStatus from './GlobalEnergyStatus'
import GlobalEnergyInflation from './GlobalEnergyInflation'
import GlobalSupplyRiskBoard, { type SupplyRiskGeoSummary } from './GlobalSupplyRiskBoard'

const ACCENT = '#16A34A'
const ACCENT_DARK = '#0d4626'
const REFRESH_MS = 5 * 60 * 1000

// ── Tipos de las respuestas reutilizadas ─────────────────────────────────────
interface EsiosIndicator {
  slug: string
  short: string
  unit: string
  latest: { value: number; datetime: string } | null
  change_pct: number | null
}
interface EsiosSnapshotResp {
  ok: boolean
  indicators: Record<string, EsiosIndicator>
}
interface CommoditySnapshotDto {
  slug: string
  last_price: number | null
  change_pct: number | null
  currency?: string | null
  available?: boolean
}
interface SnapshotAllResp {
  items: CommoditySnapshotDto[]
}

export function VisionGlobalView() {
  const [esios, setEsios] = useState<EsiosSnapshotResp | null>(null)
  const [commod, setCommod] = useState<Map<string, CommoditySnapshotDto>>(new Map())
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  // True cuando AMBAS fuentes principales (ESIOS + commodities) fallan a la vez:
  // los KPIs y el snapshot degradan a "—" y mostramos una línea de estado que
  // explica que no es un dato cero, sino datos no disponibles ahora.
  const [bothDown, setBothDown] = useState(false)
  // Resumen del riesgo país de proveedores (lo calcula <GlobalSupplyRiskBoard>
  // tras su fetch; lo elevamos aquí para alimentar el semáforo y el gauge sin
  // volver a pegar al endpoint).
  const [geoRisk, setGeoRisk] = useState<SupplyRiskGeoSummary | null>(null)

  const refresh = async () => {
    setLoading(true)
    const [e, c] = await Promise.all([
      fetch('/api/esios/snapshot', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<EsiosSnapshotResp>) : null))
        .catch(() => null),
      fetch('/api/commodities/snapshot-all?category=energy', { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<SnapshotAllResp>) : null))
        .catch(() => null),
    ])
    setEsios(e)
    const m = new Map<string, CommoditySnapshotDto>()
    for (const it of c?.items ?? []) m.set(it.slug, it)
    setCommod(m)
    setBothDown(e == null && c == null)
    setUpdatedAt(new Date())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  const ind = esios?.indicators ?? {}
  const com = (slug: string) => commod.get(slug)

  // ── 8 KPIs del hero (primitiva compartida <HeroKpis />) ───────────────────
  const brent = com('crude-oil-brent')
  const henry = com('natural-gas-henryhub')
  const arrow = (chg: number | null | undefined): string | undefined =>
    chg == null ? undefined : `${chg >= 0 ? '⇡' : '⇣'} ${Math.abs(chg).toFixed(1)}% · 24h`
  const kpis: HeroKpiItem[] = [
    { label: 'Demanda eléctrica ES', value: ind.demanda_real?.latest?.value ?? null, unit: 'MW', color: '#86EFAC' },
    { label: 'Mix renovable ES', value: ind.porcentaje_renovable?.latest?.value ?? null, unit: '%', color: '#7DD3FC' },
    {
      label: 'PVPC · tarifa hogar',
      value: ind.pvpc?.latest?.value ?? null,
      unit: '€/MWh',
      color: '#FCD34D',
      footer: arrow(ind.pvpc?.change_pct),
    },
    {
      label: 'Petróleo Brent',
      value: brent?.available ? brent.last_price ?? null : null,
      unit: '$/bbl',
      color: '#FDBA74',
      footer: brent?.available ? arrow(brent.change_pct) : 'sin dato ahora',
    },
    {
      label: 'Gas Henry Hub',
      value: henry?.available ? henry.last_price ?? null : null,
      unit: '$/MMBtu',
      color: '#A5B4FC',
      footer: henry?.available ? arrow(henry.change_pct) : 'sin dato ahora',
    },
    {
      label: 'CO2 · EUA',
      value: ind.precio_co2_eua?.latest?.value ?? null,
      unit: '€/t',
      color: '#C4B5FD',
      footer: arrow(ind.precio_co2_eua?.change_pct),
    },
    { label: 'Intensidad CO2 elec. ES', value: ind.emisiones_co2?.latest?.value ?? null, unit: 'gCO2/kWh', color: '#FCA5A5' },
    {
      label: 'Spot OMIE',
      value: ind.mercado_spot?.latest?.value ?? null,
      unit: '€/MWh',
      color: '#86EFAC',
      footer: arrow(ind.mercado_spot?.change_pct),
    },
  ]

  // ── Snapshot de commodities (valor + cambio %, SIN series) ────────────────
  // De-dup: las series largas de Brent/WTI/Henry Hub viven en Petróleo/Gas.
  const snap = (label: string, slug: string, unit: string, color: string): CommoditySnapshotItem => {
    const c = com(slug)
    return {
      label,
      value: c?.available ? c.last_price ?? null : null,
      unit,
      change: c?.change_pct ?? null,
      color,
    }
  }
  const commoditySnapshots: CommoditySnapshotItem[] = [
    snap('Brent', 'crude-oil-brent', '$/bbl', '#0F766E'),
    snap('WTI', 'crude-oil-wti', '$/bbl', '#0F766E'),
    snap('Henry Hub', 'natural-gas-henryhub', '$/MMBtu', '#0EA5E9'),
    // Eléctrico/CO2 desde ESIOS (snapshot, no serie).
    {
      label: 'Spot OMIE',
      value: ind.mercado_spot?.latest?.value ?? null,
      unit: '€/MWh',
      change: ind.mercado_spot?.change_pct ?? null,
      color: '#16A34A',
    },
    {
      label: 'PVPC',
      value: ind.pvpc?.latest?.value ?? null,
      unit: '€/MWh',
      change: ind.pvpc?.change_pct ?? null,
      color: '#16A34A',
    },
    {
      label: 'CO2 · EUA',
      value: ind.precio_co2_eua?.latest?.value ?? null,
      unit: '€/t',
      change: ind.precio_co2_eua?.change_pct ?? null,
      color: '#7C3AED',
    },
  ]

  return (
    <>
      {/* ───── HERO · 8 KPIs vivos ───── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
          borderRadius: 18,
          padding: '28px 36px',
          marginBottom: 18,
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ maxWidth: 640 }}>
            <p
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.16em',
                opacity: 0.8,
                textTransform: 'uppercase',
                margin: '0 0 8px',
              }}
            >
              SECTORIAL · ENERGÍA Y SUMINISTROS · VISIÓN GLOBAL
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: '-0.024em',
                margin: '0 0 10px',
                lineHeight: 1.05,
              }}
            >
              El sistema energético <em style={{ fontWeight: 300, fontStyle: 'italic', opacity: 0.75 }}>de un vistazo</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.82, margin: 0, lineHeight: 1.5 }}>
              Cuadro de mando ejecutivo: estado del sistema, snapshots de precios, inflación energética
              y riesgo de suministro. El detalle de cada commodity y sus series vive en su pestaña
              (Petróleo, Gas, Eléctrico…). Navega desde la barra superior.
            </p>
          </div>
          {updatedAt && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, opacity: 0.75 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#86EFAC', boxShadow: '0 0 8px #86EFAC' }} />
              {updatedAt.toLocaleTimeString('es-ES')}
              <button
                onClick={refresh}
                style={{
                  fontSize: 10.5,
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.35)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ↻ Actualizar
              </button>
            </div>
          )}
        </div>

        {bothDown && !loading && (
          <div
            role="status"
            style={{
              marginBottom: 14,
              fontSize: 11.5,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
            }}
          >
            ● Datos no disponibles ahora: las fuentes de mercado (ESIOS y commodities) no respondieron.
            Puede ser un fallo transitorio o falta de configuración de claves. Reintenta con ↻ Actualizar.
          </div>
        )}

        <HeroKpis items={kpis} loading={loading && !updatedAt} />
      </section>

      {/* ───── Semáforo cross-energía · estado sintético + 1 línea ───── */}
      <div style={{ marginBottom: 14 }}>
        <GlobalEnergyStatus
          petroleoGeoRisk={geoRisk?.petroleoGeoRisk ?? null}
          gasGeoRisk={geoRisk?.gasGeoRisk ?? null}
        />
      </div>

      {/* ───── Snapshot de commodities (valor + cambio %, SIN series) ───── */}
      <section
        style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px', marginBottom: 14 }}
      >
        <header style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
              Snapshot de precios energéticos
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
              Valor actual + cambio 24h · las series completas viven en Petróleo, Gas y Eléctrico
            </p>
          </div>
          <Link href="/sector-energia?energia=petroleo" style={{ fontSize: 11, color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>
            Series y forward curve ⟶
          </Link>
        </header>
        <CommoditySnapshot items={commoditySnapshots} />
      </section>

      {/* ───── Mapa mundial de electricidad (Ember · S2) ───── */}
      <div style={{ marginBottom: 14 }}>
        <WorldEnergyMap />
      </div>

      {/* ───── Semáforo de dimensiones · ENRIQUECIDO con riesgo país proveedores ───── */}
      <div style={{ marginBottom: 14 }}>
        <SupplyRiskGauge
          petroleoGeoRisk={geoRisk?.petroleoGeoRisk ?? null}
          gasGeoRisk={geoRisk?.gasGeoRisk ?? null}
          petroleoCuotaIdentificada={geoRisk?.petroleoCuotaIdentificada ?? null}
          gasCuotaIdentificada={geoRisk?.gasCuotaIdentificada ?? null}
        />
      </div>

      {/* ───── Tabla proveedores por riesgo país (alimenta el gauge vía onData) ───── */}
      <div style={{ marginBottom: 14 }}>
        <GlobalSupplyRiskBoard onData={setGeoRisk} />
      </div>

      {/* ───── Inflación energética · cruce Macro ↔ Energía ───── */}
      <div style={{ marginBottom: 14 }}>
        <GlobalEnergyInflation />
      </div>

      {/* ───── Análisis IA · riesgo de suministro (Gemini → heurístico) ───── */}
      <div style={{ marginBottom: 14 }}>
        <SupplyRiskBriefPanel />
      </div>

      {/* ───── Strip de cotización · majors + utilities ───── */}
      <div style={{ marginBottom: 14 }}>
        <CotizacionStrip />
      </div>

      {/* ───── Áreas estratégicas ───── */}
      <section
        style={{
          background: '#fff',
          border: '1px solid #ECECEF',
          borderRadius: 14,
          padding: '18px 22px',
          marginBottom: 14,
        }}
      >
        <header style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
            Áreas estratégicas de la energía
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Vectores de política energética · transversales a todos los tipos
          </p>
        </header>
        <AreasEstrategicas />
      </section>

      {/* ───── Inteligencia operativa sectorial ───── */}
      <SectorIntelPanel
        sector="energia"
        compact
        detailHref="/commodities?category=energy"
        detailLabel="Ver futuros · Vesper →"
      />

      {loading && (
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#86868b' }}>
          Cargando datos energéticos…
        </div>
      )}

      {/* Cuaderno · notas que mencionan al sector energía */}
      <div style={{ marginTop: 18 }}>
        <CuadernoEntityWidget slug="energia" name="Sector Energía" accentColor="#F59E0B" />
      </div>
    </>
  )
}

export default VisionGlobalView

// ─── Strip de cotización · majors + utilities ───────────────────────────────
interface Quote {
  symbol: string
  name: string
  price: number | null
  change_percent: number | null
  available: boolean
}

// Símbolos curados para el strip. Majors globales (Finnhub free tier soporta los
// tickers US) + utilities españolas en Madrid (.MC, soportado en free tier).
const STRIP_MAJORS: Array<{ symbol: string; name: string }> = [
  { symbol: 'XOM', name: 'ExxonMobil' },
  { symbol: 'CVX', name: 'Chevron' },
  { symbol: 'SHEL', name: 'Shell' },
  { symbol: 'BP', name: 'BP' },
  { symbol: 'TTE', name: 'TotalEnergies' },
  { symbol: 'EQNR', name: 'Equinor' },
  { symbol: 'NEE', name: 'NextEra' },
]
const STRIP_UTILITIES: Array<{ symbol: string; name: string }> = [
  { symbol: 'IBE.MC', name: 'Iberdrola' },
  { symbol: 'ELE.MC', name: 'Endesa' },
  { symbol: 'NTGY.MC', name: 'Naturgy' },
  { symbol: 'REP.MC', name: 'Repsol' },
  { symbol: 'ANE.MC', name: 'Acciona Energía' },
  { symbol: 'ENG.MC', name: 'Enagás' },
  { symbol: 'RED.MC', name: 'Redeia' },
]

function CotizacionStrip() {
  const [majors, setMajors] = useState<Quote[] | null>(null)
  const [utils, setUtils] = useState<Quote[] | null>(null)

  useEffect(() => {
    let alive = true

    // Majors globales: una sola llamada al snapshot sectorial de Finnhub +
    // tickers extra (TTE/EQNR/NEE) individuales para completar el strip.
    async function loadMajors() {
      const wanted = new Map(STRIP_MAJORS.map((m) => [m.symbol, m.name]))
      const out = new Map<string, Quote>()
      try {
        const r = await fetch('/api/finnhub/sector/energia', { cache: 'no-store' })
        const j: any = await r.json()
        for (const q of j?.items ?? []) {
          if (wanted.has(q.symbol)) {
            out.set(q.symbol, {
              symbol: q.symbol,
              name: wanted.get(q.symbol)!,
              price: q.price ?? null,
              change_percent: q.change_percent ?? null,
              available: q.price != null,
            })
          }
        }
      } catch {
        /* degradación silenciosa */
      }
      // Completar los que no vinieron en el snapshot sectorial.
      const missing = STRIP_MAJORS.filter((m) => !out.has(m.symbol))
      await Promise.all(
        missing.map(async (m) => {
          const q = await fetchQuote(m.symbol, m.name)
          out.set(m.symbol, q)
        }),
      )
      if (alive) setMajors(STRIP_MAJORS.map((m) => out.get(m.symbol)!).filter(Boolean))
    }

    async function loadUtils() {
      const qs = await Promise.all(STRIP_UTILITIES.map((u) => fetchQuote(u.symbol, u.name)))
      if (alive) setUtils(qs)
    }

    loadMajors()
    loadUtils()
    return () => {
      alive = false
    }
  }, [])

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
          Cotización del sector energético
        </h2>
        <a href="https://finnhub.io" target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: ACCENT, textDecoration: 'none' }}>
          Finnhub · tiempo real
        </a>
      </header>

      <QuoteRow titulo="Utilities y energéticas españolas" quotes={utils} />
      <div style={{ height: 14 }} />
      <QuoteRow titulo="Majors globales" quotes={majors} />

      {/* CTA · módulo de empresas con fichas drill-down */}
      <a
        href="/sector-energia/empresas"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 16,
          padding: '12px 16px',
          background: `${ACCENT}0D`,
          border: `1px solid ${ACCENT}33`,
          borderRadius: 10,
          textDecoration: 'none',
          color: ACCENT,
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>
          Ver todas las empresas energéticas
          <span style={{ fontSize: 11, fontWeight: 500, color: '#6e6e73', marginLeft: 8 }}>
            fichas drill-down · cotización + estructura societaria (OpenCorporates)
          </span>
        </span>
        <span aria-hidden="true" style={{ fontSize: 15 }}>⟶</span>
      </a>
    </section>
  )
}

function QuoteRow({ titulo, quotes }: { titulo: string; quotes: Quote[] | null }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        {titulo}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {quotes == null &&
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ height: 58, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }} />
          ))}
        {quotes?.map((q) => (
          <div key={q.symbol} style={{ padding: '9px 12px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.name}
              </span>
            </div>
            <div style={{ fontSize: 9.5, color: '#86868b', fontFamily: 'monospace', marginTop: 1 }}>{q.symbol}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, gap: 6 }}>
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
                <span style={{ fontSize: 11, color: '#C0C0C5' }} title="Sin cotización (rate-limit o ticker no soportado en free tier)">
                  — sin cotización
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

async function fetchQuote(symbol: string, name: string): Promise<Quote> {
  try {
    const r = await fetch(`/api/finnhub/quote/${encodeURIComponent(symbol)}`, { cache: 'no-store' })
    const j: any = await r.json()
    if (j?.ok && j.price != null) {
      return { symbol, name, price: j.price, change_percent: j.change_percent ?? null, available: true }
    }
  } catch {
    /* degradación silenciosa */
  }
  return { symbol, name, price: null, change_percent: null, available: false }
}

// ─── Análisis IA · riesgo de suministro ─────────────────────────────────────
interface RiskVectorView {
  nombre: string
  banda: 'bajo' | 'medio' | 'alto' | 'critico' | 'pendiente'
  score: number | null
  nota: string
}
interface SupplyRiskBrief {
  resumen: string
  nivel_riesgo_global: string
  score: number | null
  vectores: RiskVectorView[]
  generated_by_llm: boolean
}
const BANDA_C: Record<string, string> = {
  bajo: '#16A34A', medio: '#F59E0B', alto: '#F97316', critico: '#DC2626', pendiente: '#C0C0C5',
}

function SupplyRiskBriefPanel() {
  const [brief, setBrief] = useState<SupplyRiskBrief | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/energia/supply-risk-brief', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; brief?: SupplyRiskBrief } | null) => {
        if (!alive) return
        setBrief(j?.brief ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [])

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderLeft: `4px solid ${ACCENT}`, borderRadius: 14, padding: '18px 22px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.013em', color: '#1d1d1f' }}>
            ◆ Análisis IA · Riesgo de suministro
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Síntesis de los vectores de seguridad energética
            {brief && (
              <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 700, color: brief.generated_by_llm ? ACCENT : '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {brief.generated_by_llm ? '· generado por IA (Gemini)' : '· síntesis heurística'}
              </span>
            )}
          </p>
        </div>
        {brief && brief.score != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#86868b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Riesgo global</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: BANDA_C[brief.nivel_riesgo_global] ?? '#1d1d1f', textTransform: 'capitalize' }}>
              {brief.nivel_riesgo_global} · {brief.score}/100
            </div>
          </div>
        )}
      </header>

      {loading && <div style={{ fontSize: 12, color: '#86868b' }}>Generando análisis…</div>}

      {!loading && brief && (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#3a3a3d', lineHeight: 1.55 }}>{brief.resumen}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {brief.vectores.map((v) => (
              <div key={v.nombre} style={{ padding: '9px 12px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10, borderLeft: `3px solid ${BANDA_C[v.banda] ?? '#C0C0C5'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1d1d1f' }}>{v.nombre}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: BANDA_C[v.banda] ?? '#86868b' }}>
                    {v.banda === 'pendiente' ? 'pendiente' : v.banda}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: '#6e6e73', marginTop: 3, lineHeight: 1.4 }}>{v.nota}</div>
              </div>
            ))}
          </div>
          {brief.generated_by_llm && (
            <p style={{ margin: '12px 0 0', fontSize: 9.5, color: '#9CA3AF', lineHeight: 1.5 }}>
              Resumen generado por IA (Gemini) sobre vectores calculados con datos reales. Las cifras provienen de
              ESIOS/commodities/AGSI; la IA solo interpreta. Verifica antes de decidir.
            </p>
          )}
          <Link href="/prensa?q=energia" style={{ display: 'inline-block', marginTop: 12, fontSize: 11.5, color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>
            Noticias de energía en /prensa ⟶
          </Link>
        </>
      )}

      {!loading && !brief && (
        <div style={{ fontSize: 12, color: '#86868b' }}>Análisis no disponible ahora. Reintenta más tarde.</div>
      )}
    </section>
  )
}

// ─── Áreas estratégicas ─────────────────────────────────────────────────────
function AreasEstrategicas() {
  const areas: Array<{ titulo: string; desc: string; color: string; glyph: string; href?: string }> = [
    { titulo: 'Transición energética', desc: 'PNIEC 2030 · descarbonización · Fondos Next Generation', color: '#16A34A', glyph: '⬡' },
    { titulo: 'Autonomía y seguridad', desc: 'Dependencia exterior · diversificación · interconexiones', color: '#0F766E', glyph: '◉' },
    { titulo: 'Precios y consumidor', desc: 'PVPC · pool · pobreza energética · competitividad industrial', color: '#DC2626', glyph: '◆' },
    { titulo: 'Descarbonización', desc: 'EU ETS · CO2 · intensidad de carbono · objetivo 2050', color: '#7C3AED', glyph: '◐' },
    { titulo: 'Redes e interconexión', desc: 'REE · congestiones · Pirineos · integración UE', color: '#1F4E8C', glyph: '⊞' },
    { titulo: 'Almacenamiento', desc: 'Bombeo · baterías · hidrógeno · flexibilidad del sistema', color: '#5B21B6', glyph: '◈' },
  ]
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {areas.map((a) => (
        <li
          key={a.titulo}
          style={{
            padding: '14px 16px',
            background: '#FAFAFA',
            borderRadius: 10,
            border: '1px solid #ECECEF',
            borderTop: `3px solid ${a.color}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span aria-hidden="true" style={{ fontSize: 14, color: a.color }}>
              {a.glyph}
            </span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
              {a.titulo}
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#3a3a3d', lineHeight: 1.45 }}>{a.desc}</div>
        </li>
      ))}
    </ul>
  )
}
