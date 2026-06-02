/**
 * Sprint 0+1 · Task 8 · Tests para GroqProductionClient.
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *       tests/unit/medios/canonical/llm-classifier.test.ts
 *
 * Cubre cache hit, confidence cap, validación topicId, circuit breaker,
 * batching 25 → 20+5.
 */
import assert from 'node:assert/strict'
import { GroqProductionClient } from '../../../../lib/medios/canonical/llm-classifier.ts'

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

// ─── Fetch mock harness ───────────────────────────────────────────────
const realFetch = globalThis.fetch
let fetchCalls: unknown[][] = []

type FetchImpl = (...args: unknown[]) => Promise<Response>

function setupFetchMock(impl: FetchImpl) {
  fetchCalls = []
  globalThis.fetch = (async (...args: unknown[]) => {
    fetchCalls.push(args)
    return impl(...args)
  }) as unknown as typeof fetch
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

function okResponse(body: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(body) } }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function errResponse(): Response {
  return new Response('boom', { status: 500 })
}

const TOPIC_LIST = ['POLITICA_INSTITUCIONAL', 'JUDICIAL', 'OTRO']

async function main() {
  console.log('\n→ llm-classifier · GroqProductionClient')

  await test('cache hit: segunda llamada misma entrada NO refetch', async () => {
    setupFetchMock(async () =>
      okResponse({
        results: [
          { topicId: 'POLITICA_INSTITUCIONAL', confidence: 0.9, reasoning: 'x' },
        ],
      }),
    )
    const c = new GroqProductionClient('fake-key')
    const items = [{ title: 'Pedro Sánchez convoca', description: 'sesión' }]

    const r1 = await c.classifyBatch(items, TOPIC_LIST)
    assert.equal(r1[0]?.topicId, 'POLITICA_INSTITUCIONAL')
    assert.equal(fetchCalls.length, 1, 'primera call hace 1 fetch')

    const r2 = await c.classifyBatch(items, TOPIC_LIST)
    assert.equal(r2[0]?.topicId, 'POLITICA_INSTITUCIONAL')
    assert.equal(
      fetchCalls.length,
      1,
      'segunda call con mismo input es cache hit (no fetch)',
    )

    restoreFetch()
  })

  await test('confidence cap: 0.99 input → ≤ 0.75 output', async () => {
    setupFetchMock(async () =>
      okResponse({
        results: [{ topicId: 'OTRO', confidence: 0.99, reasoning: 'cap' }],
      }),
    )
    const c = new GroqProductionClient('fake-key')
    const r = await c.classifyBatch(
      [{ title: 'Texto largo de prueba aqui', description: 'desc' }],
      TOPIC_LIST,
    )
    assert.ok(r[0] !== null, 'esperaba resultado no-null')
    assert.ok(
      (r[0] as { confidence: number }).confidence <= 0.75,
      `confidence ${(r[0] as { confidence: number }).confidence} debe ≤ 0.75`,
    )

    restoreFetch()
  })

  await test('topicId fuera de lista → null para ese item', async () => {
    setupFetchMock(async () =>
      okResponse({
        results: [
          { topicId: 'INEXISTENTE', confidence: 0.9, reasoning: 'oops' },
        ],
      }),
    )
    const c = new GroqProductionClient('fake-key')
    const r = await c.classifyBatch(
      [{ title: 'titulo único A', description: 'desc' }],
      TOPIC_LIST,
    )
    assert.equal(r[0], null, 'topicId no en lista debe mapear a null')

    restoreFetch()
  })

  await test('circuit breaker: 3 fails consecutivas → 4ª call NO fetch', async () => {
    setupFetchMock(async () => errResponse())
    const c = new GroqProductionClient('fake-key')

    // Cada call usa un título único para evitar cache hits
    await c.classifyBatch([{ title: 'fail-1', description: 'a' }], TOPIC_LIST)
    await c.classifyBatch([{ title: 'fail-2', description: 'b' }], TOPIC_LIST)
    await c.classifyBatch([{ title: 'fail-3', description: 'c' }], TOPIC_LIST)
    assert.equal(fetchCalls.length, 3, 'esperaba 3 fetches reales antes de abrir circuito')

    // 4ª llamada: circuito abierto → no debe llamar fetch
    const callsBefore = fetchCalls.length
    const r = await c.classifyBatch(
      [{ title: 'fail-4', description: 'd' }],
      TOPIC_LIST,
    )
    assert.equal(r[0], null, 'con circuito abierto debe retornar null')
    assert.equal(
      fetchCalls.length,
      callsBefore,
      'circuito abierto: no debe haber fetch adicional',
    )

    restoreFetch()
  })

  await test('batching 25 items → exactamente 2 fetch calls (20 + 5)', async () => {
    let callCount = 0
    setupFetchMock(async () => {
      callCount++
      // Devolvemos array de tamaño max(20) — el client mapea posicionalmente.
      const results = Array.from({ length: 20 }, () => ({
        topicId: 'OTRO',
        confidence: 0.5,
        reasoning: 'b',
      }))
      return okResponse({ results })
    })

    const c = new GroqProductionClient('fake-key')
    const items = Array.from({ length: 25 }, (_, i) => ({
      title: `título único batch ${i}`,
      description: `desc ${i}`,
    }))
    await c.classifyBatch(items, TOPIC_LIST)
    assert.equal(callCount, 2, 'esperaba 2 fetch calls (20 + 5)')
    assert.equal(fetchCalls.length, 2, 'fetchCalls.length debe ser 2')

    restoreFetch()
  })

  console.log(`\n${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
