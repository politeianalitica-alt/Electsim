'use client';
import Link from 'next/link';
import { useIniciativas } from '@/hooks/legislativo/useIniciativas';

interface Props {
  iniciativasIds: string[];
  areasTematicas: string[];
}

export function SectorIniciativas({ iniciativasIds, areasTematicas }: Props) {
  const { data, isLoading } = useIniciativas({
    limit: 5,
  });

  if (isLoading) return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse h-36" />
  );

  const iniciativas = Array.isArray(data) ? data : [];
  if (!iniciativas.length) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Actividad legislativa relacionada</h2>
        <Link
          href={`/monitor-legislativo`}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Ver todas →
        </Link>
      </div>
      <div className="space-y-3">
        {iniciativas.slice(0, 5).map(ini => (
          <div key={ini.id} className="flex items-start gap-3">
            <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
              ini.estado === 'aprobada'    ? 'bg-green-900 text-green-300' :
              ini.estado === 'en_tramite' ? 'bg-blue-900 text-blue-300'  :
              ini.estado === 'rechazada'  ? 'bg-red-900 text-red-300'    :
              'bg-slate-800 text-slate-400'
            }`}>
              {ini.estado.replace(/_/g, ' ')}
            </span>
            <span className="text-sm text-slate-300 line-clamp-2">
              {ini.titulo}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
