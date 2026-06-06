/**
 * Turismo v3 · Sprint T2-cross · Tests cruceros (lib/turismo/cruceros.ts).
 *
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/cruceros.test.ts
 *
 * Cubre:
 *   1. enrichCruisePorts cruza con catálogo Puertos (slug + coords) solo ES
 *   2. enrichCruisePorts sin coincidencia → port_slug hint o null
 *   3. buildCrucerosData ordena desc + total + source
 *   4. fetchCruceros (import dinámico ports-handlers) → OK + catálogo datado
 *   5. catálogo CRUCEROS_PUERTOS · Barcelona el mayor + shape
 */
import assert from 'node:assert/strict'
import {
  fetchCruceros,
  enrichCruisePorts,
  buildCrucerosData,
  CRUCEROS_PUERTOS,
  CRUCEROS_ANIO_REF,
  _clearCrucerosCache,
} from '../../../lib/turismo/cruceros.ts'

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
  console.log('\nlib/turismo/cruceros.ts\n')

  await test('enrichCruisePorts cruza con Puertos ES', () => {
    const curated = [
      { puerto: 'Barcelona', pasajeros_crucero: 3000, source: 'catalog' as const },
      { puerto: 'Cádiz', pasajeros_crucero: 500, source: 'catalog' as const },
    ]
    const ports = [
      { slug: 'barcelona', name: 'Barcelona', lat: 41.34, lon: 2.16, country_iso: 'ES' },
      { slug: 'rotterdam', name: 'Rotterdam', lat: 51.9, lon: 4.4, country_iso: 'NL' },
    ]
    const { puertos, cruzados } = enrichCruisePorts(curated, ports)
    assert.equal(cruzados, 1)
    const bcn = puertos.find((p) => p.puerto === 'Barcelona')!
    assert.equal(bcn.port_slug, 'barcelona')
    assert.equal(bcn.lat, 41.34)
    assert.equal(bcn.source, 'ports+catalog')
    // Cádiz no está en ports-seed → port_slug null
    const cad = puertos.find((p) => p.puerto === 'Cádiz')!
    assert.equal(cad.port_slug, null)
    assert.equal(cad.source, 'catalog')
  })

  await test('enrichCruisePorts ignora puertos no-ES', () => {
    const curated = [{ puerto: 'Valencia', pasajeros_crucero: 480, source: 'catalog' as const }]
    // Valencia con country_iso erróneo (no ES) → no se cruza
    const ports = [{ slug: 'valencia', name: 'Valencia', lat: 39.4, lon: -0.3, country_iso: 'IT' }]
    const { cruzados } = enrichCruisePorts(curated, ports)
    assert.equal(cruzados, 0)
  })

  await test('buildCrucerosData ordena desc + total', () => {
    const data = buildCrucerosData(
      [
        { puerto: 'A', pasajeros_crucero: 100, source: 'catalog' },
        { puerto: 'B', pasajeros_crucero: 300, source: 'ports+catalog' },
      ],
      { anio_ref: 2024, cruzados: 1, nota: 'x' },
    )
    assert.equal(data.puertos[0].puerto, 'B')
    assert.equal(data.total_pasajeros, 400)
    assert.equal(data.source, 'ports+catalog') // hay al menos uno cruzado
    assert.equal(data.cruzados_con_puertos, 1)
  })

  await test('fetchCruceros → OK + catálogo datado', async () => {
    _clearCrucerosCache()
    const r = await fetchCruceros({ limit: 6 })
    assert.equal(r.ok, true)
    assert.ok(r.data)
    assert.equal(r.data!.anio_ref, CRUCEROS_ANIO_REF)
    assert.equal(r.data!.puertos.length, 6)
    assert.ok((r.data!.total_pasajeros ?? 0) > 0)
    // Barcelona debe ser el primero (mayor tráfico de crucero)
    assert.equal(r.data!.puertos[0].puerto, 'Barcelona')
  })

  await test('CRUCEROS_PUERTOS · shape válido', () => {
    assert.ok(CRUCEROS_PUERTOS.length >= 10, 'pocos puertos')
    for (const p of CRUCEROS_PUERTOS) {
      assert.equal(typeof p.puerto, 'string')
      assert.ok(p.pasajeros_crucero == null || typeof p.pasajeros_crucero === 'number')
      assert.equal(p.source, 'catalog')
    }
    const bcn = CRUCEROS_PUERTOS.find((p) => p.puerto === 'Barcelona')!
    assert.ok(bcn.pasajeros_crucero! > 2_000_000, 'Barcelona debería superar 2M')
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
