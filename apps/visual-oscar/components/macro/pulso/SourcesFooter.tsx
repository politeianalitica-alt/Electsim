'use client'
/**
 * `<SourcesFooter />` · Sprint N5.
 *
 * Footer auditable de las fuentes que alimentan el subtab actual.
 * Para cada fuente única del catálogo agrega:
 *  - nombre + sourceCode técnico
 *  - número de indicadores que la usan
 *  - cobertura live / stale / sin dato
 *  - frecuencia de actualización dominante
 *  - estado agregado (verde si ≥80% live, amber 50-80%, rojo <50%)
 *
 * Responde a la petición del usuario "plasmar la info de las fuentes en el dashboard".
 */
import { useMemo } from 'react'
import type { PulsoIndicatorMeta } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface Props {
  indicators: PulsoIndicatorMeta[]
  byId: Record<string, PulsoFetchResult>
  accent: string
}

interface SourceAggregate {
  name: string
  sourceCodes: string[]
  total: number
  live: number
  stale: number
  missing: number
  frequencies: Record<string, number>
}

export function SourcesFooter({ indicators, byId, accent }: Props) {
  const aggregates = useMemo<SourceAggregate[]>(() => {
    const map = new Map<string, SourceAggregate>()
    for (const meta of indicators) {
      const key = meta.source
      const cur = map.get(key) || {
        name: meta.source,
        sourceCodes: [],
        total: 0,
        live: 0,
        stale: 0,
        missing: 0,
        frequencies: {},
      }
      cur.total += 1
      if (!cur.sourceCodes.includes(meta.sourceCode)) cur.sourceCodes.push(meta.sourceCode)
      cur.frequencies[meta.frequency] = (cur.frequencies[meta.frequency] || 0) + 1
      const status = byId[meta.id]?.status || 'missing'
      if (status === 'live') cur.live += 1
      else if (status === 'stale') cur.stale += 1
      else cur.missing += 1
      map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [indicators, byId])

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: accent, textTransform: 'uppercase' }}>
        Fuentes que alimentan este subtab · {aggregates.length} proveedores · {indicators.length} series totales
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
        Trazabilidad completa por proveedor. Estado agregado por proveedor según cobertura live de sus series en este subtab.
      </p>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {aggregates.map((a) => {
          const coverPct = a.total > 0 ? (a.live / a.total) * 100 : 0
          const statusColor = coverPct >= 80 ? '#16a34a' : coverPct >= 50 ? '#f59e0b' : '#dc2626'
          const statusLabel = coverPct >= 80 ? 'OK' : coverPct >= 50 ? 'Parcial' : 'Crítico'
          const dominantFreq = Object.entries(a.frequencies).sort((x, y) => y[1] - x[1])[0]?.[0] || '—'
          return (
            <div key={a.name} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderLeft: `3px solid ${statusColor}`, borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{a.name}</p>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: statusColor, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {statusLabel}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b', fontFamily: 'ui-monospace, SF Mono, monospace' }}>
                {a.sourceCodes.slice(0, 3).join(' · ')}
                {a.sourceCodes.length > 3 && <span style={{ color: '#94a3b8' }}> +{a.sourceCodes.length - 3}</span>}
              </p>
              <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 10, color: '#64748b', flexWrap: 'wrap' }}>
                <span><strong style={{ color: '#0f172a' }}>{a.total}</strong> series</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>{a.live} live</span>
                {a.stale > 0 && <span style={{ color: '#f59e0b', fontWeight: 600 }}>{a.stale} stale</span>}
                {a.missing > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>{a.missing} sin dato</span>}
                <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>· {dominantFreq}</span>
              </div>
              {/* Mini bar de cobertura */}
              <div style={{ marginTop: 8, position: 'relative', height: 5, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${coverPct}%`, background: statusColor, transition: 'width 200ms ease' }} />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8' }}>
                {coverPct.toFixed(0)}% cobertura live
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default SourcesFooter
