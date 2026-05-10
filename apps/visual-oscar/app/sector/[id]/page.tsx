'use client';
import { notFound } from 'next/navigation';
import { getSectorMeta, SECTORES } from '@/config/sectores';
import { useSector } from '@/hooks/sectores/useSector';
import { useKPIs } from '@/hooks/sectores/useKPIs';
import { SectorHeader } from './_components/SectorHeader';
import { SectorScoreCard } from './_components/SectorScoreCard';
import { KPIGrid } from './_components/KPIGrid';
import { ActoresList } from './_components/ActoresList';
import { EventosTimeline } from './_components/EventosTimeline';
import { SectorIniciativas } from './_components/SectorIniciativas';
import { SectorSkeleton } from './_components/SectorSkeleton';

export function generateStaticParams() {
  return SECTORES.filter(s => s.activo).map(s => ({ id: s.id }));
}

export default function SectorPage({ params }: { params: { id: string } }) {
  const meta = getSectorMeta(params.id);
  if (!meta) notFound();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data, loading, error } = useSector(params.id);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { kpis, loading: kpisLoading } = useKPIs(params.id);

  if (loading) return <SectorSkeleton meta={meta} />;
  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center text-slate-400">
        <p className="text-lg font-semibold mb-2">Error cargando sector</p>
        <p className="text-sm">{error.message}</p>
      </div>
    </div>
  );
  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
        <SectorHeader meta={meta} score={data.score} alertas={data.alertas} />
        <SectorScoreCard score={data.score} resumen={data.resumen_ia} />
        <KPIGrid kpis={kpisLoading ? [] : kpis} loading={kpisLoading} />
        <SectorIniciativas
          iniciativasIds={data.iniciativas_legislativas_ids}
          areasTematicas={meta.areas_tematicas}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActoresList sectorId={params.id} />
          <EventosTimeline sectorId={params.id} />
        </div>
      </div>
    </div>
  );
}
