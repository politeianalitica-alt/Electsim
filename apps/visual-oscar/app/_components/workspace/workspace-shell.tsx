"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { WS, DEFAULT_WORKSPACE_ID } from "@/lib/workspace/workspace-utils";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { useWorkspaceStore } from "@/context/WorkspaceContext";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { WorkspaceTopbar } from "./workspace-topbar";
import { WorkspaceTabs } from "./workspace-tabs";
import { WorkspaceAgentPanel } from "./workspace-agent-panel";
import { WorkspaceCommandPalette } from "./workspace-command-palette";
import { RecentTracker } from "./recent-tracker";
import type { Workspace } from "@/types/workspace";

interface WorkspaceShellProps {
  workspaceId: string;
  children: ReactNode;
}

export function WorkspaceShell({ workspaceId, children }: WorkspaceShellProps) {
  const { isAgentOpen } = useWorkspaceStore();
  // Resuelve el workspace REAL por id (antes: siempre demoWorkspace, así que
  // /workspaces/lo-que-sea mostraba el chrome de "España 2026"). Si el id no
  // existe, se muestra un stub honesto (contadores a 0, modo demo) + banner.
  const real = workspaceRepository.getWorkspaceById(workspaceId);
  const workspace: Workspace = real ?? {
    id: workspaceId,
    name: workspaceId.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    tenantId: "demo",
    description: "Workspace sin datos",
    mode: "demo",
    createdAt: "",
    tags: [],
    issueCount: 0,
    pendingActions: 0,
    decisionsThisWeek: 0,
    teamMembers: 0,
  };

  return (
 <div data-workspace-light style={{
      // Render inline within the dashboard chrome (AppHeader is shown
      // above by the workspace layout). Do NOT cover the dashboard.
      minHeight: "calc(100vh - 60px)", // leave room for AppHeader
      background: WS.bg,
      display: "flex",
      flexDirection: "column",
      fontFamily: WS.font,
      color: WS.ink,
    }}>
      {/* Topbar */}
 <WorkspaceTopbar workspace={workspace} workspaceId={workspaceId} />

      {/* Aviso: id sin datos · evita confundir un espacio vacío con datos reales */}
      {!real && (
 <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 16px", fontSize: 12, fontFamily: WS.font,
          background: WS.warnSub, color: WS.warn,
          borderBottom: `1px solid ${WS.border}`,
        }}>
 <span style={{ fontWeight: 700 }}>!</span>
          Este workspace ({workspaceId}) no tiene datos todavía.
 <Link href={`/workspaces/${DEFAULT_WORKSPACE_ID}/overview`} style={{ color: WS.warn, fontWeight: 600 }}>
            Ir al workspace demo España 2026 ⟶
 </Link>
 </div>
      )}

      {/* Body: sidebar + content + agent */}
 <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* Left sidebar · oculto en móvil (ver .ws-sidebar-wrap en globals.css) */}
 <div className="ws-sidebar-wrap" style={{ display: "flex", minHeight: 0 }}>
 <WorkspaceSidebar workspaceId={workspaceId} workspace={workspace} />
 </div>

        {/* Main column */}
 <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>

          {/* Tabs */}
 <WorkspaceTabs workspaceId={workspaceId} />

          {/* Content area */}
 <main style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            background: WS.bg,
          }}>
 <div className="ws-content" style={{
              maxWidth: 1400,
              margin: "0 auto",
              padding: "24px 28px 48px",
              minHeight: "100%",
            }}>
              {children}
 </div>
 </main>
 </div>

        {/* Right agent panel · oculto en móvil (ver .ws-agent-wrap) */}
        {isAgentOpen && (
 <div className="ws-agent-wrap" style={{ display: "flex", minHeight: 0 }}>
 <WorkspaceAgentPanel workspaceId={workspaceId} />
 </div>
        )}
 </div>

      {/* Command palette (portal-like, fixed) */}
 <WorkspaceCommandPalette workspaceId={workspaceId} />
      {/* Tracker invisible de recientes */}
 <RecentTracker workspaceId={workspaceId} />
 </div>
  );
}
