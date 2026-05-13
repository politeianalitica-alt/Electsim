"use client";

import { memo } from "react";
import type { PoliticalActor } from "@/types/crm";
import { PARTY_CONFIG, PRIORITY_CONFIG } from "@/lib/crm/crm-config";

interface ActorListProps {
  actors: PoliticalActor[];
  selectedId: string | null;
  onSelect: (actor: PoliticalActor) => void;
}

export function ActorList({ actors, selectedId, onSelect }: ActorListProps) {
  return (
    <div className="h-full overflow-auto">
      {actors.map(actor => (
        <ActorListItem
          key={actor.id}
          actor={actor}
          selected={actor.id === selectedId}
          onClick={() => onSelect(actor)}
        />
      ))}
      {actors.length === 0 && (
        <p className="p-6 text-center text-sm text-slate-400">Sin actores para esta búsqueda.</p>
      )}
    </div>
  );
}

const ActorListItem = memo(function ActorListItem({
  actor,
  selected,
  onClick,
}: {
  actor: PoliticalActor;
  selected: boolean;
  onClick: () => void;
}) {
  const partyConfig = actor.party ? PARTY_CONFIG[actor.party] : null;
  const priorityConfig = PRIORITY_CONFIG[actor.priority];

  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 border-b border-slate-800 px-4 py-3 transition-colors hover:bg-slate-900 ${
        selected ? "bg-slate-800 border-l-2 border-l-indigo-500" : ""
      }`}
    >
      <div
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-bold"
        style={{
          background: `${actor.avatarColor}30`,
          color: actor.avatarColor,
        }}
      >
        {actor.avatarInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-slate-100">{actor.displayName}</span>
          {partyConfig && (
            <span
              className="flex-none rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: `${partyConfig.color}20`, color: partyConfig.color }}
            >
              {actor.party}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-slate-400">
          {actor.role} · {actor.institution}
        </p>
      </div>
      <div
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: priorityConfig.color }}
        title={`Prioridad: ${actor.priority}`}
      />
    </div>
  );
});
