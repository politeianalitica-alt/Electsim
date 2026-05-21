"use client";

import { memo, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { PoliticalActor, ActorRelationship } from "@/types/crm";
import { PARTY_CONFIG } from "@/lib/crm/crm-config";

const CrmActorNode = memo(function CrmActorNode({
  data,
  selected,
}: NodeProps<{ actor: PoliticalActor }>) {
  const partyConfig = data.actor.party ? PARTY_CONFIG[data.actor.party] : null;
  return (
 <div
      className={`rounded-xl border px-3 py-2.5 min-w-[140px] max-w-[180px] transition-colors ${
        selected
          ? "border-indigo-500 shadow-lg shadow-indigo-500/20 bg-slate-800"
          : "border-slate-700 bg-slate-900"
      }`}
    >
 <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-slate-600 !bg-slate-700" />
 <div className="flex items-center gap-2">
 <div
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold"
          style={{ background: `${data.actor.avatarColor}30`, color: data.actor.avatarColor }}
        >
          {data.actor.avatarInitials}
 </div>
 <div className="min-w-0">
 <p className="truncate text-xs font-medium text-slate-100">{data.actor.displayName}</p>
          {partyConfig && data.actor.party && (
 <span className="text-[10px] font-bold" style={{ color: partyConfig.color }}>
              {data.actor.party}
 </span>
          )}
 </div>
 </div>
 <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-slate-600 !bg-slate-700" />
 </div>
  );
});

const nodeTypes = { crmActor: CrmActorNode };

export function ActorRelationshipMapInner({
  actors,
  relationships,
}: {
  actors: PoliticalActor[];
  relationships: ActorRelationship[];
}) {
  const nodes = useMemo(
    () =>
      actors.map((actor, idx) => ({
        id: actor.id,
        type: "crmActor" as const,
        position: {
          x: 200 + (idx % 4) * 220,
          y: 100 + Math.floor(idx / 4) * 180,
        },
        data: { actor },
      })),
    [actors]
  );

  const edges = useMemo(
    () =>
      relationships.map(rel => ({
        id: rel.id,
        source: rel.sourceActorId,
        target: rel.targetActorId,
        label: rel.type,
        style: { stroke: "#6366f1", opacity: 0.7 },
        labelStyle: { fill: "#94a3b8", fontSize: 10 },
      })),
    [relationships]
  );

  return (
 <div className="h-full w-full">
 <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
        className="bg-slate-950"
      >
 <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
 <Controls className="!border-slate-700 !bg-slate-900" />
 <MiniMap className="!border-slate-700 !bg-slate-900" maskColor="rgba(2,6,23,0.7)" />
 </ReactFlow>
 </div>
  );
}
