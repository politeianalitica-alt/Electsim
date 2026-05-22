'use client'
import { useParams } from 'next/navigation'
import { RegionLanding } from '@/components/macro/pulso/RegionLanding'

export default function RegionPage() {
  const params = useParams<{ ccaa: string }>()
  return <RegionLanding subtabSlug="sociedad-bienestar" ccaaId={params?.ccaa || ''} />
}
