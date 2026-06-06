'use client'

import { useState } from 'react'
import { SECTOR_MAP_LAYERS, sectorMapHref } from '@/lib/sector-map-layers'

interface Props {
  sector: string
  accent?: string
  /** Altura del mini-mapa (px). */
  height?: number
  /** Texto de la etiqueta superior (por defecto "N capas del sector"). */
  caption?: string
  /** Margen superior (px). Por defecto 18; usar 0 dentro de rejillas. */
  marginTop?: number
  /** Si true, no carga el mapa hasta que el usuario pulsa (póster + botón). */
  lazyClick?: boolean
}

/**
 * Vista inicial embebida del mapa OSINT con las capas del sector activadas,
 * más un botón para abrir el módulo de mapa completo. Reutiliza /osint-global
 * en modo embed (sin el chrome) vía iframe del mismo origen.
 */
export function SectorMapPreview({ sector, accent = '#111827', height = 340, caption, marginTop = 18, lazyClick = false }: Props) {
  const layers = SECTOR_MAP_LAYERS[sector] ?? []
  const [loaded, setLoaded] = useState(!lazyClick)
  if (layers.length === 0) return null
  const embedSrc = `/osint-global?layers=${layers.join(',')}&lat=22&lon=10&zoom=1.7&embed=1`
  const fullHref = sectorMapHref(sector)

  return (
    <div
      style={{
        position: 'relative',
        marginTop,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        background: '#04040A',
      }}
    >
      {loaded ? (
        <iframe
          src={embedSrc}
          title={`Mapa OSINT · ${sector}`}
          loading="lazy"
          style={{ width: '100%', height, border: 0, display: 'block' }}
        />
      ) : (
        <button
          onClick={() => setLoaded(true)}
          title="Cargar el mini-mapa OSINT"
          style={{
            width: '100%', height, border: 0, cursor: 'pointer', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'radial-gradient(circle at 50% 40%, #0d1b2e 0%, #04040A 70%)', color: '#cbd5e1',
          }}
        >
          <svg width="34" height="34" viewBox="0 0 16 16" fill="none" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 2 1.5 4v10L6 12l4 2 4.5-2V2L10 4 6 2Z" /><path d="M6 2v10M10 4v10" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Cargar mapa OSINT</span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>{caption ?? `${layers.length} capas`}</span>
        </button>
      )}

      {/* Etiqueta superior izquierda */}
      <div
        style={{
          position: 'absolute', left: 12, top: 12,
          background: 'rgba(4,4,10,0.72)', backdropFilter: 'blur(6px)',
          color: '#fff', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em',
          padding: '4px 9px', borderRadius: 6, pointerEvents: 'none',
        }}
      >
        Mapa OSINT · {caption ?? `${layers.length} capas del sector`}
      </div>

      {/* Botón ampliar información */}
      <a
        href={fullHref}
        style={{
          position: 'absolute', right: 12, bottom: 12,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 13px', fontSize: 12, fontWeight: 700,
          background: accent, color: '#fff',
          borderRadius: 8, textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        }}
      >
        Ampliar información
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 3h7v7M13 3 3 13" />
        </svg>
      </a>
    </div>
  )
}
