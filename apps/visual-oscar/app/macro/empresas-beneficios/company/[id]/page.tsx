'use client'
import { useParams } from 'next/navigation'
import { CompanyDetailLayout } from '@/components/macro/pulso/CompanyDetailLayout'

export default function CompanyPage() {
  const params = useParams<{ id: string }>()
  return <CompanyDetailLayout companyId={params?.id || ''} />
}
