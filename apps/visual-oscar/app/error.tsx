'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (typeof console !== 'undefined') console.error('App error:', error);
  }, [error]);

  return (
 <div style={{
      minHeight: '100vh', background: 'var(--bg, #FBFBFD)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-body, -apple-system, system-ui)',
    }}>
 <div style={{
        maxWidth: 480, width: '100%',
        background: '#fff', borderRadius: 20,
        padding: '40px 32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        border: '1px solid #ECECEF',
        textAlign: 'center',
      }}>
 <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#FEF3C7', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
 <line x1="12" y1="9" x2="12" y2="13"/>
 <line x1="12" y1="17" x2="12.01" y2="17"/>
 </svg>
 </div>
 <h1 style={{
          fontFamily: 'var(--font-display, -apple-system)', fontSize: 22, fontWeight: 600,
          color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '-0.018em',
        }}>
          Algo no ha funcionado
 </h1>
 <p style={{ color: '#6e6e73', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 6px' }}>
          La página ha encontrado un error inesperado. Inténtalo de nuevo.
 </p>
        {error?.message && (
 <p style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#9CA3AF',
            background: '#FAFAFB', padding: '8px 12px', borderRadius: 8,
            margin: '12px 0 20px', wordBreak: 'break-word',
          }}>
            {error.message}
            {error.digest && <span style={{ display: 'block', marginTop: 4 }}>digest: {error.digest}</span>}
 </p>
        )}
 <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
 <button
            onClick={reset}
            style={{
              padding: '10px 20px', borderRadius: 999,
              background: '#1d1d1f', color: '#fff',
              border: 'none', fontFamily: 'inherit', fontWeight: 500, fontSize: 13,
              cursor: 'pointer', transition: 'opacity 200ms',
            }}
          >
            Reintentar
 </button>
 <a
            href="/"
            style={{
              padding: '10px 20px', borderRadius: 999,
              background: '#F5F5F7', color: '#1d1d1f',
              textDecoration: 'none', fontFamily: 'inherit', fontWeight: 500, fontSize: 13,
              border: '1px solid #ECECEF',
            }}
          >
            Inicio
 </a>
 </div>
 </div>
 </div>
  );
}
