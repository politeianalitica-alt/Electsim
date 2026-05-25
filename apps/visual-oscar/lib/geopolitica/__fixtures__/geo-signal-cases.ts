/**
 * Fixtures canónicas Sprint G1 FASE 10 · validan readGeoSignal +
 * detectCountryRoles + assessSpainRelevance + assessGeoSeverity sobre los
 * casos de uso reales que el módulo debe distinguir correctamente.
 *
 * Sin framework de tests. Self-runnable con `npx tsx`. Forma idéntica a
 * `lib/medios/__fixtures__/actor-disambiguation.fixtures.ts`.
 *
 * Cada fixture verifica:
 *   - country_roles esperados (actor / affected / source / spain_interest)
 *   - event_type
 *   - dimension
 *   - spain_relevance dentro de banda (low/medium/high)
 *   - confidence dentro de banda
 *
 * Ejecutar:
 *   cd apps/visual-oscar && npx tsx lib/geopolitica/__fixtures__/geo-signal-cases.ts
 */
import { readGeoSignal, GEO_METHODOLOGY_VERSION, type GeoCountryRoleKind, type GeoEventType, type GeoDimension } from '../geo-methodology'

export interface GeoSignalFixture {
  id: string
  title: string
  summary?: string
  source_name: string
  url?: string
  observed_at?: string
  source_country?: string
  expect_roles: Array<{ country: string; role: GeoCountryRoleKind }>
  forbid_roles?: Array<{ country: string; role: GeoCountryRoleKind }>
  expect_event_type?: GeoEventType
  expect_dimension?: GeoDimension
  expect_spain_relevance_band?: 'low' | 'medium' | 'high'   // <30 / 30-65 / >65
  expect_confidence_min?: number
  notes: string
}

export const GEO_SIGNAL_FIXTURES: GeoSignalFixture[] = [
  {
    id: 'spain-aid-ukraine',
    title: 'España envía nueva remesa de ayuda militar a Ucrania',
    source_name: 'lamoncloa.gob.es',
    source_country: 'España',
    expect_roles: [
      { country: 'España', role: 'actor' },
      { country: 'España', role: 'source' },
      { country: 'Ucrania', role: 'affected' },
    ],
    expect_event_type: 'spain_action',
    expect_dimension: 'political_diplomatic',
    expect_spain_relevance_band: 'high',
    expect_confidence_min: 0.55,
    notes: 'España es actor + fuente oficial · Ucrania objeto · relevancia España alta',
  },
  {
    id: 'morocco-pressures-spain',
    title: 'Marruecos presiona a España con nueva escalada fronteriza',
    summary: 'Tensión en Ceuta y Melilla mientras Rabat exige mayor cooperación',
    source_name: 'El País',
    expect_roles: [
      { country: 'Marruecos', role: 'actor' },
      { country: 'España', role: 'affected' },
    ],
    forbid_roles: [{ country: 'España', role: 'actor' }],
    expect_event_type: 'diplomatic_action',
    expect_spain_relevance_band: 'high',
    notes: 'Marruecos sujeto · España objeto · migración + frontera elevan relevancia España',
  },
  {
    id: 'brussels-warns-spain',
    title: 'Bruselas advierte a España por el déficit fiscal',
    source_name: 'Comisión Europea',
    expect_roles: [
      { country: 'Unión Europea', role: 'actor' },
      { country: 'España', role: 'affected' },
    ],
    expect_event_type: 'diplomatic_action',
    expect_dimension: 'political_diplomatic',
    expect_spain_relevance_band: 'high',
    notes: 'UE actor · España afectado · canal institucional',
  },
  {
    id: 'russia-attacks-ukraine',
    title: 'Rusia bombardea infraestructuras energéticas ucranianas',
    summary: 'Múltiples misiles impactan en la red eléctrica de Kiev y Járkov',
    source_name: 'Reuters',
    expect_roles: [
      { country: 'Rusia', role: 'actor' },
      { country: 'Ucrania', role: 'affected' },
    ],
    expect_event_type: 'armed_conflict',
    expect_dimension: 'security',
    expect_spain_relevance_band: 'medium',
    notes: 'Conflicto armado · España no es actor/afectado pero energía+UE elevan relevancia',
  },
  {
    id: 'sahel-migration-canarias',
    title: 'Crisis en el Sahel aumenta presión migratoria hacia Canarias',
    summary: 'Mali, Burkina Faso y Níger generan flujos hacia las islas',
    source_name: 'El Mundo',
    expect_roles: [
      { country: 'España', role: 'spain_interest' },
      { country: 'Mali', role: 'mentioned' },
    ],
    expect_event_type: 'migration_pressure',
    expect_dimension: 'migratory',
    expect_spain_relevance_band: 'high',
    notes: 'Migración + Canarias → spain_interest aunque España no esté explícita como actor',
  },
  {
    id: 'us-sanctions-china',
    title: 'EEUU sanciona a empresas chinas vinculadas a Rusia',
    source_name: 'OFAC',
    expect_roles: [
      { country: 'Estados Unidos', role: 'actor' },
      { country: 'China', role: 'affected' },
    ],
    expect_event_type: 'sanctions_action',
    expect_dimension: 'economic',
    expect_spain_relevance_band: 'low',
    notes: 'Sanciones EEUU-China · sin canal directo España',
  },
  {
    id: 'nato-east-flank',
    title: 'La OTAN refuerza el flanco este con nuevas brigadas',
    source_name: 'nato.int',
    expect_roles: [
      { country: 'OTAN', role: 'actor' },
    ],
    expect_event_type: 'institutional_action',
    expect_dimension: 'political_diplomatic',
    expect_spain_relevance_band: 'medium',
    notes: 'OTAN actor · España como aliado eleva relevancia media',
  },
  {
    id: 'israel-hamas-ceasefire',
    title: 'Israel y Hamás negocian alto el fuego en Gaza',
    source_name: 'AFP',
    expect_roles: [
      { country: 'Israel', role: 'actor' },
      { country: 'Palestina', role: 'mentioned' },
    ],
    expect_event_type: 'diplomatic_action',
    expect_spain_relevance_band: 'low',
    notes: 'Negociación bilateral · Hamás como org no-país · alto el fuego baja severidad',
  },
  {
    id: 'sudan-humanitarian',
    title: 'ReliefWeb reporta crisis humanitaria aguda en Sudán',
    summary: 'Más de 1 millón de desplazados internos en Darfur',
    source_name: 'reliefweb.int',
    expect_roles: [
      { country: 'Sudán', role: 'mentioned' },
    ],
    expect_event_type: 'humanitarian_crisis',
    expect_dimension: 'humanitarian',
    expect_spain_relevance_band: 'low',
    expect_confidence_min: 0.60,
    notes: 'ReliefWeb live_api humanitarian · Sudán afectado · sin España directa',
  },
  {
    id: 'lebanon-travel-advisory',
    title: 'Travel Advisory eleva riesgo en Líbano por escalada regional',
    source_name: 'exteriores.gob.es/recomendaciones',
    source_country: 'España',
    expect_roles: [
      { country: 'España', role: 'source' },
      { country: 'Líbano', role: 'mentioned' },
    ],
    expect_event_type: 'humanitarian_crisis',
    expect_spain_relevance_band: 'medium',
    notes: 'Travel advisory MAEC · canal consular · relevancia media para nacionales',
  },
]

function bandFor(score: number): 'low' | 'medium' | 'high' {
  if (score < 30) return 'low'
  if (score <= 65) return 'medium'
  return 'high'
}

export function runFixtures() {
  let passed = 0
  let failed = 0
  const failures: string[] = []
  const now = new Date().toISOString()

  console.log(`\n=== Geo signal fixtures · methodology ${GEO_METHODOLOGY_VERSION} ===\n`)
  for (const fx of GEO_SIGNAL_FIXTURES) {
    const reading = readGeoSignal({
      id: fx.id,
      title: fx.title,
      summary: fx.summary,
      url: fx.url,
      observed_at: fx.observed_at || now,
      source_name: fx.source_name,
      source_country: fx.source_country,
    })
    const errors: string[] = []
    for (const want of fx.expect_roles) {
      const hit = reading.country_roles.find((r) => r.country === want.country && r.role === want.role)
      if (!hit) errors.push(`missing role ${want.country}::${want.role}`)
    }
    for (const forbidden of fx.forbid_roles || []) {
      const hit = reading.country_roles.find((r) => r.country === forbidden.country && r.role === forbidden.role)
      if (hit) errors.push(`forbidden role present ${forbidden.country}::${forbidden.role}`)
    }
    if (fx.expect_event_type && reading.event_type !== fx.expect_event_type) {
      errors.push(`event_type: expected ${fx.expect_event_type}, got ${reading.event_type}`)
    }
    if (fx.expect_dimension && reading.dimension !== fx.expect_dimension) {
      errors.push(`dimension: expected ${fx.expect_dimension}, got ${reading.dimension}`)
    }
    if (fx.expect_spain_relevance_band) {
      const got = bandFor(reading.spain_relevance)
      if (got !== fx.expect_spain_relevance_band) errors.push(`spain_relevance band: expected ${fx.expect_spain_relevance_band}, got ${got} (${reading.spain_relevance})`)
    }
    if (typeof fx.expect_confidence_min === 'number' && reading.confidence.overall < fx.expect_confidence_min) {
      errors.push(`confidence: expected ≥${fx.expect_confidence_min}, got ${reading.confidence.overall.toFixed(3)}`)
    }
    if (errors.length === 0) {
      passed++
      console.log(`  ✓ ${fx.id}`)
    } else {
      failed++
      console.log(`  ✗ ${fx.id}`)
      console.log(`    title: ${fx.title}`)
      for (const e of errors) console.log(`    · ${e}`)
      console.log(`    notes: ${fx.notes}`)
      console.log(`    roles: ${JSON.stringify(reading.country_roles.map((r) => `${r.country}:${r.role}`))}`)
      console.log(`    event: ${reading.event_type} · dim: ${reading.dimension} · sev: ${reading.severity} · ES: ${reading.spain_relevance} · conf: ${reading.confidence.overall.toFixed(2)}`)
      failures.push(fx.id)
    }
  }
  console.log(`\n=== ${passed} passed · ${failed} failed ===`)
  if (failed > 0) {
    console.log(`Failing: ${failures.join(', ')}`)
    if (typeof process !== 'undefined' && process.exit) process.exit(1)
  }
}

if (typeof require !== 'undefined' && require.main === module) runFixtures()
