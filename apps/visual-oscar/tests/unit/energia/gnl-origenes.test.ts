/**
 * Energía v3 · E2-data · Tests del cliente GNL orígenes
 * (lib/energia/gnl-origenes.ts).
 *
 * NO depende de vitest/jest (patrón tests/unit/energia/alsi.test.ts). Ejecutar:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/gnl-origenes.test.ts
 *
 * Mock de `globalThis.fetch` con el envelope ALSI (mismo shape que alsi.test.ts).
 * El cliente usa fetchLngStorage(country='es') para el estado vivo y combina con
 * el catálogo GNL_ESPANA (plantas + orígenes).
 *
 * Cubre:
 *   1. live · estado ALSI + terminales prorrateadas + orígenes catálogo
 *   2. prorrateaSendOut puro · cuotas suman ~100, El Musel (cap null) → null
 *   3. buildGnlOrigenes puro con live=null · orígenes presentes, vivo null
 *   4. key ausente · ok:false pero estructura/orígenes del catálogo presentes
 *   5. caché · 2ª llamada NO refetch
 */
import assert from 'node:assert/strict'
import {
  fetchGnlOrigenes,
  prorrateaSendOut,
  buildGnlOrigenes,
  _clearGnlOrigenesCache,
} from '../../../lib/energia/gnl-origenes.ts'
import { _clearAlsiCache } from '../../../lib/energia/alsi.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
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

// ─── FIXTURE ALSI ES (shape real · valores STRING) ────────────────────────────
function esAlsiFixture() {
  return {
    last_page: 0,
    total: 1,
    data: [
      {
        name: 'Spain',
        code: 'ES',
        gasDayStart: '2026-06-04',
        inventory: { lng: '2586.14', gwh: '17400.7' },
        sendOut: '482.7',
        dtmi: { lng: '3446.5', gwh: '23189.58' },
        status: 'C',
      },
    ],
  }
}

const realFetch = globalThis.fetch
let fetchCalls = 0

function installFetchMock() {
  fetchCalls = 0
  globalThis.fetch = (async () => {
    fetchCalls++
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => esAlsiFixture(),
    } as any
  }) as any
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

async function run() {
  console.log('\n→ energia · gnl-origenes')

  // ── 1. live ──────────────────────────────────────────────────────────────
  await test('live · estado ALSI + terminales prorrateadas + orígenes catálogo', async () => {
    process.env.GIE_API_KEY = 'test-key'
    _clearGnlOrigenesCache()
    _clearAlsiCache()
    installFetchMock()
    const r = await fetchGnlOrigenes()
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    // estado vivo
    assert.equal(d.send_out_total_gwh, 482.7)
    assert.equal(d.inventory_gwh, 17400.7)
    assert.equal(d.updated_at, '2026-06-04')
    assert.ok(d.fullness_pct != null && Math.abs(d.fullness_pct - 75.04) < 0.1)
    // terminales del catálogo
    assert.ok(d.terminales.length >= 6)
    const bcn = d.terminales.find((t) => t.nombre === 'Barcelona')
    assert.ok(bcn && bcn.send_out_estimado_gwh != null && bcn.send_out_estimado_gwh > 0)
    // orígenes catálogo
    assert.ok(d.origenes.length > 0)
    assert.ok(/CORES|Enag/i.test(d.nota_origenes))
  })

  // ── 2. prorrateaSendOut puro ─────────────────────────────────────────────
  await test('prorrateaSendOut · cuotas ~100, El Musel (cap null) → null', () => {
    const terms = prorrateaSendOut(1000)
    // suma de cuotas de las plantas con capacidad ≈ 100
    const cuotaSum = terms.reduce((acc, t) => acc + (t.cuota_capacidad_pct ?? 0), 0)
    assert.ok(Math.abs(cuotaSum - 100) < 0.5, `cuotas suman ${cuotaSum}, esperaba ~100`)
    // El Musel tiene emision_gwh_dia null → estimado/cuota null
    const musel = terms.find((t) => t.nombre === 'El Musel')
    assert.ok(musel)
    assert.equal(musel!.send_out_estimado_gwh, null)
    assert.equal(musel!.cuota_capacidad_pct, null)
    // send-out estimado total (plantas con cap) ≈ 1000
    const sendSum = terms.reduce((acc, t) => acc + (t.send_out_estimado_gwh ?? 0), 0)
    assert.ok(Math.abs(sendSum - 1000) < 5, `send-out reparte ${sendSum}, esperaba ~1000`)
    // sendOutTotal null → estimados null pero cuotas presentes
    const terms2 = prorrateaSendOut(null)
    assert.equal(terms2.find((t) => t.nombre === 'Barcelona')!.send_out_estimado_gwh, null)
    assert.ok(terms2.find((t) => t.nombre === 'Barcelona')!.cuota_capacidad_pct! > 0)
  })

  // ── 3. buildGnlOrigenes puro con live=null ───────────────────────────────
  await test('buildGnlOrigenes(null) · orígenes presentes, vivo null', () => {
    const d = buildGnlOrigenes(null)
    assert.equal(d.fullness_pct, null)
    assert.equal(d.send_out_total_gwh, null)
    assert.ok(d.origenes.length > 0)
    assert.ok(d.terminales.length >= 6)
    // sin send-out vivo, los estimados son null
    assert.ok(d.terminales.every((t) => t.send_out_estimado_gwh === null))
  })

  // ── 4. key ausente ───────────────────────────────────────────────────────
  await test('key ausente · ok:false pero estructura/orígenes catálogo presentes', async () => {
    delete process.env.GIE_API_KEY
    _clearGnlOrigenesCache()
    _clearAlsiCache()
    installFetchMock()
    const r = await fetchGnlOrigenes()
    const calls = fetchCalls
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /no_key|GIE_API_KEY/)
    assert.equal(calls, 0, 'no debió tocar la red sin key')
    // aun así devolvemos estructura + orígenes
    assert.ok(r.data)
    assert.ok(r.data!.origenes.length > 0)
    assert.equal(r.data!.send_out_total_gwh, null)
  })

  // ── 5. caché ─────────────────────────────────────────────────────────────
  await test('caché · 2ª llamada NO refetch', async () => {
    process.env.GIE_API_KEY = 'test-key'
    _clearGnlOrigenesCache()
    _clearAlsiCache()
    installFetchMock()
    await fetchGnlOrigenes()
    const after1 = fetchCalls
    await fetchGnlOrigenes()
    const after2 = fetchCalls
    restoreFetch()
    assert.equal(after1, 1)
    assert.equal(after2, 1, `2ª llamada no debió refetch, total=${after2}`)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
