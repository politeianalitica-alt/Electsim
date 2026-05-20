'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import IntelCard from '../../_components/intel/IntelCard'
import IntelBadge from '../../_components/intel/IntelBadge'
import IntelEmpty from '../../_components/intel/IntelEmpty'
import { isAuthenticated } from '@/lib/auth'
import { useDraft } from '@/hooks/intelligence'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { EstadoDraft, SeccionDraft } from '@/types/intelligence'

const ESTADOS: EstadoDraft[] = ['borrador', 'revision_interna', 'aprobado', 'entregado']
const ESTADO_LABEL: Record<EstadoDraft, string> = {
  borrador: 'Borrador', revision_interna: 'Revision interna', aprobado: 'Aprobado', entregado: 'Entregado',
}
const ESTADO_COLOR: Record<EstadoDraft, string> = {
  borrador: '#6e6e73', revision_interna: '#F97316', aprobado: '#16A34A', entregado: '#1F4E8C',
}

export default function DraftEditorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data: draft, isLoading, refetch } = useDraft(id)
  const [secciones, setSecciones] = useState<SeccionDraft[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [estado, setEstado] = useState<EstadoDraft>('borrador')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!draft) return
    setSecciones(draft.secciones)
    setEstado(draft.estado)
    if (draft.secciones.length > 0 && !activeId) {
      setActiveId(draft.secciones[0].id)
      setContent(draft.secciones[0].contenido)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  function selectSection(secId: string) {
    setActiveId(secId)
    const sec = secciones.find(s => s.id === secId)
    setContent(sec?.contenido ?? '')
  }

  function handleContentChange(value: string) {
    setContent(value)
    if (!activeId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        await intelligenceApi.updateDraftSection(id, { seccion_id: activeId, contenido: value })
        setSecciones(prev => prev.map(s => s.id === activeId ? { ...s, contenido: value } : s))
      } catch {}
    }, 800)
  }

  async function advance() {
    const idx = ESTADOS.indexOf(estado)
    if (idx < ESTADOS.length - 1) {
      const next = ESTADOS[idx + 1]
      try {
        await intelligenceApi.advanceDraftEstado(id, next)
        setEstado(next)
      } catch {}
    }
  }

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
 <AppHeader />
 <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
 <Link href="/draft-studio" style={{ fontSize: 12, color: '#1F4E8C', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Volver al studio
 </Link>

        {isLoading && <IntelEmpty title="Cargando documento" />}
        {draft && (
 <>
 <header style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
 <div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
 <IntelBadge color="#5B21B6" variant="solid" size="xs">{draft.tipo.toUpperCase()}</IntelBadge>
 <IntelBadge color="#1F4E8C" size="xs">{draft.clasificacion}</IntelBadge>
 <IntelBadge color={ESTADO_COLOR[estado]} size="xs">{ESTADO_LABEL[estado]}</IntelBadge>
 </div>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.022em', margin: '0 0 4px', lineHeight: 1.15 }}>{draft.titulo}</h1>
                {draft.resumen && <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, maxWidth: 720 }}>{draft.resumen}</p>}
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {estado !== 'entregado' && (
 <button onClick={advance} style={primaryBtn}>Avanzar a {ESTADO_LABEL[ESTADOS[ESTADOS.indexOf(estado) + 1]]}</button>
                )}
 <div style={{ display: 'flex', gap: 6 }}>
 <button onClick={() => alert('Exportar PDF disponible en backend.')} style={secondaryBtn}>PDF</button>
 <button onClick={() => alert('Exportar Markdown disponible en backend.')} style={secondaryBtn}>Markdown</button>
 <button onClick={refetch} style={secondaryBtn}>Refrescar</button>
 </div>
 </div>
 </header>

 <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
 <IntelCard padding="14px">
 <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 10 }}>Secciones</div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {secciones.map(s => (
 <button key={s.id} onClick={() => selectSection(s.id)}
                      style={{
                        textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                        background: activeId === s.id ? 'rgba(31,78,140,0.08)' : 'transparent',
                        color: activeId === s.id ? '#1F4E8C' : '#3a3a3d',
                        border: 'none', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', fontWeight: activeId === s.id ? 600 : 500,
                      }}>{s.titulo}</button>
                  ))}
 </div>
 </IntelCard>

 <IntelCard padding="18px 22px">
                {activeId ? (
 <>
 <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 8 }}>
                      Editando: {secciones.find(s => s.id === activeId)?.titulo}
 </div>
 <textarea
                      value={content}
                      onChange={e => handleContentChange(e.target.value)}
                      rows={20}
                      style={{
                        width: '100%', padding: 14, border: '1px solid #ECECEF', borderRadius: 12,
                        fontFamily: 'var(--font-text), inherit', fontSize: 13.5, color: '#1d1d1f',
                        lineHeight: 1.6, resize: 'vertical', outline: 'none',
                      }}
                    />
 <div style={{ marginTop: 8, fontSize: 11, color: '#86868b' }}>Autoguardado tras 800 ms de inactividad.</div>
 </>
                ) : (
 <IntelEmpty title="Selecciona una seccion" description="Elige una seccion del panel izquierdo para editar." />
                )}
 </IntelCard>
 </div>
 </>
        )}
 </main>
 </div>
  )
}

const primaryBtn: React.CSSProperties = {
  background: '#1F4E8C', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const secondaryBtn: React.CSSProperties = {
  background: '#F5F5F7', color: '#3a3a3d', border: 'none', padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
