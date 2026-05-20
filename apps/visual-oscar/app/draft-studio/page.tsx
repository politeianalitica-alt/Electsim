'use client'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import IntelHero from '../_components/intel/IntelHero'
import IntelCard from '../_components/intel/IntelCard'
import IntelEmpty from '../_components/intel/IntelEmpty'
import IntelBadge from '../_components/intel/IntelBadge'
import { isAuthenticated } from '@/lib/auth'
import { useDrafts } from '@/hooks/intelligence'
import type { EstadoDraft, TipoProducto, ClasificacionDraft } from '@/types/intelligence'

const ESTADOS: { id: EstadoDraft; label: string; color: string }[] = [
  { id: 'borrador', label: 'Borradores', color: '#6e6e73' },
  { id: 'revision_interna', label: 'Revision interna', color: '#F97316' },
  { id: 'aprobado', label: 'Aprobados', color: '#16A34A' },
  { id: 'entregado', label: 'Entregados', color: '#1F4E8C' },
]

const TIPO_LABEL: Record<TipoProducto, string> = {
  memo: 'Memo', informe: 'Informe', briefing: 'Briefing', alerta: 'Alerta', ejecutivo: 'Ejecutivo',
}
const TIPO_COLOR: Record<TipoProducto, string> = {
  memo: '#1F4E8C', informe: '#0F766E', briefing: '#5B21B6', alerta: '#DC2626', ejecutivo: '#F97316',
}
const CLAS_COLOR: Record<ClasificacionDraft, string> = {
  publica: '#16A34A', interna: '#1F4E8C', confidencial: '#F97316', restringida: '#DC2626',
}

function TipoIcon({ tipo }: { tipo: TipoProducto }) {
  const stroke = TIPO_COLOR[tipo]
  return (
 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
 <polyline points="14 2 14 8 20 8" />
 <line x1="9" y1="13" x2="15" y2="13" />
 <line x1="9" y1="17" x2="14" y2="17" />
 </svg>
  )
}

export default function DraftStudioPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data, isLoading } = useDrafts()
  const items = data?.items ?? []

  const grouped = useMemo(() => {
    const g: Record<EstadoDraft, typeof items> = { borrador: [], revision_interna: [], aprobado: [], entregado: [] }
    items.forEach(d => { g[d.estado].push(d) })
    return g
  }, [items])

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
 <AppHeader />
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
 <IntelHero
          eyebrow="DRAFT STUDIO · MEMOS, INFORMES, BRIEFINGS"
          title={`${items.length} documentos en flujo`}
          subtitle="Tablero de produccion editorial. Cada documento avanza por borrador, revision interna, aprobacion y entrega."
          kpis={[
            { label: 'Borrador', value: grouped.borrador.length, accent: '#C4B5FD' },
            { label: 'Revision', value: grouped.revision_interna.length, accent: '#FCD34D' },
            { label: 'Aprobado', value: grouped.aprobado.length, accent: '#86EFAC' },
            { label: 'Entregado', value: grouped.entregado.length, accent: '#7DD3FC' },
          ]}
        />

        {isLoading && <IntelEmpty title="Cargando documentos" />}
        {!isLoading && items.length === 0 && <IntelEmpty title="Sin documentos" />}

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 4 }}>
          {ESTADOS.map(col => (
 <div key={col.id} style={{ background: '#F5F5F7', borderRadius: 14, padding: 12, minHeight: 360 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', marginBottom: 10 }}>
 <span style={{ fontSize: 10.5, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.10em' }}>{col.label}</span>
 <IntelBadge color={col.color} variant="solid" size="xs">{grouped[col.id].length}</IntelBadge>
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped[col.id].length === 0 && (
 <div style={{ fontSize: 11.5, color: '#86868b', padding: 12, textAlign: 'center', fontStyle: 'italic' }}>Sin documentos</div>
                )}
                {grouped[col.id].map(d => (
 <Link key={d.id} href={`/draft-studio/${d.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
 <IntelCard hoverable padding="12px 14px">
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
 <TipoIcon tipo={d.tipo} />
 <IntelBadge color={TIPO_COLOR[d.tipo]} size="xs">{TIPO_LABEL[d.tipo]}</IntelBadge>
 </div>
 <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.35, marginBottom: 8 }}>{d.titulo}</div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F5F5F7', paddingTop: 6 }}>
 <IntelBadge color={CLAS_COLOR[d.clasificacion]} variant="outline" size="xs">{d.clasificacion}</IntelBadge>
 <span style={{ fontSize: 10, color: '#86868b' }}>{new Date(d.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
 </div>
 </IntelCard>
 </Link>
                ))}
 </div>
 </div>
          ))}
 </div>
 </main>
 </div>
  )
}
