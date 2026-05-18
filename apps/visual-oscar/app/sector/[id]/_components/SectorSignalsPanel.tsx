'use client';
/**
 * SectorSignalsPanel · capa de inteligencia transversal del sector.
 *
 * Muestra las señales unificadas (BOE + prensa) tageadas con dominio
 * de riesgo (regulatorio · politico · narrativo · etc.) y scoring 0-100.
 *
 * Es la materialización del bloque "inteligencia sectorial especializada"
 * descrito en el PDF Bloque 10 — equivale a `/api/intelligence/signals?dominio=X`
 * pero centrado en sectores económicos.
 *
 * Se alimenta del hook `useSectorSignals` que proxea a FastAPI.
 */
import { useSectorSignals } from '@/hooks/sectores/useSectorSignals';
import type { SectorSignal, SectorDominio } from '@/types/sector-signals';

const dominioColor: Record<SectorDominio, string> = {
  regulatorio:  'bg-blue-900/40 text-blue-300 border-blue-800/60',
  politico:     'bg-amber-900/40 text-amber-300 border-amber-800/60',
  reputacional: 'bg-rose-900/40 text-rose-300 border-rose-800/60',
  contractual:  'bg-emerald-900/40 text-emerald-300 border-emerald-800/60',
  geopolitico:  'bg-violet-900/40 text-violet-300 border-violet-800/60',
  narrativo:    'bg-cyan-900/40 text-cyan-300 border-cyan-800/60',
};

const dominioLabel: Record<SectorDominio, string> = {
  regulatorio:  'REGUL.',
  politico:     'POLÍT.',
  reputacional: 'REPUT.',
  contractual:  'CONTR.',
  geopolitico:  'GEOPOL.',
  narrativo:    'NARRAT.',
};

const scoreBar = (score: number) => {
  const w = Math.min(100, Math.max(0, score));
  const color = w >= 70 ? '#dc2626' : w >= 50 ? '#f59e0b' : w >= 30 ? '#eab308' : '#64748b';
  return (
    <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
      <div style={{ width: `${w}%`, background: color }} className="h-full" />
    </div>
  );
};

export function SectorSignalsPanel({ sectorId }: { sectorId: string }) {
  const { data, loading, error } = useSectorSignals(sectorId, { days: 14, limit: 20 });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Inteligencia transversal · señales</h2>
        {data && (
          <span className="text-xs text-slate-500">
            {data.total} señal{data.total === 1 ? '' : 'es'} · últimos {data.days}d
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-400">Error: {error.message}</p>
      )}

      {!loading && !error && (!data || data.signals.length === 0) && (
        <p className="text-sm text-slate-500">
          Sin señales en los últimos {data?.days ?? 14} días.
        </p>
      )}

      {!loading && data && data.signals.length > 0 && (
        <ul className="space-y-2">
          {data.signals.map((s: SectorSignal) => (
            <li
              key={s.id}
              className="flex items-start gap-3 p-3 bg-slate-950/40 border border-slate-800/80
                         rounded-lg hover:border-slate-700 transition-colors"
            >
              <span
                className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded
                            border ${dominioColor[s.dominio]} shrink-0 mt-0.5`}
                title={s.dominio}
              >
                {dominioLabel[s.dominio]}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium line-clamp-2 leading-snug">
                  {s.fuente_url ? (
                    <a
                      href={s.fuente_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-300 underline-offset-2 hover:underline"
                    >
                      {s.titulo}
                    </a>
                  ) : (
                    s.titulo
                  )}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="uppercase tracking-wider">{s.fuente_nombre}</span>
                  <span>·</span>
                  <span>{new Date(s.snapshot_at).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'short',
                  })}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs font-mono text-slate-300">{s.score}</span>
                {scoreBar(s.score)}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] text-slate-600">
        Fuentes: BOE (regulatorio) · Google News + medios (narrativo) ·
        Politeia Economy Core (señales económicas).
      </p>
    </div>
  );
}
