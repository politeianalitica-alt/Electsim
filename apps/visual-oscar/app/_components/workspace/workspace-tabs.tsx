"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { WS } from "@/lib/workspace/workspace-utils";
import { WORKSPACE_VIEWS, buildWorkspaceHref } from "@/lib/workspace/navigation";
import { useWorkspaceStore } from "@/context/WorkspaceContext";
import { ViewIcon, IconClose, IconPin, IconPlus } from "./workspace-icons";
import type { WorkspaceTab } from "@/types/workspace";

interface WorkspaceTabsProps {
  workspaceId: string;
}

export function WorkspaceTabs({ workspaceId }: WorkspaceTabsProps) {
  const path = usePathname() ?? "";
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useWorkspaceStore();

  // Seed the overview tab on mount (always pinned)
  useEffect(() => {
    const overviewView = WORKSPACE_VIEWS.find(v => v.key === "overview")!;
    const overviewTab: WorkspaceTab = {
      id: `${workspaceId}__overview`,
      label: overviewView.label,
      view: "overview",
      href: buildWorkspaceHref(workspaceId, "overview"),
      pinned: true,
      closable: false,
    };
    openTab(overviewTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Sync active tab with current route
  useEffect(() => {
    const segment = path.split("/").at(-1) ?? "overview";
    const matchingTab = tabs.find(t => t.view === segment);
    if (matchingTab && matchingTab.id !== activeTabId) {
      setActiveTab(matchingTab.id);
    }
  }, [path, tabs, activeTabId, setActiveTab]);

  // Open tab when navigating to a new view
  useEffect(() => {
    const segment = path.split("/").at(-1) ?? "";
    const view = WORKSPACE_VIEWS.find(v => v.segment === segment);
    if (!view) return;
    const tabId = `${workspaceId}__${view.key}`;
    const exists = tabs.find(t => t.id === tabId);
    if (!exists) {
      openTab({
        id: tabId,
        label: view.label,
        view: view.key,
        href: buildWorkspaceHref(workspaceId, view.segment),
        closable: view.key !== "overview",
        pinned: view.key === "overview",
      });
    } else {
      setActiveTab(tabId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, workspaceId]);

  return (
 <div style={{
      height: WS.tabsH,
      flexShrink: 0,
      borderBottom: `1px solid ${WS.border}`,
      display: "flex",
      alignItems: "stretch",
      background: WS.bg,
      overflowX: "auto",
      overflowY: "hidden",
      scrollbarWidth: "none",
    }}>
      {tabs.map(tab => (
 <Tab key={tab.id} tab={tab} isActive={tab.id === activeTabId} onClose={closeTab} />
      ))}

      {/* New tab button */}
 <button
        title="Nueva vista"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 36, flexShrink: 0,
          background: "transparent", border: "none",
          color: WS.ink3, cursor: "pointer",
          borderRight: `1px solid ${WS.border}`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = WS.ink2;
          (e.currentTarget as HTMLElement).style.background = WS.surface;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = WS.ink3;
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
 <IconPlus size={12} />
 </button>
 </div>
  );
}

function Tab({ tab, isActive, onClose }: { tab: WorkspaceTab; isActive: boolean; onClose: (id: string) => void }) {
  return (
 <div style={{
      display: "flex", alignItems: "center",
      padding: "0 4px 0 10px",
      gap: 4, flexShrink: 0,
      borderRight: `1px solid ${WS.border}`,
      background: isActive ? WS.surface2 : "transparent",
      borderBottom: isActive ? `2px solid ${WS.accent}` : "2px solid transparent",
      maxWidth: 180, minWidth: 80,
    }}>
 <Link
        href={tab.href}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          flex: 1, minWidth: 0,
          textDecoration: "none",
          color: isActive ? WS.ink : WS.ink3,
          fontSize: 11.5, fontWeight: isActive ? 600 : 400,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}
      >
 <span style={{ color: isActive ? WS.accent : WS.ink3, flexShrink: 0 }}>
 <ViewIcon view={tab.view} size={11} />
 </span>
        {tab.label}
        {tab.pinned && (
 <span style={{ color: WS.ink3, flexShrink: 0 }}>
 <IconPin size={9} />
 </span>
        )}
 </Link>

      {tab.closable && (
 <button
          onClick={e => { e.preventDefault(); onClose(tab.id); }}
          title="Cerrar tab"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            background: "transparent", border: "none",
            color: WS.ink3, cursor: "pointer",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = WS.surface3;
            (e.currentTarget as HTMLElement).style.color = WS.ink;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = WS.ink3;
          }}
        >
 <IconClose size={8} />
 </button>
      )}
 </div>
  );
}
