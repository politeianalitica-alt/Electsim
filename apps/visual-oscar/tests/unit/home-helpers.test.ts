/**
 * Unit tests para los helpers del inicio (agenda de la semana).
 * Ejecutar: node --experimental-strip-types tests/unit/home-helpers.test.ts
 */
import assert from 'node:assert/strict'
import { getAgendaItems } from '../../lib/home/agenda.ts'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try { fn(); passed++ } catch (e) { failed++; console.error(`✗ ${name}`); console.error(e) }
}

// Lunes 1 de junio de 2026 (referencia fija para que el test sea determinista).
const MONDAY = new Date(2026, 5, 1)

test('getAgendaItems · respeta el límite', () => {
  assert.equal(getAgendaItems(MONDAY, 3).length, 3)
  assert.ok(getAgendaItems(MONDAY, 5).length <= 5)
})

test('getAgendaItems · ordenado por fecha ascendente', () => {
  const items = getAgendaItems(MONDAY, 5)
  for (let i = 1; i < items.length; i++) {
    assert.ok(items[i - 1].date <= items[i].date, `desordenado en índice ${i}`)
  }
})

test('getAgendaItems · todas las fechas son hoy o futuras', () => {
  const items = getAgendaItems(MONDAY, 5)
  const today = '2026-06-01'
  for (const it of items) assert.ok(it.date >= today, `${it.date} es anterior a hoy`)
})

test('getAgendaItems · cada hito tiene etiqueta, título y color', () => {
  for (const it of getAgendaItems(MONDAY, 5)) {
    assert.ok(it.dateLabel && it.dateLabel.length > 0)
    assert.ok(it.title && it.title.length > 0)
    assert.match(it.accent, /^#[0-9A-Fa-f]{6}$/)
  }
})

test('getAgendaItems · el martes cae el Consejo de Ministros', () => {
  const items = getAgendaItems(MONDAY, 6)
  const consejo = items.find(i => i.kind === 'consejo')
  assert.ok(consejo, 'falta el Consejo de Ministros')
  // 2 de junio de 2026 es martes
  assert.equal(consejo!.date, '2026-06-02')
})

console.log(failed === 0 ? `OK · ${passed} tests` : `FALLOS · ${failed}/${passed + failed}`)
process.exit(failed === 0 ? 0 : 1)
