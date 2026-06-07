/**
 * Tercer Sector cockpit · Sprint Ga · Tests del GLOBAL OPPORTUNITY GRAPH
 * (lib/tercer-sector/global-opportunities/{sources,scoring,types}.ts).
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo — ver
 * tests/unit/tercer-sector/oportunidades-scoring.test.ts). NO toca la red: el
 * catálogo es metadata estática y el scoring-bridge es puro. Se ejecuta con
 * Node 24+ con soporte nativo de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/tercer-sector/global-sources.test.ts
 *
 * Cubre:
 *   - el catálogo tiene >= 70 fuentes,
 *   - cada fuente tiene url (http(s)) + access_method + levels (>=1, válidos) +
 *     integration_status válido, y demás campos del contrato bien formados,
 *   - ids únicos; api_url (si existe) es http(s),
 *   - las fuentes 'live' coinciden EXACTAMENTE con los conectores reales del
 *     agregador (place, bdns, ted, sedia, worldbank, uk-ocds, tendersguru, iati),
 *   - las fuentes 'planned' son las del Sprint Gb,
 *   - el scoring-bridge reutiliza scoreOportunidad (no duplica) y mapea kinds.
 */
import assert from 'node:assert/strict'

import {
  SOURCES,
  SOURCES_COUNT,
} from '../../../lib/tercer-sector/global-opportunities/sources.ts'
import {
  scoreGlobalOpportunity,
  toScoreInput,
} from '../../../lib/tercer-sector/global-opportunities/scoring.ts'
import type {
  AccessMethod,
  IntegrationStatus,
  OpportunityKind,
  SourceAuth,
  SourceCost,
  SourceLevel,
  NgoUsefulness,
  ImplementationPriority,
} from '../../../lib/tercer-sector/global-opportunities/types.ts'

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
    if ((e as Error).stack)
      console.error('    ', (e as Error).stack!.split('\n').slice(1, 3).join('\n     '))
  }
}

// ── Vocabularios válidos (deben coincidir con types.ts) ────────────────────
const ACCESS_METHODS: ReadonlySet<AccessMethod> = new Set<AccessMethod>([
  'api',
  'rss',
  'atom',
  'ocds',
  'bulk_download',
  'html_scrape',
  'sdmx',
  'ckan',
  'socrata',
])
const AUTHS: ReadonlySet<SourceAuth> = new Set<SourceAuth>([
  'none',
  'api_key',
  'registration',
  'login',
])
const COSTS: ReadonlySet<SourceCost> = new Set<SourceCost>([
  'free',
  'freemium',
  'commercial',
])
const LEVELS: ReadonlySet<SourceLevel> = new Set<SourceLevel>([
  'international_org',
  'mdb',
  'eu',
  'national',
  'regional',
  'local',
])
const KINDS: ReadonlySet<OpportunityKind> = new Set<OpportunityKind>([
  'tender',
  'grant',
  'call_for_proposal',
  'expression_of_interest',
  'request_for_proposal',
  'request_for_quotation',
  'invitation_to_bid',
  'consultancy',
  'implementing_partner_call',
  'framework_agreement',
  'award_notice',
  'procurement_plan',
  'project_pipeline',
])
const USEFULNESS: ReadonlySet<NgoUsefulness> = new Set<NgoUsefulness>([
  'alta',
  'media',
  'baja',
])
const PRIORITIES: ReadonlySet<ImplementationPriority> = new Set<ImplementationPriority>([
  'P0',
  'P1',
  'P2',
  'P3',
])
const STATUSES: ReadonlySet<IntegrationStatus> = new Set<IntegrationStatus>([
  'live',
  'catalog',
  'planned',
])

/** Conectores REALES ya activos en el agregador (lib/tercer-sector/*). */
const LIVE_CONNECTOR_IDS: readonly string[] = [
  'placsp', // place.ts
  'bdns', // bdns.ts
  'ted', // ted.ts
  'ted-api', // ted.ts (mismo conector, canal API)
  'eu-funding-tenders-sedia', // sedia.ts
  'world-bank-procnotices', // worldbank.ts
  'world-bank-projects', // worldbank.ts
  'uk-find-a-tender', // uk-ocds.ts
  'tendersguru', // tendersguru.ts
  'iati-datastore', // iati-datastore.ts
  'iati-codelists', // iati-codelists.ts
]

/** Fuentes que añade el Sprint Gb (conectores live FREE nuevos). */
const PLANNED_GB_IDS: readonly string[] = [
  'grants-gov',
  'ukraine-prozorro',
  'austender',
  'colombia-secop',
  'paraguay-dncp',
]

const isHttp = (u: string) => /^https?:\/\//.test(u)

async function run() {
  console.log('\nGlobal Opportunity Graph · catálogo de fuentes\n')

  // ── Tamaño del catálogo ──────────────────────────────────────────────────
  await test('catálogo tiene >= 70 fuentes', () => {
    assert.ok(SOURCES.length >= 70, `esperaba >= 70, hay ${SOURCES.length}`)
    assert.equal(SOURCES_COUNT, SOURCES.length)
  })

  // ── ids únicos ───────────────────────────────────────────────────────────
  await test('ids únicos (sin duplicados)', () => {
    const ids = SOURCES.map((s) => s.id)
    const set = new Set(ids)
    assert.equal(set.size, ids.length, 'hay ids duplicados')
    for (const id of ids) {
      assert.ok(/^[a-z0-9][a-z0-9-]*$/.test(id), `id no kebab-case: "${id}"`)
    }
  })

  // ── Cada fuente bien formada ───────────────────────────────────────────────
  await test('cada fuente: url http(s) + access_method + levels + integration_status válidos', () => {
    for (const s of SOURCES) {
      const ctx = `fuente "${s.id}"`
      assert.ok(typeof s.label === 'string' && s.label.length > 0, `${ctx}: label vacío`)
      assert.ok(isHttp(s.url), `${ctx}: url no http(s): "${s.url}"`)
      assert.ok(
        ACCESS_METHODS.has(s.access_method),
        `${ctx}: access_method inválido: "${s.access_method}"`,
      )
      assert.ok(
        Array.isArray(s.levels) && s.levels.length >= 1,
        `${ctx}: levels vacío`,
      )
      for (const l of s.levels) assert.ok(LEVELS.has(l), `${ctx}: level inválido: "${l}"`)
      assert.ok(
        STATUSES.has(s.integration_status),
        `${ctx}: integration_status inválido: "${s.integration_status}"`,
      )
    }
  })

  // ── Resto de campos del contrato ───────────────────────────────────────────
  await test('cada fuente: auth/cost/useful_for_ngo/priority + geography/types/fields no vacíos', () => {
    for (const s of SOURCES) {
      const ctx = `fuente "${s.id}"`
      assert.ok(AUTHS.has(s.auth), `${ctx}: auth inválido: "${s.auth}"`)
      assert.ok(COSTS.has(s.cost), `${ctx}: cost inválido: "${s.cost}"`)
      assert.ok(
        USEFULNESS.has(s.useful_for_ngo),
        `${ctx}: useful_for_ngo inválido: "${s.useful_for_ngo}"`,
      )
      assert.ok(
        PRIORITIES.has(s.implementation_priority),
        `${ctx}: priority inválido: "${s.implementation_priority}"`,
      )
      assert.ok(
        Array.isArray(s.geography) && s.geography.length >= 1,
        `${ctx}: geography vacío`,
      )
      assert.ok(
        Array.isArray(s.opportunity_types) && s.opportunity_types.length >= 1,
        `${ctx}: opportunity_types vacío`,
      )
      for (const k of s.opportunity_types)
        assert.ok(KINDS.has(k), `${ctx}: opportunity_type inválido: "${k}"`)
      assert.ok(
        Array.isArray(s.fields_available) && s.fields_available.length >= 1,
        `${ctx}: fields_available vacío`,
      )
      assert.ok(
        typeof s.update_frequency === 'string' && s.update_frequency.length > 0,
        `${ctx}: update_frequency vacío`,
      )
      assert.ok(typeof s.notes === 'string' && s.notes.length > 0, `${ctx}: notes vacío`)
    }
  })

  // ── api_url (si existe) es http(s) ─────────────────────────────────────────
  await test('api_url es null o http(s)', () => {
    for (const s of SOURCES) {
      assert.ok(
        s.api_url === null || isHttp(s.api_url),
        `fuente "${s.id}": api_url no null ni http(s): "${s.api_url}"`,
      )
    }
  })

  // ── 'live' coincide con conectores reales ──────────────────────────────────
  await test("fuentes 'live' coinciden EXACTAMENTE con conectores reales", () => {
    const live = SOURCES.filter((s) => s.integration_status === 'live').map((s) => s.id)
    for (const id of live) {
      assert.ok(
        LIVE_CONNECTOR_IDS.includes(id),
        `id "${id}" marcado 'live' pero no hay conector real conocido`,
      )
    }
    // Y todos los conectores reales esperados están marcados 'live'.
    for (const id of LIVE_CONNECTOR_IDS) {
      const s = SOURCES.find((x) => x.id === id)
      assert.ok(s, `falta la fuente del conector real "${id}"`)
      assert.equal(
        s!.integration_status,
        'live',
        `conector real "${id}" no está marcado 'live'`,
      )
    }
  })

  // ── 'live' implica access programático real (no scrape) ─────────────────────
  await test("fuentes 'live' usan acceso programático (api/atom/ocds), no html_scrape", () => {
    for (const s of SOURCES.filter((x) => x.integration_status === 'live')) {
      assert.notEqual(
        s.access_method,
        'html_scrape',
        `conector 'live' "${s.id}" no debería requerir scraping`,
      )
    }
  })

  // ── 'planned' = Sprint Gb ──────────────────────────────────────────────────
  await test("fuentes 'planned' son exactamente las del Sprint Gb", () => {
    const planned = SOURCES.filter((s) => s.integration_status === 'planned').map(
      (s) => s.id,
    )
    assert.equal(planned.length, PLANNED_GB_IDS.length, 'nº de planned no coincide con Gb')
    for (const id of PLANNED_GB_IDS) {
      assert.ok(planned.includes(id), `falta planned esperada del Sprint Gb: "${id}"`)
    }
  })

  // ── Cobertura de familias clave (al menos una de cada) ─────────────────────
  await test('cobertura de familias: international_org, mdb, eu, national + grants + ocds', () => {
    const has = (pred: (s: (typeof SOURCES)[number]) => boolean) => SOURCES.some(pred)
    assert.ok(has((s) => s.levels.includes('international_org')), 'falta international_org')
    assert.ok(has((s) => s.levels.includes('mdb')), 'falta mdb')
    assert.ok(has((s) => s.levels.includes('eu')), 'falta eu')
    assert.ok(has((s) => s.levels.includes('national')), 'falta national')
    assert.ok(
      has((s) => s.opportunity_types.includes('grant')),
      'falta alguna fuente de grants',
    )
    assert.ok(has((s) => s.access_method === 'ocds'), 'falta alguna fuente OCDS')
    // IATI presente (cooperación).
    assert.ok(has((s) => s.id.startsWith('iati')), 'falta familia IATI')
    // UNGM presente (puerta ONU).
    assert.ok(has((s) => s.id === 'ungm'), 'falta UNGM')
  })

  // ── Scoring bridge: reutiliza scoreOportunidad (no duplica) ─────────────────
  const NOW = new Date('2026-06-07T12:00:00Z')

  await test('scoreGlobalOpportunity · grant social puntúa alto y da razones', () => {
    const r = scoreGlobalOpportunity({
      title: 'Convocatoria de inclusión social y atención a la infancia',
      kind: 'grant',
      value_eur: 200_000,
      deadline: '2026-07-31',
      documents: [{ name: 'Bases', url: 'https://x/bases.pdf', doc_type: 'bases', format: 'pdf', language: 'es' }],
      now: NOW,
    })
    // kw social(20) + tipo grant→grant_ue(20) + docs(10) + plazo(10) = 60 → alta
    assert.ok(r.ngo_relevance_score >= 55, `score ${r.ngo_relevance_score} < 55`)
    assert.equal(r.label, 'alta')
    assert.ok(r.reasons.length >= 3, 'esperaba varias razones legibles')
  })

  await test('scoreGlobalOpportunity · tender de obra puntúa bajo (penaliza)', () => {
    const r = scoreGlobalOpportunity({
      title: 'Licitación de obras de pavimentación y construccion de carretera',
      kind: 'tender',
      value_eur: 8_000_000,
      deadline: '2026-06-20',
      now: NOW,
    })
    // plazo(10) − importe>5M sin lotes(20) − obra(20) = -30 → clamp 0
    assert.equal(r.ngo_relevance_score, 0)
    assert.equal(r.riesgo, 'alto')
  })

  await test('scoreGlobalOpportunity · sin importe ni plazo → incierta', () => {
    const r = scoreGlobalOpportunity({
      title: 'Aviso de adquisición sin detalles',
      kind: 'award_notice',
      now: NOW,
    })
    assert.equal(r.label, 'incierta')
    assert.equal(r.riesgo, 'incierto')
  })

  await test('toScoreInput · mapea framework_agreement a tiene_lotes=true y value_eur preferente', () => {
    const inp = toScoreInput({
      title: 'Acuerdo marco de servicios',
      kind: 'framework_agreement',
      value_amount: 9_000_000,
      value_eur: 9_000_000,
      value_currency: 'EUR',
      now: NOW,
    })
    assert.equal(inp.tipo, 'licitacion')
    assert.equal(inp.tiene_lotes, true)
    assert.equal(inp.importe_eur, 9_000_000)
  })

  await test('toScoreInput · implementing_partner_call → cooperacion_internacional', () => {
    const inp = toScoreInput({
      title: 'Llamada a socios implementadores',
      kind: 'implementing_partner_call',
      now: NOW,
    })
    assert.equal(inp.tipo, 'cooperacion_internacional')
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
