"use client";

import type { DataMode } from "@/lib/types/status";
import { getModeClassName, getModeLabel } from "@/lib/utils/status";

interface ModeBadgeProps {
  mode: DataMode;
  source?: string;
  message?: string;
  className?: string;
}

const MODE_ICONS: Record<DataMode, string> = {
  real: "●",
  demo: "◆",
  fallback: "▲",
  error: "✕",
};

export function ModeBadge({ mode, source, message, className = "" }: ModeBadgeProps) {
  const label = getModeLabel(mode);
  const icon = MODE_ICONS[mode];
  const classes = getModeClassName(mode);
  const title = [source && `Fuente: ${source}`, message].filter(Boolean).join(" · ");

  return (
    <span
      title={title || undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${classes} ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
