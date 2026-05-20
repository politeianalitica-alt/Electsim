"use client";

import type { AgentMode } from "@/types/agent";

interface QuickAction {
  id: string;
  label: string;
  message: string;
  mode: AgentMode;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "qa_brief",         label: "Briefing del día",        message: "Genera el briefing de hoy con el estado actual del workspace.", mode: "analyze" },
  { id: "qa_issues",        label: "Issues críticos",          message: "¿Cuáles son los issues críticos que necesito atender hoy?",     mode: "ask" },
  { id: "qa_canvas",        label: "Estado del canvas",        message: "Resume el estado actual del canvas de investigación.",           mode: "ask" },
  { id: "qa_decisions",     label: "Decisiones recientes",     message: "¿Qué decisiones se han tomado esta semana?",                     mode: "ask" },
  { id: "qa_opportunities", label: "Radar de oportunidades",   message: "¿Qué oportunidades top tenemos esta semana?",                    mode: "analyze" },
];

interface AgentQuickActionsProps {
  onAction: (message: string, mode: AgentMode) => void;
  isLoading: boolean;
}

export function AgentQuickActions({ onAction, isLoading }: AgentQuickActionsProps) {
  return (
    <div className="border-t border-[#e8e8ed] px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6e6e73] mb-1.5">
        Acciones rápidas
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {QUICK_ACTIONS.map(qa => (
          <button
            key={qa.id}
            onClick={() => onAction(qa.message, qa.mode)}
            disabled={isLoading}
            className="flex-none rounded-full border border-[#e8e8ed] bg-[#f5f5f7] px-2.5 py-1 text-[10px] text-[#3a3a3d] hover:border-[#b0b0b8] hover:text-[#1d1d1f] transition-colors disabled:opacity-50"
          >
            {qa.label}
          </button>
        ))}
      </div>
    </div>
  );
}
