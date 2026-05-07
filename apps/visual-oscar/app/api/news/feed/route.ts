import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// /api/news/feed — proxy a FastAPI · /api/news/feed (news_intelligence.py)
// Devuelve artículos analizados por Ollama desde news_articles
export interface NewsArticle {
  id: number
  title: string
  url: string
  source_name: string
  source_country: string
  source_region: string
  source_lat?: number
  source_lon?: number
  published_at: string | null
  scraped_at: string
  ai_summary?: string
  ai_analysis?: string
  ai_topics?: string[]
  ai_sentiment?: 'positivo' | 'negativo' | 'neutro' | 'mixto'
  ai_sentiment_target?: string
  ai_relevance: number
  ai_urgency?: string
  ai_impact_areas?: string[]
  ai_spain_impact?: 'ninguno' | 'bajo' | 'medio' | 'alto' | 'critico'
  ai_geo_location?: string
  ai_geo_lat?: number
  ai_geo_lon?: number
  ai_category?: string
  ai_language?: string
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/news/feed${params ? '?' + params : ''}`
  const real = await fromBackend<{ articles: NewsArticle[]; count: number }>(path)
  if (real && Array.isArray(real.articles)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ articles: [], count: 0, warning: 'backend offline' }, 'mock'))
}
