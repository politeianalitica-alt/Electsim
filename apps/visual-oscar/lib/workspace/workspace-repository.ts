import {
  workspaces,
  members,
  issues,
  actions,
  decisions,
  alerts,
  documents,
  datasets,
  researchThreads,
  projects,
  automations,
  knowledgeItems,
  opportunities,
  activityEvents,
  canvasSummaries,
} from "./mock-data";

import type {
  Workspace,
  WorkspaceMember,
  WorkspaceIssue,
  WorkspaceAction,
  WorkspaceDecision,
  WorkspaceAlert,
  WorkspaceDocument,
  WorkspaceDataset,
  WorkspaceResearchThread,
  WorkspaceProject,
  WorkspaceAutomation,
  WorkspaceKnowledgeItem,
  WorkspaceOpportunity,
  WorkspaceActivityEvent,
  WorkspaceCanvasSummary,
  WorkspaceOverview,
} from "@/types/workspace";

import { hydrate, persist } from "./persist";

// El repositorio asume mocks por ahora. Cuando se conecte el backend,
// se sustituye el cuerpo de cada método por una llamada al API real
// sin tocar componentes ni hooks.

const KNOWLEDGE_KEY = "politeia:ws:knowledge";
hydrate(KNOWLEDGE_KEY, knowledgeItems);

function byWs<T extends { workspaceId: string }>(arr: T[], workspaceId: string): T[] {
  return arr.filter(item => item.workspaceId === workspaceId);
}

export const workspaceRepository = {
  // ─── Lectura básica ────────────────────────────────────────────────
  getWorkspaceById(workspaceId: string): Workspace | null {
    return workspaces.find(w => w.id === workspaceId) ?? null;
  },

  listWorkspaces(): Workspace[] {
    return [...workspaces];
  },

  getMembers(workspaceId: string): WorkspaceMember[] {
    return workspaceId === "ws_espana_2026" ? [...members] : [];
  },

  getMemberById(memberId: string): WorkspaceMember | null {
    return members.find(m => m.id === memberId) ?? null;
  },

  // ─── Issues ────────────────────────────────────────────────────────
  getIssues(workspaceId: string): WorkspaceIssue[] {
    return byWs(issues, workspaceId);
  },

  getCriticalIssues(workspaceId: string): WorkspaceIssue[] {
    return byWs(issues, workspaceId).filter(i => i.severity === "critical" && i.status !== "closed");
  },

  getIssueById(issueId: string): WorkspaceIssue | null {
    return issues.find(i => i.id === issueId) ?? null;
  },

  // ─── Actions ───────────────────────────────────────────────────────
  getActions(workspaceId: string): WorkspaceAction[] {
    return byWs(actions, workspaceId);
  },

  getPendingActions(workspaceId: string): WorkspaceAction[] {
    return byWs(actions, workspaceId).filter(a => a.status !== "done");
  },

  // ─── Decisions ─────────────────────────────────────────────────────
  getDecisions(workspaceId: string): WorkspaceDecision[] {
    return byWs(decisions, workspaceId);
  },

  // ─── Alerts ────────────────────────────────────────────────────────
  getAlerts(workspaceId: string): WorkspaceAlert[] {
    return byWs(alerts, workspaceId);
  },

  getActiveAlerts(workspaceId: string): WorkspaceAlert[] {
    return byWs(alerts, workspaceId).filter(a => a.status === "active");
  },

  // ─── Documents ─────────────────────────────────────────────────────
  getDocuments(workspaceId: string): WorkspaceDocument[] {
    return byWs(documents, workspaceId);
  },

  getDocumentById(documentId: string): WorkspaceDocument | null {
    return documents.find(d => d.id === documentId) ?? null;
  },

  // ─── Datasets ──────────────────────────────────────────────────────
  getDatasets(workspaceId: string): WorkspaceDataset[] {
    return byWs(datasets, workspaceId);
  },

  // ─── Research ──────────────────────────────────────────────────────
  getResearchThreads(workspaceId: string): WorkspaceResearchThread[] {
    return byWs(researchThreads, workspaceId);
  },

  getResearchThreadById(threadId: string): WorkspaceResearchThread | null {
    return researchThreads.find(t => t.id === threadId) ?? null;
  },

  // ─── Projects ──────────────────────────────────────────────────────
  getProjects(workspaceId: string): WorkspaceProject[] {
    return byWs(projects, workspaceId);
  },

  getProjectById(projectId: string): WorkspaceProject | null {
    return projects.find(p => p.id === projectId) ?? null;
  },

  // ─── Automations ───────────────────────────────────────────────────
  getAutomations(workspaceId: string): WorkspaceAutomation[] {
    return byWs(automations, workspaceId);
  },

  // ─── Knowledge ─────────────────────────────────────────────────────
  getKnowledgeItems(workspaceId: string): WorkspaceKnowledgeItem[] {
    return byWs(knowledgeItems, workspaceId);
  },
  createKnowledgeItem(workspaceId: string, input: Partial<WorkspaceKnowledgeItem> & { title: string }): WorkspaceKnowledgeItem {
    const item: WorkspaceKnowledgeItem = {
      id: `kn_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`,
      workspaceId,
      title: input.title,
      entityType: input.entityType ?? "event",
      updatedAt: new Date().toISOString(),
      confidence: input.confidence ?? 0.7,
      relatedIds: input.relatedIds ?? [],
      summary: input.summary ?? "",
      tags: input.tags ?? [],
    };
    knowledgeItems.unshift(item);
    persist(KNOWLEDGE_KEY, knowledgeItems);
    return item;
  },
  deleteKnowledgeItem(itemId: string) {
    const idx = knowledgeItems.findIndex((k) => k.id === itemId);
    if (idx !== -1) {
      knowledgeItems.splice(idx, 1);
      persist(KNOWLEDGE_KEY, knowledgeItems);
    }
  },

  // ─── Opportunities ─────────────────────────────────────────────────
  getOpportunities(workspaceId: string): WorkspaceOpportunity[] {
    return byWs(opportunities, workspaceId);
  },

  // ─── Activity ──────────────────────────────────────────────────────
  getActivity(workspaceId: string): WorkspaceActivityEvent[] {
    return byWs(activityEvents, workspaceId);
  },

  // ─── Canvas ────────────────────────────────────────────────────────
  getCanvasSummary(workspaceId: string): WorkspaceCanvasSummary | null {
    return canvasSummaries.find(c => c.workspaceId === workspaceId) ?? null;
  },

  // ─── Overview compuesto ────────────────────────────────────────────
  getOverview(workspaceId: string): WorkspaceOverview | null {
    const workspace = this.getWorkspaceById(workspaceId);
    if (!workspace) return null;
    return {
      workspace,
      members:        this.getMembers(workspaceId),
      issues:         this.getIssues(workspaceId),
      criticalIssues: this.getCriticalIssues(workspaceId),
      actions:        this.getActions(workspaceId),
      decisions:      this.getDecisions(workspaceId),
      alerts:         this.getActiveAlerts(workspaceId),
      datasets:       this.getDatasets(workspaceId),
      documents:      this.getDocuments(workspaceId),
      research:       this.getResearchThreads(workspaceId),
      projects:       this.getProjects(workspaceId),
      automations:    this.getAutomations(workspaceId),
      knowledge:      this.getKnowledgeItems(workspaceId),
      opportunities:  this.getOpportunities(workspaceId),
      activity:       this.getActivity(workspaceId),
      canvas:         this.getCanvasSummary(workspaceId),
    };
  },
};
