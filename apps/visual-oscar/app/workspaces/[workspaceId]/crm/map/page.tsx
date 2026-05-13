"use client";

import Link from "next/link";
import { crmRepository } from "@/lib/crm/crm-repository";
import { ActorRelationshipMap } from "@/components/crm/actor-relationship-map";

export default function CrmMapPage({ params }: { params: { workspaceId: string } }) {
  const actors = crmRepository.listActors(params.workspaceId);
  const relationships = actors.flatMap(a => a.relationships);

  return (
    <div className="flex h-full flex-col -mx-7 -my-6">
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-3">
        <Link href={`/workspaces/${params.workspaceId}/crm`} className="text-xs text-slate-500 hover:text-slate-300">
          ← CRM
        </Link>
        <h1 className="text-lg font-bold text-slate-100 mt-1">Mapa de relaciones</h1>
        <p className="text-xs text-slate-500">{actors.length} actores · {relationships.length} relaciones</p>
      </div>
      <div className="flex-1 min-h-0">
        <ActorRelationshipMap actors={actors} relationships={relationships} />
      </div>
    </div>
  );
}
