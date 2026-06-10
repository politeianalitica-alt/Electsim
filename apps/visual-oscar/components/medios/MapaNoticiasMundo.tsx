'use client'
/**
 * MapaNoticiasMundo · mapamundi por países mencionados en las noticias o
 * artículos. Envuelve <WorldGeoMap/> normalizando los conteos por país a un
 * índice 0-100 que alimenta la escala de color del mapa.
 */
import WorldGeoMap from '@/components/maps/WorldGeoMap'

// Etiqueta de país (PAISES del tablón think-tanks) → ISO2 del geojson mundial.
const LABEL_TO_ISO2: Record<string, string> = {
  'Marruecos': 'MA', 'Argelia': 'DZ', 'Ucrania': 'UA', 'Rusia': 'RU', 'China': 'CN',
  'EE.UU.': 'US', 'Venezuela': 'VE', 'Irán': 'IR', 'Israel': 'IL', 'Palestina / Gaza': 'PS',
  'Turquía': 'TR', 'Egipto': 'EG', 'Libia': 'LY', 'Siria': 'SY', 'Líbano': 'LB',
  'Sahel / Mali / Níger': 'ML', 'India': 'IN', 'Pakistán': 'PK', 'Corea del Norte': 'KP',
  'Taiwán': 'TW', 'Reino Unido': 'GB', 'Francia': 'FR', 'Alemania': 'DE', 'España': 'ES',
  // "Unión Europea" no mapea a un único país → se omite.
}

export default function MapaNoticiasMundo({
  paises, onCountryClick,
}: {
  /** Conteo por etiqueta de país. */
  paises: Array<{ label: string; count: number }>
  onCountryClick?: (code: string, name: string) => void
}) {
  const max = Math.max(1, ...paises.map((p) => p.count))
  const riesgo = paises
    .map((p) => {
      const code = LABEL_TO_ISO2[p.label]
      if (!code) return null
      return {
        code,
        name: p.label,
        risk: Math.min(100, Math.round((p.count / max) * 100)),
        n_articles_30d: p.count,
        has_data: true,
      }
    })
    .filter((x): x is { code: string; name: string; risk: number; n_articles_30d: number; has_data: boolean } => x !== null)

  return <WorldGeoMap riesgo={riesgo} highlightISO="ES" onCountryClick={onCountryClick} />
}
