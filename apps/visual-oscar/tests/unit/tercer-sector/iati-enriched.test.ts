/**
 * Sprint IATI-MAX · Tests de los parseos/agregaciones de `iati-enriched.ts`.
 *
 * Ejecutar:
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings \
 *        tests/unit/tercer-sector/iati-enriched.test.ts
 *
 * Cubre las funciones PURAS (sin red):
 *   1. parseEnrichedDocs · fechas paralelas type/iso-date, importes EUR-only
 *   2. buildYearlyHeatmap · agregación (año × país), top countries por importe
 *   3. buildTopFlows · agregación donante→receptor por importe
 *   4. spanishOrgsQuery · genera clausula Solr con CURATED_SPANISH_ORGS
 */
import assert from 'node:assert/strict'
import {
  parseEnrichedDocs,
  buildYearlyHeatmap,
  buildTopFlows,
  spanishOrgsQueryFrom,
} from '../../../lib/tercer-sector/iati-enriched-parsers.ts'

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
  console.log('\n→ tercer-sector · iati-enriched\n')

  // ── 1. parseEnrichedDocs ────────────────────────────────────────────────
  await test('parseEnrichedDocs · fechas paralelas type/iso-date · start/end correctos', () => {
    const docs = [
      {
        iati_identifier: 'ES-CIF-G58236803-AB1',
        title_narrative: ['Proyecto educación Etiopía'],
        description_narrative: ['Desc'],
        reporting_org_ref: 'ES-CIF-G58236803',
        reporting_org_narrative: 'Oxfam Intermón',
        participating_org_ref: ['ES-CIF-G58236803', 'XM-DAC-7'],
        recipient_country_code: ['et'],
        sector_code: ['11220'],
        activity_status_code: '2',
        // type:1=planned-start, 2=actual-start, 3=planned-end, 4=actual-end
        activity_date_type: ['1', '3'],
        activity_date_iso_date: ['2022-01-15', '2024-12-31'],
        default_aid_type_code: 'A02',
        default_flow_type_code: '10',
        total_disbursement_value_usd: '150000',
        total_disbursement_value_currency: 'EUR',
        total_commitment_value_usd: '300000',
        total_commitment_value_currency: 'USD', // no EUR → no se cuenta
      },
    ]
    const r = parseEnrichedDocs(docs)
    assert.equal(r.length, 1)
    const a = r[0]
    assert.equal(a.id, 'ES-CIF-G58236803-AB1')
    assert.equal(a.title, 'Proyecto educación Etiopía')
    assert.equal(a.reporting_org_name, 'Oxfam Intermón')
    assert.deepEqual(a.recipient_countries, ['ET'])
    assert.deepEqual(a.sectors, ['11220'])
    assert.equal(a.start_date, '2022-01-15')
    assert.equal(a.end_date, '2024-12-31')
    assert.equal(a.total_disbursement_eur, 150000)
    assert.equal(a.total_commitment_eur, null, 'USD no cuenta como EUR')
    assert.equal(a.default_aid_type, 'A02')
  })

  await test('parseEnrichedDocs · sin iati_identifier → descarta', () => {
    const r = parseEnrichedDocs([{ iati_identifier: '' }, null, { title_narrative: 'x' }])
    assert.equal(r.length, 0)
  })

  await test('parseEnrichedDocs · solo 1 fecha (sin type pareado) → cae a start_date', () => {
    const r = parseEnrichedDocs([
      {
        iati_identifier: 'X1',
        title_narrative: 'T',
        activity_date_iso_date: ['2023-05-01'],
      },
    ])
    assert.equal(r.length, 1)
    assert.equal(r[0].start_date, '2023-05-01')
    assert.equal(r[0].end_date, null)
  })

  // ── 2. buildYearlyHeatmap ───────────────────────────────────────────────
  await test('buildYearlyHeatmap · agrega por año × país, suma valores EUR', () => {
    const txs = [
      { date: '2022-03-01', value_eur: 100, recipient_country: 'ET' },
      { date: '2022-08-12', value_eur: 50, recipient_country: 'ET' },
      { date: '2023-01-15', value_eur: 200, recipient_country: 'ET' },
      { date: '2023-06-30', value_eur: 80, recipient_country: 'CO' },
      // ignorables
      { date: null, value_eur: 999, recipient_country: 'ET' },
      { date: '2023-01-01', value_eur: null, recipient_country: 'ET' },
      { date: '2023-01-01', value_eur: 50, recipient_country: null },
    ]
    const h = buildYearlyHeatmap(txs, null, 5)
    assert.equal(h.points.length, 3, '3 combinaciones únicas (2022-ET, 2023-ET, 2023-CO)')
    const p2022ET = h.points.find((p) => p.year === 2022 && p.country_code === 'ET')!
    assert.equal(p2022ET.value_eur, 150)
    assert.equal(p2022ET.count, 2)
    const p2023ET = h.points.find((p) => p.year === 2023 && p.country_code === 'ET')!
    assert.equal(p2023ET.value_eur, 200)
    const p2023CO = h.points.find((p) => p.year === 2023 && p.country_code === 'CO')!
    assert.equal(p2023CO.value_eur, 80)
    assert.deepEqual(h.years, [2022, 2023])
    assert.equal(h.total_value_eur, 430)
    assert.equal(h.total_count, 4)
    // top_countries por importe acumulado
    assert.equal(h.top_countries[0].code, 'ET') // 350
    assert.equal(h.top_countries[0].count, 350)
    assert.equal(h.top_countries[1].code, 'CO')
  })

  await test('buildYearlyHeatmap · codelist countries resuelve nombres', () => {
    const txs = [{ date: '2024-01-01', value_eur: 10, recipient_country: 'ET' }]
    const h = buildYearlyHeatmap(txs, { ET: { name: 'Etiopía' } }, 5)
    assert.equal(h.points[0].country_name, 'Etiopía')
    assert.equal(h.top_countries[0].name, 'Etiopía')
  })

  // ── 3. buildTopFlows ────────────────────────────────────────────────────
  await test('buildTopFlows · agrega por donante→receptor y ordena desc', () => {
    const txs = [
      { reporting_org_ref: 'ES-CIF-G58236803', recipient_country: 'ET', value_eur: 100 },
      { reporting_org_ref: 'ES-CIF-G58236803', recipient_country: 'ET', value_eur: 200 },
      { reporting_org_ref: 'ES-CIF-G81164105', recipient_country: 'CO', value_eur: 500 },
      { reporting_org_ref: 'ES-CIF-G58236803', recipient_country: 'CO', value_eur: 50 },
      // descartes
      { reporting_org_ref: null, recipient_country: 'ET', value_eur: 1 },
      { reporting_org_ref: 'X', recipient_country: null, value_eur: 1 },
      { reporting_org_ref: 'X', recipient_country: 'ET', value_eur: null },
    ]
    const curated = {
      'ES-CIF-G58236803': 'Oxfam Intermón',
      'ES-CIF-G81164105': 'Acción contra el Hambre',
    }
    const out = buildTopFlows(txs, null, 5, curated)
    assert.equal(out.flows.length, 3, '3 combinaciones únicas')
    assert.equal(out.flows[0].value_eur, 500) // G81164105 → CO
    assert.equal(out.flows[1].value_eur, 300) // G58236803 → ET (100+200)
    assert.equal(out.flows[2].value_eur, 50) // G58236803 → CO
    assert.equal(out.total_value_eur, 850)
    assert.equal(out.total_count, 4)
    // resolución de nombre curated
    assert.match(out.flows[1].donor_name, /Oxfam/i)
  })

  await test('buildTopFlows · top_n limita el resultado', () => {
    const txs = [
      { reporting_org_ref: 'A', recipient_country: 'X1', value_eur: 1 },
      { reporting_org_ref: 'A', recipient_country: 'X2', value_eur: 2 },
      { reporting_org_ref: 'A', recipient_country: 'X3', value_eur: 3 },
    ]
    const out = buildTopFlows(txs, null, 2)
    assert.equal(out.flows.length, 2)
    assert.equal(out.flows[0].value_eur, 3)
    assert.equal(out.flows[1].value_eur, 2)
  })

  // ── 4. spanishOrgsQueryFrom ─────────────────────────────────────────────
  await test('spanishOrgsQueryFrom · genera clausula Solr con refs dadas', () => {
    const q = spanishOrgsQueryFrom(['ES-CIF-G58236803', 'ES-CIF-G81164105'])
    assert.match(q, /reporting_org_ref:/)
    assert.match(q, /ES-CIF-G58236803/) // Oxfam Intermón
    assert.match(q, /ES-CIF-G81164105/) // Acción contra el Hambre
    assert.match(q, / OR /)
  })

  await test('spanishOrgsQueryFrom · array vacío produce clausula degenerada manejable', () => {
    const q = spanishOrgsQueryFrom([])
    assert.equal(q, 'reporting_org_ref:()')
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
