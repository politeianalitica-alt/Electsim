import type { SectorIntelOverview } from '@/types/sector-intel'

const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 600

const EMPTY = (sector: string): SectorIntelOverview => ({
  sector,
  headline_kpis: [],
  alerts: [],
  table: { columns: [], rows: [] },
  sources: [],
  generado_en: new Date().toISOString(),
})

export async function GET(_req: Request, { params }: { params: { sector: string } }) {
  const { sector } = params
  try {
    if (BACKEND) {
      const res = await fetch(
        `${BACKEND}/api/v1/sector-intel/${encodeURIComponent(sector)}/overview`,
        {
          headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
          next: { revalidate: 600 },
        },
      )
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ ...EMPTY(sector), error: String(e) }, { status: 502 })
  }
  return Response.json(EMPTY(sector))
}
