/**
 * Sprint 2 C7 · Tests para `jobUnmappedTags`.
 *
 * El job lee `article.raw_tags` (JSONB) de las últimas 6h, filtra contra
 * `data/medios/rss-tag-map.json` y retorna el TOP 50 de tags no mapeados
 * ordenados por frecuencia descendente. Es seguro de ejecutar sin DB:
 * `withDb` cae al fallback ([] artículos) y entonces `unmapped` queda
 * vacío. Esto deja al test cubrir el shape y el cap.
 *
 * Estrategia de mock:
 *   - Para verificar la lógica de filtrado/conteo sin DB usamos
 *     `__withTestRawTags(stub, fn)` que inyecta directamente un array
 *     de raw_tags (uno por artículo) en lugar de leer Postgres. Patrón
 *     análogo a `__withTestStore` de snapshot-writer.ts.
 *
 * Ejecutar:
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/maintenance/unmapped-tags.test.ts
 */
import assert from 'node:assert/strict'
import {
  jobUnmappedTags,
  loadRssTagMapAsSet,
  __withTestRawTags,
} from '../../../../../lib/medios/canonical/maintenance/unmapped-tags.ts'

let passed = 0
let failed = 0

function test(name: string, fn: () => void | Promise<void>) {
  const start = async () => {
    try {
      await fn()
      passed++
      console.log(`  ✓ ${name}`)
    } catch (e) {
      failed++
      console.error(`  ✗ ${name}`)
      console.error('    ', (e as Error).message)
      if ((e as Error).stack)
        console.error(
          '    ',
          (e as Error).stack!.split('\n').slice(1, 3).join('\n     '),
        )
    }
  }
  return start()
}

async function run() {
  console.log('\n→ maintenance · unmapped-tags')

  await test('jobUnmappedTags devuelve UnmappedReport con shape correcto', async () => {
    const report = await jobUnmappedTags()
    assert.equal(typeof report.generated_at, 'string', 'generated_at debe ser ISO string')
    assert.ok(
      !Number.isNaN(Date.parse(report.generated_at)),
      'generated_at debe ser ISO válido',
    )
    assert.equal(typeof report.window_hours, 'number')
    assert.equal(report.window_hours, 6)
    assert.ok(Array.isArray(report.unmapped), 'unmapped debe ser array')
  })

  await test('loadRssTagMapAsSet carga el archivo y devuelve Set con mappings reales', async () => {
    const set = await loadRssTagMapAsSet()
    assert.ok(set instanceof Set, 'debe devolver un Set')
    // El archivo data/medios/rss-tag-map.json existe (Sprint 0+1) con
    // ~200 mappings. Verificamos algunas entradas conocidas.
    assert.ok(set.size > 0, `rss-tag-map.json debe tener mappings, encontrado ${set.size}`)
    // Estos rawTags están explícitamente en el catálogo (líneas iniciales
    // del JSON): 'política', 'congreso', 'psoe'. Comprobamos lowercase.
    assert.ok(set.has('política'), 'falta política en el set')
    assert.ok(set.has('congreso'), 'falta congreso en el set')
    assert.ok(set.has('psoe'), 'falta psoe en el set')
  })

  await test('filtrado: tags conocidos se excluyen, tags nuevos se cuentan ordenados', async () => {
    // Inyectamos 6 artículos con raw_tags. 'política' y 'psoe' están en el
    // catálogo → deben quedar fuera del report. 'tag-nuevo' aparece 3 veces,
    // 'otro-tag' 2 veces, 'rare' 1 vez → orden esperado por frecuencia
    // descendente.
    await __withTestRawTags(
      [
        ['política', 'tag-nuevo'],
        ['psoe', 'tag-nuevo', 'otro-tag'],
        ['tag-nuevo', 'otro-tag'],
        ['rare'],
        ['POLÍTICA'], // mismo tag, mayúscula → debe normalizar y quedar fuera
        [],
      ],
      async () => {
        const report = await jobUnmappedTags()
        // Esperamos exactamente 3 unmapped: tag-nuevo (3), otro-tag (2), rare (1)
        assert.equal(
          report.unmapped.length,
          3,
          `esperado 3 unmapped, obtenido ${report.unmapped.length}`,
        )
        assert.equal(report.unmapped[0].tag, 'tag-nuevo')
        assert.equal(report.unmapped[0].count, 3)
        assert.equal(report.unmapped[1].tag, 'otro-tag')
        assert.equal(report.unmapped[1].count, 2)
        assert.equal(report.unmapped[2].tag, 'rare')
        assert.equal(report.unmapped[2].count, 1)
      },
    )
  })

  await test('top N cap: unmapped.length ≤ 50 incluso con 200 tags distintos', async () => {
    // Generamos 200 tags únicos no mapeados (todos sufijo aleatorio).
    const articleTags: string[][] = []
    for (let i = 0; i < 200; i++) {
      articleTags.push([`x-test-tag-${i}`])
    }
    await __withTestRawTags(articleTags, async () => {
      const report = await jobUnmappedTags()
      assert.ok(
        report.unmapped.length <= 50,
        `unmapped.length=${report.unmapped.length} excede el cap 50`,
      )
      assert.equal(report.unmapped.length, 50, 'esperado exactamente 50 con 200 únicos')
    })
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
