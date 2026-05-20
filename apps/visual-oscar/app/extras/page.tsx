'use client'
/**
 * /extras · Hub de herramientas extras del workspace
 *
 * Agrupa las 7 herramientas secundarias del analista que antes vivían
 * dispersas en el subnav del módulo Estudio:
 *   Investigation Canvas · Evidence Linker · Draft Studio ·
 *   Intelligence Notebook · Political Calendar · Watchlists · Team Collaboration
 *
 * Estética Apple-Newsroom consistente con /estudio.
 */
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

interface Tool {
  href: string
  title: string
  description: string
  glyph: string
  accent: string
  category: string
}

const TOOLS: Tool[] = [
  {
    href: '/canvas',
    title: 'Investigation Canvas',
    description: 'Lienzo libre para conectar actores, eventos y narrativas. Mapas mentales colaborativos.',
    glyph: '◆',
    accent: '#7C3AED',
    category: 'Investigación',
  },
  {
    href: '/evidence',
    title: 'Evidence Linker',
    description: 'Registra y vincula evidencias (declaraciones, documentos, datos) a hipótesis y casos.',
    glyph: '⊡',
    accent: '#1F4E8C',
    category: 'Investigación',
  },
  {
    href: '/draft-studio',
    title: 'Draft Studio',
    description: 'Asistente de escritura para notas de prensa, briefings, posts y discursos.',
    glyph: '',
    accent: '#0F766E',
    category: 'Producción',
  },
  {
    href: '/notebook',
    title: 'Intelligence Notebook',
    description: 'Cuaderno persistente con anotaciones cruzadas con datos, gráficos y citas.',
    glyph: '⊞',
    accent: '#B45309',
    category: 'Producción',
  },
  {
    href: '/calendario',
    title: 'Political Calendar',
    description: 'Agenda política unificada: Congreso, Senado, BOE, ECB, INE, comparecencias.',
    glyph: '◷',
    accent: '#DC2626',
    category: 'Operación',
  },
  {
    href: '/watchlists',
    title: 'Watchlists',
    description: 'Listas de seguimiento de actores, partidos, sectores y eventos clave.',
    glyph: '⊙',
    accent: '#F97316',
    category: 'Operación',
  },
  {
    href: '/team',
    title: 'Team Collaboration',
    description: 'Compartir con tu equipo, comentarios, roles y registro auditable de cambios.',
    glyph: '',
    accent: '#525258',
    category: 'Equipo',
  },
]

const CATEGORIES = ['Investigación', 'Producción', 'Operación', 'Equipo'] as const

export default function ExtrasPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  return (
 <div style={{ minHeight: '100vh', background: 'var(--bg)', color: '#1d1d1f', fontFamily: 'var(--font-body,system-ui)' }}>
 <AppHeader />
 <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px 80px' }}>

        {/* Hero · gradient gris oscuro neutro (no compite con el teal del Estudio) */}
 <section style={{
          background: 'linear-gradient(135deg,#1d1d1f 0%,#0a0a0a 100%)',
          borderRadius: 18, padding: '32px 40px', marginBottom: 24, color: '#fff',
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32, alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow decorativo */}
 <div style={{
            position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}/>
 <div style={{ position: 'relative' }}>
 <p style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.65,
              textTransform: 'uppercase', margin: '0 0 8px',
            }}>WORKSPACE · HERRAMIENTAS EXTRAS</p>
 <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
              letterSpacing: '-0.024em', margin: '0 0 8px', lineHeight: 1.05,
            }}>
              Tu caja de <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.65)' }}>herramientas.</em>
 </h1>
 <p style={{ fontSize: 13.5, opacity: 0.78, margin: 0, lineHeight: 1.5, maxWidth: 580 }}>
              {TOOLS.length} herramientas para investigar, producir, operar y colaborar. Todo lo que
              no es Estudio Politeia ni War Room vive aquí, organizado en cuatro categorías.
 </p>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {CATEGORIES.map((c) => {
              const count = TOOLS.filter((t) => t.category === c).length
              return (
 <div key={c} style={{
                  textAlign: 'center', padding: '14px 8px 12px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
                }}>
 <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{count}</div>
 <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.70, marginTop: 5, textTransform: 'uppercase', color: '#fff' }}>{c}</div>
 </div>
              )
            })}
 </div>
 </section>

        {/* Secciones · una por categoría con accent color */}
        {CATEGORIES.map((cat, idx) => {
          const tools = TOOLS.filter((t) => t.category === cat)
          if (tools.length === 0) return null
          const accent = tools[0].accent
          return (
 <section key={cat} style={{ marginBottom: 32 }}>
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
 <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                  color: accent, letterSpacing: '0.10em',
                  fontVariantNumeric: 'tabular-nums',
                  padding: '4px 10px', background: `${accent}12`,
                  border: `1px solid ${accent}30`, borderRadius: 999,
                  flexShrink: 0,
                }}>
                  {String(idx + 1).padStart(2, '0')}
 </span>
 <h2 style={{
                  fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700,
                  letterSpacing: '-0.018em', margin: 0, color: '#1d1d1f', flex: 1,
                }}>{cat}</h2>
 <div style={{
                  flex: 'none', width: 60, height: 1,
                  background: `linear-gradient(to right, ${accent}, transparent)`,
                  alignSelf: 'center',
                }}/>
 </div>

 <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
                gap: 12,
              }}>
                {tools.map((tool) => (
 <ExtraCard key={tool.href} tool={tool}/>
                ))}
 </div>
 </section>
          )
        })}

 </main>
 <footer style={{ borderTop: '1px solid var(--hairline)', padding: '20px 28px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 11.5 }}>
        Workspace · Herramientas extras · Politeia Analítica · {new Date().getFullYear()}
 </footer>
 </div>
  )
}

function ExtraCard({ tool }: { tool: Tool }) {
  return (
 <Link
      href={tool.href}
      className="extra-card"
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: '18px 18px 16px',
        background: '#fff',
        border: '1px solid #ECECEF',
        borderRadius: 16,
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative', overflow: 'hidden',
        transition: 'transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${tool.accent}60`
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#ECECEF'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
 <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 2, background: tool.accent, opacity: 0.7 }}/>

 <span style={{
        width: 40, height: 40,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${tool.accent}18 0%, ${tool.accent}38 100%)`,
        borderRadius: 12,
        color: tool.accent,
        fontFamily: 'var(--font-display)',
        fontSize: 18, fontWeight: 700,
        boxShadow: `0 2px 6px ${tool.accent}15`,
      }}>{tool.glyph}</span>

 <strong style={{
        fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
        color: '#1d1d1f', letterSpacing: '-0.012em', marginTop: 2,
      }}>
        {tool.title}
 </strong>
 <span style={{
        fontSize: 12.5, color: '#6e6e73', lineHeight: 1.5, flex: 1,
      }}>
        {tool.description}
 </span>

 <span style={{
        fontSize: 11, fontWeight: 700, color: tool.accent,
        letterSpacing: '0.04em', textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        marginTop: 2,
      }}>
        Abrir <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>→</span>
 </span>
 </Link>
  )
}
