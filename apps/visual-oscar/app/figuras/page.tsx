'use client'

/**
 * /figuras — Catálogo expandido de figuras públicas + dossiers ricos.
 *
 * Hub central donde el analista puede:
 *   1. Explorar el catálogo (políticos + empresarios + medios + lobbies + ...)
 *   2. Filtrar por categoría, influencia, sector
 *   3. Abrir dossier rico con noticias + bio + intervenciones + conexiones
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import FigureDossierModal from '@/components/FigureDossierModal'

interface Figure {
  id: string
  nombre: string
  category: string
  cargo: string
  organizacion: string
  afiliacion: string | null
  color: string
  influencia: number
  exposicion: number
  twitter?: string | null
  wikipedia?: string | null
  tags: string[]
}

interface Response {
  items: Figure[]
  stats: {
    total: number
    porCategoria: Record<string, number>
  }
}

const CATEGORIES: Array<{ id: string; label: string; color: string }> = [
  { id: 'todos',         label: 'Todas',         color: '#525258' },
  { id: 'politico',      label: 'Políticos',     color: '#1F4E8C' },
  { id: 'institucional', label: 'Institución',   color: '#7C3AED' },
  { id: 'empresario',    label: 'Empresarios',   color: '#0E7490' },
  { id: 'mediatico',     label: 'Mediáticos',    color: '#525258' },
  { id: 'periodista',    label: 'Periodistas',   color: '#0F766E' },
  { id: 'lobbista',      label: 'Lobbistas',     color: '#7C3AED' },
  { id: 'consultor',     label: 'Consultoras',   color: '#0891B2' },
  { id: 'fondo',         label: 'Fondos',        color: '#5B21B6' },
  { id: 'academico',     label: 'Académicos',    color: '#0D9488' },
  { id: 'judicial',      label: 'Judicial',      color: '#9333EA' },
  { id: 'sindical',      label: 'Sindicato',     color: '#A02525' },
  { id: 'patronal',      label: 'Patronal',      color: '#0E7490' },
]

export default function FigurasPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [cat, setCat] = useState<string>('todos')
  const [q, setQ] = useState('')
  const [minInf, setMinInf] = useState(0)
  const [dossierId, setDossierId] = useState<string | null>(null)

  const { data } = useApi<Response>('/api/figures/list', { refreshInterval: 0 })
  const items = data?.items || []
  const stats = data?.stats

  const filtered = useMemo(() => {
    let res = items
    if (cat !== 'todos') res = res.filter(f => f.category === cat)
    if (minInf > 0) res = res.filter(f => f.influencia >= minInf)
    if (q) {
      const qq = q.toLowerCase()
      res = res.filter(f =>
        f.nombre.toLowerCase().includes(qq) ||
        f.organizacion.toLowerCase().includes(qq) ||
        (f.afiliacion || '').toLowerCase().includes(qq) ||
        f.tags.some(t => t.toLowerCase().includes(qq))
      )
    }
    return res
  }, [items, cat, minInf, q])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)', color: '#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 28px 80px' }}>

        <section style={{
          background: 'linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%)',
          borderRadius: 22, padding: '28px 36px', marginBottom: 18, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.78, margin: '0 0 6px', textTransform: 'uppercase' }}>
              MAPA DE FIGURAS PÚBLICAS · 12 CATEGORÍAS
            </p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, letterSpacing: '-0.024em', margin: '0 0 6px', lineHeight: 1.1 }}>
              {stats?.total ?? '…'} figuras <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' }}>con dossier rico en vivo.</em>
            </h1>
            <p style={{ fontSize: 13, opacity: 0.8, margin: 0, lineHeight: 1.5, maxWidth: 580 }}>
              Catálogo unificado de empresarios IBEX, dueños y periodistas estrella de medios, lobbistas registrados,
              consultoras Big4, fondos de inversión, institucionales y políticos. Cada dossier combina:
              Wikipedia + 50 medios RSS + intervenciones parlamentarias + comisiones + conexiones reales.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {CATEGORIES.slice(1).slice(0, 6).map(c => (
              <div key={c.id} style={{
                padding: '8px 6px', borderRadius: 8, textAlign: 'center',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
                  {stats?.porCategoria[c.id] ?? 0}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.74, letterSpacing: '0.06em', marginTop: 3 }}>
                  {c.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Filtros categorías */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {CATEGORIES.map(c => {
            const active = cat === c.id
            const count = c.id === 'todos' ? items.length : (stats?.porCategoria[c.id] ?? 0)
            return (
              <button key={c.id} onClick={() => setCat(c.id)} style={{
                background: active ? c.color : '#fff',
                color: active ? '#fff' : '#3a3a3d',
                border: '1px solid ' + (active ? c.color : '#ECECEF'),
                borderRadius: 999, padding: '5px 11px',
                fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>{c.label} <span style={{ opacity: 0.7, marginLeft: 4 }}>{count}</span></button>
            )
          })}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar nombre, organización, sector…"
            style={{
              flex: 1, minWidth: 240, padding: '8px 12px', fontSize: 12.5, borderRadius: 8,
              border: '1px solid #ECECEF', background: '#fff', fontFamily: 'inherit',
            }}
          />
          <label style={{ fontSize: 11, color: '#6e6e73', fontWeight: 600 }}>
            Mín. influencia: <strong style={{ color: '#7C3AED' }}>{minInf}</strong>
          </label>
          <input
            type="range" min={0} max={100} step={5} value={minInf}
            onChange={e => setMinInf(Number(e.target.value))}
            style={{ width: 160 }}
          />
          <span style={{ fontSize: 11.5, color: '#6e6e73', marginLeft: 'auto' }}>
            {filtered.length} de {items.length}
          </span>
        </div>

        {/* Grid de figuras */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {filtered.map(f => (
            <button key={f.id} onClick={() => setDossierId(f.id)} style={{
              padding: '12px 14px', borderRadius: 12,
              background: '#fff', border: '1px solid #ECECEF',
              borderLeft: `3px solid ${f.color}`, textAlign: 'left',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 120ms',
            }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: f.color, color: '#fff', letterSpacing: '0.04em' }}>
                  {CATEGORIES.find(c => c.id === f.category)?.label.toUpperCase()}
                </span>
                <span style={{ fontSize: 10, color: '#6e6e73' }}>Inf. {f.influencia}</span>
                <span style={{ fontSize: 10, color: '#6e6e73', marginLeft: 'auto' }}>Exp. {f.exposicion}</span>
              </div>
              <h3 style={{ margin: '0 0 3px', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>
                {f.nombre}
              </h3>
              <p style={{ margin: '0 0 5px', fontSize: 11, color: '#3a3a3d' }}>{f.cargo}</p>
              <p style={{ margin: 0, fontSize: 10.5, color: '#6e6e73' }}>{f.organizacion}</p>
              {f.tags.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {f.tags.slice(0, 4).map(t => (
                    <span key={t} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'rgba(0,0,0,0.04)', color: '#525258' }}>{t}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Sin figuras que coincidan con los filtros.
            </p>
          )}
        </div>
      </main>

      <FigureDossierModal
        figureId={dossierId}
        onClose={() => setDossierId(null)}
        onSelectFigure={id => setDossierId(id)}
      />
    </div>
  )
}
