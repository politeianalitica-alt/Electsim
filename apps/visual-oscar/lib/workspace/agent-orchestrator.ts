import type {
  AgentMessage,
  AgentMode,
  AgentContextSnapshot,
  AgentCard,
} from "@/types/agent";
import { workspaceRepository } from "./workspace-repository";
import { generateId, delay } from "./agent-utils";

interface OrchestratorInput {
  message: string;
  mode: AgentMode;
  context: AgentContextSnapshot;
  history: AgentMessage[];
  workspaceId: string;
  signal?: AbortSignal;
}

export const agentOrchestrator = {
  async handle(input: OrchestratorInput): Promise<AgentMessage> {
    await delay(600 + Math.random() * 400);

    const { mode, message } = input;
    const lower = message.toLowerCase();

    if (mode === "do" || lower.startsWith("crea") || lower.startsWith("asigna") || lower.startsWith("añade")) {
      return this.handleDoMode(input);
    }
    if (
      mode === "analyze" ||
      lower.includes("analiz") ||
      lower.includes("genera") ||
      lower.includes("resumen") ||
      lower.includes("compara")
    ) {
      return this.handleAnalyzeMode(input);
    }
    return this.handleAskMode(input);
  },

  async handleAskMode({ workspaceId }: OrchestratorInput): Promise<AgentMessage> {
    const issues = workspaceRepository.getIssues(workspaceId);
    const cards: AgentCard[] = issues.slice(0, 3).map(issue => ({
      type: "issue" as const,
      id: issue.id,
      title: issue.title,
      summary: issue.summary,
      actions: [
        {
          id: generateId("act"),
          label: "Abrir issue",
          type: "navigate",
          href: `/workspaces/${workspaceId}/overview`,
        },
        {
          id: generateId("act"),
          label: "Crear nota de respuesta",
          type: "create",
          payload: { template: "crisis-note", issueId: issue.id },
          href: `/workspaces/${workspaceId}/docs`,
        },
      ],
      meta: { severity: issue.severity, status: issue.status },
    }));

    return {
      id: generateId("msg"),
      role: "assistant",
      content: `He encontrado ${issues.length} issues en el workspace. Los ${cards.length} más relevantes para tu consulta son:`,
      createdAt: new Date().toISOString(),
      cards,
    };
  },

  async handleDoMode({ message, workspaceId }: OrchestratorInput): Promise<AgentMessage> {
    return {
      id: generateId("msg"),
      role: "assistant",
      content: "Acción registrada correctamente. Recuerda confirmar antes de ejecutar acciones reales en producción.",
      createdAt: new Date().toISOString(),
      cards: [
        {
          type: "action",
          title: "Acción procesada",
          summary: `Procesé tu solicitud: «${message.slice(0, 80)}${message.length > 80 ? "…" : ""}».`,
          actions: [
            {
              id: generateId("act"),
              label: "Ver resultado",
              type: "navigate",
              href: `/workspaces/${workspaceId}/overview`,
            },
          ],
        },
      ],
    };
  },

  async handleAnalyzeMode({ workspaceId }: OrchestratorInput): Promise<AgentMessage> {
    const issues = workspaceRepository.getIssues(workspaceId);
    const critical = issues.filter(i => i.severity === "critical").length;
    const open = issues.filter(i => i.status === "open").length;
    const decisions = workspaceRepository.getDecisions(workspaceId).length;
    const docs = workspaceRepository.getDocuments(workspaceId).length;

    return {
      id: generateId("msg"),
      role: "assistant",
      content: [
 "Análisis del workspace:",
 "",
 `• ${critical} issues críticos requieren atención inmediata.`,
 `• ${open} issues abiertos en total.`,
 `• ${decisions} decisiones tomadas esta semana.`,
 `• ${docs} documentos activos.`,
 "",
 "Recomiendo priorizar la respuesta al issue de financiación antes del mediodía y preparar el briefing del comité de comunicación.",
      ].join("\n"),
      createdAt: new Date().toISOString(),
      cards: [],
    };
  },
};
