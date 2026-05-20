"use client";

import Link from "next/link";
import { crmRepository } from "@/lib/crm/crm-repository";
import { ActorRelationshipMap } from "@/components/crm/actor-relationship-map";

export default function CrmMapPage({ params }: { params: { workspaceId: string } }) {
  const actors = crmRepository.listActors(params.workspaceId);
  const relationships = actors.flatMap(a => a.relationships);

  return (
    <div className="flex h-full flex-col -mx-7 -my-6">
      <div className="border-b border-[#e8e8ed] bg-white px-6 py-3">
        <Link href={`/workspaces/${params.workspaceId}/crm`} className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]">
          ← CRM
        </Link>
        <h1 className="text-lg font-bold text-[#1d1d1f] mt-1">Mapa de relaciones</h1>
        <p className="text-xs text-[#6e6e73]">{actors.length} actores · {relationships.length} relaciones</p>
      </div>
      <div className="flex-1 min-h-0">
        <ActorRelationshipMap actors={actors} relationships={relationships} />
      </div>
    </div>
  );
}
