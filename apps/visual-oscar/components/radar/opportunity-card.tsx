"use client";

import { WS } from "@/lib/workspace/workspace-utils";
import type { RadarOpportunity } from "@/types/radar";

const IMPACT_COLOR: Record<string, string> = {
  transformacional: WS.danger,
  alto:             WS.warn,
  medio:            WS.accent,
  bajo:             WS.ink3,
};

const HORIZON_LABEL: Record<string, string> = {
  now: "Ahora",
  week: "Semana",
  month: "Mes",
  quarter: "Trimestre",
};

export function OpportunityCard({
  opportunity,
  onClick,
  selected,
}: {
  opportunity: RadarOpportunity;
  onClick?: () => void;
  selected?: boolean;
}) {
  const impactColor = IMPACT_COLOR[opportunity.impact] ?? WS.ink3;
  return (
 <button
      onClick={onClick}
      style={{
        textAlign: "left",
        background: selected ? WS.accentSubtle : WS.surface,
        border: `1px solid ${selected ? WS.accent : WS.border}`,
        borderRadius: 12,
        padding: 12,
        cursor: "pointer",
        fontFamily: WS.font,
        color: WS.ink,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
 <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
 <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, flex: 1 }}>{opportunity.title}</span>
 <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: WS.accent,
            letterSpacing: "-0.04em",
          }}
        >
          {opportunity.score}
 </span>
 </div>

 <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
 <Tag color={impactColor}>{opportunity.impact}</Tag>
 <Tag color={WS.ink3}>{HORIZON_LABEL[opportunity.horizon] ?? opportunity.horizon}</Tag>
 <Tag color={WS.ink2}>{opportunity.category}</Tag>
 <Tag color={WS.ink3}>{Math.round(opportunity.confidence * 100)}% conf.</Tag>
 </div>

 <p style={{ fontSize: 12, lineHeight: 1.4, color: WS.ink2, margin: 0 }}>
        {opportunity.rationale}
 </p>

 <div style={{ fontSize: 11, color: WS.ink3 }}>
        {opportunity.actions.length} acciones recomendadas
 </div>
 </button>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
 <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: `${color}1f`,
        color,
        padding: "2px 7px",
        borderRadius: 99,
      }}
    >
      {children}
 </span>
  );
}
