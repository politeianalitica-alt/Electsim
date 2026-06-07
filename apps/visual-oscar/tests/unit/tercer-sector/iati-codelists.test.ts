/**
 * Tercer Sector v3 · TS2-iati · Tests del cliente IATI Codelists
 * (lib/tercer-sector/iati-codelists.ts).
 *
 * NO depende de vitest/jest (patrón tests/unit/energia/*). Ejecutar:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/tercer-sector/iati-codelists.test.ts
 *
 * Mock de `globalThis.fetch` con FIXTURES del shape REAL (verificado 2026-06-07):
 *   { data: [ { code, name, category?, description? } ] }.
 *
 * Cubre:
 *   1. parseCodelist puro · {data:[...]} y array pelado + filas inválidas
 *   2. buildCodelists puro · counts coherentes
 *   3. resolveSectorName / resolveCountryName · fallback al código
 *   4. fetch · ok con ambas listas + caché (2ª llamada no refetch)
 *   5. degradación parcial · una lista cae → sirve la otra
 *   6. degradación total · ambas caen → ok:false (sin cachear)
 */
import assert from 'node:assert/strict'
import {
  parseCodelist,
  buildCodelists,
  resolveSectorName,
  resolveCountryName,
  fetchCodelists,
  _clearCodelistsCache,
} from '../../../lib/tercer-sector/iati-codelists.ts'

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

// ── Fixtures (shape REAL) ───────────────────────────────────────────────────
function sectorFixture() {
  return {
    data: [
      { code: '11110', category: '111', name: 'Education policy and administrative management' },
      { code: '12220', category: '122', name: 'Basic health care' },
      { code: '', name: 'fila inválida sin code' },
    ],
  }
}
function countryFixture() {
  return {
    data: [
      { code: 'AF', name: 'Afghanistan' },
      { code: 'ET', name: 'Ethiopia' },
      { code: 'ES', name: 'Spain' },
    ],
  }
}

// Mock de fetch configurable por path (Sector.json / Country.json).
function installFetch(
  handler: (path: string) => { status?: number; body?: unknown; throwErr?: boolean },
) {
  ;(globalThis as { fetch: unknown }).fetch = async (url: string) => {
    const path = String(url)
    const r = handler(path)
    if (r.throwErr) throw new Error('network down')
    const status = r.status ?? 200
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => r.body,
    } as unknown as Response
  }
}

async function run() {
  console.log('\n→ tercer-sector · iati-codelists\n')

  // ── 1. parseCodelist puro ─────────────────────────────────────────────────
  await test('parseCodelist · {data:[...]}, array pelado, descarta filas sin code', () => {
    const m = parseCodelist(sectorFixture())
    assert.equal(Object.keys(m).length, 2, 'la fila sin code se descarta')
    assert.equal(m['11110'].name, 'Education policy and administrative management')
    assert.equal(m['11110'].category, '111')
    // Array pelado (sin envoltorio data).
    const m2 = parseCodelist([{ code: 'ES', name: 'Spain' }])
    assert.equal(m2['ES'].name, 'Spain')
    // Entradas inválidas → mapa vacío, sin lanzar.
    assert.deepEqual(parseCodelist(null), {})
    assert.deepEqual(parseCodelist({ data: 'no-array' }), {})
    // code sin name → name cae al code.
    const m3 = parseCodelist([{ code: '99999' }])
    assert.equal(m3['99999'].name, '99999')
  })

  // ── 2. buildCodelists puro ────────────────────────────────────────────────
  await test('buildCodelists · counts coherentes con los mapas', () => {
    const d = buildCodelists(sectorFixture(), countryFixture())
    assert.equal(d.counts.sectors, 2)
    assert.equal(d.counts.countries, 3)
    assert.equal(Object.keys(d.sectors).length, d.counts.sectors)
    assert.equal(Object.keys(d.countries).length, d.counts.countries)
  })

  // ── 3. resolvers ──────────────────────────────────────────────────────────
  await test('resolveSectorName / resolveCountryName · resuelven y caen al código', () => {
    const d = buildCodelists(sectorFixture(), countryFixture())
    assert.equal(resolveSectorName(d, '12220'), 'Basic health care')
    assert.equal(resolveSectorName(d, '00000'), '00000') // fallback
    assert.equal(resolveCountryName(d, 'et'), 'Ethiopia') // case-insensitive
    assert.equal(resolveCountryName(d, 'ZZ'), 'ZZ') // fallback en mayúsculas
    // Sin codelists → devuelve el propio código.
    assert.equal(resolveSectorName(null, '12220'), '12220')
    assert.equal(resolveCountryName(null, 'es'), 'ES')
  })

  // ── 4. fetch ok + caché ───────────────────────────────────────────────────
  await test('fetch · ok con ambas listas + 2ª llamada usa caché', async () => {
    _clearCodelistsCache()
    let calls = 0
    installFetch((path) => {
      calls++
      if (/Sector\.json/.test(path)) return { body: sectorFixture() }
      if (/Country\.json/.test(path)) return { body: countryFixture() }
      return { status: 404, body: null }
    })
    const r1 = await fetchCodelists()
    assert.equal(r1.ok, true)
    assert.equal(r1.data!.counts.sectors, 2)
    assert.equal(r1.data!.counts.countries, 3)
    assert.equal(calls, 2, 'una descarga por lista')
    const r2 = await fetchCodelists()
    assert.equal(r2.ok, true)
    assert.equal(calls, 2, 'la 2ª llamada NO refetchea (caché)')
  })

  // ── 5. degradación parcial ────────────────────────────────────────────────
  await test('degradación parcial · Sector cae, Country sirve → ok con sectors vacío', async () => {
    _clearCodelistsCache()
    installFetch((path) => {
      if (/Sector\.json/.test(path)) return { status: 500, body: null }
      if (/Country\.json/.test(path)) return { body: countryFixture() }
      return { status: 404, body: null }
    })
    const r = await fetchCodelists()
    assert.equal(r.ok, true, 'sigue ok si al menos una lista carga')
    assert.equal(r.data!.counts.sectors, 0)
    assert.equal(r.data!.counts.countries, 3)
  })

  // ── 6. degradación total ──────────────────────────────────────────────────
  await test('degradación total · ambas caen → ok:false y NO cachea', async () => {
    _clearCodelistsCache()
    let calls = 0
    installFetch(() => {
      calls++
      return { throwErr: true }
    })
    const r = await fetchCodelists()
    assert.equal(r.ok, false)
    assert.equal(r.data, null)
    assert.match(r.error ?? '', /unreachable/)
    // Como no cachea el fallo, una 2ª llamada vuelve a intentar (más fetches).
    const before = calls
    await fetchCodelists()
    assert.ok(calls > before, 'el fallo total no se cachea')
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
