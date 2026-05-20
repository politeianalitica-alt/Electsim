"use client";

import { useState } from "react";
import Link from "next/link";
import { canvasRepository } from "@/lib/canvas/canvas-repository";
import { InvestigationCanvasView } from "@/components/canvas/investigation-canvas-view";
import { HYPOTHESIS_STATUS_CONFIG, OBJECT_TYPE_CONFIG } from "@/lib/canvas/canvas-config";

export default function CanvasEditorPage({
  params,
}: {
  params: { workspaceId: string; canvasId: string };
}) {
  const canvas = canvasRepository.getCanvasById(params.canvasId, params.workspaceId);
  const [tab, setTab] = useState<"detail" | "hypothesis" | "timeline">("hypothesis");

  if (!canvas) {
    return (
 <div className="flex h-full flex-col items-center justify-center">
 <p className="text-lg font-semibold text-[#1d1d1f] mb-2">Canvas no encontrado</p>
 <Link href={`/workspaces/${params.workspaceId}/canvas`} className="text-sm text-indigo-400">
          ← Volver
 </Link>
 </div>
    );
  }

  return (
 <div className="flex h-full -mx-7 -my-6">
      {/* Layer panel */}
 <aside className="flex w-56 flex-none flex-col border-r border-[#e8e8ed] bg-white p-3 space-y-4">
 <div>
 <Link href={`/workspaces/${params.workspaceId}/canvas`} className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]">
            ← Canvas
 </Link>
 <h2 className="text-sm font-bold text-[#1d1d1f] mt-1">{canvas.title}</h2>
 </div>
 <div>
 <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6e6e73]">Capas</p>
 <div className="space-y-1">
            {Object.entries(OBJECT_TYPE_CONFIG).map(([type, cfg]) => (
 <button
                key={type}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-[#3a3a3d] hover:bg-[#f5f5f7] transition-colors"
              >
 <span
                  className="flex-none rounded px-1 py-0.5 text-[8px] font-bold tracking-wider"
                  style={{ background: `${cfg.color}25`, color: cfg.color }}
                >
                  {cfg.mark}
 </span>
 <span>{cfg.label}</span>
 </button>
            ))}
 </div>
 </div>
 </aside>

      {/* Canvas central */}
 <div className="flex-1 min-w-0">
 <InvestigationCanvasView canvas={canvas} />
 </div>

      {/* Detail panel */}
 <aside className="flex w-80 flex-none flex-col border-l border-[#e8e8ed] bg-white overflow-y-auto">
 <div className="flex border-b border-[#e8e8ed]">
          {(["detail", "hypothesis", "timeline"] as const).map(t => (
 <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-2 py-2 text-[11px] font-medium transition-colors ${
                tab === t ? "border-b-2 border-indigo-500 text-indigo-400" : "text-[#6e6e73] hover:text-[#3a3a3d]"
              }`}
            >
              {t === "detail" ? "Detalle" : t === "hypothesis" ? "Hipótesis" : "Timeline"}
 </button>
          ))}
 </div>
 <div className="flex-1 overflow-y-auto p-3">
          {tab === "hypothesis" && (
 <div className="space-y-2">
              {canvas.hypotheses.map(h => {
                const cfg = HYPOTHESIS_STATUS_CONFIG[h.status];
                return (
 <div
                    key={h.id}
                    className="rounded-lg border border-[#e8e8ed] bg-[#fbfbfd] p-3"
                  >
 <div className="flex items-start justify-between gap-2 mb-2">
 <p className="text-xs font-semibold text-[#1d1d1f] leading-snug flex-1">
                        {h.title}
 </p>
 <span
                        className="flex-none rounded px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ background: `${cfg.color}20`, color: cfg.color }}
                      >
                        {cfg.label}
 </span>
 </div>
 <p className="text-[11px] text-[#6e6e73] leading-relaxed mb-2">{h.statement}</p>
 <div className="flex items-center gap-2">
 <div className="flex-1 h-1 rounded-full bg-[#f5f5f7] overflow-hidden">
 <div
                          className="h-full rounded-full"
                          style={{ width: `${h.confidence * 100}%`, background: cfg.color }}
                        />
 </div>
 <span className="text-[9px] text-[#6e6e73]">{Math.round(h.confidence * 100)}%</span>
 </div>
 </div>
                );
              })}
 </div>
          )}
          {tab === "timeline" && (
 <div className="space-y-2">
              {canvas.timeline.map(t => (
 <div key={t.id} className="rounded-lg bg-[#fbfbfd] p-2.5">
 <p className="text-[10px] text-[#6e6e73]">{t.date}</p>
 <p className="text-xs text-[#1d1d1f] mt-0.5">{t.title}</p>
 </div>
              ))}
 </div>
          )}
          {tab === "detail" && (
 <p className="text-xs text-[#6e6e73]">
              Selecciona un nodo o conexión del canvas para ver su detalle.
 </p>
          )}
 </div>
 </aside>
 </div>
  );
}
