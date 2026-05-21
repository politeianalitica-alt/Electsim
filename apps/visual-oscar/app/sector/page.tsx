'use client';
import Link from 'next/link';
import { SECTORES } from '@/config/sectores';
import { useSectoresIndex } from '@/hooks/sectores/useSectoresIndex';

export default function SectoresIndexPage() {
  const { data, loading } = useSectoresIndex();

  return (
 <div className="min-h-screen bg-slate-950">
 <div className="max-w-screen-xl mx-auto px-6 py-8">
 <h1 className="text-xl font-bold text-white mb-6">Sectores monitorizados</h1>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTORES.filter(s => s.activo).map(meta => {
            const indexEntry = data?.sectores.find(s => s.id === meta.id);
            return (
 <Link
                key={meta.id}
                href={`/sector/${meta.id}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-colors group"
              >
 <div className="flex items-start justify-between mb-3">
 <div
                    className="w-2.5 h-2.5 rounded-full mt-1"
                    style={{ background: meta.color_primario }}
                  />
                  {loading ? (
 <div className="w-8 h-6 bg-slate-800 rounded animate-pulse" />
                  ) : (
 <span className="text-2xl font-bold font-mono text-white">
                      {indexEntry?.score.score_riesgo.toFixed(0) ?? '—'}
 </span>
                  )}
 </div>
 <h2 className="text-sm font-semibold text-white group-hover:text-slate-200">
                  {meta.nombre}
 </h2>
 <p className="text-xs text-slate-500 mt-1 line-clamp-2">{meta.descripcion}</p>
                {indexEntry && indexEntry.alertas_count > 0 && (
 <div className="mt-2 text-xs text-amber-400">
                    {indexEntry.alertas_count} alerta{indexEntry.alertas_count > 1 ? 's' : ''}
 </div>
                )}
 </Link>
            );
          })}
 </div>
 </div>
 </div>
  );
}
