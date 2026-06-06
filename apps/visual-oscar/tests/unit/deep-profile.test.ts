/**
 * Unit tests del análisis profundo del votante (lib/voter/deep-profile.ts).
 * Ejecutar: node --experimental-strip-types tests/unit/deep-profile.test.ts
 */
import assert from 'node:assert/strict'
import { buildDeepProfile, type DeepInput } from '../../lib/voter/deep-profile.ts'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++ } catch (e) { failed++; console.error(`✗ ${name}`); console.error(e) }
}

const base: DeepInput = {
  perfil: {
    edad: '35–44', genero: 'Mujer', estudios: 'Universitarios', habitat: 'Urbano (>100k)',
    ideologia: 'Centro-izq.', empleo: 'Asalariado', religion: 'No practicante',
    renta: 'Media', vivienda: 'Alquiler', hogar: 'Con hijos', territorio: 'Cataluña',
  },
  votoFloat: { PP: 24, PSOE: 28, VOX: 9, Sumar: 16, Junts: 8, PNV: 0, Otros: 15 },
  topTemas: [{ tema: 'Vivienda', peso: 80 }, { tema: 'Sanidad', peso: 60 }, { tema: 'Empleo', peso: 50 }],
  participacion: 68,
  posIdeo: -32,
  ganador: ['PSOE', 28],
  medios: { tv: 40, prensa: 35, redes: 70, podcast: 45 },
}

test('segunda opción = 2º partido más votado', () => {
  const d = buildDeepProfile(base)
  assert.equal(d.segunda.partido, 'PP') // 24 es el 2º tras PSOE 28
})

test('volatilidad e indecisión en rango', () => {
  const d = buildDeepProfile(base)
  assert.ok(d.volatilidad >= 8 && d.volatilidad <= 92)
  assert.ok(d.indecision >= 4 && d.indecision <= 60)
})

test('techo ≥ suelo y horquilla alrededor del ganador', () => {
  const d = buildDeepProfile(base)
  assert.ok(d.techo >= d.suelo)
  assert.ok(d.suelo <= 28 && d.techo >= 28 - 1)
})

test('propiedad temática: una entrada por tema (máx 5)', () => {
  const d = buildDeepProfile(base)
  assert.equal(d.ownership.length, 3)
  for (const o of d.ownership) assert.ok(o.credibilidad >= 35 && o.credibilidad <= 95)
})

test('líderes: 4, favorabilidad 5..92, ordenados desc', () => {
  const d = buildDeepProfile(base)
  assert.equal(d.lideres.length, 4)
  for (let i = 1; i < d.lideres.length; i++) assert.ok(d.lideres[i - 1].favor >= d.lideres[i].favor)
  for (const l of d.lideres) assert.ok(l.favor >= 5 && l.favor <= 92)
})

test('territorio: zona principal coincide con el perfil', () => {
  const d = buildDeepProfile(base)
  assert.equal(d.territorio[0].zona, 'Cataluña')
  assert.equal(d.territorio.length, 3)
})

test('mensajes de izquierda para un perfil con posIdeo < 0', () => {
  const d = buildDeepProfile(base)
  assert.ok(d.mensajes.conectan.length >= 1)
  assert.ok(d.mensajes.evitar.length >= 1)
})

test('canales: 3 plataformas y titular definido', () => {
  const d = buildDeepProfile(base)
  assert.equal(d.canales.plataformas.length, 3)
  assert.ok(d.canales.titular.length > 0)
})

console.log(failed === 0 ? `OK · ${passed} tests` : `FALLOS · ${failed}/${passed + failed}`)
process.exit(failed === 0 ? 0 : 1)
