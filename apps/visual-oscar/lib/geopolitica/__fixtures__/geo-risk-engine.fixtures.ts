/**
 * Fixtures Sprint G13 FASE 10 · validan geo-risk-engine sobre 6 perfiles
 * canónicos de país. Self-runnable con `npx tsx`.
 *
 * Cada fixture verifica que el motor produce:
 *  - dimensiones disponibles correctas (UCDP/ACLED/ReliefWeb/etc.)
 *  - urgency_band esperada (BAJO/MEDIO/ALTO/CRITICO)
 *  - warnings esperadas (sólo verificar que aparezcan, no exactitud literal)
 *  - confidence dentro de banda
 *
 * Ejecutar:
 *   npx tsx lib/geopolitica/__fixtures__/geo-risk-engine.fixtures.ts
 */
import { buildCountryRiskProfile, type GeoRiskInputs } from '../geo-risk-engine'

interface FixtureCase {
  id: string
  inputs: GeoRiskInputs
  expect_available_dims: string[]                // keys que deben tener data
  forbid_available_dims?: string[]               // keys que deben quedar NO data
  expect_urgency_band: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  expect_warning_substr?: string[]               // substrings que deben aparecer
  expect_confidence_min?: number
  notes: string
}

const CASES: FixtureCase[] = [
  {
    id: 'morocco-full',
    inputs: {
      iso3: 'MAR', country: 'Marruecos', region: 'MENA',
      acled: { events_30d: 80, fatalities_30d: 10 },
      reliefweb: { reports_30d: 12 },
      travel: { score: 3.5, band: 'Atención' },
      spain_presence: { intensity: 95, category: 'migracion' },
      spain_neighbor: true,
      in_spain_blocs: false,
      gdelt: { volume_7d: 2500, tone_7d: -2.5 },
    },
    expect_available_dims: ['current_event_risk', 'humanitarian_pressure', 'consular_risk', 'media_attention', 'narrative_pressure', 'spain_exposure'],
    forbid_available_dims: ['structural_risk', 'sanctions_pressure'],
    expect_urgency_band: 'MEDIO',
    expect_confidence_min: 0.5,
    notes: 'Marruecos · presencia ES máxima + vecindad + eventos moderados · urgencia MEDIA (sin conflicto activo agudo, expose 95 no es suficiente para ALTO solo)',
  },
  {
    id: 'ukraine-armed-conflict',
    inputs: {
      iso3: 'UKR', country: 'Ucrania', region: 'Europe',
      ucdp: { intensity: 2, conflict: 'Russia-Ukraine war' },
      acled: { events_30d: 350, fatalities_30d: 120 },
      reliefweb: { reports_30d: 40 },
      diplomatic: { mentions_7d: 15 },
      sanctions: { active_programs: 8, sources: ['EU', 'OFAC', 'UN'] },
      gdelt: { volume_7d: 15000, tone_7d: -4 },
      spain_presence: { intensity: 70, category: 'diplomatica' },
      in_spain_blocs: true,
    },
    expect_available_dims: ['structural_risk', 'current_event_risk', 'humanitarian_pressure', 'military_diplomatic_risk', 'sanctions_pressure', 'media_attention', 'narrative_pressure', 'spain_exposure'],
    forbid_available_dims: ['consular_risk'],
    expect_urgency_band: 'ALTO',
    expect_confidence_min: 0.65,
    notes: 'Ucrania · 8/9 dimensiones · structural CRITICAL + current CRITICAL · urgencia alta para España vía UE',
  },
  {
    id: 'sudan-humanitarian-only',
    inputs: {
      iso3: 'SDN', country: 'Sudán', region: 'Sahel',
      reliefweb: { reports_30d: 50 },
      ucdp: { intensity: 2, conflict: 'Sudan civil war' },
      acled: { events_30d: 200, fatalities_30d: 80 },
      // Sin spain_presence · sin gdelt · sin sanctions · sin travel
    },
    expect_available_dims: ['structural_risk', 'current_event_risk', 'humanitarian_pressure'],
    forbid_available_dims: ['spain_exposure', 'media_attention', 'sanctions_pressure', 'consular_risk'],
    expect_urgency_band: 'BAJO',  // sin spain_exposure, no es urgente para España
    expect_warning_substr: ['parcial'],
    notes: 'Sudán · crisis material grave PERO sin exposición ES declarada · urgency BAJO con warning',
  },
  {
    id: 'germany-no-conflict',
    inputs: {
      iso3: 'DEU', country: 'Alemania', region: 'Europe',
      diplomatic: { mentions_7d: 3 },
      spain_presence: { intensity: 70, category: 'diplomatica' },
      in_spain_blocs: true,
      gdelt: { volume_7d: 5000, tone_7d: 0.5 },
    },
    expect_available_dims: ['military_diplomatic_risk', 'media_attention', 'narrative_pressure', 'spain_exposure'],
    forbid_available_dims: ['structural_risk', 'current_event_risk', 'humanitarian_pressure', 'consular_risk', 'sanctions_pressure'],
    expect_urgency_band: 'BAJO',  // spain_exposure sin canal deterioro → BAJO correcto
    notes: 'Alemania · sin conflicto · sólo exposición ES y media · urgencia BAJO (exposure alta sin canal de deterioro = vigilancia rutinaria)',
  },
  {
    id: 'venezuela-sanctions-low',
    inputs: {
      iso3: 'VEN', country: 'Venezuela', region: 'LATAM',
      sanctions: { active_programs: 6, sources: ['OFAC', 'EU'] },
      gdelt: { volume_7d: 800, tone_7d: -3 },
      spain_presence: { intensity: 60, category: 'diplomatica' },
    },
    expect_available_dims: ['sanctions_pressure', 'media_attention', 'narrative_pressure', 'spain_exposure'],
    forbid_available_dims: ['structural_risk', 'current_event_risk', 'humanitarian_pressure', 'consular_risk', 'military_diplomatic_risk'],
    expect_urgency_band: 'BAJO',  // sin canal directo · presencia media
    notes: 'Venezuela · sanciones altas + presencia ES media · sin canal de evento agudo · urgency BAJO',
  },
  {
    id: 'empty-no-data',
    inputs: {
      iso3: 'XXX', country: 'País Test',
    },
    expect_available_dims: [],
    expect_urgency_band: 'BAJO',
    expect_warning_substr: ['parcial'],
    notes: 'Sin datos · todas dimensiones unavailable · warnings explícitos',
  },
]

function runFixtures() {
  let passed = 0
  let failed = 0
  const failures: string[] = []

  console.log('\n=== Geo Risk Engine fixtures ===\n')
  for (const fx of CASES) {
    const p = buildCountryRiskProfile(fx.inputs)
    const errors: string[] = []

    const dimsMap = {
      structural_risk: p.structural_risk.available,
      current_event_risk: p.current_event_risk.available,
      humanitarian_pressure: p.humanitarian_pressure.available,
      consular_risk: p.consular_risk.available,
      military_diplomatic_risk: p.military_diplomatic_risk.available,
      sanctions_pressure: p.sanctions_pressure.available,
      media_attention: p.media_attention.available,
      narrative_pressure: p.narrative_pressure.available,
      spain_exposure: p.spain_exposure.available,
    } as Record<string, boolean>

    for (const expectedKey of fx.expect_available_dims) {
      if (!dimsMap[expectedKey]) errors.push(`missing available dimension ${expectedKey}`)
    }
    for (const forbidKey of fx.forbid_available_dims || []) {
      if (dimsMap[forbidKey]) errors.push(`forbidden available dimension ${forbidKey}`)
    }
    if (p.urgency_band !== fx.expect_urgency_band) {
      errors.push(`urgency_band: expected ${fx.expect_urgency_band}, got ${p.urgency_band} (urgency=${p.urgency_for_spain})`)
    }
    if (typeof fx.expect_confidence_min === 'number' && p.confidence < fx.expect_confidence_min) {
      errors.push(`confidence: expected ≥${fx.expect_confidence_min}, got ${p.confidence}`)
    }
    for (const substr of fx.expect_warning_substr || []) {
      const found = p.warnings.some((w) => w.toLowerCase().includes(substr.toLowerCase()))
      if (!found) errors.push(`missing warning substring: "${substr}"`)
    }

    if (errors.length === 0) {
      passed++
      console.log(`  ✓ ${fx.id}`)
    } else {
      failed++
      console.log(`  ✗ ${fx.id}`)
      console.log(`    notes: ${fx.notes}`)
      for (const e of errors) console.log(`    · ${e}`)
      console.log(`    urgency: ${p.urgency_for_spain}/100 (${p.urgency_band}) · conf ${p.confidence}`)
      console.log(`    available: ${Object.entries(dimsMap).filter(([, v]) => v).map(([k]) => k).join(', ') || '(ninguna)'}`)
      console.log(`    warnings: ${p.warnings.length > 0 ? p.warnings.join(' · ') : '(ninguna)'}`)
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
