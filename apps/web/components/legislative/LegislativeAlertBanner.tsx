"use client";

import { useState } from "react";
import type { LegislativeItem } from "@/lib/types/legislative";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  items: LegislativeItem[];
}

export function LegislativeAlertBanner({ items }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const criticals = items.filter(i => i.urgency === "critical");
  if (dismissed || criticals.length === 0) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
      <AlertTriangle className="w-4 h-4 text-red1 shrink-0" />
      <div className="flex-1 text-sm text-text1">
        <span className="font-bold text-red1">{criticals.length} iniciativa{criticals.length > 1 ? "s" : ""} crítica{criticals.length > 1 ? "s" : ""}</span>
        {" "}requieren atención inmediata:{" "}
        <span className="text-text2">{criticals[0].short_title || criticals[0].title}</span>
        {criticals.length > 1 && <span className="text-muted"> +{criticals.length - 1} más</span>}
      </div>
      <button onClick={() => setDismissed(true)} className="p-1 rounded hover:bg-bg3 transition">
        <X className="w-3.5 h-3.5 text-muted" />
      </button>
    </div>
  );
}
