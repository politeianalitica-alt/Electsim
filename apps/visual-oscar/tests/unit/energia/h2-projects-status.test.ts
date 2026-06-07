/**
 * Energía v3 · E2-data · Tests del cliente estado proyectos H2
 * (lib/energia/h2-projects-status.ts).
 *
 * NO depende de vitest/jest (patrón tests/unit/energia/catalog.test.ts). Ejecutar:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/h2-projects-status.test.ts
 *
 * Sin red: enriquece el catálogo H2_PROYECTOS_ES con fase/revisión/fuente/coords.
 *
 * Cubre:
 *   1. fetch · proyectos enriquecidos ordenados por fase + por_fase coherente
 *   2. normalizeFase puro · operación/construcción/FID/desarrollo/planificado
 *   3. enrichH2Project puro · overlay (coords + fuente) vs inferencia
 *   4. buildH2Status puro · capacidad total + ultima_revision_global + estructura mapa
 */
import assert from 'node:assert/strict'
import {
  fetchH2Status,
  normalizeFase,
  enrichH2Project,
  buildH2Status,
  H2_FASE_ORDER,
  _clearH2StatusCache,
} from '../../../lib/energia/h2-projects-status.ts'

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
  console.log('\n→ energia · h2-projects-status')

  // ── 1. fetch ─────────────────────────────────────────────────────────────
  await test('fetch · proyectos enriquecidos ordenados por fase + por_fase coherente', async () => {
    _clearH2StatusCache()
    const r = await fetchH2Status()
    assert.equal(r.ok, true)
    const d = r.data!
    assert.equal(d.source, 'catalog')
    assert.ok(d.proyectos.length > 0)
    assert.equal(d.total_count, d.proyectos.length)
    // ordenados por madurez de fase descendente
    for (let i = 1; i < d.proyectos.length; i++) {
      assert.ok(
        H2_FASE_ORDER[d.proyectos[i - 1].fase] >= H2_FASE_ORDER[d.proyectos[i].fase],
        'proyectos no ordenados por fase desc',
      )
    }
    // por_fase suma = total
    const sum = Object.values(d.por_fase).reduce((a, b) => a + b, 0)
    assert.equal(sum, d.total_count)
    // cada proyecto trae los campos para mapa/timeline
    for (const p of d.proyectos) {
      assert.ok(typeof p.fase === 'string')
      assert.ok(typeof p.fase_label === 'string')
      assert.ok(typeof p.ultima_revision === 'string')
      assert.ok(/^https?:\/\//.test(p.fuente_url))
      assert.ok('lat' in p && 'lon' in p)
    }
  })

  // ── 2. normalizeFase puro ────────────────────────────────────────────────
  await test('normalizeFase · mapea estados textuales a fase canónica', () => {
    assert.equal(normalizeFase('en operación'), 'operacion')
    assert.equal(normalizeFase('en construcción'), 'construccion')
    assert.equal(normalizeFase('FID / en desarrollo'), 'fid') // FID gana sobre desarrollo
    assert.equal(normalizeFase('en desarrollo'), 'desarrollo')
    assert.equal(normalizeFase('planificado (infraestructura)'), 'planificado')
    assert.equal(normalizeFase(''), 'planificado') // default
  })

  // ── 3. enrichH2Project puro ──────────────────────────────────────────────
  await test('enrichH2Project · overlay (coords + fuente) vs inferencia', () => {
    // proyecto con overlay conocido
    const conOverlay = enrichH2Project({
      nombre: 'Planta de hidrógeno verde de Puertollano',
      promotor: 'Iberdrola',
      ubicacion: 'Puertollano (Ciudad Real)',
      capacidad_mw: 20,
      estado: 'en operación',
      horizonte: 2022,
    })
    assert.equal(conOverlay.enriched, true)
    assert.equal(conOverlay.fase, 'operacion')
    assert.ok(conOverlay.lat != null && conOverlay.lon != null)
    assert.ok(/iberdrola/i.test(conOverlay.fuente_url))
    assert.notEqual(conOverlay.ultima_revision, 'n/d')

    // proyecto sin overlay → inferencia, coords null, fuente por defecto
    const sinOverlay = enrichH2Project({
      nombre: 'Proyecto inventado XYZ',
      promotor: 'Test',
      ubicacion: 'Nowhere',
      capacidad_mw: 10,
      estado: 'en construcción',
      horizonte: 2030,
    })
    assert.equal(sinOverlay.enriched, false)
    assert.equal(sinOverlay.fase, 'construccion') // inferida del estado
    assert.equal(sinOverlay.lat, null)
    assert.equal(sinOverlay.ultima_revision, 'n/d')
  })

  // ── 4. buildH2Status puro ────────────────────────────────────────────────
  await test('buildH2Status · capacidad total + ultima_revision_global + counts', () => {
    const d = buildH2Status()
    assert.ok(d.capacidad_total_mw > 0)
    assert.ok(d.enriched_count > 0)
    assert.ok(d.enriched_count <= d.total_count)
    // ultima_revision_global es la fecha máxima entre los revisados
    if (d.ultima_revision_global) {
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(d.ultima_revision_global))
    }
    assert.ok(/curado/i.test(d.nota))
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
