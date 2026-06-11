/**
 * client-pdf — descarga un PDF generado server-side (/api/render/pdf).
 *
 * Fase 3: los entregables de Cama y Preinformes salen con plantilla
 * corporativa real (@react-pdf/renderer) en lugar de window.print().
 * Devuelve false si la generación falla, para que el caller pueda caer
 * al fallback de impresión del navegador.
 */

import { mdToBlocks } from './md-to-blocks'

export interface ClientPdfSpec {
  title: string
  subtitle?: string
  markdown: string
  meta?: Record<string, string | number>
}

export async function downloadServerPdf(spec: ClientPdfSpec): Promise<boolean> {
  try {
    const res = await fetch('/api/render/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: spec.title,
        subtitle: spec.subtitle,
        workspace: 'Politeia Analítica',
        generatedAt: new Date().toISOString(),
        blocks: [
          ...mdToBlocks(spec.markdown, { skipFirstH1: true }),
          { type: 'footer', text: 'Politeia Analítica · documento preliminar · uso interno' },
        ],
        meta: spec.meta,
      }),
    })
    if (!res.ok) return false
    const blob = await res.blob()
    if (!blob.size) return false
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'documento'}.pdf`
    a.click()
    URL.revokeObjectURL(a.href)
    return true
  } catch {
    return false
  }
}
