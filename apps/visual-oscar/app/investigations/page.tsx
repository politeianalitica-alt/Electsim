'use client'
/**
 * /investigations · índice del workspace investigation-centric (Pilar 2).
 *
 * Cada Investigation es un contenedor de trabajo del analista (caso de
 * inteligencia) que agrupa entidades, evidencias, hipótesis, notebook,
 * canvas y briefings. Reemplaza el modelo previo de "menú de 12 secciones".
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { investigationsApi } from '@/lib/api/investigations'
import type { Investigation } from '@/types/investigations'

export default function InvestigationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const list = await investigationsApi.list({ status: 'active', limit: 100 })
      setItems(list)
    } catch (e) {
      setError(String(e).slice(0, 200))
    } finally {
      setLoading(false)
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || creating) return
    setCreating(true)
    try {
      const inv = await investigationsApi.create({
        title: newTitle.trim(),
        description: '',
      })
      router.push(`/investigations/${inv.id}`)
    } catch (err) {
      setError(String(err).slice(0, 200))
      setCreating(false)
    }
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', fontFamily: 'var(--font-text)', color: 'var(--color-ink)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px 80px' }}>
        <header style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-ink-4)', margin: '0 0 6px' }}>
            Workspace · investigaciones
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            Tus casos de inteligencia
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-ink-4)' }}>
            Cada investigación agrupa entidades, evidencias, hipótesis, notebook, canvas y briefings.
            El brain copiloto te ayuda dentro de cada caso.
          </p>
        </header>

        <form onSubmit={onCreate} style={{
          display: 'flex', gap: 8, marginBottom: 24,
          background: 'var(--color-surface)', padding: 14,
          border: '1px solid var(--color-hairline)', borderRadius: 14,
          boxShadow: 'var(--shadow-xs)',
        }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nueva investigación · ej. PGE 2026 · Defensa europea · Riesgos OPA BBVA…"
            style={{
              flex: 1, padding: '10px 14px',
              borderRadius: 10, border: '1px solid var(--color-hairline)',
              background: 'var(--color-bg)', fontSize: 14,
              fontFamily: 'inherit', outline: 'none', color: 'var(--color-ink)',
            }}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || creating}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'var(--color-accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer',
              opacity: !newTitle.trim() || creating ? 0.5 : 1,
              fontFamily: 'inherit',
            }}
          >
            {creating ? 'Creando…' : 'Crear caso'}
          </button>
        </form>

        {error && (
          <div style={{
            background: 'var(--color-danger-subtle)', color: 'var(--color-danger)',
            padding: 12, borderRadius: 10, fontSize: 12, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 120, background: 'var(--color-surface)',
                border: '1px solid var(--color-hairline-soft)',
                borderRadius: 14, opacity: 0.5,
              }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {items.map((inv) => (
              <Link key={inv.id} href={`/investigations/${inv.id}`} style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-hairline)',
                borderRadius: 14, padding: 18,
                boxShadow: 'var(--shadow-xs)',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                              textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 6 }}>
                  Caso · {inv.status}
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
                             fontSize: 17, color: 'var(--color-ink)',
                             margin: '0 0 8px', lineHeight: 1.25 }}>
                  {inv.title}
                </h2>
                {inv.description && (
                  <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--color-ink-4)',
                              lineHeight: 1.4,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              overflow: 'hidden' }}>
                    {inv.description}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                              fontSize: 11, color: 'var(--color-ink-5)' }}>
                  <span>{new Date(inv.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  {inv.tags.length > 0 && (
                    <span style={{
                      background: 'var(--color-surface-sunken)',
                      padding: '2px 6px', borderRadius: 6,
                      fontSize: 10, fontWeight: 600,
                    }}>
                      {inv.tags[0]}{inv.tags.length > 1 ? ` +${inv.tags.length - 1}` : ''}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      background: 'var(--color-surface)', border: '1px dashed var(--color-hairline)',
      borderRadius: 18,
    }}>
      <div style={{ fontSize: 32, color: 'var(--color-ink-5)', marginBottom: 12 }}>◐</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, margin: '0 0 6px' }}>
        Aún no tienes investigaciones
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-ink-4)' }}>
        Crea tu primer caso de inteligencia y empieza a fijar entidades, ingestar evidencias y
        construir hipótesis con el copiloto de IA.
      </p>
    </div>
  )
}
