'use client'
/**
 * Strip horizontal de empresas cotizadas de defensa con cotización en vivo.
 * Click empresa → ficha detallada.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Quote { precio: number | null; variacion_pct: number | null; moneda: string }
interface Empresa {
  ticker: string; nombre_corto: string; pais: string; exchange: string
  revenue_defensa_USD_b: number
  cotizacion?: Quote | null
}

export function EmpresasCotizadasStrip() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/defense/empresas').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.empresas) setEmpresas(d.empresas)
      setLoading(false)
    })
  }, [])

  // Ordenar: cotizadas con variación primero
  const sorted = [...empresas].sort((a, b) => {
    const aHasQ = a.cotizacion?.precio != null ? 1 : 0
    const bHasQ = b.cotizacion?.precio != null ? 1 : 0
    return bHasQ - aHasQ
  })

  if (loading) return <p style={{ textAlign: 'center', padding: 12, color: '#86868b', fontSize: 12 }}>Cargando cotizaciones…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#6e6e73', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          MERCADOS DEFENSA EUROPA + GLOBAL · {empresas.length} cotizadas · LIVE
        </p>
        <Link href="/sector-defensa/empresas" style={{ fontSize: 11, color: '#1F4E8C', fontWeight: 600, textDecoration: 'none' }}>Ver todas las fichas →</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
        {sorted.map(e => {
          const c = e.cotizacion
          const v = c?.variacion_pct ?? null
          const color = v == null ? '#9CA3AF' : v > 0 ? '#16A34A' : '#DC2626'
          return (
            <Link key={e.ticker} href={`/sector-defensa/empresas/${encodeURIComponent(e.ticker)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: 8, background: '#FAFAFA', border: '1px solid #ECECEF', borderRadius: 6, borderLeft: `2.5px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f' }}>{e.nombre_corto}</span>
                  <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace' }}>{e.pais}</span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: 9.5, color: '#6e6e73', fontFamily: 'monospace' }}>{e.ticker}</p>
                {c?.precio != null ? (
                  <>
                    <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 700, color: '#1d1d1f', fontFamily: 'var(--font-display)' }}>
                      {c.precio.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                      <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 500, marginLeft: 3 }}>{c.moneda}</span>
                    </p>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color }}>
                      {v! > 0 ? '+' : ''}{v?.toFixed(2)}%
                    </p>
                  </>
                ) : (
                  <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9CA3AF' }}>—</p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Briefing del día con TTS opcional (Web Speech API · gratis, sin API).
 */
export function BriefingAudio({ texto }: { texto: string }) {
  const [hablando, setHablando] = useState(false)
  const [soporte, setSoporte] = useState(false)

  useEffect(() => {
    setSoporte(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  function play() {
    if (!soporte) return
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = 'es-ES'
    u.rate = 1.0
    u.onstart = () => setHablando(true)
    u.onend = () => setHablando(false)
    u.onerror = () => setHablando(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
  function stop() {
    window.speechSynthesis.cancel()
    setHablando(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={hablando ? stop : play} disabled={!soporte}
        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #1d1d1f', background: hablando ? '#DC2626' : '#1d1d1f', color: '#fff', cursor: soporte ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
        {hablando ? '■ Detener audio' : '▶ Escuchar briefing'}
      </button>
      {!soporte && <span style={{ fontSize: 10, color: '#9CA3AF' }}>Audio no soportado en este navegador</span>}
    </div>
  )
}
