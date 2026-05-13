"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WS } from "@/lib/workspace/workspace-utils";
import { WORKSPACE_VIEWS, buildWorkspaceHref, NAV_GROUP_LABELS, type WorkspaceNavItem } from "@/lib/workspace/navigation";
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

      {/* Nav items agrupados */}
      <nav style={{ flex: 1, padding: "10px 6px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
        {(["operativo", "contenido", "inteligencia", "sistema"] as const).map(group => {
          const items = WORKSPACE_VIEWS.filter(v => v.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <div style={{
                padding: "0 8px 6px",
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.10em",
                color: WS.ink3,
                textTransform: "uppercase",
              }}>
                {NAV_GROUP_LABELS[group]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {items.map(view => (
                  <NavLink
                    key={view.key}
                    view={view}
                    isActive={activeSegment === view.segment}
                    href={buildWorkspaceHref(workspaceId, view.segment)}
                  />
                ))}
              </div>
            </div>
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

function NavLink({ view, isActive, href }: { view: WorkspaceNavItem; isActive: boolean; href: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 8,
        textDecoration: "none",
        fontSize: 12.5,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? WS.ink : WS.ink2,
        background: isActive ? WS.surface2 : "transparent",
        transition: "background 120ms, color 120ms",
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = WS.surface;
          (e.currentTarget as HTMLElement).style.color = WS.ink;
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = WS.ink2;
        }
      }}
    >
      <span style={{ color: isActive ? WS.accent : WS.ink3, flexShrink: 0 }}>
        <ViewIcon view={view.key} size={13} />
      </span>
      {view.label}
    </Link>
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
