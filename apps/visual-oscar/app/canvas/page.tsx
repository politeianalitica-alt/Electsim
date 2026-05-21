'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import IntelHero from '../_components/intel/IntelHero'
import IntelCard from '../_components/intel/IntelCard'
import IntelTabs from '../_components/intel/IntelTabs'
import IntelEmpty from '../_components/intel/IntelEmpty'
import IntelBadge from '../_components/intel/IntelBadge'
import { isAuthenticated } from '@/lib/auth'
import { useCanvasList } from '@/hooks/intelligence'
import type { TipoCanvas } from '@/types/intelligence'

const TIPO_LABEL: Record<TipoCanvas, string> = {
  ach: 'ACH', stakeholder: 'Stakeholders', scenario: 'Escenarios', risk: 'Riesgo', timeline: 'Cronologia',
}
const TIPO_COLOR: Record<TipoCanvas, string> = {
  ach: '#1F4E8C', stakeholder: '#0F766E', scenario: '#5B21B6', risk: '#DC2626', timeline: '#F97316',
}

type TabFilter = 'todos' | TipoCanvas

export default function CanvasListPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, isLoading } = useCanvasList()
  const items = data?.items ?? []
  const [tab, setTab] = useState<TabFilter>('todos')

  const counts = useMemo(() => {
    const c: Record<TipoCanvas, number> = { ach: 0, stakeholder: 0, scenario: 0, risk: 0, timeline: 0 }
    items.forEach(i => { c[i.tipo]++ })
    return c
  }, [items])
  const filtered = tab === 'todos' ? items : items.filter(c => c.tipo === tab)

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
 <AppHeader />
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
 <IntelHero
          eyebrow="CANVAS · LIENZOS ESTRUCTURADOS"
          title={`${items.length} canvas activos`}
          subtitle="Marcos de trabajo para analisis competitivo de hipotesis (ACH), mapeo de stakeholders, escenarios, mapas de riesgo y cronologias."
          kpis={[
            { label: 'ACH', value: counts.ach, accent: '#7DD3FC' },
            { label: 'Stakeholder', value: counts.stakeholder, accent: '#86EFAC' },
            { label: 'Escenarios', value: counts.scenario, accent: '#C4B5FD' },
            { label: 'Riesgo', value: counts.risk, accent: '#FCA5A5' },
          ]}
        />

 <div style={{ marginBottom: 14 }}>
 <IntelTabs<TabFilter>
            tabs={[
              { id: 'todos', label: 'Todos', count: items.length },
              { id: 'ach', label: 'ACH', count: counts.ach },
              { id: 'stakeholder', label: 'Stakeholders', count: counts.stakeholder },
              { id: 'scenario', label: 'Escenarios', count: counts.scenario },
              { id: 'risk', label: 'Riesgo', count: counts.risk },
              { id: 'timeline', label: 'Cronologia', count: counts.timeline },
            ]}
            active={tab}
            onChange={setTab}
          />
 </div>

        {isLoading && <IntelEmpty title="Cargando canvas" />}
        {!isLoading && filtered.length === 0 && <IntelEmpty title="Sin canvas" description="No hay canvas para el filtro seleccionado." />}

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
          {filtered.map(c => (
 <Link key={c.id} href={`/canvas/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
 <IntelCard hoverable padding="18px 20px">
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
 <IntelBadge color={TIPO_COLOR[c.tipo]} variant="solid" size="xs">{TIPO_LABEL[c.tipo]}</IntelBadge>
 </div>
 <h3 style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f', lineHeight: 1.35 }}>{c.titulo}</h3>
                {c.descripcion && <p style={{ fontSize: 12.5, color: '#6e6e73', margin: '0 0 12px', lineHeight: 1.45,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{c.descripcion}</p>}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {c.tags.slice(0, 3).map(t => <IntelBadge key={t} color="#1F4E8C" variant="outline" size="xs">{t}</IntelBadge>)}
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#86868b', borderTop: '1px solid #F5F5F7', paddingTop: 8 }}>
 <span>{c.autor}</span>
 <span>{new Date(c.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
 </div>
 </IntelCard>
 </Link>
          ))}
 </div>
 </main>
 </div>
  )
}
