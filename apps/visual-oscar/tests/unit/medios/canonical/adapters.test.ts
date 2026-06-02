/**
 * Sprint 0+1 · Task 1 · Tests para adapters canónicos de medios.
 *
 * Cubre:
 *   · computeArticleId · determinismo SHA-256(URL canónica)
 *   · canonicalizeUrl · strip de utm_*, fbclid, gclid, etc + lowercase host
 *     + strip fragment, y fallback en URL inválida
 *   · articleRowToCanonical · mapeo Postgres row → ArticleUnit, tanto en
 *     fila post-migración (campos nuevos presentes) como pre-migración
 *     (defaults para campos ausentes).
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ con soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings tests/unit/medios/canonical/adapters.test.ts
 */
import assert from 'node:assert/strict'
import {
  computeArticleId,
  canonicalizeUrl,
  articleRowToCanonical,
} from '../../../../lib/medios/canonical/adapters.ts'
import type { Source } from '../../../../lib/medios/canonical/types.ts'

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

// ─── 1 · computeArticleId ─────────────────────────────────────────────
console.log('\n→ computeArticleId')

test('es determinista · misma URL → mismo id', () => {
  const a = computeArticleId('https://elpais.com/x')
  const b = computeArticleId('https://elpais.com/x')
  assert.equal(a, b)
  assert.equal(a.length, 64)
})

test('distingue URLs distintas', () => {
  const a = computeArticleId('https://elpais.com/x')
  const b = computeArticleId('https://elpais.com/y')
  assert.notEqual(a, b)
})

// ─── 2 · canonicalizeUrl ──────────────────────────────────────────────
console.log('\n→ canonicalizeUrl')

test('elimina utm_*, fbclid, gclid', () => {
  const dirty =
    'https://elpais.com/articulo?utm_source=twitter&utm_medium=social&utm_campaign=x&fbclid=ABC&gclid=DEF&id=42'
  const clean = canonicalizeUrl(dirty)
  assert.equal(clean.includes('utm_source'), false)
  assert.equal(clean.includes('utm_medium'), false)
  assert.equal(clean.includes('utm_campaign'), false)
  assert.equal(clean.includes('fbclid'), false)
  assert.equal(clean.includes('gclid'), false)
  assert.equal(clean.includes('id=42'), true)
})

test('elimina msclkid, ref, from, origin, mc_cid, mc_eid', () => {
  const dirty =
    'https://elpais.com/x?msclkid=A&ref=B&from=C&origin=D&mc_cid=E&mc_eid=F&keep=Z'
  const clean = canonicalizeUrl(dirty)
  assert.equal(clean.includes('msclkid'), false)
  assert.equal(clean.includes('ref='), false)
  assert.equal(clean.includes('from='), false)
  assert.equal(clean.includes('origin='), false)
  assert.equal(clean.includes('mc_cid'), false)
  assert.equal(clean.includes('mc_eid'), false)
  assert.equal(clean.includes('keep=Z'), true)
})

test('elimina fragmento', () => {
  const dirty = 'https://elpais.com/x#section'
  assert.equal(canonicalizeUrl(dirty), 'https://elpais.com/x')
})

test('lowercase del host', () => {
  const dirty = 'https://ELPAIS.com/X'
  const clean = canonicalizeUrl(dirty)
  assert.equal(clean.includes('elpais.com'), true)
  assert.equal(clean.includes('ELPAIS.com'), false)
})

test('URL inválida → retorna input', () => {
  const dirty = 'not a url'
  assert.equal(canonicalizeUrl(dirty), 'not a url')
})

// ─── 3 · articleRowToCanonical ────────────────────────────────────────
console.log('\n→ articleRowToCanonical')

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
  rssFeeds: [],
  qualityScore: 0.85,
  active: true,
}

test('mapea fila completa post-migración', () => {
  const row = {
    id: 'a'.repeat(64),
    canonical_url: 'https://elpais.com/x',
    url: 'https://elpais.com/x?utm_source=tw',
    title: 'Titular',
    summary: 'Resumen',
    body_text: 'Body...',
    source_id: 'el-pais',
    lang: 'es',
    published_at: '2026-06-02T10:00:00Z',
    ingested_at: '2026-06-02T10:05:00Z',
    category: 'politica',
    raw_tags: ['política', 'españa'],
    is_noise: false,
    is_duplicate: false,
    processing_status: 'success',
    quality_score: 0.85,
  }
  const article = articleRowToCanonical(row, SAMPLE_SOURCE)
  assert.equal(article.id.length, 64)
  assert.equal(article.title, 'Titular')
  assert.deepEqual(article.rawTags, ['política', 'españa'])
  assert.equal(article.topicTags.length, 1)
  assert.equal(article.topicTags[0].topicId, 'POLITICA')
  assert.equal(article.topicTags[0].method, 'RSS_TAG')
  assert.equal(article.sourceWeight, 1.0) // tier 1
  assert.equal(article.processingStatus, 'success')
  assert.equal(article.canonicalUrl, 'https://elpais.com/x')
  assert.equal(article.ingestedAt, '2026-06-02T10:05:00Z')
})

test('mapea fila pre-migración con defaults', () => {
  const row = {
    url: 'https://elpais.com/y?fbclid=ABC',
    title: 'T',
    summary: null,
    body_text: null,
    source_id: 'el-pais',
    lang: 'es',
    published_at: '2026-06-02T10:00:00Z',
    category: null,
  }
  const article = articleRowToCanonical(row, SAMPLE_SOURCE)
  // canonicalUrl debe normalizarse a partir de url, sin fbclid
  assert.equal(article.canonicalUrl.includes('fbclid'), false)
  // id debe computarse desde canonicalUrl
  assert.equal(article.id.length, 64)
  // defaults
  assert.equal(article.isNoise, false)
  assert.equal(article.isDuplicate, false)
  assert.equal(article.processingStatus, 'pending')
  assert.equal(article.topicTags.length, 0)
  assert.equal(article.qualityScore, 0)
  assert.deepEqual(article.rawTags, [])
  assert.equal(article.failedStep, null)
  // ingestedAt cae a publishedAt cuando no está presente
  assert.equal(article.ingestedAt, '2026-06-02T10:00:00Z')
})

test('sourceWeight se calcula desde tier de la fuente', () => {
  const row = {
    url: 'https://x.com/a',
    title: 'T',
    summary: null,
    body_text: null,
    source_id: 's',
    lang: 'es',
    published_at: '2026-06-02T10:00:00Z',
    category: null,
  }
  const t2: Source = { ...SAMPLE_SOURCE, tier: 2 }
  const t3: Source = { ...SAMPLE_SOURCE, tier: 3 }
  const t4: Source = { ...SAMPLE_SOURCE, tier: 4 }
  assert.equal(articleRowToCanonical(row, t2).sourceWeight, 0.7)
  assert.equal(articleRowToCanonical(row, t3).sourceWeight, 0.4)
  assert.equal(articleRowToCanonical(row, t4).sourceWeight, 0.3)
})

// ─── Reporte final ─────────────────────────────────────────────────────
console.log(`\n${passed} passed · ${failed} failed`)
if (failed > 0) process.exit(1)
