import type { KPISectorial } from '@/types/sectores';

interface Props {
  kpis: KPISectorial[];
  loading: boolean;
}

export function KPIGrid({ kpis, loading }: Props) {
  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-slate-900 rounded-xl animate-pulse" />
      ))}
    </div>
  );
  if (!kpis.length) return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-sm text-slate-500">
      Sin indicadores disponibles para este sector
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {kpis.map(kpi => (
        <KPICard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}

function KPICard({ kpi }: { kpi: KPISectorial }) {
  const tendenciaIcon = {
    subida:    { icon: '↑', color: 'text-green-400' },
    bajada:    { icon: '↓', color: 'text-red-400' },
    estable:   { icon: '→', color: 'text-slate-400' },
    sin_datos: { icon: '—', color: 'text-slate-600' },
  }[kpi.tendencia];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="text-xs text-slate-400 truncate">{kpi.nombre_corto}</div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold font-mono text-white">
          {kpi.valor != null ? kpi.valor.toLocaleString('es-ES') : '—'}
        </span>
        <span className="text-xs text-slate-500 pb-0.5">{kpi.unidad}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${tendenciaIcon.color}`}>
          {tendenciaIcon.icon}
          {kpi.variacion_pct != null && (
            <span className="ml-1 text-xs">
              {kpi.variacion_pct > 0 ? '+' : ''}{kpi.variacion_pct.toFixed(1)}%
            </span>
          )}
        </span>
        <span className="text-xs text-slate-600">{kpi.periodo}</span>
      </div>
      {kpi.alerta && (
        <div className="text-xs text-amber-400 border-t border-slate-800 pt-2">
          {kpi.alerta}
        </div>
      )}
    </div>
  );
}
