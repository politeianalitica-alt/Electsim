'use client'
import { useParams } from 'next/navigation'
import { SegmentLanding } from '@/components/macro/pulso/SegmentLanding'

export default function SegmentPage() {
  const params = useParams<{ id: string }>()
  return <SegmentLanding segmentId={params?.id || ''} />
}
