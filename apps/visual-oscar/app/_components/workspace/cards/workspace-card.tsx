import type { CSSProperties, ReactNode } from "react";
import { WS } from "@/lib/workspace/workspace-utils";

interface WorkspaceCardProps {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  padded?: boolean;
  hoverable?: boolean;
  accentBorder?: string;
}

export function WorkspaceCard({
  children,
  onClick,
  style,
  padded = true,
  hoverable = false,
  accentBorder,
}: WorkspaceCardProps) {
  const base: CSSProperties = {
    background: WS.surface,
    border: `1px solid ${WS.border}`,
    borderRadius: 12,
    padding: padded ? "12px 14px" : 0,
    cursor: onClick ? "pointer" : "default",
    transition: "border-color 120ms, transform 120ms",
    borderLeft: accentBorder ? `3px solid ${accentBorder}` : undefined,
    ...style,
  };

  return (
    <div
      style={base}
      onClick={onClick}
      onMouseEnter={e => {
        if (hoverable) (e.currentTarget as HTMLElement).style.borderColor = WS.accent;
      }}
      onMouseLeave={e => {
        if (hoverable) (e.currentTarget as HTMLElement).style.borderColor = WS.border;
      }}
    >
      {children}
    </div>
  );
}

interface BadgeProps {
  label: string;
  color?: string;
  variant?: "filled" | "outline";
  size?: "xs" | "sm";
}

export function WsBadge({ label, color = WS.ink3, variant = "filled", size = "sm" }: BadgeProps) {
  const isXs = size === "xs";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: isXs ? 9.5 : 10.5, fontWeight: 600,
      padding: isXs ? "1px 6px" : "2px 8px",
      borderRadius: 99,
      background: variant === "filled" ? `${color}18` : "transparent",
      border: variant === "outline" ? `1px solid ${color}40` : "none",
      color,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

export function WsDot({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block",
      width: 7, height: 7, borderRadius: "50%",
      background: color, flexShrink: 0,
    }} />
  );
}
