import type { Metadata } from 'next'
import GlosarioClient from './GlosarioClient'

export const metadata: Metadata = {
  title: 'Glosario · Politeia Analítica',
  description:
    'Definiciones de los términos técnicos del dashboard: macroeconomía, energía, geopolítica, medios, mercados y estadística.',
}

/**
 * /glosario · página accesible desde cualquier punto del dashboard.
 *
 * Sprint Quality-Q-B.3 · cierra el gap detectado en la auditoría:
 * 50+ acrónimos sin glosa repartidos por todo el dashboard. El componente
 * <Glosa /> añade tooltips inline; esta página es la referencia ampliada.
 *
 * Estructura:
 *   - Buscador instantáneo (filtra por término, alias o categoría).
 *   - Índice de categorías al inicio (anclas internas).
 *   - Una sección por categoría con tarjetas {término, definición, fuente, URL}.
 *
 * Cada término es enlazable por anchor (`/glosario#PVPC`), así <Glosa />
 * puede apuntar directamente desde el tooltip.
 */
export default function GlosarioPage() {
  return <GlosarioClient />
}
