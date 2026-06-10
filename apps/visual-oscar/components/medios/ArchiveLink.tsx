'use client'
/**
 * ArchiveLink · botón cuadrado (azul marino, candado ABIERTO) que abre la
 * versión archivada (archive.today) de la noticia, esquivando muros de pago.
 *
 * Pensado para ir en UNA ESQUINA de la tarjeta del artículo. El candado abierto
 * comunica "acceso libre / sin muro".
 *
 * stopPropagation evita disparar el onClick del card/fila contenedor.
 */
import { archiveUrl } from '@/lib/medios/archive'

export default function ArchiveLink({
  url,
  size = 22,
}: {
  url: string | null | undefined
  size?: number
  /** Compatibilidad: ya no se muestra texto, solo el icono. */
  label?: string
}) {
  const archived = archiveUrl(url)
  if (!archived) return null
  const s = Math.max(18, size)          // lado del cuadrado en px
  const icon = Math.round(s * 0.62)     // tamaño del candado dentro del cuadrado
  return (
    <a
      href={archived}
      target="_blank"
      rel="noopener noreferrer"
      title="Leer versión archivada (Wayback Machine) · enlace siempre disponible"
      aria-label="Versión archivada (acceso libre)"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s,
        height: s,
        borderRadius: 5,
        background: '#14274E',          // azul marino
        color: '#fff',
        textDecoration: 'none',
        flexShrink: 0,
        boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
      }}
    >
      {/* Candado ABIERTO (Feather "unlock") · sin emojis (CLAUDE.md §0.5) */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    </a>
  )
}
