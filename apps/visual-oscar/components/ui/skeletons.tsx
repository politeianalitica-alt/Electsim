"use client";

import { WS } from "@/lib/workspace/workspace-utils";

/**
 * Skeletons reutilizables. Usan animación CSS pura (sin tailwind animation
 * keyframes nuevos) inyectada en este archivo para evitar tocar globals.css.
 */

const ANIM = `
@keyframes politeia-pulse { 0% { opacity: .55; } 50% { opacity: .9; } 100% { opacity: .55; } }
`;

function StyleOnce() {
  return <style>{ANIM}</style>;
}

function shimmer(): React.CSSProperties {
  return {
    background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
    animation: "politeia-pulse 1.6s ease-in-out infinite",
    borderRadius: 6,
  };
}

export function SkeletonLine({ width = "100%", height = 12 }: { width?: number | string; height?: number }) {
  return <div style={{ width, height, ...shimmer() }} />;
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div
      style={{
        background: WS.surface,
        border: `1px solid ${WS.border}`,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <StyleOnce />
      <SkeletonLine width="55%" height={14} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === rows - 1 ? "70%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12 }}>
      <StyleOnce />
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div
      style={{
        background: WS.surface,
        border: `1px solid ${WS.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <StyleOnce />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 12,
            padding: "10px 14px",
            borderTop: i > 0 ? `1px solid ${WS.border}` : "none",
          }}
        >
          <SkeletonLine />
          <SkeletonLine width="70%" />
          <SkeletonLine width="50%" />
          <SkeletonLine width="60%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div
      style={{
        background: WS.surface,
        border: `1px solid ${WS.border}`,
        borderRadius: 12,
        padding: 14,
        height,
        ...shimmer(),
      }}
    >
      <StyleOnce />
    </div>
  );
}
