import { WS } from "@/lib/workspace/workspace-utils";

export interface KpiItem {
  id: string;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
  delta?: number;
  onClick?: () => void;
}

interface KpiGridProps {
  items: KpiItem[];
  columns?: number;
}

export function KpiGrid({ items, columns }: KpiGridProps) {
  const cols = columns ?? items.length;
  return (
 <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gap: 12,
    }}>
      {items.map(kpi => (
 <div
          key={kpi.id}
          onClick={kpi.onClick}
          style={{
            background: WS.surface,
            border: `1px solid ${WS.border}`,
            borderRadius: 12,
            padding: "14px 16px",
            cursor: kpi.onClick ? "pointer" : "default",
            transition: "border-color 120ms",
          }}
          onMouseEnter={e => { if (kpi.onClick) (e.currentTarget as HTMLElement).style.borderColor = WS.accent; }}
          onMouseLeave={e => { if (kpi.onClick) (e.currentTarget as HTMLElement).style.borderColor = WS.border; }}
        >
 <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em",
            color: WS.ink3, textTransform: "uppercase", marginBottom: 8,
          }}>
            {kpi.label}
 </div>
 <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
 <span style={{
              fontSize: 28, fontWeight: 700,
              color: kpi.color ?? WS.ink,
              letterSpacing: "-0.04em", lineHeight: 1,
            }}>
              {kpi.value}
 </span>
            {kpi.delta !== undefined && (
 <span style={{
                fontSize: 11,
                color: kpi.delta >= 0 ? WS.success : WS.danger,
                fontWeight: 600,
              }}>
                {kpi.delta >= 0 ? "+" : ""}{kpi.delta}
 </span>
            )}
 </div>
          {kpi.sub && (
 <div style={{ fontSize: 11, color: WS.ink3, marginTop: 4 }}>{kpi.sub}</div>
          )}
 </div>
      ))}
 </div>
  );
}
