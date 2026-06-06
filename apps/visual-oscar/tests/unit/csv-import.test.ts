/**
 * Unit tests para el importador de CSV (lib/tables/csv-import.ts).
 * TS puro, sin vitest. Ejecutar con Node 22+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types tests/unit/csv-import.test.ts
 */
import assert from 'node:assert/strict'
import { parseDelimited, previewCsv, buildTableFromCsv } from '../../lib/tables/csv-import.ts'

let passed = 0
let failed = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
  } catch (e) {
    failed++
    console.error(`✗ ${name}`)
    console.error(e)
  }
}

test('parseDelimited · comas básicas', () => {
  const m = parseDelimited('a,b,c\n1,2,3')
  assert.deepEqual(m, [['a', 'b', 'c'], ['1', '2', '3']])
})

test('parseDelimited · autodetecta punto y coma', () => {
  const m = parseDelimited('a;b;c\n1;2;3')
  assert.deepEqual(m, [['a', 'b', 'c'], ['1', '2', '3']])
})

test('parseDelimited · autodetecta tabuladores', () => {
  const m = parseDelimited('a\tb\n1\t2')
  assert.deepEqual(m, [['a', 'b'], ['1', '2']])
})

test('parseDelimited · respeta comas dentro de comillas', () => {
  const m = parseDelimited('nombre,nota\n"Pérez, Juan",10')
  assert.deepEqual(m, [['nombre', 'nota'], ['Pérez, Juan', '10']])
})

test('parseDelimited · comillas escapadas y saltos de línea internos', () => {
  const m = parseDelimited('t\n"línea1\nlínea2"\n"dijo ""hola"""')
  assert.deepEqual(m, [['t'], ['línea1\nlínea2'], ['dijo "hola"']])
})

test('parseDelimited · descarta filas vacías', () => {
  const m = parseDelimited('a,b\n\n1,2\n')
  assert.deepEqual(m, [['a', 'b'], ['1', '2']])
})

test('previewCsv · cabeceras, total y límite', () => {
  const p = previewCsv('h1,h2\n1,2\n3,4\n5,6', 2)
  assert.deepEqual(p.headers, ['h1', 'h2'])
  assert.equal(p.totalRows, 3)
  assert.equal(p.rows.length, 2)
})

test('buildTableFromCsv · infiere tipos y construye filas', () => {
  const t = buildTableFromCsv('ws1', 'Mi tabla', 'nombre,partido,escaños\nJuan,PP,12\nAna,PSOE,10')
  assert.equal(t.workspaceId, 'ws1')
  assert.equal(t.name, 'Mi tabla')
  assert.equal(t.columns.length, 3)
  assert.equal(t.rows.length, 2)
  // columna numérica detectada
  const escanos = t.columns.find(c => c.label === 'escaños')
  assert.ok(escanos)
  assert.equal(escanos!.type, 'number')
  // columna de texto
  const nombre = t.columns.find(c => c.label === 'nombre')
  assert.equal(nombre!.type, 'text')
  // valores parseados
  assert.equal(t.rows[0][escanos!.key], 12)
  assert.equal(t.rows[1][nombre!.key], 'Ana')
})

test('buildTableFromCsv · decimales con coma española (delimitador ;)', () => {
  // En CSV españoles el delimitador es ; precisamente porque la , es decimal.
  const t = buildTableFromCsv('ws1', 'x', 'precio;ud\n3,5;cajas\n1,2;latas')
  const precio = t.columns.find(c => c.label === 'precio')!
  assert.equal(precio.type, 'number')
  assert.equal(t.rows[0][precio.key], 3.5)
  assert.equal(t.rows[1][precio.key], 1.2)
})

test('buildTableFromCsv · CSV vacío lanza', () => {
  assert.throws(() => buildTableFromCsv('ws1', 'x', '   '))
})

console.log(failed === 0 ? `OK · ${passed} tests` : `FALLOS · ${failed}/${passed + failed}`)
process.exit(failed === 0 ? 0 : 1)
