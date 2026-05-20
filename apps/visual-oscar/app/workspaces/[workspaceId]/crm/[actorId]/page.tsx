"use client";

import Link from "next/link";
import { crmRepository } from "@/lib/crm/crm-repository";
import { ActorDetailPanel } from "@/components/crm/actor-detail-panel";

export default function ActorPage({
  params,
}: {
  params: { workspaceId: string; actorId: string };
}) {
  const actor = crmRepository.getActorById(params.actorId);
  if (!actor) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-lg font-semibold text-[#1d1d1f]">Actor no encontrado</p>
        <Link
          href={`/workspaces/${params.workspaceId}/crm`}
          className="mt-2 text-sm text-indigo-400"
        >
          ← Volver al CRM
        </Link>
      </div>
    );
  }
  return (
    <div className="flex h-full -mx-7 -my-6">
      <div className="flex-1 bg-[#fbfbfd] flex items-center justify-center text-sm text-[#6e6e73] p-6">
        Vista dedicada del actor — usa el panel derecho.
      </div>
      <ActorDetailPanel
        actor={actor}
        onClose={() => {
          /* navegación a /crm gestionada por el shell */
        }}
      />
    </div>
  );
}
