'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (typeof console !== 'undefined') console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="premium-card text-center p-8 max-w-md">
        <AlertTriangle className="w-10 h-10 text-amber1 mx-auto mb-3"/>
        <h2 className="text-lg font-bold text-text1 mb-2">Error al cargar la página</h2>
        <p className="text-sm text-text2 mb-4">
          {error?.message || 'Ha ocurrido un error inesperado.'}
        </p>
        {error?.digest && (
          <p className="text-[10px] font-mono text-muted bg-bg3 rounded px-2 py-1 mb-4">
            digest: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-cyan1 text-bg rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-cyan1/90 transition"
          >
            <RefreshCw className="w-4 h-4"/> Reintentar
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-bg3 border border-border1 text-text1 rounded-md text-sm hover:border-cyan1/40 transition"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}
