"use client";

import { useState } from "react";
import type { PoliticalActor } from "@/types/crm";
import { PARTY_CONFIG, ACTOR_TYPE_CONFIG, STANCE_CONFIG, INTERACTION_TYPE_CONFIG, RELATIONSHIP_TYPE_CONFIG } from "@/lib/crm/crm-config";

type Tab = "overview" | "positions" | "interactions" | "relationships";

export function ActorDetailPanel({
  actor,
  onClose,
}: {
  actor: PoliticalActor;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const partyConfig = actor.party ? PARTY_CONFIG[actor.party] : null;
  const typeConfig = ACTOR_TYPE_CONFIG[actor.type];

  return (
 <div className="flex h-full w-80 flex-none flex-col border-l border-slate-800 bg-slate-900">
 <div className="border-b border-slate-800 p-4">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold"
              style={{ background: `${actor.avatarColor}25`, color: actor.avatarColor }}
            >
              {actor.avatarInitials}
 </div>
 <div>
 <h3 className="font-semibold text-slate-100">{actor.displayName}</h3>
 <p className="text-xs text-slate-400">{actor.role}</p>
 <p className="text-xs text-slate-500">{actor.institution}</p>
 </div>
 </div>
 <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">
            Cerrar
 </button>
 </div>

 <div className="mt-3 flex flex-wrap gap-1.5">
 <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            [{typeConfig.mark}] {typeConfig.label}
 </span>
          {partyConfig && actor.party && (
 <span
              className="rounded px-2 py-0.5 text-xs font-bold"
              style={{ background: `${partyConfig.color}20`, color: partyConfig.color }}
            >
              {actor.party}
 </span>
          )}
 </div>

        {actor.influenceScore && (
 <div className="mt-3">
 <div className="flex items-center justify-between text-xs mb-1">
 <span className="text-slate-500">Influencia global</span>
 <span className="font-semibold text-slate-200">
                {Math.round(actor.influenceScore.overall * 10)}/10
 </span>
 </div>
 <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
 <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${actor.influenceScore.overall * 100}%` }}
              />
 </div>
 </div>
        )}
 </div>

 <div className="flex border-b border-slate-800">
        {(["overview", "positions", "interactions", "relationships"] as Tab[]).map(t => (
 <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-indigo-500 text-indigo-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t === "overview" ? "Resumen" : t === "positions" ? "Posiciones" : t === "interactions" ? "Historial" : "Relaciones"}
 </button>
        ))}
 </div>

 <div className="flex-1 overflow-y-auto p-3">
        {tab === "overview" && (
 <p className="text-xs text-slate-400 leading-relaxed">
            {actor.bio ?? "Sin biografía registrada."}
 </p>
        )}

        {tab === "positions" && (
 <div className="space-y-2">
            {actor.positions.map(pos => {
              const stance = STANCE_CONFIG[pos.stance];
              return (
 <div key={pos.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
 <div className="flex items-start justify-between gap-2">
 <p className="text-xs font-medium text-slate-200 flex-1">{pos.issueTitle}</p>
 <span
                      className="flex-none rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: `${stance.color}20`, color: stance.color }}
                    >
                      {stance.short} {stance.label}
 </span>
 </div>
                  {pos.evidence && (
 <p className="mt-1 text-[10px] text-slate-500 leading-snug">{pos.evidence}</p>
                  )}
 </div>
              );
            })}
            {actor.positions.length === 0 && (
 <p className="text-xs text-slate-500">Sin posiciones registradas.</p>
            )}
 </div>
        )}

        {tab === "interactions" && (
 <div className="space-y-2">
            {actor.interactions.map(int => (
 <div key={int.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
 <div className="flex items-center justify-between mb-1">
 <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                    {INTERACTION_TYPE_CONFIG[int.type].label}
 </span>
 <span className="text-[10px] text-slate-500">
                    {new Date(int.date).toLocaleDateString("es-ES")}
 </span>
 </div>
 <p className="text-xs text-slate-200">{int.title}</p>
                {int.notes && <p className="mt-1 text-[10px] text-slate-500">{int.notes}</p>}
 </div>
            ))}
            {actor.interactions.length === 0 && (
 <p className="text-xs text-slate-500">Sin interacciones registradas.</p>
            )}
 </div>
        )}

        {tab === "relationships" && (
 <div className="space-y-2">
            {actor.relationships.map(rel => {
              const cfg = RELATIONSHIP_TYPE_CONFIG[rel.type];
              return (
 <div key={rel.id} className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
 <div className="flex items-center justify-between mb-1">
 <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
                      {cfg.label}
 </span>
 <span className="text-[10px] text-slate-500">
                      Fuerza {(rel.strength * 100).toFixed(0)}%
 </span>
 </div>
 <p className="text-xs text-slate-200">→ {rel.targetActorId}</p>
 </div>
              );
            })}
            {actor.relationships.length === 0 && (
 <p className="text-xs text-slate-500">Sin relaciones registradas.</p>
            )}
 </div>
        )}
 </div>

      {/* Actions */}
 <div className="border-t border-slate-800 p-3 space-y-1.5">
 <button className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors">
          Registrar interacción
 </button>
 <button className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors">
          Añadir al Canvas
 </button>
 <button className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors">
          Preguntar al agente
 </button>
 </div>
 </div>
  );
}
