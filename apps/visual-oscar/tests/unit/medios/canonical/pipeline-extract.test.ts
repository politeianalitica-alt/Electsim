/**
 * Sprint 0+1 · Task 3 · Tests para extract-entities (índice + word boundary +
 * contextRequired + co-referencia).
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *       tests/unit/medios/canonical/pipeline-extract.test.ts
 */
import assert from 'node:assert/strict'
import {
  loadEntityCatalog,
  _resetCatalogCache,
} from '../../../../lib/medios/canonical/catalogs.ts'
import {
  buildAliasIndex,
  extractEntities,
} from '../../../../lib/medios/canonical/extract-entities.ts'
import type { Entity } from '../../../../lib/medios/canonical/types.ts'

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
    if ((e as Error).stack)
      console.error(
        '    ',
        (e as Error).stack!.split('\n').slice(1, 3).join('\n     '),
      )
  }
}

async function main() {
  _resetCatalogCache()
  const entities: Entity[] = await loadEntityCatalog()
  const index = buildAliasIndex(entities)

  console.log('\n→ Pipeline · extract-entities')

  await test('"Pedro Sánchez" en título → pedro-sanchez conf ≥ 0.95', () => {
    const r = extractEntities(
      'Pedro Sánchez anuncia nueva ley',
      'El presidente del Gobierno presentó',
      entities,
      index,
    )
    const ps = r.find(
      (e) => e.entityId === 'pedro-sanchez' && e.alias === 'Pedro Sánchez',
    )
    assert.ok(ps, 'esperaba match Pedro Sánchez directo')
    assert.ok(
      ps!.confidence >= 0.95,
      `esperaba confidence ≥ 0.95, encontré ${ps!.confidence}`,
    )
    assert.ok(
      ps!.position === 'title' || ps!.position === 'both',
      `position fue ${ps!.position}`,
    )
  })

  await test(
    '"Sánchez" SOLO sin contexto adicional → conf < 0.75 o no resuelve',
    () => {
      const r = extractEntities(
        'Sánchez visita Galicia',
        'En su gira por el norte',
        entities,
        index,
      )
      const ps = r.find(
        (e) => e.entityId === 'pedro-sanchez' && e.alias === 'Sánchez',
      )
      // Si resuelve (co-reference o context), la confianza debe ser baja por la ambigüedad
      if (ps) {
        assert.ok(
          ps.confidence < 0.75,
          `confidence ${ps.confidence} esperaba < 0.75 para alias ambiguo`,
        )
      }
    },
  )

  await test('"Moncloa" + contexto "gobierno" → pedro-sanchez via context', () => {
    const r = extractEntities(
      'Moncloa convoca al gobierno',
      'El ejecutivo se reúne',
      entities,
      index,
    )
    const ps = r.find(
      (e) => e.entityId === 'pedro-sanchez' && e.alias === 'Moncloa',
    )
    assert.ok(ps, 'esperaba Moncloa resuelto a pedro-sanchez')
    assert.equal(ps!.resolutionMethod, 'context')
  })

  await test(
    '"Govern" + contexto "cataluña" → generalitat-catalunya (no valenciana)',
    () => {
      const r = extractEntities(
        'El Govern aprueba decreto',
        'Cataluña promueve nueva ley con apoyo de junts',
        entities,
        index,
      )
      const gc = r.find((e) => e.entityId === 'generalitat-catalunya')
      assert.ok(gc, 'esperaba generalitat-catalunya')
    },
  )

  await test(
    'Co-reference: "Pedro Sánchez" en título + "el presidente" en desc → ≥1 match pedro-sanchez',
    () => {
      const r = extractEntities(
        'Pedro Sánchez visita Bruselas',
        'El presidente se reúne con líderes europeos',
        entities,
        index,
      )
      const matches = r.filter((e) => e.entityId === 'pedro-sanchez')
      assert.ok(
        matches.length >= 1,
        `esperaba ≥ 1 match pedro-sanchez, encontré ${matches.length}`,
      )
    },
  )

  await test(
    'Multi-entidad: "Pedro Sánchez y Feijóo en el Congreso" → 3 entidades distintas',
    () => {
      const r = extractEntities(
        'Pedro Sánchez y Feijóo se enfrentan en el Congreso',
        'Sesión de control en la Cámara',
        entities,
        index,
      )
      const ids = new Set(r.map((e) => e.entityId))
      assert.ok(ids.has('pedro-sanchez'), 'falta pedro-sanchez')
      assert.ok(ids.has('alberto-nunez-feijoo'), 'falta alberto-nunez-feijoo')
      assert.ok(ids.has('congreso-diputados'), 'falta congreso-diputados')
    },
  )

  console.log(`\n${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
