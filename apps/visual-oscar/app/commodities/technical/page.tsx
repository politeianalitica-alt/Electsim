'use client'
/**
 * /commodities/technical · Análisis técnico avanzado + correlaciones +
 * impacto geopolítico
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useCommodityWatchlist } from '@/hooks/useCommodityWatchlist'
import { TechnicalDashboardTable } from '@/components/commodities/TechnicalDashboardTable'
import { CorrelationMatrix } from '@/components/commodities/CorrelationMatrix'
import { GeopoliticalImpact } from '@/components/commodities/GeopoliticalImpact'

export default function TechnicalPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { watchlist } = useCommodityWatchlist()

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/commodities" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
          ← Volver al dashboard
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '12px 0 4px' }}>
          Análisis técnico avanzado
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
          Resumen de señales técnicas, matriz de correlación entre commodities del
          watchlist e impacto observado de eventos geopolíticos.
        </p>

        {watchlist.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9ca3af' }}>
            Tu watchlist está vacía. Añade commodities desde el{' '}
            <Link href="/commodities" style={{ color: '#7c3aed' }}>dashboard</Link>.
          </p>
        ) : (
          <>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
                Tablero técnico · watchlist
              </h2>
              <TechnicalDashboardTable slugs={watchlist} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
                gap: 16,
              }}
            >
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
                  Matriz de correlación · returns diarios 1y
                </h2>
                <CorrelationMatrix slugs={watchlist} />
              </div>

              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <GeopoliticalImpact />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
