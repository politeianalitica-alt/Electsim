"use client";

import { useState } from "react";
import { WS, priorityColor } from "@/lib/workspace/workspace-utils";
import { useWorkspaceTerminal } from "@/hooks/workspace/use-workspace-terminal";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { getActivitySorted } from "@/lib/workspace/workspace-selectors";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";

const TYPE_COLORS: Record<string, string> = {
  alert:      WS.danger,
  automation: WS.success,
  doc:        WS.accent,
  research:   "#a78bfa",
  issue:      WS.warn,
  decision:   WS.accent,
  action:     WS.ink2,
};

export default function TerminalPage({ params }: { params: { workspaceId: string } }) {
  const { data } = useWorkspaceTerminal(params.workspaceId);
  const workspace = workspaceRepository.getWorkspaceById(params.workspaceId);
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  function handleCmd(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !cmd.trim()) return;
    setHistory(h => [...h, `> ${cmd}`, `[sistema] Comando en simulación: '${cmd}'`]);
    setCmd("");
  }

  const activity = getActivitySorted(data?.activity ?? []);
  const alerts = data?.alerts ?? [];

  return (
    <div>
      <WorkspaceViewHeader
        view="terminal"
        title="Terminal"
        description={`Vista operativa intensiva · ${workspace?.name ?? params.workspaceId}`}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        {/* Feed de actividad */}
        <div style={{
          background: WS.surface2, border: `1px solid ${WS.border}`,
          borderRadius: 14, padding: "16px",
          fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
          fontSize: 12,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: WS.ink3, textTransform: "uppercase", marginBottom: 12 }}>
            ▸ Feed de actividad
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 360, overflowY: "auto" }}>
            {activity.slice(0, 14).map((entry) => (
              <div key={entry.id} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span style={{ color: WS.ink3, flexShrink: 0, fontSize: 11, minWidth: 60 }}>
                  {new Date(entry.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ color: TYPE_COLORS[entry.type] ?? WS.ink3, flexShrink: 0, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", minWidth: 84 }}>
                  [{entry.type}]
                </span>
                <span style={{ color: WS.ink2, lineHeight: 1.5, flex: 1 }}>{entry.title}</span>
              </div>
            ))}
            {activity.length === 0 && (
              <div style={{ color: WS.ink3, padding: 12 }}>Sin actividad reciente</div>
            )}
          </div>
        </div>

        {/* Alertas activas */}
        <div style={{
          background: WS.surface2, border: `1px solid ${WS.border}`,
          borderRadius: 14, padding: "16px",
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: WS.ink3, textTransform: "uppercase", marginBottom: 12 }}>
            ▸ Alertas activas
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map(a => (
              <div key={a.id} style={{
                padding: "10px 12px",
                background: WS.bg, border: `1px solid ${WS.border}`,
                borderRadius: 9, borderLeft: `3px solid ${priorityColor(a.severity)}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: WS.ink, marginBottom: 4, lineHeight: 1.3 }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 10.5, color: WS.ink3 }}>
                  {a.source} · {new Date(a.createdAt).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div style={{ color: WS.ink3, padding: 12, fontSize: 12 }}>Sin alertas activas</div>
            )}
          </div>
        </div>
      </div>

      {/* Consola */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          background: WS.surface2, border: `1px solid ${WS.border}`,
          borderRadius: 14, padding: "14px 16px",
          fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
          fontSize: 12,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: WS.ink3, textTransform: "uppercase", marginBottom: 12 }}>
            ▸ Consola de comandos
          </div>
          {history.length > 0 && (
            <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              {history.map((line, i) => (
                <div key={i} style={{ color: line.startsWith(">") ? WS.accent : WS.ink3 }}>{line}</div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: WS.accent, fontWeight: 700 }}>{params.workspaceId}&gt;</span>
            <input
              value={cmd}
              onChange={e => setCmd(e.target.value)}
              onKeyDown={handleCmd}
              placeholder="help, risk-status, briefing, agent-run …"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: WS.ink, fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 12,
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["risk-status", "briefing", "agent-run", "index-boe", "list-issues", "team-status"].map(c => (
            <button
              key={c}
              onClick={() => setCmd(c)}
              style={{
                padding: "4px 10px", background: WS.surface, border: `1px solid ${WS.border}`,
                borderRadius: 6, color: WS.ink3, fontSize: 11,
                cursor: "pointer", fontFamily: "'SF Mono',monospace",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
