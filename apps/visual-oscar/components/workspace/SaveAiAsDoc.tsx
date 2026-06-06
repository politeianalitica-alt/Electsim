'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { docRepository } from '@/lib/docs/doc-repository'
import type { DocWithBlocks } from '@/types/docs'

interface Props {
  workspaceId: string
  title: string
  /** Texto a guardar (cada párrafo se convierte en un bloque). */
  text: string
  kind?: DocWithBlocks['kind']
  label?: string
  className?: string
}

/**
 * Botón reutilizable "Guardar como documento": crea un Doc editable del
 * workspace a partir de una salida de IA (síntesis de research, respuesta del
 * asistente, etc.) y navega al editor.
 */
export default function SaveAiAsDoc({ workspaceId, title, text, kind = 'analysis', label = 'Guardar como documento', className }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const onSave = () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const doc = docRepository.createDocFromText(workspaceId, title, text, kind)
      router.push(`/workspaces/${workspaceId}/docs/${doc.id}`)
    } catch {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={onSave}
      disabled={busy || !text.trim()}
      title="Crea un documento editable con este contenido"
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-md border border-[#e8e8ed] px-2.5 py-1 text-xs font-semibold text-[#3a3a3d] hover:border-[#1F4E8C] hover:text-[#1F4E8C] disabled:opacity-50 transition-colors'
      }
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      {busy ? 'Guardando…' : label}
    </button>
  )
}
