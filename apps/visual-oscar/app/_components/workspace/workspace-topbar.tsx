"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WS } from "@/lib/workspace/workspace-utils";
import { demoMembers } from "@/lib/workspace/mock-data";
import { getViewByPath } from "@/lib/workspace/navigation";
import { memberStatusColor } from "@/lib/workspace/workspace-utils";
import { useWorkspaceStore } from "@/context/WorkspaceContext";
import { IconBack, IconCommand, IconPanelRight, IconAlertCircle } from "./workspace-icons";
import type { WorkspaceSummary } from "@/types/workspace";

interface WorkspaceTopbarProps {
  workspace: WorkspaceSummary;
  workspaceId: string;
}

export function WorkspaceTopbar({ workspace, workspaceId }: WorkspaceTopbarProps) {
  const path = usePathname() ?? "";
  const currentView = getViewByPath(path);
  const { toggleAgent, openCommandPalette, isAgentOpen } = useWorkspaceStore();

  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";

  return (
 <header style={{
      height: WS.topbarH,
      flexShrink: 0,
      borderBottom: `1px solid ${WS.border}`,
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      gap: 8,
      background: WS.bg,
    }}>

      {/* Back */}
 <Link
        href="/workspaces"
        title="Volver a workspaces"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 7, color: WS.ink3, textDecoration: "none",
          flexShrink: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = WS.surface2; (e.currentTarget as HTMLElement).style.color = WS.ink2; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = WS.ink3; }}
      >
 <IconBack size={13} />
 </Link>

      {/* Breadcrumb */}
 <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
 <span style={{ fontSize: 12, color: WS.ink3 }}>{workspace.name}</span>
        {currentView && (
 <>
 <span style={{ color: WS.ink3, fontSize: 11 }}>/</span>
 <span style={{ fontSize: 12, fontWeight: 600, color: WS.ink }}>{currentView.label}</span>
 </>
        )}
 </div>

      {/* Search/command launcher */}
 <button
        onClick={openCommandPalette}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          flex: 1, maxWidth: 360,
          height: 28, padding: "0 10px",
          background: WS.surface2, border: `1px solid ${WS.border}`,
          borderRadius: 8, cursor: "pointer",
          color: WS.ink3, fontSize: 12,
          fontFamily: WS.font, textAlign: "left",
        }}
      >
 <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
 <circle cx="7" cy="7" r="5"/><path d="M14 14l-3.5-3.5"/>
 </svg>
 <span style={{ flex: 1 }}>Buscar o ejecutar acción…</span>
 <span style={{ fontSize: 10.5, opacity: 0.6, background: WS.surface3, padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>
          {modKey}K
 </span>
 </button>

 <div style={{ flex: 1 }} />

      {/* Status indicator */}
 <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
        {workspace.issueCount > 0 && (
 <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, color: WS.danger,
            background: WS.dangerSub, padding: "2px 8px", borderRadius: 99,
          }}>
 <IconAlertCircle size={11} color={WS.danger} />
            {workspace.issueCount} issues
 </span>
        )}
 </div>

      {/* Team avatars */}
 <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        {demoMembers.slice(0, 3).map((m, i) => (
 <div
            key={m.id}
            title={`${m.name} · ${m.role}`}
            style={{
              width: 24, height: 24,
              borderRadius: "50%",
              background: WS.surface3,
              border: `2px solid ${WS.bg}`,
              marginLeft: i > 0 ? -6 : 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700, color: WS.ink2,
              position: "relative",
              cursor: "default",
            }}
          >
            {m.initials}
 <span style={{
              position: "absolute", bottom: -1, right: -1,
              width: 6, height: 6, borderRadius: "50%",
              background: memberStatusColor(m.status),
              border: `1px solid ${WS.bg}`,
            }} />
 </div>
        ))}
        {demoMembers.length > 3 && (
 <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: WS.surface3, border: `2px solid ${WS.bg}`,
            marginLeft: -6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: WS.ink3,
          }}>
            +{demoMembers.length - 3}
 </div>
        )}
 </div>

      {/* Agent toggle */}
 <button
        onClick={toggleAgent}
        title={isAgentOpen ? "Cerrar agente" : "Abrir agente"}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 28, height: 28, borderRadius: 7, border: "none",
          cursor: "pointer", flexShrink: 0,
          background: isAgentOpen ? WS.accentSubtle : "transparent",
          color: isAgentOpen ? WS.accent : WS.ink3,
          transition: "background 120ms, color 120ms",
        }}
      >
 <IconPanelRight size={13} />
 </button>
 </header>
  );
}
