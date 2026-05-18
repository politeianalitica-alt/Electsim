"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { buildExecutiveContext } from "@/lib/workspace/analytics-builder";
import type { DecisionSimulation, DecisionOutcome } from "@/types/simulator";
import BrainPanelClient from "@/app/_components/workspace/brain-panel-client";

const STORAGE_KEY = (ws: string) => `politeia:simulator:log:${ws}`;
const HISTORY_LIMIT = 12;

const EXAMPLES = [
  "¿Qué pasa si apoyo la enmienda de Junts a la senda de estabilidad?",
  "¿Qué pasa si salgo a responder en Twitter al líder de la oposición esta tarde?",
  "¿Qué pasa si bloqueo la moción de censura en la Comisión?",
  "¿Qué pasa si pacto con ERC el calendario de presupuestos?",
];

export default function SimulatorPage({ params }: { params: { workspaceId: string } }) {
  const workspace = workspaceRepository.getWorkspaceById(params.workspaceId);
  const workspaceName = workspace?.name ?? "Politeia";

  const [scenario, setScenario] = useState("");
  const [sim, setSim] = useState<DecisionSimulation | null>(null);
  const [history, setHistory] = useState<DecisionSimulation[]>([]);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore history
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY(params.workspaceId));
      if (raw) setHistory(JSON.parse(raw) as DecisionSimulation[]);
    } catch { /* ignore */ }
  }, [params.workspaceId]);

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

  const run = useCallback(async (sc: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: params.workspaceId, scenario: sc, context, workspaceName }),
        signal: ctrl.signal,
      });
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const data: DecisionSimulation = await res.json();
      setSim(data);
      const nextHistory = [data, ...history.filter(h => h.id !== data.id)].slice(0, HISTORY_LIMIT);
      setHistory(nextHistory);
      try { window.localStorage.setItem(STORAGE_KEY(params.workspaceId), JSON.stringify(nextHistory)); } catch { /* ignore */ }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [context, history, params.workspaceId, workspaceName]);

  return (
    <div>
      <WorkspaceViewHeader
        view="simulator"
        title="Simulador de Decisión"
        description="Antes de actuar · 3 outcomes con probabilidades + contramovimientos · Ollama"
        badge={sim ? `${sim.outcomes.length} outcomes` : ""}
      />

      {/* Input */}
      <div style={{
        background: WS.surface, border: `1px solid ${WS.border}`,
        borderRadius: 14, padding: 16, marginBottom: 14,
      }}>
        <label style={{
          display: "block", fontSize: 10.5, fontWeight: 700, color: WS.ink3,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
        }}>
          Escenario a simular
        </label>
        <textarea
          value={scenario}
          onChange={e => setScenario(e.target.value)}
          placeholder="Ej: ¿Qué pasa si apoyo esta enmienda? · ¿Qué pasa si salgo a responder en Twitter?"
          rows={2}
          style={{
            width: "100%", padding: "10px 12px",
            border: `1px solid ${WS.border}`, borderRadius: 10,
            background: WS.bg, color: WS.ink, fontFamily: WS.font,
            fontSize: 13.5, resize: "vertical", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => run(scenario)}
            disabled={isBusy || !scenario.trim()}
            style={{
              padding: "8px 16px", background: WS.accent, border: "none",
              borderRadius: 9, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: WS.font, opacity: isBusy || !scenario.trim() ? .5 : 1,
            }}
          >
            {isBusy ? "Simulando…" : "Ejecutar simulación"}
          </button>
          <span style={{ fontSize: 10.5, color: WS.ink3, marginLeft: 4 }}>o prueba:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => { setScenario(ex); void run(ex); }}
              style={{
                padding: "4px 10px", background: WS.surface2, border: `1px solid ${WS.border}`,
                borderRadius: 99, color: WS.ink2, fontSize: 11, cursor: "pointer", fontFamily: WS.font,
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: WS.dangerSub, color: WS.danger, padding: 12, borderRadius: 10, fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Outcomes */}
      {sim && (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14,
          }}>
            {sim.outcomes.map(o => <OutcomeCard key={o.id} outcome={o} />)}
          </div>

          {/* Recomendación + flags */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14,
          }}>
            <div style={{
              background: WS.accentSubtle, border: `1px solid ${WS.accent}33`,
              borderRadius: 14, padding: 16,
            }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: WS.accent, letterSpacing: "0.08em",
                textTransform: "uppercase", marginBottom: 8,
              }}>
                Recomendación del agente
              </div>
              <p style={{ fontSize: 13.5, color: WS.ink, lineHeight: 1.55, margin: 0 }}>
                {sim.recommendation}
              </p>
            </div>
            <div style={{
              background: WS.dangerSub, border: `1px solid ${WS.danger}33`,
              borderRadius: 14, padding: 16,
            }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, color: WS.danger, letterSpacing: "0.08em",
                textTransform: "uppercase", marginBottom: 8,
              }}>
                Banderas rojas
              </div>
              {sim.riskFlags.length === 0
                ? <span style={{ fontSize: 12, color: WS.ink3 }}>Sin riesgos materiales detectados.</span>
                : <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: WS.ink2, lineHeight: 1.5 }}>
                    {sim.riskFlags.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>}
            </div>
          </div>

          {/* Contramovimientos */}
          <div style={{
            background: WS.surface, border: `1px solid ${WS.border}`,
            borderRadius: 14, padding: 16, marginBottom: 14,
          }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: WS.ink3, letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: 10,
            }}>
              War gaming · contramovimientos previstos
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sim.counterMoves.map((c, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "120px 1fr",
                  gap: 12, padding: "10px 12px", background: WS.surface2,
                  border: `1px solid ${WS.border}`, borderRadius: 10,
                }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: WS.accent, alignSelf: "start", marginTop: 2 }}>
                    {c.actor}
                  </span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: WS.ink, marginBottom: 3 }}>{c.move}</div>
                    <div style={{ fontSize: 11.5, color: WS.ink3, lineHeight: 1.4 }}>{c.rationale}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, color: WS.ink3, marginBottom: 24 }}>
            Generado {new Date(sim.generatedAt).toLocaleString("es-ES")} · fuente: {sim.source}
            {sim.source === "mock" && " · configura OLLAMA_URL para simulación real"}
          </div>
        </>
      )}

      {/* Decision log */}
      {history.length > 0 && (
        <div style={{
          background: WS.surface, border: `1px solid ${WS.border}`,
          borderRadius: 14, padding: 16,
        }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: WS.ink3, letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 10,
          }}>
            Decision log · últimas {history.length} simulaciones
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {history.map(h => (
              <button
                key={h.id}
                onClick={() => { setScenario(h.scenario); setSim(h); }}
                style={{
                  display: "grid", gridTemplateColumns: "120px 1fr 60px",
                  gap: 12, padding: "8px 10px", background: "transparent",
                  border: "none", borderBottom: `1px solid ${WS.border}`,
                  textAlign: "left", cursor: "pointer", fontFamily: WS.font,
                }}
              >
                <span style={{ fontSize: 11, color: WS.ink3 }}>
                  {new Date(h.loggedAt ?? h.generatedAt).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ fontSize: 12.5, color: WS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {h.scenario}
                </span>
                <span style={{ fontSize: 10, color: WS.ink3, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "right" }}>
                  {h.source}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────
          GroqBrain · forecast escenarios + interpretación del simulador.
          Se invoca tras tener una simulación lista; el cliente decide
          pulsar el botón para no consumir tokens en el render.
         ─────────────────────────────────────────────────────────────── */}
      {sim && (
        <div style={{ marginTop: 20 }}>
          <BrainPanelClient
            title="Análisis IA · escenarios futuros del simulador"
            tool="forecast_political_scenario"
            kwargs={{
              topic: scenario || "decisión simulada",
              current_situation: `Workspace ${workspaceName}. Escenario simulado: ${scenario}. Outcomes generados: ${sim.outcomes
                .map(o => `${o.id}=${o.probability}`)
                .join(", ")}`,
              time_horizon: "3-6 meses",
              constraints: [],
            }}
            autoRun={false}
            buttonLabel="Pedir escenarios + watch list al brain"
          />
          <BrainPanelClient
            title="Análisis IA · interpretación razonada del simulador"
            tool="interpret_simulation_results"
            kwargs={{
              simulation_type: "decision_simulator_workspace",
              inputs_summary: `Escenario: ${scenario}. Workspace: ${workspaceName}.`,
              results_payload: { outcomes: sim.outcomes, recommendation: (sim as unknown as Record<string, unknown>).recommendation },
              audience: "directivo político",
            }}
            autoRun={false}
            buttonLabel="Pedir takeaway + drivers + acciones"
          />
        </div>
      )}
    </div>
  );
}

function OutcomeCard({ outcome }: { outcome: DecisionOutcome }) {
  const accent =
    outcome.id === "optimo"  ? WS.success
    : outcome.id === "adverso" ? WS.danger
    : WS.accent;
  const accentSub =
    outcome.id === "optimo"  ? WS.successSub
    : outcome.id === "adverso" ? WS.dangerSub
    : WS.accentSubtle;

  return (
    <div style={{
      background: WS.surface,
      border: `1px solid ${WS.border}`,
      borderTop: `3px solid ${accent}`,
      borderRadius: 14,
      padding: 16,
      display: "flex", flexDirection: "column", gap: 10,
      minHeight: 320,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, color: accent, letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          {outcome.label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: accent, letterSpacing: "-0.04em", lineHeight: 1 }}>
          {outcome.probability}%
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
          background: accentSub, color: accent, textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {outcome.likelihood}
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: WS.ink2, lineHeight: 1.5, margin: 0, flex: 1 }}>
        {outcome.narrative}
      </p>

      {/* Impactos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <ImpactBar label="Opinión pública" value={outcome.impactPublic} />
        <ImpactBar label="Interno" value={outcome.impactInternal} />
      </div>

      {/* Signals */}
      {outcome.signals.length > 0 && (
        <div>
          <div style={{
            fontSize: 9.5, fontWeight: 700, color: WS.ink3, letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 4,
          }}>
            Señales tempranas
          </div>
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: WS.ink3, lineHeight: 1.5 }}>
            {outcome.signals.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ImpactBar({ label, value }: { label: string; value: number }) {
  const abs = Math.min(100, Math.abs(value));
  const color = value >= 0 ? WS.success : WS.danger;
  const sign = value >= 0 ? "+" : "";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: WS.ink3, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{sign}{value}</span>
      </div>
      <div style={{ position: "relative", height: 4, background: WS.surface2, borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          position: "absolute",
          left: value >= 0 ? "50%" : `${50 - abs / 2}%`,
          width: `${abs / 2}%`,
          height: "100%", background: color,
        }} />
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: WS.border,
        }} />
      </div>
    </div>
  );
}
