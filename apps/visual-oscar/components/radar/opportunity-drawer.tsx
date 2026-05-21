"use client";

import { WS } from "@/lib/workspace/workspace-utils";
import type { RadarOpportunity } from "@/types/radar";

interface Props {
  opportunity: RadarOpportunity | null;
  onClose: () => void;
  onSendToAgent?: (opp: RadarOpportunity) => void;
  onCreateAction?: (opp: RadarOpportunity) => void;
  onArchive?: (opp: RadarOpportunity) => void;
}

export function OpportunityDrawer({
  opportunity,
  onClose,
  onSendToAgent,
  onCreateAction,
  onArchive,
}: Props) {
  if (!opportunity) return null;
  return (
 <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        background: WS.surface,
        borderLeft: `1px solid ${WS.borderStrong}`,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        fontFamily: WS.font,
        color: WS.ink,
        boxShadow: "-12px 0 40px rgba(0,0,0,0.45)",
      }}
    >
 <div style={{ padding: "14px 18px", borderBottom: `1px solid ${WS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <div>
 <div style={{ fontSize: 10.5, color: WS.ink3, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
            Oportunidad · {opportunity.category}
 </div>
 <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{opportunity.title}</div>
 </div>
 <button
          onClick={onClose}
          style={{
            border: `1px solid ${WS.border}`,
            background: "transparent",
            color: WS.ink2,
            borderRadius: 8,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Cerrar
 </button>
 </div>

 <div style={{ padding: 18, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
 <div style={{ display: "flex", gap: 14 }}>
 <Metric label="Score" value={`${opportunity.score}`} color={WS.accent} />
 <Metric label="Impacto" value={opportunity.impact} />
 <Metric label="Horizonte" value={opportunity.horizon} />
 <Metric label="Confianza" value={`${Math.round(opportunity.confidence * 100)}%`} />
 </div>

 <section>
 <Title>Razonamiento</Title>
 <p style={{ fontSize: 12.5, color: WS.ink2, lineHeight: 1.55, margin: 0 }}>{opportunity.rationale}</p>
 </section>

 <section>
 <Title>Acciones recomendadas</Title>
 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {opportunity.actions.map((a, i) => (
 <div
                key={i}
                style={{
                  background: WS.surface2,
                  border: `1px solid ${WS.border}`,
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
 <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.label}</div>
 <div style={{ fontSize: 11, color: WS.ink3 }}>
                  {a.timeline}{a.owner ? ` · ${a.owner}` : ""}
 </div>
 </div>
            ))}
 </div>
 </section>

        {opportunity.relatedIds.length > 0 && (
 <section>
 <Title>Entidades relacionadas</Title>
 <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {opportunity.relatedIds.map(id => (
 <span
                  key={id}
                  style={{
                    fontSize: 10.5,
                    color: WS.ink2,
                    background: WS.surface2,
                    border: `1px solid ${WS.border}`,
                    padding: "3px 8px",
                    borderRadius: 99,
                    fontFamily: "ui-monospace, SF Mono, monospace",
                  }}
                >
                  {id}
 </span>
              ))}
 </div>
 </section>
        )}

 <section>
 <Title>Quick actions</Title>
 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
 <ActionButton onClick={() => onSendToAgent?.(opportunity)}>Enviar al Agente IA</ActionButton>
 <ActionButton onClick={() => onCreateAction?.(opportunity)} variant="primary">
              Crear acción en el workspace
 </ActionButton>
 <ActionButton onClick={() => onArchive?.(opportunity)} variant="ghost">Archivar</ActionButton>
 </div>
 </section>

 <div style={{ fontSize: 10, color: WS.ink3, paddingTop: 6 }}>
          Generado por {opportunity.source === "ollama" || opportunity.source === "anthropic" ? "PoliteIA" : "mock"} · {new Date(opportunity.generatedAt).toLocaleString("es-ES")}
 </div>
 </div>
 </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
 <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: WS.ink3, marginBottom: 8 }}>
      {children}
 </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: 17, fontWeight: 700, color: color ?? WS.ink, letterSpacing: "-0.03em" }}>{value}</div>
 <div style={{ fontSize: 10, color: WS.ink3, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
 </div>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: WS.accent,    color: "#fff",  border: "none" },
    secondary: { background: WS.surface2,  color: WS.ink,  border: `1px solid ${WS.border}` },
    ghost:     { background: "transparent",color: WS.ink2, border: `1px solid ${WS.border}` },
  };
  return (
 <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: WS.font,
        ...styles[variant],
      }}
    >
      {children}
 </button>
  );
}
