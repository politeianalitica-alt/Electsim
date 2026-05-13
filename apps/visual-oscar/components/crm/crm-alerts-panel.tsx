"use client";

import { useMemo } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { crmRepository } from "@/lib/crm/crm-repository";
import { buildCrmAlerts, type CrmAlert } from "@/lib/crm/crm-alerts";

const TONE: Record<CrmAlert["severity"], { bg: string; color: string }> = {
  info:   { bg: WS.accentSubtle, color: WS.accent },
  warn:   { bg: WS.warnSub,      color: WS.warn },
  danger: { bg: WS.dangerSub,    color: WS.danger },
};

export function CrmAlertsPanel({ workspaceId, onSelectActor }: {
  workspaceId: string;
  onSelectActor?: (actorId: string) => void;
}) {
  const alerts = useMemo(
    () => buildCrmAlerts(crmRepository.listActors(workspaceId)),
    [workspaceId]
  );

  if (alerts.length === 0) {
    return (
      <div style={{
        background: WS.successSub, border: `1px solid ${WS.success}33`,
        borderRadius: 12, padding: 14,
        fontSize: 12.5, color: WS.success, fontWeight: 600,
      }}>
        Sin alertas CRM · todas las relaciones tienen actividad reciente.
      </div>
    );
  }

  return (
    <div style={{
      background: WS.surface, border: `1px solid ${WS.border}`,
      borderRadius: 14, padding: 14,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: WS.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        Alertas CRM · {alerts.length}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {alerts.slice(0, 12).map(a => {
          const t = TONE[a.severity];
          return (
            <button
              key={a.id}
              onClick={() => onSelectActor?.(a.actorId)}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto", gap: 10,
                padding: "9px 12px",
                background: t.bg, border: `1px solid ${t.color}33`,
                borderRadius: 10, cursor: onSelectActor ? "pointer" : "default",
                textAlign: "left", fontFamily: WS.font,
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: WS.ink, marginBottom: 2 }}>
                  {a.actorName} · {a.title}
                </div>
                <div style={{ fontSize: 11.5, color: WS.ink3 }}>{a.hint}</div>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: t.color,
                letterSpacing: "0.06em", textTransform: "uppercase",
                alignSelf: "start", whiteSpace: "nowrap",
              }}>
                {a.severity}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
