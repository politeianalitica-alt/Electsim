'use client'
/**
 * `<GeoAudioBrief />` · Sprint G4 + G5.
 *
 * Audio briefing del IA brief geopolítico con dos tiers:
 *
 *  1. TTS premium (ElevenLabs > OpenAI) vía `/api/geopolitica/tts`. Si el
 *     servidor tiene `ELEVENLABS_API_KEY` o `OPENAI_API_KEY` configuradas en
 *     Vercel, responde `Content-Type: audio/mpeg` y lo reproducimos con un
 *     `<audio>` nativo. Calidad neural, voz española consistente.
 *
 *  2. Fallback Web Speech API · si el endpoint contesta `ok:false` (no hay
 *     keys) o el navegador no soporta `<audio>` con MP3, caemos a la API
 *     nativa del navegador (gratis, todos los browsers modernos).
 *
 * El usuario sólo ve un botón ESCUCHAR. Internamente decidimos el tier.
 */
import { useEffect, useRef, useState } from 'react'

interface Voice { name: string; lang: string; voiceURI: string }
type TtsTier = 'auto' | 'web-speech' | 'elevenlabs' | 'openai'

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
}

export function GeoAudioBrief() {
  const [brief, setBrief] = useState<string | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const [voiceURI, setVoiceURI] = useState<string>('')
  const [rate, setRate] = useState(1.0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(true)
  const [tier, setTier] = useState<TtsTier>('auto')
  const [providerUsed, setProviderUsed] = useState<string>('')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

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

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      try { window.speechSynthesis.cancel() } catch { /* noop */ }
    }
  }, [])

  const playWebSpeech = () => {
    if (!supported || !brief) return
    window.speechSynthesis.cancel()
    const cleanText = stripMarkdown(brief)
    const u = new SpeechSynthesisUtterance(cleanText)
    u.lang = (voiceURI && voices.find((v) => v.voiceURI === voiceURI)?.lang) || 'es-ES'
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
    setProviderUsed('Web Speech API')
    window.speechSynthesis.speak(u)
  }

  const playPremium = async () => {
    if (!brief) return
    setLoading(true)
    try {
      const cleanText = stripMarkdown(brief).slice(0, 2000)
      const r = await fetch(`/api/geopolitica/tts?text=${encodeURIComponent(cleanText)}`, {
        cache: 'force-cache',
      })
      const ct = r.headers.get('content-type') || ''
      // Servidor sin keys: contesta JSON con ok:false → fallback Web Speech
      if (!ct.includes('audio/')) {
        setLoading(false)
        playWebSpeech()
        return
      }
      const provider = r.headers.get('x-tts-provider') || 'tts'
      const blob = await r.blob()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audio.playbackRate = rate
      audio.onplay = () => setPlaying(true)
      audio.onended = () => setPlaying(false)
      audio.onerror = () => { setPlaying(false); playWebSpeech() }
      audioRef.current = audio
      setProviderUsed(provider === 'elevenlabs' ? 'ElevenLabs neural' : provider === 'openai' ? 'OpenAI nova' : provider)
      await audio.play()
    } catch {
      playWebSpeech()
    } finally {
      setLoading(false)
    }
  }

  const speak = () => {
    if (tier === 'web-speech') return playWebSpeech()
    // 'auto' o premium → intenta endpoint
    return playPremium()
  }

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      setPlaying(false)
      return
    }
    if (supported) {
      window.speechSynthesis.pause()
      setPlaying(false)
    }
  }

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (supported) {
      try { window.speechSynthesis.cancel() } catch { /* noop */ }
    }
    setPlaying(false)
  }

  if (!supported && tier !== 'auto') {
    return (
      <div style={{ fontSize: 10, color: '#94a3b8', padding: 8 }}>
        Audio briefing no soportado en este navegador (requiere Web Speech API o &lt;audio&gt; MP3).
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
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 9, color: '#a855f7', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        ◉ Audio
      </span>
      {!playing ? (
        <button
          onClick={speak}
          disabled={!brief || loading}
          style={{
            background: brief && !loading ? '#a855f7' : '#475569',
            color: '#fff',
            border: 'none',
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            cursor: brief && !loading ? 'pointer' : 'not-allowed',
            letterSpacing: 0.4,
          }}
        >
          {loading ? '… GENERANDO' : '▶ ESCUCHAR'}
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
            letterSpacing: 0.4,
          }}
        >
          ‖ PAUSA
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
        value={tier}
        onChange={(e) => setTier(e.target.value as TtsTier)}
        title="Calidad de la voz"
        style={{
          background: '#0f172a',
          color: '#cbd5e1',
          border: '1px solid #334155',
          fontSize: 9,
          padding: '2px 4px',
          borderRadius: 3,
        }}
      >
        <option value="auto">AUTO (premium si disponible)</option>
        <option value="web-speech">Web Speech (gratis, nativo)</option>
      </select>
      {tier !== 'auto' && (
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
      )}
      <select
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        title="Velocidad de reproducción"
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
      {providerUsed && (
        <span style={{ fontSize: 9, color: '#64748b', fontStyle: 'italic' }}>
          · {providerUsed}
        </span>
      )}
    </div>
  )
}

export default GeoAudioBrief
