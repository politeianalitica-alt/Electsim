'use client'
import { useParams } from 'next/navigation'
import { IndicatorDetailPage } from '@/components/macro/pulso/IndicatorDetailPage'

export default function IndicatorPage() {
  const params = useParams<{ id: string }>()
  return <IndicatorDetailPage subtabSlug="demografia-territorio" id={params?.id || ''} />
}
