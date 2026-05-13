"use client";

import { WS } from "@/lib/workspace/workspace-utils";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";

const DELIVERABLES = [
  { id: "rep1", title: "Briefing semanal · 13 may 2026",          format: "PDF",  pages: 6,   status: "Listo",       client: "Dirección", date: "hoy" },
  { id: "rep2", title: "Informe riesgo político Q2 2026",          format: "PDF",  pages: 18,  status: "En borrador", client: "Comité directivo", date: "hace 1d" },
  { id: "rep3", title: "Análisis Electoral — Escenario moción",    format: "PPTX", pages: 12,  status: "Listo",       client: "Estrategia", date: "hace 2d" },
  { id: "rep4", title: "Nota de inteligencia: Junts y presupuestos",format: "DOC", pages: 4,   status: "Revisión",    client: "Dir. Comunicación", date: "hace 3d" },
  { id: "rep5", title: "Resumen ejecutivo CCAA · abril 2026",      format: "PDF",  pages: 8,   status: "Listo",       client: "Dirección", date: "hace 1sem" },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "Listo":       { bg: WS.successSub, color: WS.success },
  "En borrador": { bg: WS.surface2,   color: WS.ink3 },
  "Revisión":    { bg: WS.accentSubtle, color: WS.accent },
};

export default function ReportingPage({ params }: { params: { workspaceId: string } }) {
  return (
    <div>
      <WorkspaceViewHeader
        view="reporting"
        title="Reporting"
        description="Entregables, informes y distribución al cliente"
        badge={`${DELIVERABLES.length} documentos`}
        actions={
          <>
            <button style={{ ...btnStyle, background: WS.surface2, color: WS.ink2, border: `1px solid ${WS.border}` }}>
              Generar con IA
            </button>
            <button style={btnStyle}>+ Nuevo informe</button>
          </>
        }
      />

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Listos",        value: DELIVERABLES.filter(d => d.status === "Listo").length,       color: WS.success },
          { label: "En revisión",   value: DELIVERABLES.filter(d => d.status === "Revisión").length,    color: WS.accent },
          { label: "En borrador",   value: DELIVERABLES.filter(d => d.status === "En borrador").length, color: WS.ink3 },
          { label: "Este mes",      value: DELIVERABLES.length,                                          color: WS.ink2 },
        ].map(s => (
          <div key={s.label} style={{
            background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 11, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10.5, color: WS.ink3, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Deliverables table */}
      <div style={{
        background: WS.surface, border: `1px solid ${WS.border}`,
        borderRadius: 14, overflow: "hidden",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 80px 60px 110px 120px 80px",
          padding: "8px 16px",
          fontSize: 10.5, fontWeight: 700, color: WS.ink3,
          letterSpacing: "0.06em", textTransform: "uppercase",
          borderBottom: `1px solid ${WS.border}`,
        }}>
          <span>Documento</span>
          <span>Formato</span>
          <span>Págs.</span>
          <span>Estado</span>
          <span>Cliente</span>
          <span>Fecha</span>
        </div>

        {DELIVERABLES.map((d, i) => {
          const sc = STATUS_COLORS[d.status] ?? { bg: WS.surface2, color: WS.ink3 };
          return (
            <div key={d.id} style={{
              display: "grid", gridTemplateColumns: "1fr 80px 60px 110px 120px 80px",
              padding: "11px 16px", alignItems: "center",
              borderTop: i > 0 ? `1px solid ${WS.border}` : "none",
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: WS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.title}
              </span>
              <span style={{
                fontSize: 10.5, fontWeight: 700, color: WS.ink3,
                background: WS.surface2, padding: "2px 8px", borderRadius: 5, width: "fit-content",
              }}>
                {d.format}
              </span>
              <span style={{ fontSize: 12, color: WS.ink3 }}>{d.pages}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600, background: sc.bg, color: sc.color, padding: "2px 9px", borderRadius: 99, width: "fit-content" }}>
                {d.status}
              </span>
              <span style={{ fontSize: 12, color: WS.ink3 }}>{d.client}</span>
              <span style={{ fontSize: 11.5, color: WS.ink3 }}>{d.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 14px", background: WS.accent, border: "none",
  borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: WS.font,
};
