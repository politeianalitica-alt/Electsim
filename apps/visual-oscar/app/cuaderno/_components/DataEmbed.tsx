'use client'

/**
 * <DataEmbed> · hidrata los placeholders `{macro:X} {cis:X} {stats:X}` que
 * el renderer markdown deja en el preview, y los reemplaza por mini-cards
 * con datos en vivo.
 *
 * Estrategia:
 *   - Tras render markdown, busca `<span class="cuad-embed" data-source="X" data-key="Y" />`
 *   - Para cada uno, fetch al endpoint + render React component
 *   - Cachea respuestas en sessionStorage para evitar refetch al navegar
 *
 * Sprint Cuaderno N1.
 */

import { useEffect, useState } from 'react'
import {
  DATA_REGISTRY,
  type DataEmbedSpec,
  resolveDataEmbed,
  type DataSource,
} from '@/lib/cuaderno/data-registry'

interface EmbedRequest {
  source: DataSource
  key: string
  el: HTMLElement
}

const CACHE_TTL_MS = 5 * 60_000

function cacheKey(source: string, key: string) {
  return `cuad-embed-${source}-${key}`
}

function readCache(source: string, key: string): any | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(cacheKey(source, key))
    if (!raw) return null
    const obj = JSON.parse(raw)
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null
    return obj.data
  } catch {
    return null
  }
}

function writeCache(source: string, key: string, data: any) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(cacheKey(source, key), JSON.stringify({ ts: Date.now(), data }))
  } catch {
    // QuotaExceeded · ignore
  }
}

async function fetchEmbedData(spec: DataEmbedSpec): Promise<any> {
  const cached = readCache(spec.source, spec.key)
  if (cached) return cached
  try {
    const r = await fetch(spec.endpoint)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const json = await r.json()
    writeCache(spec.source, spec.key, json)
    return json
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 80) }
  }
}

function extractLast(data: any): { value: number | null; time: string | null } {
  if (!data) return { value: null, time: null }
  if (data.last && typeof data.last.value === 'number') return { value: data.last.value, time: data.last.time ?? null }
  if (data.data?.value != null) return { value: data.data.value, time: null }
  if (Array.isArray(data.points) && data.points.length > 0) {
    const p = data.points[data.points.length - 1]
    return { value: p.value ?? null, time: p.time ?? p.period ?? null }
  }
  return { value: null, time: null }
}

interface CardState {
  data: any | null
  loading: boolean
  spec: DataEmbedSpec | null
}

/**
 * Componente que escanea el preview tras renderMarkdown y reemplaza cada
 * placeholder por un mini-card con datos en vivo.
 */
export function useDataEmbeds(container: HTMLElement | null) {
  const [, force] = useState({})

  useEffect(() => {
    if (!container) return

    const placeholders = container.querySelectorAll<HTMLElement>('.cuad-embed[data-source][data-key]')
    if (placeholders.length === 0) return

    const tasks: EmbedRequest[] = []
    placeholders.forEach((el) => {
      const source = el.dataset.source as DataSource
      const key = el.dataset.key ?? ''
      if (!source || !key) return
      // Si ya está hidratado, skip
      if (el.dataset.hydrated === '1') return
      tasks.push({ source, key, el })
    })

    let cancelled = false
    void Promise.all(
      tasks.map(async (task) => {
        const spec = resolveDataEmbed(task.source, task.key)
        if (!spec) {
          task.el.innerHTML = `<span style="color:#9ca3af; font-size:11px;">Embed desconocido · ${task.source}:${task.key}</span>`
          task.el.dataset.hydrated = '1'
          return
        }
        const data = await fetchEmbedData(spec)
        if (cancelled) return
        const { value, time } = extractLast(data)
        task.el.dataset.hydrated = '1'
        task.el.innerHTML = renderCardHTML(spec, value, time, data)
        // Listener navegación al deepLink
        task.el.style.cursor = 'pointer'
        task.el.onclick = () => {
          if (spec.deepLink) window.location.href = spec.deepLink
        }
      }),
    ).then(() => {
      if (!cancelled) force({})
    })

    return () => {
      cancelled = true
    }
  }, [container])
}

function renderCardHTML(spec: DataEmbedSpec, value: number | null, time: string | null, raw: any): string {
  const errMsg = raw?.error ? `<span style="color:#dc2626; font-size:10px;">error: ${raw.error}</span>` : ''
  const fmtValue =
    value == null
      ? '—'
      : value.toLocaleString('es-ES', {
          maximumFractionDigits: spec.decimals ?? 2,
          minimumFractionDigits: spec.decimals ?? 0,
        })
  const trend = computeTrend(raw)
  return `
    <span style="display:inline-flex; flex-direction:column; gap:2px; padding:6px 10px; margin:0 2px; border-radius:6px; border:1px solid ${spec.accent}33; background:${spec.accent}10; vertical-align:middle; font-family:inherit; min-width:120px;">
      <span style="font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:${spec.accent};">${escapeHtml(spec.label)}</span>
      <span style="display:flex; align-items:baseline; gap:4px;">
        <span style="font-size:14px; font-weight:700; color:#0f172a; font-variant-numeric:tabular-nums;">${escapeHtml(fmtValue)}</span>
        <span style="font-size:10px; color:#64748b;">${escapeHtml(spec.unit)}</span>
        ${trend ? `<span style="font-size:9px; color:${trend.color}; margin-left:auto;">${trend.label}</span>` : ''}
      </span>
      <span style="font-size:8px; color:#94a3b8;">${time ? escapeHtml(time) : ''} · ${escapeHtml(spec.hint)}</span>
      ${errMsg}
    </span>
  `
}

function computeTrend(raw: any): { label: string; color: string } | null {
  if (!raw) return null
  const points = raw.points ?? raw.data?.points ?? raw.series ?? []
  if (!Array.isArray(points) || points.length < 2) return null
  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  const lastV = typeof last.value === 'number' ? last.value : null
  const prevV = typeof prev.value === 'number' ? prev.value : null
  if (lastV == null || prevV == null || prevV === 0) return null
  const delta = ((lastV - prevV) / Math.abs(prevV)) * 100
  if (Math.abs(delta) < 0.1) return null
  return {
    label: `${delta > 0 ? '▲' : '▼'}${Math.abs(delta).toFixed(1)}%`,
    color: delta > 0 ? '#16a34a' : '#dc2626',
  }
}

function escapeHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export { DATA_REGISTRY }
