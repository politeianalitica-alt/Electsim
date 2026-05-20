import type { WorkspaceAgendaEvent } from "@/types/workspace-agenda";
import { WidgetShell } from "./widget-shell";

interface AgendaWidgetProps {
  events: WorkspaceAgendaEvent[];
  workspaceId: string;
}

const TYPE_STYLES: Record<string, { fg: string; label: string }> = {
  meeting:     { fg: "rgb(129 140 248)", label: "Reunión" },
  deadline:    { fg: "rgb(248 113 113)", label: "Deadline" },
  alert:       { fg: "rgb(251 191 36)",  label: "Alerta" },
  publication: { fg: "rgb(74 222 128)",  label: "Publicación" },
};

export function AgendaWidget({ events, workspaceId }: AgendaWidgetProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
  const now = new Date();

  return (
    <WidgetShell
      title="Agenda · próximas 24h"
      badge={events.length}
      badgeVariant="info"
      action={{ label: "Ver semana", href: `/workspaces/${workspaceId}/terminal` }}
    >
      {sorted.length === 0 ? (
        <p className="text-sm text-[#6e6e73]">Sin eventos en las próximas 24 horas.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.slice(0, 6).map(ev => {
            const date = new Date(ev.startsAt);
            const isPast = date < now;
            const cfg = TYPE_STYLES[ev.type];
            return (
              <li
                key={ev.id}
                className="flex items-center gap-3 rounded-lg bg-[#fbfbfd] p-2.5 hover:bg-[#f5f5f7]/60 transition-colors"
              >
                <div className="flex flex-col items-center w-12 flex-none">
                  <span className={`text-xs font-bold ${isPast ? "text-[#8e8e93]" : "text-[#1d1d1f]"}`}>
                    {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[9px] text-[#6e6e73] uppercase">
                    {date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium leading-snug ${isPast ? "text-[#6e6e73] line-through" : "text-[#1d1d1f]"}`}>
                    {ev.title}
                  </p>
                  <span
                    className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: cfg.fg }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetShell>
  );
}
