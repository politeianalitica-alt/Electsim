'use client'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DomoError({ error, reset }: Props) {
  return (
 <div style={{ padding: '2rem', maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
 <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--color-danger, #ef4444)' }}>!</div>
 {/* Sprint Quality-Q-A.2 · §0.5 · "Estudio" en UI (antes decía "Domo") */}
 <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Algo ha fallado en el Estudio
 </h2>
 <p style={{ color: 'var(--color-muted, #6b7280)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        No hemos podido cargar esta sección. Vuelve a intentarlo o contacta con soporte si persiste.
 </p>
 <button
        onClick={reset}
        style={{
          background: 'var(--color-accent, #3b82f6)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '0.5rem 1.25rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        Reintentar
 </button>
 </div>
  )
}
