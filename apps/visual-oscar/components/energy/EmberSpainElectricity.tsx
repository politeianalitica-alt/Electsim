'use client'
/**
 * `<EmberSpainElectricity />` · panel de mix eléctrico España vía Ember Energy.
 *
 * Reutilizable en:
 *   - /dashboard · widget compact con renewable_pct + carbon intensity
 *   - /sector-energia · vista completa con mix + trend + EU comparison
 *   - /macro · KPI de transición energética
 *
 * Datos via /api/ember/spain-snapshot · cache 12h.
 * Empty state honesto si EMBER_API_KEY no configurada.
 */
import { useEffect, useState } from 'react'

interface MixData {
  period: number | string | null
  by_fuel_twh: Record<string, number>
  renewable_pct: number
  clean_pct: number
  fossil_pct: number
  total_twh: number
}
interface TrendPoint {
  year: number
  renewable_pct: number
  clean_pct: number
  fossil_pct: number
  total_twh: number
}
interface EmberData {
  ok: boolean
  data_quality?: { source_type: string; source_name: string; note?: string }
  latest_month?: string
  latest_year?: number
  mix_latest_month?: MixData
  mix_latest_year?: MixData
  renewable_trend?: TrendPoint[]
  carbon_intensity?: { period: string; gco2_per_kwh: number } | null
  demand?: { period: number; twh: number } | null
}

const ACCENT = '#15803d' // verde transición energética
const FUEL_COLORS: Record<string, string> = {
  wind:             '#0ea5e9',
  solar:            '#f59e0b',
  hydro:            '#0891b2',
  nuclear:          '#a855f7',
  bioenergy:        '#84cc16',
  other_renewables: '#10b981',
  gas:              '#94a3b8',
  coal:             '#1f2937',
  oil:              '#78350f',
  other_fossil:     '#6b7280',
}
const FUEL_LABELS: Record<string, string> = {
  wind:             'Eólica',
  solar:            'Solar',
  hydro:            'Hidro',
  nuclear:          'Nuclear',
  bioenergy:        'Biomasa',
  other_renewables: 'Otras renov.',
  gas:              'Gas',
  coal:             'Carbón',
  oil:              'Petróleo',
  other_fossil:     'Otros fósiles',
}

export function EmberSpainElectricity({
  compact = false,
}: {
  compact?: boolean
}) {
  const [data, setData] = useState<EmberData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/ember/spain-snapshot', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j: EmberData) => alive && setData(j))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const isLive = data?.data_quality?.source_type === 'live'
  const mix = data?.mix_latest_month || data?.mix_latest_year
  const period = data?.mix_latest_month?.period ?? data?.mix_latest_year?.period
  const fuelEntries = mix
    ? Object.entries(mix.by_fuel_twh)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
    : []
  const totalTwh = mix?.total_twh || 0

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 8,
        padding: 14,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 0.8,
              color: ACCENT,
              fontWeight: 700,
              margin: 0,
            }}
          >
            EMBER · MIX ELÉCTRICO ESPAÑA{period ? ` · ${period}` : ''}
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            Generación por fuente, renovables, intensidad de carbono · cache 12h
          </p>
        </div>
        {isLive ? (
          <span
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: '#dcfce7',
              color: '#166534',
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            LIVE
          </span>
        ) : (
          <span
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: '#fef3c7',
              color: '#92400e',
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: 0.4,
            }}
          >
            Ember no disponible
          </span>
        )}
      </header>

      {loading && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando Ember…</p>
      )}

      {!loading && !isLive && (
        <div
          style={{
            padding: 10,
            background: '#fef9e7',
            border: '1px solid #fde68a',
            borderRadius: 6,
            fontSize: 11,
            color: '#92400e',
          }}
        >
          <strong>Ember Energy inactivo</strong> ·{' '}
          {data?.data_quality?.note ?? 'auth pendiente'}.
          <br />
          Configura <code>EMBER_API_KEY</code> ·{' '}
          <a
            href="https://ember-energy.org/data/api"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: ACCENT, textDecoration: 'none' }}
          >
            ember-energy.org/data/api →
          </a>
        </div>
      )}

      {!loading && isLive && mix && (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1.4fr', gap: 14 }}>
          {/* KPIs renovable / clean / fósil */}
          <div style={{ background: '#f0fdf4', borderRadius: 6, padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
                  RENOVABLE
                </p>
                <p style={{ fontSize: 22, color: ACCENT, fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {mix.renewable_pct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
                  LIBRE EMISIONES
                </p>
                <p style={{ fontSize: 22, color: '#0e7490', fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {mix.clean_pct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
                  FÓSIL
                </p>
                <p style={{ fontSize: 22, color: '#7f1d1d', fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {mix.fossil_pct.toFixed(1)}%
                </p>
              </div>
            </div>
            {data?.carbon_intensity && (
              <div style={{ marginTop: 10, padding: '8px 0 0', borderTop: '1px solid #d1fae5' }}>
                <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
                  INTENSIDAD CO₂ · {data.carbon_intensity.period}
                </p>
                <p style={{ fontSize: 18, color: '#1f2937', fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {data.carbon_intensity.gco2_per_kwh.toFixed(0)}{' '}
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>gCO₂/kWh</span>
                </p>
              </div>
            )}
            {data?.demand && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 10, color: '#475569', margin: 0, fontWeight: 600, letterSpacing: 0.4 }}>
                  DEMANDA · {data.demand.period}
                </p>
                <p style={{ fontSize: 14, color: '#1f2937', fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                  {data.demand.twh.toFixed(1)}{' '}
                  <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>TWh/año</span>
                </p>
              </div>
            )}
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '8px 0 0' }}>
              Generación total: {totalTwh.toFixed(1)} TWh
            </p>
          </div>

          {/* Desglose por fuente */}
          {!compact && (
            <div style={{ background: '#f9fafb', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
                GENERACIÓN POR FUENTE · TWh
              </p>
              {/* Barra de proporción stacked */}
              <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10, background: '#e5e7eb' }}>
                {fuelEntries.map(([f, twh]) => {
                  const pct = totalTwh > 0 ? (twh / totalTwh) * 100 : 0
                  return (
                    <div
                      key={f}
                      title={`${FUEL_LABELS[f] ?? f}: ${twh.toFixed(2)} TWh (${pct.toFixed(1)}%)`}
                      style={{ width: `${pct}%`, background: FUEL_COLORS[f] ?? '#9ca3af' }}
                    />
                  )
                })}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12 }}>
                {fuelEntries.map(([f, twh]) => {
                  const pct = totalTwh > 0 ? (twh / totalTwh) * 100 : 0
                  return (
                    <li
                      key={f}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: FUEL_COLORS[f] ?? '#9ca3af',
                          }}
                        />
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{FUEL_LABELS[f] ?? f}</span>
                      </span>
                      <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        <strong style={{ color: '#0f172a' }}>{twh.toFixed(2)}</strong>{' '}
                        TWh · {pct.toFixed(1)}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Trend renovable últimos 5 años */}
      {!compact && !loading && isLive && data?.renewable_trend && data.renewable_trend.length >= 2 && (
        <div style={{ marginTop: 10, padding: 10, background: '#f9fafb', borderRadius: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
            EVOLUCIÓN % RENOVABLE · ÚLTIMOS AÑOS
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
            {data.renewable_trend.map((p) => {
              const maxPct = Math.max(...data.renewable_trend!.map((x) => x.renewable_pct), 80)
              const h = (p.renewable_pct / maxPct) * 100
              return (
                <div key={p.year} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {p.renewable_pct.toFixed(0)}%
                  </span>
                  <div style={{ width: '70%', height: `${h}%`, background: ACCENT, borderRadius: '3px 3px 0 0', minHeight: 4 }} />
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>{p.year}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · Ember Energy ·{' '}
        <a
          href="https://ember-energy.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: ACCENT, textDecoration: 'none' }}
        >
          ember-energy.org →
        </a>
      </p>
    </section>
  )
}

export default EmberSpainElectricity
