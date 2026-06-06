/**
 * Energía v3 · E2-data · Tests del cliente potencia instalada REE
 * (lib/energia/renovables-capacity.ts).
 *
 * NO depende de vitest/jest (mismo patrón que tests/unit/energia/agsi.test.ts).
 * Se ejecuta con Node:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/renovables-capacity.test.ts
 *
 * Mock de `globalThis.fetch` con FIXTURE del shape JSON-API de REE
 * `generacion/potencia-instalada` (mismo `included[].attributes.values[]` que
 * usa lib/sources/ree.ts para estructura-generacion).
 *
 * Cubre:
 *   1. live · parsea included[] → tecnologías ordenadas por MW desc + source 'live'
 *   2. fallback · REE 500 (HTML/no JSON) → catálogo, source 'catalog', ok:true
 *   3. parseReeCapacity puro · ignora composite, ordena, último valor
 *   4. buildCapacityFromCatalog puro · solo renovables, total coherente
 *   5. caché · 2ª llamada idéntica NO refetch
 *   6. forceCatalog · sin red, source 'catalog'
 */
import assert from 'node:assert/strict'
import {
  fetchRenovablesCapacity,
  parseReeCapacity,
  buildCapacityFromCatalog,
  _clearRenovablesCapacityCache,
} from '../../../lib/energia/renovables-capacity.ts'

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

// ─── FIXTURE (shape JSON-API REE potencia-instalada) ──────────────────────────
function reeFixture() {
  return {
    data: { type: 'Potencia instalada', id: 'pi1', attributes: { title: 'Potencia instalada' } },
    included: [
      {
        type: 'Eólica',
        id: '74',
        attributes: {
          title: 'Eólica',
          type: 'Renovable',
          values: [{ value: 31200.5, datetime: '2024-01-01T00:00:00.000+01:00', percentage: 0.25 }],
        },
      },
      {
        type: 'Solar fotovoltaica',
        id: '75',
        attributes: {
          title: 'Solar fotovoltaica',
          type: 'Renovable',
          values: [{ value: 28500, datetime: '2024-01-01T00:00:00.000+01:00' }],
        },
      },
      {
        type: 'Ciclo combinado',
        id: '76',
        attributes: {
          title: 'Ciclo combinado',
          type: 'No renovable',
          values: [{ value: 26000, datetime: '2024-01-01T00:00:00.000+01:00' }],
        },
      },
      {
        // serie agregada → debe ignorarse
        type: 'Generación total',
        id: '99',
        attributes: {
          title: 'Total',
          composite: true,
          values: [{ value: 120000, datetime: '2024-01-01T00:00:00.000+01:00' }],
        },
      },
    ],
  }
}

const realFetch = globalThis.fetch
let fetchCalls = 0

function installFetchMock(opts: { json?: any; contentType?: string; ok?: boolean; status?: number } = {}) {
  fetchCalls = 0
  globalThis.fetch = (async () => {
    fetchCalls++
    return {
      ok: opts.ok ?? true,
      status: opts.status ?? 200,
      statusText: 'OK',
      headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? (opts.contentType ?? 'application/json') : null) },
      json: async () => opts.json ?? {},
    } as any
  }) as any
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

async function run() {
  console.log('\n→ energia · renovables-capacity (REE potencia instalada)')

  // ── 1. live ──────────────────────────────────────────────────────────────
  await test('live · parsea included[] → tecnologías por MW desc + source live', async () => {
    _clearRenovablesCapacityCache()
    installFetchMock({ json: reeFixture() })
    const r = await fetchRenovablesCapacity({ year: 2024 })
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.source, 'live')
    // 3 tecnologías (el agregado composite se ignora)
    assert.equal(d.tecnologias.length, 3)
    // ordenadas por MW desc → Eólica primero
    assert.equal(d.tecnologias[0].tecnologia, 'Eólica')
    assert.equal(d.tecnologias[0].capacidad_mw, 31200.5)
    // total renovable = eólica + solar (no el ciclo combinado)
    assert.equal(d.total_renovable_mw, Math.round(31200.5 + 28500))
    assert.equal(d.total_mw, Math.round(31200.5 + 28500 + 26000))
  })

  // ── 2. fallback (REE devuelve HTML/500) ──────────────────────────────────
  await test('fallback · REE no-JSON → catálogo, source catalog, ok:true', async () => {
    _clearRenovablesCapacityCache()
    installFetchMock({ contentType: 'text/html', json: {} })
    const r = await fetchRenovablesCapacity({ year: 2024 })
    restoreFetch()

    assert.equal(r.ok, true) // hay dato (catálogo)
    assert.equal(r.data!.source, 'catalog')
    assert.ok(r.data!.tecnologias.length > 0)
    assert.match(r.error ?? '', /ree/i)
    // el catálogo solo trae renovables
    assert.equal(r.data!.total_mw, r.data!.total_renovable_mw)
  })

  // ── 3. parseReeCapacity puro ─────────────────────────────────────────────
  await test('parseReeCapacity · ignora composite, ordena desc, último valor', () => {
    const techs = parseReeCapacity(reeFixture().included)
    assert.equal(techs.length, 3)
    assert.ok(techs[0].capacidad_mw! >= techs[1].capacidad_mw!)
    assert.equal(techs[0].fecha, '2024-01-01')
    // entrada vacía/no-array → []
    assert.deepEqual(parseReeCapacity(null), [])
    assert.deepEqual(parseReeCapacity([{ attributes: { title: '', values: [] } }]), [])
  })

  // ── 4. buildCapacityFromCatalog puro ─────────────────────────────────────
  await test('buildCapacityFromCatalog · solo renovables + total coherente', () => {
    const d = buildCapacityFromCatalog('test')
    assert.equal(d.source, 'catalog')
    assert.ok(d.tecnologias.length > 0)
    assert.ok(d.total_mw && d.total_mw > 0)
    assert.equal(d.total_mw, d.total_renovable_mw)
    assert.ok(d.nota && d.nota.includes('test'))
  })

  // ── 5. caché ─────────────────────────────────────────────────────────────
  await test('caché · 2ª llamada idéntica NO refetch', async () => {
    _clearRenovablesCapacityCache()
    installFetchMock({ json: reeFixture() })
    await fetchRenovablesCapacity({ year: 2024 })
    const after1 = fetchCalls
    await fetchRenovablesCapacity({ year: 2024 })
    const after2 = fetchCalls
    restoreFetch()
    assert.equal(after1, 1)
    assert.equal(after2, 1, `2ª llamada no debió refetch, total=${after2}`)
  })

  // ── 6. forceCatalog (sin red) ────────────────────────────────────────────
  await test('forceCatalog · sin tocar la red, source catalog', async () => {
    _clearRenovablesCapacityCache()
    installFetchMock({ json: reeFixture() })
    const r = await fetchRenovablesCapacity({ forceCatalog: true })
    const calls = fetchCalls
    restoreFetch()
    assert.equal(r.ok, true)
    assert.equal(r.data!.source, 'catalog')
    assert.equal(calls, 0, 'no debió llamar a fetch con forceCatalog')
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
