"use client";

import type { AgentContextItem } from "@/types/workspace";

const CONTEXT_LABEL: Record<string, { mark: string; color: string }> = {
  document: { mark: "DOC", color: "rgb(148 163 184)" },
  issue:    { mark: "ISS", color: "rgb(248 113 113)" },
  canvas:   { mark: "CNV", color: "rgb(129 140 248)" },
  project:  { mark: "PRJ", color: "rgb(74 222 128)" },
  research: { mark: "RES", color: "rgb(167 139 250)" },
  alert:    { mark: "ALT", color: "rgb(251 191 36)" },
};

export function AgentContextBar({ items }: { items: AgentContextItem[] }) {
  if (items.length === 0) {
    return (
 <div className="border-b border-[#e8e8ed] px-3 py-2">
 <p className="text-[10px] text-[#6e6e73]">Sin contexto activo</p>
 </div>
    );
  }
  return (
 <div className="flex flex-wrap gap-1 border-b border-[#e8e8ed] px-3 py-2">
 <span className="text-[10px] self-center text-[#6e6e73] mr-1 font-semibold uppercase tracking-wider">
        Contexto:
 </span>
      {items.map(item => {
        const cfg = CONTEXT_LABEL[item.type] ?? { mark: "ITM", color: "rgb(148 163 184)" };
        return (
 <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded bg-[#f5f5f7] px-1.5 py-0.5 text-[10px] text-[#3a3a3d]"
          >
 <span style={{ color: cfg.color, fontWeight: 700, letterSpacing: "0.04em" }}>
              {cfg.mark}
 </span>
 <span className="max-w-[110px] truncate">{item.title}</span>
 </span>
        );
      })}
 </div>
  );
}
