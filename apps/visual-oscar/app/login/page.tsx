'use client'
import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { setTokens, isDemoMode } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demo, setDemo] = useState(false)

  useEffect(() => { setDemo(isDemoMode()) }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const data = await api.login(
        (fd.get('username') as string) || 'demo@politeia.es',
        (fd.get('password') as string) || 'demo'
      )
      setTokens(data.access_token, data.refresh_token)
      router.push('/dashboard')
    } catch {
      setError(demo ? 'Error en modo demo (improbable).' : 'Email o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  function entrarComoDemo() {
    setLoading(true)
    api.login('demo@politeia.es', 'demo')
      .then(d => { setTokens(d.access_token, d.refresh_token); router.push('/dashboard') })
      .catch(() => setError('No se pudo entrar en modo demo.'))
      .finally(() => setLoading(false))
  }

  return (
    <>
      <header className="nav"><div className="nav-inner">
        <a className="logo" href="/" style={{ color:'#1F4E8C', fontWeight:600, letterSpacing:'-0.01em' }}>
          <svg width="20" height="18" viewBox="0 0 120 110" fill="currentColor">
            <rect x="8" y="6" width="104" height="6" rx="1"/>
            <path d="M 8 14 Q 8 22, 18 22 Q 28 22, 28 14 L 28 24 L 92 24 L 92 14 Q 92 22, 102 22 Q 112 22, 112 14 Z"/>
            <circle cx="18" cy="18" r="3.5" fill="#fff"/><circle cx="18" cy="18" r="2"/>
            <circle cx="102" cy="18" r="3.5" fill="#fff"/><circle cx="102" cy="18" r="2"/>
            <rect x="14" y="28" width="92" height="4" rx="1"/>
            <rect x="26" y="58" width="18" height="44" rx="2"/>
            <rect x="52" y="48" width="18" height="54" rx="2"/>
            <rect x="78" y="38" width="18" height="64" rx="2"/>
          </svg>
          <span>POLITEIA <span style={{ fontWeight:400, color:'var(--ink-3)' }}>ANALÍTICA</span></span>
        </a>
        <span className="spacer"/>
        <a href="#" style={{ fontSize:12, color:'var(--ink-3)' }}>¿Necesitas ayuda?</a>
      </div></header>
      <main className="login-shell"><div className="login-card">
        <div className="login-mark" style={{ background:'#1F4E8C', width:64, height:64, borderRadius:16, padding:8 }}>
          <svg width="48" height="44" viewBox="0 0 120 110" fill="#fff">
            <rect x="8" y="6" width="104" height="6" rx="1"/>
            <path d="M 8 14 Q 8 22, 18 22 Q 28 22, 28 14 L 28 24 L 92 24 L 92 14 Q 92 22, 102 22 Q 112 22, 112 14 Z"/>
            <circle cx="18" cy="18" r="3.5" fill="#1F4E8C"/><circle cx="18" cy="18" r="2" fill="#fff"/>
            <circle cx="102" cy="18" r="3.5" fill="#1F4E8C"/><circle cx="102" cy="18" r="2" fill="#fff"/>
            <rect x="14" y="28" width="92" height="4" rx="1"/>
            <rect x="26" y="58" width="18" height="44" rx="2"/>
            <rect x="52" y="48" width="18" height="54" rx="2"/>
            <rect x="78" y="38" width="18" height="64" rx="2"/>
          </svg>
        </div>
        <h1>Politeia Analítica</h1>
        <p className="lead">Inteligencia electoral. <em style={{ fontStyle:'italic', color:'var(--ink-2)' }}>Bienvenido de nuevo.</em></p>

        {demo && (
          <div style={{
            background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:10,
            padding:'10px 12px', marginBottom:14, fontSize:12, color:'#78350F', lineHeight:1.5,
          }}>
            <strong style={{ color:'#92400E' }}>Modo demo activado.</strong> No hay backend conectado · cualquier usuario y contraseña funcionan, o pulsa <strong>«Entrar como demo»</strong> abajo.
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Usuario</label>
            <input id="email" name="username" type="text" placeholder={demo ? 'cualquier cosa' : 'tu usuario'} autoComplete="username"/>
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" placeholder={demo ? 'cualquier cosa' : '••••••••'} autoComplete="current-password"/>
          </div>
          <div className="field-row">
            <label><input type="checkbox" defaultChecked/> Recordarme</label>
            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        {demo && (
          <button onClick={entrarComoDemo} disabled={loading} style={{
            marginTop:10, width:'100%',
            background:'#1F4E8C', color:'#fff', border:'none',
            borderRadius:10, padding:'11px 16px',
            fontSize:13, fontWeight:600, fontFamily:'inherit',
            cursor: loading ? 'wait' : 'pointer', letterSpacing:'-0.01em',
          }}>
            Entrar como demo →
          </button>
        )}

        <div className="lock-note">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M8 11 V7 a4 4 0 0 1 8 0 V11" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
          {demo ? 'Sin conexión a backend · datos de demostración' : 'Conexión cifrada · Datos protegidos'}
        </div>
      </div></main>
    </>
  )
}
