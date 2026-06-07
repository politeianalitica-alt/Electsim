/**
 * Sprint Energía v3 · E2-cross · Tests de lib/energia/energy-logistics.ts
 *
 * Cubre las funciones PURAS (sin red): `freightTrend`, `isEnergyChokepoint` y
 * `buildEnergyLogistics` con fixtures que imitan los outputs de los handlers
 * standalone de Puertos (chokepointsList / freightSnapshot / catalogVessels).
 *
 * Mismo harness que el resto del repo (NO vitest). Ejecutar con:
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/energy-logistics.test.ts
 *
 * Las funciones puras NO tocan la red; los fixtures reproducen el shape de
 * ports-handlers, así que el test es determinista y offline.
 */
import assert from 'node:assert/strict'
import {
  freightTrend,
  isEnergyChokepoint,
  buildEnergyLogistics,
  type EnergyLogisticsRaw,
} from '../../../lib/energia/energy-logistics.ts'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${name}`)
    console.error('    ', (e as Error).message)
  }
}

// ─── freightTrend ─────────────────────────────────────────────────────
console.log('\n→ freightTrend')

test('umbrales ±1 / ±4 → tendencias', () => {
  assert.equal(freightTrend(6), 'fuerte_subida')
  assert.equal(freightTrend(4), 'fuerte_subida')
  assert.equal(freightTrend(2), 'subida')
  assert.equal(freightTrend(1), 'subida')
  assert.equal(freightTrend(0.5), 'estable')
  assert.equal(freightTrend(0), 'estable')
  assert.equal(freightTrend(-2), 'bajada')
  assert.equal(freightTrend(-5), 'fuerte_bajada')
})

test('null / NaN → estable', () => {
  assert.equal(freightTrend(null), 'estable')
  assert.equal(freightTrend(undefined), 'estable')
  assert.equal(freightTrend(NaN), 'estable')
})

// ─── isEnergyChokepoint ───────────────────────────────────────────────
console.log('\n→ isEnergyChokepoint')

test('reconoce los corredores energéticos del seed Puertos', () => {
  assert.equal(isEnergyChokepoint('ormuz'), true)
  assert.equal(isEnergyChokepoint('suez'), true)
  assert.equal(isEnergyChokepoint('bab_el_mandeb'), true)
  assert.equal(isEnergyChokepoint('bosporus'), true)
})

test('case-insensitive', () => {
  assert.equal(isEnergyChokepoint('ORMUZ'), true)
  assert.equal(isEnergyChokepoint('Suez'), true)
})

test('descarta corredores no energéticos', () => {
  // Malaca y Panamá son comercio general (no flujo energético principal de ES)
  assert.equal(isEnergyChokepoint('malacca'), false)
  assert.equal(isEnergyChokepoint('panama'), false)
  assert.equal(isEnergyChokepoint(''), false)
  assert.equal(isEnergyChokepoint('desconocido'), false)
})

// ─── buildEnergyLogistics ─────────────────────────────────────────────
console.log('\n→ buildEnergyLogistics')

const RAW: EnergyLogisticsRaw = {
  chokepoints: {
    items: [
      { slug: 'malacca', name: 'Estrecho de Malaca', region: 'asia_pacific', traffic_volume_pct: 25, risk_score: 30, risk_level: 'bajo', n_events_30d: 1, typical_disruptions: ['Piratería'] },
      { slug: 'ormuz', name: 'Estrecho de Ormuz', region: 'middle_east', traffic_volume_pct: 20, risk_score: 75, risk_level: 'alto', n_events_30d: 4, typical_disruptions: ['Crisis Irán'] },
      { slug: 'bab_el_mandeb', name: 'Bab-el-Mandeb / Mar Rojo', region: 'middle_east', traffic_volume_pct: 12, risk_score: 90, risk_level: 'critico', n_events_30d: 6, typical_disruptions: ['Ataques Houthis'] },
      { slug: 'panama', name: 'Canal de Panamá', region: 'north_america', traffic_volume_pct: 5, risk_score: 40, risk_level: 'medio', n_events_30d: 0, typical_disruptions: ['Sequía'] },
    ],
  },
  freight: {
    items: [
      { slug: 'baltic_dry', name: 'Baltic Dry Index (BDI)', category: 'freight_bulk', last_price: 1500.5, change_pct: 2.3 },
      { slug: 'baltic_dirty_tankers', name: 'Baltic Dirty Tanker (BDTI)', category: 'freight_tanker', last_price: 1100, change_pct: -0.4 },
      { slug: 'baltic_clean_tankers', name: 'Baltic Clean Tanker (BCTI)', category: 'freight_tanker', last_price: 950, change_pct: 1.2 },
      { slug: 'freightos_baltic', name: 'FBX', category: 'freight_container', last_price: 2300, change_pct: 0.1 },
    ],
  },
  tankers: {
    items: [
      { imo: 'IMO9778600', name: 'FRONT ORION', type: 'tanker', subtype: 'VLCC', dwt: 305800 },
      { imo: 'IMO9863211', name: 'EAGLE VICTORIA', type: 'tanker', subtype: 'VLCC', dwt: 318400 },
    ],
  },
  lng: {
    items: [
      { imo: 'IMO9728702', name: 'AL MAHA', type: 'lng', subtype: 'Q-Flex', dwt: 117000 },
    ],
  },
}

test('filtra solo chokepoints energéticos y ordena por riesgo desc', () => {
  const out = buildEnergyLogistics(RAW)
  // Malaca y Panamá quedan fuera; Ormuz, Bab-el-Mandeb dentro.
  assert.equal(out.chokepoints.length, 2)
  assert.equal(out.chokepoints[0].slug, 'bab_el_mandeb') // risk 90 primero
  assert.equal(out.chokepoints[1].slug, 'ormuz') // risk 75
  // Cada uno trae su nota energética no vacía.
  assert.ok(out.chokepoints[0].energia_nota.length > 0)
  assert.ok(out.chokepoints[1].energia_nota.includes('golfo Pérsico'))
})

test('freight extrae BDI + tendencia + subíndices tanker', () => {
  const out = buildEnergyLogistics(RAW)
  assert.equal(out.freight.bdi, 1500.5)
  assert.equal(out.freight.change_pct, 2.3)
  assert.equal(out.freight.trend, 'subida')
  assert.equal(out.freight.name, 'Baltic Dry Index (BDI)')
  // Dos subíndices tanker (dirty + clean), no el contenedor.
  assert.equal(out.freight.tanker_indices.length, 2)
  const slugs = out.freight.tanker_indices.map((t) => t.slug).sort()
  assert.deepEqual(slugs, ['baltic_clean_tankers', 'baltic_dirty_tankers'])
})

test('cuenta tankers + lng y construye muestra', () => {
  const out = buildEnergyLogistics(RAW)
  assert.equal(out.tankers.tankers, 2)
  assert.equal(out.tankers.lng, 1)
  assert.equal(out.tankers.sample.length, 3) // 2 tankers + 1 lng
  assert.equal(out.tankers.sample[0].name, 'FRONT ORION')
  assert.ok(out.tankers.source_note.includes('VESSELS_SEED'))
})

test('degrada a vacíos sin lanzar cuando faltan bloques', () => {
  const out = buildEnergyLogistics({})
  assert.deepEqual(out.chokepoints, [])
  assert.equal(out.freight.bdi, null)
  assert.equal(out.freight.trend, 'estable')
  assert.deepEqual(out.freight.tanker_indices, [])
  assert.equal(out.tankers.tankers, 0)
  assert.equal(out.tankers.lng, 0)
})

// ─── Resumen ──────────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? 'OK' : 'FAIL'} · ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
