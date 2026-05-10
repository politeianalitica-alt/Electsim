'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import IntelCard from '../../_components/intel/IntelCard'
import IntelBadge from '../../_components/intel/IntelBadge'
import IntelEmpty from '../../_components/intel/IntelEmpty'
import { isAuthenticated } from '@/lib/auth'
import { useCanvas, useHipotesis } from '@/hooks/intelligence'
import { intelligenceApi } from '@/lib/api/intelligence'
import type { ScoreACH, Hipotesis, Evidencia } from '@/types/intelligence'

const SCORE_CYCLE: ScoreACH['score'][] = [-2, -1, 0, 1, 2]
const SCORE_LABEL: Record<number, string> = { '-2': '−−', '-1': '−', '0': '·', '1': '+', '2': '++' }
const SCORE_COLOR: Record<number, string> = { '-2': '#DC2626', '-1': '#F97316', '0': '#86868b', '1': '#0EA5E9', '2': '#16A34A' }

export default function CanvasDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const { data: canvas, isLoading } = useCanvas(id)
  const { data: ach, isLoading: achLoading, refetch } = useHipotesis(canvas?.tipo === 'ach' ? id : null)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: '#1d1d1f' }}>
      <AppHeader />
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>
        <Link href="/canvas" style={{ fontSize: 12, color: '#1F4E8C', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Volver a canvas
        </Link>

        {isLoading && <IntelEmpty title="Cargando canvas" />}
        {canvas && (
          <header style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IntelBadge color="#5B21B6" variant="solid" size="xs">{canvas.tipo.toUpperCase()}</IntelBadge>
              {canvas.tags.map(t => <IntelBadge key={t} color="#1F4E8C" variant="outline" size="xs">{t}</IntelBadge>)}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em', margin: '0 0 6px', lineHeight: 1.15 }}>{canvas.titulo}</h1>
            {canvas.descripcion && <p style={{ fontSize: 13.5, color: '#6e6e73', margin: 0 }}>{canvas.descripcion}</p>}
          </header>
        )}

        {canvas?.tipo === 'ach' ? (
          <AchMatrix
            ach={ach}
            isLoading={achLoading}
            onRefetch={refetch}
          />
        ) : canvas ? (
          <IntelEmpty title="Vista en desarrollo" description={`El renderizado para canvas de tipo "${canvas.tipo}" se incorporara en una proxima iteracion.`} />
        ) : null}
      </main>
    </div>
  )
}

function AchMatrix({ ach, isLoading, onRefetch }: {
  ach: { canvas_id: string; hipotesis: Hipotesis[]; evidencias: Evidencia[]; matriz: ScoreACH[] } | undefined
  isLoading: boolean
  onRefetch: () => void
}) {
  const [matriz, setMatriz] = useState<ScoreACH[]>([])
  useEffect(() => { if (ach) setMatriz(ach.matriz) }, [ach])

  const cellScore = useCallback((evId: string, hipId: string): ScoreACH['score'] => {
    return matriz.find(m => m.evidencia_id === evId && m.hipotesis_id === hipId)?.score ?? 0
  }, [matriz])

  const cycle = useCallback(async (evId: string, hipId: string) => {
    const current = cellScore(evId, hipId)
    const idx = SCORE_CYCLE.indexOf(current)
    const next = SCORE_CYCLE[(idx + 1) % SCORE_CYCLE.length]
    setMatriz(prev => {
      const exists = prev.find(m => m.evidencia_id === evId && m.hipotesis_id === hipId)
      if (exists) return prev.map(m => (m.evidencia_id === evId && m.hipotesis_id === hipId) ? { ...m, score: next } : m)
      return [...prev, { evidencia_id: evId, hipotesis_id: hipId, score: next }]
    })
    try { await intelligenceApi.updateAchScore(hipId, { evidencia_id: evId, score: next }) } catch {}
  }, [cellScore])

  if (isLoading) return <IntelEmpty title="Cargando matriz ACH" />
  if (!ach) return <IntelEmpty title="Sin matriz" />
  const { hipotesis, evidencias } = ach

  return (
    <IntelCard padding="18px 20px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Matriz ACH · {evidencias.length} evidencias x {hipotesis.length} hipotesis</h3>
        <button onClick={onRefetch} style={{ background: '#F5F5F7', border: 'none', padding: '6px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: '#3a3a3d', fontFamily: 'inherit' }}>Refrescar</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #ECECEF', color: '#6e6e73', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Evidencia</th>
              {hipotesis.map(h => (
                <th key={h.id} style={{ padding: 10, borderBottom: '1px solid #ECECEF', color: '#3a3a3d', fontSize: 11, fontWeight: 600, minWidth: 130, maxWidth: 200, lineHeight: 1.3 }}>{h.enunciado}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {evidencias.map(ev => (
              <tr key={ev.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #F5F5F7', color: '#1d1d1f', maxWidth: 280 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{ev.titulo}</div>
                  <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 2 }}>{ev.fuente_nombre}</div>
                </td>
                {hipotesis.map(h => {
                  const s = cellScore(ev.id, h.id)
                  return (
                    <td key={h.id} style={{ padding: 6, borderBottom: '1px solid #F5F5F7', textAlign: 'center' }}>
                      <button onClick={() => cycle(ev.id, h.id)}
                        style={{
                          width: 44, height: 32, border: `1px solid ${SCORE_COLOR[s]}40`,
                          background: `${SCORE_COLOR[s]}15`, color: SCORE_COLOR[s],
                          borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }} title="Click para cambiar puntuacion">
                        {SCORE_LABEL[s]}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#86868b' }}>
        Leyenda: −− contradice fuertemente · − contradice · · neutral · + apoya · ++ apoya fuertemente
      </div>
    </IntelCard>
  )
}
