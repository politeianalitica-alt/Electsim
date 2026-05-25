'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import EmptyState from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'

// ── Types ────────────────────────────────────────────────────────────────────

type TipoApartado = 'identidad' | 'trayectoria' | 'posiciones' | 'redes' | 'declaraciones' | 'controversias' | 'evidencia'
type TipoItem = 'dato' | 'declaracion' | 'evento' | 'contacto' | 'documento'

interface Item {
  id: string
  apartado_id: string
  tipo: TipoItem
  titulo: string | null
  contenido: string
  fecha: string | null
  fuente_url: string | null
  fuente_titulo: string | null
  tags: string[]
  orden: number
}

interface Apartado {
  id: string
  tipo: TipoApartado
  titulo: string | null
  resumen: string | null
  orden: number
  items: Item[]
}

interface DossierCompleto {
  id: string
  slug: string
  nombre_completo: string
  alias: string | null
  cargo_actual: string | null
  partido: string | null
  foto_url: string | null
  bio_corta: string | null
  tags: string[]
  fuente_principal: string | null
  apartados: Apartado[]
  created_at: string
  updated_at: string
}

// ── Metadata por apartado ────────────────────────────────────────────────────
const APARTADO_META: Record<TipoApartado, { label: string; icon: string; color: string; descripcion: string }> = {
  identidad:     { label: 'Identidad',     icon: '◐', color: '#1F4E8C', descripcion: 'Datos personales, formación, lugar de nacimiento' },
  trayectoria:   { label: 'Trayectoria',   icon: '◐', color: '#7C3AED', descripcion: 'Cargos pasados y carrera política' },
  posiciones:    { label: 'Posiciones',    icon: '◐', color: '#0F766E', descripcion: 'Posicionamiento ideológico en temas concretos' },
  redes:         { label: 'Redes',         icon: '◐', color: '#0EA5E9', descripcion: 'Red de contactos, alianzas, mentores' },
  declaraciones: { label: 'Declaraciones', icon: '◐', color: '#D97706', descripcion: 'Citas públicas y posicionamientos verbales' },
  controversias: { label: 'Controversias', icon: '◐', color: '#DC2626', descripcion: 'Casos judiciales, polémicas, escándalos' },
  evidencia:     { label: 'Evidencia',     icon: '◐', color: '#525258', descripcion: 'Documentos verificables, papers, sentencias' },
}

const APARTADO_ORDER: TipoApartado[] = [
  'identidad', 'trayectoria', 'posiciones', 'redes', 'declaraciones', 'controversias', 'evidencia',
]

const TIPO_ITEM_META: Record<TipoItem, { label: string; color: string }> = {
  dato:        { label: 'Dato',        color: '#6e6e73' },
  declaracion: { label: 'Declaración', color: '#D97706' },
  evento:      { label: 'Evento',      color: '#7C3AED' },
  contacto:    { label: 'Contacto',    color: '#0EA5E9' },
  documento:   { label: 'Documento',   color: '#0F766E' },
}

const PARTIDO_COLOR: Record<string, string> = {
  PSOE: '#C53030', PSC: '#C53030', PP: '#2D4A8A', VOX: '#63BE21',
  Sumar: '#BF3F7E', SUMAR: '#BF3F7E', Podemos: '#7A2980', ERC: '#FFB30F',
  'EH Bildu': '#A02525', Junts: '#1FA89B', PNV: '#0F766E', CC: '#0EA5E9', BNG: '#0E7490',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DossierDetallePage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { data, loading } = useApi<DossierCompleto | { error?: string }>(
    `/api/dosieres/${params.slug}`,
  )

  const dossier: DossierCompleto | null = data && 'slug' in data ? data : null

  if (loading) {
    return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
 <AppHeader />
 <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px' }}>
 <Skeleton width={200} height={14} radius={4} style={{ marginBottom: 8 }}/>
 <Skeleton width={400} height={32} radius={6} style={{ marginBottom: 12 }}/>
 <Skeleton width={300} height={14} radius={4} style={{ marginBottom: 32 }}/>
          {[0,1,2,3].map(i => (
 <div key={i} style={{ marginBottom: 20 }}>
 <Skeleton width={180} height={20} radius={4} style={{ marginBottom: 10 }}/>
 <Skeleton width={'100%' as unknown as number} height={80} radius={8}/>
 </div>
          ))}
 </main>
 </div>
    )
  }

  if (!dossier) {
    return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
 <AppHeader />
 <main style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 28px' }}>
 <EmptyState
            severity="warning"
            title="Dossier no encontrado"
            description={`No tenemos un dossier con el slug "${params.slug}". Puede que aún no exista o que el enlace esté caducado.`}
            primaryAction={{ label: 'Ver todos los dosieres', href: '/dosieres' }}
            secondaryAction={{ label: 'Volver al inicio', href: '/inicio' }}
          />
 </main>
 </div>
    )
  }

  const partidoColor = dossier.partido ? (PARTIDO_COLOR[dossier.partido] ?? '#6e6e73') : '#6e6e73'
  const apartadosByTipo = new Map<TipoApartado, Apartado>()
  dossier.apartados.forEach(a => apartadosByTipo.set(a.tipo, a))

  // Apartados que tienen contenido (en orden canónico)
  const apartadosOrdenados = APARTADO_ORDER.filter(t => apartadosByTipo.has(t))
  const apartadosVacios = APARTADO_ORDER.filter(t => !apartadosByTipo.has(t))

  return (
 <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
 <AppHeader />
 <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 64px' }}>

        {/* Breadcrumb */}
 <nav style={{ marginBottom: 18, fontSize: 12, color: '#6e6e73' }}>
 <Link href="/dosieres" style={{ color: '#6e6e73', textDecoration: 'none' }}>← Todos los dosieres</Link>
 </nav>

        {/* Header con foto + nombre + partido */}
 <header style={{
          background: '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 22,
          border: '1px solid #ECECEF', borderLeft: `4px solid ${partidoColor}`,
          display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap',
        }}>
          {dossier.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
 <img src={dossier.foto_url} alt={dossier.nombre_completo}
              style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
 <div style={{
              width: 110, height: 110, borderRadius: '50%',
              background: `${partidoColor}18`, color: partidoColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36,
              flexShrink: 0,
            }}>{(dossier.alias || dossier.nombre_completo).split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()}</div>
          )}
 <div style={{ flex: 1, minWidth: 0 }}>
 <span style={{ fontSize: 10, color: '#86868b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Dossier · actualizado {new Date(dossier.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
 </span>
 <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0 6px', color: '#1d1d1f' }}>
              {dossier.nombre_completo}
              {dossier.alias && dossier.alias !== dossier.nombre_completo && (
 <span style={{ fontWeight: 400, color: '#86868b', fontSize: 22, marginLeft: 8 }}>· {dossier.alias}</span>
              )}
 </h1>
            {dossier.cargo_actual && (
 <p style={{ fontSize: 14, color: '#444', margin: '0 0 8px', lineHeight: 1.4 }}>
                {dossier.cargo_actual}
 </p>
            )}
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: dossier.bio_corta ? 10 : 0 }}>
              {dossier.partido && (
 <span style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                  background: `${partidoColor}18`, color: partidoColor,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>{dossier.partido}</span>
              )}
              {dossier.tags?.map(t => (
 <span key={t} style={{
                  fontSize: 11, padding: '4px 9px', borderRadius: 999,
                  background: '#F5F5F7', color: '#6e6e73', fontWeight: 600,
                }}>#{t}</span>
              ))}
 </div>
            {dossier.bio_corta && (
 <p style={{ fontSize: 13, color: '#444', margin: 0, lineHeight: 1.55, maxWidth: 720 }}>
                {dossier.bio_corta}
 </p>
            )}
            {dossier.fuente_principal && (
 <a href={dossier.fuente_principal} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
                Fuente principal ↗
 </a>
            )}
 </div>
 </header>

        {/* TOC · navegación interna a apartados */}
        {apartadosOrdenados.length > 0 && (
 <nav style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            {apartadosOrdenados.map(t => {
              const meta = APARTADO_META[t]
              return (
 <a key={t} href={`#${t}`} style={{
                  fontSize: 11.5, padding: '5px 10px', borderRadius: 999,
                  background: `${meta.color}10`, color: meta.color, fontWeight: 700,
                  textDecoration: 'none', letterSpacing: '0.03em',
                  border: `1px solid ${meta.color}33`,
                }}>{meta.label}</a>
              )
            })}
 </nav>
        )}

        {/* Apartados con contenido */}
        {apartadosOrdenados.map(tipo => {
          const apartado = apartadosByTipo.get(tipo)!
          const meta = APARTADO_META[tipo]
          return (
 <section key={tipo} id={tipo} style={{
              background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 16,
              border: '1px solid #ECECEF', borderLeft: `3px solid ${meta.color}`,
            }}>
 <header style={{ marginBottom: 12 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
 <span style={{ color: meta.color, fontWeight: 700 }}>{meta.icon}</span>
 <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f' }}>
                    {apartado.titulo || meta.label}
 </h2>
 <span style={{ fontSize: 11, color: '#86868b', marginLeft: 'auto' }}>
                    {apartado.items.length} {apartado.items.length === 1 ? 'item' : 'items'}
 </span>
 </div>
 <p style={{ fontSize: 11.5, color: '#86868b', margin: 0 }}>{meta.descripcion}</p>
                {apartado.resumen && (
 <p style={{ fontSize: 13, color: '#3a3a3d', margin: '10px 0 0', lineHeight: 1.55, padding: '10px 12px', background: `${meta.color}08`, borderRadius: 8, borderLeft: `2px solid ${meta.color}40` }}>
                    {apartado.resumen}
 </p>
                )}
 </header>

              {apartado.items.length === 0 ? (
 <p style={{ fontSize: 12, color: '#86868b', fontStyle: 'italic', margin: 0 }}>
                  Apartado todavía sin items.
 </p>
              ) : (
 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {apartado.items.map(item => {
                    const itemMeta = TIPO_ITEM_META[item.tipo]
                    return (
 <li key={item.id} style={{
                        padding: '12px 14px',
                        background: '#FAFAFB', borderRadius: 8,
                        border: '1px solid #ECECEF',
                      }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
 <span style={{
                            fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
                            background: `${itemMeta.color}18`, color: itemMeta.color,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                          }}>{itemMeta.label}</span>
                          {item.fecha && (
 <span style={{ fontSize: 10.5, color: '#6e6e73', fontWeight: 600 }}>
                              {new Date(item.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
 </span>
                          )}
                          {item.titulo && (
 <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', flex: 1, minWidth: 0 }}>
                              {item.titulo}
 </span>
                          )}
 </div>
 <p style={{ fontSize: 13, color: '#1d1d1f', margin: '4px 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                          {item.contenido}
 </p>
                        {item.tags && item.tags.length > 0 && (
 <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                            {item.tags.map(t => (
 <span key={t} style={{
                                fontSize: 10, padding: '1px 6px', borderRadius: 999,
                                background: '#F0F4FF', color: '#1F4E8C', fontWeight: 600,
                              }}>#{t}</span>
                            ))}
 </div>
                        )}
                        {item.fuente_url && (
 <a href={item.fuente_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-block', marginTop: 8, fontSize: 11.5, color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
                            {item.fuente_titulo || 'Ver fuente'} ↗
 </a>
                        )}
 </li>
                    )
                  })}
 </ul>
              )}
 </section>
          )
        })}

        {/* Apartados vacíos · invitación a rellenar */}
        {apartadosVacios.length > 0 && (
 <section style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px dashed #ECECEF' }}>
 <h3 style={{ fontSize: 12, fontWeight: 700, color: '#86868b', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Apartados que faltan
 </h3>
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {apartadosVacios.map(t => {
                const meta = APARTADO_META[t]
                return (
 <span key={t} style={{
                    fontSize: 11.5, padding: '5px 11px', borderRadius: 999,
                    background: '#F5F5F7', color: '#86868b', fontWeight: 600,
                  }}>{meta.label}</span>
                )
              })}
 </div>
 </section>
        )}

 </main>
 </div>
  )
}
