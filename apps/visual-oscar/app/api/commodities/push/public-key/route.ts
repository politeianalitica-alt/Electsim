const BACKEND = process.env.BACKEND_URL ?? ''
const API_KEY = process.env.BACKEND_API_KEY ?? ''

export async function GET() {
  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/commodities/push/public-key`, {
        headers: { 'X-API-Key': API_KEY },
        cache: 'no-store',
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch (e) {
    return Response.json(
      { enabled: false, reason: `proxy error: ${String(e)}` },
      { status: 200 },
    )
  }
  return Response.json({ enabled: false, reason: 'sin backend' })
}
