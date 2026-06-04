"use client";

import { type ReactNode } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { demoWorkspace } from "@/lib/workspace/mock-data";
import { useWorkspaceStore } from "@/context/WorkspaceContext";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { WorkspaceTopbar } from "./workspace-topbar";
import { WorkspaceTabs } from "./workspace-tabs";
import { WorkspaceAgentPanel } from "./workspace-agent-panel";
import { WorkspaceCommandPalette } from "./workspace-command-palette";
import { RecentTracker } from "./recent-tracker";

interface WorkspaceShellProps {
  workspaceId: string;
  children: ReactNode;
}

export function WorkspaceShell({ workspaceId, children }: WorkspaceShellProps) {
  const { isAgentOpen } = useWorkspaceStore();
  const workspace = demoWorkspace;

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

      {/* Body: sidebar + content + agent */}
 <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* Left sidebar */}
 <WorkspaceSidebar workspaceId={workspaceId} workspace={workspace} />

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
 <div style={{
              maxWidth: 1400,
              margin: "0 auto",
              padding: "24px 28px 48px",
              minHeight: "100%",
            }}>
              {children}
 </div>
 </main>
 </div>

        {/* Right agent panel */}
        {isAgentOpen && (
 <WorkspaceAgentPanel workspaceId={workspaceId} />
        )}
 </div>

      {/* Command palette (portal-like, fixed) */}
 <WorkspaceCommandPalette workspaceId={workspaceId} />
      {/* Tracker invisible de recientes */}
 <RecentTracker workspaceId={workspaceId} />
 </div>
  );
}
