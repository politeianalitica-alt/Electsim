/**
 * Helpers de proxy para los 15 endpoints de intelligence.
 *
 * Cada route.ts del módulo intelligence usa estas funciones para:
 *  1. Llamar al backend FastAPI real (`/api/intelligence/<dominio>`)
 *  2. Adaptar la respuesta al shape esperado por la UI (compatibilidad)
 *  3. Si el backend no responde, devolver fallback con `_meta.source='mock'`
 *     y `_warnings:['backend_unreachable']` para que la UI marque honestamente.
 *
 * Esto sustituye al patrón anterior de leer datos del módulo `_mock.ts`
 * de forma silenciosa (que enmascaraba si el backend estaba caído).
 */

import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { MOCK_NOTEBOOKS, MOCK_CANVAS, MOCK_EVIDENCIAS, MOCK_FUENTES, MOCK_DRAFTS, MOCK_WATCHLISTS, MOCK_TEAM, MOCK_HIPOTESIS, nowIso } from './_mock'
import type { Canvas, Evidencia, Fuente, Notebook } from '@/types/intelligence'

type Item = unknown

/** Genérico para listar items de un dominio. */
export async function listDomain<T extends Item>(
  backendPath: string,
  fallback: T[],
  options: { workspace_id?: string; demoNote?: string } = {},
): Promise<Response> {
  const ws = options.workspace_id ?? 'default'
  const url = `${backendPath}?workspace_id=${encodeURIComponent(ws)}`
  const result = await callBackend<{ items: T[]; total?: number }>(url)

  if (result.data && Array.isArray(result.data.items)) {
    return NextResponse.json(
      withMeta(
        { items: result.data.items, total: result.data.total ?? result.data.items.length, generado_en: nowIso() },
 'backend',
        { latency_ms: result.latency_ms },
      ),
    )
  }

  // Fallback: items curados (demo) con meta honesta.
  const warnings = result.error
    ? [`backend_unreachable:${result.error}`]
    : ['backend_returned_no_data']
  if (options.demoNote) warnings.push(options.demoNote)
  return NextResponse.json(
    withMeta(
      { items: fallback, total: fallback.length, generado_en: nowIso() },
 'mock',
      { warnings, latency_ms: result.latency_ms },
    ),
  )
}

/** Genérico para crear un item nuevo en un dominio. */
export async function createInDomain<TIn, TOut>(
  backendPath: string,
  body: TIn,
  buildFallback: () => TOut,
  options: { workspace_id?: string } = {},
): Promise<Response> {
  const ws = options.workspace_id ?? 'default'
  const url = `${backendPath}?workspace_id=${encodeURIComponent(ws)}`
  const result = await callBackend<TOut>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (result.data) {
    return NextResponse.json(withMeta(result.data as object, 'backend', { latency_ms: result.latency_ms }))
  }
  // Backend caído: devolvemos un fallback local SIN persistencia. El cliente
  // verá `_meta.source='mock'` y sabrá que su creación NO se persistió.
  return NextResponse.json(
    withMeta(buildFallback() as object, 'mock', {
      warnings: ['backend_unreachable:create_not_persisted'],
    }),
  )
}

// ─── Exports para que cada route.ts pase su fallback curado ────────────────
export {
  MOCK_NOTEBOOKS,
  MOCK_CANVAS,
  MOCK_EVIDENCIAS,
  MOCK_FUENTES,
  MOCK_DRAFTS,
  MOCK_WATCHLISTS,
  MOCK_TEAM,
  MOCK_HIPOTESIS,
  nowIso,
}
export type { Canvas, Evidencia, Fuente, Notebook }
