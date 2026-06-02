/**
 * Sprint 0+1 · Task 1 · Tests para los tipos canónicos de medios.
 *
 * Cubre:
 *   · Shape contracts: ArticleUnit, Source, EntityAlias, Entity acepta
 *     instancias mínimas válidas (verifica que los tipos compilan + las
 *     propiedades core están presentes).
 *   · Type guards: isArticleUnit, isSource, isEntity discrimina shapes
 *     válidos de inválidos.
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings tests/unit/medios/canonical/types.test.ts
 *
 * Si todos los assertions pasan imprime un resumen con tests pasados.
 * Si alguno falla el proceso sale con código 1 y stack trace.
 */
import assert from 'node:assert/strict'
import {
  isArticleUnit,
  isSource,
  isEntity,
} from '../../../../lib/medios/canonical/types.ts'
import type {
  ArticleUnit,
  Source,
  Entity,
  EntityAlias,
} from '../../../../lib/medios/canonical/types.ts'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
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

// ─── 1 · Shape contracts ───────────────────────────────────────────────
console.log('\n→ Canonical types · shape contracts')

const SAMPLE_SOURCE: Source = {
  id: 'el-pais',
  name: 'El País',
  domain: 'elpais.com',
  type: 'NATIONAL',
  country: 'ES',
  regions: ['ES'],
  language: 'es',
  ideology: 'CENTER_LEFT',
  ideologyScore: -25,
  tier: 1,
  audienceEstimate: 16500000,
  rssFeeds: [{ url: 'https://feeds.elpais.com/x', kind: 'general', active: true }],
  qualityScore: 0.85,
  active: true,
}

test('ArticleUnit · acepta shape mínimo válido con propiedades inmutables', () => {
  const article: ArticleUnit = {
    id: 'a'.repeat(64),
    canonicalUrl: 'https://elpais.com/articulo/1',
    title: 'Título de prueba',
    description: null,
    bodySnippet: null,
    source: SAMPLE_SOURCE,
    publishedAt: '2026-06-02T10:00:00Z',
    ingestedAt: '2026-06-02T10:05:00Z',
    language: 'es',
    country: 'ES',
    rawTags: [],
    ingestionSource: 'RSS',
    topicTags: [],
    entities: [],
    sentiment: null,
    framing: null,
    clusterId: null,
    qualityScore: 0,
    isNoise: false,
    noiseReason: null,
    isDuplicate: false,
    duplicateOf: null,
    sourceWeight: 0,
    processingStatus: 'pending',
    failedStep: null,
  }
  assert.equal(article.id.length, 64)
  assert.equal(article.processingStatus, 'pending')
  assert.equal(article.ingestionSource, 'RSS')
})

test('Source · acepta shape mínimo válido con tier 1-4', () => {
  const source: Source = SAMPLE_SOURCE
  assert.equal(source.tier, 1)
  assert.equal(source.ideology, 'CENTER_LEFT')
  assert.deepEqual(source.regions, ['ES'])
  assert.equal(source.rssFeeds.length, 1)
})

test('EntityAlias · acepta shape rich con contextRequired y disambiguationRequired', () => {
  const alias: EntityAlias = {
    text: 'Moncloa',
    confidence: 0.55,
    contextRequired: ['gobierno', 'ejecutivo'],
    note: 'Solo si refiere a decisiones del ejecutivo',
  }
  assert.equal(alias.contextRequired?.length, 2)
  assert.equal(alias.note, 'Solo si refiere a decisiones del ejecutivo')

  const ambiguous: EntityAlias = {
    text: 'Sánchez',
    confidence: 0.75,
    disambiguationRequired: true,
  }
  assert.equal(ambiguous.disambiguationRequired, true)
})

test('Entity · Pedro Sánchez con aliases ricos', () => {
  const entity: Entity = {
    id: 'pedro-sanchez',
    canonicalName: 'Pedro Sánchez',
    type: 'PERSON',
    politicalFamily: 'PSOE',
    role: 'Presidente del Gobierno',
    territory: 'ES',
    relevanceScore: 1.0,
    active: true,
    aliases: [
      { text: 'Pedro Sánchez', confidence: 1.0 },
      { text: 'Sánchez', confidence: 0.75, disambiguationRequired: true },
    ],
  }
  assert.equal(entity.id, 'pedro-sanchez')
  assert.equal(entity.aliases.length, 2)
  assert.equal(entity.type, 'PERSON')
})

// ─── 2 · Type guards ──────────────────────────────────────────────────
console.log('\n→ Canonical types · type guards')

test('isArticleUnit · valida shape correcto y rechaza incorrectos', () => {
  const valid = {
    id: 'a'.repeat(64),
    canonicalUrl: 'x',
    title: 't',
    description: null,
    bodySnippet: null,
    source: { id: 's' },
    publishedAt: '2026-01-01T00:00:00Z',
    ingestedAt: '2026-01-01T00:00:00Z',
    language: 'es',
    country: 'ES',
    rawTags: [],
    ingestionSource: 'RSS',
    topicTags: [],
    entities: [],
    sentiment: null,
    framing: null,
    clusterId: null,
    qualityScore: 0,
    isNoise: false,
    noiseReason: null,
    isDuplicate: false,
    duplicateOf: null,
    sourceWeight: 0,
    processingStatus: 'pending',
    failedStep: null,
  }
  assert.equal(isArticleUnit(valid), true)
  assert.equal(isArticleUnit(null), false)
  assert.equal(isArticleUnit(undefined), false)
  assert.equal(isArticleUnit('string'), false)
  assert.equal(isArticleUnit({ id: 'x' }), false)
  assert.equal(isArticleUnit({}), false)
})

test('isSource · valida shape correcto y rechaza incorrectos', () => {
  const validSource = {
    id: 's',
    name: 'n',
    domain: 'd',
    type: 'NATIONAL',
    country: 'ES',
    regions: [],
    language: 'es',
    ideology: 'CENTER',
    ideologyScore: 0,
    tier: 1,
    audienceEstimate: 0,
    rssFeeds: [],
    qualityScore: 0,
    active: true,
  }
  assert.equal(isSource(validSource), true)
  assert.equal(isSource(null), false)
  assert.equal(isSource({ id: 's' }), false)
  // tier inválido
  assert.equal(isSource({ ...validSource, tier: 5 }), false)
})

test('isEntity · valida shape correcto y rechaza incorrectos', () => {
  const validEntity = {
    id: 'e',
    canonicalName: 'E',
    type: 'PERSON',
    politicalFamily: null,
    role: null,
    territory: null,
    relevanceScore: 0,
    active: true,
    aliases: [],
  }
  assert.equal(isEntity(validEntity), true)
  assert.equal(isEntity(null), false)
  assert.equal(isEntity({ id: 'e' }), false)
  assert.equal(isEntity({ id: 'e', canonicalName: 'E' }), false)
})

// ─── Reporte final ─────────────────────────────────────────────────────
console.log(`\n${passed} passed · ${failed} failed`)
if (failed > 0) process.exit(1)
