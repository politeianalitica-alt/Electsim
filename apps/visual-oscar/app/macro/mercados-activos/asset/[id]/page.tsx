'use client'
import { useParams } from 'next/navigation'
import { AssetDetailLayout } from '@/components/macro/pulso/AssetDetailLayout'

export default function AssetPage() {
  const params = useParams<{ id: string }>()
  return <AssetDetailLayout assetId={params?.id || ''} />
}
