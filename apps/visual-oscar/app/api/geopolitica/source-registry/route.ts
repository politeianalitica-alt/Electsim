import { NextResponse } from 'next/server'
import { geoSourceRegistrySummary, resolveGeoSourceRegistry } from '@/lib/geopolitica/source-registry'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET() {
  const sources = resolveGeoSourceRegistry()
  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    summary: geoSourceRegistrySummary(sources),
    sources,
    policy: {
      no_demo_as_live: true,
      acled_without_access: 'show_empty_state_needs_config',
      gdelt_without_key: 'use_live_public_api_with_cache',
      restricted_sources_without_key: 'degrade_or_hide_component',
    },
  })
}
