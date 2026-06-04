import { ImageResponse } from 'next/og'

/**
 * apple-touch-icon (180×180 PNG) generado con next/og · es el icono que usa
 * iOS al "Añadir a pantalla de inicio". Capitel jónico blanco sobre el azul
 * de marca. Next inyecta el <link rel="apple-touch-icon"> automáticamente.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" fill="#fff">' +
  '<rect x="8" y="6" width="104" height="6" rx="1"/>' +
  '<path d="M 8 14 Q 8 22, 18 22 Q 28 22, 28 14 L 28 24 L 92 24 L 92 14 Q 92 22, 102 22 Q 112 22, 112 14 Z"/>' +
  '<circle cx="18" cy="18" r="3.5"/><circle cx="102" cy="18" r="3.5"/>' +
  '<rect x="14" y="28" width="92" height="4" rx="1"/>' +
  '<rect x="26" y="58" width="18" height="44" rx="2"/>' +
  '<rect x="52" y="48" width="18" height="54" rx="2"/>' +
  '<rect x="78" y="38" width="18" height="64" rx="2"/></svg>'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1F4E8C',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={112}
          height={103}
          alt="Politeia"
          src={`data:image/svg+xml;base64,${Buffer.from(LOGO).toString('base64')}`}
        />
      </div>
    ),
    { ...size },
  )
}
