import Link from 'next/link';

export default function NotFound() {
  return (
 <div style={{
      minHeight: '100vh', background: 'var(--bg, #FBFBFD)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-body, -apple-system, system-ui)',
    }}>
 <div style={{
        maxWidth: 460, width: '100%',
        background: '#fff', borderRadius: 20,
        padding: '48px 36px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        border: '1px solid #ECECEF',
        textAlign: 'center',
      }}>
 <div style={{
          fontFamily: 'var(--font-display, -apple-system)', fontSize: 64, fontWeight: 700,
          color: '#1F4E8C', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 12,
        }}>
          404
 </div>
 <h1 style={{
          fontFamily: 'var(--font-display, -apple-system)', fontSize: 18, fontWeight: 600,
          color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '-0.014em',
        }}>
          Página no encontrada
 </h1>
 <p style={{ color: '#6e6e73', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 24px' }}>
          La ruta solicitada no existe en Politeia Analítica.
 </p>
 <Link
          href="/dashboard"
          style={{
            padding: '10px 20px', borderRadius: 999,
            background: '#1d1d1f', color: '#fff',
            textDecoration: 'none', fontFamily: 'inherit', fontWeight: 500, fontSize: 13,
            display: 'inline-block',
          }}
        >
          Volver al dashboard
 </Link>
 </div>
 </div>
  );
}
