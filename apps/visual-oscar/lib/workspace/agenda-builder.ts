import type { WorkspaceAgendaEvent } from "@/types/workspace-agenda";

export const demoAgenda: WorkspaceAgendaEvent[] = [
  { id: "ag_001", workspaceId: "ws_espana_2026", title: "Comité estrategia 9:00",                   startsAt: "2026-05-13T09:00:00Z", type: "meeting",     actorIds: ["u1","u3","u5"] },
  { id: "ag_002", workspaceId: "ws_espana_2026", title: "Deadline Q&A entrevista TVE",              startsAt: "2026-05-13T11:30:00Z", type: "deadline",    actorIds: ["u3"] },
  { id: "ag_003", workspaceId: "ws_espana_2026", title: "Alerta programada: pleno presupuestos",    startsAt: "2026-05-13T14:00:00Z", type: "alert" },
  { id: "ag_004", workspaceId: "ws_espana_2026", title: "Reunión bilateral con Junts",              startsAt: "2026-05-13T16:00:00Z", type: "meeting",     actorIds: ["u1","u2"] },
  { id: "ag_005", workspaceId: "ws_espana_2026", title: "Publicación nota fact-check bulos",         startsAt: "2026-05-13T18:30:00Z", type: "publication", actorIds: ["u3"] },
  { id: "ag_006", workspaceId: "ws_espana_2026", title: "Briefing matinal 14 mayo",                 startsAt: "2026-05-14T07:30:00Z", type: "publication" },
];

export function getAgendaForRange(events: WorkspaceAgendaEvent[], from: Date, to: Date) {
  return events
    .filter(e => {
      const t = new Date(e.startsAt).getTime();
      return t >= from.getTime() && t <= to.getTime();
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function getNext24h(events: WorkspaceAgendaEvent[], now = new Date()) {
  const to = new Date(now.getTime() + 24 * 3600_000);
  return getAgendaForRange(events, now, to);
}
