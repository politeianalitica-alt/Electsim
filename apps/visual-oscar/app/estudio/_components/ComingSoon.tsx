interface Props {
  title:    string
  subtitle: string
  /**
   * Sprint Quality-Q-A.4 · `sprint` queda opcional y, si se pasa, ya no se
   * muestra al usuario · se conserva solo por compat retrograda con páginas
   * que aún lo pasan (warehouse/charts/jobs). El render lo ignora.
   * Era un leak de jerga interna ("En desarrollo · Sprint 6+") a la UI.
   */
  sprint?:  string
}

export default function ComingSoon({ title, subtitle }: Props) {
  return (
 <main style={{ padding: '2rem 2.5rem', maxWidth: 1100, margin: '0 auto' }}>
 <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
        {title}
 </h1>
 <p style={{ color: 'var(--color-muted, #6b7280)', marginBottom: '2rem', fontSize: '0.95rem' }}>
        {subtitle}
 </p>
 <div style={{
        border: '1px dashed var(--color-border, #e5e7eb)',
        borderRadius: 12,
        padding: '3rem 2rem',
        textAlign: 'center',
        background: 'var(--bg-secondary, #f9fafb)',
      }}>
 <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'rgba(245,158,11,0.10)',
          color: 'var(--color-warning, #f59e0b)',
          border: '1px solid rgba(245,158,11,0.30)',
          borderRadius: 999,
          fontSize: '0.72rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 16,
        }}>
          Próximamente
 </div>
 <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '0.875rem' }}>
          Estamos puliendo esta sección. Avisaremos cuando esté lista.
 </p>
 </div>
 </main>
  )
}
