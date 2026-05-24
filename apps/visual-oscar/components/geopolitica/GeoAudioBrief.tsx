'use client'
/**
 * `<GeoAudioBrief />` · Sprint G4.
 *
 * Audio briefing del IA brief geopolítico vía Web Speech API (gratuita,
 * sin auth, todos los navegadores modernos). Útil para escuchar el brief
 * mientras se hace otra cosa (mañana al cocinar café, etc.).
 *
 * Si OPENAI/ElevenLabs API key disponible en futuro, fallback a TTS
 * premium. Por ahora Web Speech API basta y es 100% gratis.
 *
 * Funciones:
 *  - Play/Pause/Stop
 *  - Selector voz (filtra voces ES)
 *  - Velocidad 0.8x-1.5x
 *  - Auto-strip markdown headers/links del brief antes de speak
 */
import { useEffect, useRef, useState } from 'react'

interface Voice {
  name: string
  lang: string
  voiceURI: string
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')           // headers
    .replace(/\*\*(.+?)\*\*/g, '$1')        // bold
    .replace(/\*(.+?)\*/g, '$1')            // italic
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1')   // links
    .replace(/`([^`]+)`/g, '$1')            // code inline
    .replace(/^\s*[-*]\s+/gm, '')           // list bullets
    .replace(/\n{2,}/g, '. ')               // párrafos → pausas
    .replace(/\n/g, ' ')
    .trim()
}

export function GeoAudioBrief() {
  const [brief, setBrief] = useState<string | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [voiceURI, setVoiceURI] = useState<string>('')
  const [rate, setRate] = useState(1.0)
  const [playing, setPlaying] = useState(false)
  const [supported, setSupported] = useState(true)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Fetch brief
  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/ia-brief', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.brief) setBrief(j.brief) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // Detect Web Speech support + load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false)
      return
    }
    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices()
      const list = all
        .filter((v) => v.lang.startsWith('es') || v.lang.startsWith('en'))
        .map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }))
      setVoices(list)
      // Default: prefer es-ES voice
      if (!voiceURI && list.length > 0) {
        const esES = list.find((v) => v.lang === 'es-ES') || list.find((v) => v.lang.startsWith('es')) || list[0]
        setVoiceURI(esES.voiceURI)
      }
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const speak = () => {
    if (!supported || !brief) return
    window.speechSynthesis.cancel() // stop anything previous
    const cleanText = stripMarkdown(brief)
    const u = new SpeechSynthesisUtterance(cleanText)
    u.lang = voiceURI && voices.find((v) => v.voiceURI === voiceURI)?.lang || 'es-ES'
    if (voiceURI) {
      const allVoices = window.speechSynthesis.getVoices()
      const match = allVoices.find((v) => v.voiceURI === voiceURI)
      if (match) u.voice = match
    }
    u.rate = rate
    u.pitch = 1.0
    u.onstart = () => setPlaying(true)
    u.onend = () => setPlaying(false)
    u.onerror = () => setPlaying(false)
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
  }

  const pause = () => {
    if (!supported) return
    window.speechSynthesis.pause()
    setPlaying(false)
  }

  const resume = () => {
    if (!supported) return
    window.speechSynthesis.resume()
    setPlaying(true)
  }

  const stop = () => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setPlaying(false)
  }

  if (!supported) {
    return (
      <div style={{ fontSize: 10, color: '#94a3b8', padding: 8 }}>
        Audio briefing no soportado en este navegador (requiere Web Speech API).
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      background: '#1e293b',
      borderRadius: 6,
      border: '1px solid #312e81',
    }}>
      <span style={{ fontSize: 9, color: '#a855f7', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        🔊 Audio
      </span>
      {!playing ? (
        <button
          onClick={speak}
          disabled={!brief}
          style={{
            background: brief ? '#a855f7' : '#475569',
            color: '#fff',
            border: 'none',
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            cursor: brief ? 'pointer' : 'not-allowed',
          }}
        >
          ▶ ESCUCHAR
        </button>
      ) : (
        <button
          onClick={pause}
          style={{
            background: '#fbbf24',
            color: '#0f172a',
            border: 'none',
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ⏸ PAUSAR
        </button>
      )}
      {playing && (
        <button
          onClick={stop}
          style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
        >
          ■ STOP
        </button>
      )}
      <select
        value={voiceURI}
        onChange={(e) => setVoiceURI(e.target.value)}
        style={{
          background: '#0f172a',
          color: '#cbd5e1',
          border: '1px solid #334155',
          fontSize: 9,
          padding: '2px 4px',
          borderRadius: 3,
          maxWidth: 140,
        }}
      >
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>{v.name.slice(0, 20)} ({v.lang})</option>
        ))}
      </select>
      <select
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        style={{
          background: '#0f172a',
          color: '#cbd5e1',
          border: '1px solid #334155',
          fontSize: 9,
          padding: '2px 4px',
          borderRadius: 3,
        }}
      >
        <option value={0.8}>0.8x</option>
        <option value={1.0}>1.0x</option>
        <option value={1.2}>1.2x</option>
        <option value={1.5}>1.5x</option>
      </select>
    </div>
  )
}

export default GeoAudioBrief
