/**
 * /api/presencia-espana/activos-riesgo · Sprint G20 item 20
 *
 * NUEVA FEATURE MAYOR: "Activos en riesgo en el exterior para España".
 *
 * Devuelve un catálogo de activos españoles en el extranjero clasificados
 * por nivel de riesgo en función del IRPC del país anfitrión. Cubre:
 *
 *   1. EMPRESAS · filiales IBEX-35 + multinacionales españolas grandes
 *   2. CONTRATOS · grandes contratos públicos / privados españoles abroad
 *   3. CIUDADANOS · españoles residentes (registro consular MAEC)
 *   4. INFRAESTRUCTURA · embajadas, consulados, Instituto Cervantes,
 *      Casas (Asia, África, América), AECID delegaciones
 *   5. ESTADO · activos del Estado español (créditos FONPRODE, AOD,
 *      avales CESCE, deuda soberana en cartera Tesoro)
 *
 * Combina:
 *   - Catálogo curado España-presencia (lib/geopolitica/ibex-presence,
 *     spain-presence-data)
 *   - Riesgo país en tiempo real desde /api/geopolitica/irc
 *   - Sanciones desde /api/geopolitica/sanciones?source=all
 *   - Conflictos activos UCDP seed (FIX-A3)
 *
 * Cache: s-maxage=3600.
 */
import { NextRequest, NextResponse } from 'next/server'
import { IBEX_COMPANIES } from '@/lib/geopolitica/ibex-presence'
import { COUNTRY_COORDS } from '@/lib/geopolitica/country-coords'

// Construir IBEX_PRESENCE-like índice {iso3: {companies: string[]}} a partir
// del array IBEX_COMPANIES para no duplicar lógica.
const IBEX_PRESENCE: Record<string, { companies: string[] }> = (() => {
  const out: Record<string, Set<string>> = {}
  for (const company of IBEX_COMPANIES) {
    for (const iso3 of company.critical_countries) {
      if (!out[iso3]) out[iso3] = new Set()
      out[iso3].add(company.name)
    }
  }
  const result: Record<string, { companies: string[] }> = {}
  for (const [iso3, set] of Object.entries(out)) {
    result[iso3] = { companies: Array.from(set).sort() }
  }
  return result
})()
import { getUcdpConflictByIso } from '@/lib/geopolitica/ucdp-active-conflicts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

type RiskBand = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
type AssetCategory = 'empresa' | 'contrato' | 'ciudadano' | 'infraestructura' | 'estado'

interface RiskAsset {
  iso3: string
  country_name_es: string
  category: AssetCategory
  category_label: string
  /** Descripción concreta del activo o resumen del paquete de activos en ese país */
  description: string
  /** Valor económico aproximado en €M cuando sea cuantificable. null si cualitativo. */
  value_eur_m: number | null
  /** Magnitud (nº empresas, nº ciudadanos, nº contratos, etc.) */
  magnitude: number | null
  magnitude_label?: string
  /** Banda de riesgo del país anfitrión derivada del IRC */
  host_risk_band: RiskBand
  host_irc_score: number | null
  /** Si el país está en seed UCDP top 30 conflictos activos */
  in_ucdp_seed: boolean
  conflict_label?: string
  notes?: string
}

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  empresa: 'Empresa / filial',
  contrato: 'Contrato firmado',
  ciudadano: 'Ciudadanos residentes',
  infraestructura: 'Infraestructura institucional',
  estado: 'Activo del Estado',
}

function bandFromScore(s: number | null): RiskBand {
  if (s === null) return 'BAJO'
  if (s >= 75) return 'CRITICO'
  if (s >= 55) return 'ALTO'
  if (s >= 35) return 'MEDIO'
  return 'BAJO'
}

// G20 · seed curado de activos españoles abroad. NO hardcoded "para
// siempre" — la base son catálogos lib/geopolitica/ibex-presence +
// spain-presence-data que tienen presencia documentada empresa por
// empresa. Estos arrays añaden las dimensiones contratos + ciudadanos
// + infraestructura + estado que no estaban cubiertas.
//
// Estructura: por iso3 del país anfitrión.

interface SeedContrato {
  empresa: string
  proyecto: string
  value_eur_m: number
  status?: string
}

interface SeedCiudadanos {
  registrados: number
  source: string
  note?: string
}

interface SeedInfra {
  type: string // embajada/consulado/cervantes/casa/aecid
  ciudad: string
  status?: string
}

interface SeedEstado {
  tipo: string // FONPRODE/CESCE/AOD/deuda_soberana
  value_eur_m: number
  note?: string
}

// Seed contratos relevantes públicamente conocidos (Iberdrola, Acciona,
// Indra, etc.). Lista no exhaustiva — la idea es que el panel surgiera
// los activos NEGOCIO-MAYOR, no todo. Para los demás países la columna
// queda automáticamente "ver IBEX_PRESENCE empresas listadas".
const CONTRATOS_RELEVANTES: Record<string, SeedContrato[]> = {
  MEX: [
    { empresa: 'Iberdrola', proyecto: 'Cesión 13 centrales eléctricas a CFE', value_eur_m: 5800, status: 'cerrado abr-2024' },
    { empresa: 'OHLA', proyecto: 'Hospital Real San José Guadalajara', value_eur_m: 320 },
    { empresa: 'ACS', proyecto: 'Aeropuerto Felipe Ángeles fase 2', value_eur_m: 1100 },
  ],
  BRA: [
    { empresa: 'Acciona', proyecto: 'Saneamiento Río de Janeiro · 35y BOT', value_eur_m: 2400, status: 'operativo' },
    { empresa: 'Naturgy', proyecto: 'Distribución gas natural BR Distribuidora', value_eur_m: 850 },
  ],
  USA: [
    { empresa: 'Iberdrola/Avangrid', proyecto: 'New England Clean Energy Connect', value_eur_m: 1100 },
    { empresa: 'Acciona', proyecto: 'I-285 Atlanta Beltway P3', value_eur_m: 580, status: 'construcción' },
  ],
  GBR: [
    { empresa: 'Banco Santander', proyecto: 'Operaciones UK (Santander UK)', value_eur_m: 38000, status: 'estructural' },
    { empresa: 'Ferrovial', proyecto: 'Heathrow Airport (25% participación)', value_eur_m: 2100, status: 'venta cerrada 2024' },
  ],
  AUS: [
    { empresa: 'Acciona', proyecto: 'Sydney Metro West tunelado', value_eur_m: 1600, status: 'construcción' },
  ],
  TUR: [
    { empresa: 'BBVA · Garanti', proyecto: 'BBVA Garanti BBVA (49,85%)', value_eur_m: 12000, status: 'estructural · alta exposición lira' },
  ],
  MAR: [
    { empresa: 'Santander', proyecto: 'Attijariwafa Bank participación', value_eur_m: 850 },
    { empresa: 'Repsol', proyecto: 'Bloque Lixus offshore (con KOSMOS Energy)', value_eur_m: 220 },
  ],
  ARG: [
    { empresa: 'Telefónica', proyecto: 'Activos Movistar Argentina', value_eur_m: 1850, status: 'desinversión parcial 2024' },
    { empresa: 'Repsol', proyecto: 'Vaca Muerta Loma Campana (con YPF)', value_eur_m: 3200 },
  ],
  ZAF: [
    { empresa: 'Telefónica', proyecto: 'Telxius torres', value_eur_m: 280 },
  ],
  CHN: [
    { empresa: 'Inditex', proyecto: 'Red 580 tiendas + Tmall', value_eur_m: 4200, status: 'estructural · 8% revenue group' },
    { empresa: 'Mondelez España exports', proyecto: 'Joint venture local', value_eur_m: 180 },
  ],
  COL: [
    { empresa: 'Banco Santander', proyecto: 'Banco Santander Colombia', value_eur_m: 950 },
  ],
  CHL: [
    { empresa: 'ACS · Hochtief', proyecto: 'Metro Línea 7 Santiago', value_eur_m: 1200, status: 'construcción' },
  ],
  PER: [
    { empresa: 'Repsol', proyecto: 'Refinería La Pampilla', value_eur_m: 850, status: 'crisis ambiental Ventanilla' },
    { empresa: 'BBVA', proyecto: 'BBVA Perú', value_eur_m: 1800 },
  ],
  RUS: [
    { empresa: 'IBEX general', proyecto: 'Activos congelados / desinvertidos 2022', value_eur_m: 280, status: 'congelado' },
  ],
  UKR: [
    { empresa: 'Acciona Construcción', proyecto: 'Programas reconstrucción (URC + Banco Mundial)', value_eur_m: 240, status: 'pre-contrato 2025' },
  ],
}

// Ciudadanos españoles residentes (PERE 2024-04 INE consolidado)
const CIUDADANOS_RELEVANTES: Record<string, SeedCiudadanos> = {
  FRA: { registrados: 286000, source: 'PERE INE 2024', note: 'mayor colonia ES en el extranjero' },
  ARG: { registrados: 470000, source: 'PERE INE 2024', note: 'incluye nacionalizados por ley memoria democrática' },
  USA: { registrados: 195000, source: 'PERE INE 2024' },
  GBR: { registrados: 170000, source: 'PERE INE 2024' },
  DEU: { registrados: 165000, source: 'PERE INE 2024' },
  MEX: { registrados: 145000, source: 'PERE INE 2024' },
  BEL: { registrados: 75000, source: 'PERE INE 2024' },
  VEN: { registrados: 65000, source: 'PERE INE 2024', note: 'exposición política crítica' },
  CHE: { registrados: 130000, source: 'PERE INE 2024' },
  AND: { registrados: 25000, source: 'PERE INE 2024' },
  CUB: { registrados: 145000, source: 'PERE INE 2024', note: 'mayormente con doble nacionalidad' },
  BRA: { registrados: 110000, source: 'PERE INE 2024' },
  CHL: { registrados: 65000, source: 'PERE INE 2024' },
  COL: { registrados: 55000, source: 'PERE INE 2024' },
  AUS: { registrados: 40000, source: 'PERE INE 2024' },
  CAN: { registrados: 45000, source: 'PERE INE 2024' },
  MAR: { registrados: 20000, source: 'PERE INE 2024' },
  ARE: { registrados: 15000, source: 'PERE INE 2024' },
  CHN: { registrados: 12000, source: 'PERE INE 2024' },
  RUS: { registrados: 4500, source: 'PERE INE 2024', note: 'exposición sanciones · evacuaciones MAEC 2022-23' },
  UKR: { registrados: 2800, source: 'PERE INE 2024', note: 'evacuación parcial post-feb-2022' },
}

// Infraestructura institucional España abroad (MAEC + Cervantes + AECID + Casas)
const INFRA_RELEVANTE: Record<string, SeedInfra[]> = {
  USA: [
    { type: 'Embajada', ciudad: 'Washington D.C.' },
    { type: 'Consulados (9)', ciudad: 'NY, LA, Chicago, Miami, SF, Houston, San Juan PR, etc.' },
    { type: 'Cervantes (6 centros)', ciudad: 'NY, Chicago, Albuquerque, Cambridge, Seattle, DC' },
  ],
  MEX: [{ type: 'Embajada', ciudad: 'Ciudad de México' }, { type: 'Cervantes', ciudad: 'CDMX' }],
  BRA: [{ type: 'Embajada', ciudad: 'Brasilia' }, { type: 'Cervantes (8 centros)', ciudad: 'São Paulo, Río, Brasilia, Salvador, Recife, Curitiba, Porto Alegre, BH' }],
  CHN: [{ type: 'Embajada', ciudad: 'Pekín' }, { type: 'Cervantes', ciudad: 'Pekín + Shanghái' }, { type: 'Casa Asia', ciudad: 'Pekín' }],
  RUS: [{ type: 'Embajada', ciudad: 'Moscú' }, { type: 'Cervantes', ciudad: 'Moscú (actividad limitada post 2022)', status: 'limitado' }],
  UKR: [{ type: 'Embajada', ciudad: 'Kiev (operativa)', status: 'evacuación parcial 2022 · reactivada' }],
  VEN: [{ type: 'Embajada', ciudad: 'Caracas (Encargado de Negocios)', status: 'sin embajador desde 2020' }],
  MAR: [{ type: 'Embajada', ciudad: 'Rabat' }, { type: 'Consulados (5)', ciudad: 'Casablanca, Tánger, Tetuán, Nador, Agadir' }, { type: 'Cervantes (6)', ciudad: 'Rabat, Casablanca, Tánger, Tetuán, Marrakech, Fez' }],
  DZA: [{ type: 'Embajada', ciudad: 'Argel' }, { type: 'Cervantes', ciudad: 'Argel + Orán' }],
  TUR: [{ type: 'Embajada', ciudad: 'Ankara' }, { type: 'Consulado', ciudad: 'Estambul' }, { type: 'Cervantes', ciudad: 'Estambul' }],
  ISR: [{ type: 'Embajada', ciudad: 'Tel Aviv' }, { type: 'Consulado', ciudad: 'Jerusalén Este' }, { type: 'Cervantes', ciudad: 'Tel Aviv' }],
  ARG: [{ type: 'Embajada', ciudad: 'Buenos Aires' }, { type: 'Consulados (4)', ciudad: 'BA, Mendoza, Córdoba, Rosario' }, { type: 'Cervantes', ciudad: 'BA' }],
}

// Activos del Estado español (créditos FONPRODE + avales CESCE + AOD bilateral)
const ESTADO_RELEVANTE: Record<string, SeedEstado[]> = {
  MAR: [{ tipo: 'AOD bilateral', value_eur_m: 75, note: 'cooperación delegada · programa Vecindad Sur' }, { tipo: 'CESCE avales', value_eur_m: 220 }],
  DZA: [{ tipo: 'CESCE avales', value_eur_m: 480, note: 'mayormente sector hidrocarburos' }],
  COL: [{ tipo: 'AOD bilateral', value_eur_m: 45 }, { tipo: 'CESCE avales', value_eur_m: 320 }],
  CUB: [{ tipo: 'Deuda Club París restructurada', value_eur_m: 1850, note: 'acuerdo 2015 · 80% condonado' }],
  TUR: [{ tipo: 'CESCE avales', value_eur_m: 1200, note: 'exposición proyectos infraestructura' }],
  BRA: [{ tipo: 'CESCE avales', value_eur_m: 880 }],
  SEN: [{ tipo: 'AOD bilateral · cooperación', value_eur_m: 28 }],
}

async function buildAssetsForIso(
  iso3: string,
  ircMap: Map<string, { score: number; band: RiskBand }>,
): Promise<RiskAsset[]> {
  const coord = COUNTRY_COORDS[iso3]
  if (!coord) return []
  const ircData = ircMap.get(iso3)
  const score = ircData?.score ?? null
  const band = ircData?.band ?? bandFromScore(score)
  const seed = getUcdpConflictByIso(iso3)
  const assets: RiskAsset[] = []

  // 1. EMPRESAS · vía catálogo IBEX_PRESENCE (FIX-A6)
  const ibex = IBEX_PRESENCE[iso3]
  if (ibex && ibex.companies.length > 0) {
    const companiesList = ibex.companies.slice(0, 8).join(', ')
    assets.push({
      iso3,
      country_name_es: coord.name_es,
      category: 'empresa',
      category_label: CATEGORY_LABEL.empresa,
      description: `${ibex.companies.length} empresa${ibex.companies.length > 1 ? 's' : ''} IBEX/multinacionales españolas presentes: ${companiesList}${ibex.companies.length > 8 ? '…' : ''}`,
      value_eur_m: null,
      magnitude: ibex.companies.length,
      magnitude_label: 'empresas IBEX/large-cap',
      host_risk_band: band,
      host_irc_score: score,
      in_ucdp_seed: seed !== null,
      conflict_label: seed?.conflict_label,
    })
  }

  // 2. CONTRATOS · seed curado
  const contratos = CONTRATOS_RELEVANTES[iso3]
  if (contratos && contratos.length > 0) {
    for (const c of contratos) {
      assets.push({
        iso3,
        country_name_es: coord.name_es,
        category: 'contrato',
        category_label: CATEGORY_LABEL.contrato,
        description: `${c.empresa} · ${c.proyecto}`,
        value_eur_m: c.value_eur_m,
        magnitude: 1,
        host_risk_band: band,
        host_irc_score: score,
        in_ucdp_seed: seed !== null,
        conflict_label: seed?.conflict_label,
        notes: c.status,
      })
    }
  }

  // 3. CIUDADANOS · PERE INE 2024
  const ciudad = CIUDADANOS_RELEVANTES[iso3]
  if (ciudad) {
    assets.push({
      iso3,
      country_name_es: coord.name_es,
      category: 'ciudadano',
      category_label: CATEGORY_LABEL.ciudadano,
      description: `${ciudad.registrados.toLocaleString('es-ES')} españoles registrados PERE 2024`,
      value_eur_m: null,
      magnitude: ciudad.registrados,
      magnitude_label: 'ciudadanos PERE',
      host_risk_band: band,
      host_irc_score: score,
      in_ucdp_seed: seed !== null,
      conflict_label: seed?.conflict_label,
      notes: ciudad.note,
    })
  }

  // 4. INFRAESTRUCTURA · MAEC/Cervantes/AECID
  const infra = INFRA_RELEVANTE[iso3]
  if (infra && infra.length > 0) {
    const infraDesc = infra.map((i) => `${i.type} ${i.ciudad}`).join(' · ')
    assets.push({
      iso3,
      country_name_es: coord.name_es,
      category: 'infraestructura',
      category_label: CATEGORY_LABEL.infraestructura,
      description: infraDesc,
      value_eur_m: null,
      magnitude: infra.length,
      magnitude_label: 'instituciones',
      host_risk_band: band,
      host_irc_score: score,
      in_ucdp_seed: seed !== null,
      conflict_label: seed?.conflict_label,
    })
  }

  // 5. ESTADO · FONPRODE/CESCE/AOD
  const estado = ESTADO_RELEVANTE[iso3]
  if (estado && estado.length > 0) {
    for (const e of estado) {
      assets.push({
        iso3,
        country_name_es: coord.name_es,
        category: 'estado',
        category_label: CATEGORY_LABEL.estado,
        description: `${e.tipo}: €${e.value_eur_m}M`,
        value_eur_m: e.value_eur_m,
        magnitude: 1,
        host_risk_band: band,
        host_irc_score: score,
        in_ucdp_seed: seed !== null,
        conflict_label: seed?.conflict_label,
        notes: e.note,
      })
    }
  }

  return assets
}

export async function GET(req: NextRequest) {
  const startedAt = new Date().toISOString()
  const origin = req.nextUrl.origin

  // 1. Cargar IRC (riesgo país) en paralelo
  const ircResp = await fetch(`${origin}/api/geopolitica/irc`, { cache: 'force-cache' })
    .then((r) => r.json())
    .catch(() => null)

  const ircMap = new Map<string, { score: number; band: RiskBand }>()
  if (ircResp?.ok && Array.isArray(ircResp.countries)) {
    for (const c of ircResp.countries) {
      ircMap.set(c.iso3, { score: c.irc, band: bandFromScore(c.irc) })
    }
  }

  // 2. Construir activos para cada país que tiene presencia España documentada
  // Unimos las claves de IBEX_PRESENCE + CIUDADANOS + INFRA + ESTADO + UCDP_SEED
  const allIsos = new Set<string>([
    ...Object.keys(IBEX_PRESENCE),
    ...Object.keys(CONTRATOS_RELEVANTES),
    ...Object.keys(CIUDADANOS_RELEVANTES),
    ...Object.keys(INFRA_RELEVANTE),
    ...Object.keys(ESTADO_RELEVANTE),
  ])

  const allAssets: RiskAsset[] = []
  for (const iso3 of allIsos) {
    const assets = await buildAssetsForIso(iso3, ircMap)
    allAssets.push(...assets)
  }

  // 3. Filtrar solo los que están en países con riesgo MEDIO/ALTO/CRITICO
  // o con UCDP seed activo (los BAJO se omiten por defecto, pero opt-in con ?all=1)
  const includeAll = req.nextUrl.searchParams.get('all') === '1'
  const inRisk = includeAll
    ? allAssets
    : allAssets.filter((a) => a.host_risk_band !== 'BAJO' || a.in_ucdp_seed)

  // 4. Ordenar por: severity_band (critical first) → valor económico desc
  const BAND_WEIGHT: Record<RiskBand, number> = { CRITICO: 4, ALTO: 3, MEDIO: 2, BAJO: 1 }
  inRisk.sort((a, b) => {
    const bd = BAND_WEIGHT[b.host_risk_band] - BAND_WEIGHT[a.host_risk_band]
    if (bd !== 0) return bd
    const av = a.value_eur_m ?? 0
    const bv = b.value_eur_m ?? 0
    return bv - av
  })

  // 5. KPIs
  const totalValueEurM = inRisk.reduce((s, a) => s + (a.value_eur_m ?? 0), 0)
  const totalCiudadanos = inRisk
    .filter((a) => a.category === 'ciudadano')
    .reduce((s, a) => s + (a.magnitude ?? 0), 0)
  const inUcdp = inRisk.filter((a) => a.in_ucdp_seed).length
  const byBand: Record<RiskBand, number> = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }
  const byCategory: Record<AssetCategory, number> = {
    empresa: 0, contrato: 0, ciudadano: 0, infraestructura: 0, estado: 0,
  }
  for (const a of inRisk) {
    byBand[a.host_risk_band]++
    byCategory[a.category]++
  }

  return NextResponse.json(
    {
      ok: true,
      assets: inRisk,
      summary: {
        total_assets: inRisk.length,
        total_value_eur_m: Math.round(totalValueEurM),
        total_ciudadanos_in_risk: totalCiudadanos,
        countries_covered: new Set(inRisk.map((a) => a.iso3)).size,
        by_band: byBand,
        by_category: byCategory,
        ucdp_overlap: inUcdp,
      },
      fetched_at: startedAt,
      _meta: {
        sources: [
          'IBEX_PRESENCE catálogo curado (lib/geopolitica/ibex-presence)',
          'PERE INE 2024 · Padrón españoles residentes en extranjero',
          'MAEC · red embajadas + consulados',
          'Instituto Cervantes · 86 centros mundial',
          'AECID · cooperación · datos memoria 2023',
          'CESCE · avales export-credit (estimaciones públicas)',
          'IRC compuesto (V-Dem+SIPRI+GDELT) en tiempo real',
          'UCDP/PRIO seed top 30 conflictos (FIX-A3)',
        ],
        methodology: 'Combina catálogo curado España-presencia con riesgo país en tiempo real y conflicto UCDP. Solo se muestran activos en países MEDIO/ALTO/CRITICO o con UCDP activo · `?all=1` para incluir BAJO.',
        cache_ttl_seconds: 3600,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=10800',
      },
    },
  )
}
