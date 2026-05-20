const BACKEND = process.env.BACKEND_URL ?? ''
export const revalidate = 600

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sector = searchParams.get('sector')
  const qs = sector ? `?sector=${encodeURIComponent(sector)}` : ''
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/commodities/recipes${qs}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 600 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json({ error: String(e), n_items: 0, items: [] }, { status: 502 })
  }
  return Response.json({ n_items: 0, items: [] })
}
