/**
 * Sprint TS-Global Gb · Tests de los conectores LIVE gratuitos NUEVOS del
 * agregador de licitaciones (Global Opportunity Graph):
 *   grantsgov · prozorro · austender · secop · dncp
 *
 * NO depende de vitest/jest (patrón tests/unit/tercer-sector/*). SIN red: los
 * parsers puros se prueban con fixtures del shape REAL (verificado 2026-06-07) y
 * el camino fetchX() se prueba mockeando `globalThis.fetch`. Ejecutar:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/tercer-sector/licitaciones-connectors-extra.test.ts
 *
 * Cubre, por conector:
 *   1. parser puro · fixture real → LicitacionNormalizada válida (campos clave)
 *   2. parser puro · entradas inválidas/vacías → sin lanzar, descarta filas
 *   3. fetchX() ok · mock fetch → SourceResult{ok:true}
 *   4. fetchX() degrada · http error / red caída / sin datos → ok:false (sin lanzar)
 *
 * Import dinámico de los módulos para que un fallo de carga de uno no tumbe el
 * harness entero (regla del sprint).
 */
import assert from 'node:assert/strict'
import type { LicitacionNormalizada } from '../../../lib/tercer-sector/licitaciones/types.ts'

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

// ── Mock configurable de globalThis.fetch ───────────────────────────────────
type FetchHandler = (
  url: string,
  init?: { method?: string; body?: string },
) => { status?: number; body?: unknown; text?: string; throwErr?: string }

const _realFetch = globalThis.fetch
function installFetch(handler: FetchHandler) {
  ;(globalThis as { fetch: unknown }).fetch = async (
    url: string,
    init?: { method?: string; body?: string },
  ) => {
    const r = handler(String(url), init)
    if (r.throwErr) throw new Error(r.throwErr)
    const status = r.status ?? 200
    const text = r.text != null ? r.text : r.body != null ? JSON.stringify(r.body) : ''
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => text,
      json: async () => (r.body != null ? r.body : JSON.parse(text || 'null')),
    } as unknown as Response
  }
}
function restoreFetch() {
  ;(globalThis as { fetch: unknown }).fetch = _realFetch
}

/** Aserción común: una LicitacionNormalizada tiene los campos núcleo bien tipados. */
function assertLicValida(l: LicitacionNormalizada, fuente: string) {
  assert.ok(l, 'licitación no nula')
  assert.equal(typeof l.id, 'string')
  assert.ok(l.id.startsWith(`${fuente}:`), `id prefijado por fuente (${l.id})`)
  assert.equal(l.fuente, fuente)
  assert.equal(typeof l.titulo, 'string')
  assert.ok(l.titulo.length > 0, 'título no vacío')
  assert.equal(typeof l.comprador, 'string')
  assert.equal(typeof l.pais, 'string')
  assert.ok(l.pais.length > 0, 'país no vacío')
  assert.equal(typeof l.moneda, 'string')
  assert.ok(Array.isArray(l.documentos), 'documentos es array')
  assert.ok(l.valor_eur === null || typeof l.valor_eur === 'number', 'valor_eur null|number')
  // No se inventan campos: cpv/region/plazo/fecha_pub son string|null.
  assert.ok(l.cpv === null || typeof l.cpv === 'string')
  assert.ok(l.region === null || typeof l.region === 'string')
  assert.ok(l.plazo === null || typeof l.plazo === 'string')
  assert.ok(l.fecha_pub === null || typeof l.fecha_pub === 'string')
}

async function run() {
  console.log('\n→ tercer-sector · licitaciones conectores extra (Gb)\n')

  const grants = await import('../../../lib/tercer-sector/licitaciones/grantsgov.ts')
  const prozorro = await import('../../../lib/tercer-sector/licitaciones/prozorro.ts')
  const austender = await import('../../../lib/tercer-sector/licitaciones/austender.ts')
  const secop = await import('../../../lib/tercer-sector/licitaciones/secop.ts')
  const dncp = await import('../../../lib/tercer-sector/licitaciones/dncp.ts')
  const { _clearLicitacionesCache } = await import(
    '../../../lib/tercer-sector/licitaciones/shared.ts'
  )

  // ════════════════════════════════════ GRANTS.GOV ═══════════════════════════
  const grantsFixture = {
    errorcode: 0,
    msg: 'Webservice Succeeds',
    data: {
      hitCount: 1234,
      oppHits: [
        {
          id: '357305',
          number: 'PAR-25-274',
          title: 'Feasibility Clinical Trials of Mind and Body Interventions',
          agency: 'National Institutes of Health',
          agencyCode: 'HHS-NIH11',
          openDate: '11/21/2024',
          closeDate: '11/17/2026',
          oppStatus: 'posted',
          docType: 'synopsis',
          cfdaList: ['93.213'],
        },
        { number: 'SIN-ID' }, // sin id ni id numérico → usa number como ref
        { foo: 'bar' }, // basura → descartada
      ],
    },
  }

  await test('grantsgov · parseGrantsGov · fixture real → items válidos + total', () => {
    const { items, total } = grants.parseGrantsGov(grantsFixture)
    assert.equal(total, 1234, 'usa hitCount como total')
    assert.equal(items.length, 2, 'descarta la fila basura sin ref')
    const l = items[0]
    assertLicValida(l, 'grantsgov')
    assert.equal(l.id, 'grantsgov:357305')
    assert.equal(l.pais, 'Estados Unidos')
    assert.equal(l.moneda, 'USD')
    assert.equal(l.comprador, 'National Institutes of Health')
    assert.equal(l.valor_eur, null, 'la búsqueda no trae importe → null (sin FX inventado)')
    assert.equal(l.fecha_pub, '2024-11-21', 'openDate MM/DD/YYYY → ISO')
    assert.equal(l.plazo, '2026-11-17', 'closeDate MM/DD/YYYY → ISO')
    assert.ok(l.url.includes('grants.gov/search-results-detail/357305'))
  })

  await test('grantsgov · grantsDate · MM/DD/YYYY, hueco y no parseable', () => {
    assert.equal(grants.grantsDate('01/05/2025'), '2025-01-05')
    assert.equal(grants.grantsDate('1/5/2025'), '2025-01-05')
    assert.equal(grants.grantsDate(''), null)
    assert.equal(grants.grantsDate(null), null)
  })

  await test('grantsgov · parseGrantsGov · entradas inválidas → vacío sin lanzar', () => {
    assert.deepEqual(grants.parseGrantsGov(null), { items: [], total: 0 })
    assert.deepEqual(grants.parseGrantsGov({ data: { oppHits: 'no-array' } }), {
      items: [],
      total: 0,
    })
  })

  await test('grantsgov · fetchGrantsGov · mock POST ok → SourceResult ok', async () => {
    _clearLicitacionesCache()
    let sawPost = false
    installFetch((url, init) => {
      if (url.includes('api.grants.gov') && init?.method === 'POST') sawPost = true
      return { status: 200, body: grantsFixture }
    })
    const res = await grants.fetchGrantsGov({ noCache: true })
    restoreFetch()
    assert.equal(res.ok, true)
    assert.equal(res.fuente, 'grantsgov')
    assert.ok(sawPost, 'usa POST')
    assert.ok(res.licitaciones.length >= 1)
    assert.equal(res.total_reported, 1234)
  })

  await test('grantsgov · fetchGrantsGov · http 500 y red caída → ok:false (no lanza)', async () => {
    _clearLicitacionesCache()
    installFetch(() => ({ status: 500, body: {} }))
    const r1 = await grants.fetchGrantsGov({ noCache: true })
    assert.equal(r1.ok, false)
    assert.equal(r1.error, 'http_500')
    installFetch(() => ({ throwErr: 'ECONNRESET' }))
    const r2 = await grants.fetchGrantsGov({ noCache: true })
    restoreFetch()
    assert.equal(r2.ok, false)
    assert.ok((r2.error || '').length > 0)
  })

  // ════════════════════════════════════ PROZORRO ═════════════════════════════
  const prozorroIdsOnly = {
    data: [
      { id: 'd9345397893e4c1397fff3f238e311cf', dateModified: '2026-06-07T15:54:03+03:00' },
      { id: '9a5e4f9d6bca466aba312aac5e7e123f', dateModified: '2026-06-07T15:53:57+03:00' },
    ],
  }
  const prozorroInline = {
    data: [
      {
        id: 'TENDER-INLINE-1',
        date: '2026-06-01T10:00:00+03:00',
        title: 'Reconstrucción de infraestructura escolar',
        procuringEntity: { name: 'Ministerio de Educación de Ucrania' },
        value: { amount: 5000000, currency: 'UAH' },
        tenderPeriod: { endDate: '2026-07-01T00:00:00+03:00' },
      },
    ],
  }

  await test('prozorro · parseProzorro · feed solo-ids → 0 items, idOnly cuenta', () => {
    const { items, idOnly, total } = prozorro.parseProzorro(prozorroIdsOnly)
    assert.equal(items.length, 0, 'no construimos licitaciones pobres solo-id')
    assert.equal(idOnly, 2)
    assert.equal(total, 2)
  })

  await test('prozorro · parseProzorro · detalle inline → item válido', () => {
    const { items } = prozorro.parseProzorro(prozorroInline)
    assert.equal(items.length, 1)
    const l = items[0]
    assertLicValida(l, 'prozorro')
    assert.equal(l.id, 'prozorro:TENDER-INLINE-1')
    assert.equal(l.pais, 'Ucrania')
    assert.equal(l.moneda, 'UAH')
    assert.equal(l.comprador, 'Ministerio de Educación de Ucrania')
    assert.equal(l.plazo, new Date('2026-07-01T00:00:00+03:00').toISOString())
  })

  await test('prozorro · fetchProzorro · feed solo-ids → degrada honesto', async () => {
    _clearLicitacionesCache()
    installFetch(() => ({ status: 200, body: prozorroIdsOnly }))
    const res = await prozorro.fetchProzorro({ noCache: true })
    restoreFetch()
    assert.equal(res.ok, false, 'sin detalle inline degrada (no N+1)')
    assert.equal(res.error, 'solo_ids_sin_detalle')
  })

  await test('prozorro · fetchProzorro · inline ok + http error', async () => {
    _clearLicitacionesCache()
    installFetch(() => ({ status: 200, body: prozorroInline }))
    const ok = await prozorro.fetchProzorro({ noCache: true })
    assert.equal(ok.ok, true)
    assert.equal(ok.licitaciones.length, 1)
    installFetch(() => ({ status: 503, body: {} }))
    const bad = await prozorro.fetchProzorro({ noCache: true })
    restoreFetch()
    assert.equal(bad.ok, false)
    assert.equal(bad.error, 'http_503')
  })

  // ════════════════════════════════════ AUSTENDER ════════════════════════════
  const austenderFixture = {
    releases: [
      {
        ocid: 'prod-14cc6cbe30464ec1ac773f05d0f50bc5',
        id: 'prod-14cc6cbe30464ec1ac773f05d0f50bc5-d1e180bf',
        date: '2025-06-15T23:35:01Z',
        language: 'EN',
        parties: [
          {
            name: 'Southern Cross University',
            roles: ['supplier'],
            address: { countryName: 'AUSTRALIA' },
          },
          {
            name: 'Australian Centre for International Agricultural Research',
            roles: ['procuringEntity'],
            address: { countryName: 'AUSTRALIA', region: 'ACT' },
          },
        ],
        awards: [{ id: 'A1', status: 'active', date: '2025-06-15T23:35:01Z' }],
        contracts: [
          {
            id: 'CN4158641',
            title: 'Agricultural research services',
            value: { amount: 250000, currency: 'AUD' },
            period: { endDate: '2026-06-15T00:00:00Z' },
          },
        ],
      },
      { id: 'no-ocid-but-has-id', date: '2025-06-10T00:00:00Z' }, // sin contrato → título fallback
      { foo: 'bar' }, // sin ocid/id → descartada
    ],
  }

  await test('austender · parseAustender · fixture real → comprador=procuringEntity + valor contrato', () => {
    const { items } = austender.parseAustender(austenderFixture)
    assert.equal(items.length, 2, 'descarta release sin ocid/id')
    const l = items[0]
    assertLicValida(l, 'austender')
    assert.equal(l.comprador, 'Australian Centre for International Agricultural Research')
    assert.equal(l.titulo, 'Agricultural research services')
    assert.equal(l.pais, 'Australia')
    assert.equal(l.region, 'ACT')
    assert.equal(l.moneda, 'AUD')
    assert.equal(typeof l.valor_eur, 'number', 'AUD está en FX_TO_EUR → convierte')
    assert.equal(l.plazo, new Date('2026-06-15T00:00:00Z').toISOString())
    // El segundo release no tiene contrato → título de respaldo.
    assert.equal(items[1].titulo, 'Contrato · AusTender')
    assert.equal(items[1].pais, 'Australia', 'país por defecto cuando no hay procuringEntity')
  })

  await test('austender · austenderRange · default 30d y override', () => {
    const r = austender.austenderRange({ desde: '2025-01-01', hasta: '2025-02-01' })
    assert.ok(r.from.startsWith('2025-01-01T00:00:00'))
    assert.ok(r.to.startsWith('2025-02-01T23:59:59'))
    const def = austender.austenderRange({})
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(def.from))
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(def.to))
  })

  await test('austender · fetchAustender · ok + sin datos + red caída', async () => {
    _clearLicitacionesCache()
    installFetch(() => ({ status: 200, body: austenderFixture }))
    const ok = await austender.fetchAustender({ noCache: true })
    assert.equal(ok.ok, true)
    assert.ok(ok.licitaciones.length >= 1)
    installFetch(() => ({ status: 200, body: { releases: [] } }))
    const vacio = await austender.fetchAustender({ noCache: true })
    assert.equal(vacio.ok, false)
    assert.equal(vacio.error, 'sin_datos')
    installFetch(() => ({ throwErr: 'AbortError' }))
    const caida = await austender.fetchAustender({ noCache: true })
    restoreFetch()
    assert.equal(caida.ok, false)
  })

  // ════════════════════════════════════ SECOP ════════════════════════════════
  const secopFixture = [
    {
      id_del_proceso: 'CO1.REQ.10360196',
      referencia_del_proceso: 'UNAL-MED-2026-421187',
      nombre_del_procedimiento: 'Suministro de insumos de laboratorio',
      entidad: 'UNIVERSIDAD NACIONAL DE COLOMBIA',
      departamento_entidad: 'Distrito Capital de Bogotá',
      ciudad_entidad: 'Bogotá',
      fecha_de_publicacion_del: '2026-06-01T00:00:00.000',
      precio_base: '4969440',
      valor_total_adjudicacion: '0',
      adjudicado: 'No',
      codigo_principal_de_categoria: 'V1.40161500',
      urlproceso: { url: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?n=1' },
    },
    {
      id_del_proceso: 'CO1.REQ.SIN-DEPTO',
      nombre_del_procedimiento: 'Proceso nacional sin departamento',
      entidad: 'ENTIDAD NACIONAL',
      departamento_entidad: 'No Definido',
      fecha_de_publicacion_del: '2026-05-20T00:00:00.000',
      precio_base: '1000',
      urlproceso: 'no-es-url',
    },
    { foo: 'bar' }, // sin id → descartada
  ]

  await test('secop · parseSecop · fixture real → nivel regional/país + url + COP', () => {
    const { items } = secop.parseSecop(secopFixture)
    assert.equal(items.length, 2, 'descarta registro sin id')
    const conDepto = items[0]
    assertLicValida(conDepto, 'secop')
    assert.equal(conDepto.pais, 'Colombia')
    assert.equal(conDepto.moneda, 'COP')
    assert.equal(conDepto.nivel, 'regional_extranjero', 'con departamento → regional')
    assert.equal(conDepto.region, 'Distrito Capital de Bogotá')
    assert.ok(conDepto.url.startsWith('https://community.secop.gov.co/'))
    const sinDepto = items[1]
    assert.equal(sinDepto.nivel, 'pais_extranjero', '"No Definido" → país, region null')
    assert.equal(sinDepto.region, null)
    assert.ok(sinDepto.url.startsWith('https://'), 'url no-válida cae a PUBLIC_URL')
  })

  await test('secop · secopUrl · objeto {url}, string y ausente', () => {
    assert.equal(
      secop.secopUrl({ urlproceso: { url: 'https://x.co/a' } }),
      'https://x.co/a',
    )
    assert.equal(secop.secopUrl({ urlproceso: 'https://y.co/b' }), 'https://y.co/b')
    assert.ok(secop.secopUrl({}).startsWith('https://'))
  })

  await test('secop · parseSecop · no-array → vacío sin lanzar', () => {
    assert.deepEqual(secop.parseSecop(null), { items: [], total: 0 })
    assert.deepEqual(secop.parseSecop({ not: 'array' }), { items: [], total: 0 })
  })

  await test('secop · fetchSecop · order param + ok + http error', async () => {
    _clearLicitacionesCache()
    let sawOrder = false
    installFetch((url) => {
      if (url.includes('fecha_de_publicacion_del') && /DESC/i.test(decodeURIComponent(url)))
        sawOrder = true
      return { status: 200, body: secopFixture }
    })
    const ok = await secop.fetchSecop({ noCache: true })
    assert.equal(ok.ok, true)
    assert.ok(sawOrder, 'ordena por fecha_de_publicacion_del DESC')
    installFetch(() => ({ status: 404, body: {} }))
    const bad = await secop.fetchSecop({ noCache: true })
    restoreFetch()
    assert.equal(bad.ok, false)
    assert.equal(bad.error, 'http_404')
  })

  // ════════════════════════════════════ DNCP ═════════════════════════════════
  const dncpFixtureRecords = {
    records: [
      {
        ocid: 'ocds-03ad3f-396859-1',
        compiledRelease: {
          ocid: 'ocds-03ad3f-396859-1',
          date: '2026-05-15T12:00:00-04:00',
          language: 'es',
          tender: {
            title: 'Adquisición de medicamentos esenciales',
            value: { amount: 8000000000, currency: 'PYG' },
            tenderPeriod: { endDate: '2026-06-20T23:59:00-04:00' },
          },
          buyer: { name: 'Ministerio de Salud Pública (Paraguay)' },
        },
      },
      { nada: true }, // sin ocid → descartada
    ],
    pagination: { total_count: 42 },
  }

  await test('dncp · parseDncp · records con compiledRelease → item válido + total', () => {
    const { items, total } = dncp.parseDncp(dncpFixtureRecords)
    assert.equal(total, 42, 'usa pagination.total_count')
    assert.equal(items.length, 1, 'descarta record sin ocid')
    const l = items[0]
    assertLicValida(l, 'dncp')
    assert.equal(l.id, 'dncp:ocds-03ad3f-396859-1')
    assert.equal(l.pais, 'Paraguay')
    assert.equal(l.moneda, 'PYG')
    assert.equal(l.comprador, 'Ministerio de Salud Pública (Paraguay)')
    assert.equal(l.titulo, 'Adquisición de medicamentos esenciales')
  })

  await test('dncp · parseDncp · release suelto + array pelado', () => {
    const suelto = {
      releases: [
        {
          ocid: 'ocds-x-1',
          date: '2026-01-01T00:00:00Z',
          tender: { title: 'Obra vial' },
          parties: [{ name: 'Municipalidad', roles: ['procuringEntity'] }],
        },
      ],
    }
    const a = dncp.parseDncp(suelto)
    assert.equal(a.items.length, 1)
    assert.equal(a.items[0].comprador, 'Municipalidad')
    // Array pelado de records.
    const b = dncp.parseDncp([{ ocid: 'ocds-y-2', tender: { title: 'T' } }])
    assert.equal(b.items.length, 1)
    assert.equal(b.items[0].id, 'dncp:ocds-y-2')
  })

  await test('dncp · fetchDncp · 400 filtro_requerido + 401 requiere_token + ok', async () => {
    _clearLicitacionesCache()
    installFetch(() => ({ status: 400, body: { message: 'Al menos un filtro es requerido' } }))
    const r400 = await dncp.fetchDncp({ noCache: true })
    assert.equal(r400.ok, false)
    assert.equal(r400.error, 'filtro_requerido', 'degrada honesto en 400')

    _clearLicitacionesCache()
    installFetch(() => ({ status: 401, body: {} }))
    const r401 = await dncp.fetchDncp({ noCache: true })
    assert.equal(r401.ok, false)
    assert.equal(r401.error, 'requiere_token')

    _clearLicitacionesCache()
    installFetch(() => ({ status: 200, body: dncpFixtureRecords }))
    const ok = await dncp.fetchDncp({ noCache: true })
    restoreFetch()
    assert.equal(ok.ok, true)
    assert.ok(ok.licitaciones.length >= 1)
    assert.equal(ok.total_reported, 42)
  })

  await test('dncp · fetchDncp · red caída → ok:false (no lanza)', async () => {
    _clearLicitacionesCache()
    installFetch(() => ({ throwErr: 'getaddrinfo ENOTFOUND' }))
    const res = await dncp.fetchDncp({ noCache: true })
    restoreFetch()
    assert.equal(res.ok, false)
    assert.ok((res.error || '').length > 0)
  })

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
