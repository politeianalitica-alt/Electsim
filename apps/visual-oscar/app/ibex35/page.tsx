'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { IBEX35_FIXTURE } from '@/data/ibex35-fixture'

// ── Categoría inferida de tags ───────────────────────────────────────────────
type Categoria = 'empresa' | 'directivo' | 'familia' | 'fundacion' | 'partido' | 'caso' | 'fondo' | 'otro'

function inferirCategoria(tags: string[]): Categoria {
  const t = tags.map(s => s.toLowerCase())
  if (t.includes('empresa') || t.includes('ibex35') && t.includes('empresa')) return 'empresa'
  if (t.some(x => x.startsWith('ibex35') && x !== 'ibex35')) return 'empresa'
  if (t.includes('directivo') || t.includes('ceo') || t.includes('presidente') || t.includes('vicepresidente')) return 'directivo'
  if (t.some(x => x.startsWith('familia'))) return 'familia'
  if (t.includes('fundacion')) return 'fundacion'
  if (t.includes('partido')) return 'partido'
  if (t.includes('judicial') || t.includes('macrocausa')) return 'caso'
  if (t.includes('fondo-soberano') || t.includes('private-equity') || t.includes('fondo') || t.includes('holding-familiar') || t.includes('holding')) return 'fondo'
  return 'otro'
}

const CAT_LABEL: Record<Categoria, string> = {
  empresa: 'Empresa IBEX 35',
  directivo: 'CEO / Presidente',
  familia: 'Familia controladora',
  fundacion: 'Fundación',
  partido: 'Partido',
  caso: 'Caso judicial',
  fondo: 'Fondo / Holding',
  otro: 'Otros conexos',
}

const CAT_COLOR: Record<Categoria, string> = {
  empresa: '#1F4E8C',
  directivo: '#7A2980',
  familia: '#B45309',
  fundacion: '#0F766E',
  partido: '#C53030',
  caso: '#991B1B',
  fondo: '#0EA5E9',
  otro: '#6e6e73',
}

// Sector inferido de tag `sector:xxx`
function getSector(tags: string[]): string | null {
  const s = tags.find(t => t.toLowerCase().startsWith('sector:'))
  return s ? s.split(':')[1].replace(/-/g, ' ') : null
}

export default function Ibex35Page() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<Categoria | 'TODAS'>('TODAS')

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const allWithCat = useMemo(() =>
    IBEX35_FIXTURE.map(d => ({ ...d, _cat: inferirCategoria(d.tags) })),
  [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    allWithCat.forEach(d => { c[d._cat] = (c[d._cat] || 0) + 1 })
    return c
  }, [allWithCat])

  const filtered = allWithCat
    .filter(d => catFilter === 'TODAS' || d._cat === catFilter)
    .filter(d => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        d.nombre_completo.toLowerCase().includes(q) ||
        (d.alias ?? '').toLowerCase().includes(q) ||
        (d.cargo_actual ?? '').toLowerCase().includes(q) ||
        (d.bio_corta ?? '').toLowerCase().includes(q)
      )
    })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <AppHeader />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px 64px' }}>
        {/* Hero */}
        <header style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 10, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Inteligencia política · IBEX 35
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, letterSpacing: '-0.028em', margin: 0, color: '#1d1d1f' }}>
              IBEX 35
            </h1>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#1F4E8C', letterSpacing: '-0.02em' }}>
              {IBEX35_FIXTURE.length}
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: '8px 0 0', maxWidth: 720, lineHeight: 1.55 }}>
            Empresas del IBEX 35, sus CEOs y presidentes, familias controladoras, fundaciones, fondos
            extranjeros relevantes y casos judiciales (Villarejo, Tarjetas Black, Picasso). Apartados:
            identidad, trayectoria, posiciones, redes, declaraciones, controversias, evidencia.
          </p>
        </header>

        {/* Chips de categoría */}
        <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={() => setCatFilter('TODAS')} style={chipStyle(catFilter === 'TODAS', '#1d1d1f')}>
            Todas <span style={{ opacity: 0.55, marginLeft: 4 }}>{IBEX35_FIXTURE.length}</span>
          </button>
          {(Object.keys(CAT_LABEL) as Categoria[]).map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={chipStyle(catFilter === cat, CAT_COLOR[cat])}>
              {CAT_LABEL[cat]} <span style={{ opacity: 0.55, marginLeft: 4 }}>{counts[cat] || 0}</span>
            </button>
          ))}
        </section>

        {/* Buscador */}
        <section style={{
          background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 16,
          border: '1px solid #ECECEF', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <input
            type="text"
            placeholder="Buscar por nombre, alias, cargo o bio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 220,
              padding: '8px 12px', fontSize: 13,
              border: '1px solid #ECECEF', borderRadius: 8,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          <span style={{ fontSize: 11.5, color: '#86868b', marginLeft: 'auto' }}>
            {filtered.length} de {IBEX35_FIXTURE.length}
          </span>
        </section>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {filtered.map(d => {
            const color = CAT_COLOR[d._cat]
            const sector = getSector(d.tags)
            const initial = (d.alias || d.nombre_completo).split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
            return (
              <Link
                key={d.id}
                href={`/ibex35/${d.slug}`}
                style={{
                  background: '#fff', borderRadius: 14,
                  textDecoration: 'none', color: 'inherit',
                  border: '1px solid #ECECEF',
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'box-shadow 150ms, transform 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 22px ${color}30`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{
                  background: `linear-gradient(135deg, ${color} 0%, ${color}c0 100%)`,
                  padding: '16px 16px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.25)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17,
                    flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)',
                  }}>{initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'inline-block', fontSize: 9, fontWeight: 800,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.85)',
                    }}>{CAT_LABEL[d._cat]}</span>
                    <h3 style={{
                      fontSize: 15, fontWeight: 700, color: '#fff', margin: '1px 0 0',
                      letterSpacing: '-0.012em', lineHeight: 1.2,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    } as React.CSSProperties}>
                      {d.alias || d.nombre_completo}
                    </h3>
                  </div>
                </div>

                <div style={{ padding: '12px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {d.cargo_actual && (
                    <p style={{ fontSize: 12.5, color: '#1d1d1f', margin: 0, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                      {d.cargo_actual}
                    </p>
                  )}
                  {sector && (
                    <span style={{ fontSize: 10.5, color: color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {sector}
                    </span>
                  )}
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                    <span style={{ fontSize: 10.5, color: '#86868b' }}>
                      {d.apartados.length} apartados
                    </span>
                    <span style={{ fontSize: 10.5, color: color, fontWeight: 600 }}>
                      Ver dossier ⟶
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>
            Sin resultados para la búsqueda actual.
          </div>
        )}
      </main>
    </div>
  )
}

function chipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 999,
    border: `1px solid ${active ? color : '#ECECEF'}`,
    background: active ? color : '#fff',
    color: active ? '#fff' : '#1d1d1f',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms',
  }
}
