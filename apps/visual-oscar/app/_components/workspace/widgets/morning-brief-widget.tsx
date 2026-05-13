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
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          {regenerating ? "Generando..." : "Regenerar"}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <p className="text-sm leading-relaxed text-slate-200">{brief.summary}</p>

        {brief.highlights.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Puntos de atención
            </p>
            <ul className="space-y-1.5">
              {brief.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-slate-500" />
                  <span className="leading-relaxed">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-800 p-3">
        <button
          onClick={onShare}
          className="flex-1 rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Compartir brief
        </button>
        <button
          onClick={onCreateAgenda}
          className="flex-1 rounded-lg bg-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-600 transition-colors"
        >
          Crear agenda del día
        </button>
      </div>

      <div className="px-4 pb-2 text-[10px] text-slate-600">
        Generado {new Date(brief.generatedAt).toLocaleString("es-ES", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
