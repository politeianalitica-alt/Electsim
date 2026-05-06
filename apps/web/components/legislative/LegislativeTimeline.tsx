import type { LegislativeEvent } from "@/lib/types/legislative";
import { GitBranch } from "lucide-react";

interface Props {
  events: LegislativeEvent[];
}

function outcomeColor(outcome: string | null | undefined): string {
  if (!outcome) return "bg-cyan-500";
  if (outcome === "aprobado") return "bg-green-500";
  if (outcome === "rechazado") return "bg-red-500";
  return "bg-amber-500";
}

export function LegislativeTimeline({ events }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">Cronología</h3>
      </div>
      <ol className="relative border-l border-border1 space-y-4 pl-4">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <div className={`absolute -left-[1.4rem] top-1 w-2.5 h-2.5 rounded-full ${outcomeColor(e.outcome)}`} />
            <div className="text-[10px] text-muted font-mono mb-0.5">{e.date.slice(0, 10)}</div>
            <div className="text-sm text-text1 leading-snug">{e.description}</div>
            {e.outcome && (
              <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${
                e.outcome === "aprobado" ? "text-green1" : e.outcome === "rechazado" ? "text-red1" : "text-amber1"
              }`}>{e.outcome}</div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
