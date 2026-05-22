'use client'
import { useParams } from 'next/navigation'
import { SectorDetailLayout } from '@/components/macro/pulso/SectorDetailLayout'

export default function SectorPage() {
  const params = useParams<{ id: string }>()
  return <SectorDetailLayout sectorId={params?.id || ''} />
}
