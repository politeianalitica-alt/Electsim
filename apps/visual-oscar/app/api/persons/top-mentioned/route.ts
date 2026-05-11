import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { getAggregatedNews, topPersons, type PersonMention } from '@/lib/news-aggregator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export type TopPerson = PersonMention

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const path = `/api/persons/top-mentioned${params.toString() ? '?' + params.toString() : ''}`
  const real = await fromBackend<{ persons: TopPerson[]; total_unique: number }>(path)
  if (real && Array.isArray(real.persons) && real.persons.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  const hours = Math.min(720, Number(params.get('hours_back') || 168))
  const limit = Math.min(40, Number(params.get('limit') || 15))
  try {
    const articles = await getAggregatedNews({ maxSources: 40, hoursBack: hours })
    const persons = topPersons(articles, limit)
    return NextResponse.json(withMeta({
      persons,
      total_unique: persons.length,
    }, 'mock'))
  } catch {
    return NextResponse.json(withMeta({ persons: [], total_unique: 0 }, 'mock'))
  }
}
