'use client'
/**
 * /sector-energia/empresas/[slug] · Sprint Energía S9
 *
 * Ficha drill-down de una empresa energética. Carga `/api/energia/empresas/
 * [slug]` (catálogo + Finnhub + OpenCorporates) y la renderiza con
 * <EnergyCompanyFicha />. Empty-state si el slug no existe en el catálogo.
 *
 * Cero emojis · Unicode (←).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import AppHeader from '../../../_components/AppHeader'
import { EnergyCompanyFicha } from '../../_components/EnergyCompanyFicha'
import type { EnergyCompanyFichaData } from '@/lib/energia/types'

export default function EnergiaEmpresaFichaPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const slug = decodeURIComponent(params.slug)
  const [data, setData] = useState<EnergyCompanyFichaData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    fetch(`/api/energia/empresas/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => null)
        if (!alive) return
        if (r.status === 404 || (j && j.ok === false && j.error === 'not_found')) {
          setStatus('notfound')
          return
        }
        if (j?.ok && j.data) {
          setData(j.data as EnergyCompanyFichaData)
          setStatus('ok')
        } else {
          setStatus('error')
        }
      })
      .catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [slug])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 12, fontSize: 11.5 }}>
          <Link href="/sector-energia/empresas" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>← Empresas energéticas</Link>
          {data && (
            <>
              <span style={{ color: '#9CA3AF', margin: '0 6px' }}>·</span>
              <span style={{ color: '#6e6e73' }}>{data.nombre}</span>
            </>
          )}
        </div>

        {status === 'loading' && (
          <p style={{ textAlign: 'center', padding: 40, color: '#86868b' }}>Cargando ficha de empresa…</p>
        )}

        {status === 'notfound' && (
          <div style={{ paddingTop: 24, textAlign: 'center', color: '#86868b' }}>
            <p style={{ fontSize: 14 }}>Empresa «{slug}» no encontrada en el catálogo energético.</p>
            <Link href="/sector-energia/empresas" style={{ color: '#16A34A', fontWeight: 600 }}>← Volver al listado</Link>
          </div>
        )}

        {status === 'error' && (
          <div style={{ paddingTop: 24, textAlign: 'center', color: '#86868b' }}>
            <p style={{ fontSize: 14 }}>No se pudo cargar la ficha ahora. Reintenta en unos instantes.</p>
            <Link href="/sector-energia/empresas" style={{ color: '#16A34A', fontWeight: 600 }}>← Volver al listado</Link>
          </div>
        )}

        {status === 'ok' && data && <EnergyCompanyFicha company={data} />}
      </main>
    </div>
  )
}
