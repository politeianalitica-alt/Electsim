/**
 * Tests de aceptación · Sector Energía v2 · Sprint Energía S10
 *
 * Verifican la coherencia del sprint completo a nivel de LÓGICA/CONTRATOS
 * (no datos en vivo — el entorno de test no tiene las API keys). Cubren:
 *   - catálogos curados completos (reactores, empresas, capacidad, PNIEC, H2,
 *     subastas, GNL, dependencia petróleo)
 *   - helpers puros de cada sprint (factor de carga, variación commodities,
 *     spread, resumen flota nuclear, parseNum AGSI, riesgo de suministro)
 *   - el módulo de empresas resuelve por slug
 *
 * Harness: node --experimental-strip-types + node:assert/strict.
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings tests/acceptance/sector-energia-v2.spec.ts
 */
import assert from 'node:assert/strict'

import {
  REACTORES_ES,
  EMPRESAS_ENERGIA,
  CAPACIDAD_RENOVABLE_ES,
  PNIEC_2030,
  H2_PROYECTOS_ES,
  SUBASTAS_RENOVABLES_ES,
  GNL_ESPANA,
  PETROLEO_DEPENDENCIA_ES,
} from '../../lib/energia/catalog.ts'
import { computeLoadFactor } from '../../lib/energia/renovables-calc.ts'
import { summarizeFleet, buildClosureSchedule } from '../../lib/energia/nuclear-calc.ts'
import { brentWtiSpread } from '../../lib/energia/commodities.ts'
import { parseNum } from '../../lib/energia/agsi.ts'
import { computeSupplyRisk, heuristicSummary } from '../../lib/energia/supply-risk-calc.ts'
import { findCompanyBySlug, listCompanySlugs } from '../../lib/energia/companies.ts'

let passed = 0
let failed = 0
const failures: Array<{ name: string; err: string }> = []

function test(name: string, fn: () => void): void {
  try {
    fn()
    passed++
    console.log(`  ok ${name}`)
  } catch (e) {
    failed++
    failures.push({ name, err: (e as Error).message })
    console.log(`  FAIL ${name}`)
  }
}

// ── Catálogos ────────────────────────────────────────────────────────────────
test('#1 REACTORES_ES · 7 reactores con potencia y cierre coherentes', () => {
  assert.equal(REACTORES_ES.length, 7)
  for (const r of REACTORES_ES) {
    assert.ok(r.potencia_mw > 900 && r.potencia_mw < 1200, `potencia ${r.nombre}`)
    assert.ok(r.cierre_previsto >= 2027 && r.cierre_previsto <= 2040, `cierre ${r.nombre}`)
    assert.ok(r.propietarios.length > 0, `propietarios ${r.nombre}`)
  }
})

test('#2 EMPRESAS_ENERGIA · ≥20 empresas, ≥8 españolas, energías pobladas', () => {
  assert.ok(EMPRESAS_ENERGIA.length >= 20, `solo ${EMPRESAS_ENERGIA.length}`)
  assert.ok(EMPRESAS_ENERGIA.filter((e) => e.es_espanola).length >= 8)
  // La mayoría cotizan; las privadas (p.ej. Cepsa, EDF) pueden no tener ticker.
  assert.ok(EMPRESAS_ENERGIA.filter((e) => e.ticker.length > 0).length >= 18)
  for (const e of EMPRESAS_ENERGIA) {
    assert.equal(typeof e.ticker, 'string', `ticker no string ${e.slug}`)
    assert.ok(e.energias.length > 0, `sin energías ${e.slug}`)
  }
})

test('#3 slugs de empresa únicos', () => {
  const slugs = EMPRESAS_ENERGIA.map((e) => e.slug)
  assert.equal(new Set(slugs).size, slugs.length)
})

test('#4 CAPACIDAD_RENOVABLE_ES · no vacío, capacidad > 0', () => {
  assert.ok(CAPACIDAD_RENOVABLE_ES.length > 0)
  for (const c of CAPACIDAD_RENOVABLE_ES) assert.ok(c.capacidad_mw > 0, c.tecnologia)
})

test('#5 PNIEC_2030 · objetivos presentes', () => {
  assert.ok(PNIEC_2030.length > 0)
  for (const p of PNIEC_2030) assert.ok(p.metrica.length > 0)
})

test('#6 H2_PROYECTOS_ES · proyectos con capacidad', () => {
  assert.ok(H2_PROYECTOS_ES.length >= 4)
  for (const h of H2_PROYECTOS_ES) assert.ok(h.nombre.length > 0)
})

test('#7 SUBASTAS_RENOVABLES_ES + GNL_ESPANA + PETROLEO_DEPENDENCIA_ES poblados', () => {
  assert.ok(SUBASTAS_RENOVABLES_ES.length >= 3)
  assert.ok(GNL_ESPANA != null)
  assert.ok(PETROLEO_DEPENDENCIA_ES != null)
  assert.ok(PETROLEO_DEPENDENCIA_ES.dependencia_importacion_pct > 90)
})

// ── Helpers puros ─────────────────────────────────────────────────────────────
test('#8 computeLoadFactor · gen/capacidad acotado [0,1]', () => {
  assert.equal(computeLoadFactor(250, 1000).factor, 0.25)
  assert.equal(computeLoadFactor(0, 1000).factor, 0)
  // clamp + nulos sin lanzar
  assert.ok((computeLoadFactor(2000, 1000).factor ?? 0) <= 1)
  assert.equal(computeLoadFactor(null as unknown as number, 0).factor, null)
})

test('#9 summarizeFleet + buildClosureSchedule sobre el parque real', () => {
  const s = summarizeFleet(REACTORES_ES)
  assert.ok(s.potencia_total_mw > 7000 && s.potencia_total_mw < 8000, `total ${s.potencia_total_mw}`)
  assert.ok(s.operativos >= 1)
  const sched = buildClosureSchedule(REACTORES_ES)
  assert.ok(sched.length > 0)
  // ordenado ascendente por año
  for (let i = 1; i < sched.length; i++) assert.ok(sched[i]!.year >= sched[i - 1]!.year)
})

test('#10 brentWtiSpread · diferencia simple', () => {
  assert.equal(brentWtiSpread(85, 80), 5)
  assert.equal(brentWtiSpread(null, 80), null)
})

test('#11 parseNum (AGSI) · strings y huecos', () => {
  assert.equal(parseNum('87.62'), 87.62)
  assert.equal(parseNum('-'), null)
  assert.equal(parseNum(null), null)
  assert.equal(parseNum(42), 42)
})

// ── Riesgo de suministro (heurística pura) ────────────────────────────────────
test('#12 computeSupplyRisk · vectores + nivel global coherente', () => {
  const r = computeSupplyRisk({
    spotPriceEurMwh: 200, // crisis
    brentUsd: 120, // alto
    gasStoragePctEu: 30, // bajo lleno = alto riesgo
    dependenciaPct: 73,
    renovablePct: 50,
  })
  assert.ok(r.score != null && r.score >= 60, `score ${r.score}`)
  assert.ok(['alto', 'critico'].includes(r.nivel_global), r.nivel_global)
  assert.equal(r.vectores.length, 5)
})

test('#13 computeSupplyRisk · escenario holgado → riesgo más bajo', () => {
  const r = computeSupplyRisk({
    spotPriceEurMwh: 40, // holgado
    brentUsd: 60, // bajo
    gasStoragePctEu: 95, // muy lleno = riesgo bajo
    dependenciaPct: 73,
    renovablePct: 70,
  })
  assert.ok(r.score != null)
  // gas lleno + precios bajos deben bajar el score frente al escenario #12
  assert.ok(r.score! < 60, `score ${r.score}`)
})

test('#14 computeSupplyRisk · sin datos → pendiente sin lanzar', () => {
  const r = computeSupplyRisk({ dependenciaPct: null })
  // sin ningún vector con dato real → score null o muy parcial, no lanza
  assert.ok(r.vectores.length === 5)
})

test('#15 heuristicSummary · texto factual no vacío', () => {
  const r = computeSupplyRisk({ spotPriceEurMwh: 200, brentUsd: 120, gasStoragePctEu: 30, dependenciaPct: 73, renovablePct: 50 })
  const txt = heuristicSummary(r)
  assert.ok(txt.length > 20)
  assert.ok(/riesgo/i.test(txt))
})

// ── Empresas ──────────────────────────────────────────────────────────────────
test('#16 findCompanyBySlug + listCompanySlugs coherentes', () => {
  const slugs = listCompanySlugs()
  assert.ok(slugs.length >= 20)
  const first = findCompanyBySlug(slugs[0]!)
  assert.ok(first != null)
  assert.equal(findCompanyBySlug('no-existe-xyz'), null)
})

// ── Resumen ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed · ${failed} failed`)
if (failures.length) {
  for (const f of failures) console.log(`  · ${f.name}: ${f.err}`)
  process.exit(1)
}
