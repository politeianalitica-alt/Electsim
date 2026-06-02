/**
 * Sprint W.1 · Sonda de salud para los 277 indicadores macro.
 *
 * Llama internamente al fetcher `fetchPulsoIndicator()` que el dashboard
 * usa en runtime. NO pasa por la capa HTTP de Next, así que evita el
 * middleware de auth y permite testar TODO el catálogo sin login.
 *
 * Uso desde la raíz de `apps/visual-oscar`:
 *   npx tsx ../../scripts/data-probe.ts
 * O con base URL externa (sin pasar por fetcher, modo HTTP):
 *   PROBE_MODE=http BASE_URL=https://politeia-visual-oscar.vercel.app ...
 *
 * Salida:
 *   - JSON en scripts/data-probe-output.json
 *   - markdown en docs/audits/2026-06-01_macro_freshness_report.md
 *
 * Estados:
 *   - `fresh`   : last_period dentro de la ventana esperada para su cadencia
 *   - `stale`   : endpoint OK pero la última observación es demasiado antigua
 *   - `empty`   : endpoint OK, n_points === 0
 *   - `error`   : !ok, HTML, o lanza
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { SUBTAB_REGISTRY } from '../apps/visual-oscar/lib/macro/subtab-registry'
import { fetchPulsoIndicator } from '../apps/visual-oscar/lib/macro/pulso-fetcher'
import type { PulsoIndicatorMeta } from '../apps/visual-oscar/lib/macro/pulso-indicators'

interface ProbeResult {
  catalog: string
  id: string
  endpoint: string
  status: 'fresh' | 'stale' | 'empty' | 'error'
  n_points: number
  last_period: string | null
  days_since_last: number | null
  expected_max_days: number
  error?: string
  source?: string
  frequency: string
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const FRESHNESS: Record<string, number> = {
  daily: 7,
  monthly: 75,
  quarterly: 150,
  annual: 540,
}

function periodToDate(period: string): Date | null {
  if (!period) return null
  const s = period.trim()
  if (/^\d{4}$/.test(s)) return new Date(Number(s), 11, 31)
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, mo] = s.split('-').map(Number)
    return new Date(y, mo - 1, 28)
  }
  const q = s.match(/^(\d{4})[-_]?Q?(\d)$/i)
  if (q) {
    const y = Number(q[1]); const qi = Number(q[2])
    return new Date(y, (qi - 1) * 3 + 2, 28)
  }
  const iso = new Date(s)
  if (!isNaN(iso.getTime())) return iso
  return null
}

async function probeOne(catalog: string, ind: PulsoIndicatorMeta): Promise<ProbeResult> {
  const expectedMax = FRESHNESS[ind.frequency] || 365
  try {
    const res = await fetchPulsoIndicator(ind, { baseUrl: BASE_URL })
    if (!res.ok) {
      return { catalog, id: ind.id, endpoint: ind.endpoint, status: 'error', n_points: 0, last_period: null, days_since_last: null, expected_max_days: expectedMax, error: res.error || 'no_data', source: ind.source, frequency: ind.frequency }
    }
    if (res.series.length === 0 || !res.last) {
      return { catalog, id: ind.id, endpoint: ind.endpoint, status: 'empty', n_points: 0, last_period: null, days_since_last: null, expected_max_days: expectedMax, source: ind.source, frequency: ind.frequency }
    }
    const lastPeriod = String(res.last.period)
    const d = periodToDate(lastPeriod)
    const days = d ? Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)) : null
    const status: ProbeResult['status'] = days != null && days > expectedMax ? 'stale' : 'fresh'
    return { catalog, id: ind.id, endpoint: ind.endpoint, status, n_points: res.series.length, last_period: lastPeriod, days_since_last: days, expected_max_days: expectedMax, source: ind.source, frequency: ind.frequency }
  } catch (e: any) {
    return { catalog, id: ind.id, endpoint: ind.endpoint, status: 'error', n_points: 0, last_period: null, days_since_last: null, expected_max_days: expectedMax, error: String(e?.message ?? e).slice(0, 200), source: ind.source, frequency: ind.frequency }
  }
}

async function main() {
  console.log(`[probe] BASE_URL=${BASE_URL}`)
  // Aplanar registry → lista de (catalog, indicator).
  const tasks: { catalog: string; ind: PulsoIndicatorMeta }[] = []
  for (const [slug, sub] of Object.entries(SUBTAB_REGISTRY)) {
    for (const ind of sub.indicators) tasks.push({ catalog: slug, ind })
  }
  console.log(`[probe] ${tasks.length} indicadores en registro`)

  const results: ProbeResult[] = []
  const CONCURRENCY = 4
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      const t = tasks[i]
      const r = await probeOne(t.catalog, t.ind)
      results.push(r)
      if (results.length % 25 === 0) console.log(`[probe] ${results.length}/${tasks.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  mkdirSync('scripts', { recursive: true })
  writeFileSync('scripts/data-probe-output.json', JSON.stringify(results, null, 2))

  const by = (k: ProbeResult['status']) => results.filter((r) => r.status === k)
  console.log(`\n[probe] fresh=${by('fresh').length} stale=${by('stale').length} empty=${by('empty').length} error=${by('error').length}`)

  const lines: string[] = []
  const today = new Date().toISOString().slice(0, 10)
  lines.push(`# Macro freshness report · ${today}`)
  lines.push('')
  lines.push(`Probe vs \`${BASE_URL}\`. Catálogos: ${new Set(results.map((r) => r.catalog)).size}. Indicadores: ${results.length}.`)
  lines.push('')
  lines.push(`| Estado | Cuenta | % |`)
  lines.push(`|---|---:|---:|`)
  for (const k of ['fresh', 'stale', 'empty', 'error'] as const) {
    const n = by(k).length
    lines.push(`| ${k} | ${n} | ${((n / results.length) * 100).toFixed(1)}% |`)
  }
  lines.push('')

  // Resumen por catálogo y estado
  const catalogs = Array.from(new Set(results.map((r) => r.catalog))).sort()
  lines.push('## Por catálogo')
  lines.push('')
  lines.push(`| Catálogo | fresh | stale | empty | error | total |`)
  lines.push(`|---|---:|---:|---:|---:|---:|`)
  for (const c of catalogs) {
    const rows = results.filter((r) => r.catalog === c)
    const f = rows.filter((r) => r.status === 'fresh').length
    const s = rows.filter((r) => r.status === 'stale').length
    const e = rows.filter((r) => r.status === 'empty').length
    const er = rows.filter((r) => r.status === 'error').length
    lines.push(`| ${c} | ${f} | ${s} | ${e} | ${er} | ${rows.length} |`)
  }
  lines.push('')

  for (const k of ['error', 'empty', 'stale'] as const) {
    const rows = by(k).sort((a, b) => (a.catalog + a.id).localeCompare(b.catalog + b.id))
    if (rows.length === 0) continue
    lines.push(`## ${k.toUpperCase()} (${rows.length})`)
    lines.push('')
    lines.push(`| Catálogo | ID | Endpoint | Detalle |`)
    lines.push(`|---|---|---|---|`)
    for (const r of rows) {
      const detail = k === 'error' ? (r.error || 'error') : k === 'empty' ? 'sin puntos' : `last=${r.last_period} (${r.days_since_last}d > ${r.expected_max_days}d)`
      lines.push(`| ${r.catalog} | \`${r.id}\` | \`${r.endpoint.slice(0, 60)}\` | ${detail.replace(/\|/g, '\\|').slice(0, 140)} |`)
    }
    lines.push('')
  }

  const outMd = `docs/audits/${today}_macro_freshness_report.md`
  mkdirSync(dirname(outMd), { recursive: true })
  writeFileSync(outMd, lines.join('\n'))
  console.log(`[probe] reporte: ${outMd}`)
  console.log(`[probe] json: scripts/data-probe-output.json`)
}

main().catch((e) => { console.error(e); process.exit(1) })
