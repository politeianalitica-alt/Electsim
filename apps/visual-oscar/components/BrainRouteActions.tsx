'use client'

/**
 * Renderiza botones CTA para las rutas del dashboard mencionadas en una
 * respuesta del Brain. Se muestra debajo del bubble del mensaje.
 *
 * Diseño:
 *  - Pills horizontales con icono + label
 *  - Hover: borde + sombra
 *  - Click: navegación Next.js (Link)
 *  - Soporta tema dark (Brain dashboard) y light (agente-ia)
 *
 * No renderiza nada si no hay rutas.
 */

import Link from 'next/link'
import { extractRoutes, getRouteInfo } from '@/lib/ai/route-actions'

interface BrainRouteActionsProps {
  text: string
  /** 'dark' = bubble dark (BrainBriefing) · 'light' = bubble light (agente-ia). */
  theme?: 'dark' | 'light'
  /** Max número de botones a mostrar (default 3). */
  maxButtons?: number
}

export default function BrainRouteActions({
  text,
  theme = 'light',
  maxButtons = 3,
}: BrainRouteActionsProps) {
  const routes = extractRoutes(text).slice(0, maxButtons)
  if (routes.length === 0) return null

  const isDark = theme === 'dark'

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
      maxWidth: '88%',
    }}>
      {routes.map((route) => {
        const info = getRouteInfo(route)
        return (
          <Link
            key={route}
            href={route}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 13px',
              borderRadius: 999,
              background: isDark
                ? 'linear-gradient(135deg, rgba(124,58,237,0.20) 0%, rgba(91,33,182,0.25) 100%)'
                : 'linear-gradient(135deg, #1F4E8C 0%, #0F2A4F 100%)',
              border: isDark
                ? '1px solid rgba(167,139,250,0.4)'
                : '1px solid #1F4E8C',
              color: isDark ? '#c4b5fd' : '#fff',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 160ms',
              boxShadow: isDark
                ? '0 1px 2px rgba(0,0,0,0.15)'
                : '0 2px 6px rgba(31,78,140,0.25)',
              letterSpacing: '-0.005em',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              if (isDark) {
                el.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.30) 0%, rgba(91,33,182,0.40) 100%)'
                el.style.color = '#fff'
                el.style.borderColor = 'rgba(167,139,250,0.6)'
              } else {
                el.style.background = 'linear-gradient(135deg, #0F2A4F 0%, #0A1E3D 100%)'
                el.style.boxShadow = '0 4px 12px rgba(31,78,140,0.35)'
                el.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              if (isDark) {
                el.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.20) 0%, rgba(91,33,182,0.25) 100%)'
                el.style.color = '#c4b5fd'
                el.style.borderColor = 'rgba(167,139,250,0.4)'
              } else {
                el.style.background = 'linear-gradient(135deg, #1F4E8C 0%, #0F2A4F 100%)'
                el.style.boxShadow = '0 2px 6px rgba(31,78,140,0.25)'
                el.style.transform = 'translateY(0)'
              }
            }}
            title={info.description ? `${info.label} · ${info.description}` : info.label}
          >
            {info.icon && <span style={{ fontSize: 13 }}>{info.icon}</span>}
            <span>{info.label}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 1 }}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        )
      })}
    </div>
  )
}
