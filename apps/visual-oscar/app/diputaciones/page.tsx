'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { DIPUTACIONES_FIXTURE } from '@/data/diputaciones-fixture'

const CCAA_LABEL: Record<string, string> = {
  andalucia: 'Andalucía',
  aragon: 'Aragón',
  cyl: 'Castilla y León',
  clm: 'Castilla-La Mancha',
  cataluna: 'Cataluña',
  'c-valenciana': 'Comunidad Valenciana',
  extremadura: 'Extremadura',
  galicia: 'Galicia',
  euskadi: 'País Vasco',
}

const CCAA_COLOR: Record<string, string> = {
  andalucia: '#16a34a',
  aragon: '#dc2626',
  cyl: '#7c3aed',
  clm: '#ea580c',
  cataluna: '#f59e0b',
  'c-valenciana': '#0ea5e9',
  extremadura: '#0d9488',
  galicia: '#0891b2',
  euskadi: '#65a30d',
}

const PARTIDO_COLOR: Record<string, string> = {
  PSOE: '#C53030', PSC: '#C53030', PSDEG: '#C53030',
  PP: '#2D4A8A', PNV: '#0F766E',
  JUNTS: '#1FA89B', ERC: '#FFB30F',
}

type Tipo = 'institucion' | 'presidente' | 'partido' | 'politico'

function inferirTipo(d: typeof DIPUTACIONES_FIXTURE[number]): Tipo {
  const t = d.tags.map(s => s.toLowerCase())
  if (t.includes('diputacion-provincial') || t.includes('diputacion-foral')) return 'institucion'
  if (t.includes('partido')) return 'partido'
  if (t.includes('presidente-junta') || t.includes('ex-presidente-diputacion')) return 'politico'
  if (t.includes('politico')) return 'presidente'
  return 'politico'
}

function getCCAA(d: typeof DIPUTACIONES_FIXTURE[number]): string | null {
  const t = d.tags.find(x => x.toLowerCase().startsWith('ccaa:'))
  return t ? t.split(':')[1] : null
}

function getPartido(d: typeof DIPUTACIONES_FIXTURE[number]): string | null {
  return d.partido
}

export default function DiputacionesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [ccaaFilter, setCcaaFilter] = useState<string>('TODAS')
  const [tipoFilter, setTipoFilter] = useState<Tipo | 'TODOS'>('TODOS')

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const enriched = useMemo(() =>
    DIPUTACIONES_FIXTURE.map(d => ({
      ...d,
      _tipo: inferirTipo(d),
      _ccaa: getCCAA(d),
      _partido: getPartido(d),
    })),
  [])

  const ccaasOrdenadas = Object.keys(CCAA_LABEL)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    enriched.forEach(d => { if (d._ccaa) c[d._ccaa] = (c[d._ccaa] || 0) + 1 })
    return c
  }, [enriched])

  const filtered = enriched
    .filter(d => ccaaFilter === 'TODAS' || d._ccaa === ccaaFilter)
    .filter(d => tipoFilter === 'TODOS' || d._tipo === tipoFilter)
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
            Inteligencia política · gobiernos provinciales
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, letterSpacing: '-0.028em', margin: 0, color: '#1d1d1f' }}>
              Diputaciones Provinciales
            </h1>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#7c3aed', letterSpacing: '-0.02em' }}>
              {DIPUTACIONES_FIXTURE.length}
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#6e6e73', margin: '8px 0 0', maxWidth: 720, lineHeight: 1.55 }}>
            38 Diputaciones Provinciales (régimen común) + 3 Diputaciones Forales (Álava, Bizkaia, Gipuzkoa).
            Cada institución con composición política y presidente con dossier completo: identidad,
            trayectoria, posiciones, redes, controversias, evidencia.
          </p>
        </header>

        {/* Chips CCAA */}
        <section style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <button onClick={() => setCcaaFilter('TODAS')} style={chipStyle(ccaaFilter === 'TODAS', '#1d1d1f')}>
            Todas <span style={{ opacity: 0.55, marginLeft: 4 }}>{DIPUTACIONES_FIXTURE.length}</span>
          </button>
          {ccaasOrdenadas.map(c => (
            <button key={c} onClick={() => setCcaaFilter(c)} style={chipStyle(ccaaFilter === c, CCAA_COLOR[c])}>
              {CCAA_LABEL[c]} <span style={{ opacity: 0.55, marginLeft: 4 }}>{counts[c] || 0}</span>
            </button>
          ))}
        </section>

        {/* Chips tipo */}
        <section style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {(['TODOS', 'institucion', 'presidente', 'politico', 'partido'] as const).map(t => (
            <button key={t} onClick={() => setTipoFilter(t as Tipo | 'TODOS')} style={chipStyle(tipoFilter === t, '#6e6e73')}>
              {t === 'TODOS' ? 'Todos los tipos' : t === 'institucion' ? 'Instituciones' :
                t === 'presidente' ? 'Presidentes' : t === 'politico' ? 'Otros políticos' : 'Partidos'}
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
            placeholder="Buscar por nombre, provincia, partido, presidente..."
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
            {filtered.length} de {DIPUTACIONES_FIXTURE.length}
          </span>
        </section>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map(d => {
            const ccaaColor = d._ccaa ? CCAA_COLOR[d._ccaa] : '#6e6e73'
            const partidoColor = d._partido ? (PARTIDO_COLOR[d._partido] ?? '#6e6e73') : null
            const color = partidoColor ?? ccaaColor
            const initial = (d.alias || d.nombre_completo).split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
            const tipoLabel = d._tipo === 'institucion' ? 'Institución'
              : d._tipo === 'presidente' ? 'Presidente diputación'
              : d._tipo === 'partido' ? 'Partido'
              : 'Político'
            return (
              <Link
                key={d.id}
                href={`/diputaciones/${d.slug}`}
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
                    }}>{tipoLabel}{d._partido ? ' · ' + d._partido : ''}</span>
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
                  {d._ccaa && (
                    <span style={{ fontSize: 10.5, color: ccaaColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {CCAA_LABEL[d._ccaa]}
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
            Sin resultados para los filtros actuales.
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
