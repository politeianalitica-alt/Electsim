'use client'
/**
 * `<AlertasMacro />` · alertas computadas client-side a partir del
 * overview · sólo se muestra cuando hay umbrales rotos.
 */
import Link from 'next/link'
import type { PulsoIndicatorMeta } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface Props {
  byId: Record<string, PulsoFetchResult>
  catalog: PulsoIndicatorMeta[]
  /** Slug del subtab para construir href correcto. Default: pulso-macro. */
  subtabSlug?: string
}

interface Alert {
  id: string
  level: 'amber' | 'red'
  label: string
  value: number
  unit: string
  threshold: number
  goodAbove: boolean
  period: string | null
  reason: string
}

function evaluateAlerts(byId: Record<string, PulsoFetchResult>, catalog: PulsoIndicatorMeta[]): Alert[] {
  const out: Alert[] = []
  for (const ind of catalog) {
    const r = byId[ind.id]
    if (!r?.last?.value || !ind.threshold) continue
    const v = r.last.value
    const { amber, red, goodAbove } = ind.threshold
    if (goodAbove === true) {
      if (red != null && v <= red) {
        out.push({ id: ind.id, level: 'red', label: ind.label, value: v, unit: ind.unit, threshold: red, goodAbove: true, period: r.last.period, reason: `${v}${ind.unit} ≤ rojo ${red}${ind.unit}` })
      } else if (amber != null && v < amber) {
        out.push({ id: ind.id, level: 'amber', label: ind.label, value: v, unit: ind.unit, threshold: amber, goodAbove: true, period: r.last.period, reason: `${v}${ind.unit} < ámbar ${amber}${ind.unit}` })
      }
    } else if (goodAbove === false) {
      if (red != null && v >= red) {
        out.push({ id: ind.id, level: 'red', label: ind.label, value: v, unit: ind.unit, threshold: red, goodAbove: false, period: r.last.period, reason: `${v}${ind.unit} ≥ rojo ${red}${ind.unit}` })
      } else if (amber != null && v > amber) {
        out.push({ id: ind.id, level: 'amber', label: ind.label, value: v, unit: ind.unit, threshold: amber, goodAbove: false, period: r.last.period, reason: `${v}${ind.unit} > ámbar ${amber}${ind.unit}` })
      }
    }
  }
  // Rojos primero
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'red' ? -1 : 1))
}

export function AlertasMacro({ byId, catalog, subtabSlug = 'pulso-macro' }: Props) {
  const alerts = evaluateAlerts(byId, catalog)
  if (alerts.length === 0) {
    return (
      <section
        style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: 10,
          padding: 14,
          fontSize: 12,
          color: '#166534',
        }}
      >
        <strong>✓ Sin alertas activas</strong> · todos los indicadores macro con umbral definido están dentro de banda verde.
      </section>
    )
  }

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #dc2626',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#dc2626', textTransform: 'uppercase' }}>
          Alertas activas · {alerts.length} umbrales rotos
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Indicadores que han cruzado umbral ámbar o rojo según criterio académico.
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {alerts.map((a) => {
          const color = a.level === 'red' ? '#dc2626' : '#f59e0b'
          const bg = a.level === 'red' ? '#fee2e2' : '#fef3c7'
          return (
            <Link
              key={a.id}
              href={`/macro/${subtabSlug}/indicator/${a.id}`}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                padding: '8px 10px',
                background: bg,
                border: `1px solid ${color}40`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 6,
                fontSize: 12,
                color: '#0f172a',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 9, padding: '2px 6px', background: color, color: '#fff', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4 }}>
                {a.level === 'red' ? 'ROJO' : 'ÁMBAR'}
              </span>
              <span style={{ fontWeight: 600 }}>{a.label}</span>
              <span style={{ color: '#475569', flex: 1 }}>· {a.reason}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{a.period ?? ''} · ver detalle →</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default AlertasMacro
