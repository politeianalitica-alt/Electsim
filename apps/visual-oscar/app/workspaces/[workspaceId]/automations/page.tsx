"use client";

import { useEffect, useMemo, useState } from "react";
import { WS } from "@/lib/workspace/workspace-utils";
import { useWorkspaceAutomations } from "@/hooks/workspace/use-workspace-automations";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { AutomationCard } from "@/app/_components/workspace/cards/automation-card";
import AutomationBuilder from "@/app/_components/workspace/automation-builder";
import {
  getUserAutomations,
  toggleUserAutomation,
  deleteUserAutomation,
} from "@/lib/workspace/automations-store";
import type { WorkspaceAutomation } from "@/types/workspace";

const TEMPLATES = [
  { name: "Alerta de riesgo", description: "Cuando el risk score supera un umbral" },
  { name: "Informe programado", description: "Genera y distribuye un informe en fecha fija" },
  { name: "Notificación de evento", description: "Avisa al equipo ante un evento legislativo o mediático" },
  { name: "Acción de agente", description: "Ejecuta una tarea de ARIA según una condición" },
];

export default function AutomationsPage({ params }: { params: { workspaceId: string } }) {
  const ws = params.workspaceId;
  const { data: repoAutos } = useWorkspaceAutomations(ws);
  const [userAutos, setUserAutos] = useState<WorkspaceAutomation[]>([]);
  const [builder, setBuilder] = useState<string | null>(null); // null = cerrado · string = nombre preset

  useEffect(() => { setUserAutos(getUserAutomations(ws)); }, [ws]);

  const all = useMemo(() => [...userAutos, ...(repoAutos ?? [])], [userAutos, repoAutos]);
  const activeCount = all.filter(a => a.status === "active").length;
  const userIds = useMemo(() => new Set(userAutos.map(a => a.id)), [userAutos]);

  return (
    <div>
      <WorkspaceViewHeader
        view="automations"
        title="Automations"
        description="Reglas que disparan acciones automáticas en el workspace"
        badge={`${activeCount} activas`}
        actions={<button style={btnStyle} onClick={() => setBuilder("")}>+ Nueva automatización</button>}
      />

      {all.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 15, fontWeight: 700, color: WS.ink, marginBottom: 6 }}>Sin automatizaciones aún</div>
          <div style={{ fontSize: 13, color: WS.ink3, marginBottom: 16 }}>Crea una regla &laquo;si esto &rarr; entonces eso&raquo;.</div>
          <button style={btnStyle} onClick={() => setBuilder("")}>+ Nueva automatización</button>
        </div>
      ) : (
        <>
          <SectionLabel>Reglas configuradas</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {all.map(a => (
              <div key={a.id}>
                <AutomationCard automation={a} />
                {userIds.has(a.id) && (
                  <div style={{ display: "flex", gap: 14, padding: "5px 4px 0 4px" }}>
                    <button onClick={() => setUserAutos(toggleUserAutomation(ws, a.id))} style={linkStyle}>
                      {a.status === "active" ? "Pausar" : "Activar"}
                    </button>
                    <button onClick={() => setUserAutos(deleteUserAutomation(ws, a.id))} style={{ ...linkStyle, color: "#c42c2c" }}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <SectionLabel>Plantillas de automatización</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {TEMPLATES.map(t => (
          <button key={t.name} onClick={() => setBuilder(t.name)} style={templateStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: WS.ink, marginBottom: 3 }}>{t.name}</div>
            <div style={{ fontSize: 11.5, color: WS.ink3, lineHeight: 1.4 }}>{t.description}</div>
          </button>
        ))}
      </div>

      {builder !== null && (
        <AutomationBuilder
          workspaceId={ws}
          presetName={builder}
          onClose={() => setBuilder(null)}
          onCreated={(list) => setUserAutos(list)}
        />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: WS.ink3, textTransform: "uppercase", marginBottom: 12 }}>
      {children}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 14px", background: WS.accent, border: "none",
  borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: WS.font,
};

const linkStyle: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontSize: 11.5, fontWeight: 600, color: WS.ink3, fontFamily: WS.font,
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center", padding: "40px 20px", marginBottom: 28,
  background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 14,
};

const templateStyle: React.CSSProperties = {
  textAlign: "left", padding: "13px 15px", cursor: "pointer",
  background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 12,
  fontFamily: WS.font,
};
