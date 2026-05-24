'use client'
/**
 * `<GeoKpiGrid />` · Sprint G1.
 *
 * Replica del patrón `<FamilyKpiGrid>` de la parte Economía aplicado a
 * la tab OSINT de `/geopolitica`. Agrupa indicadores por familia
 * (osint · seguridad · riesgo · presencia · sentimiento) y muestra
 * cada uno como card con:
 *  - shortLabel + valor + unit
 *  - badge ? amber si hay methodologyNote
 *  - MethodologyTooltip (reusado de macro) con methodology + release + confidence
 *  - color semafórico según threshold
 *
 * Headers colapsables igual que FamilyKpiGrid.
 */
import { useEffect, useState } from 'react'
import { GEO_INDICATORS, GEO_FAMILY_META, geoIndicatorsByFamily, type GeoFamily, type GeoIndicatorMeta } from '@/lib/geopolitica/geo-indicators'
import type { GeoSnapshot } from '@/lib/geopolitica/geo-fetcher'
import { MethodologyTooltip } from '../macro/pulso/MethodologyTooltip'

/**
 * Sprint G1: client-side fetcher · no añade función serverless.
 * Hace los fetches en paralelo agrupando indicators por endpoint
 * compartido (varios indicators tiran del mismo /api/geopolitica/stats).
 */
function dot(obj: any, path: string): any {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc: any, k) => (acc == null ? acc : acc[k]), obj)
}

function extractValue(ind: GeoIndicatorMeta, json: any): number | null {
  if (!json) return null
  switch (ind.parser) {
    case 'geo-stats-field': {
      const raw = dot(json, ind.parserKey || '')
      return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
    }
    case 'geo-list-count': {
      const key = ind.parserKey || 'data'
      const list = json?.[key]
      if (Array.isArray(list)) return list.length
      if (typeof json?.total === 'number') return json.total
      if (typeof json?.n_events_total === 'number') return json.n_events_total
      return null
    }
    case 'geo-list-mean': {
      const key = ind.parserKey || 'value'
      const list = json?.data || json?.items || []
      if (!Array.isArray(list) || !list.length) return null
      const nums = list.map((it: any) => Number(it?.[key])).filter((n: number) => Number.isFinite(n))
      return nums.length ? nums.reduce((a: number, b: number) => a + b, 0) / nums.length : null
    }
    case 'acled-count': {
      if (typeof json?.n_events_total === 'number') return json.n_events_total
      if (Array.isArray(json?.data)) return json.data.length
      return null
    }
    case 'gdelt-tone': {
      const raw = json?.tone_mean ?? json?.mean_tone ?? json?.tone
      return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
    }
    case 'static-snapshot': {
      const snap = json?.snapshot || json
      const raw = ind.parserKey ? snap?.[ind.parserKey] : null
      return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
    }
    default:
      return null
  }
}

function statusColor(meta: typeof GEO_INDICATORS[number], value: number | null): string {
  if (value == null || !meta.threshold) return meta.accent
  const { amber, red, goodAbove } = meta.threshold
  if (goodAbove === true) {
    if (red != null && value <= red) return '#dc2626'
    if (amber != null && value < amber) return '#f59e0b'
    return '#16a34a'
  }
  if (goodAbove === false) {
    if (red != null && value >= red) return '#dc2626'
    if (amber != null && value > amber) return '#f59e0b'
    return '#16a34a'
  }
  return meta.accent
}

function formatValue(v: number | null, unit: string, decimals: number): string {
  if (v == null) return '—'
  const formatted = Math.abs(v) >= 1000
    ? v.toLocaleString('es-ES', { maximumFractionDigits: decimals })
    : v.toFixed(decimals)
  return `${formatted}${unit.startsWith(' ') ? unit : unit}`
}

export function GeoKpiGrid() {
  const [byId, setById] = useState<Record<string, GeoSnapshot>>({})
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let alive = true
    // Sprint G1 · client fetch · agrupa indicators por endpoint compartido para
    // hacer 1 fetch por endpoint (varios tiran de /api/geopolitica/stats por ej.)
    const byEndpoint: Record<string, GeoIndicatorMeta[]> = {}
    for (const ind of GEO_INDICATORS) {
      if (!byEndpoint[ind.endpoint]) byEndpoint[ind.endpoint] = []
      byEndpoint[ind.endpoint].push(ind)
    }
    const period = new Date().toISOString().slice(0, 10)
    Promise.all(
      Object.entries(byEndpoint).map(async ([endpoint, indicators]) => {
        try {
          const r = await fetch(endpoint, { cache: 'force-cache' })
          if (!r.ok) {
            return indicators.map<[string, GeoSnapshot]>((ind) => [ind.id, {
              ok: false, id: ind.id, value: null, period,
              source: ind.source, sourceCode: ind.sourceCode,
              status: 'missing' as const, error: `HTTP ${r.status}`,
            }])
          }
          const json = await r.json()
          return indicators.map<[string, GeoSnapshot]>((ind) => {
            const value = extractValue(ind, json)
            return [ind.id, {
              ok: true, id: ind.id, value, period,
              source: ind.source, sourceCode: ind.sourceCode,
              status: value != null ? 'live' as const : 'missing' as const,
            }]
          })
        } catch (e: any) {
          return indicators.map<[string, GeoSnapshot]>((ind) => [ind.id, {
            ok: false, id: ind.id, value: null, period,
            source: ind.source, sourceCode: ind.sourceCode,
            status: 'missing' as const, error: String(e?.message ?? e).slice(0, 120),
          }])
        }
      }),
    ).then((groups) => {
      if (!alive) return
      const acc: Record<string, GeoSnapshot> = {}
      for (const grp of groups) for (const [id, snap] of grp) acc[id] = snap
      setById(acc)
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const byFamily = geoIndicatorsByFamily()
  const order: GeoFamily[] = ['osint', 'seguridad', 'sentimiento', 'riesgo', 'presencia', 'sanciones', 'narrativa']
  const toggle = (fam: string) => setCollapsed((c) => ({ ...c, [fam]: !c[fam] }))

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0EA5E9', borderRadius: 12, padding: 18 }}>
      <header style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0EA5E9', textTransform: 'uppercase' }}>
          Indicadores OSINT estructurados · Sprint G1
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
          {GEO_INDICATORS.length} indicadores agrupados por familia · cada card lleva metodología analista en tooltip ámbar.
        </p>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cargando snapshots geo…</p>}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {order.map((fam) => {
            const group = byFamily[fam]
            if (!group || group.length === 0) return null
            const isCollapsed = !!collapsed[fam]
            const meta = GEO_FAMILY_META[fam]
            return (
              <div key={fam}>
                <button
                  type="button"
                  onClick={() => toggle(fam)}
                  aria-expanded={!isCollapsed}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                    marginBottom: 8,
                    background: 'transparent',
                    border: 0,
                    padding: '4px 0',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 10, color: '#64748b', width: 12, display: 'inline-block', fontWeight: 700, fontVariantNumeric: 'tabular-nums' as const }}>
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                  <span style={{ width: 12, height: 12, background: meta.color, display: 'inline-block', borderRadius: 3 }} />
                  <h3 style={{ margin: 0, fontSize: 13, letterSpacing: 0.6, color: '#0f172a', fontWeight: 700, textTransform: 'uppercase' }}>
                    {meta.label}
                  </h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{meta.description}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{group.length} indicadores</span>
                </button>
                {!isCollapsed && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {group.map((indMeta) => {
                      const snap = byId[indMeta.id]
                      const v = snap?.value ?? null
                      const period = snap?.period
                      const color = statusColor(indMeta, v)
                      return (
                        <MethodologyTooltip
                          key={indMeta.id}
                          label={indMeta.label}
                          methodology={indMeta.methodologyNote}
                          release={indMeta.releaseSchedule}
                          confidence={indMeta.confidenceLevel}
                          description={indMeta.description}
                        >
                          <div
                            style={{
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              borderLeft: `3px solid ${color}`,
                              borderRadius: 8,
                              padding: 12,
                              transition: 'box-shadow 120ms ease, transform 120ms ease',
                              position: 'relative',
                            }}
                            className="geo-kpi-card"
                          >
                            <p style={{
                              margin: 0,
                              fontSize: 10,
                              color: '#64748b',
                              fontWeight: 600,
                              letterSpacing: 0.4,
                              textTransform: 'uppercase',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}>
                              {indMeta.shortLabel || indMeta.label}
                              {indMeta.methodologyNote && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 11,
                                    height: 11,
                                    background: '#fef3c7',
                                    color: '#92400e',
                                    borderRadius: '50%',
                                    fontSize: 8,
                                    fontWeight: 700,
                                    lineHeight: 1,
                                  }}
                                  aria-hidden
                                >
                                  ?
                                </span>
                              )}
                            </p>
                            <p style={{
                              margin: '6px 0 4px',
                              fontSize: 24,
                              fontWeight: 700,
                              color,
                              fontVariantNumeric: 'tabular-nums',
                              lineHeight: 1.1,
                            }}>
                              {formatValue(v, indMeta.unit, indMeta.decimals)}
                            </p>
                            <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
                              {indMeta.sourceCode} · {period ?? 's/d'}
                            </p>
                            {snap?.status === 'missing' && (
                              <span
                                style={{
                                  marginTop: 4,
                                  display: 'inline-block',
                                  fontSize: 9,
                                  padding: '1px 6px',
                                  background: '#fee2e2',
                                  color: '#991b1b',
                                  borderRadius: 4,
                                  fontWeight: 700,
                                  letterSpacing: 0.3,
                                }}
                              >
                                SIN DATO
                              </span>
                            )}
                          </div>
                        </MethodologyTooltip>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <style jsx global>{`
        .geo-kpi-card:hover {
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
        }
      `}</style>
    </section>
  )
}

export default GeoKpiGrid
