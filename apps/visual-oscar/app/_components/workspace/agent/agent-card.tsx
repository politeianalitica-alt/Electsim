"use client";

import Link from "next/link";
import type { AgentCard as AgentCardType, AgentCardAction } from "@/types/agent";
import { BadgeSeverity } from "../badges";

interface AgentCardProps {
  card: AgentCardType;
  onAction?: (action: AgentCardAction) => void;
}

const TYPE_STYLES: Record<string, { fg: string; tag: string }> = {
  issue:       { fg: "rgb(248 113 113)", tag: "Issue" },
  document:    { fg: "rgb(148 163 184)", tag: "Documento" },
  canvas:      { fg: "rgb(129 140 248)", tag: "Canvas" },
  action:      { fg: "rgb(74 222 128)",  tag: "Acción" },
  research:    { fg: "rgb(167 139 250)", tag: "Research" },
  decision:    { fg: "rgb(129 140 248)", tag: "Decisión" },
  opportunity: { fg: "rgb(74 222 128)",  tag: "Oportunidad" },
  text:        { fg: "rgb(148 163 184)", tag: "Texto" },
  error:       { fg: "rgb(248 113 113)", tag: "Error" },
  thinking:    { fg: "rgb(148 163 184)", tag: "Pensando" },
};

export function AgentCard({ card, onAction }: AgentCardProps) {
  const style = TYPE_STYLES[card.type] ?? TYPE_STYLES.text;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span
            className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color: style.fg }}
          >
            {style.tag}
          </span>
          <p className="text-xs font-semibold text-slate-100 leading-snug mt-0.5">
            {card.title}
          </p>
        </div>
        {card.meta?.severity && (
          <BadgeSeverity value={card.meta.severity} />
        )}
      </div>
      {card.summary && (
        <p className="text-[11px] text-slate-400 leading-relaxed">{card.summary}</p>
      )}
      {card.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {card.actions.map(action => (
            <AgentCardActionButton
              key={action.id}
              action={action}
              onClick={() => onAction?.(action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCardActionButton({
  action,
  onClick,
}: {
  action: AgentCardAction;
  onClick?: () => void;
}) {
  const cls =
    "rounded bg-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-600 transition-colors";
  if (action.href) {
    return (
      <Link href={action.href} className={cls} onClick={onClick}>
        {action.label}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {action.label}
    </button>
  );
}
