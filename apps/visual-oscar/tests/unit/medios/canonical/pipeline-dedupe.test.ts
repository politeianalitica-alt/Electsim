/**
 * Sprint 0+1 · Task 3 · Tests para dedupe (exacta + titular + ventana 30min).
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *       tests/unit/medios/canonical/pipeline-dedupe.test.ts
 */
import assert from 'node:assert/strict'
import {
  isExactDuplicate,
  computeTitleHash,
  isTitleDuplicate,
} from '../../../../lib/medios/canonical/dedupe.ts'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
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

console.log('\n→ Pipeline · dedupe')

test('isExactDuplicate detecta id ya conocido', () => {
  const known = new Set(['abc123'])
  assert.equal(isExactDuplicate('abc123', known), true)
  assert.equal(isExactDuplicate('def456', known), false)
})

test('computeTitleHash normaliza lowercase + sin stopwords + 8 tokens', () => {
  // Casos con los mismos primeros 8 tokens significativos → mismo hash.
  // Diferencias permitidas: mayúsculas, palabras adicionales DESPUÉS del 8º
  // token significativo, stopwords intercaladas.
  const h1 = computeTitleHash(
    'Gobierno aprueba decreto sobre vivienda asequible jóvenes urbanos extra',
  )
  const h2 = computeTitleHash(
    'El GOBIERNO aprueba DECRETO sobre vivienda asequible para jóvenes urbanos extra',
  )
  // 8 tokens significativos: gobierno aprueba decreto vivienda asequible jóvenes urbanos extra
  assert.equal(h1, h2)
})

test('isTitleDuplicate detecta match en ventana 30min mismo source', () => {
  const recent = new Map<string, { id: string; sourceId: string; ts: string }>()
  const now = Date.now()
  recent.set('hash-X', {
    id: 'a1',
    sourceId: 'el-pais',
    ts: new Date(now - 10 * 60 * 1000).toISOString(),
  })
  assert.equal(isTitleDuplicate('hash-X', 'el-pais', recent, 30), true)
  assert.equal(isTitleDuplicate('hash-X', 'otro-medio', recent, 30), false)
  assert.equal(isTitleDuplicate('hash-Y', 'el-pais', recent, 30), false)
})

test('isTitleDuplicate ignora matches > 30min', () => {
  const recent = new Map<string, { id: string; sourceId: string; ts: string }>()
  const now = Date.now()
  recent.set('hash-X', {
    id: 'a1',
    sourceId: 'el-pais',
    ts: new Date(now - 60 * 60 * 1000).toISOString(),
  })
  assert.equal(isTitleDuplicate('hash-X', 'el-pais', recent, 30), false)
})

console.log(`\n${passed} passed · ${failed} failed`)
if (failed > 0) process.exit(1)
