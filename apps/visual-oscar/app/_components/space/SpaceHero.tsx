'use client'

/**
 * SpaceHero — cabecera unificada estilo War Room para TODOS los espacios
 * del workspace (Estudio, Toolbox, Cuaderno, Command Center).
 *
 * Replica la "visual del War Room": banner oscuro con gradiente + glow
 * radial, bloque de icono, eyebrow en mayúsculas, título display y una tira
 * opcional de KPIs a la derecha. Así los cinco espacios comparten la misma
 * firma visual aunque sus funciones difieran.
 */

import './space-chrome.css'

export interface SpaceKpi {
  label: string
  value: string
  /** Color de acento del KPI (borde + etiqueta). */
  accent?: string
}

interface SpaceHeroProps {
  /** Iniciales o glifo del bloque-icono (1-2 caracteres). */
  icon: string
  /** Color del bloque-icono. */
  iconColor?: string
  eyebrow: string
  title: string
  subtitle?: string
  kpis?: SpaceKpi[]
  /** Contenido libre alineado a la derecha (en vez de / además de KPIs). */
  right?: React.ReactNode
}

export function SpaceHero({ icon, iconColor = '#1F4E8C', eyebrow, title, subtitle, kpis, right }: SpaceHeroProps) {
  return (
    <section className="space-hero">
      <div className="space-hero-glow" />
      <div className="space-hero-inner">
        <div className="space-hero-left">
          <div className="space-hero-icon" style={{ background: iconColor, boxShadow: `0 4px 16px ${iconColor}80` }}>
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="space-hero-eyebrow">{eyebrow}</p>
            <div className="space-hero-name">{title}</div>
            {subtitle && <div className="space-hero-sub">{subtitle}</div>}
          </div>
        </div>
        <div />
        {kpis && kpis.length > 0 && (
          <div className="space-hero-kpis">
            {kpis.map((k) => (
              <div key={k.label} className="space-hero-kpi" style={{ borderColor: `${k.accent ?? '#1F4E8C'}55` }}>
                <div className="space-hero-kpi-value">{k.value}</div>
                <div className="space-hero-kpi-label" style={{ color: k.accent ?? '#9FB3C8' }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}
        {right}
      </div>
    </section>
  )
}
