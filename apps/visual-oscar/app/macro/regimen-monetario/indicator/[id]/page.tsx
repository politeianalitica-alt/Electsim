'use client'
import { useParams } from 'next/navigation'
import { IndicatorDetailPage } from '@/components/macro/pulso/IndicatorDetailPage'

export default function RegimenMonetarioIndicatorPage() {
  const params = useParams<{ id: string }>()
  return <IndicatorDetailPage subtabSlug="regimen-monetario" id={params?.id || ''} />
}
