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

      <p style={{ fontSize: 11, color: '#9ca3af' }}>
        ⇡ Cache público s-maxage=300 · stale-while-revalidate=600 · snapshot diario via cron
        /api/cron/medios-probe (0 6 * * *).
      </p>
    </main>
  )
}
