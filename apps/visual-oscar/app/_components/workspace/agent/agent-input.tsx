"use client";

import { useRef, type KeyboardEvent } from "react";
import type { AgentMode } from "@/types/agent";

const MODE_COLORS: Record<AgentMode, string> = {
  ask:     "rgb(96 165 250)",
  do:      "rgb(52 211 153)",
  analyze: "rgb(167 139 250)",
};

const MODE_LABELS: Record<AgentMode, string> = {
  ask:     "Preguntar",
  do:      "Ejecutar",
  analyze: "Analizar",
};

interface AgentInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
  mode: AgentMode;
}

export function AgentInput({ onSend, onStop, isLoading, mode }: AgentInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const val = ref.current?.value?.trim();
    if (val) {
      onSend(val);
      if (ref.current) ref.current.value = "";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-[#e8e8ed] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: MODE_COLORS[mode] }}
        >
          {MODE_LABELS[mode]}
        </span>
        <span className="text-[10px] text-[#8e8e93]">
          · Enter envía · Shift+Enter nueva línea
        </span>
      </div>
      <div className="flex gap-2">
        <textarea
          ref={ref}
          rows={2}
          placeholder="Escribe o usa / para comandos…"
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1 resize-none rounded-lg border border-[#e8e8ed] bg-[#f5f5f7] px-3 py-2 text-xs text-[#1d1d1f] placeholder-[#aeaeb2] focus:border-[#b0b0b8] focus:outline-none disabled:opacity-50"
        />
        {isLoading ? (
          <button
            onClick={onStop}
            className="rounded-lg border border-[#d2d2d7] bg-[#f5f5f7] px-3 text-[11px] font-medium text-[#3a3a3d] hover:text-[#1d1d1f] transition-colors"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={submit}
            className="rounded-lg bg-[#e8e8ed] px-3 text-[11px] font-medium text-[#1d1d1f] hover:bg-[#d2d2d7] transition-colors"
          >
            Enviar
          </button>
        )}
      </div>
    </div>
  );
}
