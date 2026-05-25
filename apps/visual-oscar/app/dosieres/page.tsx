'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import EmptyState from '@/components/EmptyState'
import Skeleton, { LiveDot } from '@/components/Skeleton'

// ── Types ────────────────────────────────────────────────────────────────────

interface DossierResumen {
  id: string
  slug: string
  nombre_completo: string
  alias: string | null
  cargo_actual: string | null
  partido: string | null
  foto_url: string | null
  bio_corta: string | null
  tags: string[]
  n_apartados: number
  updated_at: string
}

// ── Partido colors (alineados con el resto del dashboard) ────────────────────
const PARTIDO_COLOR: Record<string, string> = {
  PSOE: '#C53030', PSC: '#C53030',
  PP: '#2D4A8A',
  VOX: '#63BE21',
  Sumar: '#BF3F7E', SUMAR: '#BF3F7E',
  Podemos: '#7A2980',
  ERC: '#FFB30F',
  'EH Bildu': '#A02525', Bildu: '#A02525',
  Junts: '#1FA89B',
  PNV: '#0F766E',
  CC: '#0EA5E9',
  BNG: '#0E7490',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DosieresPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [partidoFilter, setPartidoFilter] = useState<string>('TODOS')

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { data, loading, refresh, source, updatedAt } = useApi<DossierResumen[] | { error?: string }>(
    '/api/dosieres',
    { refreshInterval: 60_000 },
  )

  const dosieres: DossierResumen[] = Array.isArray(data) ? data : []
  const partidos = Array.from(new Set(dosieres.map(d => d.partido).filter(Boolean))).sort() as string[]

  const filtered = dosieres
    .filter(d => partidoFilter === 'TODOS' || d.partido === partidoFilter)
    .filter(d => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        d.nombre_completo.toLowerCase().includes(q) ||
        (d.alias ?? '').toLowerCase().includes(q) ||
        (d.cargo_actual ?? '').toLowerCase().includes(q)
      )
    })

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
 <AppHeader />
 <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px 64px' }}>
        {/* Header */}
 <header style={{ marginBottom: 22 }}>
 <span style={{ fontSize: 10, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Inteligencia · Dosieres de personas
 </span>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0 6px', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 10 }}>
 <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'}/>
            Dosieres
 </h1>
 <p style={{ fontSize: 13, color: '#6e6e73', margin: 0, maxWidth: 780, lineHeight: 1.5 }}>
            Fichas estructuradas de personas políticas con apartados verificables:
            identidad, trayectoria, posiciones, redes de contactos, declaraciones,
            controversias y evidencia documental.
 </p>
 </header>

        {/* Filtros */}
 <section style={{
          background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 16,
          border: '1px solid #ECECEF', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        }}>
 <input
            type="text"
            placeholder="Buscar por nombre, alias o cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 220,
              padding: '8px 12px', fontSize: 13,
              border: '1px solid #ECECEF', borderRadius: 8,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
 <select
            value={partidoFilter}
            onChange={e => setPartidoFilter(e.target.value)}
            style={{
              padding: '8px 12px', fontSize: 13,
              border: '1px solid #ECECEF', borderRadius: 8,
              fontFamily: 'inherit', background: '#fff',
              cursor: 'pointer',
            }}
          >
 <option value="TODOS">Todos los partidos</option>
            {partidos.map(p => <option key={p} value={p}>{p}</option>)}
 </select>
 <button
            onClick={() => router.push('/dosieres/nuevo')}
            style={{
              background: '#0071e3', border: 'none', color: '#fff',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            + Nuevo dossier
 </button>
 <span style={{ fontSize: 11.5, color: '#86868b', marginLeft: 'auto' }}>
            {filtered.length} de {dosieres.length}
 </span>
 </section>

        {/* Lista */}
        {loading ? (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[0,1,2,3,4,5].map(i => (
 <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #ECECEF' }}>
 <Skeleton width={80} height={80} radius={40} style={{ marginBottom: 12 }}/>
 <Skeleton width={160} height={16} radius={4} style={{ marginBottom: 6 }}/>
 <Skeleton width={120} height={12} radius={4} style={{ marginBottom: 4 }}/>
 <Skeleton width={'100%' as unknown as number} height={10} radius={3}/>
 </div>
            ))}
 </div>
        ) : dosieres.length === 0 ? (
 <EmptyState
            severity="neutral"
            title="Aún no hay dosieres"
            description="Crea el primer dossier para empezar a clasificar información de personas políticas. Cada dossier se organiza en 7 apartados: identidad, trayectoria, posiciones, redes, declaraciones, controversias y evidencia."
            primaryAction={{ label: 'Crear primer dossier', onClick: () => router.push('/dosieres/nuevo') }}
            secondaryAction={{ label: 'Ver actores en el mapa', href: '/mapa-actores' }}
          />
        ) : (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map(d => {
              const partidoColor = d.partido ? (PARTIDO_COLOR[d.partido] ?? '#6e6e73') : '#6e6e73'
              const initial = (d.alias || d.nombre_completo).split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()
              return (
 <Link
                  key={d.id}
                  href={`/dosieres/${d.slug}`}
                  style={{
                    background: '#fff', borderRadius: 12,
                    padding: '16px 18px', textDecoration: 'none', color: 'inherit',
                    border: '1px solid #ECECEF', borderLeft: `3px solid ${partidoColor}`,
                    display: 'flex', flexDirection: 'column', gap: 8,
                    transition: 'box-shadow 150ms, transform 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
 <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {d.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
 <img src={d.foto_url} alt={d.nombre_completo}
                        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
 <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: `${partidoColor}18`, color: partidoColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
                        flexShrink: 0,
                      }}>{initial}</div>
                    )}
 <div style={{ flex: 1, minWidth: 0 }}>
 <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                        {d.nombre_completo}
 </h3>
                      {d.cargo_actual && (
 <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '2px 0 0', lineHeight: 1.3 }}>
                          {d.cargo_actual}
 </p>
                      )}
                      {d.partido && (
 <span style={{
                          display: 'inline-block', marginTop: 6,
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                          background: `${partidoColor}18`, color: partidoColor,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                        }}>{d.partido}</span>
                      )}
 </div>
 </div>

                  {d.bio_corta && (
 <p style={{
                      fontSize: 12, color: '#444', lineHeight: 1.5, margin: 0,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    } as React.CSSProperties}>
                      {d.bio_corta}
 </p>
                  )}

 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #F5F5F7' }}>
 <span style={{ fontSize: 10.5, color: '#86868b', fontWeight: 500 }}>
                      {d.n_apartados} {d.n_apartados === 1 ? 'apartado' : 'apartados'}
 </span>
 <span style={{ fontSize: 12, color: '#0071e3', fontWeight: 600 }}>Abrir →</span>
 </div>
 </Link>
              )
            })}
 </div>
        )}

 <p style={{ marginTop: 30, textAlign: 'center', fontSize: 11, color: '#86868b' }}>
          Backend: <code>/api/dosieres</code> · {updatedAt ? `actualizado ${new Date(updatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'cargando...'}
 </p>
 </main>
 </div>
  )
}
