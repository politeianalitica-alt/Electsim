/**
 * Sprint Turismo T2-ine · Tests del cliente FRONTUR (lib/turismo/frontur.ts).
 *
 * Mismo harness que tests/unit/energia/*.test.ts (Node, sin vitest):
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings tests/unit/turismo/frontur.test.ts
 *
 * Mock de `globalThis.fetch` con un FIXTURE de la estructura real de la tabla
 * INE 10822 (turistas por país de residencia), capturada vía probe 2026-06-07:
 *   - Serie por país con `Nombre` "<País>. Turista. Dato base. Total Nacional."
 *     y su par "Tasa de variación anual."
 *   - Observaciones con `Fecha` (Unix ms), `Anyo`, `FK_Periodo`, `Valor`.
 *
 * Cubre:
 *   1. serie_total + último periodo + YoY del total (mar-2026 vs mar-2025)
 *   2. por_pais: cuota_pct + yoy_pct + orden descendente
 *   3. "Resto" = total − suma de mercados explícitos (residuo positivo)
 *   4. buildFrontur PURO con fixture (sin red)
 *   5. caché: 2ª llamada idéntica NO refetch
 *   6. fallo de fuente → {ok:false} sin lanzar
 */
import assert from 'node:assert/strict'
import {
  fetchFrontur,
  buildFrontur,
} from '../../../lib/turismo/frontur.ts'
import { _clearTurismoCache } from '../../../lib/turismo/shared.ts'
// (frontur.ts re-exports nothing from shared; import shared directly for cache reset)

let passed = 0
let failed = 0
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok ${name}`)
  } catch (e) {
    failed++
    console.error(`  XX ${name}`)
    console.error('    ', (e as Error).message)
  }
}

// ─── Fixture · tabla 10822 (subset de países) ───────────────────────────────
// Dos meses: marzo 2025 y marzo 2026 (para que el YoY interanual exista).
const TS_MAR_2025 = Date.UTC(2025, 2, 1) // marzo = mes índice 2
const TS_MAR_2026 = Date.UTC(2026, 2, 1)

function obs(ts: number, anyo: number, valor: number | null) {
  return { Fecha: ts, Anyo: anyo, FK_Periodo: 3, Valor: valor }
}

/** Serie "Dato base" de un país con dos observaciones (2025, 2026). */
function paisSerie(pais: string, v2025: number | null, v2026: number | null) {
  return {
    COD: `F_${pais}`,
    Nombre: `${pais}. Turista. Dato base. Total Nacional. `,
    Data: [obs(TS_MAR_2025, 2025, v2025), obs(TS_MAR_2026, 2026, v2026)],
  }
}

/** Serie "Tasa de variación anual" (debe ser ignorada por el parser). */
function paisTasa(pais: string) {
  return {
    COD: `T_${pais}`,
    Nombre: `${pais}. Turista. Tasa de variación anual. Total Nacional. `,
    Data: [obs(TS_MAR_2026, 2026, 5.5)],
  }
}

function fronturFixture() {
  // Total = 1000 (2026), 900 (2025). Mercados explícitos suman 720 → Resto 280.
  return [
    paisSerie('Total', 900, 1000),
    paisTasa('Total'),
    paisSerie('Reino Unido', 180, 200), // YoY +11.1%
    paisTasa('Reino Unido'),
    paisSerie('Alemania', 150, 150), // YoY 0
    paisSerie('Francia', 90, 120),
    paisSerie('Países Nórdicos', 60, 70),
    paisSerie('Italia', 70, 80),
    paisSerie('Países Bajos', 40, 50),
    paisSerie('Estados Unidos de América', 40, 50),
    // (no incluimos Portugal/Suiza/Bélgica/Irlanda → no aparecen)
    paisSerie('Resto de Europa', 80, 90), // residuo de la fuente (no es mercado curado)
    paisSerie('Resto del Mundo', 60, 60),
  ]
}

// ─── Mock fetch ─────────────────────────────────────────────────────────────
const realFetch = globalThis.fetch
let fetchCalls = 0
function installFetchMock(body: unknown, status = 200) {
  fetchCalls = 0
  globalThis.fetch = (async () => {
    fetchCalls++
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      text: async () => JSON.stringify(body),
      json: async () => body,
    } as any
  }) as any
}
function restoreFetch() {
  globalThis.fetch = realFetch
}

async function run() {
  console.log('\n-> turismo · frontur')

  await test('serie_total + último periodo + YoY del total', async () => {
    _clearTurismoCache()
    installFetchMock(fronturFixture())
    const r = await fetchFrontur({ months: 24 })
    restoreFetch()
    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.last_period, '2026-03')
    assert.equal(d.last?.value, 1000)
    // YoY total: (1000-900)/900*100 = 11.11
    assert.equal(d.yoy_pct, 11.11)
    // serie total ascendente con 2 puntos
    assert.equal(d.serie_total.length, 2)
    assert.equal(d.serie_total[0].period, '2025-03')
  })

  await test('por_pais: cuota + YoY + orden descendente', async () => {
    _clearTurismoCache()
    installFetchMock(fronturFixture())
    const r = await fetchFrontur({ months: 24 })
    restoreFetch()
    const d = r.data!
    const uk = d.por_pais.find((p) => p.pais === 'Reino Unido')!
    assert.ok(uk, 'falta Reino Unido')
    assert.equal(uk.turistas, 200)
    assert.equal(uk.cuota_pct, 20) // 200/1000
    // YoY UK: (200-180)/180*100 = 11.11
    assert.equal(uk.yoy_pct, 11.11)
    const de = d.por_pais.find((p) => p.pais === 'Alemania')!
    assert.equal(de.yoy_pct, 0) // 150 vs 150
    // orden descendente por turistas: el primero es el de más turistas
    for (let i = 1; i < d.por_pais.length; i++) {
      const prev = d.por_pais[i - 1].turistas ?? -1
      const cur = d.por_pais[i].turistas ?? -1
      assert.ok(prev >= cur, 'por_pais no está en orden descendente')
    }
  })

  await test('"Resto" = total − suma de mercados explícitos', async () => {
    _clearTurismoCache()
    installFetchMock(fronturFixture())
    const r = await fetchFrontur({ months: 24 })
    restoreFetch()
    const d = r.data!
    const resto = d.por_pais.find((p) => p.pais === 'Resto')!
    assert.ok(resto, 'falta el agregado Resto')
    // Mercados explícitos 2026: UK200+DE150+FR120+Nord70+IT80+NL50+US50 = 720
    // Resto = 1000 - 720 = 280
    assert.equal(resto.turistas, 280)
    assert.equal(resto.cuota_pct, 28)
    // La suma de cuotas (incluyendo Resto) debe rondar 100%.
    const sumaCuotas = d.por_pais.reduce((s, p) => s + (p.cuota_pct ?? 0), 0)
    assert.ok(Math.abs(sumaCuotas - 100) <= 0.5, `cuotas suman ${sumaCuotas}`)
  })

  await test('buildFrontur PURO con fixture (sin red)', () => {
    const d = buildFrontur(fronturFixture())
    assert.equal(d.last?.value, 1000)
    assert.equal(d.por_pais.length, 8) // 7 mercados con dato + Resto
    // EEUU presente con su etiqueta corta
    assert.ok(d.por_pais.some((p) => p.pais === 'Estados Unidos'))
  })

  await test('caché · 2ª llamada idéntica NO refetch', async () => {
    _clearTurismoCache()
    installFetchMock(fronturFixture())
    const r1 = await fetchFrontur({ months: 24 })
    const after1 = fetchCalls
    const r2 = await fetchFrontur({ months: 24 })
    const after2 = fetchCalls
    restoreFetch()
    assert.equal(r1.ok, true)
    assert.equal(r2.ok, true)
    assert.equal(after1, 1, `1ª llamada hizo ${after1} fetch`)
    assert.equal(after2, 1, `2ª NO debió refetch, total=${after2}`)
  })

  await test('fallo de fuente (HTTP 500) → {ok:false} sin lanzar', async () => {
    _clearTurismoCache()
    installFetchMock({}, 500)
    const r = await fetchFrontur({ months: 24, noCache: true })
    restoreFetch()
    assert.equal(r.ok, false)
    assert.equal(r.data, null)
    assert.ok(r.error)
    assert.ok(r.fetched_at)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
