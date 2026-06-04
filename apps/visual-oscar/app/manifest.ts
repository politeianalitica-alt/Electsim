import type { MetadataRoute } from 'next'

/**
 * Web App Manifest · permite "Añadir a pantalla de inicio" en iPhone/Android
 * y abrir Politeia a pantalla completa (sin barra del navegador), como una app.
 * Next sirve este archivo en /manifest.webmanifest e inyecta el <link> solo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Politeia Analítica',
    short_name: 'Politeia',
    description: 'Inteligencia política y electoral · España',
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfbfd',
    theme_color: '#fbfbfd',
    lang: 'es',
    dir: 'ltr',
    categories: ['business', 'news', 'productivity'],
    icons: [
      { src: '/icon-politeia.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-politeia.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
