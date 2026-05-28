'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import EmptyState from '@/components/EmptyState'
import Skeleton, { LiveDot } from '@/components/Skeleton'
import { IBEX35_RESUMEN } from '@/data/ibex35-fixture'
import { DIPUTACIONES_RESUMEN } from '@/data/diputaciones-fixture'

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
  PSOE: '#C53030', PSC: '#C53030', PSDEG: '#C53030',
  PP: '#2D4A8A',
  VOX: '#63BE21', Vox: '#63BE21',
  Sumar: '#BF3F7E', SUMAR: '#BF3F7E',
  Podemos: '#7A2980',
  ERC: '#FFB30F',
  'EH Bildu': '#A02525', Bildu: '#A02525',
  Junts: '#1FA89B', JUNTS: '#1FA89B',
  PNV: '#0F766E',
  CC: '#0EA5E9',
  BNG: '#0E7490',
  Regionalistas: '#7c3aed',
}

// ── Clasificación por tipo de perfil ─────────────────────────────────────────
type TipoPerfil =
  | 'politico' | 'empresario' | 'asesor' | 'mediatico'
  | 'lobbista' | 'casa-real' | 'sindicalista' | 'caso' | 'otro'

const TIPO_LABEL: Record<TipoPerfil, string> = {
  'politico': 'Políticos',
  'empresario': 'Empresarios',
  'asesor': 'Asesores',
  'mediatico': 'Mediáticos',
  'lobbista': 'Lobby / Patronales',
  'casa-real': 'Casa Real',
  'sindicalista': 'Sindicatos',
  'caso': 'Casos judiciales',
  'otro': 'Otros',
}

const TIPO_COLOR: Record<TipoPerfil, string> = {
  'politico': '#1F4E8C',
  'empresario': '#B45309',
  'asesor': '#7A2980',
  'mediatico': '#0EA5E9',
  'lobbista': '#0F766E',
  'casa-real': '#9F1239',
  'sindicalista': '#16A34A',
  'caso': '#991B1B',
  'otro': '#6e6e73',
}

// Inferir el tipo de perfil de un dossier basándose en sus tags + partido.
function inferirTipo(d: { tags?: string[]; partido?: string | null }): TipoPerfil {
  const tags = (d.tags || []).map(t => t.toLowerCase())
  if (tags.some(t => t.startsWith('judicial') || t === 'macrocausa' || t.startsWith('caso-'))) return 'caso'
  if (tags.includes('casa-real') || tags.includes('monarquia')) return 'casa-real'
  if (tags.includes('sindical') || tags.includes('sindicato')) return 'sindicalista'
  if (tags.includes('patronal') || tags.includes('lobby') || tags.includes('think-tank')) return 'lobbista'
  if (tags.includes('medio') || tags.includes('periodista') || tags.includes('tertuliano')) return 'mediatico'
  if (tags.includes('asesor') || tags.includes('consultor')) return 'asesor'
  if (
    tags.includes('empresa') || tags.includes('ibex35') ||
    tags.includes('directivo') || tags.includes('ceo') ||
    tags.includes('fundador') || tags.includes('accionista-control') ||
    tags.includes('holding-familiar') || tags.includes('fondo') ||
    tags.includes('fondo-soberano') || tags.some(t => t.startsWith('familia'))
  ) return 'empresario'
  if (d.partido) return 'politico'
  if (tags.includes('politico') || tags.some(t =>
    t.startsWith('diputacion-') || t === 'presidente-junta' ||
    t === 'ex-politico' || t === 'ex-ministro' || t === 'ex-presidente-bankia'
  )) return 'politico'
  if (tags.includes('partido')) return 'lobbista' // partidos como organizaciones
  return 'otro'
}

// Partidos "grandes" — el resto se agrupa como "Regionalistas".
// Incluye variantes regionales del PSOE (PSOE-A, PSC, PSDEG…) que se
// normalizan al sello federal para no dispersar el chip.
const PARTIDOS_GRANDES = new Set([
  'PSOE', 'PSOE-A', 'PSOE-M', 'PSC', 'PSC-CP', 'PSDEG', 'PSDEG-PSOE',
  'PSE-EE', 'PSE-EE-PSOE', 'PSN', 'PSN-PSOE', 'FSA-PSOE',
  'PP',
  'VOX', 'Vox',
  'Sumar', 'SUMAR',
])
const PARTIDO_NORMALIZED: Record<string, string> = {
  'PSOE-A': 'PSOE', 'PSOE-M': 'PSOE',
  PSC: 'PSOE', 'PSC-CP': 'PSOE',
  PSDEG: 'PSOE', 'PSDEG-PSOE': 'PSOE',
  'PSE-EE': 'PSOE', 'PSE-EE-PSOE': 'PSOE',
  PSN: 'PSOE', 'PSN-PSOE': 'PSOE', 'FSA-PSOE': 'PSOE',
  VOX: 'Vox',
  SUMAR: 'Sumar',
}

function inferirSubcategoria(
  d: { tags?: string[]; partido?: string | null; cargo_actual?: string | null },
  tipo: TipoPerfil,
): string {
  if (tipo === 'politico') {
    const p = d.partido
    if (!p) return 'Sin partido'
    if (PARTIDOS_GRANDES.has(p)) return PARTIDO_NORMALIZED[p] ?? p
    return 'Regionalistas'
  }
  if (tipo === 'empresario') {
    // Tag tipo "empresa:banco-santander" → "banco-santander"
    const empTag = (d.tags || []).find(t => t.toLowerCase().startsWith('empresa:'))
    if (empTag) {
      const slug = empTag.split(':')[1]
      return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }
    // Si es la empresa misma (no un directivo), usar su nombre o sector
    const tags = (d.tags || []).map(t => t.toLowerCase())
    if (tags.includes('ibex35') && tags.includes('empresa')) return 'IBEX 35'
    if (tags.some(t => t.startsWith('familia'))) return 'Familias'
    if (tags.includes('fundacion')) return 'Fundaciones'
    if (tags.includes('fondo') || tags.includes('fondo-soberano') || tags.includes('private-equity')) return 'Fondos'
    return 'Otros'
  }
  return ''
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DosieresPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoPerfil | 'TODOS'>('TODOS')
  const [subcatFilter, setSubcatFilter] = useState<string>('TODAS')

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { data, loading, refresh, source, updatedAt } = useApi<DossierResumen[] | { error?: string }>(
    '/api/dosieres?limit=10000',
    { refreshInterval: 60_000 },
  )

  // Fuente backend (políticos del fixture original) + seeds locales
  const apiDosieres: DossierResumen[] = Array.isArray(data) ? data : []
  // IBEX35_RESUMEN y DIPUTACIONES_RESUMEN tienen mismo shape que DossierResumen
  const dosieres = useMemo(() => [
    ...apiDosieres,
    ...IBEX35_RESUMEN,
    ...DIPUTACIONES_RESUMEN,
  ], [apiDosieres])

  // Enriquecer cada dossier con tipo + subcat inferidos (memoizado)
  // _href: ruta de detalle según origen del dossier (id-prefix indica fuente)
  const enriched = useMemo(() => dosieres.map(d => {
    const tipo = inferirTipo(d)
    const href = d.id?.startsWith('ibx-') ? `/ibex35/${d.slug}`
      : d.id?.startsWith('dip-') ? `/diputaciones/${d.slug}`
      : `/dosieres/${d.slug}`
    return {
      ...d,
      _tipo: tipo,
      _subcat: inferirSubcategoria(d, tipo),
      _href: href,
    }
  }), [dosieres])

  // Contadores por tipo
  const tipoCounts = useMemo(() => {
    const c: Record<string, number> = {}
    enriched.forEach(d => { c[d._tipo] = (c[d._tipo] || 0) + 1 })
    return c
  }, [enriched])

  // Subcategorías disponibles para el tipo activo (ordenadas con grandes primero)
  const subcategorias: { key: string; count: number }[] = useMemo(() => {
    if (tipoFilter === 'TODOS') return []
    const counts: Record<string, number> = {}
    enriched.forEach(d => {
      if (d._tipo !== tipoFilter) return
      if (!d._subcat) return
      counts[d._subcat] = (counts[d._subcat] || 0) + 1
    })
    if (tipoFilter === 'politico') {
      // Orden fijo: PSOE, PP, Vox, Sumar, Regionalistas, Sin partido
      const ord = ['PSOE', 'PP', 'Vox', 'Sumar', 'Regionalistas', 'Sin partido']
      return ord
        .filter(k => counts[k])
        .map(k => ({ key: k, count: counts[k] }))
    }
    // Resto: ordenar por count descendente
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count }))
  }, [enriched, tipoFilter])

  // Cuando cambia el tipo, resetear subcat
  useEffect(() => { setSubcatFilter('TODAS') }, [tipoFilter])

  const filtered = enriched
    .filter(d => tipoFilter === 'TODOS' || d._tipo === tipoFilter)
    .filter(d => subcatFilter === 'TODAS' || d._subcat === subcatFilter)
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
        {/* Header simple · número grande prominente */}
 <header style={{ marginBottom: 22 }}>
 <span style={{ fontSize: 10, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Inteligencia política · personas
 </span>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, letterSpacing: '-0.028em', margin: 0, color: '#1d1d1f' }}>
              Personas
 </h1>
 <span style={{
              fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
              color: '#1F4E8C', letterSpacing: '-0.02em',
            }}>{dosieres.length}</span>
 <LiveDot color={source === 'backend' ? '#10b981' : '#f59e0b'}/>
 </div>
 <p style={{ fontSize: 14, color: '#6e6e73', margin: '8px 0 0', maxWidth: 720, lineHeight: 1.55 }}>
            Fichas de actores políticos, empresariales, mediáticos e institucionales con perfil, trayectoria, posiciones, redes valoradas (+10 / −10) y patrimonio. Filtra por tipo y partido/empresa.
 </p>
 </header>

        {/* Barra de tipos · navegación principal */}
        <section style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <button onClick={() => setTipoFilter('TODOS')} style={tipoChipStyle(tipoFilter === 'TODOS', '#1d1d1f')}>
            Todos <span style={{ opacity: 0.55, marginLeft: 4 }}>{dosieres.length}</span>
          </button>
          {(Object.keys(TIPO_LABEL) as TipoPerfil[])
            .filter(t => (tipoCounts[t] || 0) > 0)
            .sort((a, b) => (tipoCounts[b] || 0) - (tipoCounts[a] || 0))
            .map(t => (
              <button
                key={t}
                onClick={() => setTipoFilter(t)}
                style={tipoChipStyle(tipoFilter === t, TIPO_COLOR[t])}
              >
                {TIPO_LABEL[t]} <span style={{ opacity: 0.55, marginLeft: 4 }}>{tipoCounts[t] || 0}</span>
              </button>
            ))}
        </section>

        {/* Subbarra · partido/empresa/etc. según tipo seleccionado */}
        {tipoFilter !== 'TODOS' && subcategorias.length > 0 && (
          <section style={{
            display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14,
            paddingLeft: 14, borderLeft: `3px solid ${TIPO_COLOR[tipoFilter as TipoPerfil]}40`,
          }}>
            <button
              onClick={() => setSubcatFilter('TODAS')}
              style={subcatChipStyle(subcatFilter === 'TODAS', TIPO_COLOR[tipoFilter as TipoPerfil])}
            >
              Todas
            </button>
            {subcategorias.map(({ key, count }) => {
              const color = tipoFilter === 'politico'
                ? (PARTIDO_COLOR[key] ?? TIPO_COLOR['politico'])
                : TIPO_COLOR[tipoFilter as TipoPerfil]
              return (
                <button
                  key={key}
                  onClick={() => setSubcatFilter(key)}
                  style={subcatChipStyle(subcatFilter === key, color)}
                >
                  {key} <span style={{ opacity: 0.6, marginLeft: 4 }}>{count}</span>
                </button>
              )
            })}
          </section>
        )}

        {/* Buscador + acciones */}
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
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {filtered.map(d => {
              // Color: partido si lo hay, si no color del tipo (empresario, casa-real, etc.)
              const partidoColor = d.partido
                ? (PARTIDO_COLOR[d.partido] ?? TIPO_COLOR[d._tipo])
                : TIPO_COLOR[d._tipo]
              const initial = (d.alias || d.nombre_completo).split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()
              return (
 <Link
                  key={d.id}
                  href={d._href}
                  style={{
                    background: '#fff', borderRadius: 14,
                    textDecoration: 'none', color: 'inherit',
                    border: '1px solid #ECECEF',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'box-shadow 150ms, transform 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 22px ${partidoColor}30`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {/* Cabecera con gradient de color de partido */}
 <div style={{
                    background: `linear-gradient(135deg, ${partidoColor} 0%, ${partidoColor}c0 100%)`,
                    padding: '16px 16px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    {d.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
 <img src={d.foto_url} alt={d.nombre_completo}
                        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }} />
                    ) : (
 <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.25)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17,
                        flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)',
                      }}>{initial}</div>
                    )}
 <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: 'inline-block', fontSize: 9, fontWeight: 800,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.85)',
                      }}>
                        {d.partido || TIPO_LABEL[d._tipo]}
                      </span>
 <h3 style={{
                        fontSize: 15, fontWeight: 700, color: '#fff', margin: '1px 0 0',
                        letterSpacing: '-0.012em', lineHeight: 1.2,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      } as React.CSSProperties}>
                        {d.nombre_completo}
 </h3>
 </div>
 </div>

                  {/* Cuerpo */}
 <div style={{ padding: '12px 16px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {d.cargo_actual && (
 <p style={{
                        fontSize: 11.5, color: '#525258', margin: 0, lineHeight: 1.45,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      } as React.CSSProperties}>
                        {d.cargo_actual}
 </p>
                    )}
 <div style={{
                      marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 8, borderTop: '1px solid #F5F5F7',
                    }}>
 <span style={{ fontSize: 10, color: '#86868b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {d.n_apartados} {d.n_apartados === 1 ? 'apartado' : 'apartados'}
 </span>
 <span style={{
                        fontSize: 11, color: partidoColor, fontWeight: 700, letterSpacing: '0.04em',
                      }}>VER FICHA →</span>
 </div>
 </div>
 </Link>
              )
            })}
 </div>
        )}

 <p style={{ marginTop: 30, textAlign: 'center', fontSize: 11, color: '#86868b' }}>
          Backend: <code>/api/dosieres</code> · {updatedAt ? `actualizado ${new Date(updatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'cargando...'}
          {' · '}<span style={{ color: '#525258' }}>{IBEX35_RESUMEN.length} IBEX 35 + {DIPUTACIONES_RESUMEN.length} Diputaciones (seed local)</span>
 </p>
 </main>
 </div>
  )
}

// ── Chip styles compartidos ──────────────────────────────────────────────────
function tipoChipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: 999,
    border: `1px solid ${active ? color : '#ECECEF'}`,
    background: active ? color : '#fff',
    color: active ? '#fff' : '#1d1d1f',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms',
    letterSpacing: '-0.005em',
  }
}

function subcatChipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '5px 11px',
    borderRadius: 999,
    border: `1px solid ${active ? color : '#ECECEF'}`,
    background: active ? color : '#fff',
    color: active ? '#fff' : '#525258',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 120ms',
  }
}
