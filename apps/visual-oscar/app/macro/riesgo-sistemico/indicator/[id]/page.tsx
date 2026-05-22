'use client'
import { useParams } from 'next/navigation'
import { IndicatorDetailPage } from '@/components/macro/pulso/IndicatorDetailPage'

export default function RiesgoSistemicoIndicatorPage() {
  const params = useParams<{ id: string }>()
  return <IndicatorDetailPage subtabSlug="riesgo-sistemico" id={params?.id || ''} />
}
