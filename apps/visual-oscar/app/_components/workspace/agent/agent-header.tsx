"use client";

import type { AgentMode } from "@/types/agent";

interface AgentHeaderProps {
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  onClear: () => void;
}

const MODE_CONFIG: Record<AgentMode, { label: string; color: string }> = {
  ask:     { label: "Preguntar", color: "rgb(96 165 250)" },
  do:      { label: "Ejecutar",  color: "rgb(52 211 153)" },
  analyze: { label: "Analizar",  color: "rgb(167 139 250)" },
};

export function AgentHeader({ mode, onModeChange, onClear }: AgentHeaderProps) {
  return (
 <div className="flex flex-col gap-2 border-b border-[#e8e8ed] px-3 py-2.5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div
            className="h-6 w-6 flex items-center justify-center rounded text-[10px] font-bold text-white"
            style={{ background: MODE_CONFIG[mode].color }}
          >
            AI
 </div>
 <span className="text-xs font-semibold uppercase tracking-wider text-[#1d1d1f]">
            ARIA
 </span>
 <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
 </div>
 <button
          onClick={onClear}
          className="text-[10px] text-[#6e6e73] hover:text-[#3a3a3d] transition-colors"
        >
          Nueva conversación
 </button>
 </div>
 <div className="flex gap-1">
        {(Object.keys(MODE_CONFIG) as AgentMode[]).map(m => {
          const cfg = MODE_CONFIG[m];
          const isActive = mode === m;
          return (
 <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors`}
              style={{
                background: isActive ? `${cfg.color}25` : "rgb(15 23 42)",
                color: isActive ? cfg.color : "rgb(148 163 184)",
                border: `1px solid ${isActive ? cfg.color + "40" : "rgb(30 41 59)"}`,
              }}
            >
              {cfg.label}
 </button>
          );
        })}
 </div>
 </div>
  );
}
