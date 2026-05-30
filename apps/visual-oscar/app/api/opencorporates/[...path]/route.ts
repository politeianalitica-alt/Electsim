/**
 * /api/opencorporates/[...path] · proxy a OpenCorporates v0.4.
 *
 * Wrappea `lib/opencorporates/client.ts` para que componentes cliente
 * puedan consultar sin exponer la API key al navegador.
 *
 * Rutas:
 *   GET /api/opencorporates/health
 *   GET /api/opencorporates/companies/search?q=NAME&country_code=es&limit=30
 *   GET /api/opencorporates/officers/search?q=NAME&limit=30
 *   GET /api/opencorporates/companies/<jurisdiction>/<company_number>
 *   GET /api/opencorporates/by-country?country_code=es&limit=20
 *
 * Cache HTTP 24h.
 */
import { NextResponse } from 'next/server'
import {
  searchCompanies,
  searchOfficers,
  getCompany,
  topCompaniesByCountry,
  hasApiKey,
} from '@/lib/opencorporates/client'

export const revalidate = 86400

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (!action || action === 'health') {
    return NextResponse.json({
      ok: true,
      service: 'OpenCorporates v0.4 proxy',
      has_api_key: hasApiKey(),
      base: 'https://api.opencorporates.com/v0.4',
      routes: [
        '/companies/search?q=NAME&country_code=es&limit=30',
        '/officers/search?q=NAME&limit=30',
        '/companies/<jurisdiction>/<company_number>',
        '/by-country?country_code=es&limit=20',
      ],
    })
  }

  // /api/opencorporates/companies/search?q=...
  if (action === 'companies' && segs[1] === 'search') {
    const q = url.searchParams.get('q') || ''
    const country_code = url.searchParams.get('country_code') || undefined
    const limit = Number(url.searchParams.get('limit') || 30)
    const page = Number(url.searchParams.get('page') || 1)
    const result = await searchCompanies(q, { country_code, limit, page })
    return NextResponse.json(result)
  }

  // /api/opencorporates/companies/<jurisdiction>/<company_number>
  if (action === 'companies' && segs[1] && segs[2] && segs[1] !== 'search') {
    const result = await getCompany(segs[1], segs[2])
    return NextResponse.json(result)
  }

  // /api/opencorporates/officers/search?q=...
  if (action === 'officers' && segs[1] === 'search') {
    const q = url.searchParams.get('q') || ''
    const limit = Number(url.searchParams.get('limit') || 30)
    const page = Number(url.searchParams.get('page') || 1)
    const result = await searchOfficers(q, { limit, page })
    return NextResponse.json(result)
  }

  // /api/opencorporates/by-country?country_code=es
  if (action === 'by-country') {
    const country_code = url.searchParams.get('country_code') || ''
    const limit = Number(url.searchParams.get('limit') || 20)
    const result = await topCompaniesByCountry(country_code, limit)
    return NextResponse.json(result)
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'unknown action',
      available: ['health', 'companies/search', 'companies/<j>/<n>', 'officers/search', 'by-country'],
    },
    { status: 400 },
  )
}
