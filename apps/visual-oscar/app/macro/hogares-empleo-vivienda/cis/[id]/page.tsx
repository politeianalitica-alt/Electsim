'use client'
import { useParams } from 'next/navigation'
import { CISCruceLanding } from '@/components/macro/pulso/CISCruceLanding'

export default function CisPage() {
  const params = useParams<{ id: string }>()
  return <CISCruceLanding cruceId={params?.id || ''} />
}
