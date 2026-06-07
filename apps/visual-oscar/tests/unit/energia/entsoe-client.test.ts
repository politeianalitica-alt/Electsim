/**
 * Sprint Energía S3 · Tests del cliente ENTSO-E (lib/entsoe/client.ts).
 *
 * NO depende de vitest/jest (mismo patrón que tests/unit/energia/ember-client.test.ts).
 * Se ejecuta con Node:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/energia/entsoe-client.test.ts
 *
 * FIXTURES con XML real de ENTSO-E Transparency Platform:
 *   - Publication_MarketDocument (A44 day-ahead prices) · estructura
 *     TimeSeries → Period → timeInterval/resolution(PT60M) → Point(position,
 *     price.amount). Tomado de la estructura canónica del API guide ENTSO-E.
 *   - GL_MarketDocument (A75 generation per type) · con MktPSRType/psrType y
 *     quantity, incluyendo posiciones omitidas (forward-fill).
 *   - Publication_MarketDocument (A11 physical flow) con quantity.
 *   - Acknowledgement_MarketDocument · documento de error (HTTP 200 + Reason).
 *
 * Auth: ENTSOE_SECURITY_TOKEN (o legacy ENTSOE_API_KEY). Sin token → el cliente
 * devuelve {ok:false} sin tocar la red, con mensaje claro.
 *
 * Cubre:
 *   1. parser precios A44 · TimeSeries/Period/Point + estadísticos
 *   2. parser generación A75 · agregación por psrType + etiquetas + orden
 *   3. parser flujos A11 · saldo neto bidireccional + dirección
 *   4. forward-fill de posiciones omitidas (A11/A75)
 *   5. zonas EIC correctas en zones.ts (las 7 verificadas)
 *   6. token ausente → {ok:false} con mensaje claro, sin lanzar ni red
 *   7. solo user/pass (falta token) → mensaje específico pidiendo el token
 *   8. XML malformado → degradación limpia (ok:false / sin_datos), sin lanzar
 *   9. Acknowledgement (error lógico HTTP 200) → ok:false con razón
 *  10. caché 1h · 2ª llamada idéntica NO refetch
 */
import assert from 'node:assert/strict'
import {
  fetchDayAheadPrices,
  fetchCrossBorderFlows,
  fetchGeneration,
  parseTimeSeries,
  hasEntsoeToken,
  onlyFileLibraryCreds,
  periodForDays,
  _clearEntsoeCache,
} from '../../../lib/entsoe/client.ts'
import { ENTSOE_ZONES, resolveZone, zoneEic } from '../../../lib/entsoe/zones.ts'

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

// ─── FIXTURES (XML real ENTSO-E) ────────────────────────────────────────────

/**
 * A44 day-ahead prices · Publication_MarketDocument.
 * Estructura canónica del ENTSO-E API guide: 1 TimeSeries, 1 Period horario
 * (PT60M) con 4 Points (4 horas) en €/MWh.
 */
const PRICES_A44_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Publication_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:0">
  <mRID>abc123</mRID>
  <type>A44</type>
  <TimeSeries>
    <mRID>1</mRID>
    <businessType>A62</businessType>
    <in_Domain.mRID codingScheme="A01">10YES-REE------0</in_Domain.mRID>
    <out_Domain.mRID codingScheme="A01">10YES-REE------0</out_Domain.mRID>
    <currency_Unit.name>EUR</currency_Unit.name>
    <price_Measure_Unit.name>MWH</price_Measure_Unit.name>
    <Period>
      <timeInterval>
        <start>2026-06-01T22:00Z</start>
        <end>2026-06-02T02:00Z</end>
      </timeInterval>
      <resolution>PT60M</resolution>
      <Point>
        <position>1</position>
        <price.amount>40.50</price.amount>
      </Point>
      <Point>
        <position>2</position>
        <price.amount>35.25</price.amount>
      </Point>
      <Point>
        <position>3</position>
        <price.amount>50.00</price.amount>
      </Point>
      <Point>
        <position>4</position>
        <price.amount>60.75</price.amount>
      </Point>
    </Period>
  </TimeSeries>
</Publication_MarketDocument>`

/**
 * A75 generation per type · GL_MarketDocument. Dos TimeSeries (Solar B16,
 * Eólica onshore B19), cada una con MktPSRType. La serie B16 OMITE la posición
 * 3 (mismo valor que pos 2) → debe rellenarse con forward-fill.
 */
const GENERATION_A75_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GL_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0">
  <mRID>gen1</mRID>
  <type>A75</type>
  <TimeSeries>
    <mRID>1</mRID>
    <MktPSRType>
      <psrType>B16</psrType>
    </MktPSRType>
    <Period>
      <timeInterval>
        <start>2026-06-02T00:00Z</start>
        <end>2026-06-02T03:00Z</end>
      </timeInterval>
      <resolution>PT60M</resolution>
      <Point>
        <position>1</position>
        <quantity>1000</quantity>
      </Point>
      <Point>
        <position>2</position>
        <quantity>1500</quantity>
      </Point>
      <Point>
        <position>4</position>
        <quantity>500</quantity>
      </Point>
    </Period>
  </TimeSeries>
  <TimeSeries>
    <mRID>2</mRID>
    <MktPSRType>
      <psrType>B19</psrType>
    </MktPSRType>
    <Period>
      <timeInterval>
        <start>2026-06-02T00:00Z</start>
        <end>2026-06-02T03:00Z</end>
      </timeInterval>
      <resolution>PT60M</resolution>
      <Point>
        <position>1</position>
        <quantity>2000</quantity>
      </Point>
      <Point>
        <position>2</position>
        <quantity>2200</quantity>
      </Point>
      <Point>
        <position>3</position>
        <quantity>2100</quantity>
      </Point>
      <Point>
        <position>4</position>
        <quantity>1900</quantity>
      </Point>
    </Period>
  </TimeSeries>
</GL_MarketDocument>`

/** A11 physical flow ES→FR · Publication_MarketDocument con quantity. */
const FLOW_ES_FR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Publication_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:0">
  <type>A11</type>
  <TimeSeries>
    <mRID>1</mRID>
    <in_Domain.mRID codingScheme="A01">10YFR-RTE------C</in_Domain.mRID>
    <out_Domain.mRID codingScheme="A01">10YES-REE------0</out_Domain.mRID>
    <Period>
      <timeInterval>
        <start>2026-06-02T00:00Z</start>
        <end>2026-06-02T02:00Z</end>
      </timeInterval>
      <resolution>PT60M</resolution>
      <Point>
        <position>1</position>
        <quantity>1000</quantity>
      </Point>
      <Point>
        <position>2</position>
        <quantity>1200</quantity>
      </Point>
    </Period>
  </TimeSeries>
</Publication_MarketDocument>`

/** A11 physical flow FR→ES (sentido inverso, menor). */
const FLOW_FR_ES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Publication_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:0">
  <type>A11</type>
  <TimeSeries>
    <mRID>1</mRID>
    <in_Domain.mRID codingScheme="A01">10YES-REE------0</in_Domain.mRID>
    <out_Domain.mRID codingScheme="A01">10YFR-RTE------C</out_Domain.mRID>
    <Period>
      <timeInterval>
        <start>2026-06-02T00:00Z</start>
        <end>2026-06-02T02:00Z</end>
      </timeInterval>
      <resolution>PT60M</resolution>
      <Point>
        <position>1</position>
        <quantity>300</quantity>
      </Point>
      <Point>
        <position>2</position>
        <quantity>400</quantity>
      </Point>
    </Period>
  </TimeSeries>
</Publication_MarketDocument>`

/** Acknowledgement (error lógico, HTTP 200) · ENTSO-E lo usa para errores. */
const ACK_ERROR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Acknowledgement_MarketDocument xmlns="urn:iec62325.351:tc57wg16:351:451-1:acknowledgementdocument:8:0">
  <mRID>error1</mRID>
  <Reason>
    <code>999</code>
    <text>No matching data found for Data item Day-ahead Prices.</text>
  </Reason>
</Acknowledgement_MarketDocument>`

const MALFORMED_XML = '<Publication_MarketDocument><TimeSeries><Period broken'

// ─── Mock de fetch ──────────────────────────────────────────────────────────
const realFetch = globalThis.fetch
let fetchCalls = 0

interface MockOpts {
  status?: number
  bodyForUrl?: (url: string) => string
}

function installFetchMock(opts: MockOpts = {}) {
  fetchCalls = 0
  globalThis.fetch = (async (input: any) => {
    fetchCalls++
    const u = typeof input === 'string' ? input : String(input?.url ?? input)
    const status = opts.status ?? 200
    if (status !== 200) {
      return { ok: false, status, statusText: 'Error', text: async () => '' } as any
    }
    const body = opts.bodyForUrl ? opts.bodyForUrl(u) : ''
    return { ok: true, status: 200, statusText: 'OK', text: async () => body } as any
  }) as any
}

function restoreFetch() {
  globalThis.fetch = realFetch
}

/** Enruta el fixture según los parámetros de dominio en la URL. */
function routeFixture(url: string): string {
  if (url.includes('documentType=A44')) return PRICES_A44_XML
  if (url.includes('documentType=A75')) return GENERATION_A75_XML
  if (url.includes('documentType=A11')) {
    // in_Domain=FR & out_Domain=ES → ES→FR (forward); inverso → FR→ES (reverse)
    const inFr = url.includes('in_Domain=10YFR-RTE------C')
    return inFr ? FLOW_ES_FR_XML : FLOW_FR_ES_XML
  }
  return ACK_ERROR_XML
}

// ─── Run ────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n→ entsoe · client')

  const { periodStart, periodEnd } = periodForDays(2)

  // ── 1. Parser precios A44 ───────────────────────────────────────────────
  await test('precios A44 · parsea TimeSeries/Period/Point + estadísticos', async () => {
    process.env.ENTSOE_SECURITY_TOKEN = 'test-token'
    _clearEntsoeCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchDayAheadPrices('ES', periodStart, periodEnd)
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.zone, 'ES')
    assert.equal(d.eic, '10YES-REE------0')
    assert.equal(d.resolution_min, 60)
    assert.equal(d.points.length, 4, `esperaba 4 puntos, hay ${d.points.length}`)
    // valores 40.50, 35.25, 50.00, 60.75
    assert.equal(d.points[0].value, 40.5)
    assert.equal(d.points[3].value, 60.75)
    // primer timestamp = start del Period
    assert.equal(d.points[0].timestamp, new Date('2026-06-01T22:00Z').toISOString())
    // estadísticos: avg = (40.5+35.25+50+60.75)/4 = 46.625 → 46.63
    assert.equal(d.avg_eur_mwh, 46.63)
    assert.equal(d.max_eur_mwh, 60.75)
    assert.equal(d.min_eur_mwh, 35.25)
  })

  // ── 2. Parser generación A75 ────────────────────────────────────────────
  await test('generación A75 · agrega por psrType + etiquetas + orden desc', async () => {
    process.env.ENTSOE_SECURITY_TOKEN = 'test-token'
    _clearEntsoeCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchGeneration('ES', periodStart, periodEnd)
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.zone, 'ES')
    assert.equal(d.by_type.length, 2)
    // B19 eólica = 2000+2200+2100+1900 = 8200 (mayor → primero)
    assert.equal(d.by_type[0].psr_type, 'B19')
    assert.equal(d.by_type[0].label, 'Eólica onshore')
    assert.equal(d.by_type[0].mwh, 8200)
    // B16 solar con forward-fill: pos3 omitida = pos2 (1500) → 1000+1500+1500+500 = 4500
    const solar = d.by_type.find((t) => t.psr_type === 'B16')!
    assert.equal(solar.label, 'Solar')
    assert.equal(solar.mwh, 4500, `forward-fill esperaba 4500, hay ${solar.mwh}`)
    // total = 8200 + 4500 = 12700
    assert.equal(d.total_mwh, 12700)
  })

  // ── 3. Parser flujos A11 + saldo neto ───────────────────────────────────
  await test('flujos A11 · saldo neto bidireccional + dirección', async () => {
    process.env.ENTSOE_SECURITY_TOKEN = 'test-token'
    _clearEntsoeCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r = await fetchCrossBorderFlows('ES', 'FR', periodStart, periodEnd)
    restoreFetch()

    assert.equal(r.ok, true, r.error)
    const d = r.data!
    assert.equal(d.from, 'ES')
    assert.equal(d.to, 'FR')
    // forward ES→FR = 1000+1200 = 2200; reverse FR→ES = 300+400 = 700
    assert.equal(d.forward.total_mwh, 2200)
    assert.equal(d.reverse.total_mwh, 700)
    // saldo neto = 2200 - 700 = 1500 → ES exporta neto
    assert.equal(d.net_mwh, 1500)
    assert.equal(d.net_direction, 'ES → FR')
  })

  // ── 4. forward-fill aislado (parseTimeSeries) ───────────────────────────
  await test('forward-fill · posiciones omitidas se rellenan con último valor', () => {
    const series = parseTimeSeries(GENERATION_A75_XML, 'quantity')
    const b16 = series.find((s) => s.psrType === 'B16')!
    assert.ok(b16, 'no encontró serie B16')
    assert.equal(b16.points.length, 4, 'debe haber 4 posiciones tras forward-fill')
    assert.equal(b16.points[2].position, 3)
    assert.equal(b16.points[2].value, 1500, 'pos3 debe heredar el valor de pos2')
  })

  // ── 5. Zonas EIC correctas ──────────────────────────────────────────────
  await test('zones · los 7 EIC codes verificados son correctos', () => {
    assert.equal(ENTSOE_ZONES.ES.eic, '10YES-REE------0')
    assert.equal(ENTSOE_ZONES.FR.eic, '10YFR-RTE------C')
    assert.equal(ENTSOE_ZONES.DE_LU.eic, '10Y1001A1001A82H')
    assert.equal(ENTSOE_ZONES.PT.eic, '10YPT-REN------W')
    assert.equal(ENTSOE_ZONES.IT_NORD.eic, '10Y1001A1001A73I')
    assert.equal(ENTSOE_ZONES.BE.eic, '10YBE----------2')
    assert.equal(ENTSOE_ZONES.NL.eic, '10YNL----------L')
    // resolveZone + aliases
    assert.equal(resolveZone('es')?.code, 'ES')
    assert.equal(resolveZone('DE')?.code, 'DE_LU', 'alias DE → DE_LU')
    assert.equal(resolveZone('it')?.code, 'IT_NORD', 'alias IT → IT_NORD')
    assert.equal(resolveZone('XX'), null, 'zona desconocida → null')
    assert.equal(zoneEic('FR'), '10YFR-RTE------C')
  })

  // ── 6. Token ausente ────────────────────────────────────────────────────
  await test('token ausente · {ok:false} con mensaje claro, sin red', async () => {
    delete process.env.ENTSOE_SECURITY_TOKEN
    delete process.env.ENTSOE_API_KEY
    delete process.env.ENTSOE_USERNAME
    delete process.env.ENTSOE_PASSWORD
    _clearEntsoeCache()
    installFetchMock({ bodyForUrl: routeFixture })

    assert.equal(hasEntsoeToken(), false)
    const r = await fetchDayAheadPrices('ES', periodStart, periodEnd)
    const calls = fetchCalls
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /token_missing/)
    assert.equal(calls, 0, 'no debió llamar a fetch sin token')
    assert.ok(r.fetched_at, 'falta fetched_at')
  })

  // ── 7. Solo user/pass (falta token) ─────────────────────────────────────
  await test('solo user/pass · mensaje específico pidiendo el Web API token', async () => {
    delete process.env.ENTSOE_SECURITY_TOKEN
    delete process.env.ENTSOE_API_KEY
    process.env.ENTSOE_USERNAME = 'user@example.com'
    process.env.ENTSOE_PASSWORD = 'secret'
    _clearEntsoeCache()
    installFetchMock({ bodyForUrl: routeFixture })

    assert.equal(onlyFileLibraryCreds(), true)
    const r = await fetchGeneration('ES', periodStart, periodEnd)
    restoreFetch()
    delete process.env.ENTSOE_USERNAME
    delete process.env.ENTSOE_PASSWORD

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /token_missing/)
    assert.match(r.error ?? '', /File Library/, 'debe mencionar que user/pass es solo File Library')
    assert.match(r.error ?? '', /ENTSOE_SECURITY_TOKEN/, 'debe nombrar la env var a configurar')
  })

  // ── 8. XML malformado ───────────────────────────────────────────────────
  await test('XML malformado · degradación limpia (sin_datos), sin lanzar', async () => {
    process.env.ENTSOE_SECURITY_TOKEN = 'test-token'
    _clearEntsoeCache()
    installFetchMock({ bodyForUrl: () => MALFORMED_XML })

    const r = await fetchDayAheadPrices('ES', periodStart, periodEnd)
    restoreFetch()

    assert.equal(r.ok, false)
    // no debe lanzar; reporta sin_datos (no se pudo extraer ningún Point)
    assert.match(r.error ?? '', /sin_datos/)
    assert.ok(r.fetched_at)
  })

  // ── 9. Acknowledgement (error lógico HTTP 200) ──────────────────────────
  await test('acknowledgement · error lógico HTTP 200 → ok:false con razón', async () => {
    process.env.ENTSOE_SECURITY_TOKEN = 'test-token'
    _clearEntsoeCache()
    installFetchMock({ bodyForUrl: () => ACK_ERROR_XML })

    const r = await fetchDayAheadPrices('ES', periodStart, periodEnd)
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /entsoe_error/)
    assert.match(r.error ?? '', /No matching data/, 'debe incluir el texto de la razón')
  })

  // ── 10. Caché 1h ────────────────────────────────────────────────────────
  await test('caché · 2ª llamada idéntica NO refetch', async () => {
    process.env.ENTSOE_SECURITY_TOKEN = 'test-token'
    _clearEntsoeCache()
    installFetchMock({ bodyForUrl: routeFixture })

    const r1 = await fetchDayAheadPrices('ES', periodStart, periodEnd)
    const after1 = fetchCalls
    const r2 = await fetchDayAheadPrices('ES', periodStart, periodEnd)
    const after2 = fetchCalls
    restoreFetch()

    assert.equal(r1.ok, true, r1.error)
    assert.equal(r2.ok, true, r2.error)
    assert.equal(after1, 1, `1ª llamada debió hacer 1 fetch, hizo ${after1}`)
    assert.equal(after2, 1, `2ª llamada NO debió refetch, total=${after2}`)
    assert.deepEqual(r1.data, r2.data)
  })

  // ── HTTP error (401) ────────────────────────────────────────────────────
  await test('HTTP 401 · unauthorized → ok:false sin lanzar', async () => {
    process.env.ENTSOE_SECURITY_TOKEN = 'bad-token'
    _clearEntsoeCache()
    installFetchMock({ status: 401 })

    const r = await fetchDayAheadPrices('ES', periodStart, periodEnd)
    restoreFetch()

    assert.equal(r.ok, false)
    assert.match(r.error ?? '', /unauthorized/)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
