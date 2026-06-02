/**
 * Sprint 0+1 · Task 7 · Tests del registry de mantenimiento del pipeline
 * Prensa canónico.
 *
 * Cubre:
 *   · Registry: JOBS contiene los 3 jobs Sprint 0+1 esperados con los
 *     schedules correctos.
 *   · Selector: shouldRunNow(job, now) respeta el mapeo schedule → hora UTC.
 *   · Shape: cada job retorna `JobResult` con las 4 propiedades esperadas.
 *
 * NO depende de vitest/jest. Patrón Node 24+ con TypeScript nativo,
 * idéntico a tests/unit/medios/canonical/types.test.ts:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/canonical/maintenance.test.ts
 */
import assert from 'node:assert/strict'
import {
  JOBS,
  shouldRunNow,
  type Job,
} from '../../../../lib/medios/canonical/maintenance/index.ts'

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

async function run() {
  // ─── 1 · Registry ────────────────────────────────────────────────────
  console.log('\n→ maintenance · registry')

  await test('JOBS · contiene los 3 jobs Sprint 0+1', () => {
    const names = JOBS.map(j => j.name)
    assert.ok(names.includes('cleanup-clusters'), 'falta cleanup-clusters')
    assert.ok(
      names.includes('recompute-source-scores'),
      'falta recompute-source-scores',
    )
    assert.ok(names.includes('otro-alert'), 'falta otro-alert')
    assert.equal(JOBS.length, 3, `esperado 3 jobs, encontrado ${JOBS.length}`)
  })

  await test('JOBS · cada entrada tiene shape Job (name + schedule + run)', () => {
    for (const job of JOBS) {
      assert.equal(typeof job.name, 'string', `job sin name: ${JSON.stringify(job)}`)
      assert.ok(
        ['hourly', '6hourly', '12hourly', 'daily'].includes(job.schedule),
        `schedule inválido en ${job.name}: ${job.schedule}`,
      )
      assert.equal(typeof job.run, 'function', `${job.name} sin run()`)
    }
  })

  await test('JOBS · cleanup-clusters tiene schedule hourly', () => {
    const j = JOBS.find(j => j.name === 'cleanup-clusters')!
    assert.equal(j.schedule, 'hourly')
  })

  await test('JOBS · recompute-source-scores tiene schedule daily', () => {
    const j = JOBS.find(j => j.name === 'recompute-source-scores')!
    assert.equal(j.schedule, 'daily')
  })

  await test('JOBS · otro-alert tiene schedule 6hourly', () => {
    const j = JOBS.find(j => j.name === 'otro-alert')!
    assert.equal(j.schedule, '6hourly')
  })

  // ─── 2 · Selector shouldRunNow ─────────────────────────────────────────
  console.log('\n→ maintenance · shouldRunNow selector')

  const dummyJob = (schedule: Job['schedule']): Job => ({
    name: `dummy-${schedule}`,
    schedule,
    run: async () => ({
      job: `dummy-${schedule}`,
      durationMs: 0,
      itemsProcessed: 0,
      errors: [],
    }),
  })

  await test('hourly · true en cualquier hora UTC', () => {
    assert.equal(
      shouldRunNow(dummyJob('hourly'), new Date('2026-06-02T05:00:00Z')),
      true,
    )
    assert.equal(
      shouldRunNow(dummyJob('hourly'), new Date('2026-06-02T17:00:00Z')),
      true,
    )
  })

  await test('6hourly · true en hour 0/6/12/18, false en otras', () => {
    const j = dummyJob('6hourly')
    assert.equal(shouldRunNow(j, new Date('2026-06-02T00:00:00Z')), true)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T06:00:00Z')), true)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T12:00:00Z')), true)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T18:00:00Z')), true)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T03:00:00Z')), false)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T11:00:00Z')), false)
  })

  await test('12hourly · true en hour 0/12, false en otras', () => {
    const j = dummyJob('12hourly')
    assert.equal(shouldRunNow(j, new Date('2026-06-02T00:00:00Z')), true)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T12:00:00Z')), true)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T06:00:00Z')), false)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T18:00:00Z')), false)
  })

  await test('daily · true en hour 3, false en otras', () => {
    const j = dummyJob('daily')
    assert.equal(shouldRunNow(j, new Date('2026-06-02T03:00:00Z')), true)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T10:00:00Z')), false)
    assert.equal(shouldRunNow(j, new Date('2026-06-02T00:00:00Z')), false)
  })

  // ─── 3 · JobResult shape ──────────────────────────────────────────────
  console.log('\n→ maintenance · JobResult shape')

  await test('cada job retorna JobResult con shape correcto', async () => {
    for (const job of JOBS) {
      const r = await job.run()
      assert.equal(r.job, job.name, `job.name mismatch en ${job.name}`)
      assert.equal(typeof r.durationMs, 'number', `durationMs no es number en ${job.name}`)
      assert.ok(r.durationMs >= 0, `durationMs negativo en ${job.name}`)
      assert.equal(
        typeof r.itemsProcessed,
        'number',
        `itemsProcessed no es number en ${job.name}`,
      )
      assert.ok(
        Array.isArray(r.errors),
        `errors no es array en ${job.name}`,
      )
    }
  })

  await test('ningún job lanza excepciones (todos catchean)', async () => {
    // Ejecutamos todos en serie y verificamos que ninguno tira (la propiedad
    // crítica del cron es que un job no aborta el resto).
    for (const job of JOBS) {
      await assert.doesNotReject(job.run())
    }
  })

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
