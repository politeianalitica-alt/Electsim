'use client'
/**
 * <GlobalEnergyInflation /> · Energía v3 · Sprint E9 (Visión Global)
 *
 * Panel ejecutivo de INFLACIÓN ENERGÉTICA para el cuadro de mando cross-energía.
 * No repite las series largas de commodities (esas viven en Petróleo/Gas): aquí
 * el cruce es Macro ↔ Energía, que NO tiene hueco propio en ninguna otra
 * pestaña. Resume tres señales con su última lectura y un sparkline corto:
 *
 *   - IPC energía vs IPC general (HICP YoY) + spread en pp · ¿la energía tira
 *     de la inflación o la modera?
 *   - IPI (producción industrial, incl. energía) · termómetro de actividad.
 *   - EUR/USD + nota de passthrough: el Brent cotiza en USD, el tipo de cambio
 *     modula cuánto de una subida del crudo llega a la factura en euros.
 *
 * Fuente: GET /api/energia/energy-inflation?days=90 (Eurostat HICP/IPI + ECB/
 * Alpha). Degrada POR-SERIE: si una serie falla, su tarjeta muestra el motivo y
 * el resto se sirve igual. Nunca inventa valores (CLAUDE.md). Cero emojis.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#16A34A'

// ── Shape del endpoint (solo lo que consumimos) ──────────────────────────────
interface InflationPoint {
  period: string
  value: number | null
}
interface InflationSeries {
  ok: boolean
  label: string
  unit: string
  series: InflationPoint[]
  last: InflationPoint | null
  source: string
  source_url: string
  error?: string
}
interface EnergyInflationData {
  ipc_energia: InflationSeries
  ipc_general: InflationSeries
  ipi: InflationSeries
  eur_usd: InflationSeries
  spread_energia_general_pp: number | null
  nota: string
}
interface EnergyInflationResp {
  ok: boolean
  data: EnergyInflationData | null
  error?: string
  source?: string
}

export default function GlobalEnergyInflation() {
  const [data, setData] = useState<EnergyInflationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/energia/energy-inflation?days=90', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<EnergyInflationResp>) : null))
      .then((j) => {
        if (!alive) return
        setData(j?.data ?? null)
        setFailed(!j?.data)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, padding: '18px 22px' }}>
      <header
        style={{
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 14.5,
              fontWeight: 600,
              letterSpacing: '-0.013em',
              color: '#1d1d1f',
            }}
          >
            Inflación energética
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6e6e73' }}>
            Cruce Macro ↔ Energía · IPC energía vs general, producción industrial y tipo de cambio
          </p>
        </div>
        <a
          href="https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 10.5, color: ACCENT, textDecoration: 'none' }}
        >
          Eurostat HICP/IPI · ECB
        </a>
      </header>

      {loading && <div style={{ fontSize: 12, color: '#86868b' }}>Cargando inflación energética…</div>}

      {!loading && failed && (
        <div style={{ fontSize: 12, color: '#86868b' }}>
          Inflación energética no disponible ahora. El endpoint degradó (Eurostat/ECB). Reintenta más tarde.
        </div>
      )}

      {!loading && data && (
        <>
          {/* IPC energía vs general · el corazón del panel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <SeriesCard s={data.ipc_energia} accent="#F97316" big />
            <SeriesCard s={data.ipc_general} accent="#6e6e73" big />
            <SpreadCard spread={data.spread_energia_general_pp} />
          </div>

          {/* IPI + EUR/USD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 10 }}>
            <SeriesCard s={data.ipi} accent="#1F4E8C" />
            <SeriesCard s={data.eur_usd} accent="#7C3AED" decimals={3} />
          </div>

          {/* Nota de passthrough EUR/USD → Brent */}
          {data.nota && (
            <p
              style={{
                margin: '12px 0 0',
                fontSize: 10.5,
                color: '#6e6e73',
                lineHeight: 1.5,
                borderLeft: `3px solid ${ACCENT}55`,
                paddingLeft: 10,
              }}
            >
              <span style={{ fontWeight: 700, color: '#3a3a3d' }}>Passthrough EUR/USD → Brent.</span> {data.nota}
            </p>
          )}
        </>
      )}
    </section>
  )
}

// ── Tarjeta de una serie (última lectura + sparkline corto) ──────────────────
function SeriesCard({
  s,
  accent,
  big = false,
  decimals,
}: {
  s: InflationSeries
  accent: string
  big?: boolean
  decimals?: number
}) {
  const v = s.last?.value ?? null
  const has = v != null && Number.isFinite(v)
  const spark = (s.series ?? []).map((p) => p.value).filter((x): x is number => x != null && Number.isFinite(x))
  const fmtV =
    has && v != null ? v.toLocaleString('es-ES', { maximumFractionDigits: decimals ?? (Math.abs(v) >= 100 ? 0 : 1) }) : '—'

  return (
    <div style={{ padding: '12px 14px', background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 10 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#86868b',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.35,
          minHeight: 26,
        }}
      >
        {s.label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
        <span
          style={{
            fontSize: big ? 26 : 20,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            color: has ? accent : '#C0C0C5',
          }}
        >
          {fmtV}
          {has && <span style={{ fontSize: 10, fontWeight: 600, color: '#86868b', marginLeft: 4 }}>{s.unit}</span>}
        </span>
        {spark.length > 1 ? (
          <MiniSpark values={spark} color={accent} />
        ) : (
          !has && (
            <span style={{ fontSize: 9.5, color: '#C0C0C5' }} title={s.error}>
              {s.error ? `sin dato · ${s.error}` : 'sin dato'}
            </span>
          )
        )}
      </div>
      {s.last?.period && (
        <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}>
          último · {s.last.period}
        </div>
      )}
    </div>
  )
}

// ── Tarjeta del spread energía − general (pp) ────────────────────────────────
function SpreadCard({ spread }: { spread: number | null }) {
  const has = spread != null && Number.isFinite(spread)
  // Spread positivo (energía > general) tira al alza de la inflación → rojo.
  const color = !has ? '#C0C0C5' : spread! > 0.5 ? '#DC2626' : spread! < -0.5 ? '#16A34A' : '#F59E0B'
  const lectura = !has
    ? 'sin dato común'
    : spread! > 0.5
      ? 'la energía tira de la inflación al alza'
      : spread! < -0.5
        ? 'la energía modera la inflación'
        : 'energía alineada con el IPC general'
  return (
    <div
      style={{
        padding: '12px 14px',
        background: '#FAFAFA',
        border: '1px solid #ECECEF',
        borderRadius: 10,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#86868b',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.35,
          minHeight: 26,
        }}
      >
        Spread energía − general
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color, marginTop: 6 }}>
        {has ? `${spread! >= 0 ? '+' : ''}${spread!.toFixed(1)}` : '—'}
        {has && <span style={{ fontSize: 10, fontWeight: 600, color: '#86868b', marginLeft: 4 }}>pp</span>}
      </div>
      <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 4, lineHeight: 1.4 }}>{lectura}</div>
    </div>
  )
}

// ── Sparkline minimal (sin ejes) ─────────────────────────────────────────────
function MiniSpark({ values, color }: { values: number[]; color: string }) {
  const W = 80
  const H = 26
  const P = 2
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const path = values
    .map((v, i) => {
      const x = P + (i / (values.length - 1)) * (W - 2 * P)
      const y = P + (1 - (v - min) / range) * (H - 2 * P)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
