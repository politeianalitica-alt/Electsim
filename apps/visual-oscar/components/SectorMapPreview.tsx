'use client'

import { SECTOR_MAP_LAYERS, sectorMapHref } from '@/lib/sector-map-layers'

interface Props {
  sector: string
  accent?: string
  /** Altura del mini-mapa (px). */
  height?: number
}

/**
 * Vista inicial embebida del mapa OSINT con las capas del sector activadas,
 * más un botón para abrir el módulo de mapa completo. Reutiliza /osint-global
 * en modo embed (sin el chrome) vía iframe del mismo origen.
 */
export function SectorMapPreview({ sector, accent = '#111827', height = 340 }: Props) {
  const layers = SECTOR_MAP_LAYERS[sector] ?? []
  if (layers.length === 0) return null
  const embedSrc = `/osint-global?layers=${layers.join(',')}&lat=22&lon=10&zoom=1.7&embed=1`
  const fullHref = sectorMapHref(sector)

  return (
    <div
      style={{
        position: 'relative',
        marginTop: 18,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        background: '#04040A',
      }}
    >
      <iframe
        src={embedSrc}
        title={`Mapa OSINT · ${sector}`}
        loading="lazy"
        style={{ width: '100%', height, border: 0, display: 'block' }}
      />

      {/* Etiqueta superior izquierda */}
      <div
        style={{
          position: 'absolute', left: 12, top: 12,
          background: 'rgba(4,4,10,0.72)', backdropFilter: 'blur(6px)',
          color: '#fff', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em',
          padding: '4px 9px', borderRadius: 6, pointerEvents: 'none',
        }}
      >
        Mapa OSINT · {layers.length} capas del sector
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
