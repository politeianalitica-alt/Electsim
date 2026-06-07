/**
 * Turismo v3 · Sprint T2-cross · Tests del cliente AENA (lib/turismo/aena.ts).
 *
 * NO depende de vitest/jest (mismo patrón que tests/unit/energia/*). Se ejecuta:
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/aena.test.ts
 *
 * Cubre:
 *   1. parseAenaNum tolera miles europeos / coma / "-"
 *   2. normIata valida 3 letras
 *   3. parseAenaCsv mapea cabeceras flexibles (; y ,)
 *   4. buildAenaResponse ordena desc + total + limit
 *   5. fetchAena sin CSV → catálogo curado (siempre OK), datado 2024
 *   6. catálogo AENA_AEROPUERTOS · shape válido + MAD el mayor
 */
import assert from 'node:assert/strict'
import {
  fetchAena,
  parseAenaNum,
  normIata,
  parseAenaCsv,
  buildAenaResponse,
  AENA_AEROPUERTOS,
  AENA_ANIO_REF,
  _clearAenaCache,
} from '../../../lib/turismo/aena.ts'

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
  console.log('\nlib/turismo/aena.ts\n')

  await test('parseAenaNum tolera formatos', () => {
    assert.equal(parseAenaNum('1.234.567'), 1234567)
    assert.equal(parseAenaNum('1.234.567,89'), 1234567.89)
    assert.equal(parseAenaNum('66141000'), 66141000)
    assert.equal(parseAenaNum('12,5'), 12.5)
    assert.equal(parseAenaNum('-'), null)
    assert.equal(parseAenaNum(''), null)
    assert.equal(parseAenaNum(42), 42)
  })

  await test('normIata valida 3 letras', () => {
    assert.equal(normIata('mad'), 'MAD')
    assert.equal(normIata(' BCN '), 'BCN')
    assert.equal(normIata('MADRID'), '')
    assert.equal(normIata(''), '')
  })

  await test('parseAenaCsv mapea cabeceras flexibles', () => {
    const csv = [
      'IATA;Aeropuerto;Pasajeros',
      'MAD;Madrid-Barajas;66.141.000',
      'BCN;Barcelona-El Prat;55.039.000',
    ].join('\n')
    const rows = parseAenaCsv(csv)
    assert.equal(rows.length, 2)
    assert.equal(rows[0].codigo, 'MAD')
    assert.equal(rows[0].pasajeros, 66141000)
    assert.equal(rows[0].source, 'live')
  })

  await test('parseAenaCsv con coma y cabeceras inglesas', () => {
    const csv = ['code,name,passengers', 'PMI,Palma,33303000'].join('\n')
    const rows = parseAenaCsv(csv)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].codigo, 'PMI')
    assert.equal(rows[0].pasajeros, 33303000)
  })

  await test('parseAenaCsv sin columna pasajeros → []', () => {
    assert.deepEqual(parseAenaCsv('iata;nombre\nMAD;Madrid'), [])
    assert.deepEqual(parseAenaCsv(''), [])
  })

  await test('buildAenaResponse ordena desc + total + limit', () => {
    const data = buildAenaResponse(
      [
        { codigo: 'A', aeropuerto: 'A', pasajeros: 100, source: 'catalog' },
        { codigo: 'B', aeropuerto: 'B', pasajeros: 300, source: 'catalog' },
        { codigo: 'C', aeropuerto: 'C', pasajeros: 200, source: 'catalog' },
      ],
      { anio_ref: 2024, source: 'catalog', nota: 'x', limit: 2 },
    )
    assert.equal(data.aeropuertos.length, 2)
    assert.equal(data.aeropuertos[0].codigo, 'B') // mayor primero
    assert.equal(data.total_pasajeros, 500) // 300 + 200 (limit 2)
  })

  await test('fetchAena sin CSV → catálogo curado (OK + datado)', async () => {
    delete process.env.AENA_TRAFFIC_CSV_URL
    _clearAenaCache()
    const r = await fetchAena({ limit: 5 })
    assert.equal(r.ok, true)
    assert.ok(r.data)
    assert.equal(r.data!.source, 'catalog')
    assert.equal(r.data!.anio_ref, AENA_ANIO_REF)
    assert.equal(r.data!.aeropuertos.length, 5)
    // ordenado desc → el primero es el de más pasajeros (MAD)
    assert.equal(r.data!.aeropuertos[0].codigo, 'MAD')
    assert.ok((r.data!.total_pasajeros ?? 0) > 0)
  })

  await test('AENA_AEROPUERTOS · shape válido', () => {
    assert.ok(AENA_AEROPUERTOS.length >= 15, 'pocos aeropuertos')
    for (const a of AENA_AEROPUERTOS) {
      assert.match(a.codigo, /^[A-Z]{3}$/)
      assert.equal(typeof a.aeropuerto, 'string')
      assert.ok(a.pasajeros == null || typeof a.pasajeros === 'number')
      assert.equal(a.source, 'catalog')
    }
    const mad = AENA_AEROPUERTOS.find((a) => a.codigo === 'MAD')
    assert.ok(mad && (mad.pasajeros ?? 0) > 50_000_000, 'MAD debería superar 50M')
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
