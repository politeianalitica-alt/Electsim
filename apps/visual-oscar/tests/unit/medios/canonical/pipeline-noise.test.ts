/**
 * Sprint 0+1 · Task 3 · Tests para noise-filter (7 reglas spec §Paso 4).
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *       tests/unit/medios/canonical/pipeline-noise.test.ts
 */
import assert from 'node:assert/strict'
import { detectNoise } from '../../../../lib/medios/canonical/noise-filter.ts'

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

console.log('\n→ Pipeline · noise-filter · 7 reglas spec §Paso 4')

test('título < 5 palabras → noise', () => {
  const r = detectNoise({ title: 'Tres palabras solo', description: 'Algo' })
  assert.equal(r.isNoise, true)
  assert.ok(r.reason?.includes('title_too_short'))
})

test('título solo números → noise', () => {
  assert.equal(detectNoise({ title: '12345 67890 99', description: 'x' }).isNoise, true)
})

test('horóscopo → noise', () => {
  assert.equal(
    detectNoise({
      title: 'Horóscopo de hoy para Aries Tauro Géminis',
      description: 'predicciones astrológicas variadas',
    }).isNoise,
    true,
  )
})

test('receta → noise', () => {
  assert.equal(
    detectNoise({
      title: 'Receta de la abuela: tortilla de patatas perfecta',
      description: 'ingredientes y pasos detallados',
    }).isNoise,
    true,
  )
})

test('publicidad explícita → noise', () => {
  assert.equal(
    detectNoise({
      title: 'Patrocinado: las mejores ofertas del Black Friday',
      description: 'descuentos en productos varios',
    }).isNoise,
    true,
  )
})

test('descripción vacía o igual al título → noise', () => {
  const same = 'Mismo texto en título y descripción aquí'
  assert.equal(detectNoise({ title: same, description: same }).isNoise, true)
  assert.equal(
    detectNoise({
      title: 'Título normal pero desc vacía aquí',
      description: '',
    }).isNoise,
    true,
  )
})

test('artículo político normal → no noise', () => {
  const r = detectNoise({
    title: 'Pedro Sánchez convoca elecciones generales para junio',
    description:
      'El Presidente anuncia el adelanto electoral en una intervención sorpresa',
  })
  assert.equal(r.isNoise, false)
  assert.equal(r.reason, null)
})

console.log(`\n${passed} passed · ${failed} failed`)
if (failed > 0) process.exit(1)
