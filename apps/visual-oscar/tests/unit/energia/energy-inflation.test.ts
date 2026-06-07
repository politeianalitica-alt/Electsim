/**
 * Sprint Energía v3 · E2-cross · Tests de lib/energia/energy-inflation.ts
 *
 * Cubre las funciones PURAS (sin red): `lastPoint`, `passthroughNote` y
 * `buildEnergyInflation` con fixtures de series ya resueltas (cada una ok o
 * degradada). No ejerce los fetchers de red (Eurostat/ECB/Alpha).
 *
 * Mismo harness que el resto del repo (NO vitest). Ejecutar con:
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/energy-inflation.test.ts
 */
import assert from 'node:assert/strict'
import {
  lastPoint,
  passthroughNote,
  buildEnergyInflation,
  type InflationSeries,
} from '../../../lib/energia/energy-inflation.ts'

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

// ─── lastPoint ────────────────────────────────────────────────────────
console.log('\n→ lastPoint')

test('toma el periodo máximo aunque la serie esté desordenada', () => {
  const p = lastPoint([
    { period: '2024-01', value: 1 },
    { period: '2024-03', value: 3 },
    { period: '2024-02', value: 2 },
  ])
  assert.equal(p?.period, '2024-03')
  assert.equal(p?.value, 3)
})

test('ignora puntos sin valor', () => {
  const p = lastPoint([
    { period: '2024-05', value: null },
    { period: '2024-04', value: 7 },
  ])
  assert.equal(p?.period, '2024-04')
  assert.equal(p?.value, 7)
})

test('serie vacía / toda null → null', () => {
  assert.equal(lastPoint([]), null)
  assert.equal(lastPoint([{ period: '2024-01', value: null }]), null)
})

// ─── passthroughNote ──────────────────────────────────────────────────
console.log('\n→ passthroughNote')

test('siempre menciona USD y el canal EUR/USD', () => {
  const n = passthroughNote(null)
  assert.ok(n.includes('USD'))
  assert.ok(n.includes('EUR/USD'))
})

test('euro débil (<1,00) → nota de passthrough elevado', () => {
  const n = passthroughNote(0.95)
  assert.ok(n.includes('0.950'))
  assert.ok(/elevado/i.test(n))
})

test('euro fuerte (>=1,12) → nota de amortiguación', () => {
  const n = passthroughNote(1.15)
  assert.ok(/amortigua/i.test(n))
})

// ─── buildEnergyInflation ─────────────────────────────────────────────
console.log('\n→ buildEnergyInflation')

function series(label: string, pts: Array<{ period: string; value: number | null }>, ok = true): InflationSeries {
  return {
    ok,
    label,
    unit: '% YoY',
    series: pts,
    last: lastPoint(pts),
    source: 'test',
    source_url: 'test://',
  }
}

test('calcula spread energía − general (pp) del último dato', () => {
  const out = buildEnergyInflation({
    ipc_energia: series('IPC energía', [{ period: '2024-04', value: 8.4 }]),
    ipc_general: series('IPC general', [{ period: '2024-04', value: 3.1 }]),
    ipi: series('IPI', [{ period: '2024-04', value: 102.5 }]),
    eur_usd: series('EUR/USD', [{ period: '2024-04-30', value: 1.07 }]),
  })
  assert.equal(out.spread_energia_general_pp, 5.3) // 8.4 - 3.1
  assert.ok(out.nota.includes('1.070'))
})

test('spread null si falta alguna pata', () => {
  const out = buildEnergyInflation({
    ipc_energia: series('IPC energía', [], false),
    ipc_general: series('IPC general', [{ period: '2024-04', value: 3.1 }]),
    ipi: series('IPI', [], false),
    eur_usd: series('EUR/USD', [], false),
  })
  assert.equal(out.spread_energia_general_pp, null)
  // La nota sigue presente (base, sin nivel EUR/USD).
  assert.ok(out.nota.includes('USD'))
})

test('preserva las 4 series tal cual (degradación por-serie)', () => {
  const ie = series('IPC energía', [{ period: '2024-04', value: 8.4 }])
  const ig = series('IPC general', [], false)
  const ipi = series('IPI', [{ period: '2024-04', value: 100 }])
  const eur = series('EUR/USD', [{ period: '2024-04-30', value: 1.09 }])
  const out = buildEnergyInflation({ ipc_energia: ie, ipc_general: ig, ipi, eur_usd: eur })
  assert.equal(out.ipc_energia.ok, true)
  assert.equal(out.ipc_general.ok, false)
  assert.equal(out.ipi.last?.value, 100)
  assert.equal(out.eur_usd.last?.value, 1.09)
})

// ─── Resumen ──────────────────────────────────────────────────────────
console.log(`\n${failed === 0 ? 'OK' : 'FAIL'} · ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
