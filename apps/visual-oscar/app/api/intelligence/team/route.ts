import type { TeamMember } from '@/types/intelligence'
import { listDomain, MOCK_TEAM } from '../_proxy'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return listDomain<TeamMember>('/api/intelligence/team', MOCK_TEAM)
}
