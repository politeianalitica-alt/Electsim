import type { WorkspaceCanvasSummary } from "@/types/workspace";
import { WidgetShell } from "./widget-shell";

export function CanvasSummaryWidget({
  canvas,
  workspaceId,
}: {
  canvas: WorkspaceCanvasSummary | null;
  workspaceId: string;
}) {
  if (!canvas) {
    return (
 <WidgetShell title="Canvas activo">
 <p className="text-sm text-[#6e6e73]">Sin canvas activo.</p>
 </WidgetShell>
    );
  }

  const isFresh =
    Date.now() - new Date(canvas.updatedAt).getTime() < 24 * 3600_000;

  return (
 <WidgetShell
      title="Canvas activo"
      badge={isFresh ? "Nuevo" : undefined}
      badgeVariant="info"
      action={{ label: "Abrir canvas", href: `/workspaces/${workspaceId}/canvas` }}
    >
 <p className="mb-3 text-sm font-semibold text-[#1d1d1f]">{canvas.title}</p>
 <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { label: "Objetos",    value: canvas.objectCount,     color: "rgb(148 163 184)" },
          { label: "Conexiones", value: canvas.connectionCount, color: "rgb(148 163 184)" },
          { label: "Hipótesis",  value: canvas.hypothesisCount, color: "rgb(148 163 184)" },
          { label: "Abiertas",   value: canvas.openHypotheses,  color: "rgb(251 191 36)" },
        ].map(s => (
 <div key={s.label} className="rounded-lg bg-[#fbfbfd] p-2 text-center">
 <div className="text-base font-bold" style={{ color: s.color }}>
              {s.value}
 </div>
 <div className="text-[9px] font-semibold uppercase tracking-wider text-[#6e6e73]">
              {s.label}
 </div>
 </div>
        ))}
 </div>
 <p className="text-[10px] text-[#6e6e73]">
        Actualizado{" "}
        {new Date(canvas.updatedAt).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        })}
 </p>
 </WidgetShell>
  );
}
