/**
 * Tests del cliente energy-charts.info (lib/energia/energy-charts.ts).
 *
 * NO depende de vitest/jest (mismo patrón que los demás tests del repo — ver
 * tests/unit/energia/ember-client.test.ts). Se ejecuta con Node:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/energy-charts.test.ts
 *
 * Mock de `globalThis.fetch` con FIXTURES derivados del payload REAL capturado
 * en vivo (2026-06-06 · sin key) de:
 *   - GET /price?bzn=ES         → { license_info, unix_seconds, price, unit }
 *       (unix_seconds en pasos de 900s · precio €/MWh)
 *   - GET /public_power?country=es → { unix_seconds, production_types:[{name,data}] }
 *       (MW por fuente · incluye "Load", "Renewable share of *", consumos negativos)
 *   - GET /cbpf?country=es       → { unix_seconds, countries:[{name,data}] }  (GW)
 *       (flujo neto por vecino · entrada agregada name="sum" · positivo = importa)
 *
 * Cubre:
 *   1. helper latestFromSeries · último valor no nulo + ts derivado de unix
 *   2. helper avgSeries · media ignorando null/NaN
 *   3. parsePrice · latest + avg del día + min/max + serie
 *   4. parseGeneration · fuentes (excluye Load/share/consumos) + % renovable
 *   5. parseCrossBorder · GW→MW + dirección por signo + saldo "sum"
 *   6. fetchEuPrices · varias zonas SECUENCIAL (ok + degradación parcial)
 *   7. fetch-fail (red caída) → { ok:false } sin lanzar
 *   8. rate-limit 429 → { ok:false, error rate_limited }
 *   9. caché: 2ª llamada idéntica NO refetch
 */
import assert from 'node:assert/strict'
import {
  fetchEuPrices,
  fetchEuGeneration,
  fetchCrossBorderFlows,
  parsePrice,
  parseGeneration,
  parseCrossBorder,
  latestFromSeries,
  avgSeries,
  avgLastDay,
  _clearEnergyChartsCache,
} from '../../../lib/energia/energy-charts.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${(e as Error)?.message ?? e}`)
  }
}

// ── Fixtures (shape REAL · valores plausibles capturados en vivo) ──────────

// /price?bzn=ES · 6 puntos de 900s, último no nulo, con un hueco null.
const STEP = 900
const T0 = 1780696800 // base epoch real
function priceFixtureES() {
  return {
    license_info: 'CC-BY · Fraunhofer ISE',
    unix_seconds: [T0, T0 + STEP, T0 + 2 * STEP, T0 + 3 * STEP, T0 + 4 * STEP, T0 + 5 * STEP],
    price: [127.45, 123.41, 116.63, null, 95.4, 88.0],
    unit: 'EUR / MWh',
    deprecated: false,
  }
}
function priceFixtureFR() {
  return {
    license_info: 'CC-BY',
    unix_seconds: [T0, T0 + STEP, T0 + 2 * STEP],
    price: [60.0, 62.5, 65.0],
    unit: 'EUR / MWh',
    deprecated: false,
  }
}

// /public_power?country=es · fuentes + series especiales + consumos negativos.
function publicPowerFixtureES() {
  return {
    unix_seconds: [T0, T0 + STEP],
    production_types: [
      { name: 'Hydro pumped storage consumption', data: [-3600.0, -3600.0] }, // consumo → excluir
      { name: 'Battery Consumption', data: [-0.0, -0.0] }, // consumo → excluir
      { name: 'Cross border electricity trading', data: [-1000.0, -1075.7] }, // trading → excluir
      { name: 'Nuclear', data: [4000.0, 4008.0] },
      { name: 'Fossil gas', data: [2600.0, 2680.0] },
      { name: 'Solar', data: [19000.0, 19828.0] },
      { name: 'Wind onshore', data: [1400.0, 1488.0] },
      { name: 'Hydro Run-of-River', data: [700.0, 744.0] },
      { name: 'Fossil oil', data: [8.0, 8.0] },
      { name: 'Load', data: [24000.0, 24448.0] }, // demanda → excluir del mix
      { name: 'Residual load', data: [3000.0, 3132.0] }, // excluir
      { name: 'Renewable share of load', data: [93.0, 95.0] }, // %
      { name: 'Renewable share of generation', data: [76.0, 77.3] }, // %
    ],
    deprecated: false,
  }
}

// /cbpf?country=es · vecinos en GW + entrada agregada "sum".
function cbpfFixtureES() {
  return {
    unix_seconds: [T0, T0 + STEP, T0 + 2 * STEP],
    countries: [
      { name: 'France', data: [1.5, 1.8, 1.993] }, // positivo → FR → ES (ES importa)
      { name: 'Portugal', data: [-3.0, -3.1, -3.211] }, // negativo → ES → PT (ES exporta)
      { name: 'sum', data: [-1.5, -1.3, -1.218] }, // saldo agregado
    ],
    deprecated: false,
  }
}

// Mock de fetch configurable por ruta.
function installFetch(handler: (path: string) => { status?: number; body?: unknown; throwErr?: boolean }) {
  ;(globalThis as { fetch: unknown }).fetch = async (url: string) => {
    const path = String(url).replace('https://api.energy-charts.info', '')
    const r = handler(path)
    if (r.throwErr) throw new Error('network down')
    const status = r.status ?? 200
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 429 ? 'Too Many Requests' : 'OK',
      json: async () => r.body,
    } as unknown as Response
  }
}

async function run() {
  console.log('\nenergy-charts.info client tests\n')

  // ── 1. latestFromSeries ──────────────────────────────────────────────────
  await test('latestFromSeries · último valor no nulo + ts derivado de unix', () => {
    const { value, ts } = latestFromSeries(
      [T0, T0 + STEP, T0 + 2 * STEP],
      [10, 20, null],
    )
    assert.equal(value, 20, 'debería saltar el null final y devolver 20')
    assert.equal(ts, new Date((T0 + STEP) * 1000).toISOString(), 'ts del punto 20')
    // Serie totalmente vacía/nula.
    assert.deepEqual(latestFromSeries([], []), { value: null, ts: null })
    assert.deepEqual(latestFromSeries([T0], [null]), { value: null, ts: null })
  })

  // ── 2. avgSeries ─────────────────────────────────────────────────────────
  await test('avgSeries · media ignorando null/NaN', () => {
    assert.equal(avgSeries([10, 20, 30]), 20)
    assert.equal(avgSeries([10, null, 30]), 20) // ignora null
    assert.equal(avgSeries([]), null)
    assert.equal(avgSeries([null, null]), null)
    // avgLastDay con unix desalineado → cae a media simple.
    assert.equal(avgLastDay([T0], [10, 20]), 15)
  })

  // ── 3. parsePrice ────────────────────────────────────────────────────────
  await test('parsePrice · latest + avg del día + min/max + serie', () => {
    const p = parsePrice('ES', priceFixtureES())
    assert.equal(p.zone, 'ES')
    assert.equal(p.label, 'España')
    assert.equal(p.latest_eur_mwh, 88.0, 'último no nulo')
    assert.equal(p.latest_ts, new Date((T0 + 5 * STEP) * 1000).toISOString())
    // media del día = media de los finitos (todos caen en la misma ventana 24h):
    // (127.45+123.41+116.63+95.4+88.0)/5 = 110.178 → 110.18
    assert.equal(p.avg_today, 110.18, `avg_today=${p.avg_today}`)
    assert.equal(p.min_eur_mwh, 88.0)
    assert.equal(p.max_eur_mwh, 127.45)
    // serie excluye el hueco null → 5 puntos.
    assert.equal(p.series.length, 5, `serie tiene ${p.series.length} puntos`)
  })

  // ── 4. parseGeneration ───────────────────────────────────────────────────
  await test('parseGeneration · fuentes (excluye Load/share/consumos) + % renovable', () => {
    const g = parseGeneration('es', publicPowerFixtureES())
    assert.equal(g.country, 'es')
    assert.equal(g.label, 'España')
    assert.equal(g.load_mw, 24448, 'demanda del último instante')
    assert.equal(g.renewable_share_pct, 77.3, 'share de generación de la API')
    assert.equal(g.renewable_share_of_load_pct, 95.0)
    // Las fuentes de consumo, Load, Residual load, trading y shares NO aparecen.
    const names = g.sources.map((s) => s.name)
    assert.ok(!names.includes('Load'), 'Load no debe estar en el mix')
    assert.ok(!names.includes('Residual load'), 'Residual load fuera')
    assert.ok(!names.includes('Cross border electricity trading'), 'trading fuera')
    assert.ok(!names.some((n) => /consumption/i.test(n)), 'consumos fuera')
    assert.ok(!names.some((n) => /share/i.test(n)), 'shares fuera')
    // Solar es la mayor fuente.
    assert.equal(g.sources[0].name, 'Solar')
    // Total = Nuclear+Gas+Solar+Wind+Hydro RoR+Oil = 4008+2680+19828+1488+744+8 = 28756
    assert.equal(g.total_generation_mw, 28756, `total=${g.total_generation_mw}`)
    // share Solar ≈ 19828/28756 = 68.95%
    assert.equal(g.sources[0].share_pct, 69.0, `solar share=${g.sources[0].share_pct}`)
    // shares suman ~100 (±1 por redondeo).
    const sum = g.sources.reduce((s, x) => s + x.share_pct, 0)
    assert.ok(Math.abs(sum - 100) <= 1.5, `shares suman ${sum}`)
  })

  // ── 5. parseCrossBorder ──────────────────────────────────────────────────
  await test('parseCrossBorder · GW→MW + dirección por signo + saldo "sum"', () => {
    const cb = parseCrossBorder('es', cbpfFixtureES())
    assert.equal(cb.country, 'es')
    assert.equal(cb.label, 'España')
    // "sum" no aparece como vecino, pero alimenta net_balance.
    const neigh = cb.neighbours.map((n) => n.neighbour)
    assert.deepEqual(neigh.sort(), ['France', 'Portugal'])
    // Portugal: -3.211 GW → -3211 MW · ES exporta → "ES → Portugal".
    const pt = cb.neighbours.find((n) => n.neighbour === 'Portugal')!
    assert.equal(pt.net_mw, -3211, `PT net=${pt.net_mw}`)
    assert.equal(pt.direction, 'ES → Portugal')
    // France: +1.993 GW → 1993 MW · ES importa → "France → ES".
    const fr = cb.neighbours.find((n) => n.neighbour === 'France')!
    assert.equal(fr.net_mw, 1993, `FR net=${fr.net_mw}`)
    assert.equal(fr.direction, 'France → ES')
    // saldo "sum": -1.218 GW → -1218 MW.
    assert.equal(cb.net_balance_mw, -1218, `saldo=${cb.net_balance_mw}`)
    // Orden por magnitud: PT (3211) antes que FR (1993).
    assert.equal(cb.neighbours[0].neighbour, 'Portugal')
  })

  // ── 6. fetchEuPrices · SECUENCIAL, ok + degradación parcial ──────────────
  await test('fetchEuPrices · varias zonas SECUENCIAL (ok + zona que falla se omite)', async () => {
    _clearEnergyChartsCache()
    installFetch((path) => {
      if (path.includes('bzn=ES')) return { body: priceFixtureES() }
      if (path.includes('bzn=FR')) return { body: priceFixtureFR() }
      if (path.includes('bzn=DE-LU')) return { status: 500, body: null } // falla
      return { status: 404, body: null }
    })
    const res = await fetchEuPrices(['ES', 'FR', 'DE-LU'])
    assert.equal(res.ok, true, 'ok porque ES y FR respondieron')
    assert.equal(res.data!.length, 2, 'DE-LU se omite (degradación parcial)')
    assert.deepEqual(res.data!.map((p) => p.zone).sort(), ['ES', 'FR'])
    assert.match(res.source_url ?? '', /energy-charts/)
  })

  // ── 7. fetch-fail (red caída) → {ok:false} sin lanzar ────────────────────
  await test('fetchEuGeneration · red caída → {ok:false} sin lanzar', async () => {
    _clearEnergyChartsCache()
    installFetch(() => ({ throwErr: true }))
    const res = await fetchEuGeneration('es')
    assert.equal(res.ok, false)
    assert.ok(res.error && res.error.length > 0, 'error presente')
    assert.ok(!('data' in res) || res.data === undefined, 'sin data')
  })

  // ── 8. rate-limit 429 → {ok:false, error rate_limited} ───────────────────
  await test('fetchCrossBorderFlows · 429 → {ok:false} con error rate_limited', async () => {
    _clearEnergyChartsCache()
    installFetch(() => ({ status: 429, body: null }))
    const res = await fetchCrossBorderFlows('es')
    assert.equal(res.ok, false)
    assert.match(res.error ?? '', /rate_limited/, `error=${res.error}`)
  })

  // ── 9. caché: 2ª llamada idéntica NO refetch ─────────────────────────────
  await test('caché · 2ª llamada idéntica NO vuelve a la red', async () => {
    _clearEnergyChartsCache()
    let calls = 0
    installFetch((path) => {
      calls++
      if (path.includes('country=es') && path.includes('public_power')) return { body: publicPowerFixtureES() }
      return { status: 404, body: null }
    })
    const a = await fetchEuGeneration('es')
    const b = await fetchEuGeneration('es')
    assert.equal(a.ok, true)
    assert.equal(b.ok, true)
    assert.equal(calls, 1, `esperaba 1 fetch (caché), hubo ${calls}`)
    assert.equal(b.data!.total_generation_mw, a.data!.total_generation_mw)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
