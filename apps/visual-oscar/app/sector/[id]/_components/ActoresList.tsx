'use client';
import { useEffect, useState } from 'react';
import { sectoresApi } from '@/lib/api/sectores';
import type { ActorSectorial } from '@/types/sectores';

export function ActoresList({ sectorId }: { sectorId: string }) {
  const [actores, setActores] = useState<ActorSectorial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sectoresApi.getActores(sectorId)
      .then(r => setActores(r.actores))
      .finally(() => setLoading(false));
  }, [sectorId]);

  if (loading) return <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse h-48" />;

  return (
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
 <h2 className="text-sm font-semibold text-white mb-4">
        Actores clave ({actores.length})
 </h2>
      {!actores.length ? (
 <p className="text-sm text-slate-500">Sin actores registrados</p>
      ) : (
 <div className="space-y-3">
          {actores.map(actor => (
 <div key={actor.id} className="flex items-start gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-white truncate">{actor.nombre}</span>
 <span className="text-xs text-slate-500 capitalize flex-shrink-0">{actor.tipo}</span>
 </div>
 <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{actor.descripcion_corta}</p>
 </div>
              {actor.posicion_regulatoria && (
 <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                  actor.posicion_regulatoria === 'favorable' ? 'bg-green-900/50 text-green-400' :
                  actor.posicion_regulatoria === 'contraria' ? 'bg-red-900/50 text-red-400' :
 'bg-slate-800 text-slate-400'
                }`}>
                  {actor.posicion_regulatoria}
 </span>
              )}
 </div>
          ))}
 </div>
      )}
 </div>
  );
}
