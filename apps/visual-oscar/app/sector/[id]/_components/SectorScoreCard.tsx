import type { ScoreSectorial } from '@/types/sectores';

interface Props {
  score: ScoreSectorial;
  resumen?: string;
}

export function SectorScoreCard({ score, resumen }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4">Evaluación de riesgo sectorial</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Riesgo', value: score.score_riesgo },
          { label: 'Act. legislativa', value: score.score_actividad_legislativa },
          { label: 'Volatilidad', value: score.score_volatilidad },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-3xl font-bold font-mono text-white">{value.toFixed(0)}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>
      {resumen && (
        <p className="text-sm text-slate-400 border-t border-slate-800 pt-4 leading-relaxed">
          {resumen}
        </p>
      )}
    </div>
  );
}
