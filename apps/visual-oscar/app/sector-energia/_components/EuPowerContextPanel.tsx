'use client'
/**
 * <EuPowerContextPanel /> · Contexto eléctrico europeo (energy-charts.info)
 *
 * Fuente PRIMARIA del "Contexto europeo" del sistema eléctrico, con datos REALES
 * y SIN token, vía energy-charts.info (Fraunhofer ISE · licencia CC-BY). Sustituye
 * al panel ENTSO-E, que requiere un security token aún no disponible; ENTSO-E se
 * conserva como fuente ADICIONAL (ver <EntsoeEuContextPanel /> debajo).
 *
 * Muestra:
 *   - Precios day-ahead comparados ES/FR/DE-LU/PT/IT-North (barras · €/MWh actual
 *     + media del día). España resaltada.
 *   - Generación por fuente ES (mix EU-style · top fuentes + % renovable) y
 *     flujos físicos cross-border ES↔FR/PT (saldo neto + dirección).
 *
 * Datos vía /api/energia/eu-power (envelope { ok, data, fetched_at }). Si
 * energy-charts falla → empty-state honesto. Cero deps · SVG/CSS inline. Cero
 * emojis (Unicode).
 */
import { useEffect, useState } from 'react'

const ACCENT = '#0e7490' // teal Fraunhofer / energy-charts
const ES_COLOR = '#C60B1E'

// Colores por zona (consistentes con lib/entsoe/zones.ts).
const ZONE_COLORS: Record<string, string> = {
  ES: '#C60B1E',
  FR: '#0055A4',
  'DE-LU': '#111111',
  PT: '#006600',
  'IT-North': '#008C45',
  BE: '#FDDA24',
  NL: '#AE1C28',
}

interface EuPrice {
  zone: string
  label: string
  latest_eur_mwh: number | null
  avg_today: number | null
}
interface EuGenerationSource {
  name: string
  mw: number
  share_pct: number
}
interface EuGeneration {
  country: string
  label: string
  load_mw: number | null
  total_generation_mw: number
  renewable_share_pct: number | null
  sources: EuGenerationSource[]
}
interface EuCrossBorderFlow {
  neighbour: string
  net_mw: number
  direction: string
}
interface EuCrossBorder {
  label: string
  neighbours: EuCrossBorderFlow[]
  net_balance_mw: number | null
}
interface Envelope<T> {
  ok: boolean
  data?: T
  error?: string
  fetched_at?: string
}

// Color por fuente para el mini-mix (paleta sobria, sin emojis).
function sourceColor(name: string): string {
  const k = name.toLowerCase()
  if (k.includes('solar')) return '#f59e0b'
  if (k.includes('wind')) return '#0ea5e9'
  if (k.includes('nuclear')) return '#7c3aed'
  if (k.includes('hydro')) return '#0891b2'
  if (k.includes('gas')) return '#ef4444'
  if (k.includes('coal') || k.includes('oil') || k.includes('fossil')) return '#6b7280'
  if (k.includes('bio') || k.includes('waste') || k.includes('renewable')) return '#16a34a'
  return '#94a3b8'
}

function fmt(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('es-ES', { maximumFractionDigits: digits })
}

export function EuPowerContextPanel() {
  const [prices, setPrices] = useState<EuPrice[]>([])
  const [gen, setGen] = useState<EuGeneration | null>(null)
  const [flows, setFlows] = useState<EuCrossBorder | null>(null)
  const [loading, setLoading] = useState(true)
  const [anyOk, setAnyOk] = useState(false)

  useEffect(() => {
    let alive = true
    const j = <T,>(url: string) =>
      fetch(url, { cache: 'force-cache' })
        .then((r) => r.json() as Promise<Envelope<T>>)
        .catch(() => ({ ok: false } as Envelope<T>))

    Promise.all([
      j<EuPrice[]>('/api/energia/eu-power?type=price&zones=ES,FR,DE-LU,PT,IT-North'),
      j<EuGeneration>('/api/energia/eu-power?type=generation&country=es'),
      j<EuCrossBorder>('/api/energia/eu-power?type=flows&country=es'),
    ])
      .then(([pRes, gRes, fRes]) => {
        if (!alive) return
        const pRows = pRes.ok && pRes.data ? pRes.data : []
        const gData = gRes.ok && gRes.data ? gRes.data : null
        const fData = fRes.ok && fRes.data ? fRes.data : null
        setPrices(pRows)
        setGen(gData)
        setFlows(fData)
        setAnyOk(pRows.length > 0 || !!gData || !!fData)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [])

  // Escala de barras de precio sobre el valor "actual" (latest).
  const maxPrice = Math.max(1, ...prices.map((p) => p.latest_eur_mwh ?? 0))
  const topSources = gen ? gen.sources.slice(0, 6) : []

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
            CONTEXTO EUROPEO · ENERGY-CHARTS · FRAUNHOFER ISE
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            Precio day-ahead ES/FR/DE-LU/PT/IT · mix de generación ES · flujos cross-border · sin token · cache 1h
          </p>
        </div>
        {anyOk ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#ccfbf1', color: '#0f766e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            LIVE · datos abiertos
          </span>
        ) : !loading ? (
          <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
            Fuente no disponible
          </span>
        ) : null}
      </header>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Cargando energy-charts…</p>}

      {!loading && !anyOk && (
        <div style={{ padding: 12, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>Contexto europeo (energy-charts) no disponible ahora mismo</strong>
          <p style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
            La API pública de energy-charts.info no respondió (posible rate-limit temporal).
            Puedes consultar el portal oficial:{' '}
            <a href="https://energy-charts.info" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>
              energy-charts.info →
            </a>
          </p>
        </div>
      )}

      {!loading && anyOk && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }}>
          {/* ── Precios day-ahead comparados ──────────────────────────── */}
          <div style={{ background: '#ecfeff', borderRadius: 6, padding: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 10px', letterSpacing: 0.6 }}>
              PRECIO DAY-AHEAD · €/MWh · actual (media del día)
            </p>
            {prices.length === 0 && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Sin datos de precios.</p>}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {prices.map((p) => {
                const isES = p.zone === 'ES'
                const color = ZONE_COLORS[p.zone] ?? ACCENT
                return (
                  <li key={p.zone} title={p.latest_eur_mwh != null ? `${p.label}: ${p.latest_eur_mwh} €/MWh actual · ${p.avg_today ?? '—'} media día` : `${p.label}: sin datos`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ color: isES ? ES_COLOR : '#0f172a', fontWeight: isES ? 800 : 600 }}>{p.label}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: isES ? ES_COLOR : '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(p.latest_eur_mwh, 1)}
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}> ({fmt(p.avg_today, 0)})</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#cffafe', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${p.latest_eur_mwh != null ? Math.max(0, (p.latest_eur_mwh / maxPrice) * 100) : 0}%`, height: '100%', background: color, opacity: isES ? 1 : 0.7 }} />
                    </div>
                  </li>
                )
              })}
            </ul>
            <p style={{ fontSize: 9, color: '#94a3b8', margin: '10px 0 0' }}>
              Barra proporcional al precio actual · España resaltada · entre paréntesis, media del día
            </p>
          </div>

          {/* ── Mix de generación ES + flujos cross-border ────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Mix ES */}
            <div style={{ background: '#f0fdfa', borderRadius: 6, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: 0, letterSpacing: 0.6 }}>
                  MIX GENERACIÓN ES · MW
                </p>
                {gen?.renewable_share_pct != null && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(gen.renewable_share_pct, 0)}% renovable
                  </span>
                )}
              </div>
              {!gen && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Sin datos de generación.</p>}
              {gen && topSources.length > 0 && (
                <>
                  {/* Barra apilada del mix */}
                  <div style={{ display: 'flex', height: 10, borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    {topSources.map((s) => (
                      <div key={s.name} title={`${s.name}: ${fmt(s.mw)} MW (${fmt(s.share_pct, 1)}%)`} style={{ width: `${s.share_pct}%`, background: sourceColor(s.name) }} />
                    ))}
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {topSources.slice(0, 4).map((s) => (
                      <li key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
                        <span style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: sourceColor(s.name), display: 'inline-block' }} />
                          {s.name}
                        </span>
                        <span style={{ color: '#475569', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.share_pct, 1)}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Flujos cross-border */}
            <div style={{ background: '#eff6ff', borderRadius: 6, padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
                FLUJOS CROSS-BORDER · MW
              </p>
              {!flows && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Sin datos de flujos.</p>}
              {flows && flows.neighbours.length === 0 && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Sin flujos relevantes.</p>}
              {flows && flows.neighbours.map((f) => {
                const importing = f.net_mw >= 0 // positivo = ES importa
                return (
                  <div key={f.neighbour} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #dbeafe', fontSize: 11.5 }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{f.direction}</span>
                    <span style={{ color: importing ? '#991b1b' : '#166534', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(Math.abs(f.net_mw))}
                      <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 500 }}> {importing ? 'import' : 'export'}</span>
                    </span>
                  </div>
                )
              })}
              {flows?.net_balance_mw != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginTop: 6, color: '#475569' }}>
                  <span style={{ fontWeight: 600 }}>Saldo neto</span>
                  <span style={{ fontWeight: 700, color: flows.net_balance_mw >= 0 ? '#991b1b' : '#166534', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(Math.abs(flows.net_balance_mw))} {flows.net_balance_mw >= 0 ? 'importador' : 'exportador'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', lineHeight: 1.5 }}>
        Fuente · energy-charts.info · Fraunhofer ISE (CC-BY) ·{' '}
        <a href="https://energy-charts.info" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          energy-charts.info →
        </a>
        <br />
        ENTSO-E Transparency disponible como fuente adicional cuando se configure ENTSOE_SECURITY_TOKEN.
      </p>
    </section>
  )
}

export default EuPowerContextPanel
