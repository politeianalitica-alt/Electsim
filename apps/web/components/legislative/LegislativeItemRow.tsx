import type { LegislativeItem, UrgencyLevel } from "@/lib/types/legislative";
import { ChevronRight, Globe, Flag } from "lucide-react";

const URGENCY_BADGE: Record<UrgencyLevel, string> = {
  critical: "badge-red",
  high: "badge-amber",
  medium: "badge-blue",
  low: "badge-blue",
};

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

interface Props {
  item: LegislativeItem;
  onClick?: (item: LegislativeItem) => void;
}

export function LegislativeItemRow({ item, onClick }: Props) {
  return (
    <li
      className="p-3 rounded-lg border border-border1 hover:border-cyan1/40 transition cursor-pointer group"
      onClick={() => onClick?.(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-text1 group-hover:text-cyan1 transition leading-snug flex-1">
          {item.short_title || item.title}
        </h3>
        <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`badge ${URGENCY_BADGE[item.urgency]}`}>{URGENCY_LABEL[item.urgency]}</span>
        <span className="badge badge-blue">{item.procedure_label || item.procedure_type}</span>
        {item.ue_origin && (
          <span className="badge badge-cyan flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" /> UE
          </span>
        )}
        {item.is_government && (
          <span className="badge badge-blue flex items-center gap-1">
            <Flag className="w-2.5 h-2.5" /> Gobierno
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-text2">
        <span>{item.stage_label}</span>
        <span className="flex items-center gap-2">
          {item.expected_vote && (
            <span className="text-amber1">Votación: {item.expected_vote.slice(0, 10)}</span>
          )}
          <span
            className="font-mono text-xs"
            style={{ color: item.impact_score >= 70 ? "#EF4444" : item.impact_score >= 50 ? "#F59E0B" : "#64748B" }}
          >
            {item.impact_score}
          </span>
        </span>
      </div>
      <div className="mt-2 h-0.5 bg-bg3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${item.impact_score}%`,
            backgroundColor: item.impact_score >= 70 ? "#EF4444" : item.impact_score >= 50 ? "#F59E0B" : "#3B82F6",
          }}
        />
      </div>
    </li>
  );
}
