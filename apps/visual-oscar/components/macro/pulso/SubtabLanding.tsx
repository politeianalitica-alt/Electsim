'use client'
/**
 * `<SubtabLanding subtabSlug overrideLabel? />` · Landing standalone para
 * deep-links `/macro/{slug}/page.tsx` (acceso directo por URL).
 *
 * Desde Sprint L F1: el render INLINE en `/macro?tab={slug}` usa
 * `<SubtabContent>` directamente (sin chrome page). Esta landing sigue
 * existiendo para que las URLs `/macro/{slug}` funcionen y mantiene el
 * AppHeader + breadcrumb + auth check para la entrada directa.
 *
 * 14 subtabs registrados — ver `lib/macro/subtab-registry.ts`.
 */
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../../app/_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { SubtabContent } from './SubtabContent'
import { getSubtab, type SubtabConfig } from '@/lib/macro/subtab-registry'

interface Props {
  subtabSlug: string
  /** Si se proporciona, override del label. */
  overrideLabel?: string
}

export function SubtabLanding({ subtabSlug, overrideLabel }: Props) {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const config = getSubtab(subtabSlug) as SubtabConfig | undefined
  if (!config) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <AppHeader />
        <main style={{ maxWidth: 1320, margin: '0 auto', padding: '40px 20px' }}>
          <h1 style={{ color: '#dc2626' }}>Subtab no encontrado</h1>
          <p style={{ color: '#64748b' }}>
            El subtab <code>{subtabSlug}</code> no está registrado.{' '}
            <Link href="/macro" style={{ color: '#0F766E' }}>Volver a Macro</Link>
          </p>
        </main>
      </div>
    )
  }

  const label = overrideLabel ?? config.label

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>
            ← Macro
          </Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{label}</span>
        </div>

        <SubtabContent subtabSlug={subtabSlug} overrideLabel={overrideLabel} showHeader={true} />
      </main>
    </div>
  )
}

export default SubtabLanding
