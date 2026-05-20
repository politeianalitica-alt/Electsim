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
import { useNotebooks } from '@/hooks/intelligence'
import type { EstadoNotebook } from '@/types/intelligence'

const ESTADO_COLOR: Record<EstadoNotebook, string> = {
  borrador: '#6e6e73', revision: '#F97316', aprobado: '#16A34A', archivado: '#86868b',
}
const ESTADO_LABEL: Record<EstadoNotebook, string> = {
  borrador: 'Borrador', revision: 'Revision', aprobado: 'Aprobado', archivado: 'Archivado',
}

type TabFilter = 'todos' | EstadoNotebook

export default function NotebookListPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, isLoading } = useNotebooks()
  const items = data?.items ?? []

  const [tab, setTab] = useState<TabFilter>('todos')

  const counts = useMemo(() => {
    const c: Record<EstadoNotebook, number> = { borrador: 0, revision: 0, aprobado: 0, archivado: 0 }
    items.forEach(n => { c[n.estado]++ })
    return c
  }, [items])

  const filtered = tab === 'todos' ? items : items.filter(n => n.estado === tab)

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
 <AppHeader />
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
 <IntelHero
          eyebrow="ANALYST NOTEBOOKS · CUADERNOS DE TRABAJO"
          title={`${items.length} cuadernos activos`}
          subtitle="Espacios estructurados para hallazgos, hipotesis, citas y preguntas. Cada cuaderno mantiene historico de versiones."
          kpis={[
            { label: 'En revision', value: counts.revision, accent: '#FCD34D' },
            { label: 'Aprobados', value: counts.aprobado, accent: '#86EFAC' },
            { label: 'Borradores', value: counts.borrador, accent: '#C4B5FD' },
            { label: 'Total', value: items.length, accent: '#7DD3FC' },
          ]}
        />

 <div style={{ marginBottom: 14 }}>
 <IntelTabs<TabFilter>
            tabs={[
              { id: 'todos', label: 'Todos', count: items.length },
              { id: 'borrador', label: 'Borradores', count: counts.borrador },
              { id: 'revision', label: 'En revision', count: counts.revision },
              { id: 'aprobado', label: 'Aprobados', count: counts.aprobado },
              { id: 'archivado', label: 'Archivados', count: counts.archivado },
            ]}
            active={tab}
            onChange={setTab}
          />
 </div>

        {isLoading && <IntelEmpty title="Cargando cuadernos" />}
        {!isLoading && filtered.length === 0 && <IntelEmpty title="Sin cuadernos" description="No hay cuadernos para el filtro seleccionado." />}

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
          {filtered.map(n => (
 <Link key={n.id} href={`/notebook/${n.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
 <IntelCard hoverable padding="18px 20px">
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
 <IntelBadge color={ESTADO_COLOR[n.estado]} variant="soft" size="xs">{ESTADO_LABEL[n.estado]}</IntelBadge>
 <span style={{ fontSize: 10.5, color: '#86868b', fontWeight: 600 }}>v{n.version}</span>
 </div>
 <h3 style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f', lineHeight: 1.35 }}>{n.titulo}</h3>
                {n.resumen && <p style={{ fontSize: 12.5, color: '#6e6e73', margin: '0 0 12px', lineHeight: 1.45,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{n.resumen}</p>}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {n.tags.slice(0, 3).map(t => <IntelBadge key={t} color="#1F4E8C" variant="outline" size="xs">{t}</IntelBadge>)}
 </div>
 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#86868b', borderTop: '1px solid #F5F5F7', paddingTop: 8 }}>
 <span>{n.autor}</span>
 <span>{new Date(n.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
 </div>
 </IntelCard>
 </Link>
          ))}
 </div>
 </main>
 </div>
  )
}
