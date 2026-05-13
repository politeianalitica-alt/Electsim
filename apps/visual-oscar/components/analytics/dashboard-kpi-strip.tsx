"use client";

import { WS } from "@/lib/workspace/workspace-utils";
import type { KpiTile } from "@/lib/workspace/analytics-builder";

const TONE_COLORS: Record<KpiTile["tone"], string> = {
  neutral:  WS.ink,
  positive: WS.success,
  warning:  WS.warn,
  danger:   WS.danger,
};

export function DashboardKpiStrip({ kpis }: { kpis: KpiTile[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
        gap: 10,
      }}
    >
      {kpis.map(k => (
        <div
          key={k.key}
          style={{
            background: WS.surface,
            border: `1px solid ${WS.border}`,
            borderRadius: 11,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: TONE_COLORS[k.tone],
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {k.value.toLocaleString("es-ES")}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: WS.ink3,
              marginTop: 4,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
          >
            {k.label}
          </div>
          {k.hint && (
            <div style={{ fontSize: 11, color: WS.ink2, marginTop: 4 }}>{k.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}
