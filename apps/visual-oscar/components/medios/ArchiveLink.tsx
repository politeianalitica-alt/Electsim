'use client'
/**
 * ArchiveLink · pequeño enlace secundario "archivo" que abre la versión
 * archivada (archive.is) de la noticia, junto al enlace original.
 *
 * Uso: colocar al lado del enlace al medio original.
 *   <a href={url}>Titular</a> <ArchiveLink url={url} />
 *
 * stopPropagation evita disparar el onClick del card/fila contenedor.
 */
import { archiveUrl } from '@/lib/medios/archive'

export default function ArchiveLink({
  url,
  size = 10.5,
  label = 'archivo',
}: {
  url: string | null | undefined
  size?: number
  label?: string
}) {
  const archived = archiveUrl(url)
  if (!archived) return null
  return (
    <a
      href={archived}
      target="_blank"
      rel="noopener noreferrer"
      title="Leer versión archivada (archive.is) · esquiva muros de pago"
      onClick={(e) => e.stopPropagation()}
      style={{
        fontSize: size,
        fontWeight: 600,
        color: '#6e6e73',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      ⧉ {label}
    </a>
  )
}
