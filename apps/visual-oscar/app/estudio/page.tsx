'use client'
/**
 * /estudio · Estudio del Analista
 *
 * Home del workspace del analista. Mantiene íntegras las 4 secciones,
 * 12 cards, hrefs, glyphs, descripciones y la lógica de status. Solo
 * se rehace la capa visual con la estética Apple-Newsroom:
 *
 *   - Hero gradient teal (matching el banner del nav)
 *   - KPI strip con 4 indicadores agregados (mocks)
 *   - Cada sección recibe un accent color propio + numeración 01-04
 *   - Cards con icono grande gradient + hover lift + transición
 *   - Badge 'Próximamente' rediseñado, más legible
 */
import Link from 'next/link'

type CardStatus = 'ready' | 'wip'
interface StudioCard {
  href:        string
  title:       string
  description: string
  glyph:       string
  status:      CardStatus
}
interface StudioGroup {
  label:       string
  intro:       string
  accent:      string  // color base para la sección (cards icon bg, header rule)
  cards:       StudioCard[]
}

const GROUPS: StudioGroup[] = [
  {
    label: 'Tus fuentes de inteligencia',
    intro: 'Trae a tu Estudio los datos que de verdad usas: prensa, BOE, encuestas, redes, hojas de cálculo, bases de datos o APIs. Sin escribir una línea de código.',
    accent: '#0F766E',
    cards: [
      { href: '/estudio/fuentes',  title: 'Fuentes',           description: 'Conecta prensa, BOE, encuestas, redes, hojas Excel y APIs en pocos clics.', glyph: '⇡', status: 'ready' },
      { href: '/estudio/pipeline', title: 'Limpieza y cruces', description: 'Limpia, cruza y enriquece tus fuentes paso a paso con un editor visual.',  glyph: '⟶', status: 'ready' },
      { href: '/estudio/dataset',  title: 'Mis tablas',        description: 'Todos tus datos listos para explorar, filtrar y usar en paneles.',          glyph: '', status: 'ready' },
    ],
  },
  {
    label: 'Tu análisis',
    intro: 'Construye tus propios paneles arrastrando y soltando, o simplemente pregúntale a tus datos en lenguaje natural y deja que la IA prepare la respuesta.',
    accent: '#7C3AED',
    cards: [
      { href: '/estudio/dashboard', title: 'Mis paneles',          description: 'Crea tus propios paneles arrastrando widgets — sin saber programar.',  glyph: '⊟', status: 'ready' },
      { href: '/estudio/query',     title: 'Pregúntale a los datos',description: 'Escribe lo que quieras saber y obtén tablas y gráficos al instante.', glyph: '', status: 'ready' },
      { href: '/estudio/charts',    title: 'Galería de gráficos',  description: 'Plantillas reutilizables que puedes incrustar en cualquier panel.',     glyph: '▋', status: 'wip' },
    ],
  },
  {
    label: 'Tu vigilancia',
    intro: 'Deja que el sistema te avise cuando algo cambie: un dato que supera un umbral, una caída repentina, una anomalía que merece atención.',
    accent: '#F97316',
    cards: [
      { href: '/estudio/alertas',        title: 'Vigilantes',       description: 'Avísame cuando un dato suba, baje o se comporte de forma anómala.',   glyph: '!', status: 'ready' },
      { href: '/estudio/notificaciones', title: 'Mis avisos',       description: 'Todos los eventos importantes de tus análisis, en un solo sitio.',    glyph: '◐', status: 'ready' },
      { href: '/estudio/health',         title: 'Estado del sistema',description: 'Comprueba de un vistazo que todo está funcionando bien.',            glyph: '', status: 'ready' },
    ],
  },
  {
    label: 'Tu equipo',
    intro: 'Comparte lo que construyes, controla quién accede a qué y mantén un registro auditable de cada cambio.',
    accent: '#1F4E8C',
    cards: [
      { href: '/estudio/gobernanza', title: 'Equipo y permisos',  description: 'Comparte paneles, gestiona roles y revisa quién ha visto qué.',     glyph: '', status: 'ready' },
      { href: '/estudio/warehouse',  title: 'Almacén',            description: 'Donde viven tus datos, organizados y disponibles a largo plazo.',    glyph: '◫', status: 'wip' },
      { href: '/estudio/jobs',       title: 'Histórico de tareas',description: 'Mira el estado, reintentos y registros de cada sincronización.',     glyph: '', status: 'wip' },
    ],
  },
]

// KPIs agregados — datos demo coherentes con las secciones
const KPIS = [
  { label: 'Fuentes conectadas', value: 14, sub: '+3 este mes',     accent: '#0F766E' },
  { label: 'Paneles creados',    value: 8,  sub: '5 compartidos',   accent: '#7C3AED' },
  { label: 'Vigilantes activos', value: 11, sub: '23 avisos · 7d',  accent: '#F97316' },
  { label: 'Colaboradores',      value: 6,  sub: '3 admin · 3 lect.', accent: '#1F4E8C' },
]

export default function EstudioHomePage() {
  return (
 <main style={{ padding: '24px 28px 56px', maxWidth: 1500, margin: '0 auto', fontFamily: 'var(--font-body,system-ui)' }}>

      {/* ── Hero gradient teal · estética Apple-Newsroom ──────────────── */}
 <section style={{
        background: 'linear-gradient(135deg,#0F766E 0%,#042F2E 100%)',
        borderRadius: 18, padding: '32px 40px', marginBottom: 18, color: '#fff',
        display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32, alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow decorativo */}
 <div style={{
          position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(94,234,212,0.40) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}/>
 <div style={{ position: 'relative' }}>
 <p style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', opacity: 0.75,
            textTransform: 'uppercase', margin: '0 0 8px',
          }}>ESTUDIO POLITEIA · WORKSPACE DEL ANALISTA</p>
 <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700,
            letterSpacing: '-0.026em', margin: '0 0 8px', lineHeight: 1.05,
          }}>
            Estudio <em style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(255,255,255,0.78)' }}>Politeia.</em>
 </h1>
 <p style={{ fontSize: 13.5, opacity: 0.82, margin: 0, lineHeight: 1.55, maxWidth: 620 }}>
            Decide qué datos quieres seguir, construye tus propios paneles y deja que la IA te
            ayude a sacar conclusiones. Todo se hace arrastrando, haciendo clic o preguntando
            en lenguaje natural — sin escribir una línea de código.
 </p>
 <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
 <Link href="/estudio/fuentes?new=1" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fff', color: '#0F766E',
              padding: '9px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              letterSpacing: '-0.005em',
            }}>
 <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              Conectar una nueva fuente
 </Link>
 <Link href="/estudio/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.16)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.28)',
              padding: '9px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              textDecoration: 'none', letterSpacing: '-0.005em',
            }}>Ver mis paneles</Link>
 <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, marginLeft: 4 }}>
              Atajo: <kbd style={{
                padding: '2px 7px', background: 'rgba(255,255,255,0.16)',
                border: '1px solid rgba(255,255,255,0.25)', borderRadius: 4,
                fontSize: 10.5, fontFamily: 'ui-monospace,monospace', color: '#fff',
              }}>⌘K</kbd> para buscar.
 </span>
 </div>
 </div>

        {/* Mini KPIs translucidos dentro del hero */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, position: 'relative' }}>
          {KPIS.slice(0, 4).map((k) => (
 <div key={k.label} style={{
              padding: '12px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
            }}>
 <div style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em',
                opacity: 0.75, textTransform: 'uppercase', marginBottom: 6,
              }}>{k.label}</div>
 <div style={{
                fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums',
              }}>{k.value}</div>
 <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 4 }}>{k.sub}</div>
 </div>
          ))}
 </div>
 </section>

      {/* ── KPI strip externo · acento del color de cada sección ──────── */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {KPIS.map((k) => (
 <div key={k.label} style={{
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 16,
            padding: '14px 16px 12px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
 <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 3, background: k.accent }}/>
 <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
              color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6,
            }}>{k.label}</div>
 <div style={{
              fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
              letterSpacing: '-0.022em', lineHeight: 1, color: k.accent,
              fontVariantNumeric: 'tabular-nums',
            }}>{k.value}</div>
 <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 5 }}>{k.sub}</div>
 </div>
        ))}
 </div>

      {/* ── Secciones · numeradas + accent color por sección ──────────── */}
      {GROUPS.map((group, idx) => (
 <section key={group.label} style={{ marginBottom: 36 }}>
          {/* Header de sección con número grande y línea decorativa */}
 <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
 <span style={{
              fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
              color: group.accent, letterSpacing: '0.10em',
              fontVariantNumeric: 'tabular-nums',
              padding: '4px 10px', background: `${group.accent}12`,
              border: `1px solid ${group.accent}30`, borderRadius: 999,
              flexShrink: 0,
            }}>
              {String(idx + 1).padStart(2, '0')}
 </span>
 <div style={{ flex: 1, minWidth: 0 }}>
 <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700,
                letterSpacing: '-0.018em', margin: '0 0 4px', color: '#1d1d1f',
              }}>{group.label}</h2>
 <p style={{
                color: '#515154', fontSize: 13, margin: 0, maxWidth: 780, lineHeight: 1.55,
              }}>{group.intro}</p>
 </div>
 <div style={{
              flex: 'none', width: 60, height: 1,
              background: `linear-gradient(to right, ${group.accent}, transparent)`,
              alignSelf: 'center',
            }}/>
 </div>

          {/* Grid de cards · hover lift + glyph con gradient del accent */}
 <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}>
            {group.cards.map((card) => (
 <StudioCardLink key={card.href} card={card} accent={group.accent}/>
            ))}
 </div>
 </section>
      ))}

 <style>{`
        .studio-card { transition: transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out; }
        .studio-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
 `}</style>
 </main>
  )
}

// ─── Card individual con hover lift + glyph gradient ────────────────────
function StudioCardLink({ card, accent }: { card: StudioCard; accent: string }) {
  const isReady = card.status === 'ready'
  return (
 <Link
      href={card.href}
      className="studio-card"
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
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}60` }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ECECEF' }}
    >
      {/* Línea lateral accent (sutil) */}
 <span style={{ position: 'absolute', inset: '0 auto 0 0', width: 2, background: accent, opacity: 0.7 }}/>

 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Glyph grande con gradient del accent */}
 <span style={{
          width: 40, height: 40,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${accent}18 0%, ${accent}38 100%)`,
          borderRadius: 12,
          color: accent,
          fontFamily: 'var(--font-display)',
          fontSize: 18, fontWeight: 700,
          boxShadow: `0 2px 6px ${accent}15`,
        }}>{card.glyph}</span>

        {card.status === 'wip' && (
 <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'rgba(245,158,11,0.10)',
            color: '#B45309',
            border: '1px solid rgba(245,158,11,0.35)',
            padding: '2px 8px', borderRadius: 999,
          }}>Próximamente</span>
        )}
 </div>

 <strong style={{
        fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600,
        color: '#1d1d1f', letterSpacing: '-0.012em', marginTop: 2,
      }}>
        {card.title}
 </strong>
 <span style={{
        fontSize: 12.5, color: '#6e6e73', lineHeight: 1.5, flex: 1,
      }}>
        {card.description}
 </span>

      {/* Arrow CTA — aparece en hover, mantiene legibilidad si visible */}
      {isReady && (
 <span style={{
          fontSize: 11, fontWeight: 700, color: accent,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          marginTop: 2,
        }}>
          Abrir <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>→</span>
 </span>
      )}
 </Link>
  )
}
