'use client'

/**
 * <CuadernoEntityWidget> · widget reusable para embed en cualquier página
 * del dashboard que muestra todas las notas del Cuaderno que mencionan
 * una entidad concreta.
 *
 * Sprint Cuaderno N2 · bidireccional dashboard ↔ cuaderno.
 *
 * Uso:
 *   <CuadernoEntityWidget slug="pedro-sanchez" name="Pedro Sánchez" />
 *
 * Renderiza si hay >=1 nota; null si vacío.
 *
 * Donde tiene sentido embebir:
 *   /figuras/[slug]            · slug = nombre político
 *   /partidos/[slug]           · slug = partido
 *   /sector-X                  · slug = sector
 *   /macro?ccaa=X              · slug = ccaa
 *   /investigations/[id]       · cuando el id matchea entidad
 */

import { useEffect, useState } from 'react'
import { notesByEntitySlug, type CuadernoNote } from '@/lib/cuaderno/store'

interface Props {
  /** Slug canónico del registry (e.g. 'pedro-sanchez') */
  slug: string
  /** Nombre display para el header (e.g. 'Pedro Sánchez') */
  name: string
  /** Opcional · color del accent (default teal) */
  accentColor?: string
  /** Opcional · si es false, oculta el botón "Abrir Cuaderno" (default true) */
  showOpenButton?: boolean
}

export function CuadernoEntityWidget({
  slug,
  name,
  accentColor = '#0F766E',
  showOpenButton = true,
}: Props) {
  const [notes, setNotes] = useState<CuadernoNote[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Lee notas en cliente · localStorage solo accesible client-side
    setNotes(notesByEntitySlug(slug))

    // Si el Cuaderno emite cambios, refrescamos
    function handler() {
      setNotes(notesByEntitySlug(slug))
    }
    window.addEventListener('cuaderno:change', handler)
    return () => window.removeEventListener('cuaderno:change', handler)
  }, [slug])

  // No render durante SSR o si no hay notas (evita ruido visual)
  if (!mounted) return null
  if (notes.length === 0) {
    return (
      <div
        style={{
          padding: '12px 14px',
          background: '#f8fafc',
          border: '1px dashed #e2e8f0',
          borderRadius: 8,
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4, color: accentColor }}>
          ⌨ Cuaderno · sin notas
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>
          Aún no has escrito ninguna nota mencionando a <strong>{name}</strong>.{' '}
          {showOpenButton && (
            <a
              href={`/cuaderno?mention=${encodeURIComponent(slug)}`}
              style={{ color: accentColor, fontWeight: 600 }}
            >
              Crear nueva nota →
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '12px 14px',
        background: '#fff',
        border: `1px solid ${accentColor}33`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, color: accentColor }}>
          ⌨ Cuaderno · {notes.length} nota{notes.length === 1 ? '' : 's'}
        </span>
        <span style={{ fontSize: 11, color: '#64748b' }}>
          mencionan a <strong>{name}</strong>
        </span>
        {showOpenButton && (
          <a
            href="/cuaderno"
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: accentColor,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ⇗ Abrir Cuaderno
          </a>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {notes.slice(0, 6).map((n) => (
          <a
            key={n.id}
            href={`/cuaderno?note=${n.id}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '6px 10px',
              borderRadius: 4,
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
              {n.title}
            </span>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>
              {n.folder} · actualizada {new Date(n.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
              {n.tags.length > 0 && ` · ${n.tags.slice(0, 3).join(' ')}`}
            </span>
          </a>
        ))}
        {notes.length > 6 && (
          <a
            href={`/cuaderno?mention=${encodeURIComponent(slug)}`}
            style={{
              fontSize: 11,
              color: accentColor,
              fontWeight: 600,
              padding: '4px 10px',
              textDecoration: 'none',
            }}
          >
            + {notes.length - 6} nota{notes.length - 6 === 1 ? '' : 's'} más →
          </a>
        )}
      </div>
    </div>
  )
}
