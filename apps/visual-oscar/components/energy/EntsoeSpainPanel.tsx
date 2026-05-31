'use client'
/**
 * `<EntsoeSpainPanel />` · ENTSO-E Transparency Platform · datos UE.
 *
 * Muestra:
 *   - Estadísticas de precios día-anterior España últimos 7 días
 *   - Mix de generación por tecnología
 *   - Saldo neto interconexión PT/FR
 *
 * Si ENTSOE_API_KEY no está configurado, muestra empty state
 * didáctico con plantilla de email para solicitarlo.
 */
import { useEffect, useState } from 'react'

interface PriceStats {
  avg_eur_mwh: number | null
  max_eur_mwh: number | null
  min_eur_mwh: number | null
}
interface GenerationItem {
  psr_type: string
  label: string
  mwh: number
}
interface CrossBorderData {
  neighbor: string
  es_export_mwh: number
  es_import_mwh: number
  net_balance_mwh: number
  net_direction: string
}
interface DataQ { source_type: string; source_name: string; note?: string }

const ACCENT = '#1e3a8a' // azul ENTSO-E

export function EntsoeSpainPanel() {
  const [prices, setPrices] = useState<{ ok: boolean; stats?: PriceStats; data_quality?: DataQ; activation_steps?: string[] } | null>(null)
  const [generation, setGeneration] = useState<{ ok: boolean; breakdown?: GenerationItem[]; total_mwh?: number; data_quality?: DataQ } | null>(null)
  const [crossPT, setCrossPT] = useState<CrossBorderData | null>(null)
  const [crossFR, setCrossFR] = useState<CrossBorderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/entsoe/spain-prices?days=7', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/entsoe/spain-generation?days=1', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/entsoe/cross-border?neighbor=PT&days=1', { cache: 'force-cache' }).then((r) => r.json()),
      fetch('/api/entsoe/cross-border?neighbor=FR&days=1', { cache: 'force-cache' }).then((r) => r.json()),
    ]).then(([p, g, ptr, fra]) => {
      if (!alive) return
      setPrices(p)
      setGeneration(g)
      if (ptr.ok) setCrossPT(ptr)
      if (fra.ok) setCrossFR(fra)
    }).catch(() => {}).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const tokenConfigured = prices?.ok || generation?.ok
  // Sprint Quality-Q-A.1 · `activation_steps` ya no se renderiza al usuario
  // (los pasos eran info interna de ops). Se mantiene en el shape del endpoint
  // por compat retrograda · si se necesita debugging, ver /api/entsoe/health.

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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 0.8, color: ACCENT, fontWeight: 700, margin: 0 }}>
            ENTSO-E · TRANSPARENCY PLATFORM · UE-27
          </p>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
            Precios mayoristas · mix generación · flujos transfronterizos PT/FR · cache 1h
          </p>
        </div>
        {tokenConfigured ? (
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

      {!loading && !tokenConfigured && (
        // Sprint Quality-Q-A.1 · empty state limpio.
        // ANTES: la sección filtraba al usuario final (a) email personal del
        // fundador (politeianalitica@gmail.com), (b) nombre propio en la firma
        // ("Antonio"), (c) el nombre de la variable de entorno de Vercel
        // (ENTSOE_API_KEY) y (d) una plantilla completa de email para
        // solicitar el token a transparency@entsoe.eu.
        // El procedimiento de activación se movió a docs/internal/entsoe-activation.md
        // (no accesible al cliente). Aquí dejamos un mensaje neutro que orienta
        // al visor oficial mientras la integración se reactiva.
        <div style={{ padding: 12, background: '#fef9e7', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
          <strong>Datos UE-27 (ENTSO-E) en activación</strong>
          <p style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
            Los precios mayoristas paneuropeos, el mix de generación y los flujos
            transfronterizos PT/FR estarán disponibles próximamente. Mientras
            tanto, puedes consultar el visor oficial:{' '}
            <a
              href="https://transparency.entsoe.eu"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}
            >
              transparency.entsoe.eu →
            </a>
          </p>
        </div>
      )}

      {!loading && tokenConfigured && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Precios mayoristas */}
          <div style={{ background: '#eff6ff', borderRadius: 6, padding: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
              PRECIO DAY-AHEAD ES · 7 DÍAS
            </p>
            {prices?.stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                <div>
                  <p style={{ fontSize: 9, color: '#64748b', margin: 0, fontWeight: 600 }}>MEDIA</p>
                  <p style={{ fontSize: 18, color: ACCENT, fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                    {prices.stats.avg_eur_mwh ?? '—'}
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}> €/MWh</span>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 9, color: '#64748b', margin: 0, fontWeight: 600 }}>MIN</p>
                  <p style={{ fontSize: 14, color: '#166534', fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                    {prices.stats.min_eur_mwh ?? '—'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 9, color: '#64748b', margin: 0, fontWeight: 600 }}>MAX</p>
                  <p style={{ fontSize: 14, color: '#991b1b', fontWeight: 700, margin: '2px 0 0', fontVariantNumeric: 'tabular-nums' }}>
                    {prices.stats.max_eur_mwh ?? '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>—</p>
            )}
          </div>

          {/* Saldo interconexiones */}
          <div style={{ background: '#f0fdfa', borderRadius: 6, padding: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
              INTERCONEXIONES · ÚLTIMAS 24H
            </p>
            {crossPT && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #ccfbf1', fontSize: 11 }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>España ↔ Portugal</span>
                <span style={{ color: '#0e7490', fontVariantNumeric: 'tabular-nums' }}>
                  {crossPT.net_balance_mwh > 0 ? '+' : ''}{crossPT.net_balance_mwh.toLocaleString('es-ES')} MWh
                </span>
              </div>
            )}
            {crossFR && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>España ↔ Francia</span>
                <span style={{ color: '#0e7490', fontVariantNumeric: 'tabular-nums' }}>
                  {crossFR.net_balance_mwh > 0 ? '+' : ''}{crossFR.net_balance_mwh.toLocaleString('es-ES')} MWh
                </span>
              </div>
            )}
            <p style={{ fontSize: 9, color: '#94a3b8', margin: '6px 0 0' }}>
              Positivo = ES exporta · negativo = ES importa
            </p>
          </div>

          {/* Mix generación */}
          {generation?.breakdown && generation.breakdown.length > 0 && (
            <div style={{ gridColumn: 'span 2', background: '#f9fafb', borderRadius: 6, padding: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 8px', letterSpacing: 0.6 }}>
                MIX GENERACIÓN ES · 24H · TOTAL {generation.total_mwh?.toFixed(0) ?? '—'} MWh
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11 }}>
                {generation.breakdown.slice(0, 10).map((g) => {
                  const pct = generation.total_mwh ? (g.mwh / generation.total_mwh) * 100 : 0
                  return (
                    <li key={g.psr_type} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{g.label}</span>
                      <span style={{ color: ACCENT, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {g.mwh.toLocaleString('es-ES')} MWh · {pct.toFixed(1)}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: 10, color: '#94a3b8', margin: '10px 0 0', textAlign: 'right' }}>
        Fuente · ENTSO-E ·{' '}
        <a href="https://transparency.entsoe.eu" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>
          transparency.entsoe.eu →
        </a>
      </p>
    </section>
  )
}

export default EntsoeSpainPanel
