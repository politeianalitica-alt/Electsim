'use client'
/**
 * MapaNoticiasEspana · coropleta de España por CCAA para localizar noticias o
 * medios. Envuelve <ChoroplethCCAA/> mapeando la etiqueta de CCAA
 * (CCAA_LABEL de news-aggregator) al cod_ccaa INE de 2 dígitos del geojson.
 */
import ChoroplethCCAA, { type ChoroplethValue } from '@/components/maps/ChoroplethCCAA'

// Etiqueta CCAA → cod_ccaa INE (2 díg) · casa con public/geodata/spain-ccaa.geojson
const LABEL_TO_INE: Record<string, string> = {
  'Andalucía': '01', 'Aragón': '02', 'Asturias': '03', 'Baleares': '04',
  'Canarias': '05', 'Cantabria': '06', 'Castilla y León': '07', 'Castilla-La Mancha': '08',
  'Cataluña': '09', 'Valencia': '10', 'Extremadura': '11', 'Galicia': '12',
  'Madrid': '13', 'Murcia': '14', 'Navarra': '15', 'País Vasco': '16',
  'La Rioja': '17', 'Ceuta': '18', 'Melilla': '19',
}

export default function MapaNoticiasEspana({
  data, height = 200, colorHigh = '#1F4E8C', unidad = 'noticias', onSelect,
}: {
  /** Conteo por etiqueta de CCAA (clave = CCAA_LABEL, p.ej. "Cataluña"). */
  data?: Record<string, { n: number; sent_score?: number }> | null
  height?: number
  colorHigh?: string
  unidad?: string
  onSelect?: (code: string, label: string) => void
}) {
  const values: ChoroplethValue[] = Object.entries(LABEL_TO_INE).map(([label, code]) => {
    const stat = data?.[label]
    const tono = stat?.sent_score
    return {
      code,
      label,
      value: stat?.n ?? null,
      sub: stat
        ? `${stat.n} ${unidad}${typeof tono === 'number' ? ` · tono ${tono > 0 ? '+' : ''}${tono.toFixed(2)}` : ''}`
        : `sin ${unidad}`,
    }
  })
  return (
    <ChoroplethCCAA
      values={values}
      unidad={unidad}
      colorLow="#EAF1F8"
      colorHigh={colorHigh}
      height={height}
      formatValue={(v) => `${v} ${unidad}`}
      onSelect={onSelect}
    />
  )
}
