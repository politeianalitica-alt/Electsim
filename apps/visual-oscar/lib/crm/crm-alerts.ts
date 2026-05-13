/**
 * Alertas del CRM Político (M6).
 *
 * Genera alertas dinámicas sin requerir DB: "X días sin contacto",
 * "stance reciente neutral pero workspace lo prioriza alto", etc.
 */

import type { PoliticalActor, ActorInteraction } from "@/types/crm";

export type CrmAlertSeverity = "info" | "warn" | "danger";

export interface CrmAlert {
  id:        string;
  actorId:   string;
  actorName: string;
  severity:  CrmAlertSeverity;
  title:     string;
  hint:      string;
  daysSince?: number;
}

const DEFAULT_COOLDOWN_DAYS = 30;
const DANGER_DAYS           = 60;

export function buildCrmAlerts(
  actors: PoliticalActor[],
  cooldownDays = DEFAULT_COOLDOWN_DAYS,
): CrmAlert[] {
  const now = Date.now();
  const out: CrmAlert[] = [];

  for (const a of actors) {
    const last = lastInteractionDate(a);
    if (!last) {
      if (a.priority === "high" || a.priority === "critical") {
        out.push({
          id: `crm_alt_${a.id}_no_contact`,
          actorId: a.id,
          actorName: a.displayName,
          severity: "warn",
          title: "Sin interacciones registradas",
          hint: `Prioridad ${a.priority}. Conviene abrir un primer contacto.`,
        });
      }
      continue;
    }
    const days = Math.floor((now - last.getTime()) / 86_400_000);
    if (days < cooldownDays) continue;

    const severity: CrmAlertSeverity = days >= DANGER_DAYS ? "danger" : "warn";
    out.push({
      id: `crm_alt_${a.id}_stale_${days}`,
      actorId: a.id,
      actorName: a.displayName,
      severity,
      title: `${days} días sin contacto`,
      hint: severity === "danger"
        ? `Relación enfriándose. Última interacción ${last.toLocaleDateString("es-ES")}.`
        : `Más de ${cooldownDays} días sin actividad — reactivar antes de que se enfríe.`,
      daysSince: days,
    });
  }

  // Ordena: danger antes que warn antes que info, después por días desc
  return out.sort((a, b) => {
    const rank = (s: CrmAlertSeverity) => s === "danger" ? 3 : s === "warn" ? 2 : 1;
    if (rank(b.severity) !== rank(a.severity)) return rank(b.severity) - rank(a.severity);
    return (b.daysSince ?? 0) - (a.daysSince ?? 0);
  });
}

function lastInteractionDate(a: PoliticalActor): Date | null {
  const interactions = (a as any).interactions as ActorInteraction[] | undefined;
  if (!interactions?.length) return null;
  const sorted = [...interactions].sort(
    (x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()
  );
  return new Date(sorted[0].date);
}
