"use client";

import { useMemo } from "react";
import Link from "next/link";
import { WS, priorityColor } from "@/lib/workspace/workspace-utils";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { getActivitySorted } from "@/lib/workspace/workspace-selectors";
import type { RadarOpportunity } from "@/types/radar";

interface CommonProps {
  workspaceId: string;
}

const TYPE_COLORS: Record<string, string> = {
  alert:      WS.danger,
  automation: WS.success,
  doc:        WS.accent,
  research: "#a78bfa",
  issue:      WS.warn,
  decision:   WS.accent,
  action:     WS.ink2,
};

export function AlertsPanel({ workspaceId }: CommonProps) {
  const alerts = workspaceRepository.getActiveAlerts(workspaceId).slice(0, 6);
  return (
 <PanelShell title="Alertas activas" hint={`${alerts.length}`}>
 <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {alerts.map(a => (
 <div key={a.id} style={{
            padding: "8px 10px",
            background: WS.surface2,
            border: `1px solid ${WS.border}`,
            borderRadius: 8,
            borderLeft: `3px solid ${priorityColor(a.severity)}`,
          }}>
 <div style={{ fontSize: 12, fontWeight: 600, color: WS.ink, lineHeight: 1.3 }}>{a.title}</div>
 <div style={{ fontSize: 10.5, color: WS.ink3, marginTop: 2 }}>{a.source}</div>
 </div>
        ))}
        {alerts.length === 0 && <Empty>Sin alertas activas</Empty>}
 </div>
 </PanelShell>
  );
}

export function IssuesPanel({ workspaceId }: CommonProps) {
  const issues = workspaceRepository.getIssues(workspaceId)
    .filter(i => i.status !== "closed")
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 6);
  return (
 <PanelShell title="Issues críticos" hint={`${issues.length}`}>
 <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {issues.map(i => (
 <div key={i.id} style={{
            padding: "8px 10px",
            background: WS.surface2,
            border: `1px solid ${WS.border}`,
            borderRadius: 8,
            borderLeft: `3px solid ${priorityColor(i.severity)}`,
          }}>
 <div style={{ fontSize: 12, fontWeight: 600, color: WS.ink, lineHeight: 1.3 }}>{i.title}</div>
 <div style={{ fontSize: 10.5, color: WS.ink3, marginTop: 2 }}>{i.summary.slice(0, 80)}</div>
 </div>
        ))}
        {issues.length === 0 && <Empty>Sin issues activos</Empty>}
 </div>
 </PanelShell>
  );
}

export function InboxPanel({ workspaceId }: CommonProps) {
  const actions = workspaceRepository.getPendingActions(workspaceId)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 8);
  return (
 <PanelShell title="Inbox · acciones pendientes" hint={`${actions.length}`}>
 <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
        {actions.map(a => (
 <div key={a.id} style={{
            display: "grid",
            gridTemplateColumns: "1fr 80px 70px",
            gap: 8,
            alignItems: "center",
            padding: "6px 8px",
            borderRadius: 7,
          }}>
 <span style={{ fontSize: 12, color: WS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.title}
 </span>
 <span style={{ fontSize: 10.5, color: priorityColor(a.priority), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {a.priority}
 </span>
 <span style={{ fontSize: 10.5, color: WS.ink3, textAlign: "right" }}>
              {new Date(a.dueDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
 </span>
 </div>
        ))}
        {actions.length === 0 && <Empty>Sin acciones pendientes</Empty>}
 </div>
 </PanelShell>
  );
}

export function AgendaPanel({ workspaceId }: CommonProps) {
  // Tomamos los próximos issues con dueDate y projects con dueDate como proxy de agenda
  const now = Date.now();
  const items = useMemo(() => {
    const out: { id: string; title: string; at: string; tag: string; color: string }[] = [];
    for (const i of workspaceRepository.getIssues(workspaceId)) {
      if (i.dueDate && new Date(i.dueDate).getTime() >= now) {
        out.push({ id: i.id, title: i.title, at: i.dueDate, tag: "issue", color: WS.warn });
      }
    }
    for (const p of workspaceRepository.getProjects(workspaceId)) {
      if (p.dueDate && new Date(p.dueDate).getTime() >= now) {
        out.push({ id: p.id, title: p.name, at: p.dueDate, tag: "proyecto", color: WS.accent });
      }
    }
    return out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(0, 6);
  }, [workspaceId, now]);

  return (
 <PanelShell title="Agenda próxima" hint={`${items.length}`}>
 <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {items.map(it => (
 <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
 <span style={{ width: 7, height: 7, borderRadius: 99, background: it.color }} />
 <span style={{ color: WS.ink2, fontSize: 10.5, minWidth: 64 }}>
              {new Date(it.at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
 </span>
 <span style={{ color: WS.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.title}
 </span>
 <span style={{ fontSize: 10, color: WS.ink3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{it.tag}</span>
 </div>
        ))}
        {items.length === 0 && <Empty>Sin agenda próxima</Empty>}
 </div>
 </PanelShell>
  );
}

export function ResearchPanel({ workspaceId }: CommonProps) {
  const threads = workspaceRepository.getResearchThreads(workspaceId)
    .filter(t => t.status === "active")
    .slice(0, 6);
  return (
 <PanelShell title="Research activo" hint={`${threads.length}`}>
 <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {threads.map(t => (
 <div key={t.id} style={{ padding: "6px 8px" }}>
 <div style={{ fontSize: 12, fontWeight: 600, color: WS.ink, lineHeight: 1.3 }}>{t.title}</div>
 <div style={{ fontSize: 10.5, color: WS.ink3, marginTop: 2 }}>
              {t.sourceCount} fuentes · {t.citations} citas
 </div>
 </div>
        ))}
        {threads.length === 0 && <Empty>Sin investigaciones activas</Empty>}
 </div>
 </PanelShell>
  );
}

export function ActivityPanel({ workspaceId }: CommonProps) {
  const activity = getActivitySorted(workspaceRepository.getActivity(workspaceId)).slice(0, 16);
  return (
 <PanelShell title="Feed actividad" hint="stream">
 <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        overflowY: "auto",
        fontFamily: "'SF Mono','Fira Code',monospace",
        fontSize: 11.5,
      }}>
        {activity.map(e => (
 <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
 <span style={{ color: WS.ink3, minWidth: 50 }}>
              {new Date(e.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
 </span>
 <span style={{ color: TYPE_COLORS[e.type] ?? WS.ink3, fontWeight: 700, minWidth: 70, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              [{e.type}]
 </span>
 <span style={{ color: WS.ink2, flex: 1 }}>{e.title}</span>
 </div>
        ))}
        {activity.length === 0 && <Empty>Sin actividad reciente</Empty>}
 </div>
 </PanelShell>
  );
}

export function RadarMiniPanel({
  workspaceId,
  topOpportunities,
}: {
  workspaceId: string;
  topOpportunities: RadarOpportunity[];
}) {
  return (
 <PanelShell
      title="Radar oportunidades"
      hint={
 <Link
          href={`/workspaces/${workspaceId}/radar`}
          style={{ color: WS.accent, fontSize: 10.5, textDecoration: "none" }}
        >
          abrir →
 </Link>
      }
    >
 <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
        {topOpportunities.slice(0, 5).map(o => (
 <div key={o.id} style={{
            display: "grid",
            gridTemplateColumns: "32px 1fr 60px",
            gap: 8,
            alignItems: "center",
            padding: "6px 8px",
            background: WS.surface2,
            border: `1px solid ${WS.border}`,
            borderRadius: 8,
          }}>
 <span style={{ fontSize: 15, fontWeight: 700, color: WS.accent, letterSpacing: "-0.03em" }}>
              {o.score}
 </span>
 <span style={{ fontSize: 11.5, color: WS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {o.title}
 </span>
 <span style={{ fontSize: 9.5, color: WS.ink3, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>
              {o.horizon}
 </span>
 </div>
        ))}
        {topOpportunities.length === 0 && <Empty>Genera el radar</Empty>}
 </div>
 </PanelShell>
  );
}

export function ConsolePanel({
  workspaceId,
  onCommand,
  history,
  inputRef,
}: {
  workspaceId: string;
  onCommand: (cmd: string) => void;
  history: string[];
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
 <div style={{
      background: WS.surface,
      border: `1px solid ${WS.border}`,
      borderRadius: 12,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
      fontSize: 12,
      minHeight: 120,
    }}>
 <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: WS.ink3, textTransform: "uppercase" }}>
        ▸ Consola
 </div>
      {history.length > 0 && (
 <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 110, overflowY: "auto" }}>
          {history.map((l, i) => (
 <div key={i} style={{ color: l.startsWith(">") ? WS.accent : WS.ink2 }}>{l}</div>
          ))}
 </div>
      )}
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <span style={{ color: WS.accent, fontWeight: 700 }}>{workspaceId}&gt;</span>
 <input
          ref={inputRef}
          placeholder="help · briefing · radar · agent · esc para salir"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value.trim()) {
              onCommand(e.currentTarget.value.trim());
              e.currentTarget.value = "";
            }
          }}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: WS.ink, fontFamily: "inherit", fontSize: 12,
          }}
        />
 </div>
 </div>
  );
}

function PanelShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
 <div style={{
      background: WS.surface,
      border: `1px solid ${WS.border}`,
      borderRadius: 12,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minHeight: 0,
      overflow: "hidden",
    }}>
 <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: WS.ink3, textTransform: "uppercase",
      }}>
 <span>{title}</span>
        {hint && <span style={{ color: WS.ink3 }}>{hint}</span>}
 </div>
 <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
 </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: WS.ink3, fontSize: 12, padding: 8 }}>{children}</div>;
}

function severityRank(s: string): number {
  return s === "critical" ? 4 : s === "high" ? 3 : s === "normal" ? 2 : 1;
}
