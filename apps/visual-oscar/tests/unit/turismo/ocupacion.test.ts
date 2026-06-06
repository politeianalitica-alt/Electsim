/**
 * Sprint Turismo T2-ine · Tests del cliente OCUPACIÓN (lib/turismo/ocupacion.ts).
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/ocupacion.test.ts
 *
 * Cubre las dos vías:
 *   - buildTipo / buildOcupacion PURAS con `RawTables` (sin red) → mapping por
 *     tipo + flag degraded + ADR/RevPAR solo en hoteles.
 *   - fetchOcupacion con fetch-mock que rutea por ID de tabla en la URL
 *     (DATOS_TABLA/{id}); degradación por-tipo (apartamentos sin grado).
 *
 * Fixtures con la estructura real (probe 2026-06-07):
 *   pernoct nacional: "Nacional. Pernoctaciones. Total categorías. Total." (FK 4)
 *   grado hotel 2011: "Nacional. Grado de ocupación por plazas." (agregado)
 *   estancia unificada 2024: "...hoteleros... Estancia media", etc.
 *   ADR 2058: "ADR. Nacional. Dato." · RevPAR 2056: "RevPAR. Nacional. Dato."
 */
import assert from 'node:assert/strict'
import {
  buildOcupacion,
  buildTipo,
  TIPO_DEFS,
  fetchOcupacion,
  type RawTables,
} from '../../../lib/turismo/ocupacion.ts'
import { _clearTurismoCache } from '../../../lib/turismo/shared.ts'

let passed = 0
let failed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); passed++; console.log(`  ok ${name}`) }
  catch (e) { failed++; console.error(`  XX ${name}`); console.error('    ', (e as Error).message) }
}

const MO = (v: number | null) => ({ FK_Periodo: 4, Anyo: 2026, Valor: v }) // abril 2026

function pernoct(v: number) {
  return { COD: 'p', Nombre: 'Nacional. Pernoctaciones. Total categorías. Total.', Data: [MO(v)] }
}
function gradoHotel(v: number) {
  return { COD: 'g', Nombre: 'Nacional. Grado de ocupación por plazas.', Data: [MO(v)] }
}
function gradoParcelas(v: number) {
  return { COD: 'g', Nombre: 'Nacional. Grado de ocupación por parcelas. Total acampamentos.', Data: [MO(v)] }
}
function estanciaUnificada() {
  return [
    { COD: 'e1', Nombre: 'Esblecimientos hoteleros. Nacional. Establecimientos hoteleros.  Estancia media', Data: [MO(2.87)] },
    { COD: 'e2', Nombre: 'Apartamentos turísticos. Nacional. Apartamentos turísticos.  Estancia media', Data: [MO(4.2)] },
    { COD: 'e3', Nombre: 'Acampamentos turísticos. Nacional.  Estancia media', Data: [MO(3.91)] },
  ]
}
function estanciaRural() {
  return [{ COD: 'er', Nombre: 'Nacional.  Estancia media', Data: [MO(2.48)] }]
}

/** Construye un RawTables completo y sano (todas las tablas presentes). */
function fullRaw(): RawTables {
  return {
    2074: [pernoct(29285688)], // hotel pernoct
    2011: [gradoHotel(58.45)], // hotel grado
    2024: estanciaUnificada(), // estancia hotel/apt/camping
    2058: [{ COD: 'adr', Nombre: 'ADR. Nacional. Dato.', Data: [MO(122.26)] }],
    2056: [{ COD: 'rev', Nombre: 'RevPAR. Nacional. Dato.', Data: [MO(81.69)] }],
    1993: [pernoct(5306609)], // apt pernoct
    2021: [gradoHotel(36.24)], // apt grado (mismo Nombre "por plazas")
    2016: [pernoct(3552957)], // camping pernoct
    2042: [gradoParcelas(38.69)], // camping grado
    1995: [pernoct(1070015)], // rural pernoct
    2046: [gradoHotel(20.63)], // rural grado (por plazas)
    2023: estanciaRural(), // rural estancia
  }
}

async function run() {
  console.log('\n-> turismo · ocupacion')

  await test('buildOcupacion PURO · 4 tipos con datos completos', () => {
    const d = buildOcupacion(fullRaw())
    assert.equal(d.tipos.length, 4)
    const hotel = d.tipos.find((t) => t.tipo === 'hoteles')!
    assert.equal(hotel.pernoctaciones, 29285688)
    assert.equal(hotel.grado_ocupacion_pct, 58.45)
    assert.equal(hotel.estancia_media, 2.87)
    assert.equal(hotel.adr_eur, 122.26)
    assert.equal(hotel.revpar_eur, 81.69)
    assert.equal(hotel.degraded, false)
  })

  await test('ADR/RevPAR SOLO en hoteles', () => {
    const d = buildOcupacion(fullRaw())
    const apt = d.tipos.find((t) => t.tipo === 'apartamentos')!
    assert.equal(apt.adr_eur, null)
    assert.equal(apt.revpar_eur, null)
    assert.equal(apt.estancia_media, 4.2)
    const camp = d.tipos.find((t) => t.tipo === 'campings')!
    assert.equal(camp.grado_ocupacion_pct, 38.69) // por parcelas
    assert.equal(camp.estancia_media, 3.91)
    const rural = d.tipos.find((t) => t.tipo === 'rural')!
    assert.equal(rural.estancia_media, 2.48)
  })

  await test('buildTipo · degradación de un tipo (apt sin grado)', () => {
    const raw = fullRaw()
    raw[2021] = null // apartamentos sin tabla de grado
    const aptDef = TIPO_DEFS.find((d) => d.tipo === 'apartamentos')!
    const apt = buildTipo(aptDef, raw)
    assert.equal(apt.grado_ocupacion_pct, null)
    assert.equal(apt.pernoctaciones, 5306609) // pernoct sigue
    assert.equal(apt.degraded, true)
  })

  await test('fetchOcupacion · rutea por tabla + degrada por tipo', async () => {
    _clearTurismoCache()
    const realFetch = globalThis.fetch
    // mock: rutea por ID de tabla; tabla 2021 (grado apt) devuelve 500.
    globalThis.fetch = (async (url: any) => {
      const u = String(url)
      const m = u.match(/DATOS_TABLA\/(\d+)/)
      const id = m ? Number(m[1]) : 0
      if (id === 2021) return { ok: false, status: 500, statusText: 'err', text: async () => '', json: async () => ({}) } as any
      const raw = fullRaw()
      const body = raw[id] ?? []
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(body), json: async () => body } as any
    }) as any
    const r = await fetchOcupacion({ months: 24, noCache: true })
    globalThis.fetch = realFetch
    assert.equal(r.ok, true, r.error)
    assert.equal(r.partial, true) // apartamentos degradó
    const apt = r.data!.tipos.find((t) => t.tipo === 'apartamentos')!
    assert.equal(apt.grado_ocupacion_pct, null)
    const hotel = r.data!.tipos.find((t) => t.tipo === 'hoteles')!
    assert.equal(hotel.grado_ocupacion_pct, 58.45)
    assert.equal(r.data!.last_period, '2026-04')
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}
run()
