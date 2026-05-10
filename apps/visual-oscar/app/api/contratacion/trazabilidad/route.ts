import type { TrazabilidadSnapshot } from '@/types/contratacion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/contratacion/trazabilidad`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
    return Response.json({ expedientes: [] } satisfies TrazabilidadSnapshot)
  } catch {
    return Response.json({ expedientes: [] } satisfies TrazabilidadSnapshot)
  }
}
