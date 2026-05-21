import type { SectorMeta } from '@/config/sectores';
import type { ScoreSectorial } from '@/types/sectores';

interface Props {
  meta: SectorMeta;
  score: ScoreSectorial;
  alertas: string[];
}

export function SectorHeader({ meta, score, alertas }: Props) {
  const nivelColor = {
    critico: 'border-red-800 bg-red-950/30',
    alto: 'border-amber-800 bg-amber-950/30',
    medio: 'border-yellow-800 bg-yellow-950/30',
    bajo: 'border-slate-800 bg-slate-900',
  }[score.nivel];

  return (
 <div className={`border rounded-2xl p-6 ${nivelColor} transition-colors duration-500`}>
 <div className="flex items-start justify-between gap-4 flex-wrap">
 <div>
 <div className="flex items-center gap-3 mb-1">
 <div
              className="w-3 h-3 rounded-full"
              style={{ background: meta.color_primario }}
            />
 <h1 className="text-xl font-bold text-white">{meta.nombre}</h1>
 </div>
 <p className="text-sm text-slate-400 max-w-2xl">{meta.descripcion}</p>
 </div>
 <div className="flex flex-col items-end gap-1">
 <span className="text-4xl font-bold font-mono tabular-nums text-white">
            {score.score_riesgo.toFixed(0)}
 </span>
 <span className="text-xs text-slate-400 uppercase tracking-widest">
            Score Riesgo
 </span>
 </div>
 </div>
      {alertas.length > 0 && (
 <div className="mt-4 flex flex-col gap-1">
          {alertas.map((a, i) => (
 <div key={i} className="text-xs text-amber-300 flex items-center gap-2">
 <span></span>
 <span>{a}</span>
 </div>
          ))}
 </div>
      )}
 </div>
  );
}
