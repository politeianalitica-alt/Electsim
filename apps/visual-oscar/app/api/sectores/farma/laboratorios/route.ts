/**
 * GET /api/sectores/farma/laboratorios
 * Top laboratorios titulares por número de medicamentos.
 *
 * Como CIMA no tiene endpoint nativo de agregación, agrupamos por
 * `labtitular` sobre el primer page de cada letra (muestreo) o sobre
 * un sample bigger via paginación múltiple.
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchMedicamentos } from '@/lib/sources/aemps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = clamp(Number(sp.get('limit') || 30), 5, 100)
  const sampleSize = 1000  // tomar muestra de 1000 medicamentos

  // Iteramos páginas de 100 (max permitido) hasta tener sample_size
  const counts: Record<string, number> = {}
  const pageSize = 250
  const pages = Math.ceil(sampleSize / pageSize)
  await Promise.all(
    Array.from({ length: pages }, (_, i) => i + 1).map(async pagina => {
      const r = await searchMedicamentos({ pagina, tamanioPagina: pageSize, comerc: 1 })
      for (const m of r.items) {
        const lab = (m.labtitular || '—').trim()
        counts[lab] = (counts[lab] || 0) + 1
      }
    }),
  )

  const ranking = Object.entries(counts)
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)

  return NextResponse.json({
    items: ranking,
    sample_size: Object.values(counts).reduce((a, b) => a + b, 0),
    total_unique_labs: Object.keys(counts).length,
    fuente: 'AEMPS · CIMA · agregado por labtitular sobre sample',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
