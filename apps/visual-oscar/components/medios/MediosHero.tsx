'use client'
/**
 * MediosHero · cabecera reutilizable del módulo Medios.
 *
 * Estilo: tarjeta limpia (sin degradado recargado) con barra de acento, título
 * de display, KPIs en vivo como pills y un MINI-MAPA integrado a la derecha
 * (España por CCAA o mundo por país) para localizar las noticias/artículos.
 * Si no se pasa `map`, ocupa todo el ancho.
 */
import type { ReactNode } from 'react'
import { LiveDot } from '@/components/Skeleton'

export interface HeroKPI {
  label: string
  value: ReactNode
  color?: string
  sub?: string
}

export default function MediosHero({
  eyebrow, title, subtitle, accent = '#1F4E8C', kpis = [],
  map, mapLabel, actions, fresh, badge,
}: {
  eyebrow: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  accent?: string
  kpis?: HeroKPI[]
  map?: ReactNode
  mapLabel?: string
  actions?: ReactNode
  fresh?: boolean
  badge?: ReactNode
}) {
  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 16,
      display: 'grid', gridTemplateColumns: map ? 'minmax(0,1fr) 300px' : '1fr',
      borderTop: `3px solid ${accent}`,
    }}>
      {/* Izquierda · texto + KPIs + acciones */}
      <div style={{ padding: '18px 22px', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <LiveDot color={fresh ? '#16A34A' : accent} />
          <span>{eyebrow}</span>
          {badge}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.02em', margin: '8px 0 0', lineHeight: 1.12, color: '#1d1d1f', maxWidth: 760 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#6e6e73', lineHeight: 1.45, maxWidth: 640 }}>{subtitle}</p>
        )}
        {kpis.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background: '#FAFAFB', border: '1px solid #ECECEF', borderRadius: 10, padding: '8px 12px', minWidth: 80 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: k.color || '#1d1d1f', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9ca3af', marginTop: 4 }}>{k.label}</div>
                {k.sub && <div style={{ fontSize: 9.5, color: '#9ca3af', marginTop: 2 }}>{k.sub}</div>}
              </div>
            ))}
          </div>
        )}
        {actions && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</div>
        )}
      </div>

      {/* Derecha · mini-mapa para localizar la noticia */}
      {map && (
        <div style={{ background: '#F8FAFC', borderLeft: '1px solid #ECECEF', padding: '10px 12px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>
            {mapLabel || 'Dónde está la noticia'}
          </span>
          <div style={{ flex: 1, minHeight: 0 }}>{map}</div>
        </div>
      )}
    </section>
  )
}
