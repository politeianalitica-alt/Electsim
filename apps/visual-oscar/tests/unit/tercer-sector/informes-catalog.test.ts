/**
 * Tercer Sector · Sprint TS-Cockpit W1d · Tests de la biblioteca de informes
 * (lib/tercer-sector/informes-catalog.ts).
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo — ver
 * tests/unit/tercer-sector/iati-enriched.test.ts). Puro, sin red. Se ejecuta con
 * Node 24+ con soporte nativo de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/tercer-sector/informes-catalog.test.ts
 *
 * Cubre:
 *   1. catálogo ≥25 informes
 *   2. todos con url + entidad + año (+ título + resumen + utilidad)
 *   3. URLs http(s) bien formadas + ids únicos
 *   4. ambito y tipo dentro del enum
 *   5. facetas (catalogTemas/catalogEntidades/catalogAnios) coherentes y ordenadas
 *   6. INFORME_BY_ID e INFORMES_COUNT consistentes
 *   7. cobertura de fuentes clave del spec (EAPN/AROPE, FOESSA, INE, Eurostat, etc.)
 */
import assert from 'node:assert/strict'
import {
  INFORMES,
  INFORME_BY_ID,
  INFORMES_COUNT,
  catalogTemas,
  catalogEntidades,
  catalogAnios,
  catalogAmbitos,
  catalogTipos,
  type InformeTS,
} from '../../../lib/tercer-sector/informes-catalog.ts'

let passed = 0
let failed = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${(e as Error)?.message ?? e}`)
  }
}

const AMBITOS = new Set(['espana', 'ccaa', 'ue', 'global'])
const TIPOS = new Set(['informe', 'dataset', 'memoria', 'estadistica', 'normativa'])

function run(): void {
  console.log('\n→ tercer-sector · informes-catalog\n')

  // ── 1. tamaño del catálogo ───────────────────────────────────────────────
  test('catálogo tiene al menos 25 informes', () => {
    assert.ok(INFORMES.length >= 25, `esperado >=25, obtenido ${INFORMES.length}`)
    assert.equal(INFORMES_COUNT, INFORMES.length)
  })

  // ── 2. campos obligatorios en cada entrada ───────────────────────────────
  test('todos los informes tienen url + entidad + año (+ campos núcleo)', () => {
    for (const i of INFORMES) {
      assert.ok(typeof i.id === 'string' && i.id.length > 0, `id vacío: ${JSON.stringify(i)}`)
      assert.ok(typeof i.titulo === 'string' && i.titulo.length > 0, `titulo vacío en ${i.id}`)
      assert.ok(typeof i.entidad === 'string' && i.entidad.length > 0, `entidad vacía en ${i.id}`)
      assert.ok(Number.isInteger(i.anio), `anio no entero en ${i.id}`)
      assert.ok(i.anio >= 2015 && i.anio <= 2026, `anio fuera de rango en ${i.id}: ${i.anio}`)
      assert.ok(typeof i.url === 'string' && i.url.length > 0, `url vacía en ${i.id}`)
      assert.ok(typeof i.resumen === 'string' && i.resumen.length > 0, `resumen vacío en ${i.id}`)
      assert.ok(
        typeof i.utilidad_analista === 'string' && i.utilidad_analista.length > 0,
        `utilidad_analista vacía en ${i.id}`,
      )
      assert.ok(Array.isArray(i.temas) && i.temas.length > 0, `temas vacíos en ${i.id}`)
    }
  })

  // ── 3. URLs válidas + ids únicos ─────────────────────────────────────────
  test('todas las URLs son http(s) válidas y parseables', () => {
    for (const i of INFORMES) {
      assert.ok(/^https?:\/\//.test(i.url), `url no http(s) en ${i.id}: ${i.url}`)
      assert.doesNotThrow(() => new URL(i.url), `url no parseable en ${i.id}: ${i.url}`)
    }
  })

  test('ids son únicos', () => {
    const ids = INFORMES.map((i) => i.id)
    assert.equal(new Set(ids).size, ids.length, 'hay ids duplicados')
  })

  // ── 4. enums válidos ─────────────────────────────────────────────────────
  test('ambito y tipo están dentro del enum', () => {
    for (const i of INFORMES) {
      assert.ok(AMBITOS.has(i.ambito), `ambito inválido en ${i.id}: ${i.ambito}`)
      assert.ok(TIPOS.has(i.tipo), `tipo inválido en ${i.id}: ${i.tipo}`)
    }
  })

  // ── 5. facetas ───────────────────────────────────────────────────────────
  test('catalogTemas: deduplicado, ordenado y cubre todos los temas usados', () => {
    const temas = catalogTemas()
    assert.equal(new Set(temas).size, temas.length, 'temas duplicados')
    const sorted = [...temas].sort()
    assert.deepEqual(temas, sorted, 'temas no ordenados')
    const usados = Array.from(new Set(INFORMES.flatMap((i: InformeTS) => i.temas)))
    for (const t of usados) assert.ok(temas.includes(t), `falta tema en facetas: ${t}`)
  })

  test('catalogEntidades: deduplicado, ordenado y cubre todas las entidades', () => {
    const ents = catalogEntidades()
    assert.equal(new Set(ents).size, ents.length, 'entidades duplicadas')
    const sorted = [...ents].sort()
    assert.deepEqual(ents, sorted, 'entidades no ordenadas')
    const usadas = new Set(INFORMES.map((i) => i.entidad))
    assert.equal(ents.length, usadas.size)
  })

  test('catalogAnios: deduplicado, descendente, cubre todos los años', () => {
    const anios = catalogAnios()
    assert.equal(new Set(anios).size, anios.length, 'años duplicados')
    for (let k = 1; k < anios.length; k++) {
      assert.ok(anios[k - 1] >= anios[k], 'años no ordenados descendentemente')
    }
    const usados = new Set(INFORMES.map((i) => i.anio))
    assert.equal(anios.length, usados.size)
  })

  test('catalogAmbitos y catalogTipos devuelven solo valores presentes y válidos', () => {
    for (const a of catalogAmbitos()) assert.ok(AMBITOS.has(a))
    for (const t of catalogTipos()) assert.ok(TIPOS.has(t))
    const ambPresentes = new Set(INFORMES.map((i) => i.ambito))
    assert.equal(catalogAmbitos().length, ambPresentes.size)
  })

  // ── 6. índice por id ─────────────────────────────────────────────────────
  test('INFORME_BY_ID resuelve cada id al objeto correcto', () => {
    assert.equal(Object.keys(INFORME_BY_ID).length, INFORMES.length)
    for (const i of INFORMES) {
      assert.equal(INFORME_BY_ID[i.id]?.titulo, i.titulo)
    }
  })

  // ── 7. cobertura de fuentes clave del spec ───────────────────────────────
  test('cubre las fuentes clave exigidas por el spec', () => {
    const ents = catalogEntidades().join(' | ').toLowerCase()
    const must = [
      'plataforma del tercer sector',
      'eapn',
      'foessa',
      'plataforma del voluntariado',
      'fundación lealtad',
      'coordinadora de ongd',
      'cepes',
      'ine',
      'eurostat',
      'ocde',
    ]
    for (const m of must) assert.ok(ents.includes(m), `falta fuente clave: ${m}`)
    // AROPE (EAPN) presente como tema o título.
    const hayArope = INFORMES.some(
      (i) => i.temas.includes('arope') || /arope/i.test(i.titulo),
    )
    assert.ok(hayArope, 'falta el informe AROPE / EAPN')
    // mdsocialesa2030 (IRPF 0,7% / estrategia) presente.
    const hayMd = INFORMES.some((i) => /mdsocialesa2030\.gob\.es/.test(i.url))
    assert.ok(hayMd, 'falta referencia a mdsocialesa2030 (IRPF 0,7% / estrategia)')
  })

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed · ${failed} failed (${INFORMES.length} informes)\n`)
  if (failed > 0) process.exit(1)
}

run()
