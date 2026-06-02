/**
 * /medios/health · Sprint 1.5 · Dashboard interno observabilidad pipeline canónica.
 *
 * Render:
 *   - Estado semáforo (verde/ámbar/rojo) según pulso.confidence.score
 *   - Catálogos counts (entities, topics, rss mappings, sources)
 *   - Pipeline raw JSON (drill-down inspección)
 *
 * Sin emojis (CLAUDE.md §0.5). Marcadores Unicode: ⬡ ⊞ ⊟ ⇡ ◐ ◉ ✦ ✓ !.
 */
'use client'

import { useEffect, useState } from 'react'

type HealthStatus = 'ok' | 'degraded' | 'critical'

interface HealthData {
  ok: boolean
  status: HealthStatus
  ts: string
  elapsed_ms: number
  pipeline: unknown
  pulso_confidence: number
  catalogs: {
    entities: number
    topics: number
    rss_mappings: number
    sources: number
  }
}

// ─── Sprint 2 · pipeline_metrics (cron classifier-metrics, C9) ──────────
interface PipelineMetricRow {
  window_from: string
  window_to: string
  fetched_total: number
  duplicates_exact: number
  noise_filtered: number
  processed_successfully: number
  classified_with_taxonomy: number
  classification_by_method: Record<string, number>
  otro_percentage: number
}

interface MetricsResponse {
  window: string
  series: PipelineMetricRow[]
}

interface Sprint2Job {
  name: string
  schedule: string
  window: string
  desc: string
}

// Jobs Sprint 2 registrados en lib/medios/canonical/maintenance/index.ts.
// NO son crons Vercel independientes: el cron base /api/cron/medios-mantenimiento
// (schedule "0 * * * *", hourly) los despacha y cada job se gatea por hora UTC
// (ver shouldRunNow). El campo `window` refleja esa condición horaria real.
const SPRINT2_JOBS: Sprint2Job[] = [
  {
    name: 'topic-prominence-snapshot',
    schedule: 'hourly',
    window: 'cada hora',
    desc: 'Snapshot por topic: volume/momentum/diversity/state → topic_prominence_history',
  },
  {
    name: 'unmapped-tags',
    schedule: '6hourly',
    window: 'hora UTC ∈ {0,6,12,18}',
    desc: 'Detecta RSS tags sin mapeo en rss-tag-map.json (cobertura L1)',
  },
  {
    name: 'terms-not-classified',
    schedule: '12hourly',
    window: 'hora UTC ∈ {0,12}',
    desc: 'Clúster TF-IDF de titulares OTRO (gaps de taxonomía)',
  },
  {
    name: 'classifier-metrics',
    schedule: 'daily',
    window: 'hora UTC = 3',
    desc: 'Agrega pipeline 24h → pipeline_metrics (otro_percentage, by_method)',
  },
]

const COLOR_BY_STATUS: Record<HealthStatus, string> = {
  ok: '#16a34a',
  degraded: '#f59e0b',
  critical: '#dc2626',
}

const GLYPH_BY_STATUS: Record<HealthStatus, string> = {
  ok: '◉',
  degraded: '◐',
  critical: '!',
}

const LABEL_BY_STATUS: Record<HealthStatus, string> = {
  ok: 'OK',
  degraded: 'DEGRADED',
  critical: 'CRITICAL',
}

export default function MediosHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Sprint 2 · series pipeline_metrics (24h para distribución, 7d para trend).
  const [metrics24h, setMetrics24h] = useState<MetricsResponse | null>(null)
  const [metrics7d, setMetrics7d] = useState<MetricsResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/medios/health', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<HealthData>
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // Fetches independientes del health principal: si fallan, las secciones
    // Sprint 2 muestran su empty-state pero la página no rompe.
    fetch('/api/medios/maintenance/metrics?window=24h', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<MetricsResponse>) : null))
      .then((d) => {
        if (!cancelled && d) setMetrics24h(d)
      })
      .catch(() => undefined)
    fetch('/api/medios/maintenance/metrics?window=7d', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<MetricsResponse>) : null))
      .then((d) => {
        if (!cancelled && d) setMetrics7d(d)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
        <h1 style={{ marginBottom: 8 }}>Medios · Health Dashboard</h1>
        <p style={{ color: '#dc2626' }}>Error: {error}</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main style={{ padding: 24, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
        <h1 style={{ marginBottom: 8 }}>Medios · Health Dashboard</h1>
        <p>Cargando…</p>
      </main>
    )
  }

  const color = COLOR_BY_STATUS[data.status]
  const glyph = GLYPH_BY_STATUS[data.status]
  const label = LABEL_BY_STATUS[data.status]

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
        maxWidth: 1100,
      }}
    >
      <h1 style={{ marginBottom: 4, fontSize: 18, fontWeight: 700 }}>
        ⬡ Medios · Health Dashboard
      </h1>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 16 }}>
        Sprint 1.5 · Observabilidad pipeline canónica · {data.ts}
      </p>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            border: `1px solid ${color}`,
            background: `${color}10`,
            borderRadius: 6,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>ESTADO</div>
          <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: 0.5 }}>
            <span style={{ marginRight: 6 }}>{glyph}</span>
            {label}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
            confidence: {data.pulso_confidence.toFixed(3)} · {data.elapsed_ms}ms
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>CATÁLOGOS</div>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div>⊞ entities: <strong>{data.catalogs.entities}</strong></div>
            <div>⊞ topics: <strong>{data.catalogs.topics}</strong></div>
            <div>⊞ rss mappings: <strong>{data.catalogs.rss_mappings}</strong></div>
            <div>⊞ sources: <strong>{data.catalogs.sources}</strong></div>
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>SEMÁFORO</div>
          <div style={{ fontSize: 12, lineHeight: 1.8 }}>
            <div>
              <span style={{ color: COLOR_BY_STATUS.ok }}>◉ ok</span> · score ≥ 0.70
            </div>
            <div>
              <span style={{ color: COLOR_BY_STATUS.degraded }}>◐ degraded</span> · 0.50–0.69
            </div>
            <div>
              <span style={{ color: COLOR_BY_STATUS.critical }}>! critical</span> · &lt; 0.50
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>⊟ Pipeline (raw)</h2>
        <pre
          style={{
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: 12,
            overflow: 'auto',
            fontSize: 11,
            lineHeight: 1.5,
            maxHeight: 420,
          }}
        >
          {JSON.stringify(data.pipeline, null, 2)}
        </pre>
      </section>

      {/* ─── Sprint 2 ─────────────────────────────────────────────── */}
      <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '24px 0 16px' }} />
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
        ◆ Sprint 2 · Clasificador & Scoring
      </h2>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 16, fontSize: 12 }}>
        Métricas del clasificador en cascada (L1 RSS_TAG → L2 HEURISTIC → L3 SEMANTIC)
        y jobs de mantenimiento. Datos vía cron classifier-metrics (pipeline_metrics).
      </p>

      <ClassifierSection latest={metrics24h?.series?.[0] ?? null} loaded={metrics24h !== null} />

      <OtroTrendSection series={metrics7d?.series ?? null} loaded={metrics7d !== null} />

      <section style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>⊞ Jobs Sprint 2</h3>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 0, marginBottom: 8 }}>
          Despachados por el cron base /api/cron/medios-mantenimiento (0 * * * *, cada hora);
          cada job se gatea por hora UTC.
        </p>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '6px 8px' }}>JOB</th>
              <th style={{ padding: '6px 8px' }}>SCHEDULE</th>
              <th style={{ padding: '6px 8px' }}>VENTANA UTC</th>
              <th style={{ padding: '6px 8px' }}>DESCRIPCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {SPRINT2_JOBS.map((j) => (
              <tr key={j.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{j.name}</td>
                <td style={{ padding: '6px 8px', color: '#6b7280' }}>{j.schedule}</td>
                <td style={{ padding: '6px 8px', color: '#374151' }}>{j.window}</td>
                <td style={{ padding: '6px 8px', color: '#374151' }}>{j.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p style={{ fontSize: 11, color: '#9ca3af' }}>
        ⇡ Cache público s-maxage=300 · stale-while-revalidate=600 · snapshot diario via cron
        /api/cron/medios-probe (0 6 * * *).
      </p>
    </main>
  )
}

// ─── Sprint 2 · sub-secciones ──────────────────────────────────────────

const EMPTY_STATE_24H =
  'Sin snapshots aún — el cron classifier-metrics corre cada 24h y persiste en pipeline_metrics.'

/**
 * Distribución classification_by_method + otro_percentage del último
 * snapshot 24h. Empty-state cuando no hay snapshots.
 */
function ClassifierSection({
  latest,
  loaded,
}: {
  latest: PipelineMetricRow | null
  loaded: boolean
}) {
  const otroColor =
    latest == null
      ? '#6b7280'
      : latest.otro_percentage <= 8
        ? '#16a34a'
        : latest.otro_percentage <= 15
          ? '#f59e0b'
          : '#dc2626'

  const methods = latest?.classification_by_method ?? {}
  const methodTotal = Object.values(methods).reduce((s, n) => s + (Number(n) || 0), 0)

  return (
    <section style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
        ◉ Clasificador (24h)
      </h3>
      {latest == null ? (
        <div
          style={{
            border: '1px dashed #d1d5db',
            borderRadius: 6,
            padding: 14,
            color: '#9ca3af',
            fontSize: 12,
          }}
        >
          {loaded ? EMPTY_STATE_24H : 'Cargando…'}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              border: `1px solid ${otroColor}`,
              background: `${otroColor}10`,
              borderRadius: 6,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>OTRO %</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: otroColor }}>
              {latest.otro_percentage.toFixed(2)}%
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
              objetivo ≤ 8% · fetched {latest.fetched_total}
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
              classification_by_method
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              {Object.keys(methods).length === 0 ? (
                <span style={{ color: '#9ca3af' }}>—</span>
              ) : (
                Object.entries(methods).map(([k, v]) => {
                  const n = Number(v) || 0
                  const pct = methodTotal > 0 ? (n / methodTotal) * 100 : 0
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ minWidth: 160 }}>{k}</span>
                      <span
                        style={{
                          display: 'inline-block',
                          height: 8,
                          width: `${Math.max(pct, 0)}%`,
                          maxWidth: 120,
                          background: '#3b82f6',
                          borderRadius: 2,
                        }}
                      />
                      <strong>{n}</strong>
                      <span style={{ color: '#9ca3af' }}>({pct.toFixed(0)}%)</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 14 }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>pipeline 24h</div>
            <div style={{ fontSize: 12, lineHeight: 1.7 }}>
              <div>⊟ duplicates exact: <strong>{latest.duplicates_exact}</strong></div>
              <div>⊟ noise filtered: <strong>{latest.noise_filtered}</strong></div>
              <div>✓ processed: <strong>{latest.processed_successfully}</strong></div>
              <div>✓ con taxonomía: <strong>{latest.classified_with_taxonomy}</strong></div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Evolución temporal de otro_percentage (ventana 7d). Barras inline
 * (sin librería de charts). Empty-state cuando no hay snapshots.
 */
function OtroTrendSection({
  series,
  loaded,
}: {
  series: PipelineMetricRow[] | null
  loaded: boolean
}) {
  const rows = series ?? []
  const maxOtro = rows.reduce((m, r) => Math.max(m, r.otro_percentage), 0) || 1

  return (
    <section style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>⇡ OTRO trend (7d)</h3>
      {rows.length === 0 ? (
        <div
          style={{
            border: '1px dashed #d1d5db',
            borderRadius: 6,
            padding: 14,
            color: '#9ca3af',
            fontSize: 12,
          }}
        >
          {loaded
            ? 'Sin snapshots en los últimos 7 días — espera a que el cron classifier-metrics acumule historia.'
            : 'Cargando…'}
        </div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '6px 8px' }}>VENTANA HASTA</th>
              <th style={{ padding: '6px 8px' }}>OTRO %</th>
              <th style={{ padding: '6px 8px', width: '50%' }}>&nbsp;</th>
              <th style={{ padding: '6px 8px' }}>FETCHED</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const widthPct = (r.otro_percentage / maxOtro) * 100
              const barColor =
                r.otro_percentage <= 8 ? '#16a34a' : r.otro_percentage <= 15 ? '#f59e0b' : '#dc2626'
              return (
                <tr key={`${r.window_to}-${i}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 8px', color: '#374151' }}>
                    {new Date(r.window_to).toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: barColor }}>
                    {r.otro_percentage.toFixed(2)}%
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        height: 8,
                        width: `${Math.max(widthPct, 1)}%`,
                        background: barColor,
                        borderRadius: 2,
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                    {r.fetched_total}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
