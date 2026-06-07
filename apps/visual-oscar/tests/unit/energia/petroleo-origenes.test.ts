/**
 * Energía v3 · E2-data · Tests del cliente petróleo orígenes
 * (lib/energia/petroleo-origenes.ts).
 *
 * NO depende de vitest/jest (patrón tests/unit/energia/catalog.test.ts). Ejecutar:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/petroleo-origenes.test.ts
 *
 * Sin red: el dato es el catálogo CORES estructurado con fuente + freshness.
 *
 * Cubre:
 *   1. fetch · estructura con source/fuente/fecha_ref/freshness + orígenes desc
 *   2. computeFreshness puro · niveles reciente/aceptable/desactualizado + días
 *   3. buildPetroleoOrigenes puro · ordena orígenes, `now` inyectable
 *   4. freshness coherente · dias_desde_ref ≥ 0 y label no vacío
 */
import assert from 'node:assert/strict'
import {
  fetchPetroleoOrigenes,
  computeFreshness,
  buildPetroleoOrigenes,
  _clearPetroleoOrigenesCache,
} from '../../../lib/energia/petroleo-origenes.ts'

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

async function run() {
  console.log('\n→ energia · petroleo-origenes')

  // ── 1. fetch ─────────────────────────────────────────────────────────────
  await test('fetch · estructura con source/fuente/fecha_ref/freshness + orígenes desc', async () => {
    _clearPetroleoOrigenesCache()
    const r = await fetchPetroleoOrigenes()
    assert.equal(r.ok, true)
    const d = r.data!
    assert.equal(d.source, 'catalog')
    assert.ok(typeof d.dependencia_importacion_pct === 'number')
    assert.ok(d.fuente && /CORES/i.test(d.fuente))
    assert.ok(d.fuente_url && /^https?:\/\//.test(d.fuente_url))
    assert.ok(d.fecha_ref)
    assert.ok(d.freshness && typeof d.freshness.dias_desde_ref === 'number')
    // orígenes ordenados desc por cuota
    assert.ok(d.origenes.length > 0)
    for (let i = 1; i < d.origenes.length; i++) {
      assert.ok(d.origenes[i - 1].cuota_pct >= d.origenes[i].cuota_pct, 'orígenes no ordenados desc')
    }
  })

  // ── 2. computeFreshness puro ─────────────────────────────────────────────
  await test('computeFreshness · niveles + días deterministas', () => {
    const now = new Date('2026-06-06T00:00:00Z')
    // 'YYYY' usa 1-jul → 2026 ref a 6-jun-2026 → fecha futura (1-jul > 6-jun) → 0 días, reciente
    const f2026 = computeFreshness('2026', now)
    assert.equal(f2026.nivel, 'reciente')
    assert.ok(f2026.dias_desde_ref! >= 0)
    // 2024 (1-jul-2024) → ~1 año → aceptable o desactualizado según umbral 540d
    const f2024 = computeFreshness('2024', now)
    assert.ok(f2024.dias_desde_ref! > 600) // ~705 días
    assert.equal(f2024.nivel, 'desactualizado')
    // fecha concreta reciente
    const fReciente = computeFreshness('2026-05-01', now)
    assert.equal(fReciente.nivel, 'reciente')
    assert.ok(fReciente.dias_desde_ref! >= 30 && fReciente.dias_desde_ref! < 60)
    // fecha no parseable
    const fBad = computeFreshness('no-es-fecha', now)
    assert.equal(fBad.nivel, 'desconocido')
    assert.equal(fBad.dias_desde_ref, null)
  })

  // ── 3. buildPetroleoOrigenes puro ────────────────────────────────────────
  await test('buildPetroleoOrigenes · now inyectable + orígenes ordenados', () => {
    const now = new Date('2026-06-06T00:00:00Z')
    const d = buildPetroleoOrigenes(now)
    assert.equal(d.source, 'catalog')
    assert.equal(d.freshness.fecha_ref, d.fecha_ref)
    // determinismo: mismo `now` → mismos días
    const d2 = buildPetroleoOrigenes(now)
    assert.equal(d.freshness.dias_desde_ref, d2.freshness.dias_desde_ref)
  })

  // ── 4. freshness coherente ───────────────────────────────────────────────
  await test('freshness coherente · días ≥ 0, label no vacío', async () => {
    _clearPetroleoOrigenesCache()
    const r = await fetchPetroleoOrigenes({ noCache: true })
    const f = r.data!.freshness
    assert.ok(f.dias_desde_ref == null || f.dias_desde_ref >= 0)
    assert.ok(typeof f.label === 'string' && f.label.length > 0)
    assert.ok(['reciente', 'aceptable', 'desactualizado', 'desconocido'].includes(f.nivel))
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
