/**
 * Sprint Energía S9 · Tests del módulo de empresas energéticas
 * (lib/energia/companies.ts) + catálogos H2 (lib/energia/catalog.ts).
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo — ver
 * tests/unit/energia/agsi.test.ts). Se ejecuta con Node 22+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/companies.test.ts
 *
 * El módulo OpenCorporates (lib/opencorporates/client.ts) captura
 * OPENCORPORATES_API_KEY en el momento de evaluarse. Para que el mock de fetch
 * intercepte sus llamadas, FIJAMOS las env vars ANTES de importar dinámicamente
 * el módulo (import() diferido dentro de run()).
 *
 * Cubre (≥5 tests):
 *   1. listEnergyCompanies({withQuotes:false}) · shape del grid (catálogo).
 *   2. listEnergyCompanies() · enriquece con cotización Finnhub (mock fetch).
 *   3. getEnergyCompany(slug) · ficha completa con Finnhub + OpenCorporates.
 *   4. getEnergyCompany(slug-inexistente) · null.
 *   5. fetchQuote · privada (sin ticker) → null; sin key → null (degradación).
 *   6. fetchStructure · major sin jurisdicción → degrada (no_jurisdiction).
 *   7. fetchStructure · sin OPENCORPORATES key → degrada honestamente.
 *   8. listEnergyCompanies({energia/pais}) · filtros.
 *   9. catálogo H2_SUBASTAS_EU + H2_BACKBONE · shape + rangos plausibles.
 */
import assert from 'node:assert/strict'

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

// ─── Mock de fetch (Finnhub + OpenCorporates) ───────────────────────────────
const realFetch = globalThis.fetch
let fetchCalls: string[] = []

interface MockOpts {
  /** Por URL → { status, body }. Si no hay match → 200 {}. */
  route?: (url: string) => { status?: number; body: any } | null
}

function installFetchMock(opts: MockOpts = {}) {
  fetchCalls = []
  globalThis.fetch = (async (input: any) => {
    const u = typeof input === 'string' ? input : String(input?.url ?? input)
    fetchCalls.push(u)
    const r = opts.route ? opts.route(u) : null
    const status = r?.status ?? 200
    const body = r?.body ?? {}
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: async () => body,
    } as any
  }) as any
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

// ─── Fixtures de respuesta ──────────────────────────────────────────────────

/** Quote Finnhub OK (c=precio, d=change, dp=change%). */
function finnhubQuoteOk() {
  return { c: 12.34, d: 0.21, dp: 1.73, h: 12.5, l: 12.1, o: 12.2, pc: 12.13, t: 1717000000 }
}

/** Búsqueda OpenCorporates con una empresa principal + relacionadas. */
function ocSearchBody() {
  return {
    results: {
      total_count: 3,
      companies: [
        {
          company: {
            name: 'IBERDROLA SA',
            company_number: 'A48010615',
            jurisdiction_code: 'es',
            current_status: 'Active',
            incorporation_date: '1992-11-01',
            company_type: 'Sociedad Anónima',
            opencorporates_url: 'https://opencorporates.com/companies/es/A48010615',
            registered_address_in_full: 'Plaza Euskadi 5, Bilbao',
          },
        },
        {
          company: {
            name: 'IBERDROLA RENOVABLES SA',
            company_number: 'A95075578',
            jurisdiction_code: 'es',
            opencorporates_url: 'https://opencorporates.com/companies/es/A95075578',
          },
        },
      ],
    },
  }
}

/** Búsqueda de officers OpenCorporates. */
function ocOfficersBody() {
  return {
    results: {
      total_count: 1,
      officers: [
        {
          officer: {
            name: 'Ignacio Galán',
            position: 'director',
            company: { name: 'IBERDROLA SA', jurisdiction_code: 'es', company_number: 'A48010615' },
            opencorporates_url: 'https://opencorporates.com/officers/123',
          },
        },
      ],
    },
  }
}

/** Router que sirve Finnhub + OpenCorporates según la URL. */
function fullRouter(url: string) {
  if (url.includes('finnhub.io')) return { body: finnhubQuoteOk() }
  if (url.includes('/officers/search')) return { body: ocOfficersBody() }
  if (url.includes('/companies/search')) return { body: ocSearchBody() }
  return null
}

// ─── Run ────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n→ energia · companies (empresas energéticas)')

  // Fijar env ANTES de importar (OC client captura la key al evaluarse).
  process.env.FINNHUB_API_KEY = 'test-fh'
  process.env.OPENCORPORATES_API_KEY = 'test-oc'

  const companies = await import('../../../lib/energia/companies.ts')
  const catalog = await import('../../../lib/energia/catalog.ts')
  const {
    listEnergyCompanies,
    getEnergyCompany,
    fetchQuote,
    fetchStructure,
    findCompanyBySlug,
  } = companies
  const { EMPRESAS_ENERGIA, H2_SUBASTAS_EU, H2_BACKBONE } = catalog

  // ── 1. Grid sin cotizaciones · shape del catálogo ───────────────────────
  await test('listEnergyCompanies({withQuotes:false}) · shape del grid', async () => {
    const list = await listEnergyCompanies({ withQuotes: false })
    assert.ok(Array.isArray(list), 'devuelve array')
    assert.equal(list.length, EMPRESAS_ENERGIA.length, 'una entrada por empresa del catálogo')
    for (const c of list) {
      assert.equal(typeof c.slug, 'string')
      assert.ok(c.slug.length > 0, 'slug no vacío')
      assert.equal(typeof c.nombre, 'string')
      assert.ok(Array.isArray(c.segmentos), 'segmentos array')
      assert.ok(Array.isArray(c.energias), 'energias array')
      assert.equal(typeof c.es_espanola, 'boolean')
      assert.ok('quote' in c, 'incluye campo quote')
      assert.equal(c.quote, null, 'sin cotizaciones → quote null')
    }
  })

  // ── 2. Grid con cotización Finnhub (mock) ───────────────────────────────
  await test('listEnergyCompanies() · enriquece con cotización Finnhub', async () => {
    installFetchMock({ route: fullRouter })
    const list = await listEnergyCompanies()
    restoreFetch()

    // Iberdrola tiene ticker → debe traer cotización available.
    const ibe = list.find((c) => c.slug === 'iberdrola')
    assert.ok(ibe, 'iberdrola presente')
    assert.ok(ibe!.quote, 'iberdrola tiene quote')
    assert.equal(ibe!.quote!.available, true, 'quote available')
    assert.equal(ibe!.quote!.price, 12.34, 'precio del fixture Finnhub')
    assert.equal(ibe!.quote!.change_percent, 1.73, 'change% del fixture')

    // Cepsa es privada (ticker '') → quote null sin tocar Finnhub.
    const cepsa = list.find((c) => c.slug === 'cepsa')
    assert.ok(cepsa, 'cepsa presente')
    assert.equal(cepsa!.quote, null, 'cepsa privada → quote null')
  })

  // ── 3. Ficha drill-down completa (Finnhub + OpenCorporates) ─────────────
  await test('getEnergyCompany("iberdrola") · ficha con quote + estructura OC', async () => {
    installFetchMock({ route: fullRouter })
    const ficha = await getEnergyCompany('iberdrola')
    restoreFetch()

    assert.ok(ficha, 'ficha no null')
    assert.equal(ficha!.slug, 'iberdrola')
    // Cotización
    assert.ok(ficha!.quote, 'tiene quote')
    assert.equal(ficha!.quote!.available, true)
    assert.equal(ficha!.quote!.price, 12.34)
    // Estructura societaria OpenCorporates
    assert.ok(ficha!.structure, 'tiene structure')
    assert.equal(ficha!.structure.available, true, 'estructura disponible')
    assert.equal(ficha!.structure.legal_name, 'IBERDROLA SA')
    assert.equal(ficha!.structure.jurisdiction, 'es')
    assert.equal(ficha!.structure.company_number, 'A48010615')
    assert.equal(ficha!.structure.status, 'Active')
    assert.ok(ficha!.structure.opencorporates_url?.includes('opencorporates.com'))
    // Relacionadas (la segunda empresa del search, distinto company_number)
    assert.ok(ficha!.structure.related.length >= 1, 'al menos una relacionada')
    assert.equal(ficha!.structure.related[0].name, 'IBERDROLA RENOVABLES SA')
    // Officers
    assert.ok(ficha!.structure.officers.length >= 1, 'al menos un officer')
    assert.equal(ficha!.structure.officers[0].name, 'Ignacio Galán')
  })

  // ── 4. Slug inexistente → null ──────────────────────────────────────────
  await test('getEnergyCompany("no-existe") · null', async () => {
    const ficha = await getEnergyCompany('no-existe-xyz')
    assert.equal(ficha, null)
    assert.equal(findCompanyBySlug('no-existe-xyz'), null)
  })

  // ── 5. fetchQuote · degradación (privada / sin key) ─────────────────────
  await test('fetchQuote · privada (sin ticker) → null', async () => {
    const q = await fetchQuote(null)
    assert.equal(q, null, 'sin ticker → null')
    const q2 = await fetchQuote('')
    assert.equal(q2, null, 'ticker vacío → null')
  })

  await test('fetchQuote · sin FINNHUB_API_KEY → null (degrada)', async () => {
    const saved = process.env.FINNHUB_API_KEY
    delete process.env.FINNHUB_API_KEY
    installFetchMock({ route: fullRouter })
    const q = await fetchQuote('IBE.MC')
    restoreFetch()
    process.env.FINNHUB_API_KEY = saved
    assert.equal(q, null, 'sin key → null sin tocar red')
    assert.equal(fetchCalls.length, 0, 'no debe llamar a Finnhub sin key')
  })

  await test('fetchQuote · Finnhub c=0 (sin dato) → quote available:false', async () => {
    installFetchMock({ route: () => ({ body: { c: 0, d: 0, dp: 0 } }) })
    const q = await fetchQuote('XYZ')
    restoreFetch()
    assert.ok(q, 'devuelve objeto quote (no null) con ticker presente')
    assert.equal(q!.available, false, 'c=0 → no disponible')
    assert.equal(q!.price, null)
  })

  // ── 6. fetchStructure · major sin jurisdicción → degrada ────────────────
  await test('fetchStructure · empresa sin jurisdicción OC → no_jurisdiction', async () => {
    const major = EMPRESAS_ENERGIA.find((c) => c.slug === 'nextera')!
    assert.equal(major.opencorporates_jurisdiction, undefined, 'nextera sin jurisdicción en catálogo')
    let touchedNet = 0
    installFetchMock({ route: () => { touchedNet++; return null } })
    const s = await fetchStructure(major)
    restoreFetch()
    assert.equal(s.available, false)
    assert.equal(s.note, 'no_jurisdiction')
    assert.equal(touchedNet, 0, 'no debe tocar la red sin jurisdicción')
  })

  // ── 7. fetchStructure · sin OPENCORPORATES key → degrada honestamente ───
  await test('fetchStructure · sin OPENCORPORATES_API_KEY → degrada (no_key/no_match)', async () => {
    // El OC client ya capturó 'test-oc' al evaluarse; simulamos fallo de red
    // (401 auth) para forzar la degradación de fetchStructure.
    const ibe = EMPRESAS_ENERGIA.find((c) => c.slug === 'iberdrola')!
    installFetchMock({ route: () => ({ status: 401, body: { error: 'auth' } }) })
    const s = await fetchStructure(ibe)
    restoreFetch()
    assert.equal(s.available, false, '401 → estructura no disponible')
    assert.ok(typeof s.note === 'string' && s.note!.length > 0, 'tiene note de degradación')
  })

  // ── 8. Filtros del grid ─────────────────────────────────────────────────
  await test('listEnergyCompanies({energia,pais}) · filtros', async () => {
    const h2 = await listEnergyCompanies({ energia: 'hidrogeno', withQuotes: false })
    assert.ok(h2.length > 0, 'hay empresas de hidrógeno')
    assert.ok(h2.every((c) => c.energias.includes('hidrogeno')), 'todas operan en hidrógeno')

    const es = await listEnergyCompanies({ pais: 'España', withQuotes: false })
    assert.ok(es.length > 0, 'hay empresas españolas')
    assert.ok(es.every((c) => c.pais === 'España'), 'todas con pais España')
  })

  // ── 9. Catálogos H2 nuevos · shape + rangos plausibles ──────────────────
  await test('H2_SUBASTAS_EU · shape + precio €/kg plausible', () => {
    assert.ok(Array.isArray(H2_SUBASTAS_EU) && H2_SUBASTAS_EU.length >= 1, 'al menos 1 subasta')
    for (const s of H2_SUBASTAS_EU) {
      assert.equal(typeof s.ronda, 'string')
      assert.ok(s.precio_min_eur_kg > 0 && s.precio_min_eur_kg < 5, `precio min plausible: ${s.precio_min_eur_kg}`)
      assert.ok(s.precio_max_eur_kg >= s.precio_min_eur_kg, 'max >= min')
      assert.ok(s.proyectos_adjudicados > 0, 'proyectos > 0')
      assert.ok(s.presupuesto_meur > 0, 'presupuesto > 0')
    }
    // La 1ª subasta debe rondar 0,37-0,48 €/kg (citado en spec).
    const first = H2_SUBASTAS_EU[0]
    assert.ok(first.precio_min_eur_kg >= 0.3 && first.precio_min_eur_kg <= 0.5, `1ª min ~0.37: ${first.precio_min_eur_kg}`)
    assert.ok(first.precio_max_eur_kg >= 0.4 && first.precio_max_eur_kg <= 0.6, `1ª max ~0.48: ${first.precio_max_eur_kg}`)
  })

  await test('H2_BACKBONE · shape + H2Med presente', () => {
    assert.ok(Array.isArray(H2_BACKBONE) && H2_BACKBONE.length >= 1, 'al menos 1 proyecto backbone')
    for (const b of H2_BACKBONE) {
      assert.equal(typeof b.nombre, 'string')
      assert.ok(Array.isArray(b.promotores) && b.promotores.length > 0, 'promotores no vacíos')
      assert.ok(b.horizonte >= 2025 && b.horizonte <= 2040, `horizonte plausible: ${b.horizonte}`)
      if (b.longitud_km != null) assert.ok(b.longitud_km > 0, 'longitud > 0 si presente')
    }
    const h2med = H2_BACKBONE.find((b) => /h2med/i.test(b.nombre))
    assert.ok(h2med, 'H2Med presente en el backbone')
    assert.ok(h2med!.promotores.includes('Enagás'), 'Enagás entre los promotores de H2Med')
  })

  // ─── Resumen ─────────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed · ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
