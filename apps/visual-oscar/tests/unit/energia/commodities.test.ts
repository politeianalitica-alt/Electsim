/**
 * Sprint Energía S7 · Tests del cliente de commodities energía.
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo —
 * ver tests/unit/energia/nuclear.test.ts). Se ejecuta con Node 22+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/commodities.test.ts
 *
 * Cubre las FUNCIONES PURAS (sin red) del cliente:
 *   - computeChange(): variación % a N días sobre serie cronológica, con la
 *     semántica especial 24h (penúltimo punto) y la búsqueda por ventana
 *     de días naturales (tolerando fines de semana) para 7d/30d.
 *   - brentWtiSpread(): spread Brent-WTI con manejo de nulos.
 *   - buildSeries(): ensamblado spot + variaciones desde una serie (fixture),
 *     incluyendo ordenación y filtrado de no-finitos.
 *   - ENERGY_CATEGORIES: shape del catálogo de categorías.
 *
 * NO testea fetchEnergyCommodity()/fetchEnergyCategory() porque hacen red real
 * (Alpha Vantage/Nasdaq/Yahoo); su lógica de ensamblado se cubre vía buildSeries.
 */
import assert from 'node:assert/strict'
import {
  computeChange,
  brentWtiSpread,
  buildSeries,
  ENERGY_CATEGORIES,
  ENERGY_SYMBOLS,
} from '../../../lib/energia/commodities.ts'
import type { EnergyCommodityPoint } from '../../../lib/energia/types.ts'

let passed = 0
let failed = 0

function test(name: string, fn: () => void | Promise<void>) {
  const start = async () => {
    try {
      await fn()
      passed++
      console.log(`  ✓ ${name}`)
    } catch (e) {
      failed++
      console.error(`  ✗ ${name}`)
      console.error('    ', (e as Error).message)
    }
  }
  return start()
}

/** Genera una serie diaria cronológica ascendente terminando en `endDate`. */
function dailySeries(endDate: string, values: number[]): EnergyCommodityPoint[] {
  const end = new Date(endDate + 'T00:00:00Z').getTime()
  const n = values.length
  return values.map((v, i) => {
    const d = new Date(end - (n - 1 - i) * 24 * 60 * 60 * 1000)
    return { date: d.toISOString().slice(0, 10), value: v }
  })
}

function approx(actual: number, expected: number, tol = 1e-6): void {
  assert.ok(Math.abs(actual - expected) <= tol, `esperado ≈${expected}, obtenido ${actual}`)
}

async function run() {
  console.log('\n→ energia · commodities')

  // ─── computeChange · 24h ────────────────────────────────────────────
  await test('computeChange(serie, 1) = variación último vs penúltimo punto', () => {
    const s = dailySeries('2026-06-01', [100, 110])
    const chg = computeChange(s, 1)
    assert.notEqual(chg, null)
    approx(chg as number, 10) // (110-100)/100 = +10%
  })

  await test('computeChange(serie, 1) capta caídas (signo negativo)', () => {
    const s = dailySeries('2026-06-01', [200, 150])
    const chg = computeChange(s, 1)
    approx(chg as number, -25) // (150-200)/200 = -25%
  })

  // ─── computeChange · ventana de días naturales ──────────────────────
  await test('computeChange(serie, 7) usa el punto ~7 días atrás', () => {
    // 8 puntos diarios; el de hace 7 días vale 100, el último 120 → +20%.
    const s = dailySeries('2026-06-08', [100, 101, 102, 103, 104, 105, 110, 120])
    const chg = computeChange(s, 7)
    assert.notEqual(chg, null)
    approx(chg as number, 20) // base = punto a 7 días (100)
  })

  await test('computeChange(serie, 30) devuelve null si la serie no llega a 30 días', () => {
    const s = dailySeries('2026-06-08', [100, 105, 110]) // solo 3 días
    assert.equal(computeChange(s, 30), null)
  })

  await test('computeChange tolera huecos de fin de semana (toma el más cercano >= N días)', () => {
    // Serie con saltos: día -10, -3, -1, 0. Para days=7, el único punto a >=7
    // días atrás es el de -10 (valor 50); último = 100 → +100%.
    const today = '2026-06-15'
    const mk = (deltaDays: number, v: number): EnergyCommodityPoint => ({
      date: new Date(new Date(today + 'T00:00:00Z').getTime() - deltaDays * 86400000)
        .toISOString()
        .slice(0, 10),
      value: v,
    })
    const s = [mk(10, 50), mk(3, 80), mk(1, 95), mk(0, 100)]
    const chg = computeChange(s, 7)
    approx(chg as number, 100)
  })

  await test('computeChange devuelve null con serie vacía o de un punto', () => {
    assert.equal(computeChange([], 1), null)
    assert.equal(computeChange([{ date: '2026-06-01', value: 80 }], 1), null)
  })

  await test('computeChange devuelve null si la base es 0 (evita división por cero)', () => {
    const s = dailySeries('2026-06-02', [0, 50])
    assert.equal(computeChange(s, 1), null)
  })

  // ─── brentWtiSpread ─────────────────────────────────────────────────
  await test('brentWtiSpread(brent, wti) = brent - wti', () => {
    approx(brentWtiSpread(85, 80) as number, 5)
    approx(brentWtiSpread(70.5, 68.25) as number, 2.25)
  })

  await test('brentWtiSpread puede ser negativo (WTI > Brent puntual)', () => {
    approx(brentWtiSpread(78, 80) as number, -2)
  })

  await test('brentWtiSpread devuelve null si falta algún lado', () => {
    assert.equal(brentWtiSpread(null, 80), null)
    assert.equal(brentWtiSpread(85, null), null)
    assert.equal(brentWtiSpread(null, null), null)
    assert.equal(brentWtiSpread(undefined, 80), null)
  })

  // ─── buildSeries (parsing/ensamblado desde fixture) ──────────────────
  await test('buildSeries ensambla spot + variaciones desde una serie', () => {
    const s = dailySeries('2026-06-08', [100, 101, 102, 103, 104, 105, 110, 121])
    const out = buildSeries(
      'brent',
      { name: 'Brent', unit: 'USD/bbl', currency: 'USD' },
      s,
      'yahoo_finance',
      'Yahoo Finance · BZ=F',
      'https://finance.yahoo.com/commodities',
    )
    assert.equal(out.symbol, 'brent')
    assert.equal(out.latest, 121)
    assert.equal(out.latest_date, s[s.length - 1].date)
    assert.equal(out.source, 'yahoo_finance')
    assert.equal(out.series.length, 8)
    // 24h: 121 vs 110 = +10%
    approx(out.change_24h as number, 10)
    // 7d: base = punto a 7 días (100) → +21%
    approx(out.change_7d as number, 21)
  })

  await test('buildSeries ordena cronológicamente y descarta no-finitos', () => {
    // Entrada desordenada con un NaN intercalado.
    const messy: EnergyCommodityPoint[] = [
      { date: '2026-06-03', value: 102 },
      { date: '2026-06-01', value: 100 },
      { date: '2026-06-02', value: Number.NaN },
      { date: '2026-06-04', value: 104 },
    ]
    const out = buildSeries(
      'wti',
      { name: 'WTI', unit: 'USD/bbl', currency: 'USD' },
      messy,
      'alpha_vantage',
      'Alpha Vantage · WTI',
      'https://www.alphavantage.co/',
    )
    assert.equal(out.series.length, 3, 'descarta el punto NaN')
    assert.deepEqual(
      out.series.map((p) => p.date),
      ['2026-06-01', '2026-06-03', '2026-06-04'],
      'orden ascendente por fecha',
    )
    assert.equal(out.latest, 104)
  })

  await test('buildSeries con serie vacía → latest null y variaciones null', () => {
    const out = buildSeries('ttf', { name: 'TTF', unit: 'EUR/MWh', currency: 'EUR' }, [], 'yahoo_finance', 'x', 'y')
    assert.equal(out.latest, null)
    assert.equal(out.latest_date, null)
    assert.equal(out.change_24h, null)
    assert.equal(out.change_7d, null)
    assert.equal(out.change_30d, null)
  })

  // ─── Catálogo de categorías y símbolos ───────────────────────────────
  await test('ENERGY_CATEGORIES tiene oil/gas/all con símbolos válidos', () => {
    assert.ok(Array.isArray(ENERGY_CATEGORIES.oil) && ENERGY_CATEGORIES.oil.includes('brent'))
    assert.ok(ENERGY_CATEGORIES.oil.includes('wti') && ENERGY_CATEGORIES.oil.includes('opec'))
    assert.ok(ENERGY_CATEGORIES.gas.includes('henry-hub') && ENERGY_CATEGORIES.gas.includes('ttf'))
    // 'all' contiene todos los de oil y gas
    for (const sym of [...ENERGY_CATEGORIES.oil, ...ENERGY_CATEGORIES.gas]) {
      assert.ok(ENERGY_CATEGORIES.all.includes(sym), `all debe incluir ${sym}`)
    }
  })

  await test('ENERGY_SYMBOLS: Brent tiene cascada (alpha+nasdaq+yahoo), TTF sin fuente', () => {
    const brent = ENERGY_SYMBOLS.brent
    assert.equal(brent.alphaFunction, 'BRENT')
    assert.ok(brent.nasdaq && brent.nasdaq.db === 'OPEC')
    assert.equal(brent.yahoo, 'BZ=F')
    const ttf = ENERGY_SYMBOLS.ttf
    assert.ok(!ttf.alphaFunction && !ttf.nasdaq && !ttf.yahoo, 'TTF sin fuente gratuita')
  })

  // ─── Resumen ─────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
