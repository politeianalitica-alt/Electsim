/**
 * Turismo v3 · Sprint T2-cross · Tests estacionalidad (lib/turismo/estacionalidad.ts).
 *
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/estacionalidad.test.ts
 *
 * Cubre:
 *   1. parseAemetNum tolera "Ip"/coma/vacío
 *   2. tempByMonthFromAemet promedia por mes + descarta 'YYYY-13' (resumen anual)
 *   3. buildEstacionalidad calcula pico/valle/ratio + inyecta temp
 *   4. fetchEstacionalidad sin AEMET_API_KEY → índice OK, clima 'unavailable'
 *   5. INDICE_DEMANDA_MENSUAL · 12 meses, pico verano, media≈100
 */
import assert from 'node:assert/strict'
import {
  fetchEstacionalidad,
  parseAemetNum,
  tempByMonthFromAemet,
  buildEstacionalidad,
  INDICE_DEMANDA_MENSUAL,
  _clearEstacionalidadCache,
} from '../../../lib/turismo/estacionalidad.ts'

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
    console.error(e)
  }
}

async function run() {
  console.log('\nlib/turismo/estacionalidad.ts\n')

  await test('parseAemetNum tolera formatos AEMET', () => {
    assert.equal(parseAemetNum('15,3'), 15.3)
    assert.equal(parseAemetNum('22.5'), 22.5)
    assert.equal(parseAemetNum('Ip'), null)
    assert.equal(parseAemetNum(''), null)
    assert.equal(parseAemetNum(18), 18)
  })

  await test('tempByMonthFromAemet promedia + descarta resumen anual', () => {
    const items = [
      { fecha: '2022-7', tm_mes: '26,0' },
      { fecha: '2023-7', tm_mes: '28,0' },
      { fecha: '2023-1', tm_mes: '12,0' },
      { fecha: '2023-13', tm_mes: '18,0' }, // resumen anual → descartar
    ]
    const t = tempByMonthFromAemet(items)
    assert.equal(t[7], 27) // media de 26 y 28
    assert.equal(t[1], 12)
    // mes sin dato → null
    assert.equal(t[3], null)
  })

  await test('buildEstacionalidad pico/valle/ratio + temp', () => {
    const idx = [10, 20, 30, 40, 50, 60, 70, 65, 55, 45, 25, 15]
    const temps = { 7: 28 }
    const d = buildEstacionalidad(idx, temps, { ccaa_clima: 'AND', clima_source: 'aemet', nota: 'x' })
    assert.equal(d.meses.length, 12)
    assert.equal(d.pico.mes, 7) // 70 es el máximo
    assert.equal(d.pico.indice_turismo, 70)
    assert.equal(d.valle.mes, 1) // 10 es el mínimo
    assert.equal(d.ratio_pico_valle, 7) // 70/10
    assert.equal(d.meses[6].temp_media, 28) // julio tiene temp
    assert.equal(d.meses[0].temp_media, null) // enero no
    assert.equal(d.clima_source, 'aemet')
  })

  await test('fetchEstacionalidad sin AEMET → índice OK, clima unavailable', async () => {
    delete process.env.AEMET_API_KEY
    _clearEstacionalidadCache()
    const r = await fetchEstacionalidad({ ccaa: 'AND' })
    assert.equal(r.ok, true)
    assert.ok(r.data)
    assert.equal(r.data!.meses.length, 12)
    assert.equal(r.data!.clima_source, 'unavailable')
    // El pico debe caer en verano (jul=7 o ago=8)
    assert.ok([7, 8].includes(r.data!.pico.mes), `pico en mes ${r.data!.pico.mes}`)
    // Sin AEMET, todas las temperaturas son null
    assert.ok(r.data!.meses.every((m) => m.temp_media == null))
  })

  await test('INDICE_DEMANDA_MENSUAL · 12 meses, media≈100', () => {
    assert.equal(INDICE_DEMANDA_MENSUAL.length, 12)
    const sum = INDICE_DEMANDA_MENSUAL.reduce((s, x) => s + x, 0)
    const media = sum / 12
    assert.ok(Math.abs(media - 100) <= 1, `media ${media} debería ≈100`)
    // jul/ago deben superar a ene/feb
    assert.ok(INDICE_DEMANDA_MENSUAL[6] > INDICE_DEMANDA_MENSUAL[0])
    assert.ok(INDICE_DEMANDA_MENSUAL[7] > INDICE_DEMANDA_MENSUAL[1])
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
