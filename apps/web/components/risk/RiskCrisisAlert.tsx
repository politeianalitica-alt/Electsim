"use client";
import { useState } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import type { CrisisSignal } from "@/lib/types/risk_rich";

const SEV_COLORS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  critical: { border: "border-red1/40", bg: "bg-red1/5", text: "text-red1", badge: "badge-red" },
  high: { border: "border-amber1/40", bg: "bg-amber1/5", text: "text-amber1", badge: "badge-amber" },
  medium: { border: "border-blue1/40", bg: "bg-blue1/5", text: "text-blue1", badge: "badge-blue" },
  low: { border: "border-border1", bg: "bg-bg3", text: "text-text2", badge: "badge-blue" },
};

export function RiskCrisisAlert({ signals }: { signals: CrisisSignal[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = signals.filter(s => !dismissed.includes(s.crisis_id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map(s => {
        const cfg = SEV_COLORS[s.severity] ?? SEV_COLORS.medium;
        return (
          <div key={s.crisis_id} className={`p-4 rounded-lg border ${cfg.border} ${cfg.bg}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <AlertTriangle className={`w-4 h-4 ${cfg.text} shrink-0 mt-0.5`} />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${cfg.badge}`}>{s.severity.toUpperCase()}</span>
                    <span className="text-[10px] text-muted">Impacto en {s.time_to_impact}</span>
                  </div>
                  <h3 className={`text-sm font-bold ${cfg.text} mb-1`}>{s.title}</h3>
                  <p className="text-xs text-text2">{s.description}</p>
                  {s.recommended_action && (
                    <p className="text-[11px] text-cyan1 mt-1.5 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" /> {s.recommended_action}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDismissed(d => [...d, s.crisis_id])}
                className="p-1 rounded hover:bg-bg3 transition shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
