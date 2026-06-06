/**
 * Turismo v3 · Sprint T2-cross · Tests destinos (lib/turismo/destinos.ts +
 * lib/turismo/destinos-catalog.ts).
 *
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/destinos.test.ts
 *
 * Cubre:
 *   1. catálogo ≥30 destinos · shape válido + tipos cubiertos
 *   2. nightsByCcaaFromEurostat extrae último periodo por NUTS2 (vía parseJsonStat)
 *   3. enrichDestinos marca live + inyecta pernoctaciones por ccaa_iso
 *   4. filterDestinosByTipo filtra por tipo
 *   5. fetchDestinos NUNCA lanza · degrada a catálogo (live=false) si Eurostat falla
 */
import assert from 'node:assert/strict'
import {
  fetchDestinos,
  nightsByCcaaFromEurostat,
  enrichDestinos,
  filterDestinosByTipo,
  _clearDestinosCache,
} from '../../../lib/turismo/destinos.ts'
import {
  DESTINOS,
  ccaasEnCatalogo,
  destinosPorTipo,
} from '../../../lib/turismo/destinos-catalog.ts'

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
  console.log('\nlib/turismo/destinos.ts + destinos-catalog.ts\n')

  await test('catálogo ≥30 destinos · shape válido', () => {
    assert.ok(DESTINOS.length >= 30, `solo ${DESTINOS.length} destinos (mínimo 30)`)
    const slugs = new Set<string>()
    for (const d of DESTINOS) {
      assert.match(d.slug, /^[a-z0-9-]+$/, `slug inválido: ${d.slug}`)
      assert.ok(!slugs.has(d.slug), `slug duplicado: ${d.slug}`)
      slugs.add(d.slug)
      assert.equal(typeof d.nombre, 'string')
      assert.match(d.ccaa_iso, /^ES\d{2}$/, `ccaa_iso inválido: ${d.ccaa_iso}`)
      assert.ok(Array.isArray(d.tipo) && d.tipo.length >= 1)
      assert.ok(typeof d.lat === 'number' && d.lat > 27 && d.lat < 44, `lat fuera de ES: ${d.lat}`)
      assert.ok(typeof d.lon === 'number' && d.lon > -19 && d.lon < 5, `lon fuera de ES: ${d.lon}`)
      assert.equal(typeof d.fuente, 'string')
      assert.match(d.fecha_ref, /^\d{4}/)
    }
  })

  await test('catálogo cubre tipos diversos (costa/isla/rural/esqui/cultural)', () => {
    for (const tipo of ['costa', 'isla', 'rural', 'esqui', 'cultural', 'ciudad']) {
      assert.ok(destinosPorTipo(tipo as any).length >= 1, `falta tipo ${tipo}`)
    }
    // varias CCAA representadas
    assert.ok(ccaasEnCatalogo().length >= 10, 'pocas CCAA en el catálogo')
  })

  await test('nightsByCcaaFromEurostat extrae último periodo por NUTS2', () => {
    // JSON-stat: geo (2 regiones) x time (2 periodos)
    const json = {
      value: { 0: 100, 1: 200, 2: 300, 3: 400 },
      id: ['geo', 'time'],
      size: [2, 2],
      dimension: {
        geo: { category: { index: { ES61: 0, ES51: 1 }, label: {} } },
        time: { category: { index: { '2022': 0, '2023': 1 }, label: {} } },
      },
    }
    const m = nightsByCcaaFromEurostat(json)
    // ES61: índices 0(2022)=100, 1(2023)=200 → último 2023=200
    assert.equal(m['ES61'].value, 200)
    assert.equal(m['ES61'].period, '2023')
    assert.equal(m['ES51'].value, 400)
  })

  await test('enrichDestinos marca live + inyecta pernoctaciones', () => {
    const catalog = [
      { slug: 'a', nombre: 'A', ccaa: 'Andalucía', ccaa_iso: 'ES61', tipo: ['costa'] as any, lat: 36, lon: -5, fuente: 'f', fecha_ref: '2026' },
      { slug: 'b', nombre: 'B', ccaa: 'Aragón', ccaa_iso: 'ES24', tipo: ['rural'] as any, lat: 41, lon: -1, fuente: 'f', fecha_ref: '2026' },
    ]
    const nights = { ES61: { value: 12345, period: '2023' } }
    const { destinos, n_live } = enrichDestinos(catalog, nights)
    assert.equal(n_live, 1)
    const a = destinos.find((d) => d.slug === 'a')!
    assert.equal(a.live, true)
    assert.equal(a.pernoctaciones_ccaa, 12345)
    const b = destinos.find((d) => d.slug === 'b')!
    assert.equal(b.live, false)
    assert.equal(b.pernoctaciones_ccaa, null)
  })

  await test('filterDestinosByTipo filtra', () => {
    const enriched = enrichDestinos(DESTINOS, {}).destinos
    const islas = filterDestinosByTipo(enriched, 'isla')
    assert.ok(islas.length >= 1)
    assert.ok(islas.every((d) => d.tipo.includes('isla')))
  })

  await test('fetchDestinos NUNCA lanza · devuelve catálogo aun degradado', async () => {
    _clearDestinosCache()
    // timeout 1ms fuerza fallo de Eurostat → degradación a catálogo.
    const r = await fetchDestinos({ timeoutMs: 1 })
    assert.equal(r.ok, true)
    assert.ok(r.data)
    assert.equal(r.data!.n_total, DESTINOS.length)
    // Sin fuente viva → todos catálogo (live=false), source unavailable.
    assert.equal(r.data!.pernoctaciones_source, 'unavailable')
    assert.equal(r.data!.n_live, 0)
    assert.ok(r.data!.destinos.every((d) => d.live === false))
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
