import type { SectorMeta } from '@/config/sectores';

export function SectorSkeleton({ meta }: { meta: SectorMeta }) {
  return (
 <div className="min-h-screen bg-slate-950">
 <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
 <div className="border border-slate-800 rounded-2xl p-6 bg-slate-900 animate-pulse">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-3 h-3 rounded-full" style={{ background: meta.color_primario }} />
 <div className="h-6 w-48 bg-slate-800 rounded" />
 </div>
 <div className="h-4 w-80 bg-slate-800 rounded mt-2" />
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
 <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))}
 </div>
 </div>
 </div>
  );
}
