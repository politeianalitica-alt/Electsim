/**
 * Media Bias Registry · Sprint G14 FASE 2
 *
 * Lookup server-side de 4 435 medios contra dataset MBFC normalizado
 * (`data/media-bias-registry.json`, ~590 KB).
 *
 * Procedencia: `gits amigos/Factual-Reporting-and-Political-Bias-Web-Interactions-main/data/mbfc_raw.csv`
 * normalizado por `scripts/build-media-bias-registry.py` (idempotente).
 *
 * Por qué importa para `/geopolitica`:
 * - Cualquier URL que aparezca en convergencia narrativa, GDELT, RSS oficial o
 *   theme clusters puede ser enriquecida con `{bias, press_freedom, country}`.
 * - Habilita el badge "fuente régimen X" sobre Xinhua/RT/Sputnik/TASS sin coste.
 * - No es auditoría independiente: es heurística periodística agregada MBFC.
 *
 * Server-side only por tamaño (importar en route handlers o server components).
 * Para client: fetch a `/api/geopolitica/media-bias?domain=X`.
 */
import rawRegistry from '@/data/media-bias-registry.json'

// ───────────────────────── tipos públicos ─────────────────────────

export type BiasBand =
  | 'left' | 'left_center' | 'center' | 'right_center' | 'right'
  | 'conspiracy' | 'questionable' | 'pro_science' | 'satire' | 'unknown'

export type PressFreedomBand =
  | 'free' | 'mostly_free' | 'partly_free' | 'not_free' | 'oppression' | 'unknown'

export type FactualBand =
  | 'very_high' | 'high' | 'mostly_factual' | 'mixed' | 'low' | 'very_low' | 'unknown'

export interface MediaBiasEntry {
  domain: string                  // hostname canónico (e.g. "elpais.com")
  country: string                 // país normalizado (lowercase)
  bias: BiasBand
  factual_reporting: FactualBand
  press_freedom: PressFreedomBand
  media_type: string              // newspaper, tv station, magazine, etc.
  credibility: string             // high credibility / medium credibility / low credibility / unknown
  source: 'mbfc'
  methodology_note: string
}

// ───────────────────────── carga interna ─────────────────────────

interface RawEntry {
  d: string; c: string; b: string; f: string; p: string; m: string; r: string
}

const REGISTRY = rawRegistry as Record<string, RawEntry>
const METHODOLOGY_NOTE =
  'MBFC (Media Bias/Fact Check) · heurística periodística agregada, no auditoría independiente. Útil como pista, no como veredicto.'

// ───────────────────────── helpers de normalización ─────────────────────────

/**
 * Devuelve el dominio canónico minúsculas sin "www." ni puerto.
 * Acepta tanto URL completa como dominio crudo.
 */
export function canonicalizeDomain(input: string | null | undefined): string {
  if (!input) return ''
  let s = String(input).trim().toLowerCase()
  if (!s) return ''
  // Si trae protocolo: parsear con URL
  if (/^https?:\/\//.test(s)) {
    try { s = new URL(s).hostname } catch { /* fallthrough */ }
  }
  // Quitar puerto y trailing path
  s = s.split('/')[0].split(':')[0]
  // Quitar www. inicial
  s = s.replace(/^www\./, '')
  return s
}

/**
 * Aliases manuales para casos conocidos donde el dataset MBFC sólo cubre una
 * variante TLD (ej. bbc.com pero no bbc.co.uk; nytimes.com pero no nyt.com).
 * Mantener pequeña y obvia — el resto se resuelve por subdomain stripping.
 */
const DOMAIN_ALIASES: Record<string, string> = {
  'bbc.co.uk': 'bbc.com',
  'nyt.com': 'nytimes.com',
  'wapo.com': 'washingtonpost.com',
  'wsj.de': 'wsj.com',
  'ft.de': 'ft.com',
  'guardian.co.uk': 'theguardian.com',
}

/**
 * Intenta varios fallbacks para encontrar el match más cercano si el dominio
 * tiene subdominios (ej. "edition.cnn.com" → "cnn.com"; "mundo.sputniknews.com"
 * → "sputniknews.com"). También aplica alias manuales conocidos.
 */
function lookupRaw(domain: string): RawEntry | null {
  if (!domain) return null
  if (REGISTRY[domain]) return REGISTRY[domain]
  // Alias directo
  const alias = DOMAIN_ALIASES[domain]
  if (alias && REGISTRY[alias]) return REGISTRY[alias]
  // Fallback: ir quitando subdominios hasta encontrar match
  const parts = domain.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.')
    if (REGISTRY[candidate]) return REGISTRY[candidate]
    if (DOMAIN_ALIASES[candidate] && REGISTRY[DOMAIN_ALIASES[candidate]]) return REGISTRY[DOMAIN_ALIASES[candidate]]
  }
  return null
}

// ───────────────────────── API pública ─────────────────────────

/**
 * Busca metadata de bias/freedom para un dominio o URL. Devuelve null si no hay.
 */
export function lookupMediaBias(input: string | null | undefined): MediaBiasEntry | null {
  const domain = canonicalizeDomain(input)
  const raw = lookupRaw(domain)
  if (!raw) return null
  return {
    domain: raw.d,
    country: raw.c,
    bias: (raw.b as BiasBand),
    factual_reporting: (raw.f as FactualBand),
    press_freedom: (raw.p as PressFreedomBand),
    media_type: raw.m,
    credibility: raw.r,
    source: 'mbfc',
    methodology_note: METHODOLOGY_NOTE,
  }
}

/**
 * Variante batch: lookup eficiente para arrays de URLs/dominios.
 */
export function lookupMediaBiasBatch(inputs: Array<string | null | undefined>): Array<MediaBiasEntry | null> {
  return inputs.map(lookupMediaBias)
}

/**
 * Tag de régimen consolidado: 'authoritarian' si press_freedom in {oppression,not_free}.
 * Útil para componer badges sin tener que mirar cada campo en el cliente.
 */
export function regimeTagFromPressFreedom(p: PressFreedomBand): 'free' | 'hybrid' | 'authoritarian' | 'unknown' {
  switch (p) {
    case 'free': case 'mostly_free': return 'free'
    case 'partly_free': return 'hybrid'
    case 'not_free': case 'oppression': return 'authoritarian'
    default: return 'unknown'
  }
}

/**
 * Etiquetas legibles ES para UI.
 */
export const BIAS_LABEL_ES: Record<BiasBand, string> = {
  left: 'Izquierda',
  left_center: 'Centro-izquierda',
  center: 'Centro',
  right_center: 'Centro-derecha',
  right: 'Derecha',
  conspiracy: 'Conspirativo',
  questionable: 'Cuestionable',
  pro_science: 'Pro-ciencia',
  satire: 'Sátira',
  unknown: 'Sin clasificar',
}

export const PRESS_FREEDOM_LABEL_ES: Record<PressFreedomBand, string> = {
  free: 'Prensa libre',
  mostly_free: 'Prensa mayoritariamente libre',
  partly_free: 'Prensa parcialmente libre',
  not_free: 'Prensa no libre',
  oppression: 'Opresión total',
  unknown: 'Sin datos de libertad de prensa',
}

export const FACTUAL_LABEL_ES: Record<FactualBand, string> = {
  very_high: 'Factualidad muy alta',
  high: 'Factualidad alta',
  mostly_factual: 'Mayoritariamente factual',
  mixed: 'Factualidad mixta',
  low: 'Factualidad baja',
  very_low: 'Factualidad muy baja',
  unknown: 'Sin clasificar',
}

// ───────────────────────── stats agregadas ─────────────────────────

export function getRegistryStats() {
  const counts = { total: 0, byBias: {} as Record<string, number>, byFreedom: {} as Record<string, number>, byCountry: {} as Record<string, number> }
  for (const k in REGISTRY) {
    const r = REGISTRY[k]
    counts.total++
    counts.byBias[r.b] = (counts.byBias[r.b] || 0) + 1
    counts.byFreedom[r.p] = (counts.byFreedom[r.p] || 0) + 1
    counts.byCountry[r.c] = (counts.byCountry[r.c] || 0) + 1
  }
  return counts
}

export const MEDIA_BIAS_VERSION = 'mbfc-v1-2026-05'
