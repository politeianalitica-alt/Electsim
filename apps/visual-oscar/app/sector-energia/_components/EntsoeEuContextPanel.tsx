'use client'
/**
 * <EntsoeEuContextPanel /> · Sprint Energía S3
 *
 * "Contexto europeo" del sistema eléctrico: pone los precios mayoristas y los
 * flujos de España en perspectiva paneuropea con datos oficiales ENTSO-E
 * (Transparency Platform · todos los TSOs UE).
 *
 * Muestra:
 *   - Precios day-ahead medios comparados ES/FR/DE/PT/IT (barras horizontales).
 *   - Flujos físicos cross-border ES↔FR y ES↔PT (saldo neto + dirección).
 *
 * Datos vía proxies /api/entsoe/{prices,flows} (envelope { ok, data,
 * fetched_at }). Si ENTSOE_SECURITY_TOKEN no está configurado, los endpoints
 * devuelven ok:false y este panel muestra un empty-state honesto orientando al
 * visor oficial. Cero deps · todo SVG/CSS inline. Cero emojis.
 */
import { useEffect, useState } from 'react'
import { DEFAULT_PRICE_ZONES, DEFAULT_FLOW_PAIRS, ENTSOE_ZONES, type EntsoeZoneCode } from '@/lib/entsoe/zones'

const ACCENT = '#1e3a8a' // azul ENTSO-E

interface PriceData {
  zone: string
  eic: string
  avg_eur_mwh: number | null
  max_eur_mwh: number | null
  min_eur_mwh: number | null
  points: Array<{ position: number; value: number; timestamp: string }>
}
interface FlowData {
  from: string
  to: string
  net_mwh: number
  net_direction: string
  forward: { total_mwh: number }
  reverse: { total_mwh: number }
}
interface Envelope<T> {
  ok: boolean
  data: T | null
  error?: string
  fetched_at?: string
}

interface PriceRow {
  zone: EntsoeZoneCode
  label: string
  color: string
  avg: number | null
}

export function EntsoeEuContextPanel() {
  const [prices, setPrices] = useState<PriceRow[]>([])
  const [flows, setFlows] = useState<FlowData[]>([])
  const [loading, setLoading] = useState(true)
  const [anyOk, setAnyOk] = useState(false)

  useEffect(() => {
    let alive = true
    const priceReqs = DEFAULT_PRICE_ZONES.map((z) =>
      fetch(`/api/entsoe/prices?zone=${z}&days=2`, { cache: 'force-cache' })
        .then((r) => r.json() as Promise<Envelope<PriceData>>)
        .then((j) => ({ zone: z, env: j }))
        .catch(() => ({ zone: z, env: { ok: false, data: null } as Envelope<PriceData> })),
    )
    const flowReqs = DEFAULT_FLOW_PAIRS.map((p) =>
      fetch(`/api/entsoe/flows?from=${p.from}&to=${p.to}&days=2`, { cache: 'force-cache' })
        .then((r) => r.json() as Promise<Envelope<FlowData>>)
        .catch(() => ({ ok: false, data: null } as Envelope<FlowData>)),
    )

    Promise.all([Promise.all(priceReqs), Promise.all(flowReqs)])
      .then(([priceResults, flowResults]) => {
        if (!alive) return
        const rows: PriceRow[] = priceResults.map(({ zone, env }) => {
          const z = ENTSOE_ZONES[zone]
          return { zone, label: z.label, color: z.color, avg: env.ok && env.data ? env.data.avg_eur_mwh : null }
        })
        const okFlows = flowResults.filter((f): f is Envelope<FlowData> & { data: FlowData } => f.ok && !!f.data)
        setPrices(rows)
        setFlows(okFlows.map((f) => f.data))
        setAnyOk(rows.some((r) => r.avg != null) || okFlows.length > 0)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [])

  const maxAvg = Math.max(1, ...prices.map((p) => p.avg ?? 0))

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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: ACCENT, fontWeight: 700, margin: 0 }}>
            CONTEXTO EUROPEO · ENTSO-E · RED ELÉCTRICA UE
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            Precios day-ahead comparados ES/FR/DE/PT/IT · flujos cross-border ES↔FR/PT · cache 1h
          </p>
        </div>
        {anyOk ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · TSO oficial
          </span>
        ) : (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            Web API token pendiente
          </span>
        )}
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando ENTSO-E…</p>}

      {!loading && !anyOk && (
        <div style={{ padding: 12, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>Contexto europeo (ENTSO-E) en activación</strong>
          <p style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
            Los precios mayoristas comparados de los principales mercados europeos y los
            flujos físicos transfronterizos requieren el Web API Security Token de
            ENTSO-E (distinto del usuario/contraseña). Mientras se configura, puedes
            consultar el visor oficial:{' '}
            <a href="https://transparency.entsoe.eu" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>
              transparency.entsoe.eu →
            </a>
          </p>
        </div>
      )}

      {!loading && anyOk && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          {/* Precios day-ahead comparados */}
          <div style={{ background: '#eff6ff', borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 10px', letterSpacing: 0.6 }}>
              PRECIO DAY-AHEAD MEDIO · 48H · €/MWh
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {prices.map((p) => (
                <li key={p.zone} title={p.avg != null ? `${p.label}: ${p.avg} €/MWh medio (48h)` : `${p.label}: sin datos`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{p.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: p.zone === 'ES' ? ACCENT : '#475569', fontVariantNumeric: 'tabular-nums' }}>
                      {p.avg != null ? p.avg.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : '—'}
                    </span>
                  </div>
                  <div style={{ height: 6, background: '#dbeafe', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${p.avg != null ? (p.avg / maxAvg) * 100 : 0}%`, height: '100%', background: p.color, opacity: p.zone === 'ES' ? 1 : 0.75 }} />
                  </div>
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 9, color: '#94a3b8', margin: '10px 0 0' }}>
              Barra proporcional al precio medio · España resaltada
            </p>
          </div>

          {/* Flujos cross-border */}
          <div style={{ background: '#f0fdfa', borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 10px', letterSpacing: 0.6 }}>
              FLUJOS CROSS-BORDER · 48H
            </p>
            {flows.length === 0 && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Sin datos de flujos.</p>}
            {flows.map((f) => {
              const exporting = f.net_mwh >= 0
              return (
                <div key={`${f.from}-${f.to}`} style={{ padding: '6px 0', borderBottom: '1px solid #ccfbf1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {ENTSOE_ZONES[f.from as EntsoeZoneCode]?.label ?? f.from} ↔ {ENTSOE_ZONES[f.to as EntsoeZoneCode]?.label ?? f.to}
                    </span>
                    <span style={{ color: exporting ? '#166534' : '#991b1b', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {Math.abs(f.net_mwh).toLocaleString('es-ES', { maximumFractionDigits: 0 })} MWh
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#0e7490', marginTop: 2 }}>
                    Saldo neto · {f.net_direction}
                  </div>
                </div>
              )
            })}
            <p style={{ fontSize: 9, color: '#94a3b8', margin: '8px 0 0' }}>
              Flujos físicos medidos (A11) · sentido = exportador neto
            </p>
          </div>
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · ENTSO-E Transparency Platform ·{' '}
        <a href="https://transparency.entsoe.eu" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          transparency.entsoe.eu →
        </a>
      </p>
    </section>
  )
}

export default EntsoeEuContextPanel
