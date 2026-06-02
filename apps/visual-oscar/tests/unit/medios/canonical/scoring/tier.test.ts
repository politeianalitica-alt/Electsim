/**
 * Sprint 2 C4 · Tests para computeTierWeight(distribution, mediosConfig).
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/scoring/tier.test.ts
 *
 * Schema awareness (design Sprint 2 §4.4):
 *   weight(medio) = 0.6 · credibilidad + 0.4 · (establishment ? 1 : 0)
 *
 * Cubre 3 escenarios:
 *   1. 100% medios establecidos (credibilidad=0.9, establishment=true)
 *      → weight=0.6·0.9 + 0.4·1 = 0.94 → score > 0.85
 *   2. 100% medios bajos (credibilidad=0.3, establishment=false)
 *      → weight=0.6·0.3 + 0.4·0 = 0.18 → score < 0.25
 *   3. Medio no encontrado en config → fallback weight 0.5
 */
import assert from 'node:assert/strict'
import {
  computeTierWeight,
} from '../../../../../lib/medios/canonical/scoring/tier.ts'
import type { SourceCount } from '../../../../../lib/medios/canonical/scoring/diversity.ts'
import type { MedioConfig } from '../../../../../lib/medios/canonical/stores/medios-config-store.ts'

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
  console.log('\n→ scoring · computeTierWeight')

  // ─── Caso 1: medios establecidos de alta credibilidad ─────────────────
  await test(
    '100% medios establecidos (cred=0.9, establishment=true) · score > 0.85',
    () => {
      // weight = 0.6·0.9 + 0.4·1 = 0.54 + 0.4 = 0.94
      const distribution: SourceCount[] = [
        { source_id: 'elpais', count: 20 },
        { source_id: 'elmundo', count: 15 },
      ]
      const config: MedioConfig[] = [
        {
          clave: 'elpais',
          nombre: 'El País',
          tendencia: 'centro-izquierda',
          establishment: true,
          credibilidad: 0.9,
        },
        {
          clave: 'elmundo',
          nombre: 'El Mundo',
          tendencia: 'centro-derecha',
          establishment: true,
          credibilidad: 0.9,
        },
      ]
      const score = computeTierWeight(distribution, config)
      assert.ok(score > 0.85, `esperado > 0.85, obtenido ${score}`)
      assert.ok(score <= 1, `esperado ≤ 1, obtenido ${score}`)
    },
  )

  // ─── Caso 2: medios marginales de baja credibilidad ────────────────────
  await test(
    '100% medios bajos (cred=0.3, establishment=false) · score < 0.25',
    () => {
      // weight = 0.6·0.3 + 0.4·0 = 0.18
      const distribution: SourceCount[] = [
        { source_id: 'panfleto_a', count: 10 },
        { source_id: 'panfleto_b', count: 5 },
      ]
      const config: MedioConfig[] = [
        {
          clave: 'panfleto_a',
          nombre: 'Panfleto A',
          tendencia: 'desinformación',
          establishment: false,
          credibilidad: 0.3,
        },
        {
          clave: 'panfleto_b',
          nombre: 'Panfleto B',
          tendencia: 'desinformación',
          establishment: false,
          credibilidad: 0.3,
        },
      ]
      const score = computeTierWeight(distribution, config)
      assert.ok(score < 0.25, `esperado < 0.25, obtenido ${score}`)
      assert.ok(score >= 0, `esperado ≥ 0, obtenido ${score}`)
    },
  )

  // ─── Caso 3: medio fuera del config → fallback weight 0.5 ─────────────
  await test('medio no encontrado en config · weight default 0.5', () => {
    // Todos los medios desconocidos → weight = 0.5 para cada uno
    // → score = (0.5·10 + 0.5·5) / 15 = 0.5
    const distribution: SourceCount[] = [
      { source_id: 'medio_random_1', count: 10 },
      { source_id: 'medio_random_2', count: 5 },
    ]
    const config: MedioConfig[] = [] // catálogo vacío
    const score = computeTierWeight(distribution, config)
    // Margen pequeño por aritmética float
    assert.ok(
      Math.abs(score - 0.5) < 1e-9,
      `esperado ≈ 0.5, obtenido ${score}`,
    )
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
