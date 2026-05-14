import Link from 'next/link'

interface ModuleCard {
  href:        string
  title:       string
  description: string
  glyph:       string
  status:      'ready' | 'wip'
}

const MODULES: ModuleCard[] = [
  // Datos
  { href: '/domo/fuentes',         title: 'Fuentes de Datos',  description: 'Conecta bases, APIs, ficheros y feeds en streaming',           glyph: '⇡', status: 'ready' },
  { href: '/domo/pipeline',        title: 'Pipelines ETL',     description: 'Editor visual para transformar y enrutar datos',               glyph: '⟶', status: 'ready' },
  { href: '/domo/dataset',         title: 'Datasets',          description: 'Catálogo de datos con SQL Editor y Schema Inspector',          glyph: '⊞', status: 'ready' },

  // Análisis
  { href: '/domo/dashboard',       title: 'Dashboards',        description: 'Constructor visual de paneles tipo Domo (drag & drop)',        glyph: '⊟', status: 'ready' },
  { href: '/domo/query',           title: 'AI Query',          description: 'Pregunta en lenguaje natural, recibe SQL + visualización',     glyph: '✦', status: 'ready' },

  // Operación
  { href: '/domo/alertas',         title: 'Alertas',           description: 'Monitoriza umbrales, anomalías y cambios porcentuales',        glyph: '!', status: 'ready' },
  { href: '/domo/notificaciones',  title: 'Notificaciones',    description: 'Centro unificado de eventos y mensajes del sistema',           glyph: '◐', status: 'ready' },
  { href: '/domo/health',          title: 'System Health',     description: 'Estado de servicios, latencias y uptime en tiempo real',       glyph: '◉', status: 'ready' },

  // Admin
  { href: '/domo/gobernanza',      title: 'Gobernanza',        description: 'Miembros, roles, auditoría completa y gestión de API Keys',    glyph: '✓', status: 'ready' },

  // Coming
  { href: '/domo/warehouse',       title: 'Warehouse',         description: 'Capa unificada de almacenamiento (PG / Parquet / Object Store)', glyph: '◫', status: 'wip' },
  { href: '/domo/charts',          title: 'Biblioteca Charts', description: 'Charts reutilizables embebibles en cualquier dashboard',       glyph: '▋', status: 'wip' },
  { href: '/domo/jobs',            title: 'Monitor de Jobs',   description: 'Estado, reintentos y logs de syncs / pipelines / exports',     glyph: '⚙', status: 'wip' },
]

export default function DomoHomePage() {
  return (
    <main style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          Plataforma · Business Intelligence
        </span>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 6px' }}>
          Centro de Datos
        </h1>
        <p style={{ color: 'var(--color-muted,#6b7280)', fontSize: '0.95rem', margin: 0, maxWidth: 720 }}>
          Toda la inteligencia de negocio de Politeia desde un único punto: conecta fuentes,
          construye pipelines, gobierna los datos, publica dashboards y dispara alertas inteligentes.
        </p>
        <p style={{ color: 'var(--color-muted,#9ca3af)', fontSize: '.8rem', margin: '12px 0 0' }}>
          Atajo: pulsa <kbd style={{ padding: '1px 6px', background: 'var(--bg-secondary,#f3f4f6)', border: '1px solid var(--color-border,#e5e7eb)', borderRadius: 4, fontSize: '.7rem' }}>⌘K</kbd> en cualquier página para buscar globalmente.
        </p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1rem',
      }}>
        {MODULES.map(m => (
          <Link
            key={m.href}
            href={m.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '1.1rem 1.25rem',
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
                fontSize: '1.25rem',
                width: 36,
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-secondary,#f9fafb)',
                borderRadius: 10,
                color: 'var(--color-accent,#3b82f6)',
                fontWeight: 700,
              }}>
                {m.glyph}
              </span>
              {m.status === 'wip' && (
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
                  En progreso
                </span>
              )}
            </div>
            <strong style={{ fontSize: '1rem', color: 'var(--color-text,#111827)', letterSpacing: '-0.01em' }}>
              {m.title}
            </strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-muted,#6b7280)', lineHeight: 1.45 }}>
              {m.description}
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
