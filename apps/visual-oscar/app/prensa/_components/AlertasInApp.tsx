'use client'

/**
 * AlertasInApp — alertas calculadas en cliente a partir del análisis ya
 * disponible (sin backend de notificaciones): temas acelerando, polémicas
 * altas, huecos de cobertura y desequilibrio ideológico. Banda compacta arriba
 * del Pulso. Sin emojis (CLAUDE.md §0.5).
 */

interface ClusterLike {
  title: string
  main_topic?: string
  acceleration_score?: number
  velocity_score?: number
  controversy_score?: number
}
interface GapLike {
  topic: string
  interpretation?: string
}

type Alert = { kind: string; label: string; color: string; bg: string; text: string }

export default function AlertasInApp({
  clusters,
  gaps,
  balanceScore,
}: {
  clusters?: ClusterLike[]
  gaps?: GapLike[]
  balanceScore?: number
}) {
  const alerts: Alert[] = []
  const seen = new Set<string>()
  const push = (a: Alert) => {
    const key = `${a.kind}:${a.text}`
    if (seen.has(key)) return
    seen.add(key)
    alerts.push(a)
  }

  for (const c of clusters ?? []) {
    if ((c.acceleration_score ?? 0) >= 55 || (c.velocity_score ?? 0) >= 70) {
      push({ kind: 'acelera', label: 'Acelerando', color: '#991b1b', bg: '#fee2e2', text: c.title })
    }
    if ((c.controversy_score ?? 0) >= 65) {
      push({ kind: 'polemica', label: 'Polémica alta', color: '#92400e', bg: '#fef3c7', text: c.title })
    }
  }
  for (const g of (gaps ?? []).slice(0, 2)) {
    push({ kind: 'hueco', label: 'Cobertura baja', color: '#3730a3', bg: '#e0e7ff', text: g.topic })
  }
  if (balanceScore != null && balanceScore < 0.4) {
    push({ kind: 'sesgo', label: 'Desequilibrio ideológico', color: '#475569', bg: '#f1f5f9', text: 'La cobertura se concentra en pocos espectros ideológicos' })
  }

  if (alerts.length === 0) return null
  const shown = alerts.slice(0, 6)

  return (
    <section style={{ background: '#fff', border: '1px solid #ECECEF', borderRadius: 12, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3a3a3d' }}>
          ! Alertas automáticas
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{alerts.length} señal{alerts.length === 1 ? '' : 'es'} detectada{alerts.length === 1 ? '' : 's'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shown.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: a.color, background: a.bg, padding: '3px 9px', borderRadius: 999, minWidth: 118, textAlign: 'center' }}>
              {a.label}
            </span>
            <span style={{ fontSize: 12.5, color: '#1d1d1f', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.text}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
