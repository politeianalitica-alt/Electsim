'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useMediosNarrativa } from '@/hooks/narrativa/useMediosNarrativa'

export default function MediosNarrativaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])
  const { snapshot, loading } = useMediosNarrativa()

  if (loading || !snapshot) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <AppHeader />
        <div style={{ maxWidth: 1500, margin: '0 auto', padding: '80px 28px', textAlign: 'center', color: '#6e6e73', fontSize: 13 }}>
          Cargando análisis de medios y narrativa…
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <pre style={{ fontSize: 11, color: '#6e6e73' }}>{JSON.stringify(snapshot, null, 2)}</pre>
      </main>
    </div>
  )
}
