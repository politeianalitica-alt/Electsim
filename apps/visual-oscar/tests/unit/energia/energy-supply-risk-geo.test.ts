/**
 * Sprint Energía v3 · E2-cross · Tests de lib/energia/energy-supply-risk-geo.ts
 *
 * Cubre las funciones PURAS (sin red): `paisToIso3`, `countryRiskScore`,
 * `riskBand`, `weightedRisk` y `buildSupplyRisk` (que lee los catálogos
 * importados PETROLEO_DEPENDENCIA_ES + GNL_ESPANA y los datasets seed de
 * geopolítica · todo en proceso, sin red).
 *
 * Mismo harness que el resto del repo (NO vitest). Ejecutar con:
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/energy-supply-risk-geo.test.ts
 */
import assert from 'node:assert/strict'
import {
  paisToIso3,
  countryRiskScore,
  riskBand,
  weightedRisk,
  buildSupplyRisk,
} from '../../../lib/energia/energy-supply-risk-geo.ts'
import { vdemRiskComponent } from '../../../lib/geopolitica/vdem-data.ts'

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

// ─── paisToIso3 ───────────────────────────────────────────────────────
console.log('\n→ paisToIso3')

test('mapea nombres de catálogo (con acentos) a ISO3', () => {
  assert.equal(paisToIso3('México'), 'MEX')
  assert.equal(paisToIso3('Estados Unidos'), 'USA')
  assert.equal(paisToIso3('Arabia Saudí'), 'SAU')
  assert.equal(paisToIso3('Argelia'), 'DZA')
  assert.equal(paisToIso3('Kazajistán'), 'KAZ')
  assert.equal(paisToIso3('Noruega'), 'NOR')
})

test('maneja variantes de Rusia/Catar del catálogo GNL', () => {
  assert.equal(paisToIso3('Rusia (GNL)'), 'RUS')
  assert.equal(paisToIso3('Rusia'), 'RUS')
  assert.equal(paisToIso3('Qatar'), 'QAT')
  assert.equal(paisToIso3('Catar'), 'QAT')
})

test('"Resto"/desconocido → null', () => {
  assert.equal(paisToIso3('Resto'), null)
  assert.equal(paisToIso3('Otros'), null)
  assert.equal(paisToIso3('Atlántida'), null)
  assert.equal(paisToIso3(''), null)
})

// ─── countryRiskScore + riskBand ──────────────────────────────────────
console.log('\n→ countryRiskScore + riskBand')

test('score = componente V-Dem invertido (autocracia → más riesgo)', () => {
  // Rusia (autocracia cerrada V-Dem ~0.10) debe puntuar mucho más que Noruega.
  const rus = countryRiskScore('RUS')
  const nor = countryRiskScore('NOR')
  assert.equal(rus, vdemRiskComponent('RUS'))
  assert.ok(rus > 80, `RUS risk ${rus} debería ser > 80`)
  assert.ok(nor < 20, `NOR risk ${nor} debería ser < 20`)
  assert.ok(rus > nor)
})

test('iso null → fallback', () => {
  assert.equal(countryRiskScore(null), 50)
  assert.equal(countryRiskScore(null, 42), 42)
})

test('riskBand mapea a bandas', () => {
  assert.equal(riskBand(90), 'critico')
  assert.equal(riskBand(60), 'alto')
  assert.equal(riskBand(40), 'medio')
  assert.equal(riskBand(10), 'bajo')
  assert.equal(riskBand(null), 'desconocido')
})

// ─── weightedRisk ─────────────────────────────────────────────────────
console.log('\n→ weightedRisk')

test('media ponderada por cuota, excluye "Resto" (iso null)', () => {
  const w = weightedRisk([
    { iso: 'AAA', cuota_pct: 10, riesgo: 80 },
    { iso: 'BBB', cuota_pct: 30, riesgo: 40 },
    { iso: null, cuota_pct: 60, riesgo: 100 }, // "Resto" no pondera
  ])
  // (80*10 + 40*30) / (10+30) = (800+1200)/40 = 50
  assert.equal(w, 50)
})

test('ignora riesgos null y cuotas <= 0', () => {
  const w = weightedRisk([
    { iso: 'AAA', cuota_pct: 20, riesgo: 60 },
    { iso: 'BBB', cuota_pct: 0, riesgo: 90 },
    { iso: 'CCC', cuota_pct: 10, riesgo: null },
  ])
  assert.equal(w, 60) // solo AAA computa
})

test('sin base → null', () => {
  assert.equal(weightedRisk([]), null)
  assert.equal(weightedRisk([{ iso: null, cuota_pct: 100, riesgo: 50 }]), null)
})

// ─── buildSupplyRisk (lee catálogos reales del repo) ──────────────────
console.log('\n→ buildSupplyRisk')

test('construye ambos vectores con riesgo ponderado plausible', () => {
  const out = buildSupplyRisk()
  assert.equal(out.petroleo.vector, 'petroleo')
  assert.equal(out.gas.vector, 'gnl')
  // Riesgo ponderado dentro de rango 0-100 o null.
  for (const r of [out.riesgo_ponderado_petroleo, out.riesgo_ponderado_gas]) {
    if (r != null) assert.ok(r >= 0 && r <= 100, `riesgo ponderado fuera de rango: ${r}`)
  }
  assert.equal(out.riesgo_ponderado_petroleo, out.petroleo.riesgo_ponderado)
  assert.equal(out.riesgo_ponderado_gas, out.gas.riesgo_ponderado)
})

test('cada país del catálogo trae cuota + componentes', () => {
  const out = buildSupplyRisk()
  assert.ok(out.petroleo.por_pais.length >= 5)
  for (const p of out.petroleo.por_pais) {
    assert.equal(typeof p.pais, 'string')
    assert.equal(typeof p.cuota_pct, 'number')
    assert.ok('componentes' in p)
    assert.ok('vdem' in p.componentes)
  }
})

test('GNL incluye Rusia con riesgo alto por sanciones', () => {
  const out = buildSupplyRisk()
  const rusia = out.gas.por_pais.find((p) => p.iso === 'RUS')
  assert.ok(rusia, 'Rusia debería estar en orígenes GNL')
  assert.ok((rusia!.riesgo ?? 0) >= 75, `Rusia GNL riesgo ${rusia!.riesgo} esperado >= 75 (sanciones+V-Dem)`)
  assert.ok(rusia!.componentes.sanciones_programas > 0)
})

test('"Resto" aparece sin iso y no rompe la ponderación', () => {
  const out = buildSupplyRisk()
  const resto = out.petroleo.por_pais.find((p) => p.iso == null)
  assert.ok(resto, 'debería existir el agregado Resto')
  assert.equal(resto!.riesgo_banda, 'desconocido')
  // El riesgo ponderado se calcula igualmente sobre los identificados.
  assert.ok(out.petroleo.riesgo_ponderado != null)
})

// ─── Resumen ──────────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? 'OK' : 'FAIL'} · ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
