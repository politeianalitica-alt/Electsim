/**
 * Slash commands para Politeia Docs (M1 PDF).
 *
 * Cuando el usuario escribe `/actor`, `/ley`, `/encuesta`, `/brief`, `/datos`
 * en el editor, se ofrece un menú con resultados y al confirmar se inserta
 * una ficha con datos del workspace.
 *
 * Como el editor actual es contentEditable simple, expongo un servicio que
 * la página puede llamar para obtener el contenido a insertar. El acoplado
 * con el editor lo hace el contenedor (Docs page).
 */

import { workspaceRepository } from "@/lib/workspace/workspace-repository";
import { crmRepository } from "@/lib/crm/crm-repository";
import type { PoliticalActor } from "@/types/crm";

export type SlashCommandKind = "actor" | "ley" | "encuesta" | "brief" | "datos" | "issue" | "alerta";

export interface SlashCommandResult {
  /** Bloque de texto listo para insertar en el editor (Markdown). */
  markdown: string;
  /** Hint contextual sobre la fuente (mostrar al usuario). */
  source:   string;
}

export interface SlashCommandSuggestion {
  id:    string;
  label: string;
  hint?: string;
}

/**
 * Lista de slash commands soportados.
 */
export const SLASH_COMMANDS: Array<{ kind: SlashCommandKind; trigger: string; label: string; hint: string }> = [
  { kind: "actor",    trigger: "/actor",    label: "/actor",    hint: "Inserta ficha de un actor político" },
  { kind: "ley",      trigger: "/ley",      label: "/ley",      hint: "Inserta ficha de una ley o iniciativa" },
  { kind: "encuesta", trigger: "/encuesta", label: "/encuesta", hint: "Inserta el último CIS o sondeo" },
  { kind: "issue",    trigger: "/issue",    label: "/issue",    hint: "Inserta resumen de un issue del workspace" },
  { kind: "alerta",   trigger: "/alerta",   label: "/alerta",   hint: "Inserta alerta activa del workspace" },
  { kind: "brief",    trigger: "/brief",    label: "/brief",    hint: "Inserta el morning brief de hoy" },
  { kind: "datos",    trigger: "/datos",    label: "/datos",    hint: "Inserta una métrica clave (KPI)" },
];

export function suggestForKind(kind: SlashCommandKind, workspaceId: string, query = ""): SlashCommandSuggestion[] {
  const q = query.trim().toLowerCase();

  if (kind === "actor") {
    return crmRepository.listActors(workspaceId)
      .filter(a => !q || a.displayName.toLowerCase().includes(q))
      .slice(0, 8)
      .map(a => ({ id: a.id, label: a.displayName, hint: `${a.role} · ${a.party ?? "—"}` }));
  }
  if (kind === "issue") {
    return workspaceRepository.getIssues(workspaceId)
      .filter(i => !q || i.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map(i => ({ id: i.id, label: i.title, hint: `${i.severity} · ${i.status}` }));
  }
  if (kind === "alerta") {
    return workspaceRepository.getActiveAlerts(workspaceId)
      .filter(a => !q || a.title.toLowerCase().includes(q))
      .slice(0, 8)
      .map(a => ({ id: a.id, label: a.title, hint: a.source }));
  }
  if (kind === "encuesta") {
    return [
      { id: "cis_may26",      label: "CIS · oleaje mayo 2026",     hint: "PSOE 29.1 · PP 30.4 · Vox 12.2" },
      { id: "40db_apr26",     label: "40dB · abril 2026",           hint: "PSOE 28.9 · PP 31.0 · Vox 11.8" },
      { id: "sigmaDos_apr26", label: "Sigma Dos · abril 2026",      hint: "PSOE 27.6 · PP 32.1 · Vox 12.4" },
    ];
  }
  if (kind === "ley") {
    return [
      { id: "rd_423_2026",    label: "RD 423/2026 — Vivienda turística", hint: "BOE núm. 113" },
      { id: "senda_2027",     label: "Senda de estabilidad 2027",         hint: "Cámara baja" },
      { id: "ai_act_es",      label: "AI Act — implementación ES",        hint: "UE / nacional" },
    ];
  }
  if (kind === "datos") {
    return [
      { id: "kpi_riesgo",     label: "Riesgo reputacional",         hint: "62/100" },
      { id: "kpi_voto",       label: "Intención de voto",            hint: "29.1%" },
      { id: "kpi_cobertura",  label: "Cobertura adversa",            hint: "38%" },
    ];
  }
  if (kind === "brief") {
    return [{ id: "today", label: "Morning brief de hoy", hint: new Date().toLocaleDateString("es-ES") }];
  }
  return [];
}

/**
 * Construye el bloque a insertar para un suggestion. Devuelve Markdown
 * plano que el editor puede transformar en bloques.
 */
export function buildBlock(kind: SlashCommandKind, suggestionId: string, workspaceId: string): SlashCommandResult {
  switch (kind) {
    case "actor": {
      const a = crmRepository.listActors(workspaceId).find(x => x.id === suggestionId);
      if (!a) return { markdown: "[Actor no encontrado]", source: "n/a" };
      return {
        source: "CRM Político · workspace",
        markdown: actorMarkdown(a),
      };
    }
    case "issue": {
      const i = workspaceRepository.getIssues(workspaceId).find(x => x.id === suggestionId);
      if (!i) return { markdown: "[Issue no encontrado]", source: "n/a" };
      return {
        source: "Workspace Issues",
        markdown:
`> **Issue · ${labelSeverity(i.severity)}** · estado: ${i.status}
>
> **${i.title}**
>
> ${i.summary}
`,
      };
    }
    case "alerta": {
      const al = workspaceRepository.getActiveAlerts(workspaceId).find(x => x.id === suggestionId);
      if (!al) return { markdown: "[Alerta no encontrada]", source: "n/a" };
      return {
        source: "Alertas activas",
        markdown:
`> **Alerta · ${labelSeverity(al.severity)}** · fuente: ${al.source}
>
> ${al.title}
`,
      };
    }
    case "encuesta": {
      const polls: Record<string, string> = {
        cis_may26:      "**CIS · oleaje mayo 2026**\n\n- PSOE 29.1% (-1.2pp)\n- PP 30.4% (+0.4pp)\n- Vox 12.2% (estable)\n- Sumar 6.8% (+0.6pp)\n- Junts 1.8% — ERC 1.9%",
        sigmaDos_apr26: "**Sigma Dos · abril 2026** — PP por delante (32.1) con desgaste contenido del PSOE (27.6).",
        '40db_apr26':   "**40dB · abril 2026** — PP 31.0 · PSOE 28.9 · Vox 11.8 — sin movimientos materiales en CCAA clave.",
      };
      return { source: "Sondeos · biblioteca", markdown: polls[suggestionId] ?? "[Sondeo no encontrado]" };
    }
    case "ley": {
      const laws: Record<string, string> = {
        rd_423_2026: "**RD 423/2026 — Vivienda turística** · BOE núm. 113\n\nIntroduce sistema de cupo autonómico y refuerza inscripción. En vigor 30 días desde publicación.",
        senda_2027:  "**Senda de estabilidad 2027** · cámara baja\n\nVoto programado para el miércoles. Junts y ERC pendientes de fijar posición.",
        ai_act_es:   "**AI Act — implementación nacional** · UE/España\n\nPrimer borrador de orientaciones de la Comisión publicado; despliegue Q4 2026.",
      };
      return { source: "Legislativo · biblioteca", markdown: laws[suggestionId] ?? "[Ley no encontrada]" };
    }
    case "datos": {
      const data: Record<string, string> = {
        kpi_riesgo:    "**Riesgo reputacional: 62/100** (+4 vs semana anterior).",
        kpi_voto:      "**Intención de voto del cliente: 29.1%** (-1.2pp en último oleaje CIS).",
        kpi_cobertura: "**Cobertura mediática adversa: 38%** del share total (estable).",
      };
      return { source: "KPIs workspace", markdown: data[suggestionId] ?? "[Dato no disponible]" };
    }
    case "brief": {
      return {
        source: "Morning brief",
        markdown:
`**Morning Brief · ${new Date().toLocaleDateString("es-ES")}**

- BOE núm. 113 publica RD 423/2026 sobre vivienda turística.
- Junts mantiene incertidumbre sobre la senda de estabilidad.
- CIS muestra desgaste contenido del PSOE (-1.2pp).

**Decisiones de hoy:** 5 prioritarias · 2 críticas.
`,
      };
    }
    default:
      return { markdown: `[Sin contenido para /${kind}]`, source: "n/a" };
  }
}

function actorMarkdown(a: PoliticalActor): string {
  return `> **${a.displayName}** · ${a.role}${a.party ? ` (${a.party})` : ""}
>
> Institución: ${a.institution}
> Prioridad: ${a.priority}${a.stance ? ` · Stance: ${a.stance}` : ""}
> Última interacción: ${(a as any).lastInteractionAt ?? "—"}
`;
}

function labelSeverity(s: string): string {
  if (s === "critical") return "crítico";
  if (s === "high")     return "alto";
  if (s === "low")      return "bajo";
  return s;
}
