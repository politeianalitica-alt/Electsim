"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import {
  TERMINAL_PANELS,
  TERMINAL_HOTKEYS,
  DEFAULT_LAYOUT,
  FOCUS_LAYOUT,
  WARROOM_LAYOUT,
  layoutForMode,
  type TerminalLayout,
  type TerminalMode,
  type TerminalPanelKind,
} from "@/lib/terminal/terminal-config";
import { useHotkeys } from "@/lib/terminal/use-hotkeys";
import {
  AlertsPanel,
  IssuesPanel,
  InboxPanel,
  AgendaPanel,
  ResearchPanel,
  ActivityPanel,
  RadarMiniPanel,
  ConsolePanel,
} from "@/components/terminal/terminal-panels";
import { useWorkspaceRadar } from "@/hooks/workspace/use-workspace-radar";
import { buildExecutiveContext } from "@/lib/workspace/analytics-builder";

const STORAGE_KEY = (workspaceId: string) => `politeia:terminal:layout:${workspaceId}`;

export default function TerminalPage({ params }: { params: { workspaceId: string } }) {
  const workspace = workspaceRepository.getWorkspaceById(params.workspaceId);
  const workspaceName = workspace?.name ?? "Politeia";

  const [layout, setLayout] = useState<TerminalLayout>(DEFAULT_LAYOUT);
  const [history, setHistory] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persistencia del modo en localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY(params.workspaceId));
      if (raw) setLayout(JSON.parse(raw) as TerminalLayout);
    } catch { /* ignore */ }
  }, [params.workspaceId]);

  function applyMode(mode: TerminalMode) {
    const next = layoutForMode(mode);
    setLayout(next);
    try { window.localStorage.setItem(STORAGE_KEY(params.workspaceId), JSON.stringify(next)); } catch { /* ignore */ }
  }

  const context = useMemo(
    () =>
      buildExecutiveContext({
        issues:        workspaceRepository.getIssues(params.workspaceId),
        actions:       workspaceRepository.getActions(params.workspaceId),
        alerts:        workspaceRepository.getAlerts(params.workspaceId),
        decisions:     workspaceRepository.getDecisions(params.workspaceId),
        documents:     workspaceRepository.getDocuments(params.workspaceId),
        research:      workspaceRepository.getResearchThreads(params.workspaceId),
        projects:      workspaceRepository.getProjects(params.workspaceId),
        opportunities: workspaceRepository.getOpportunities(params.workspaceId),
      }),
    [params.workspaceId]
  );

  const { batch: radarBatch } = useWorkspaceRadar({
    workspaceId: params.workspaceId,
    workspaceName,
    context,
    autoLoad: false,
  });

  // Hotkeys ------------------------------------------------------------
  useHotkeys([
    { combo: "g 1", ignoreInInputs: true, handler: () => applyMode("focus") },
    { combo: "g 2", ignoreInInputs: true, handler: () => applyMode("warroom") },
    { combo: "g 3", ignoreInInputs: true, handler: () => applyMode("compact") },
    { combo: "?",   ignoreInInputs: true, handler: () => setShowHelp(h => !h) },
    { combo: "/",   ignoreInInputs: true, handler: () => inputRef.current?.focus() },
    { combo: "esc",                       handler: () => { setShowHelp(false); inputRef.current?.blur(); } },
  ]);

  function runCommand(cmd: string) {
    const norm = cmd.toLowerCase();
    setHistory(h => [...h, `> ${cmd}`]);
    if (norm === "help") {
      setHistory(h => [...h, "comandos: help · clear · focus · warroom · compact · radar · briefing"]);
    } else if (norm === "clear") {
      setHistory([]);
    } else if (norm === "focus")   { applyMode("focus");   setHistory(h => [...h, "modo Focus activado"]); }
    else if   (norm === "warroom") { applyMode("warroom"); setHistory(h => [...h, "modo War Room activado"]); }
    else if   (norm === "compact") { applyMode("compact"); setHistory(h => [...h, "modo Compact activado"]); }
    else if   (norm === "radar")   { setHistory(h => [...h, "ir a /workspaces/" + params.workspaceId + "/radar"]); }
    else if   (norm === "briefing"){ setHistory(h => [...h, "ir a /briefing"]); }
    else {
      setHistory(h => [...h, `comando desconocido: '${cmd}' (usa 'help')`]);
    }
  }

  const visibleSet = useMemo(() => new Set(layout.visible), [layout.visible]);

  return (
    <div>
      <WorkspaceViewHeader
        view="terminal"
        eyebrow="Workspace · Terminal"
        title="Terminal"
        description={`Vista operativa intensiva · ${workspaceName} · modo ${labelFor(layout.mode)}`}
        actions={
          <div style={{ display: "flex", gap: 6 }}>
            <ModeBtn active={layout.mode === "focus"}   onClick={() => applyMode("focus")}  >Focus</ModeBtn>
            <ModeBtn active={layout.mode === "warroom"} onClick={() => applyMode("warroom")}>War Room</ModeBtn>
            <ModeBtn active={layout.mode === "compact"} onClick={() => applyMode("compact")}>Compact</ModeBtn>
            <button
              onClick={() => setShowHelp(true)}
              style={{
                padding: "4px 10px",
                background: "transparent",
                border: `1px solid ${WS.border}`,
                borderRadius: 8,
                color: WS.ink2,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: WS.font,
              }}
            >
              ? atajos
            </button>
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          gridAutoRows: layout.mode === "compact" ? 200 : 240,
        }}
      >
        {TERMINAL_PANELS.filter(p => visibleSet.has(p.id)).map(p => (
          <div
            key={p.id}
            style={{
              gridColumn: `span ${p.span}`,
              gridRow:    `span ${p.rows}`,
              minHeight: 0,
            }}
          >
            <PanelByKind kind={p.id} workspaceId={params.workspaceId} radarTop={radarBatch?.opportunities ?? []} onCommand={runCommand} history={history} inputRef={inputRef} />
          </div>
        ))}
      </div>

      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowHelp(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: WS.surface,
              border: `1px solid ${WS.borderStrong}`,
              borderRadius: 14,
              padding: 22,
              minWidth: 340,
              fontFamily: WS.font,
              color: WS.ink,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Atajos del Terminal</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 6, columnGap: 14, fontSize: 12 }}>
              {Object.entries(TERMINAL_HOTKEYS).map(([combo, label]) => (
                <div key={combo} style={{ display: "contents" }}>
                  <kbd style={{
                    background: WS.surface2, border: `1px solid ${WS.border}`,
                    borderRadius: 6, padding: "2px 8px", color: WS.ink2,
                    fontFamily: "ui-monospace, monospace", fontSize: 11,
                  }}>{combo}</kbd>
                  <span style={{ color: WS.ink2 }}>{label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                marginTop: 14, padding: "6px 14px", background: WS.accent,
                color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              Cerrar (esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelByKind({
  kind,
  workspaceId,
  radarTop,
  onCommand,
  history,
  inputRef,
}: {
  kind: TerminalPanelKind;
  workspaceId: string;
  radarTop: any[];
  onCommand: (cmd: string) => void;
  history: string[];
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  switch (kind) {
    case "alerts":   return <AlertsPanel workspaceId={workspaceId} />;
    case "issues":   return <IssuesPanel workspaceId={workspaceId} />;
    case "inbox":    return <InboxPanel workspaceId={workspaceId} />;
    case "agenda":   return <AgendaPanel workspaceId={workspaceId} />;
    case "research": return <ResearchPanel workspaceId={workspaceId} />;
    case "activity": return <ActivityPanel workspaceId={workspaceId} />;
    case "radar":    return <RadarMiniPanel workspaceId={workspaceId} topOpportunities={radarTop} />;
    case "console":  return <ConsolePanel  workspaceId={workspaceId} onCommand={onCommand} history={history} inputRef={inputRef} />;
  }
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        background: active ? WS.accent : "transparent",
        color: active ? "#fff" : WS.ink2,
        border: `1px solid ${active ? WS.accent : WS.border}`,
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: WS.font,
      }}
    >
      {children}
    </button>
  );
}

function labelFor(mode: TerminalMode): string {
  if (mode === "focus") return "Focus";
  if (mode === "warroom") return "War Room";
  return "Compact";
}
