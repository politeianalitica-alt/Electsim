import type {
  WorkspaceIssue,
  WorkspaceAction,
  WorkspaceDocument,
  WorkspaceOpportunity,
  WorkspaceResearchThread,
  WorkspaceActivityEvent,
  WorkspaceProject,
  WorkspaceAutomation,
  WorkspaceMember,
  WorkspaceKnowledgeItem,
  Priority,
} from "@/types/workspace";

// ─────────────────────────────────────────────────────────────────────
//  Selectors — sin lógica de fetching, sólo derivaciones puras
// ─────────────────────────────────────────────────────────────────────

const PRIORITY_RANK: Record<Priority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ─── Issues ──────────────────────────────────────────────────────────
export function getOpenIssues(items: WorkspaceIssue[]): WorkspaceIssue[] {
  return items.filter(i => i.status !== "closed");
}

export function getIssuesBySeverity(items: WorkspaceIssue[]): WorkspaceIssue[] {
  return [...items].sort(
    (a, b) => (PRIORITY_RANK[a.severity] ?? 9) - (PRIORITY_RANK[b.severity] ?? 9)
  );
}

// ─── Actions ─────────────────────────────────────────────────────────
export function getOverdueActions(items: WorkspaceAction[], now = new Date()): WorkspaceAction[] {
  return items.filter(a => a.status !== "done" && new Date(a.dueDate) < now);
}

export function getActionsForToday(items: WorkspaceAction[], now = new Date()): WorkspaceAction[] {
  const todayISO = now.toISOString().slice(0, 10);
  return items.filter(a => a.status !== "done" && a.dueDate.slice(0, 10) === todayISO);
}

export function getActionsByUrgency(items: WorkspaceAction[]): WorkspaceAction[] {
  return [...items].sort((a, b) => {
    const byPrio = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (byPrio !== 0) return byPrio;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

// ─── Documents ───────────────────────────────────────────────────────
export function getRecentDocuments(items: WorkspaceDocument[], limit = 5): WorkspaceDocument[] {
  return [...items]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

export function getDocumentsByStatus(items: WorkspaceDocument[], status: string): WorkspaceDocument[] {
  return items.filter(d => d.status === status);
}

// ─── Research ────────────────────────────────────────────────────────
export function getMostCitedResearch(items: WorkspaceResearchThread[], limit = 3): WorkspaceResearchThread[] {
  return [...items].sort((a, b) => b.citations - a.citations).slice(0, limit);
}

export function getActiveResearch(items: WorkspaceResearchThread[]): WorkspaceResearchThread[] {
  return items.filter(r => r.status === "active");
}

// ─── Opportunities ───────────────────────────────────────────────────
export function getTopOpportunities(items: WorkspaceOpportunity[], limit = 3): WorkspaceOpportunity[] {
  return [...items].sort((a, b) => b.score - a.score).slice(0, limit);
}

// ─── Activity ────────────────────────────────────────────────────────
export function getRecentActivity(items: WorkspaceActivityEvent[], hours = 24, now = new Date()): WorkspaceActivityEvent[] {
  const cutoff = now.getTime() - hours * 3600_000;
  return items
    .filter(ev => new Date(ev.createdAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getActivitySorted(items: WorkspaceActivityEvent[]): WorkspaceActivityEvent[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── Projects ────────────────────────────────────────────────────────
export function getActiveProjects(items: WorkspaceProject[]): WorkspaceProject[] {
  return items.filter(p => p.status === "active");
}

export function getHighRiskProjects(items: WorkspaceProject[]): WorkspaceProject[] {
  return items.filter(p => p.riskLevel === "critical" || p.riskLevel === "high");
}

// ─── Automations ─────────────────────────────────────────────────────
export function getActiveAutomations(items: WorkspaceAutomation[]): WorkspaceAutomation[] {
  return items.filter(a => a.status === "active");
}

// ─── Members ─────────────────────────────────────────────────────────
export function getOnlineMembers(items: WorkspaceMember[]): WorkspaceMember[] {
  return items.filter(m => m.status === "online");
}

export function findMemberById(items: WorkspaceMember[], id?: string): WorkspaceMember | null {
  if (!id) return null;
  return items.find(m => m.id === id) ?? null;
}

// ─── Knowledge ───────────────────────────────────────────────────────
export function getKnowledgeByType(items: WorkspaceKnowledgeItem[], type: string): WorkspaceKnowledgeItem[] {
  return items.filter(k => k.entityType === type);
}

export function getRecentKnowledge(items: WorkspaceKnowledgeItem[], limit = 5): WorkspaceKnowledgeItem[] {
  return [...items]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
