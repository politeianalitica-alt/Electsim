/**
 * Tests del cliente DSA Transparency Database (lib/medios/dsa-transparency.ts).
 *
 * NO depende de vitest/jest (mismo patrón que tests/unit/energia/*.test.ts). Se
 * ejecuta con Node:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/medios/dsa-transparency.test.ts
 *
 * Mock de `globalThis.fetch` con FIXTURES de las formas REALES confirmadas en la
 * documentación oficial de la Research API (2026-06-06):
 *   Base: https://transparency.dsa.ec.europa.eu/api/v1/research
 *   Auth: header `Authorization: Bearer <key>`. Sin auth → 302 → /login.
 *   - GET  /platforms                 → [{ platform_id, platform_name, vlop }]
 *   - GET  /aggregates/{date}         → { aggregates, total, total_aggregates, date }
 *   - GET  /aggregates/{date}/platform_id → aggregates:[{platform_id, permutation,
 *                                             platform_name, total}]
 *   - GET  /aggregates/{date}/category    → aggregates:[{category, permutation, total}]
 *   - POST /count                     → { status:"success", data:{ count, _shards } }
 *
 * Cubre (≥4 tests):
 *   1. parseDsaPlatforms · shape real /platforms (VLOPs primero)
 *   2. parseDsaByPlatform · top-N por volumen + platform_name enriquecido
 *   3. parseDsaByCategory · etiqueta ES + flag político (desinfo/odio/seguridad)
 *   4. parseDsaCount · count en data.count (y fallback plano)
 *   5. parseDsaDailyTotal · total del envelope de /aggregates/{date}
 *   6. fetchDsaByPlatform · integración con fetch mock + header Bearer
 *   7. key ausente → {ok:false} sin tocar la red
 *   8. auth fallida (302 login) → {ok:false}
 *   9. caché · 2ª llamada idéntica NO refetch
 *  10. fetchDsaSpain · POST /count con filtro territorial_scope=ES
 *  11. helpers de fecha (safeDate / defaultDate) + taxonomía de categorías
 */
import assert from 'node:assert/strict'
import {
  fetchDsaPlatforms,
  fetchDsaByPlatform,
  fetchDsaByCategory,
  fetchDsaDailyTotal,
  fetchDsaSpain,
  parseDsaPlatforms,
  parseDsaByPlatform,
  parseDsaByCategory,
  parseDsaCount,
  parseDsaDailyTotal,
  parseCount,
  dsaCategoryLabel,
  safeDate,
  defaultDate,
  DSA_POLITICAL_CATEGORIES,
  _clearDsaCache,
} from '../../../lib/medios/dsa-transparency.ts'

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
      console.error('    ', (e as Error).stack!.split('\n').slice(1, 3).join('\n     '))
  }
}

// ─── FIXTURES (formas reales) ───────────────────────────────────────────────

/** GET /platforms · array directo con VLOP flag. */
function platformsFixture() {
  return [
    { platform_id: 5, platform_name: 'Maldita.es', vlop: false },
    { platform_id: 22, platform_name: 'X', vlop: true },
    { platform_id: 13, platform_name: 'TikTok', vlop: true },
    { platform_id: 7, platform_name: 'Facebook', vlop: true },
  ]
}

/** GET /aggregates/{date} · total del día en el envelope. */
function dailyFixture(date: string) {
  return {
    aggregates: [
      { received_date: date, permutation: `received_date:${date}`, total: 23209607 },
    ],
    total: 23209607,
    total_aggregates: 1,
    date,
  }
}

/**
 * GET /aggregates/{date}/platform_id · cada item trae platform_id, permutation,
 * platform_name (la API lo enriquece) y total. Desordenado a propósito.
 */
function byPlatformFixture() {
  return {
    aggregates: [
      { platform_id: 7, permutation: 'platform_id:7', platform_name: 'Facebook', total: 1200000 },
      { platform_id: 22, permutation: 'platform_id:22', platform_name: 'X', total: 2783000 },
      { platform_id: 13, permutation: 'platform_id:13', platform_name: 'TikTok', total: 5400000 },
      // item sin platform_name → debe caer a "Plataforma <id>"
      { platform_id: 99, permutation: 'platform_id:99', total: 4200 },
    ],
    total: 9387200,
    total_aggregates: 4,
    date: '2026-05-28',
  }
}

/** GET /aggregates/{date}/category · category + total. */
function byCategoryFixture() {
  return {
    aggregates: [
      { category: 'STATEMENT_CATEGORY_SCAMS_AND_FRAUD', permutation: 'x', total: 8000000 },
      { category: 'STATEMENT_CATEGORY_NEGATIVE_EFFECTS_ON_CIVIC_DISCOURSE_OR_ELECTIONS', permutation: 'x', total: 1500000 },
      { category: 'STATEMENT_CATEGORY_ILLEGAL_OR_HARMFUL_SPEECH', permutation: 'x', total: 900000 },
      { category: 'STATEMENT_CATEGORY_PROTECTION_OF_MINORS', permutation: 'x', total: 600000 },
    ],
    total: 11000000,
    total_aggregates: 4,
    date: '2026-05-28',
  }
}

/** POST /count · count anidado en data.count. */
function countFixture(n: number) {
  return { status: 'success', data: { count: n, _shards: { total: 640, successful: 640 } } }
}

// ─── Mock de fetch ──────────────────────────────────────────────────────────
const realFetch = globalThis.fetch
let fetchCalls = 0
let lastUrl = ''
let lastHeaders: Record<string, any> = {}
let lastBody: any = null
let lastMethod = 'GET'

interface MockOpts {
  status?: number
  contentType?: string
  bodyForUrl?: (url: string, init?: any) => any
}

function installFetchMock(opts: MockOpts = {}) {
  fetchCalls = 0
  lastUrl = ''
  lastHeaders = {}
  lastBody = null
  lastMethod = 'GET'
  globalThis.fetch = (async (input: any, init?: any) => {
    fetchCalls++
    const u = typeof input === 'string' ? input : String(input?.url ?? input)
    lastUrl = u
    lastHeaders = (init?.headers ?? {}) as Record<string, any>
    lastMethod = (init?.method ?? 'GET') as string
    lastBody = init?.body ? JSON.parse(init.body) : null
    const status = opts.status ?? 200
    const ct = opts.contentType ?? 'application/json'
    const body = opts.bodyForUrl ? opts.bodyForUrl(u, init) : {}
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? ct : null) },
      json: async () => body,
    } as any
  }) as any
}

/** Router de fixtures por URL + método. */
function routeFixture(url: string, init?: any): any {
  if (/\/count$/.test(url)) {
    const body = init?.body ? JSON.parse(init.body) : {}
    // filtro ES → 12345; vacío (histórico total) → 2101063995
    const hasEs = JSON.stringify(body).includes('"ES"')
    return countFixture(hasEs ? 12345 : 2101063995)
  }
  if (/\/platforms$/.test(url)) return platformsFixture()
  if (/\/aggregates\/[\d-]+\/platform_id$/.test(url)) return byPlatformFixture()
  if (/\/aggregates\/[\d-]+\/category$/.test(url)) return byCategoryFixture()
  if (/\/aggregates\/[\d-]+$/.test(url)) {
    const m = url.match(/\/aggregates\/([\d-]+)$/)
    return dailyFixture(m ? m[1] : '2026-05-28')
  }
  return {}
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

// ─── Run ────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n→ medios · dsa-transparency (moderación de plataformas DSA)')

  // ── 1. parseDsaPlatforms ────────────────────────────────────────────────
  await test('parseDsaPlatforms · shape real /platforms · VLOPs primero', () => {
    const out = parseDsaPlatforms(platformsFixture())
    assert.equal(out.length, 4)
    // VLOPs primero (X, TikTok, Facebook), luego no-VLOP (Maldita.es)
    assert.equal(out[out.length - 1].platform_name, 'Maldita.es')
    assert.equal(out[out.length - 1].vlop, false)
    assert.ok(out.slice(0, 3).every((p) => p.vlop === true), 'los 3 primeros deben ser VLOP')
    // campos tipados
    const x = out.find((p) => p.platform_name === 'X')!
    assert.equal(x.platform_id, 22)
    assert.equal(x.vlop, true)
    // tolera envelope { data:[...] }
    assert.equal(parseDsaPlatforms({ data: platformsFixture() }).length, 4)
    // basura → []
    assert.deepEqual(parseDsaPlatforms(null), [])
  })

  // ── 2. parseDsaByPlatform · top-N + nombre enriquecido ──────────────────
  await test('parseDsaByPlatform · ordena desc + top-N + fallback de nombre', () => {
    const out = parseDsaByPlatform(byPlatformFixture(), 3)
    assert.equal(out.length, 3, 'debe recortar a top-3')
    // orden descendente por total: TikTok(5.4M) > X(2.78M) > Facebook(1.2M)
    assert.equal(out[0].platform_name, 'TikTok')
    assert.equal(out[0].total, 5400000)
    assert.equal(out[1].platform_name, 'X')
    assert.equal(out[2].platform_name, 'Facebook')
    // sin recorte: el item sin nombre cae a "Plataforma 99"
    const all = parseDsaByPlatform(byPlatformFixture(), 99)
    const nameless = all.find((p) => p.platform_id === 99)!
    assert.equal(nameless.platform_name, 'Plataforma 99')
  })

  // ── 3. parseDsaByCategory · etiqueta ES + flag político ─────────────────
  await test('parseDsaByCategory · etiqueta ES + marca categorías políticas', () => {
    const out = parseDsaByCategory(byCategoryFixture())
    assert.equal(out.length, 4)
    // ordenado desc: scams primero
    assert.equal(out[0].category, 'STATEMENT_CATEGORY_SCAMS_AND_FRAUD')
    assert.equal(out[0].political, false)
    // desinformación electoral → político + etiqueta legible
    const civic = out.find((c) => c.category === 'STATEMENT_CATEGORY_NEGATIVE_EFFECTS_ON_CIVIC_DISCOURSE_OR_ELECTIONS')!
    assert.equal(civic.political, true)
    assert.equal(civic.label, 'Discurso cívico y elecciones')
    // discurso ilegal/odio → político
    const speech = out.find((c) => c.category === 'STATEMENT_CATEGORY_ILLEGAL_OR_HARMFUL_SPEECH')!
    assert.equal(speech.political, true)
    // menores → NO político
    const minors = out.find((c) => c.category === 'STATEMENT_CATEGORY_PROTECTION_OF_MINORS')!
    assert.equal(minors.political, false)
  })

  // ── 4. parseDsaCount · data.count + fallback plano ──────────────────────
  await test('parseDsaCount · lee data.count (forma real) y {count} plano', () => {
    assert.equal(parseDsaCount(countFixture(2101063995)), 2101063995)
    assert.equal(parseDsaCount({ count: 42 }), 42) // fallback plano
    assert.equal(parseDsaCount({}), null)
    assert.equal(parseDsaCount(null), null)
    // parseCount tolera string/number/basura
    assert.equal(parseCount('123'), 123)
    assert.equal(parseCount(7), 7)
    assert.equal(parseCount('x'), null)
    assert.equal(parseCount(null), null)
  })

  // ── 5. parseDsaDailyTotal ───────────────────────────────────────────────
  await test('parseDsaDailyTotal · total del envelope /aggregates/{date}', () => {
    const d = parseDsaDailyTotal(dailyFixture('2026-05-28'), '2026-05-28')
    assert.ok(d)
    assert.equal(d!.total, 23209607)
    assert.equal(d!.date, '2026-05-28')
    // sin total → null
    assert.equal(parseDsaDailyTotal({ date: '2026-05-28' }, '2026-05-28'), null)
  })

  // ── 6. fetchDsaByPlatform · integración + header Bearer ─────────────────
  await test('fetchDsaByPlatform · agrupa por platform_id + envía Bearer', async () => {
    process.env.DSA_TRANSPARENCY_API_KEY = 'secret-123'
    _clearDsaCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchDsaByPlatform('2026-05-28', 5)
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    assert.ok(r.data)
    assert.equal(r.data![0].platform_name, 'TikTok')
    // agrupa por platform_id (NO platform_name)
    assert.match(lastUrl, /\/aggregates\/2026-05-28\/platform_id$/)
    // Authorization: Bearer con la key · la key NUNCA en la URL
    assert.equal((lastHeaders as any).Authorization, 'Bearer secret-123')
    assert.ok(!/secret-123/.test(lastUrl), 'la key no debe ir en la query string')
  })

  // ── 7. Key ausente ──────────────────────────────────────────────────────
  await test('key ausente · {ok:false} sin tocar la red', async () => {
    delete process.env.DSA_TRANSPARENCY_API_KEY
    _clearDsaCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchDsaPlatforms()
    const calls = fetchCalls
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /no_key|DSA_TRANSPARENCY_API_KEY/)
    assert.equal(calls, 0, 'no debió llamar a fetch sin key')
    assert.ok(r.fetched_at)
  })

  // ── 8. Auth fallida · 302 → login ───────────────────────────────────────
  await test('auth fallida (302 login) → {ok:false} sin lanzar', async () => {
    process.env.DSA_TRANSPARENCY_API_KEY = 'bad-key'
    _clearDsaCache()
    installFetchMock({ status: 302, contentType: 'text/html', bodyForUrl: () => '<html>login</html>' })

    const r = await fetchDsaPlatforms()
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /unauthorized|HTTP 302/)
  })

  // ── 9. Caché ────────────────────────────────────────────────────────────
  await test('caché · 2ª llamada idéntica NO refetch', async () => {
    process.env.DSA_TRANSPARENCY_API_KEY = 'k'
    _clearDsaCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r1 = await fetchDsaByCategory('2026-05-28')
    const after1 = fetchCalls
    const r2 = await fetchDsaByCategory('2026-05-28')
    const after2 = fetchCalls
    restoreFetch()

    assert.equal(r1.ok, true, r1.error)
    assert.equal(r2.ok, true)
    assert.equal(after1, 1, `1ª llamada debió hacer 1 fetch, hizo ${after1}`)
    assert.equal(after2, 1, `2ª llamada NO debió refetch, total=${after2}`)
    assert.deepEqual(r1.data, r2.data)
  })

  // ── 10. fetchDsaSpain · POST /count con filtro territorial_scope=ES ──────
  await test('fetchDsaSpain · POST /count filtra territorial_scope=ES', async () => {
    process.env.DSA_TRANSPARENCY_API_KEY = 'k'
    _clearDsaCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchDsaSpain()
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    assert.equal(r.data, 12345) // el router devuelve 12345 si el body lleva "ES"
    assert.equal(lastMethod, 'POST')
    assert.match(lastUrl, /\/count$/)
    // el cuerpo debe filtrar por territorial_scope = ES
    const bodyStr = JSON.stringify(lastBody)
    assert.match(bodyStr, /territorial_scope/)
    assert.match(bodyStr, /"ES"/)
  })

  // ── 11. Daily total + helpers de fecha + taxonomía ──────────────────────
  await test('fetchDsaDailyTotal + safeDate/defaultDate + taxonomía', async () => {
    process.env.DSA_TRANSPARENCY_API_KEY = 'k'
    _clearDsaCache()
    installFetchMock({ bodyForUrl: routeFixture })
    const r = await fetchDsaDailyTotal('2026-05-28')
    restoreFetch()
    assert.equal(r.ok, true, r.error)
    assert.equal(r.data!.total, 23209607)

    // safeDate valida formato; entradas inválidas → defaultDate (hoy-2)
    assert.equal(safeDate('2024-01-15'), '2024-01-15')
    assert.match(safeDate('basura'), /^\d{4}-\d{2}-\d{2}$/)
    assert.match(safeDate(null), /^\d{4}-\d{2}-\d{2}$/)
    assert.match(defaultDate(), /^\d{4}-\d{2}-\d{2}$/)

    // taxonomía: la categoría de desinfo electoral está marcada como política
    assert.ok(DSA_POLITICAL_CATEGORIES.has('STATEMENT_CATEGORY_NEGATIVE_EFFECTS_ON_CIVIC_DISCOURSE_OR_ELECTIONS'))
    // etiqueta legible con fallback para códigos no mapeados
    assert.equal(dsaCategoryLabel('STATEMENT_CATEGORY_VIOLENCE'), 'Violencia')
    assert.equal(dsaCategoryLabel('STATEMENT_CATEGORY_FOO_BAR'), 'Foo bar')
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
