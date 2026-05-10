import type { EvidenciaDraft } from '@/types/intelligence'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { url?: string }
    const url = body.url ?? ''
    if (!url) return Response.json({ error: 'url_required' }, { status: 400 })

    try {
      if (BACKEND) {
        const res = await fetch(`${BACKEND}/api/v1/intelligence/evidencias/scrape`, {
          method: 'POST',
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        if (res.ok) return Response.json(await res.json())
      }
    } catch {}

    let host = ''
    try { host = new URL(url).hostname.replace(/^www\./, '') } catch {}
    const fuenteId = host.includes('boe.es') ? 'src-boe'
      : host.includes('congreso.es') ? 'src-congreso'
      : host.includes('senado.es') ? 'src-senado'
      : host.includes('lamoncloa') ? 'src-moncloa'
      : host.includes('elpais') ? 'src-elpais'
      : host.includes('elmundo') ? 'src-elmundo'
      : host.includes('rtve') ? 'src-rtve'
      : host.includes('eldiario') ? 'src-eldiario'
      : 'src-elpais'

    const draft: EvidenciaDraft = {
      titulo: `Documento extraido de ${host || 'fuente externa'}`,
      resumen: 'Resumen automatico generado a partir del contenido de la URL. El analista puede editar este texto antes de guardar.',
      url,
      fuente_id: fuenteId,
      credibilidad: 'B',
      confianza: 3,
      clasificacion: 'interna',
      tags: [],
      entidades: [],
    }
    return Response.json(draft)
  } catch {
    return Response.json({ error: 'invalid_payload' }, { status: 400 })
  }
}
