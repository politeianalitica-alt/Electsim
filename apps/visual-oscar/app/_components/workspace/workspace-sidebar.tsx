"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WS } from "@/lib/workspace/workspace-utils";
import { WORKSPACE_VIEWS, buildWorkspaceHref } from "@/lib/workspace/navigation";
import { ViewIcon, IconSettings, IconUser } from "./workspace-icons";
import type { WorkspaceSummary } from "@/types/workspace";

interface WorkspaceSidebarProps {
  workspaceId: string;
  workspace: WorkspaceSummary;
}

export function WorkspaceSidebar({ workspaceId, workspace }: WorkspaceSidebarProps) {
  const path = usePathname() ?? "";
  const activeSegment = path.split("/").at(-1) ?? "overview";

  return (
    <aside style={{
      width: WS.sidebarW,
      flexShrink: 0,
      background: WS.bg,
      borderRight: `1px solid ${WS.border}`,
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      overflowX: "hidden",
    }}>

      {/* Workspace header */}
      <div style={{
        padding: "14px 12px 10px",
        borderBottom: `1px solid ${WS.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: WS.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {workspace.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: WS.ink,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              letterSpacing: "-0.01em",
            }}>
              {workspace.name}
            </div>
            <div style={{ fontSize: 10.5, color: WS.ink3, marginTop: 1 }}>
              {workspace.mode === "real" ? "Activo" : "Demo"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "8px 6px", display: "flex", flexDirection: "column", gap: 1 }}>
        {WORKSPACE_VIEWS.map(view => {
          const isActive = activeSegment === view.segment;
          const href = buildWorkspaceHref(workspaceId, view.segment);
          return (
            <Link
              key={view.key}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 12.5,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? WS.ink : WS.ink3,
                background: isActive ? WS.surface2 : "transparent",
                transition: "background 120ms, color 120ms",
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = WS.surface;
                  (e.currentTarget as HTMLElement).style.color = WS.ink2;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = WS.ink3;
                }
              }}
            >
              <span style={{ color: isActive ? WS.accent : WS.ink3, flexShrink: 0 }}>
                <ViewIcon view={view.key} size={13} />
              </span>
              {view.label}
            </Link>
          );
        })}
      </nav>

      {/* Workspace KPIs mini */}
      <div style={{
        margin: "0 8px 8px",
        padding: "10px 10px",
        background: WS.surface2,
        borderRadius: 10,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}>
        <MiniKpi label="Issues" value={workspace.issueCount} color={WS.danger} />
        <MiniKpi label="Acciones" value={workspace.pendingActions} color={WS.warn} />
        <MiniKpi label="Decisiones" value={workspace.decisionsThisWeek} color={WS.accent} />
        <MiniKpi label="Equipo" value={workspace.teamMembers} color={WS.success} />
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${WS.border}`,
        padding: "6px 6px",
        display: "flex",
        gap: 4,
      }}>
        <NavIconBtn href={`/workspaces/${workspaceId}/settings`} label="Ajustes" icon={<IconSettings size={13} />} />
        <NavIconBtn href="/settings" label="Perfil" icon={<IconUser size={13} />} />
      </div>
    </aside>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 9.5, color: WS.ink3, marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

function NavIconBtn({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      title={label}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: 7,
        color: WS.ink3, textDecoration: "none",
        transition: "background 120ms, color 120ms",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = WS.surface2;
        (e.currentTarget as HTMLElement).style.color = WS.ink2;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
        (e.currentTarget as HTMLElement).style.color = WS.ink3;
      }}
    >
      {icon}
    </Link>
  );
}
