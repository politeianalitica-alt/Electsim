"use client";

/**
 * Ajustes del workspace — el enlace del footer del sidebar apuntaba aquí
 * desde el principio pero la ruta no existía (404). Página de solo lectura
 * sobre el repositorio actual; la gestión completa (renombrar, archivar,
 * miembros) llegará al conectar el backend.
 */

import { WS } from "@/lib/workspace/workspace-utils";
import { workspaceRepository } from "@/lib/workspace/workspace-repository";

export default function WorkspaceSettingsPage({ params }: { params: { workspaceId: string } }) {
  const ws = workspaceRepository.getWorkspaceById(params.workspaceId);
  const members = workspaceRepository.getMembers(params.workspaceId);

  return (
 <div style={{ fontFamily: WS.font, maxWidth: 720 }}>
 <header style={{ marginBottom: 20 }}>
 <span style={{ fontSize: 10, color: WS.ink3, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
          Workspace · Configuración
 </span>
 <h1 style={{ fontFamily: WS.fontDisplay, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: "4px 0 4px", color: WS.ink }}>
          Ajustes
 </h1>
 <p style={{ margin: 0, fontSize: 13, color: WS.ink3 }}>
          Información del workspace. La gestión completa (renombrar, archivar, invitar miembros)
          se habilitará al conectar el backend.
 </p>
 </header>

      {!ws && (
 <div style={{ padding: 16, borderRadius: 12, background: WS.warnSub, color: WS.warn, fontSize: 13 }}>
          El workspace “{params.workspaceId}” no existe en el repositorio actual.
 </div>
      )}

      {ws && (
 <div style={{ background: WS.surface, border: `1px solid ${WS.border}`, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["Nombre", ws.name],
            ["Identificador", ws.id],
            ["Descripción", ws.description],
            ["Modo", ws.mode === "real" ? "Activo (datos reales)" : "Demo"],
            ["Sector", ws.sector ?? "—"],
            ["Etiquetas", ws.tags.length ? ws.tags.join(" · ") : "—"],
            ["Miembros", members.length ? members.map(m => m.name).join(", ") : "Sin miembros registrados"],
          ].map(([label, value]) => (
 <div key={label as string} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, fontSize: 13 }}>
 <span style={{ color: WS.ink3, fontWeight: 600 }}>{label}</span>
 <span style={{ color: WS.ink }}>{value}</span>
 </div>
          ))}
 </div>
      )}
 </div>
  );
}
