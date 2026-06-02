/**
 * Sprint 2 C1 · Tests para GeminiProductionClient.
 *
 * NO depende de vitest/jest (estilo de tests del módulo medios — ver
 * llm-classifier.test.ts). Se ejecuta con Node 24+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *       tests/unit/medios/canonical/llm-classifier-gemini.test.ts
 *
 * Mock strategy: `GeminiProductionClient` acepta un `generateJSON` inyectable
 * en el constructor (default = el real). Los tests pasan un stub en lugar
 * de monkey-patchear el módulo (Node ESM congela los exports).
 *
 * Cubre:
 *   1. classifyBatch llama a generateJSON con jsonSchema correcto
 *   2. cache hit en segunda llamada idéntica (no refetch)
 *   3. circuit breaker abre tras 3 fallos consecutivos
 *   4. confidence cap a 0.75 incluso si Gemini devuelve > 0.75
 *   5. topicId fuera de lista → null para ese item
 *   6. error config si GEMINI_API_KEY no está
 */
import assert from 'node:assert/strict'
import { GeminiProductionClient } from '../../../../lib/medios/canonical/llm-classifier.ts'

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

// ─── Stub harness para generateJSON ──────────────────────────────────
type GenerateJSONStub = (opts: Record<string, unknown>) => Promise<unknown>

function makeStub(impl: GenerateJSONStub): {
  fn: GenerateJSONStub
  calls: Array<Record<string, unknown>>
} {
  const calls: Array<Record<string, unknown>> = []
  const fn: GenerateJSONStub = async (opts) => {
    calls.push(opts)
    return impl(opts)
  }
  return { fn, calls }
}

const TOPIC_LIST = ['POLITICA', 'ECONOMIA', 'OTRO']

async function main() {
  console.log('\n→ llm-classifier · GeminiProductionClient')

  await test(
    'classifyBatch llama a generateJSON con jsonSchema con enum topicList',
    async () => {
      const stub = makeStub(async () => ({
        results: [
          { topicId: 'POLITICA', confidence: 0.85, reasoning: 'menciona PSOE' },
        ],
      }))
      const c = new GeminiProductionClient({
        apiKey: 'test-key',
        generateJSON: stub.fn as unknown as never,
      })
      const r = await c.classifyBatch(
        [{ title: 'PSOE anuncia reforma', description: 'El partido socialista...' }],
        TOPIC_LIST,
      )
      assert.equal(r.length, 1)
      assert.equal(r[0]?.topicId, 'POLITICA')
      assert.ok(
        (r[0] as { confidence: number }).confidence <= 0.75,
        'confidence siempre cap a 0.75',
      )
      assert.equal(stub.calls.length, 1, 'esperaba una llamada a generateJSON')
      const opts = stub.calls[0]!
      assert.ok(opts.jsonSchema, 'debe pasar jsonSchema')
      const schema = opts.jsonSchema as {
        properties: {
          results: {
            items: { properties: { topicId: { enum: string[] } } }
          }
        }
      }
      assert.deepEqual(
        schema.properties.results.items.properties.topicId.enum,
        TOPIC_LIST,
        'enum topicId debe ser la topicList recibida',
      )
    },
  )

  await test('cache hit: segunda llamada misma entrada NO refetch + valor preservado', async () => {
    const stub = makeStub(async () => ({
      results: [{ topicId: 'ECONOMIA', confidence: 0.9, reasoning: '' }],
    }))
    const c = new GeminiProductionClient({
      apiKey: 'test-key',
      generateJSON: stub.fn as unknown as never,
    })
    const items = [{ title: 'IPC sube en abril', description: 'inflación subyacente' }]
    const r1 = await c.classifyBatch(items, TOPIC_LIST)
    assert.equal(r1[0]?.topicId, 'ECONOMIA')
    assert.equal(stub.calls.length, 1)
    const r2 = await c.classifyBatch(items, TOPIC_LIST)
    assert.equal(
      stub.calls.length,
      1,
      'segunda call con mismo input es cache hit (no fetch)',
    )
    // I5 fix: la cache no sólo evita el fetch, también devuelve el valor
    // original. Sin esto, un bug "cache hit devuelve null" pasaría el test.
    assert.equal(
      r2[0]?.topicId,
      r1[0]?.topicId,
      'cache hit debe devolver el mismo topicId que la primera llamada',
    )
    assert.equal(
      r2[0]?.confidence,
      r1[0]?.confidence,
      'cache hit debe devolver el mismo confidence que la primera llamada',
    )
    assert.equal(
      r2[0]?.reasoning,
      r1[0]?.reasoning,
      'cache hit debe devolver el mismo reasoning que la primera llamada',
    )
  })

  await test(
    'circuit breaker: 3 fallos consecutivos → 4ª call NO llama generateJSON',
    async () => {
      const stub = makeStub(async () => {
        throw new Error('Gemini API error')
      })
      const c = new GeminiProductionClient({
        apiKey: 'test-key',
        generateJSON: stub.fn as unknown as never,
      })
      // 3 títulos únicos para evitar cache hits
      await c.classifyBatch([{ title: 'gemini-fail-a', description: 'a' }], TOPIC_LIST)
      await c.classifyBatch([{ title: 'gemini-fail-b', description: 'b' }], TOPIC_LIST)
      await c.classifyBatch([{ title: 'gemini-fail-c', description: 'c' }], TOPIC_LIST)
      assert.equal(stub.calls.length, 3, '3 fetches antes de abrir circuito')
      const callsBefore = stub.calls.length
      const r = await c.classifyBatch(
        [{ title: 'gemini-fail-d', description: 'd' }],
        TOPIC_LIST,
      )
      assert.equal(r[0], null, 'con circuito abierto debe retornar null')
      assert.equal(
        stub.calls.length,
        callsBefore,
        'circuito abierto: no debe haber llamada adicional',
      )
    },
  )

  await test('confidence cap: input 0.99 → output ≤ 0.75', async () => {
    const stub = makeStub(async () => ({
      results: [{ topicId: 'POLITICA', confidence: 0.99, reasoning: 'cap test' }],
    }))
    const c = new GeminiProductionClient({
      apiKey: 'test-key',
      generateJSON: stub.fn as unknown as never,
    })
    const r = await c.classifyBatch(
      [{ title: 'unique-cap-title', description: 'desc' }],
      TOPIC_LIST,
    )
    assert.ok(r[0] !== null)
    assert.equal((r[0] as { confidence: number }).confidence, 0.75)
  })

  await test('topicId fuera de lista → null para ese item', async () => {
    const stub = makeStub(async () => ({
      results: [{ topicId: 'INEXISTENTE', confidence: 0.9, reasoning: 'oops' }],
    }))
    const c = new GeminiProductionClient({
      apiKey: 'test-key',
      generateJSON: stub.fn as unknown as never,
    })
    const r = await c.classifyBatch(
      [{ title: 'unique-bad-topic-title', description: 'desc' }],
      TOPIC_LIST,
    )
    assert.equal(r[0], null, 'topicId no en lista debe mapear a null')
  })

  await test('error config si GEMINI_API_KEY no está', () => {
    let threw = false
    try {
      new GeminiProductionClient({ apiKey: '' })
    } catch (e) {
      threw = true
      assert.match((e as Error).message, /GEMINI_API_KEY required/)
    }
    assert.equal(threw, true, 'debe lanzar si apiKey está vacío')
  })

  await test(
    'batching 25 items → exactamente 2 generateJSON calls (20 + 5)',
    async () => {
      // I5 fix: paridad con Groq · test parity #2. Sin este test un cambio
      // en BATCH_SIZE (20 → otro número) o un bug en el chunking de
      // classifyBatch pasaría inadvertido.
      let callCount = 0
      const stub = makeStub(async (opts) => {
        callCount++
        // El client mapea posicionalmente: devolvemos el mismo array de 20.
        // En la segunda call (5 items), las posiciones 5-19 se ignoran.
        const results = Array.from({ length: 20 }, () => ({
          topicId: 'OTRO',
          confidence: 0.5,
          reasoning: 'batch',
        }))
        // Sanity check del opts inyectado (jsonSchema presente).
        assert.ok(opts.jsonSchema, 'jsonSchema debe pasarse en cada call')
        return { results }
      })
      const c = new GeminiProductionClient({
        apiKey: 'test-key',
        generateJSON: stub.fn as unknown as never,
      })
      const items = Array.from({ length: 25 }, (_, i) => ({
        title: `batch único título ${i}`,
        description: `desc ${i}`,
      }))
      const result = await c.classifyBatch(items, TOPIC_LIST)
      assert.equal(
        stub.calls.length,
        2,
        `esperaba 2 calls a generateJSON (20 + 5), recibí ${stub.calls.length}`,
      )
      assert.equal(callCount, 2, 'callCount también debe ser 2')
      assert.equal(result.length, 25, 'salida debe tener 25 entries (1 por item)')
    },
  )

  console.log(`\n${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
