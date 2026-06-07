/**
 * Sprint Energía S1 · Tests para los catálogos curados de energía.
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo —
 * ver tests/unit/medios/canonical/scoring/momentum.test.ts). Se ejecuta con
 * Node 22+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/catalog.test.ts
 *
 * Valida shape + counts de los catálogos:
 *   - REACTORES_ES: 7 reactores, potencia 900-1200 MW, conexión 1980-1990.
 *   - CAPACIDAD_RENOVABLE_ES: no vacío, capacidad_mw > 0.
 *   - PNIEC_2030: no vacío.
 *   - EMPRESAS_ENERGIA: ≥ 20, ticker no vacío + ≥1 energía; ≥8 españolas.
 *   - Cada energia[] de empresas está en el union EnergiaTipo válido.
 */
import assert from 'node:assert/strict'
import {
  REACTORES_ES,
  CAPACIDAD_RENOVABLE_ES,
  PNIEC_2030,
  EMPRESAS_ENERGIA,
} from '../../../lib/energia/catalog.ts'
import type { EnergiaTipo } from '../../../lib/energia/types.ts'

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

const ENERGIA_TIPOS: EnergiaTipo[] = [
  'global',
  'electrico',
  'renovables',
  'nuclear',
  'petroleo',
  'gas',
  'hidrogeno',
]

async function run() {
  console.log('\n→ energia · catalog')

  // ─── REACTORES_ES ─────────────────────────────────────────────────
  await test('REACTORES_ES tiene exactamente 7 reactores', () => {
    assert.equal(REACTORES_ES.length, 7, `esperado 7, obtenido ${REACTORES_ES.length}`)
  })

  await test('cada reactor: potencia 900-1200 MW · conexión 1980-1990', () => {
    for (const r of REACTORES_ES) {
      assert.ok(
        r.potencia_mw > 900 && r.potencia_mw < 1200,
        `${r.nombre}: potencia ${r.potencia_mw} fuera de (900, 1200)`,
      )
      assert.ok(
        r.ano_conexion >= 1980 && r.ano_conexion <= 1990,
        `${r.nombre}: año conexión ${r.ano_conexion} fuera de [1980, 1990]`,
      )
    }
  })

  await test('cada reactor: propietarios no vacío + estado válido', () => {
    for (const r of REACTORES_ES) {
      assert.ok(
        Array.isArray(r.propietarios) && r.propietarios.length > 0,
        `${r.nombre}: sin propietarios`,
      )
      assert.ok(
        ['operativo', 'parada', 'cerrado'].includes(r.estado),
        `${r.nombre}: estado inválido ${r.estado}`,
      )
    }
  })

  // ─── CAPACIDAD_RENOVABLE_ES ───────────────────────────────────────
  await test('CAPACIDAD_RENOVABLE_ES no vacío · capacidad_mw > 0', () => {
    assert.ok(CAPACIDAD_RENOVABLE_ES.length > 0, 'catálogo renovable vacío')
    for (const c of CAPACIDAD_RENOVABLE_ES) {
      assert.ok(c.capacidad_mw > 0, `${c.tecnologia}: capacidad ${c.capacidad_mw} no > 0`)
    }
  })

  // ─── PNIEC_2030 ───────────────────────────────────────────────────
  await test('PNIEC_2030 no vacío', () => {
    assert.ok(PNIEC_2030.length > 0, 'PNIEC_2030 vacío')
  })

  // ─── EMPRESAS_ENERGIA ─────────────────────────────────────────────
  await test('EMPRESAS_ENERGIA ≥ 20 empresas', () => {
    assert.ok(
      EMPRESAS_ENERGIA.length >= 20,
      `esperado ≥ 20, obtenido ${EMPRESAS_ENERGIA.length}`,
    )
  })

  await test('cada empresa: ticker no vacío + al menos una energía', () => {
    for (const e of EMPRESAS_ENERGIA) {
      // Excepción documentada: las privadas (Cepsa, EDF) no cotizan y por
      // tanto no tienen ticker. El resto debe tener ticker no vacío.
      const esPrivada = e.exchange.toLowerCase().includes('privada')
      if (!esPrivada) {
        assert.ok(
          typeof e.ticker === 'string' && e.ticker.length > 0,
          `${e.nombre}: ticker vacío (exchange=${e.exchange})`,
        )
      }
      assert.ok(
        Array.isArray(e.energias) && e.energias.length >= 1,
        `${e.nombre}: sin energias[]`,
      )
    }
  })

  await test('al menos 8 empresas son españolas', () => {
    const espanolas = EMPRESAS_ENERGIA.filter(e => e.es_espanola).length
    assert.ok(espanolas >= 8, `esperado ≥ 8 españolas, obtenido ${espanolas}`)
  })

  await test('cada energia[] de empresas está en el union EnergiaTipo válido', () => {
    for (const e of EMPRESAS_ENERGIA) {
      for (const en of e.energias) {
        assert.ok(
          ENERGIA_TIPOS.includes(en),
          `${e.nombre}: energía inválida "${en}"`,
        )
      }
    }
  })

  await test('slugs de empresa son únicos', () => {
    const slugs = EMPRESAS_ENERGIA.map(e => e.slug)
    const unicos = new Set(slugs)
    assert.equal(unicos.size, slugs.length, 'hay slugs de empresa duplicados')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
