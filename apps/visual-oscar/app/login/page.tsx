'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { setTokens } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    fd.get('email') as string,
          password: fd.get('password') as string,
        }),
      })
      if (!res.ok) {
        setError('Correo electrónico o contraseña incorrectos.')
        return
      }
      const data = await res.json()
      setTokens(data.access_token, data.refresh_token)
      router.push('/inicio')
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <a className="logo" href="/" style={{ color: '#1F4E8C', fontWeight: 600, letterSpacing: '-0.01em' }}>
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
            <span>POLITEIA <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>ANALÍTICA</span></span>
          </a>
          <span className="spacer"/>
          <a href="mailto:soporte@politeia.es" style={{ fontSize: 12, color: 'var(--ink-3)' }}>Soporte</a>
        </div>
      </header>

      <main className="login-shell">
        <div className="login-card">
          <div className="login-mark" style={{ background: '#1F4E8C', width: 64, height: 64, borderRadius: 16, padding: 8 }}>
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
          <p className="lead" style={{ color: 'var(--ink-2)' }}>Plataforma de inteligencia política</p>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
              padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#991B1B',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nombre@politeia.es"
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="field-row">
              <label><input type="checkbox" defaultChecked/> Recordarme</label>
              <a href="#" tabIndex={-1} style={{ pointerEvents: 'none', opacity: 0.4 }}>¿Olvidaste tu contraseña?</a>
            </div>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="lock-note">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M8 11 V7 a4 4 0 0 1 8 0 V11" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
            Acceso seguro · Conexión cifrada
          </div>
        </div>
      </main>
    </>
  )
}
