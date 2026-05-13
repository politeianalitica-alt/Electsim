"use client";

import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceEmptyState } from "@/app/_components/workspace/workspace-empty-state";

export function OverviewLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SkeletonRow height={64} />
      <SkeletonRow height={110} />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
        <SkeletonRow height={220} />
        <SkeletonRow height={220} />
        <SkeletonRow height={180} />
        <SkeletonRow height={180} />
      </div>
    </div>
  );
}

export function OverviewEmpty({ workspaceId }: { workspaceId: string }) {
  return (
    <WorkspaceEmptyState
      view="overview"
      title="Workspace sin datos"
      description={`No encontramos información para «${workspaceId}». Revisa la URL o crea un workspace nuevo.`}
      cta="Volver a workspaces"
    />
  );
}

function SkeletonRow({ height }: { height: number }) {
  return (
    <div style={{
      background: WS.surface, border: `1px solid ${WS.border}`,
      borderRadius: 12, height,
      animation: "wsPulse 1.4s ease-in-out infinite",
      overflow: "hidden",
    }}>
      <style>{`@keyframes wsPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 0.85; } }`}</style>
    </div>
  );
}
