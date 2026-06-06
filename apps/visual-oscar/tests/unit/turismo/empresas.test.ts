/**
 * Turismo v3 · Sprint T2-cross · Tests empresas (lib/turismo/empresas.ts).
 *
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/empresas.test.ts
 *
 * Cubre:
 *   1. mapFinnhubQuote · OK (c+dp), no disponible (c=0/error)
 *   2. filterCompanies por segmento
 *   3. fetchEmpresas sin FINNHUB_API_KEY → shape exacto, todas available:false
 *   4. EMPRESAS_TURISMO · MEL/AMS/IAG/AENA/EDR presentes con tickers .MC
 *   5. el shape de cada empresa cumple el contrato exacto
 */
import assert from 'node:assert/strict'
import {
  fetchEmpresas,
  mapFinnhubQuote,
  filterCompanies,
  unavailableQuote,
  EMPRESAS_TURISMO,
  _clearEmpresasCache,
} from '../../../lib/turismo/empresas.ts'

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
    console.error(e)
  }
}

async function run() {
  console.log('\nlib/turismo/empresas.ts\n')

  await test('mapFinnhubQuote OK y degradado', () => {
    const ok = mapFinnhubQuote({ c: 7.42, dp: 1.2 })
    assert.equal(ok.available, true)
    assert.equal(ok.price, 7.42)
    assert.equal(ok.change_percent, 1.2)

    const zero = mapFinnhubQuote({ c: 0, dp: 0 })
    assert.equal(zero.available, false)
    assert.equal(zero.price, null)

    const err = mapFinnhubQuote({ error: 'rate' })
    assert.equal(err.available, false)

    const empty = mapFinnhubQuote(null)
    assert.equal(empty.available, false)
  })

  await test('unavailableQuote shape', () => {
    const q = unavailableQuote()
    assert.equal(q.price, null)
    assert.equal(q.change_percent, null)
    assert.equal(q.available, false)
  })

  await test('filterCompanies por segmento', () => {
    const hoteleras = filterCompanies(EMPRESAS_TURISMO, ['hotelera'])
    assert.ok(hoteleras.length >= 1)
    assert.ok(hoteleras.every((c) => c.segmento === 'hotelera'))
    const todas = filterCompanies(EMPRESAS_TURISMO)
    assert.equal(todas.length, EMPRESAS_TURISMO.length)
  })

  await test('fetchEmpresas sin key → shape exacto, all unavailable', async () => {
    delete process.env.FINNHUB_API_KEY
    _clearEmpresasCache()
    const r = await fetchEmpresas({ segmentos: ['hotelera', 'aerolinea'] })
    assert.ok(Array.isArray(r.empresas))
    assert.ok(r.empresas.length >= 2)
    for (const e of r.empresas) {
      // Contrato exacto del shape:
      assert.equal(typeof e.slug, 'string')
      assert.equal(typeof e.nombre, 'string')
      assert.ok(e.ticker === null || typeof e.ticker === 'string')
      assert.ok(['hotelera', 'aerolinea', 'gds', 'aeropuertos', 'ota', 'turoperador'].includes(e.segmento))
      assert.equal(typeof e.quote, 'object')
      assert.ok('price' in e.quote && 'change_percent' in e.quote && 'available' in e.quote)
      assert.equal(e.quote.available, false) // sin key → no disponible
      assert.equal(e.quote.price, null)
    }
  })

  await test('EMPRESAS_TURISMO · MEL/AMS/IAG/AENA/EDR presentes', () => {
    const bySlug = new Map(EMPRESAS_TURISMO.map((c) => [c.slug, c]))
    assert.equal(bySlug.get('melia')?.ticker, 'MEL.MC')
    assert.equal(bySlug.get('amadeus')?.ticker, 'AMS.MC')
    assert.equal(bySlug.get('iag')?.ticker, 'IAG.MC')
    assert.equal(bySlug.get('aena')?.ticker, 'AENA.MC')
    assert.equal(bySlug.get('edreams')?.ticker, 'EDR.MC')
    // segmentos correctos
    assert.equal(bySlug.get('aena')?.segmento, 'aeropuertos')
    assert.equal(bySlug.get('amadeus')?.segmento, 'gds')
    // hay al menos un segmento de cada tipo principal
    const segs = new Set(EMPRESAS_TURISMO.map((c) => c.segmento))
    for (const s of ['hotelera', 'aerolinea', 'gds', 'aeropuertos', 'ota', 'turoperador']) {
      assert.ok(segs.has(s as any), `falta segmento ${s}`)
    }
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
