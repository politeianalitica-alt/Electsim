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
  cards:       StudioCard[]
}

const GROUPS: StudioGroup[] = [
  {
    label: 'Tus fuentes de inteligencia',
    intro: 'Trae a tu Estudio los datos que de verdad usas: prensa, BOE, encuestas, redes, hojas de cálculo, bases de datos o APIs. Sin escribir una línea de código.',
    cards: [
      { href: '/estudio/fuentes',  title: 'Fuentes',           description: 'Conecta prensa, BOE, encuestas, redes, hojas Excel y APIs en pocos clics.', glyph: '⇡', status: 'ready' },
      { href: '/estudio/pipeline', title: 'Limpieza y cruces', description: 'Limpia, cruza y enriquece tus fuentes paso a paso con un editor visual.',  glyph: '⟶', status: 'ready' },
      { href: '/estudio/dataset',  title: 'Mis tablas',        description: 'Todos tus datos listos para explorar, filtrar y usar en paneles.',          glyph: '⊞', status: 'ready' },
    ],
  },
  {
    label: 'Tu análisis',
    intro: 'Construye tus propios paneles arrastrando y soltando, o simplemente pregúntale a tus datos en lenguaje natural y deja que la IA prepare la respuesta.',
    cards: [
      { href: '/estudio/dashboard', title: 'Mis paneles',          description: 'Crea tus propios paneles arrastrando widgets — sin saber programar.',  glyph: '⊟', status: 'ready' },
      { href: '/estudio/query',     title: 'Pregúntale a los datos',description: 'Escribe lo que quieras saber y obtén tablas y gráficos al instante.', glyph: '✦', status: 'ready' },
      { href: '/estudio/charts',    title: 'Galería de gráficos',  description: 'Plantillas reutilizables que puedes incrustar en cualquier panel.',     glyph: '▋', status: 'wip' },
    ],
  },
  {
    label: 'Tu vigilancia',
    intro: 'Deja que el sistema te avise cuando algo cambie: un dato que supera un umbral, una caída repentina, una anomalía que merece atención.',
    cards: [
      { href: '/estudio/alertas',        title: 'Vigilantes',       description: 'Avísame cuando un dato suba, baje o se comporte de forma anómala.',   glyph: '!', status: 'ready' },
      { href: '/estudio/notificaciones', title: 'Mis avisos',       description: 'Todos los eventos importantes de tus análisis, en un solo sitio.',    glyph: '◐', status: 'ready' },
      { href: '/estudio/health',         title: 'Estado del sistema',description: 'Comprueba de un vistazo que todo está funcionando bien.',            glyph: '◉', status: 'ready' },
    ],
  },
  {
    label: 'Tu equipo',
    intro: 'Comparte lo que construyes, controla quién accede a qué y mantén un registro auditable de cada cambio.',
    cards: [
      { href: '/estudio/gobernanza', title: 'Equipo y permisos', description: 'Comparte paneles, gestiona roles y revisa quién ha visto qué.', glyph: '✓', status: 'ready' },
      { href: '/estudio/warehouse',  title: 'Almacén',           description: 'Donde viven tus datos, organizados y disponibles a largo plazo.', glyph: '◫', status: 'wip' },
      { href: '/estudio/jobs',       title: 'Histórico de tareas', description: 'Mira el estado, reintentos y registros de cada sincronización.', glyph: '⚙', status: 'wip' },
    ],
  },
]

export default function EstudioHomePage() {
  return (
    <main style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          Workspace · Estudio del Analista
        </span>
        <h1 style={{ fontSize: '1.95rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 8px' }}>
          Tu Estudio
        </h1>
        <p style={{ color: 'var(--color-muted,#6b7280)', fontSize: '0.98rem', margin: 0, maxWidth: 760, lineHeight: 1.55 }}>
          Un espacio personal donde tú decides qué datos quieres seguir, construyes tus propios
          paneles, y la inteligencia artificial te ayuda a sacar conclusiones. No necesitas saber
          programar — todo se hace arrastrando, haciendo clic o preguntando en lenguaje normal.
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <Link
            href="/estudio/fuentes?new=1"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--color-accent,#3b82f6)', color: '#fff',
              padding: '8px 14px', borderRadius: 8, fontSize: '.85rem', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>+</span> Conectar una nueva fuente
          </Link>
          <Link
            href="/estudio/dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-secondary,#f3f4f6)', color: 'var(--color-text,#111827)',
              padding: '8px 14px', borderRadius: 8, fontSize: '.85rem', fontWeight: 600,
              textDecoration: 'none', border: '1px solid var(--color-border,#e5e7eb)',
            }}
          >
            Ver mis paneles
          </Link>
          <span style={{ color: 'var(--color-muted,#9ca3af)', fontSize: '.78rem' }}>
            Atajo: pulsa <kbd style={{ padding: '1px 6px', background: 'var(--bg-secondary,#f3f4f6)', border: '1px solid var(--color-border,#e5e7eb)', borderRadius: 4, fontSize: '.7rem' }}>⌘K</kbd> en cualquier página para buscar.
          </span>
        </div>
      </header>

      {GROUPS.map(group => (
        <section key={group.label} style={{ marginBottom: '2.25rem' }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 4px' }}>
              {group.label}
            </h2>
            <p style={{ color: 'var(--color-muted,#6b7280)', fontSize: '.85rem', margin: 0, maxWidth: 760, lineHeight: 1.5 }}>
              {group.intro}
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '0.9rem',
          }}>
            {group.cards.map(card => (
              <Link
                key={card.href}
                href={card.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: '1.05rem 1.2rem',
                  background: 'var(--bg-primary,#ffffff)',
                  border: '1px solid var(--color-border,#e5e7eb)',
                  borderRadius: 14,
                  textDecoration: 'none',
                  color: 'inherit',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'box-shadow 0.2s, transform 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '1.15rem',
                    width: 34,
                    height: 34,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-secondary,#f9fafb)',
                    borderRadius: 10,
                    color: 'var(--color-accent,#3b82f6)',
                    fontWeight: 700,
                  }}>
                    {card.glyph}
                  </span>
                  {card.status === 'wip' && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      background: 'rgba(245,158,11,0.10)',
                      color: 'var(--color-warning,#f59e0b)',
                      border: '1px solid rgba(245,158,11,0.30)',
                      padding: '2px 7px',
                      borderRadius: 999,
                    }}>
                      Próximamente
                    </span>
                  )}
                </div>
                <strong style={{ fontSize: '0.98rem', color: 'var(--color-text,#111827)', letterSpacing: '-0.01em' }}>
                  {card.title}
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-muted,#6b7280)', lineHeight: 1.45 }}>
                  {card.description}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
