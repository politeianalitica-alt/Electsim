'use client'
/**
 * SectorPanel · contenedor reutilizable para todas las páginas /sector-*
 *
 * Provee:
 *   - <Panel> · sección con título + subtítulo + badges de fuente opcionales
 *   - <SourceBadge> · pill clickable hacia la fuente original (página oficial
 *     del organismo emisor) con hover state. Variantes 'primary' (azul) y
 *     'ghost' (gris) — esta última se usa para enlazar al endpoint JSON local.
 *
 * Cuando un Panel muestra datos en vivo de un organismo externo (ECB, Banco
 * Mundial, INE, AEMPS, REE, OTAN, etc.) se le pasa `sourceUrl` con la URL
 * pública del visor del organismo. Los Panels de contenido estático
 * (empresas, reguladores, licitaciones, áreas estratégicas, programas)
 * NO llevan sourceUrl.
 */
import { useState } from 'react'

interface PanelProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  marginBottom?: boolean
  sourceUrl?: string
  sourceLabel?: string       // texto del badge primary, default: "Fuente"
  sourceTooltip?: string     // tooltip al hover
  /** @deprecated · ya no se renderiza el badge JSON, prop aceptado para
   *  no romper firmas existentes durante la transición. */
  apiUrl?: string
}

export function Panel({
  title, subtitle, children, marginBottom,
  sourceUrl, sourceLabel, sourceTooltip,
}: PanelProps) {
  return (
    <section style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px',
      marginBottom: marginBottom ? 14 : 0,
    }}>
      <header style={{
        marginBottom:14, display:'flex', justifyContent:'space-between',
        alignItems:'baseline', flexWrap:'wrap', gap:8,
      }}>
        <h2 style={{
          margin:0, fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600,
          letterSpacing:'-0.013em', color:'#1d1d1f',
        }}>
          {title}
        </h2>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          {subtitle && <p style={{ margin:0, fontSize:11, color:'#6e6e73' }}>{subtitle}</p>}
          {sourceUrl && (
            <SourceBadge
              href={sourceUrl}
              label={sourceLabel || 'Fuente'}
              tooltip={sourceTooltip || 'Abrir página oficial del organismo emisor'}
              variant="primary"
            />
          )}
        </div>
      </header>
      {children}
    </section>
  )
}

interface SourceBadgeProps {
  href: string
  label: string
  tooltip: string
  variant: 'primary' | 'ghost'
}

export function SourceBadge({ href, label, tooltip, variant }: SourceBadgeProps) {
  const [hover, setHover] = useState(false)
  const palette = variant === 'primary'
    ? { bg:'#F5F8FC', bgHover:'#E8F0FA', border:'#D8E5F4', borderHover:'#B6CFEA', color:'#1F4E8C' }
    : { bg:'#FAFAFA', bgHover:'#F0F0F1', border:'#ECECEF', borderHover:'#D6D6DA', color:'#6e6e73' }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={tooltip}
      style={{
        display:'inline-flex', alignItems:'center', gap:4,
        fontSize:10.5, fontWeight:600, letterSpacing:'0.02em',
        color: palette.color, textDecoration:'none',
        padding:'3px 9px', borderRadius:999,
        background: hover ? palette.bgHover : palette.bg,
        border: `1px solid ${hover ? palette.borderHover : palette.border}`,
        whiteSpace:'nowrap',
        transition:'background 150ms ease, border-color 150ms ease, transform 150ms ease',
        transform: hover ? 'translateY(-0.5px)' : 'none',
      }}
    >
      {label}
      <span aria-hidden="true" style={{ fontSize:9, opacity:0.85 }}>↗</span>
    </a>
  )
}
