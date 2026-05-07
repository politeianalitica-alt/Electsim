import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface NarrativeFrameAnalysis {
  problem_definition?: string
  causal_interpretation?: string
  moral_evaluation?: string
  treatment_recommendation?: string
  dominant_metaphor?: string
  frame_label?: string
  actors_protagonist?: string[]
  actors_antagonist?: string[]
  ideological_lean?: string
  narrative_velocity?: string
  counter_frame_suggested?: string
  strategic_recommendation?: string
  error?: string
}

export interface Narrative {
  topic: string
  category: string
  n_articles: number
  n_sources: number
  dominant_sentiment: string
  sentiment_polarity: number
  avg_relevance: number
  high_impact_count: number
  velocity: 'subiendo' | 'estable' | 'bajando'
  recent_24h: number
  top_personas: { name: string; cnt: number }[]
  top_orgs:     { name: string; cnt: number }[]
  countries:    { name: string; cnt: number }[]
  samples: Array<{ id: number; title: string; source: string; summary: string; sentiment: string; relevance: number; spain_impact: string }>
  framework_analysis?: NarrativeFrameAnalysis
  first_seen?: string
  last_seen?: string
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const path = `/api/narratives/analysis${params ? '?' + params : ''}`
  const real = await fromBackend<{ narratives: Narrative[]; categories_dist: Record<string, number>; total_clusters: number }>(path)
  if (real && Array.isArray(real.narratives)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  return NextResponse.json(withMeta({ narratives: [], categories_dist: {}, total_clusters: 0 }, 'mock'))
}
