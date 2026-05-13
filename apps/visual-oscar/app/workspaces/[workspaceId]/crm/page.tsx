"use client";

import { useState } from "react";
import Link from "next/link";
import { crmRepository } from "@/lib/crm/crm-repository";
import { useActorSearch } from "@/hooks/crm/use-actor-search";
import { ActorList } from "@/components/crm/actor-list";
import { ActorDetailPanel } from "@/components/crm/actor-detail-panel";
import type { PoliticalActor } from "@/types/crm";

export default function CrmPage({ params }: { params: { workspaceId: string } }) {
  const allActors = crmRepository.listActors(params.workspaceId);
  const { results, query, setQuery } = useActorSearch(allActors);
  const [selected, setSelected] = useState<PoliticalActor | null>(null);

  return (
    <div className="flex h-full -mx-7 -my-6">
      {/* Filters sidebar */}
      <aside className="flex w-56 flex-none flex-col border-r border-slate-800 bg-slate-900 p-3">
        <div className="mb-3">
          <h1 className="text-sm font-bold text-slate-100">CRM Político</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {results.length} / {allActors.length} actores
          </p>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar actor…"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none mb-3"
        />
        <div className="space-y-1 mb-3">
          <Link
            href={`/workspaces/${params.workspaceId}/crm/matrix`}
            className="block rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors"
          >
            Matriz de posiciones
          </Link>
          <Link
            href={`/workspaces/${params.workspaceId}/crm/map`}
            className="block rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors"
          >
            Mapa de relaciones
          </Link>
        </div>
      </aside>

      {/* List */}
      <div className="flex-1 min-w-0 border-r border-slate-800 bg-slate-950">
        <ActorList
          actors={results}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </div>

      {/* Detail */}
      {selected ? (
        <ActorDetailPanel actor={selected} onClose={() => setSelected(null)} />
      ) : (
        <div className="flex w-80 flex-none items-center justify-center bg-slate-900 text-center p-6 border-l border-slate-800">
          <p className="text-xs text-slate-500">
            Selecciona un actor para ver sus posiciones, interacciones y relaciones.
          </p>
        </div>
      )}
    </div>
  );
}
