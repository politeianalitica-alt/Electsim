'use client'

/**
 * BriefingExports — módulo de descarga/reproducción del briefing matinal.
 *
 * Tres entregables (todos GRATIS, sin coste):
 *   1. Informe ejecutivo · PDF 2-3 págs con secciones completas
 *   2. Nota informativa · PDF 1 pág con solo lo crítico
 *   3. Audio · TTS via Web Speech API del navegador · sin servidor
 *
 * El PDF se genera server-side con @react-pdf/renderer (sin Chromium).
 * El audio usa SpeechSynthesisUtterance · 100% nativo del navegador,
 * preferentemente con voz en español.
 */

import { useState, useRef, useEffect } from 'react'
import { useApi } from '@/lib/useApi'
import type { MorningBriefing } from '@/lib/api-types'

type ExportFormat = 'informe' | 'nota'

interface ExportState {
  downloading: ExportFormat | null
  error: string | null
}

export default function BriefingExports() {
  const [state, setState] = useState<ExportState>({ downloading: null, error: null })
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Briefing real desde el backend ElectSim · cache 5 min
  const { data: briefing } = useApi<MorningBriefing>(
 '/api/briefings/morning?workspace_id=default',
    { refreshInterval: 300_000 }
  )

  // Cleanup audio al desmontar
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  async function downloadPdf(format: ExportFormat) {
    setState({ downloading: format, error: null })
    try {
      const r = await fetch(`/api/briefings/morning/pdf?format=${format}`, { method: 'POST' })
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}))
        throw new Error(errBody?.message || `HTTP ${r.status}`)
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `briefing-${format}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 100)
      setState({ downloading: null, error: null })
    } catch (e) {
      console.error('[BriefingExports] PDF download failed:', e)
      setState({ downloading: null, error: e instanceof Error ? e.message : 'descarga fallida' })
      setTimeout(() => setState(s => ({ ...s, error: null })), 4000)
    }
  }

  function buildSpeechText(): string {
    if (!briefing) return ''
    const parts: string[] = ['Briefing matinal de Politeia Analítica.']
    if (briefing.executive_summary) parts.push(briefing.executive_summary)
    const criticas = (briefing.key_alerts || []).filter(a => ['critical', 'high'].includes((a.level || '').toLowerCase())).slice(0, 3)
    if (criticas.length > 0) {
      parts.push('Alertas críticas del día.')
      criticas.forEach((a, i) => {
        parts.push(`${i + 1}. ${a.title}.${a.body ? ' ' + a.body : ''}`)
      })
    }
    if (briefing.three_questions && briefing.three_questions.length > 0) {
      parts.push('Las tres preguntas para reflexionar hoy.')
      briefing.three_questions.forEach((q, i) => parts.push(`Pregunta ${i + 1}. ${q}`))
    }
    if (briefing.analyst_note) parts.push(`Nota del analista. ${briefing.analyst_note}`)
    return parts.join(' ')
  }

  function startSpeaking() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setState(s => ({ ...s, error: 'tu navegador no soporta audio de voz' }))
      setTimeout(() => setState(s => ({ ...s, error: null })), 4000)
      return
    }
    const text = buildSpeechText()
    if (!text) {
      setState(s => ({ ...s, error: 'no hay briefing disponible para narrar' }))
      setTimeout(() => setState(s => ({ ...s, error: null })), 4000)
      return
    }
    window.speechSynthesis.cancel()
    setProgress(0)

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'es-ES'
    utter.rate = 1.0
    utter.pitch = 1.0
    utter.volume = 1.0

    // Voz preferida en español si disponible
    const voices = window.speechSynthesis.getVoices()
    const spanishVoice = voices.find(v => v.lang.startsWith('es-ES'))
      || voices.find(v => v.lang.startsWith('es'))
    if (spanishVoice) utter.voice = spanishVoice

    utter.onstart = () => { setSpeaking(true); setPaused(false) }
    utter.onend = () => { setSpeaking(false); setPaused(false); setProgress(100) }
    utter.onerror = (e) => {
      console.warn('[BriefingExports] SpeechSynthesis error:', e.error)
      setSpeaking(false); setPaused(false)
    }
    utter.onboundary = (e) => {
      if (e.charIndex && text.length) setProgress(Math.min(100, Math.round((e.charIndex / text.length) * 100)))
    }
    utteranceRef.current = utter
    window.speechSynthesis.speak(utter)
  }

  function togglePause() {
    if (typeof window === 'undefined') return
    if (paused) {
      window.speechSynthesis.resume(); setPaused(false)
    } else {
      window.speechSynthesis.pause(); setPaused(true)
    }
  }

  function stopSpeaking() {
    if (typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    setSpeaking(false); setPaused(false); setProgress(0)
  }

  const hasBriefing = !!briefing?.executive_summary

  return (
 <section style={{
      background: '#fff',
      border: '1px solid #ECECEF',
      borderRadius: 14,
      padding: '16px 20px',
      marginBottom: 18,
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 8,
            background: 'linear-gradient(135deg,#0F1F3D 0%,#5B21B6 100%)',
            color: '#fff', fontSize: 13, fontWeight: 700,
          }}>↓</span>
 <div>
 <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', color: '#1d1d1f' }}>
              Llévatelo contigo
 </h3>
 <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#86868b', letterSpacing: '0.02em' }}>
              Descarga el briefing en PDF o escúchalo en audio
 </p>
 </div>
 </div>
        {state.error && (
 <span style={{ fontSize: 11, color: '#DC2626', background: '#FEF2F2', padding: '4px 10px', borderRadius: 6, border: '1px solid #FECACA' }}>
            {state.error}
 </span>
        )}
 </div>

      {/* Botonera principal */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>

        {/* Informe ejecutivo */}
 <button
          onClick={() => downloadPdf('informe')}
          disabled={!hasBriefing || state.downloading !== null}
          title="Informe ejecutivo completo · 2-3 páginas con alertas, narrativas, snapshot electoral y preguntas"
          style={btnPrimary(state.downloading === 'informe', !hasBriefing)}
        >
 <span style={iconStyle('#0071e3')}>
 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
 <polyline points="14 2 14 8 20 8"/>
 <line x1="9" y1="13" x2="15" y2="13"/>
 <line x1="9" y1="17" x2="15" y2="17"/>
 </svg>
 </span>
 <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
 <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.2 }}>
              {state.downloading === 'informe' ? 'Generando…' : 'Informe ejecutivo'}
 </span>
 <span style={{ fontSize: 10, color: '#86868b' }}>PDF · 2-3 páginas</span>
 </span>
 </button>

        {/* Nota informativa */}
 <button
          onClick={() => downloadPdf('nota')}
          disabled={!hasBriefing || state.downloading !== null}
          title="Nota informativa breve · 1 página con resumen ejecutivo y alertas críticas"
          style={btnPrimary(state.downloading === 'nota', !hasBriefing)}
        >
 <span style={iconStyle('#7C3AED')}>
 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
 <polyline points="14 2 14 8 20 8"/>
 <line x1="12" y1="18" x2="12" y2="12"/>
 <line x1="9" y1="15" x2="15" y2="15"/>
 </svg>
 </span>
 <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
 <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.2 }}>
              {state.downloading === 'nota' ? 'Generando…' : 'Nota informativa'}
 </span>
 <span style={{ fontSize: 10, color: '#86868b' }}>PDF · 1 página breve</span>
 </span>
 </button>

        {/* Audio TTS */}
        {!speaking ? (
 <button
            onClick={startSpeaking}
            disabled={!hasBriefing}
            title="Escucha el briefing narrado por el navegador · sin coste"
            style={btnPrimary(false, !hasBriefing)}
          >
 <span style={iconStyle('#10b981')}>
 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
 <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
 <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
 </svg>
 </span>
 <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
 <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.2 }}>Escuchar briefing</span>
 <span style={{ fontSize: 10, color: '#86868b' }}>Audio · narración en español</span>
 </span>
 </button>
        ) : (
          // Reproductor activo
 <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
            background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10,
          }}>
 <button
              onClick={togglePause}
              title={paused ? 'Reanudar' : 'Pausar'}
              style={iconBtn('#10b981')}
            >
              {paused ? (
 <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              ) : (
 <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              )}
 </button>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontSize: 11.5, fontWeight: 600, color: '#065F46' }}>
                {paused ? 'En pausa' : 'Narrando briefing…'}
 </div>
 <div style={{ height: 3, background: '#BBF7D0', borderRadius: 999, overflow: 'hidden', marginTop: 4 }}>
 <div style={{
                  height: '100%', background: '#10b981', width: `${progress}%`,
                  transition: 'width 200ms linear',
                }}/>
 </div>
 </div>
 <button
              onClick={stopSpeaking}
              title="Detener"
              style={iconBtn('#DC2626')}
            >
 <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>
 </button>
 </div>
        )}
 </div>
 </section>
  )
}

function btnPrimary(loading: boolean, disabled: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    background: disabled ? '#F5F5F7' : (loading ? '#F0F9FF' : '#FAFAFA'),
    border: `1px solid ${loading ? '#BAE6FD' : '#E5E5EA'}`,
    borderRadius: 10,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'border-color 150ms, background 150ms, transform 100ms',
  }
}

function iconStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 8,
    background: `${color}14`, color, flexShrink: 0,
  }
}

function iconBtn(color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 8,
    background: '#fff', color, border: `1px solid ${color}44`,
    cursor: 'pointer', flexShrink: 0,
  }
}
