/**
 * Energía v3 · E2-data · Tests del cliente progreso PNIEC
 * (lib/energia/pniec-progress.ts).
 *
 * NO depende de vitest/jest (patrón tests/unit/energia/agsi.test.ts). Ejecutar:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/pniec-progress.test.ts
 *
 * Mock de `globalThis.fetch` que enruta por URL: `estructura-generacion` (mix
 * REE · % renovable) y `potencia-instalada` (capacidad REE · GW solar/eólica).
 *
 * Cubre:
 *   1. live · % renovable del mix + GW capacidad → métricas con source 'live'
 *   2. computeProgress puro · ratio, nulos, objetivo 0
 *   3. renewableShareFromMix puro · suma renovable/total, ignora composite/neg
 *   4. buildPniecProgress puro · matchea métricas por nombre
 *   5. degradación · sin mix ni capacidad → todo catálogo (ok:true)
 *   6. caché · 2ª llamada NO refetch
 */
import assert from 'node:assert/strict'
import {
  fetchPniecProgress,
  computeProgress,
  renewableShareFromMix,
  buildPniecProgress,
  _clearPniecProgressCache,
} from '../../../lib/energia/pniec-progress.ts'
import { _clearRenovablesCapacityCache } from '../../../lib/energia/renovables-capacity.ts'
import type { ReeSerie } from '../../../lib/sources/ree.ts'

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
  }
}

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

/** estructura-generacion: 2 renovables + 1 no renovable (% renov = 60%). */
function mixFixture() {
  return {
    data: { type: 'Estructura', id: 'g1', attributes: { title: 'Estructura' } },
    included: [
      {
        type: 'Eólica',
        id: '1',
        attributes: {
          title: 'Eólica',
          type: 'Renovable',
          values: [{ value: 6000, datetime: '2026-06-05T00:00:00.000+02:00' }],
        },
      },
      {
        type: 'Solar',
        id: '2',
        attributes: {
          title: 'Solar fotovoltaica',
          type: 'Renovable',
          values: [{ value: 6000, datetime: '2026-06-05T00:00:00.000+02:00' }],
        },
      },
      {
        type: 'Gas',
        id: '3',
        attributes: {
          title: 'Ciclo combinado',
          type: 'No renovable',
          values: [{ value: 8000, datetime: '2026-06-05T00:00:00.000+02:00' }],
        },
      },
    ],
  }
}

/** potencia-instalada: solar 76 GW (=76000 MW), eólica 62 GW. */
function capacityFixture() {
  return {
    data: { type: 'Potencia', id: 'p1', attributes: { title: 'Potencia' } },
    included: [
      {
        type: 'Solar',
        id: '10',
        attributes: {
          title: 'Solar fotovoltaica',
          type: 'Renovable',
          values: [{ value: 38000, datetime: '2026-01-01T00:00:00.000+01:00' }],
        },
      },
      {
        type: 'Eólica',
        id: '11',
        attributes: {
          title: 'Eólica',
          type: 'Renovable',
          values: [{ value: 31000, datetime: '2026-01-01T00:00:00.000+01:00' }],
        },
      },
    ],
  }
}

const realFetch = globalThis.fetch
let fetchCalls = 0

function installFetchMock() {
  fetchCalls = 0
  globalThis.fetch = (async (input: any) => {
    fetchCalls++
    const u = typeof input === 'string' ? input : String(input?.url ?? input)
    let body: any = {}
    if (/potencia-instalada/.test(u)) body = capacityFixture()
    else if (/estructura-generacion/.test(u)) body = mixFixture()
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => body,
    } as any
  }) as any
}

/** Mock que falla todo (red caída) → degradación a catálogo. */
function installFailingFetch() {
  fetchCalls = 0
  globalThis.fetch = (async () => {
    fetchCalls++
    throw new Error('network down')
  }) as any
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

async function run() {
  console.log('\n→ energia · pniec-progress')

  // ── 1. live ──────────────────────────────────────────────────────────────
  await test('live · % renovable del mix + GW capacidad → source live', async () => {
    _clearPniecProgressCache()
    _clearRenovablesCapacityCache()
    installFetchMock()
    const r = await fetchPniecProgress()
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.ok(d.live_count >= 1, 'esperaba al menos 1 métrica live')
    const renov = d.metricas.find((m) => /el[eé]ctrica de origen renovable/i.test(m.metrica))
    assert.ok(renov, 'falta métrica renovable eléctrica')
    assert.equal(renov!.source, 'live')
    // % renovable = (6000+6000)/(6000+6000+8000) = 60%
    assert.equal(renov!.valor_actual, 60)
    // progreso vs objetivo 81% = 60/81*100 ≈ 74.1
    assert.ok(renov!.progreso_pct != null && Math.abs(renov!.progreso_pct - 74.1) < 0.2)

    const solar = d.metricas.find((m) => /solar fotovoltaica/i.test(m.metrica))
    assert.equal(solar!.source, 'live')
    assert.equal(solar!.valor_actual, 38) // 38000 MW → 38 GW
  })

  // ── 2. computeProgress puro ──────────────────────────────────────────────
  await test('computeProgress · ratio, nulos, objetivo 0', () => {
    assert.equal(computeProgress(56, 81), 69.1)
    assert.equal(computeProgress(40.5, 81), 50)
    assert.equal(computeProgress('n/d', 32), null)
    assert.equal(computeProgress(10, 0), null)
    assert.equal(computeProgress(-5, 80), 0) // clamp inferior 0
  })

  // ── 3. renewableShareFromMix puro ────────────────────────────────────────
  await test('renewableShareFromMix · renovable/total, ignora composite/neg', () => {
    const series: ReeSerie[] = [
      { id: '1', title: 'Eólica', type: 'Renovable', last_value: 30, values: [], total: 30 },
      { id: '2', title: 'Nuclear', type: 'No renovable', last_value: 20, values: [], total: 20 },
      { id: '3', title: 'Total', type: 'Generación total', composite: true, last_value: 50, values: [], total: 50 },
      { id: '4', title: 'Bombeo', type: 'No renovable', last_value: -5, values: [], total: -5 },
    ]
    // renov 30 / total (30+20) = 60% (composite y negativo ignorados)
    assert.equal(renewableShareFromMix(series), 60)
    assert.equal(renewableShareFromMix([]), null)
  })

  // ── 4. buildPniecProgress puro ───────────────────────────────────────────
  await test('buildPniecProgress · matchea por nombre + source correcto', () => {
    const d = buildPniecProgress({
      renewable_share_pct: 60,
      solar_gw: 40,
      eolica_gw: 35,
      capacity_is_live: true,
      mix_date: '2026-06-05',
    })
    assert.equal(d.fecha_ref_mix, '2026-06-05')
    const renov = d.metricas.find((m) => /el[eé]ctrica de origen renovable/i.test(m.metrica))!
    assert.equal(renov.valor_actual, 60)
    assert.equal(renov.source, 'live')
    // métricas sin fuente viva (ej. eficiencia) siguen siendo catálogo
    const efic = d.metricas.find((m) => /eficiencia/i.test(m.metrica))
    if (efic) assert.equal(efic.source, 'catalog')
  })

  // ── 5. degradación (red caída) ───────────────────────────────────────────
  await test('degradación · sin fuentes vivas → todo catálogo, ok:true', async () => {
    _clearPniecProgressCache()
    _clearRenovablesCapacityCache()
    installFailingFetch()
    const r = await fetchPniecProgress()
    restoreFetch()

    assert.equal(r.ok, true) // siempre hay objetivos que mostrar
    const d = r.data!
    assert.equal(d.live_count, 0, 'no debería haber métricas live con red caída')
    assert.equal(d.total_count, d.metricas.length)
    // todas catálogo
    assert.ok(d.metricas.every((m) => m.source === 'catalog'))
  })

  // ── 6. caché ─────────────────────────────────────────────────────────────
  await test('caché · 2ª llamada NO refetch', async () => {
    _clearPniecProgressCache()
    _clearRenovablesCapacityCache()
    installFetchMock()
    await fetchPniecProgress()
    const after1 = fetchCalls
    await fetchPniecProgress()
    const after2 = fetchCalls
    restoreFetch()
    assert.ok(after1 >= 1)
    assert.equal(after2, after1, `2ª llamada no debió refetch (was ${after1}, now ${after2})`)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
