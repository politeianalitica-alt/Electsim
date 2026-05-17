/**
 * GET /api/sectores/farma/atc
 * Top códigos ATC (sistema clasificación terapéutica) por número de medicamentos.
 *
 * Agrega al primer nivel ATC (1 letra: A=Tracto digestivo, B=Sangre,
 * C=Cardio, D=Dermat, G=Genitourinario, H=Hormonas, J=Antiinfeccciosos,
 * L=Antineoplásicos, M=Locomotor, N=Sistema nervioso, P=Antiparasitario,
 * R=Respiratorio, S=Órganos sensoriales, V=Varios).
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchMedicamentos } from '@/lib/sources/aemps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ATC_LEVEL1: Record<string, string> = {
  A: 'Tracto alimentario y metabolismo',
  B: 'Sangre y órganos hematopoyéticos',
  C: 'Sistema cardiovascular',
  D: 'Dermatológicos',
  G: 'Sistema genitourinario y hormonas',
  H: 'Hormonas sistémicas (excl. sexuales)',
  J: 'Antiinfecciosos sistémicos',
  L: 'Antineoplásicos e inmunomoduladores',
  M: 'Sistema musculoesquelético',
  N: 'Sistema nervioso',
  P: 'Antiparasitarios e insecticidas',
  R: 'Sistema respiratorio',
  S: 'Órganos sensoriales',
  V: 'Varios',
}

const ATC_COLOR: Record<string, string> = {
  A: '#16A34A', B: '#DC2626', C: '#1F4E8C', D: '#F97316',
  G: '#EC4899', H: '#7C3AED', J: '#0EA5E9', L: '#5B21B6',
  M: '#0F766E', N: '#EAB308', P: '#525258', R: '#06B6D4',
  S: '#A855F7', V: '#737373',
}

export async function GET(req: NextRequest) {
  const sampleSize = clamp(Number(req.nextUrl.searchParams.get('sample') || 1000), 100, 2500)
  const counts: Record<string, number> = {}
  const pageSize = 250
  const pages = Math.ceil(sampleSize / pageSize)
  await Promise.all(
    Array.from({ length: pages }, (_, i) => i + 1).map(async pagina => {
      const r = await searchMedicamentos({ pagina, tamanioPagina: pageSize, comerc: 1 })
      for (const m of r.items) {
        const atcs = m.atcs || []
        for (const a of atcs) {
          const code = a.codigo?.[0]
          if (!code) continue
          counts[code] = (counts[code] || 0) + 1
          break  // solo primero
        }
      }
    }),
  )

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const items = Object.entries(counts)
    .map(([code, n]) => ({
      code,
      label: ATC_LEVEL1[code] || 'Otros',
      color: ATC_COLOR[code] || '#9CA3AF',
      n,
      pct: total > 0 ? Math.round((n / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.n - a.n)

  return NextResponse.json({
    items, total, sample_size: total,
    fuente: 'AEMPS · CIMA · agregado por ATC nivel 1 sobre sample',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
