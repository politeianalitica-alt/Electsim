/**
 * Loaders + validación Zod para los 5 catálogos JSON de Prensa canónica.
 * Sprint 0+1 · Task 2 · 2026-06-02
 *
 * Caché en memoria por instancia (carga una vez).
 */
import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  Entity,
  Source,
  TopicRulesCatalog,
  RssTagMapCatalog,
  FramingRulesCatalog,
} from './types'

// ──────── Schemas Zod ────────────────────────────────────────────────

const EntityAliasSchema = z.object({
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  disambiguationRequired: z.boolean().optional(),
  contextRequired: z.array(z.string()).optional(),
  note: z.string().optional(),
})

const EntitySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  canonicalName: z.string().min(1),
  type: z.enum([
    'PERSON',
    'PARTY',
    'INSTITUTION',
    'TERRITORY',
    'COMPANY',
    'UNION',
    'THINKTANK',
    'COALITION',
    'ORGANISM',
  ]),
  politicalFamily: z.string().nullable(),
  role: z.string().nullable(),
  territory: z.string().nullable(),
  relevanceScore: z.number().min(0).max(1),
  active: z.boolean(),
  aliases: z.array(EntityAliasSchema).min(1),
})

const EntityCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  entities: z.array(EntitySchema),
})

const TopicRuleSchema = z.object({
  id: z.string(),
  field: z.enum(['title', 'description', 'title+description']),
  type: z.enum(['contains_any', 'contains_all']),
  terms: z.array(z.string()).min(1),
  score: z.number().min(0).max(1),
  note: z.string().optional(),
})

const SubtopicSchema = z.object({
  subtopicId: z.string(),
  rules: z.array(TopicRuleSchema),
})

const TopicSchema = z.object({
  topicId: z.string(),
  label: z.string(),
  rules: z.array(TopicRuleSchema),
  subtopics: z.array(SubtopicSchema).optional(),
})

const TopicRulesCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  topics: z.array(TopicSchema),
})

const RssTagMappingSchema = z.object({
  rawTag: z.string(),
  topicId: z.string().nullable(),
  subtopicId: z.string().optional(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).min(1),
  note: z.string().optional(),
})

const RssTagMapCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  mappings: z.array(RssTagMappingSchema),
})

const FramingRuleSchema = z.object({
  id: z.string(),
  field: z.enum(['title', 'description', 'title+description']),
  type: z.enum(['contains_any', 'contains_all']),
  terms: z.array(z.string()),
  score: z.number().min(0).max(1),
})

const FramingSchema = z.object({
  framingId: z.string(),
  label: z.string(),
  rules: z.array(FramingRuleSchema),
})

const FramingRulesCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  _status: z.string().optional(),
  framings: z.array(FramingSchema),
})

const RssFeedRefSchema = z.object({
  url: z.string().url(),
  kind: z.enum(['general', 'politica', 'economia', 'opinion', 'otro']),
  active: z.boolean(),
})

const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  domain: z.string(),
  type: z.enum([
    'NATIONAL',
    'REGIONAL',
    'LOCAL',
    'DIGITAL_NATIVE',
    'AGENCY',
    'INTERNATIONAL',
    'SECTORAL',
    'INSTITUTIONAL',
  ]),
  country: z.string(),
  regions: z.array(z.string()),
  language: z.string(),
  ideology: z.enum([
    'LEFT',
    'CENTER_LEFT',
    'CENTER',
    'CENTER_RIGHT',
    'RIGHT',
    'NATIONALIST',
    'INSTITUTIONAL',
    'UNKNOWN',
  ]),
  ideologyScore: z.number(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  audienceEstimate: z.number().min(0),
  rssFeeds: z.array(RssFeedRefSchema),
  qualityScore: z.number().min(0).max(1),
  active: z.boolean(),
})

const SourceCatalogSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  _note: z.string().optional(),
  sources: z.array(SourceSchema),
})

// ──────── Cache en memoria ────────────────────────────────────────────

let _entityCache: Entity[] | null = null
let _topicRulesCache: TopicRulesCatalog | null = null
let _rssTagMapCache: RssTagMapCatalog | null = null
let _framingRulesCache: FramingRulesCatalog | null = null
let _sourceCache: Source[] | null = null

function dataPath(filename: string): string {
  return join(process.cwd(), 'data', 'medios', filename)
}

// ──────── Loaders ─────────────────────────────────────────────────────

export async function loadEntityCatalog(): Promise<Entity[]> {
  if (_entityCache) return _entityCache
  const raw = await readFile(dataPath('entity-catalog.json'), 'utf8')
  const parsed = EntityCatalogSchema.parse(JSON.parse(raw))
  _entityCache = parsed.entities as Entity[]
  return _entityCache
}

export async function loadTopicRules(): Promise<TopicRulesCatalog> {
  if (_topicRulesCache) return _topicRulesCache
  const raw = await readFile(dataPath('topic-rules.json'), 'utf8')
  _topicRulesCache = TopicRulesCatalogSchema.parse(JSON.parse(raw)) as TopicRulesCatalog
  return _topicRulesCache
}

export async function loadRssTagMap(): Promise<RssTagMapCatalog> {
  if (_rssTagMapCache) return _rssTagMapCache
  const raw = await readFile(dataPath('rss-tag-map.json'), 'utf8')
  _rssTagMapCache = RssTagMapCatalogSchema.parse(JSON.parse(raw)) as RssTagMapCatalog
  return _rssTagMapCache
}

export async function loadFramingRules(): Promise<FramingRulesCatalog> {
  if (_framingRulesCache) return _framingRulesCache
  const raw = await readFile(dataPath('framing-rules.json'), 'utf8')
  _framingRulesCache = FramingRulesCatalogSchema.parse(JSON.parse(raw)) as FramingRulesCatalog
  return _framingRulesCache
}

export async function loadSourceCatalog(): Promise<Source[]> {
  if (_sourceCache) return _sourceCache
  const raw = await readFile(dataPath('source-catalog.json'), 'utf8')
  const parsed = SourceCatalogSchema.parse(JSON.parse(raw))
  _sourceCache = parsed.sources as Source[]
  return _sourceCache
}

// ──────── Helpers de lookup ───────────────────────────────────────────

export function findSourceByDomain(catalog: Source[], domain: string): Source | null {
  const normDomain = domain.toLowerCase().replace(/^www\./, '')
  return catalog.find((s) => s.domain.toLowerCase() === normDomain) ?? null
}

export function findEntityById(catalog: Entity[], id: string): Entity | null {
  return catalog.find((e) => e.id === id) ?? null
}

export function findEntitiesByAlias(catalog: Entity[], aliasText: string): Entity[] {
  const norm = aliasText.toLowerCase()
  return catalog.filter((e) => e.aliases.some((a) => a.text.toLowerCase() === norm))
}

// ──────── Reset (para tests) ──────────────────────────────────────────

export function _resetCatalogCache(): void {
  _entityCache = null
  _topicRulesCache = null
  _rssTagMapCache = null
  _framingRulesCache = null
  _sourceCache = null
}
