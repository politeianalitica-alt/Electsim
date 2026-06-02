'use client'
/**
 * <EnergyPriceMatrix /> · Sprint Energía S4
 *
 * Matriz de precios cross-energía: una fila por vector de precio energético.
 *   - Electricidad spot OMIE   · ESIOS 600   (real)
 *   - PVPC tarifa regulada     · ESIOS 1001  (real)
 *   - CO2 · derecho EUA        · ESIOS 1339  (real)
 *   - Petróleo Brent           · /api/energia/commodities (S7 · serie real 90d)
 *   - Petróleo WTI             · /api/energia/commodities (S7 · serie real 90d)
 *   - Gas natural Henry Hub    · /api/energia/commodities (S7 · serie real 90d)
 *   - Gas TTF (hub europeo)    · sin fuente gratuita fiable (empty-state "—")
 *
 * Columnas: nivel actual · variación 24h · 7d · 30d · sparkline. Cada fila cita
 * su fuente. Los datos eléctricos (ESIOS) traen sparkline real de 24h y var 24h;
 * 7d/30d no están en la ventana del snapshot ESIOS → se marcan "—" honestamente.
 * Los commodities energía ahora traen SERIE real (S7 · cascada Alpha Vantage →
 * Nasdaq DL → Yahoo): nivel + var 24h/7d/30d + sparkline desde la serie. TTF
 * sigue "—" porque no hay fuente gratuita fiable (ver lib/energia/commodities).
 *
 * Degradación honesta (CLAUDE.md): nunca se inventan valores. Cero emojis.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#16A34A'

// ── Fuentes de cada fila ────────────────────────────────────────────────────
const ESIOS_SOURCE = 'https://www.esios.ree.es/'
const COMMOD_SOURCE = 'https://finance.yahoo.com/commodities'

// ── Tipos de respuesta de los endpoints reutilizados ────────────────────────
interface EsiosIndicator {
  slug: string
  ok: boolean
  short: string
  unit: string
  latest: { value: number; datetime: string } | null
  change_pct: number | null
  points: Array<{ t: string; v: number }>
  source_url?: string
}
interface EsiosSnapshotResp {
  ok: boolean
  indicators: Record<string, EsiosIndicator>
}
// ── Respuesta del cliente de commodities energía S7 (serie real) ────────────
interface EnergyCommodityPoint {
  date: string
  value: number
}
interface EnergyCommoditySeries {
  symbol: string
  name: string
  unit: string
  latest: number | null
  change_24h: number | null
  change_7d: number | null
  change_30d: number | null
  series: EnergyCommodityPoint[]
  source_label: string
  source_url: string
}
interface EnergyCommodityResponse {
  ok: boolean
  error?: string
  data?: EnergyCommoditySeries
}
interface EnergiaCommoditiesResp {
  data: Record<string, EnergyCommodityResponse>
}

// ── Fila normalizada de la matriz ────────────────────────────────────────────
interface MatrixRow {
  key: string
  label: string
  /** Vector energético al que pertenece (color del chip). */
  vector: 'Electricidad' | 'CO2' | 'Petróleo' | 'Gas'
  unit: string
  level: number | null
  chg24: number | null
  chg7: number | null
  chg30: number | null
  spark: number[]
  source: string
  sourceUrl: string
  /** Texto del estado cuando level === null (ej. "pendiente S7/S8"). */
  pendingNote?: string
}

const VECTOR_COLOR: Record<MatrixRow['vector'], string> = {
  Electricidad: '#16A34A',
  CO2: '#7C3AED',
  Petróleo: '#0F766E',
  Gas: '#0EA5E9',
}

export default function EnergyPriceMatrix() {
  const [rows, setRows] = useState<MatrixRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const [esios, commod] = await Promise.all([
        fetch('/api/esios/snapshot', { cache: 'no-store' })
          .then((r) => (r.ok ? (r.json() as Promise<EsiosSnapshotResp>) : null))
          .catch(() => null),
        fetch('/api/energia/commodities?category=all&days=90', { cache: 'no-store' })
          .then((r) => (r.ok ? (r.json() as Promise<EnergiaCommoditiesResp>) : null))
          .catch(() => null),
      ])
      if (!alive) return

      const ind = esios?.indicators ?? {}
      const com = commod?.data ?? {}

      const esiosRow = (
        key: string,
        label: string,
        vector: MatrixRow['vector'],
        slug: string,
        unit: string,
      ): MatrixRow => {
        const i = ind[slug]
        return {
          key,
          label,
          vector,
          unit,
          level: i?.latest?.value ?? null,
          chg24: i?.change_pct ?? null,
          chg7: null, // ventana snapshot ESIOS = 24h · 7d/30d no disponible aquí
          chg30: null,
          spark: (i?.points ?? []).map((p) => p.v),
          source: 'ESIOS · REE',
          sourceUrl: i?.source_url || ESIOS_SOURCE,
        }
      }

      // S7 · commodities energía con SERIE real (nivel + 24h/7d/30d + sparkline).
      const commodRow = (
        key: string,
        label: string,
        vector: MatrixRow['vector'],
        symbol: string,
        unit: string,
      ): MatrixRow => {
        const resp = com[symbol]
        const s = resp?.ok ? resp.data : undefined
        return {
          key,
          label,
          vector,
          unit: s?.unit ?? unit,
          level: s?.latest ?? null,
          chg24: s?.change_24h ?? null,
          chg7: s?.change_7d ?? null,
          chg30: s?.change_30d ?? null,
          spark: (s?.series ?? []).map((p) => p.value),
          source: s ? sourceShort(s.source_label) : 'sin fuente',
          sourceUrl: s?.source_url || COMMOD_SOURCE,
          pendingNote: s ? undefined : resp?.error ?? 'sin dato ahora',
        }
      }

      const next: MatrixRow[] = [
        esiosRow('spot', 'Electricidad spot · OMIE', 'Electricidad', 'mercado_spot', '€/MWh'),
        esiosRow('pvpc', 'Electricidad PVPC · regulada', 'Electricidad', 'pvpc', '€/MWh'),
        esiosRow('eua', 'CO2 · derecho de emisión EUA', 'CO2', 'precio_co2_eua', '€/t'),
        commodRow('brent', 'Petróleo Brent', 'Petróleo', 'brent', '$/bbl'),
        commodRow('wti', 'Petróleo WTI', 'Petróleo', 'wti', '$/bbl'),
        commodRow('henryhub', 'Gas natural · Henry Hub', 'Gas', 'henry-hub', '$/MMBtu'),
        // TTF: sin fuente gratuita fiable (Alpha no lo expone, Nasdaq free no,
        // Yahoo TTF=F inestable) → el endpoint degrada y mostramos "—" honesto.
        commodRow('ttf', 'Gas natural · TTF (hub UE)', 'Gas', 'ttf', '€/MWh'),
      ]
      setRows(next)
      setLoading(false)
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 14,
        padding: '18px 22px',
      }}
    >
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
          Matriz de precios de la energía
        </h2>
        <p style={{ margin: 0, fontSize: 11, color: '#6e6e73' }}>
          Electricidad y CO2 en vivo (ESIOS) · crudo y gas con serie real (Alpha Vantage · Nasdaq DL · Yahoo) · TTF sin fuente
        </p>
      </header>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ECECEF' }}>
              <th style={thStyle('left')}>Vector</th>
              <th style={thStyle('right')}>Nivel</th>
              <th style={thStyle('right')}>24h</th>
              <th style={thStyle('right')}>7d</th>
              <th style={thStyle('right')}>30d</th>
              <th style={thStyle('left')}>Tendencia 24h</th>
              <th style={thStyle('left')}>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ padding: '18px 8px', color: '#86868b', fontSize: 12 }}>
                  Cargando precios…
                </td>
              </tr>
            )}
            {!loading &&
              (rows ?? []).map((r) => (
                <tr key={r.key} style={{ borderBottom: '1px solid #F5F5F7' }}>
                  <td style={{ padding: '9px 8px' }}>
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: VECTOR_COLOR[r.vector],
                        marginRight: 8,
                        verticalAlign: 'middle',
                      }}
                    />
                    <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{r.label}</span>
                  </td>
                  <td style={tdStyle('right')}>
                    {r.level == null ? (
                      <span style={{ color: '#C0C0C5' }} title={r.pendingNote}>
                        —
                      </span>
                    ) : (
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', color: '#1d1d1f' }}>
                        {fmtNum(r.level)}
                        <span style={{ fontSize: 9.5, color: '#86868b', marginLeft: 4, fontWeight: 600 }}>
                          {r.unit}
                        </span>
                      </span>
                    )}
                  </td>
                  <td style={tdStyle('right')}>
                    <ChangeCell pct={r.chg24} />
                  </td>
                  <td style={tdStyle('right')}>
                    <ChangeCell pct={r.chg7} />
                  </td>
                  <td style={tdStyle('right')}>
                    <ChangeCell pct={r.chg30} />
                  </td>
                  <td style={{ padding: '9px 8px' }}>
                    {r.spark.length > 1 ? (
                      <Sparkline values={r.spark} positive={(r.chg24 ?? 0) >= 0} />
                    ) : (
                      <span style={{ fontSize: 10.5, color: '#C0C0C5' }} title={r.pendingNote}>
                        {r.pendingNote ?? '—'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '9px 8px' }}>
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 10.5, color: ACCENT, textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      {r.source}
                    </a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 10, color: '#9CA3AF', lineHeight: 1.5 }}>
        Crudo (Brent/WTI) y gas (Henry Hub) traen serie histórica real (S7): nivel + variación 24h/7d/30d +
        sparkline, vía cascada Alpha Vantage → Nasdaq Data Link → Yahoo. El snapshot ESIOS cubre solo la
        ventana de 24h, por lo que electricidad/CO2 marcan "—" en 7d/30d. TTF no tiene fuente gratuita fiable.
      </p>
    </section>
  )
}

// ── Subcomponentes y helpers ─────────────────────────────────────────────────

function ChangeCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: '#C0C0C5' }}>—</span>
  const up = pct >= 0
  const color = up ? '#16A34A' : '#DC2626'
  return (
    <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
      {up ? '⇡' : '⇣'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const W = 96
  const H = 26
  const P = 2
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stroke = positive ? '#16A34A' : '#DC2626'
  const path = values
    .map((v, i) => {
      const x = P + (i / (values.length - 1)) * (W - 2 * P)
      const y = P + (1 - (v - min) / range) * (H - 2 * P)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} aria-hidden="true">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function thStyle(align: 'left' | 'right'): React.CSSProperties {
  return {
    padding: '6px 8px',
    textAlign: align,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#86868b',
    whiteSpace: 'nowrap',
  }
}
function tdStyle(align: 'left' | 'right'): React.CSSProperties {
  return { padding: '9px 8px', textAlign: align, fontVariantNumeric: 'tabular-nums' }
}
function fmtNum(v: number): string {
  return v.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}

// Etiqueta corta de fuente a partir del source_label largo del cliente S7.
function sourceShort(label: string): string {
  if (/alpha\s*vantage/i.test(label)) return 'Alpha Vantage'
  if (/nasdaq/i.test(label)) return 'Nasdaq DL'
  if (/yahoo/i.test(label)) return 'Yahoo Finance'
  return label.split('·')[0].trim() || 'Fuente'
}
