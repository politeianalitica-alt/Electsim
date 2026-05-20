'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import IntelCard from '../../_components/intel/IntelCard'
import IntelBadge from '../../_components/intel/IntelBadge'
import IntelEmpty from '../../_components/intel/IntelEmpty'
import { isAuthenticated } from '@/lib/auth'
import { useNotebook } from '@/hooks/intelligence'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { WorkspaceBlock, TipoBlock } from '@/types/intelligence'

const TIPO_LABEL: Record<TipoBlock, string> = {
  texto: 'Texto', hallazgo: 'Hallazgo', cita: 'Cita', hipotesis: 'Hipotesis', pregunta: 'Pregunta', separador: 'Separador',
}
const TIPO_COLOR: Record<TipoBlock, string> = {
  texto: '#3a3a3d', hallazgo: '#16A34A', cita: '#5B21B6', hipotesis: '#1F4E8C', pregunta: '#F97316', separador: '#86868b',
}

export default function NotebookDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data: nb, isLoading, refetch } = useNotebook(id)
  const [blocks, setBlocks] = useState<WorkspaceBlock[]>([])

  useEffect(() => {
    if (nb?.blocks) setBlocks(nb.blocks)
  }, [nb])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string>('')

  const startEdit = (b: WorkspaceBlock) => { setEditingId(b.id); setDraft(b.contenido) }
  const cancelEdit = () => { setEditingId(null); setDraft('') }
  const saveEdit = useCallback(async () => {
    if (!editingId) return
    const updated = await intelligenceApi.updateBlock(id, editingId, { contenido: draft })
    setBlocks(prev => prev.map(b => b.id === editingId ? updated : b))
    cancelEdit()
  }, [editingId, draft, id])

  const addBlock = async (tipo: TipoBlock) => {
    const newB = await intelligenceApi.addBlock(id, { tipo, contenido: tipo === 'separador' ? '' : 'Nuevo contenido', orden: blocks.length })
    setBlocks(prev => [...prev, newB])
  }

  const deleteBlock = async (blockId: string) => {
    await intelligenceApi.deleteBlock(id, blockId)
    setBlocks(prev => prev.filter(b => b.id !== blockId))
  }

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
 <AppHeader />
 <main style={{ maxWidth: 980, margin: '0 auto', padding: '24px 28px 80px' }}>
 <Link href="/notebook" style={{ fontSize: 12, color: '#1F4E8C', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Volver a cuadernos
 </Link>

        {isLoading && <IntelEmpty title="Cargando cuaderno" />}
        {nb && (
 <>
 <header style={{ marginBottom: 18 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
 <IntelBadge color="#5B21B6" variant="soft" size="xs">v{nb.version}</IntelBadge>
 <IntelBadge color={nb.estado === 'aprobado' ? '#16A34A' : nb.estado === 'revision' ? '#F97316' : '#6e6e73'} size="xs">{nb.estado}</IntelBadge>
                {nb.tags.map(t => <IntelBadge key={t} color="#1F4E8C" variant="outline" size="xs">{t}</IntelBadge>)}
 </div>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: '0 0 6px', lineHeight: 1.15 }}>{nb.titulo}</h1>
              {nb.resumen && <p style={{ fontSize: 13.5, color: '#6e6e73', margin: 0 }}>{nb.resumen}</p>}
 </header>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {blocks.length === 0 && <IntelEmpty title="Cuaderno vacio" description="Anade el primer bloque desde la barra inferior." />}
              {blocks.sort((a, b) => a.orden - b.orden).map(b => (
 <IntelCard key={b.id} padding="14px 18px">
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
 <IntelBadge color={TIPO_COLOR[b.tipo]} size="xs">{TIPO_LABEL[b.tipo]}</IntelBadge>
 <div style={{ display: 'flex', gap: 6 }}>
                      {editingId !== b.id && <button onClick={() => startEdit(b)} style={iconBtn}>Editar</button>}
 <button onClick={() => deleteBlock(b.id)} style={{ ...iconBtn, color: '#DC2626' }}>Eliminar</button>
 </div>
 </div>
                  {editingId === b.id ? (
 <div>
 <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4}
                        style={{ width: '100%', padding: 10, border: '1px solid #ECECEF', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, color: '#1d1d1f', resize: 'vertical' }} />
 <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
 <button onClick={saveEdit} style={{ ...primaryBtn }}>Guardar</button>
 <button onClick={cancelEdit} style={{ ...secondaryBtn }}>Cancelar</button>
 </div>
 </div>
                  ) : b.tipo === 'separador' ? (
 <hr style={{ border: 'none', borderTop: '1px dashed #ECECEF', margin: '4px 0' }} />
                  ) : (
 <p onDoubleClick={() => startEdit(b)} style={{ fontSize: 13.5, color: '#1d1d1f', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap', cursor: 'text' }}>{b.contenido}</p>
                  )}
 </IntelCard>
              ))}
 </div>

 <div style={{ marginTop: 20, padding: 14, background: '#fff', border: '1px solid #ECECEF', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 <div style={{ fontSize: 10.5, fontWeight: 700, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 8 }}>Anadir bloque</div>
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(Object.keys(TIPO_LABEL) as TipoBlock[]).map(t => (
 <button key={t} onClick={() => addBlock(t)} style={{
                    padding: '6px 12px', borderRadius: 999, border: `1px solid ${TIPO_COLOR[t]}40`, background: '#fff',
                    color: TIPO_COLOR[t], fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{TIPO_LABEL[t]}</button>
                ))}
 <button onClick={() => refetch()} style={{ ...secondaryBtn, marginLeft: 'auto' }}>Refrescar</button>
 </div>
 </div>
 </>
        )}
 </main>
 </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#6e6e73', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: '2px 6px', fontFamily: 'inherit',
}
const primaryBtn: React.CSSProperties = {
  background: '#1F4E8C', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const secondaryBtn: React.CSSProperties = {
  background: '#F5F5F7', color: '#3a3a3d', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
