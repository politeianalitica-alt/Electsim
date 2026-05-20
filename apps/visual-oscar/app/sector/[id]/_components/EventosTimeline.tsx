'use client';
import { useEffect, useState } from 'react';
import { sectoresApi } from '@/lib/api/sectores';
import type { EventoSectorial, NivelImpacto } from '@/types/sectores';

const impactoColor: Record<NivelImpacto, string> = {
  critico: 'bg-red-500',
  alto: 'bg-amber-500',
  medio: 'bg-yellow-500',
  bajo: 'bg-slate-500',
};

export function EventosTimeline({ sectorId }: { sectorId: string }) {
  const [eventos, setEventos] = useState<EventoSectorial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sectoresApi.getEventos(sectorId)
      .then(r => setEventos(r.eventos))
      .finally(() => setLoading(false));
  }, [sectorId]);

  return (
 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
 <h2 className="text-sm font-semibold text-white mb-4">Eventos recientes</h2>
      {loading && (
 <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
 <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />
          ))}
 </div>
      )}
      {!loading && !eventos.length && (
 <p className="text-sm text-slate-500">Sin eventos registrados</p>
      )}
      {!loading && eventos.length > 0 && (
 <div className="relative space-y-4">
 <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-800" />
          {eventos.map(evento => (
 <div key={evento.id} className="flex gap-4 pl-6 relative">
 <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full flex-shrink-0 ${impactoColor[evento.impacto]} ring-2 ring-slate-900`} />
 <div className="min-w-0">
 <div className="text-xs text-slate-500 mb-0.5">
                  {new Date(evento.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
 <span className="ml-2 capitalize">{evento.tipo}</span>
 </div>
 <p className="text-sm text-white font-medium leading-snug">{evento.titulo}</p>
 <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{evento.descripcion}</p>
 </div>
 </div>
          ))}
 </div>
      )}
 </div>
  );
}
