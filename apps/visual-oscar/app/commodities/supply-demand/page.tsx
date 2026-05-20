'use client'
/**
 * /commodities/supply-demand · Balance global de O&D
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { SUPPLY_DEMAND_FIXTURE, listSupplyDemandCommodities, getSupplyDemand } from '@/data/supply-demand-fixture'
import { SupplyDemandBalance } from '@/components/commodities/SupplyDemandBalance'
import { ProducersTable } from '@/components/commodities/ProducersTable'
import { CropCalendar } from '@/components/commodities/CropCalendar'

export default function SupplyDemandPage() {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const slugs = listSupplyDemandCommodities()
  const [slug, setSlug] = useState<string>(slugs[0])
  const data = getSupplyDemand(slug)

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <AppHeader />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <Link href="/commodities" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
          ← Volver al dashboard
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '12px 0 4px' }}>
          Oferta y Demanda · Balance global
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
          Producción, consumo, stocks y exportaciones por año. Fuente USDA WASDE / FAOSTAT.
        </p>

        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginRight: 8 }}>
            Commodity:
          </span>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: 13,
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              background: '#fff',
            }}
          >
            {slugs.map((s) => (
              <option key={s} value={s}>
                {SUPPLY_DEMAND_FIXTURE[s]?.commodity_slug ?? s}
              </option>
            ))}
          </select>
        </div>

        {data ? (
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
              <SupplyDemandBalance data={data} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                <ProducersTable data={data} />
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                  Calendario de cultivo
                </h3>
                <CropCalendar slug={slug} />
              </div>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>Sin datos de oferta/demanda.</p>
        )}
      </div>
    </div>
  )
}
