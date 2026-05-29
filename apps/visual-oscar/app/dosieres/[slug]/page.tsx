'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '../../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import EmptyState from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'
import { findDossier } from '@/lib/dosieres-link'
// Fixtures locales para los seeds IBEX 35 + Diputaciones (no están en
// el backend; se mergean en cliente · misma estética que el resto).
import { getDossierBySlug } from '@/data/dosieres-fixture'
import { getCONGBySlug } from '@/data/congreso-fixture'
import { getSENBySlug } from '@/data/senado-fixture'
import { getMEDBySlug } from '@/data/medios-fixture'
import { IBEX35_FIXTURE } from '@/data/ibex35-fixture'
import { DIPUTACIONES_FIXTURE } from '@/data/diputaciones-fixture'
import { PODER_FIXTURE } from '@/data/poder-fixture'
// Overlay de relaciones políticas estructurales (Fase B). Aplica a los
// ~2.500 dossieres del fixture sin apartado redes propio.
import REDES_OVERLAY from '@/data/redes-overlay.json'
// Sprint G14 cierre · panel OSINT externo · solo PEPs · audit obligatorio
import { DossierOSINTPanel } from '@/components/dossier/DossierOSINTPanel'

// ── Types ────────────────────────────────────────────────────────────────────

type TipoApartado = 'identidad' | 'trayectoria' | 'posiciones' | 'redes' | 'declaraciones' | 'controversias' | 'evidencia'
type TipoItem = 'dato' | 'declaracion' | 'evento' | 'contacto' | 'documento'

interface Item {
  id: string; apartado_id: string; tipo: TipoItem
  titulo: string | null; contenido: string
  fecha: string | null; fuente_url: string | null; fuente_titulo: string | null
  tags: string[]; orden: number
}
interface Apartado {
  id: string; tipo: TipoApartado
  titulo: string | null; resumen: string | null; orden: number; items: Item[]
}
interface DossierCompleto {
  id: string; slug: string
  nombre_completo: string; alias: string | null
  cargo_actual: string | null; partido: string | null
  foto_url: string | null; bio_corta: string | null
  tags: string[]; fuente_principal: string | null
  apartados: Apartado[]; created_at: string; updated_at: string
}

// ── Metadata por apartado · sin emojis · símbolos Unicode permitidos ──────────
// Regla 0.5 del CLAUDE.md · prohibido emoji. Usamos badges con letra inicial.
const APARTADO_META: Record<TipoApartado, { label: string; letter: string; color: string; bg: string }> = {
  identidad:     { label: 'Quién es',         letter: 'i', color: '#1F4E8C', bg: '#EFF4FB' },
  trayectoria:   { label: 'Trayectoria',      letter: 'T', color: '#7C3AED', bg: '#F4EFFE' },
  posiciones:    { label: 'Posiciones',       letter: 'P', color: '#0F766E', bg: '#E7F5F2' },
  redes:         { label: 'Quién está cerca', letter: 'R', color: '#0EA5E9', bg: '#E6F4FB' },
  declaraciones: { label: 'Ha dicho',         letter: '"', color: '#D97706', bg: '#FBF1E3' },
  controversias: { label: 'Lo que se le critica', letter: '!', color: '#DC2626', bg: '#FBEAEA' },
  evidencia:     { label: 'Patrimonio',       letter: '€', color: '#525258', bg: '#F2F2F4' },
}

const APARTADO_ORDER: TipoApartado[] = [
  'identidad', 'trayectoria', 'posiciones', 'redes', 'declaraciones', 'controversias', 'evidencia',
]

const PARTIDO_COLOR: Record<string, string> = {
  PSOE: '#C53030', PSC: '#C53030', PP: '#2D4A8A', VOX: '#63BE21',
  Sumar: '#BF3F7E', SUMAR: '#BF3F7E', Podemos: '#7A2980', ERC: '#FFB30F',
  'EH Bildu': '#A02525', Junts: '#1FA89B', PNV: '#0F766E', CC: '#0EA5E9',
  BNG: '#0E7490', Compromís: '#FF6B35', UPN: '#D97706', Independiente: '#6e6e73',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractNota(contenido: string): number | null {
  const m = contenido.match(/nota\s*([+\-]?\d+)\/10/)
  return m ? parseInt(m[1], 10) : null
}
function notaColor(n: number): string {
  if (n >= 7) return '#16A34A'   // verde fuerte
  if (n >= 3) return '#84CC16'   // verde claro
  if (n >= -2) return '#9CA3AF'  // gris
  if (n >= -6) return '#F97316'  // naranja
  return '#DC2626'                // rojo
}
function notaLabel(n: number): string {
  if (n >= 7) return 'Aliado fuerte'
  if (n >= 3) return 'Afín'
  if (n >= -2) return 'Neutral'
  if (n >= -6) return 'Tensión'
  return 'Enfrentamiento'
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DossierDetallePage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<TipoApartado | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  const { data, loading } = useApi<DossierCompleto | { error?: string }>(
    `/api/dosieres/${params.slug}`,
  )

  // El proxy envuelve detalles con _meta · normalizamos
  const apiDossier: DossierCompleto | null = data && typeof data === 'object' && 'slug' in data
    ? (data as DossierCompleto)
    : null

  // Fallback en cliente: los seeds IBEX 35 y Diputaciones no están en
  // el backend. Si la API no devuelve nada y el slug existe en algún
  // fixture local, lo usamos con la misma estética que el resto.
  const localDossier = !apiDossier
    ? (IBEX35_FIXTURE.find(d => d.slug === params.slug) as DossierCompleto | undefined)
      ?? (DIPUTACIONES_FIXTURE.find(d => d.slug === params.slug) as DossierCompleto | undefined)
      ?? (PODER_FIXTURE.find(d => d.slug === params.slug) as DossierCompleto | undefined)
      ?? (getCONGBySlug(params.slug) as DossierCompleto | null)
      ?? (getSENBySlug(params.slug) as DossierCompleto | null)
      ?? (getMEDBySlug(params.slug) as DossierCompleto | null)
      ?? (getDossierBySlug(params.slug) as DossierCompleto | null)
      ?? null
    : null

  const dossierBase: DossierCompleto | null = apiDossier ?? localDossier

  // Merge overlay de relaciones políticas estructurales (Fase B).
  // Si el dossier NO trae apartado `redes` propio, miramos el overlay
  // y construimos un apartado sintético con líderes/rivales del partido.
  // Esto cubre ~2.500 políticos del fixture sin redes hasta ahora.
  const dossier = useMemo(() => {
    if (!dossierBase) return null
    const yaTieneRedes = dossierBase.apartados.some(a => a.tipo === 'redes')
    if (yaTieneRedes) return dossierBase

    const ov = REDES_OVERLAY as {
      by_party: Record<string, { titulo: string; contenido: string; tags: string[]; slug_ref: string | null }[]>;
      generic: { titulo: string; contenido: string; tags: string[]; slug_ref: string | null }[];
      apply_to: Record<string, string>;
    }
    const partidoKey = ov.apply_to[dossierBase.slug]
    if (!partidoKey) return dossierBase   // no hay overlay para este slug

    const templateItems = partidoKey === '_generic'
      ? ov.generic
      : (ov.by_party[partidoKey] ?? [])

    // Filtrar auto-referencias (yo no me cito a mí mismo)
    const items = templateItems
      .filter(it => it.slug_ref !== dossierBase.slug)
      .map((it, i) => ({
        id: `overlay-${dossierBase.slug}-${i}`,
        apartado_id: `overlay-${dossierBase.slug}-redes`,
        tipo: 'contacto' as const,
        titulo: it.titulo,
        contenido: it.contenido,
        fecha: null,
        fuente_url: null,
        fuente_titulo: null,
        tags: it.tags,
        orden: i,
      }))

    if (items.length === 0) return dossierBase

    const apartadoRedes: Apartado = {
      id: `overlay-${dossierBase.slug}-ap-redes`,
      tipo: 'redes',
      titulo: 'Relaciones políticas',
      resumen: 'Valoración analítica estructural (escala +10 a -10) inferida desde el partido del actor. Notas razonadas, no datos oficiales.',
      orden: 3,
      items,
    }
    return {
      ...dossierBase,
      apartados: [...dossierBase.apartados, apartadoRedes],
    }
  }, [dossierBase])

  // Mientras la API responde, si tenemos local, ya pintamos (sin parpadeo)
  if (loading && !localDossier) return <LoadingState/>
  if (!dossier) return <NotFoundState slug={params.slug}/>

  const partidoColor = dossier.partido ? (PARTIDO_COLOR[dossier.partido] ?? '#6e6e73') : '#6e6e73'
  const apartadosByTipo = new Map<TipoApartado, Apartado>()
  dossier.apartados.forEach(a => apartadosByTipo.set(a.tipo, a))
  const apartadosOrdenados = APARTADO_ORDER.filter(t => apartadosByTipo.has(t))
  const initial = (dossier.alias || dossier.nombre_completo).split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()

  return (
 <div style={{ background: '#FBFBFD', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
 <AppHeader/>
 <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 80px' }}>

        {/* Breadcrumb · sutil + acción "Editar" */}
 <nav style={{ marginBottom: 16, fontSize: 12, color: '#86868b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <Link href="/dosieres" style={{ color: '#86868b', textDecoration: 'none' }}>← Todos los dosieres</Link>
 <Link
   href={`/dosieres/nuevo?import=${dossier.slug}`}
   style={{
     color: '#0071e3', textDecoration: 'none', fontSize: 11.5, fontWeight: 600,
     padding: '4px 10px', border: '1px solid #d2e3fb', borderRadius: 6,
   }}
   title="Abre el formulario precargado con los datos de este dossier"
 >
   Editar / clonar
 </Link>
 </nav>

        {/* ═══ HERO grande con foto + nombre + partido prominente ═══ */}
 <header style={{
          background: `linear-gradient(135deg, ${partidoColor}f0 0%, ${partidoColor}a0 100%)`,
          borderRadius: 24, padding: '36px 40px', marginBottom: 18,
          color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: `0 8px 32px ${partidoColor}30`,
        }}>
          {/* Patrón decorativo */}
 <div style={{
            position: 'absolute', top: -80, right: -60, width: 300, height: 300,
            borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
          }}/>
 <div style={{
            position: 'absolute', bottom: -50, left: -30, width: 180, height: 180,
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }}/>

 <div style={{ position: 'relative', display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {dossier.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
 <img src={dossier.foto_url} alt={dossier.nombre_completo}
                style={{ width: 130, height: 130, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '4px solid rgba(255,255,255,0.3)' }} />
            ) : (
 <div style={{
                width: 130, height: 130, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 44,
                color: '#fff', flexShrink: 0, border: '4px solid rgba(255,255,255,0.25)',
              }}>{initial}</div>
            )}

 <div style={{ flex: 1, minWidth: 250 }}>
              {dossier.partido && (
 <span style={{
                  display: 'inline-block', padding: '5px 14px', borderRadius: 999,
                  background: 'rgba(0,0,0,0.18)', color: '#fff',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: 10,
                }}>{dossier.partido}</span>
              )}
 <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700,
                letterSpacing: '-0.028em', margin: '0 0 8px', lineHeight: 1.05, color: '#fff',
              }}>{dossier.nombre_completo}</h1>
              {dossier.cargo_actual && (
 <p style={{ fontSize: 15, opacity: 0.92, margin: '0 0 14px', lineHeight: 1.45, fontWeight: 400 }}>
                  {dossier.cargo_actual}
 </p>
              )}
              {/* Métricas clave · número de apartados disponibles */}
 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {apartadosOrdenados.map(t => {
                  const meta = APARTADO_META[t]
                  const n = apartadosByTipo.get(t)?.items.length ?? 0
                  return (
 <a key={t} href={`#${t}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '6px 12px', borderRadius: 999,
                      background: 'rgba(255,255,255,0.18)', color: '#fff',
                      fontSize: 11.5, fontWeight: 600, textDecoration: 'none',
                      backdropFilter: 'blur(8px)',
                      transition: 'background 150ms',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}>
 <span>{meta.label}</span>
 <span style={{ opacity: 0.7, fontSize: 10.5, fontWeight: 700 }}>{n}</span>
 </a>
                  )
                })}
 </div>
 </div>
 </div>
 </header>

        {/* Bio corta · cita destacada */}
        {dossier.bio_corta && (
 <blockquote style={{
            margin: '0 0 24px',
            padding: '18px 26px',
            borderLeft: `4px solid ${partidoColor}`,
            background: '#fff',
            borderRadius: '0 14px 14px 0',
            fontSize: 15.5, color: '#3a3a3d', lineHeight: 1.6,
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontStyle: 'italic',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {dossier.bio_corta}
 </blockquote>
        )}

        {/* ═══ APARTADOS · cards visuales por tipo ═══ */}
 <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {apartadosOrdenados.map(tipo => {
            const apartado = apartadosByTipo.get(tipo)!
            return <ApartadoCard key={tipo} tipo={tipo} apartado={apartado} partidoColor={partidoColor}/>
          })}
 </div>

        {/* Sprint G14 cierre · panel "Investigar más" · solo PEPs · audit log obligatorio */}
        <DossierOSINTPanel
          subject={{
            full_name: dossier.nombre_completo,
            cargo: dossier.cargo_actual,
            partido: dossier.partido,
            dossier_slug: dossier.slug,
            tipo: (dossier.tags || []).join(' ') || null,
          }}
        />

        {/* Fuente */}
        {dossier.fuente_principal && (
 <p style={{
            marginTop: 28, textAlign: 'center', fontSize: 11.5, color: '#86868b',
          }}>
            Fuente principal: {dossier.fuente_principal}
 </p>
        )}
 </main>
 </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// CARD por apartado · cada tipo tiene un look específico
// ═════════════════════════════════════════════════════════════════════════════

function ApartadoCard({ tipo, apartado, partidoColor }: { tipo: TipoApartado; apartado: Apartado; partidoColor: string }) {
  const meta = APARTADO_META[tipo]

  return (
 <section id={tipo} style={{
      background: '#fff', borderRadius: 18,
      border: '1px solid #ECECEF',
      overflow: 'hidden',
      scrollMarginTop: 16,
    }}>
      {/* Header del apartado · badge con letra inicial en lugar de emoji */}
 <header style={{
        background: meta.bg,
        padding: '18px 24px',
        display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${meta.color}20`,
      }}>
 <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: meta.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: meta.letter === '"' || meta.letter === '!' || meta.letter === '€' ? 22 : 18,
          lineHeight: 1, flexShrink: 0,
        }}>{meta.letter}</div>
 <div style={{ flex: 1 }}>
 <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700,
            letterSpacing: '-0.018em', margin: 0, color: meta.color,
          }}>{apartado.titulo || meta.label}</h2>
          {apartado.resumen && (
 <p style={{ fontSize: 12.5, color: '#525258', margin: '3px 0 0', lineHeight: 1.45 }}>
              {apartado.resumen}
 </p>
          )}
 </div>
 <span style={{
          padding: '4px 10px', borderRadius: 999,
          background: '#fff', color: meta.color, fontWeight: 700,
          fontSize: 12, border: `1px solid ${meta.color}40`,
        }}>{apartado.items.length}</span>
 </header>

      {/* Body · render distinto según el tipo */}
 <div style={{ padding: '18px 24px' }}>
        {tipo === 'redes' ? (
 <RedesGrid items={apartado.items}/>
        ) : tipo === 'evidencia' ? (
 <PatrimonioGrid items={apartado.items}/>
        ) : tipo === 'identidad' || tipo === 'trayectoria' ? (
 <ProsaSimple items={apartado.items} partidoColor={partidoColor}/>
        ) : (
 <ItemsList items={apartado.items} color={meta.color}/>
        )}
 </div>
 </section>
  )
}

// ── REDES · grid con avatares + barra valoración + click si hay dossier ───
function RedesGrid({ items }: { items: Item[] }) {
  // Ordenar por nota descendente
  const sorted = [...items].sort((a, b) => {
    const na = extractNota(a.contenido) ?? 0
    const nb = extractNota(b.contenido) ?? 0
    return nb - na
  })
  return (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
      {sorted.map(item => {
        const nota = extractNota(item.contenido) ?? 0
        const color = notaColor(nota)
        const label = notaLabel(nota)
        const expl = item.contenido.split('—').slice(1).join('—').trim() || item.contenido.replace(/\*\*.*?\*\*\s*\([^)]+\)\s*/, '')
        const initial = (item.titulo || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
        const otroDossier = item.titulo ? findDossier(item.titulo) : null
        return (
 <RelacionCard
            key={item.id}
            color={color}
            initial={initial}
            titulo={item.titulo || '—'}
            nota={nota}
            label={label}
            explicacion={expl}
            href={otroDossier ? `/dosieres/${otroDossier.slug}` : null}
          />
        )
      })}
 </div>
  )
}

// Tarjeta de relación · Link si la persona tiene dossier, div si no
function RelacionCard({ color, initial, titulo, nota, label, explicacion, href }: {
  color: string; initial: string; titulo: string; nota: number; label: string; explicacion: string; href: string | null
}) {
  const inner = (
 <>
 <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: `${color}20`, color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
      }}>{initial}</div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
 <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {titulo}
            {href && (
 <span style={{ marginLeft: 6, fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: `${color}18`, color, fontWeight: 800, letterSpacing: '0.04em', verticalAlign: 'middle' }}>FICHA</span>
            )}
 </span>
 <span style={{
            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color,
            flexShrink: 0,
          }}>{nota >= 0 ? '+' : ''}{nota}</span>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {/* Barra de valoración · escala -10 a +10 */}
 <div style={{ flex: 1, height: 4, background: '#ECECEF', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
 <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#6e6e73', opacity: 0.4 }}/>
 <div style={{
              position: 'absolute',
              left: nota >= 0 ? '50%' : `${50 + (nota / 10) * 50}%`,
              width: `${Math.abs(nota) * 5}%`,
              height: '100%', background: color, borderRadius: 2,
            }}/>
 </div>
 <span style={{ fontSize: 9.5, color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
 </div>
        {explicacion && explicacion.length > 5 && (
 <p style={{ fontSize: 11.5, color: '#6e6e73', margin: '6px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
            {explicacion}
 </p>
        )}
 </div>
 </>
  )

  const baseStyle: React.CSSProperties = {
    display: 'flex', gap: 10, padding: '12px 14px',
    background: '#FAFAFB', borderRadius: 12,
    border: '1px solid #ECECEF',
    transition: 'transform 150ms, border-color 150ms, box-shadow 150ms',
    textDecoration: 'none', color: 'inherit',
    cursor: href ? 'pointer' : 'default',
  }

  const onEnter = (el: HTMLElement) => {
    el.style.borderColor = color + '60'
    el.style.transform = 'translateY(-1px)'
    if (href) el.style.boxShadow = `0 4px 12px ${color}30`
  }
  const onLeave = (el: HTMLElement) => {
    el.style.borderColor = '#ECECEF'
    el.style.transform = 'translateY(0)'
    el.style.boxShadow = 'none'
  }

  return href ? (
 <Link href={href} style={baseStyle}
      onMouseEnter={e => onEnter(e.currentTarget)}
      onMouseLeave={e => onLeave(e.currentTarget)}>
      {inner}
 </Link>
  ) : (
 <div style={baseStyle}
      onMouseEnter={e => onEnter(e.currentTarget)}
      onMouseLeave={e => onLeave(e.currentTarget)}>
      {inner}
 </div>
  )
}

// ── PATRIMONIO · grid de números grandes ──────────────────────────────────
function PatrimonioGrid({ items }: { items: Item[] }) {
  return (
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
      {items.map(item => (
 <div key={item.id} style={{
          padding: '14px 16px',
          background: '#FAFAFB', borderRadius: 12,
          border: '1px solid #ECECEF',
        }}>
 <div style={{ fontSize: 10.5, color: '#86868b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {item.titulo || 'Concepto'}
 </div>
 <div style={{
            fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700,
            color: '#1d1d1f', letterSpacing: '-0.015em', wordBreak: 'break-word', lineHeight: 1.25,
          }}>
            {item.contenido}
 </div>
          {item.fuente_url && (
 <a href={item.fuente_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
              {item.fuente_titulo || 'Ver fuente'} ↗
 </a>
          )}
 </div>
      ))}
 </div>
  )
}

// ── PROSA SIMPLE · perfil/trayectoria como párrafo limpio ────────────────
function ProsaSimple({ items, partidoColor }: { items: Item[]; partidoColor: string }) {
  return (
 <div>
      {items.map(item => (
 <div key={item.id}>
          {item.titulo && item.titulo !== 'Perfil general' && (
 <h3 style={{ fontSize: 13.5, fontWeight: 700, color: partidoColor, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              {item.titulo}
 </h3>
          )}
 <p style={{
            fontSize: 14, color: '#3a3a3d', lineHeight: 1.7, margin: 0,
            whiteSpace: 'pre-wrap',
          }}>
            {item.contenido}
 </p>
          {item.fuente_url && (
 <a href={item.fuente_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 10, fontSize: 12, color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
              {item.fuente_titulo || 'Ver fuente'} ↗
 </a>
          )}
 </div>
      ))}
 </div>
  )
}

// ── ITEMS LIST · genérica para declaraciones/controversias/posiciones ────
function ItemsList({ items, color }: { items: Item[]; color: string }) {
  return (
 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(item => (
 <li key={item.id} style={{
          padding: '12px 16px',
          background: '#FAFAFB',
          borderRadius: 10, borderLeft: `3px solid ${color}`,
        }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {item.fecha && (
 <span style={{ fontSize: 10.5, color, fontWeight: 700, letterSpacing: '0.04em' }}>
                {new Date(item.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
 </span>
            )}
            {item.titulo && (
 <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1d1d1f', flex: 1, minWidth: 0 }}>
                {item.titulo}
 </span>
            )}
 </div>
 <p style={{ fontSize: 13, color: '#3a3a3d', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {item.contenido}
 </p>
          {item.tags && item.tags.length > 0 && (
 <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {item.tags.map(t => (
 <span key={t} style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 999,
                  background: `${color}15`, color, fontWeight: 600,
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
      ))}
 </ul>
  )
}

// ── STATES ───────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
 <div style={{ background: '#FBFBFD', minHeight: '100vh' }}>
 <AppHeader />
 <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px' }}>
 <Skeleton width={200} height={14} radius={4} style={{ marginBottom: 12 }}/>
 <Skeleton width={'100%' as unknown as number} height={210} radius={24} style={{ marginBottom: 18 }}/>
        {[0, 1, 2, 3].map(i => (
 <div key={i} style={{ marginBottom: 14 }}>
 <Skeleton width={'100%' as unknown as number} height={120} radius={18}/>
 </div>
        ))}
 </main>
 </div>
  )
}

function NotFoundState({ slug }: { slug: string }) {
  return (
 <div style={{ background: '#FBFBFD', minHeight: '100vh' }}>
 <AppHeader />
 <main style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 28px' }}>
 <EmptyState
          severity="warning"
          title="Dossier no encontrado"
          description={`No tenemos un dossier con el slug "${slug}". Puede que aún no exista o que el enlace esté caducado.`}
          primaryAction={{ label: 'Ver todos los dosieres', href: '/dosieres' }}
          secondaryAction={{ label: 'Volver al inicio', href: '/inicio' }}
        />
 </main>
 </div>
  )
}
