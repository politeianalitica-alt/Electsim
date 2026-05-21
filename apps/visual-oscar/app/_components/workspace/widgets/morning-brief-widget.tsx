"use client";

import { useState } from "react";
import type { MorningBrief } from "@/types/workspace-agenda";
import { levelColor } from "@/lib/workspace/morning-brief-builder";

interface MorningBriefWidgetProps {
  brief: MorningBrief;
  onRegenerate?: () => void;
  onShare?: () => void;
  onCreateAgenda?: () => void;
}

export function MorningBriefWidget({ brief, onRegenerate, onShare, onCreateAgenda }: MorningBriefWidgetProps) {
  const level = levelColor(brief.level);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    onRegenerate();
    setTimeout(() => setRegenerating(false), 700);
  };

  return (
 <div className="flex h-full flex-col rounded-xl border border-[#e8e8ed] bg-white">
 <div className="flex items-center justify-between border-b border-[#e8e8ed] px-4 py-3">
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6e6e73]">
            Morning Brief
 </span>
 <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider"
            style={{ background: level.bg, color: level.fg }}
          >
            {level.label}
 </span>
 </div>
 <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-[11px] text-[#6e6e73] hover:text-[#3a3a3d] transition-colors disabled:opacity-50"
        >
          {regenerating ? "Generando..." : "Regenerar"}
 </button>
 </div>

 <div className="flex-1 overflow-auto p-4 space-y-4">
 <p className="text-sm leading-relaxed text-[#1d1d1f]">{brief.summary}</p>

        {brief.highlights.length > 0 && (
 <div>
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73]">
              Puntos de atención
 </p>
 <ul className="space-y-1.5">
              {brief.highlights.map((h, i) => (
 <li key={i} className="flex items-start gap-2 text-xs text-[#3a3a3d]">
 <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-[#aeaeb2]" />
 <span className="leading-relaxed">{h}</span>
 </li>
              ))}
 </ul>
 </div>
        )}
 </div>

 <div className="flex gap-2 border-t border-[#e8e8ed] p-3">
 <button
          onClick={onShare}
          className="flex-1 rounded-lg border border-[#e8e8ed] px-3 py-1.5 text-[11px] text-[#3a3a3d] hover:bg-[#f5f5f7] transition-colors"
        >
          Compartir brief
 </button>
 <button
          onClick={onCreateAgenda}
          className="flex-1 rounded-lg bg-[#e8e8ed] px-3 py-1.5 text-[11px] font-medium text-[#1d1d1f] hover:bg-[#d2d2d7] transition-colors"
        >
          Crear agenda del día
 </button>
 </div>

 <div className="px-4 pb-2 text-[10px] text-[#8e8e93]">
        Generado {new Date(brief.generatedAt).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit" })}
 </div>
 </div>
  );
}
