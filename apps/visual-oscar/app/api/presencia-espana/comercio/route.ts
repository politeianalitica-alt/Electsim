/**
 * /api/presencia-espana/comercio · Sprint GEO-ES C4
 *
 * Top destinos exportación + dependencias críticas importación.
 * Datos: DataComex 2024 (dataset curado).
 *
 * Cache: s-maxage=86400 (1 día).
 */
import { NextResponse } from 'next/server'
import { getTopExports, SPAIN_PRESENCE } from '@/lib/geopolitica/spain-presence-data'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface TopExport {
  iso3: string
  name_es: string
  exports_eur_bn: number
  imports_eur_bn: number
  balance_eur_bn: number               // positivo = superávit ES
  yoy_change_pct: number | null         // placeholder
}

/** Dependencias críticas placeholder · HS codes con concentración alta. */
const CRITICAL_DEPENDENCIES = [
  { hs_code: '2709', name_es: 'Petróleo crudo', dominant_country: 'NGA', dominant_share: 0.28, value_imports_2024_bn: 28.5, note: 'Nigeria + Arabia Saudí + México = ~60% importaciones España' },
  { hs_code: '2711', name_es: 'Gas natural y LNG', dominant_country: 'DZA', dominant_share: 0.45, value_imports_2024_bn: 12.3, note: 'Argelia gasoducto Medgaz + USA LNG · ruta crítica diversificación' },
  { hs_code: '2846', name_es: 'Tierras raras (REE)', dominant_country: 'CHN', dominant_share: 0.78, value_imports_2024_bn: 0.4, note: 'China procesa 90% mundial · sin alternativa europea operativa' },
  { hs_code: '2603', name_es: 'Minerales cobre', dominant_country: 'PER', dominant_share: 0.32, value_imports_2024_bn: 2.1, note: 'Perú+Chile = 55% · concentración aceptable pero ambos países con riesgo político' },
  { hs_code: '8542', name_es: 'Circuitos integrados', dominant_country: 'TWN', dominant_share: 0.41, value_imports_2024_bn: 4.8, note: 'Taiwán dominante · vulnerabilidad estratégica Estrecho de Taiwán' },
  { hs_code: '2605', name_es: 'Cobalto', dominant_country: 'COD', dominant_share: 0.62, value_imports_2024_bn: 0.3, note: 'RDC con 70% oferta global · refinería en China (75%)' },
  { hs_code: '7202', name_es: 'Ferroaleaciones', dominant_country: 'ZAF', dominant_share: 0.38, value_imports_2024_bn: 1.4, note: 'Sudáfrica dominante en ferrocromo · sin alternativa fácil' },
  { hs_code: '2615', name_es: 'Minerales niobio/tantalio', dominant_country: 'BRA', dominant_share: 0.85, value_imports_2024_bn: 0.1, note: 'Brasil 85% niobio mundial' },
]

export async function GET() {
  const startedAt = new Date().toISOString()

  // Top 20 destinos exportación
  const topExports = getTopExports(20).map((p): TopExport => {
    const coord = COUNTRY_COORDS[p.iso3]
    return {
      iso3: p.iso3,
      name_es: coord?.name_es || p.iso3,
      exports_eur_bn: p.exports_2024_eur_bn || 0,
      imports_eur_bn: p.imports_2024_eur_bn || 0,
      balance_eur_bn: (p.exports_2024_eur_bn || 0) - (p.imports_2024_eur_bn || 0),
      yoy_change_pct: null,
    }
  })

  // Totales agregados (suma del catálogo)
  const totalExports = Object.values(SPAIN_PRESENCE).reduce((s, p) => s + (p.exports_2024_eur_bn || 0), 0)
  const totalImports = Object.values(SPAIN_PRESENCE).reduce((s, p) => s + (p.imports_2024_eur_bn || 0), 0)

  // Distribución por región
  const regionTotals: Record<string, number> = {}
  for (const [iso3, p] of Object.entries(SPAIN_PRESENCE)) {
    const region = COUNTRY_COORDS[iso3]?.region || 'unknown'
    regionTotals[region] = (regionTotals[region] || 0) + (p.exports_2024_eur_bn || 0)
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total_exports_2024_bn: Math.round(totalExports * 10) / 10,
      total_imports_2024_bn: Math.round(totalImports * 10) / 10,
      balance_bn: Math.round((totalExports - totalImports) * 10) / 10,
      countries_in_catalog: Object.keys(SPAIN_PRESENCE).length,
    },
    top_exports: topExports,
    critical_dependencies: CRITICAL_DEPENDENCIES,
    region_distribution: Object.entries(regionTotals).map(([region, value]) => ({
      region,
      exports_bn: Math.round(value * 10) / 10,
      share_pct: totalExports > 0 ? Math.round((value / totalExports) * 1000) / 10 : 0,
    })).sort((a, b) => b.exports_bn - a.exports_bn),
    fetched_at: startedAt,
    _meta: {
      sources: ['Dataset curado DataComex 2024', 'Dataset HS dependencias UN Comtrade + sectoriales'],
      pending: ['DataComex API live · actualización mensual real', 'HS dependencias calculadas dinámicamente con Comtrade'],
      cache_ttl_seconds: 86400,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=259200' },
  })
}
