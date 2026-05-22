'use client'
import { useParams } from 'next/navigation'
import { IndicatorDetailPage } from '@/components/macro/pulso/IndicatorDetailPage'

export default function MargenFiscalIndicatorPage() {
  const params = useParams<{ id: string }>()
  return <IndicatorDetailPage subtabSlug="margen-fiscal" id={params?.id || ''} />
}
