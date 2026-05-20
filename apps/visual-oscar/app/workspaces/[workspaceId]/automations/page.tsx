"use client";

import { WS } from "@/lib/workspace/workspace-utils";
import { useWorkspaceAutomations } from "@/hooks/workspace/use-workspace-automations";
import { getActiveAutomations } from "@/lib/workspace/workspace-selectors";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { WorkspaceEmptyState } from "@/app/_components/workspace/workspace-empty-state";
import { AutomationCard } from "@/app/_components/workspace/cards/automation-card";
import { TemplateGrid } from "@/app/_components/workspace/lists/template-grid";

const TEMPLATES = [
  { id: "t1", icon: "AL", name: "Alerta de riesgo",       description: "Dispara acción cuando el risk score supera un umbral" },
  { id: "t2", icon: "RP", name: "Informe programado",     description: "Genera y distribuye un informe en fecha fija" },
  { id: "t3", icon: "NT", name: "Notificación de evento", description: "Avisa al equipo ante un evento legislativo o mediático" },
  { id: "t4", icon: "AG", name: "Acción de agente",       description: "Ejecuta una tarea de ARIA en base a una condición" },
];

export default function AutomationsPage({ params }: { params: { workspaceId: string } }) {
  const { data: automations, isEmpty } = useWorkspaceAutomations(params.workspaceId);

  if (isEmpty || !automations) {
    return (
      <WorkspaceEmptyState
        view="automations"
        eyebrow="Workspace · Automatizaciones"
        title="Sin automatizaciones aún"
        description="Crea reglas que disparen acciones automáticas en el workspace."
        cta="+ Nueva automatización"
      />
    );
  }

  const active = getActiveAutomations(automations);

  return (
    <div>
      <WorkspaceViewHeader
        view="automations"
        title="Automations"
        description="Reglas activas e integraciones automáticas del workspace"
        badge={`${active.length} activas`}
        actions={<button style={btnStyle}>+ Nueva automatización</button>}
      />

      <SectionLabel>Reglas configuradas</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {automations.map(a => <AutomationCard key={a.id} automation={a} />)}
      </div>

      <SectionLabel>Plantillas de automatización</SectionLabel>
      <TemplateGrid templates={TEMPLATES} />
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
