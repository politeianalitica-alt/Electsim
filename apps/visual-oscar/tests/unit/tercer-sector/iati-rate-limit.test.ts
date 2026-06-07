/**
 * Sprint IATI-MAX · Tests del rate-limiter (token bucket + retries + dedupe).
 *
 * NO depende de vitest/jest (patrón Politeia). Ejecutar:
 *
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings \
 *        tests/unit/tercer-sector/iati-rate-limit.test.ts
 *
 * Cubre:
 *   1. computeWaitMs · ventanas 1s y 60s, sin throttle / con throttle
 *   2. acquireSlot · 0 ms si hay capacidad, espera si no
 *   3. backoffDelayMs puro con rng inyectado · base, factor, jitter
 *   4. withRetry · reintenta solo si retryable, devuelve último resultado
 *   5. dedupeInFlight · 2 llamadas concurrentes = 1 ejecución real
 *   6. getIatiUsageStats · counters coherentes tras requests
 */
import assert from 'node:assert/strict'
import {
  computeWaitMs,
  acquireSlot,
  backoffDelayMs,
  withRetry,
  dedupeInFlight,
  getIatiUsageStats,
  noteRequest,
  noteCacheHit,
  _resetRateLimiterForTest,
} from '../../../lib/tercer-sector/iati-rate-limit.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${(e as Error)?.message ?? e}`)
  }
}

async function run() {
  console.log('\n→ tercer-sector · iati-rate-limit\n')

  // ── 1. computeWaitMs ────────────────────────────────────────────────────
  await test('computeWaitMs · sin llamadas previas → 0 ms', () => {
    _resetRateLimiterForTest()
    const w = computeWaitMs(Date.now(), { perSec: 3, perMin: 100 })
    assert.equal(w, 0)
  })

  await test('acquireSlot · 0 espera cuando bucket está libre', async () => {
    _resetRateLimiterForTest()
    process.env.IATI_RATE_PER_SEC = '5'
    process.env.IATI_RATE_PER_MIN = '100'
    const waited = await acquireSlot()
    assert.equal(waited, 0)
    delete process.env.IATI_RATE_PER_SEC
    delete process.env.IATI_RATE_PER_MIN
  })

  await test('acquireSlot · respeta perSec (4 calls @ 3/seg → al menos una espera)', async () => {
    _resetRateLimiterForTest()
    process.env.IATI_RATE_PER_SEC = '3'
    process.env.IATI_RATE_PER_MIN = '1000'
    const t0 = Date.now()
    // 4 llamadas seguidas: las 3 primeras no esperan, la 4ª debe esperar ~hasta
    // que la 1ª salga de la ventana 1s (~1000 ms - delta).
    await acquireSlot()
    await acquireSlot()
    await acquireSlot()
    const tBeforeFourth = Date.now()
    await acquireSlot()
    const tAfter = Date.now()
    const elapsed = tAfter - t0
    assert.ok(
      elapsed >= 800,
      `cuatro llamadas a 3/seg deben tardar ≥800 ms (real: ${elapsed} ms, espera 4ª: ${tAfter - tBeforeFourth}ms)`,
    )
    delete process.env.IATI_RATE_PER_SEC
    delete process.env.IATI_RATE_PER_MIN
  })

  // ── 3. backoffDelayMs ───────────────────────────────────────────────────
  await test('backoffDelayMs · puro · base 1000, factor 2, jitter 0 → 1000, 2000, 4000', () => {
    const rng = () => 0.5 // sin jitter (centro)
    const d0 = backoffDelayMs(0, { baseMs: 1000, factor: 2, jitter: 0 }, rng)
    const d1 = backoffDelayMs(1, { baseMs: 1000, factor: 2, jitter: 0 }, rng)
    const d2 = backoffDelayMs(2, { baseMs: 1000, factor: 2, jitter: 0 }, rng)
    assert.equal(d0, 1000)
    assert.equal(d1, 2000)
    assert.equal(d2, 4000)
  })

  await test('backoffDelayMs · jitter 0.3 con rng=1 → +30%, rng=0 → -30%', () => {
    const high = backoffDelayMs(0, { baseMs: 1000, factor: 2, jitter: 0.3 }, () => 1)
    const low = backoffDelayMs(0, { baseMs: 1000, factor: 2, jitter: 0.3 }, () => 0)
    assert.equal(high, 1300, `high=${high}`)
    assert.equal(low, 700, `low=${low}`)
  })

  // ── 4. withRetry ────────────────────────────────────────────────────────
  await test('withRetry · ok inmediato → no reintenta', async () => {
    let n = 0
    const out = await withRetry(async () => {
      n++
      return { ok: true }
    })
    assert.equal(n, 1)
    assert.equal(out.ok, true)
  })

  await test('withRetry · retryable hasta agotar → devuelve último (no lanza)', async () => {
    let n = 0
    const out = await withRetry(
      async () => {
        n++
        return { ok: false, retryable: true, error: `intento ${n}` } as {
          ok: boolean
          retryable: boolean
          error: string
        }
      },
      { maxRetries: 3, baseMs: 1 },
    )
    assert.equal(n, 3)
    assert.equal(out.ok, false)
  })

  await test('withRetry · error NO retryable → 1 intento solo', async () => {
    let n = 0
    const out = await withRetry(
      async () => {
        n++
        return { ok: false, retryable: false } as { ok: boolean; retryable: boolean }
      },
      { maxRetries: 3, baseMs: 1 },
    )
    assert.equal(n, 1)
    assert.equal(out.ok, false)
  })

  // ── 5. dedupeInFlight ───────────────────────────────────────────────────
  await test('dedupeInFlight · 3 calls concurrentes mismo key → 1 ejecución', async () => {
    _resetRateLimiterForTest()
    let calls = 0
    const fn = async () => {
      calls++
      await new Promise((r) => setTimeout(r, 30))
      return calls
    }
    const [a, b, c] = await Promise.all([
      dedupeInFlight('k1', fn),
      dedupeInFlight('k1', fn),
      dedupeInFlight('k1', fn),
    ])
    assert.equal(calls, 1, `solo una ejecución real (real: ${calls})`)
    assert.equal(a, 1)
    assert.equal(b, 1)
    assert.equal(c, 1)
  })

  await test('dedupeInFlight · keys distintas → cada una ejecuta', async () => {
    _resetRateLimiterForTest()
    let calls = 0
    const fn = async () => {
      calls++
      return calls
    }
    await Promise.all([
      dedupeInFlight('a', fn),
      dedupeInFlight('b', fn),
      dedupeInFlight('c', fn),
    ])
    assert.equal(calls, 3)
  })

  await test('dedupeInFlight · contador suma dedupe_hits para misma key', async () => {
    _resetRateLimiterForTest()
    const fn = async () => {
      await new Promise((r) => setTimeout(r, 20))
      return 'x'
    }
    await Promise.all([
      dedupeInFlight('hits', fn),
      dedupeInFlight('hits', fn),
      dedupeInFlight('hits', fn),
    ])
    const s = getIatiUsageStats()
    // 2 dedupe_hits porque la primera no es hit, las otras 2 sí.
    assert.equal(s.counters.total_dedupe_hits, 2)
  })

  // ── 6. usage stats ──────────────────────────────────────────────────────
  await test('getIatiUsageStats · counters suman tras noteRequest/noteCacheHit', () => {
    _resetRateLimiterForTest()
    noteRequest()
    noteRequest()
    noteCacheHit()
    const s = getIatiUsageStats()
    assert.equal(s.counters.total_requests, 2)
    assert.equal(s.counters.total_cache_hits, 1)
    assert.ok(s.config.perSec >= 1)
    assert.ok(s.config.perMin >= 1)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
