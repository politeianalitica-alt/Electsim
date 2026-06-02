/**
 * Sprint 2 C3 · Tests para computeAndWriteSnapshot (cron job hourly).
 *
 * Estrategia de mock: snapshot-writer importa from
 * '../stores/topic-prominence-store.ts' — los tests sustituyen ese módulo
 * inyectando un store stub vía la factory `__withTestStore` que expone
 * snapshot-writer (patrón análogo al `generateJSON` inyectable del cliente
 * Gemini, ver llm-classifier-gemini.test.ts). Así no necesitamos
 * monkey-patchear ESM, no abrimos sockets reales y no tocamos DB.
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/scoring/snapshot-writer.test.ts
 *
 * Cubre:
 *   1. escribe una fila por topic con volume > 0 (mockea store, asserta
 *      writeSnapshot called N veces)
 *   2. cada snapshot tiene score ∈ [0, 1] y state ∈ enum válido
 *   3. omite topics con volume = 0 (no se llama writeSnapshot para ellos)
 */
import assert from 'node:assert/strict'
import {
  computeAndWriteSnapshot,
  __withTestStore,
  type TopicProminenceStore,
} from '../../../../../lib/medios/canonical/scoring/snapshot-writer.ts'

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

// ─── Stub harness para el store ──────────────────────────────────────
interface StoreCalls {
  reads: Array<{ topicId: string; type: 'volume' | 'history' }>
  writes: Array<Record<string, unknown>>
}

function makeStoreStub(
  volumes: Record<string, { volume: number; source_count: number }>,
  history: Array<{ computed_at: Date; volume: number }> = [],
): { store: TopicProminenceStore; calls: StoreCalls } {
  const calls: StoreCalls = { reads: [], writes: [] }
  const store: TopicProminenceStore = {
    readArticleVolumeInWindow: async (topicId, _from, _to) => {
      calls.reads.push({ topicId, type: 'volume' })
      return volumes[topicId] ?? { volume: 0, source_count: 0 }
    },
    readHistoryForTopic: async (topicId, _windowSpec, _since) => {
      calls.reads.push({ topicId, type: 'history' })
      return history
    },
    writeSnapshot: async (snapshot) => {
      calls.writes.push(snapshot as unknown as Record<string, unknown>)
    },
  }
  return { store, calls }
}

const VALID_STATES = new Set(['STRUCTURAL', 'EMERGENT', 'STABLE'])

async function run() {
  console.log('\n→ scoring · computeAndWriteSnapshot')

  // ─── Caso 1: 3 topics todos con volumen → 3 writes ────────────────────
  await test(
    'escribe una fila por topic con volume > 0',
    async () => {
      const { store, calls } = makeStoreStub({
        POLITICA: { volume: 12, source_count: 5 },
        ECONOMIA: { volume: 8, source_count: 3 },
        SOCIEDAD: { volume: 4, source_count: 2 },
      })
      await __withTestStore(store, async () => {
        await computeAndWriteSnapshot(['POLITICA', 'ECONOMIA', 'SOCIEDAD'], '24h')
      })
      assert.equal(
        calls.writes.length,
        3,
        `esperado 3 writes, obtenido ${calls.writes.length}`,
      )
      const ids = calls.writes.map((w) => w.topic_id).sort()
      assert.deepEqual(ids, ['ECONOMIA', 'POLITICA', 'SOCIEDAD'])
    },
  )

  // ─── Caso 2: cada snapshot tiene score ∈ [0, 1] y state válido ────────
  await test(
    'snapshots respetan score ∈ [0,1], state válido, window_spec ok',
    async () => {
      const { store, calls } = makeStoreStub({
        POLITICA: { volume: 50, source_count: 10 },
      })
      await __withTestStore(store, async () => {
        await computeAndWriteSnapshot(['POLITICA'], '24h')
      })
      assert.equal(calls.writes.length, 1)
      const snap = calls.writes[0]
      const score = snap.score as number
      assert.ok(
        typeof score === 'number' && score >= 0 && score <= 1,
        `score fuera de rango: ${score}`,
      )
      assert.ok(
        VALID_STATES.has(snap.state as string),
        `state inválido: ${snap.state}`,
      )
      assert.equal(snap.window_spec, '24h')
      assert.equal(snap.topic_id, 'POLITICA')
      assert.equal(snap.subtopic_id, '')
      // volume_score y momentum_score también dentro de [0, 1]
      assert.ok((snap.volume_score as number) >= 0 && (snap.volume_score as number) <= 1)
      assert.ok((snap.momentum_score as number) >= 0 && (snap.momentum_score as number) <= 1)
      // C3 placeholders: diversity / tier / entity_density = 0
      assert.equal(snap.source_diversity_score, 0)
      assert.equal(snap.tier_weight_score, 0)
      assert.equal(snap.entity_density_score, 0)
    },
  )

  // ─── Caso 3: topic con volume=0 → no write ────────────────────────────
  await test(
    'omite topics con volume = 0',
    async () => {
      const { store, calls } = makeStoreStub({
        POLITICA: { volume: 12, source_count: 5 },
        ECONOMIA: { volume: 0, source_count: 0 },
        VACIO_TOTAL: { volume: 0, source_count: 0 },
      })
      await __withTestStore(store, async () => {
        await computeAndWriteSnapshot(
          ['POLITICA', 'ECONOMIA', 'VACIO_TOTAL'],
          '24h',
        )
      })
      assert.equal(
        calls.writes.length,
        1,
        `esperado 1 write (solo POLITICA), obtenido ${calls.writes.length}`,
      )
      assert.equal(calls.writes[0].topic_id, 'POLITICA')
    },
  )

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
