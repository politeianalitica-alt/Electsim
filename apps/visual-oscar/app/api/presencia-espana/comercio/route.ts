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

/** G20 item 18 · Dependencias críticas España ampliadas de 8 → 18
 * Fuentes:
 *   - DataComex (Secretaría Estado de Comercio España) · imports 2024
 *   - USGS Mineral Commodity Summaries 2024 · dominant suppliers
 *   - EU Critical Raw Materials Act 2024
 *   - SECEGSA · OFCASE Energía
 *   - CORES · estadísticas hidrocarburos España
 *
 * Cada entrada con: HS code, dominant_country (ISO3), dominant_share del total
 * imports España, valor en €bn, nota analítica sobre riesgo geopolítico/sustituibilidad.
 *
 * `category` para agrupar visualmente:
 *   energia · raw_materials · semiconductors · food · industrial
 */
const CRITICAL_DEPENDENCIES = [
  // ─── Energía (3 ítems · 90% del volumen €) ─────────────────────────
  { hs_code: '2709', name_es: 'Petróleo crudo', category: 'energia', dominant_country: 'NGA', dominant_share: 0.18, value_imports_2024_bn: 28.5, note: 'Top proveedores: Nigeria 18% + México 14% + EE.UU. 12% + Arabia Saudí 10% + Brasil 9%. Diversificación buena post-Rusia 2022.' },
  { hs_code: '2711', name_es: 'Gas natural y LNG', category: 'energia', dominant_country: 'DZA', dominant_share: 0.32, value_imports_2024_bn: 12.3, note: 'Argelia 32% (Medgaz) + EE.UU. 25% LNG + Nigeria 12% LNG + Rusia ~8% (sigue vía Sodefag · controvertido). MIBGAS suministro estable.' },
  { hs_code: '2701', name_es: 'Carbón y antracita', category: 'energia', dominant_country: 'USA', dominant_share: 0.35, value_imports_2024_bn: 1.2, note: 'EE.UU. 35% + Colombia 28% + Sudáfrica 15%. Phase-out previsto antes 2030 por descarbonización.' },
  // ─── Materias primas críticas defensa/transición (6 ítems) ──────────
  { hs_code: '2846', name_es: 'Tierras raras (REE)', category: 'raw_materials', dominant_country: 'CHN', dominant_share: 0.78, value_imports_2024_bn: 0.4, note: 'China procesa 90% mundial · sin alternativa europea operativa. Crítico para motores eólicos, vehículos eléctricos, imanes F-35.' },
  { hs_code: '8112', name_es: 'Galio (semiconductores)', category: 'raw_materials', dominant_country: 'CHN', dominant_share: 0.95, value_imports_2024_bn: 0.05, note: 'China 98% producción mundial + controles export ago 2023. Crítico para radares AESA F-35, comunicaciones satélite.' },
  { hs_code: '8104', name_es: 'Magnesio', category: 'raw_materials', dominant_country: 'CHN', dominant_share: 0.84, value_imports_2024_bn: 0.3, note: 'China 87% mundial · crisis energética sep-2021 redujo exports 50%. UE depende 95% imports chinos · sin reserva estratégica española.' },
  { hs_code: '2605', name_es: 'Cobalto', category: 'raw_materials', dominant_country: 'COD', dominant_share: 0.62, value_imports_2024_bn: 0.3, note: 'RDC con 70% oferta global · refinería en China (75%). Critical Raw Materials Act UE 2024. Mineral de conflicto Dodd-Frank.' },
  { hs_code: '2825', name_es: 'Litio (carbonato + hidróxido)', category: 'raw_materials', dominant_country: 'CHN', dominant_share: 0.45, value_imports_2024_bn: 0.6, note: 'Litio refinado: China 70% capacidad mundial. España imports vía Alemania (refino) · proyecto Cáceres pendiente DIA.' },
  { hs_code: '2504', name_es: 'Grafito natural', category: 'raw_materials', dominant_country: 'CHN', dominant_share: 0.65, value_imports_2024_bn: 0.15, note: 'China 65% extracción + 90% procesamiento battery-grade. Controles export dic-2023 sobre grafito artificial.' },
  // ─── Semiconductores y electrónica (2 ítems) ────────────────────────
  { hs_code: '8542', name_es: 'Circuitos integrados', category: 'semiconductors', dominant_country: 'TWN', dominant_share: 0.41, value_imports_2024_bn: 4.8, note: 'Taiwán dominante (TSMC) · vulnerabilidad estratégica Estrecho de Taiwán. EU Chips Act 2027 mitigación parcial.' },
  { hs_code: '8541', name_es: 'Diodos y transistores potencia', category: 'semiconductors', dominant_country: 'CHN', dominant_share: 0.38, value_imports_2024_bn: 1.6, note: 'China + Malasia + Filipinas concentran 70% ensamblaje. Crítico para vehículos eléctricos y renovables.' },
  // ─── Industrial (3 ítems) ───────────────────────────────────────────
  { hs_code: '2603', name_es: 'Minerales cobre', category: 'industrial', dominant_country: 'PER', dominant_share: 0.32, value_imports_2024_bn: 2.1, note: 'Perú 32% + Chile 23% = 55%. Concentración aceptable pero ambos países con riesgo político (Perú elecciones 2026, Chile Constitución).' },
  { hs_code: '7202', name_es: 'Ferroaleaciones (Cr/Mn)', category: 'industrial', dominant_country: 'ZAF', dominant_share: 0.38, value_imports_2024_bn: 1.4, note: 'Sudáfrica dominante en ferrocromo. Sin alternativa fácil · crisis eléctrica Eskom amenaza producción 2025.' },
  { hs_code: '2615', name_es: 'Minerales niobio/tantalio', category: 'industrial', dominant_country: 'BRA', dominant_share: 0.85, value_imports_2024_bn: 0.1, note: 'Brasil 85% niobio mundial (CBMM). Concentración geográfica máxima global. Vulnerable a crisis política BRA.' },
  // ─── Alimentación y agro (2 ítems) ──────────────────────────────────
  { hs_code: '1005', name_es: 'Maíz forrajero', category: 'food', dominant_country: 'UKR', dominant_share: 0.42, value_imports_2024_bn: 1.8, note: 'Ucrania 42% + Argentina 22% + Brasil 18%. Vulnerable corredor Mar Negro · alternativas LATAM aumentan coste.' },
  { hs_code: '1201', name_es: 'Habas de soja', category: 'food', dominant_country: 'BRA', dominant_share: 0.51, value_imports_2024_bn: 2.2, note: 'Brasil 51% + Argentina 22% + EE.UU. 18%. Alimentación ganadera España depende >90% imports · ningún sustituto interno.' },
  // ─── Defensa específica (1 ítem) ────────────────────────────────────
  { hs_code: '8110', name_es: 'Antimonio (munición)', category: 'raw_materials', dominant_country: 'CHN', dominant_share: 0.50, value_imports_2024_bn: 0.04, note: 'China 50% + Tayikistán 20% (órbita rusa). Controles export ago-2024 · sin sustituto en munición trazadora.' },
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
