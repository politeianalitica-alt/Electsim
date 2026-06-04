// =====================================================================
//  Workspace — Tipos de dominio (Sprint 1)
// =====================================================================

export type Priority = "low" | "normal" | "high" | "critical";

export type IssueStatus      = "open" | "monitoring" | "closed";
export type ActionStatus     = "pending" | "in_progress" | "done";
export type DocumentStatus   = "draft" | "review" | "published" | "archived";
export type ProjectStatus    = "active" | "paused" | "completed";
export type AutomationStatus = "active" | "paused";
export type ResearchStatus   = "active" | "archived";
export type AlertStatus      = "active" | "dismissed";

// ─── Identidad y equipo ──────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  tenantId: string;
  description: string;
  mode: "real" | "demo";
  createdAt: string;
  sector?: string;
  tags: string[];

  // contadores derivados (cacheados para el shell)
  issueCount: number;
  pendingActions: number;
  decisionsThisWeek: number;
  teamMembers: number;
}

/** @deprecated usa Workspace */
export type WorkspaceSummary = Workspace;

export interface WorkspaceMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatarUrl?: string;
  status?: "online" | "offline" | "busy";
  currentFocus?: string;
}

// ─── Entidades operativas ────────────────────────────────────────────
export interface WorkspaceIssue {
  id: string;
  workspaceId: string;
  title: string;
  summary: string;
  status: IssueStatus;
  severity: Priority;
  createdAt: string;
  ownerId?: string;
  dueDate?: string;
  relatedDocumentIds: string[];
  relatedResearchIds: string[];
  relatedCanvasId?: string;
}

export interface WorkspaceAction {
  id: string;
  workspaceId: string;
  title: string;
  priority: Priority;
  responsibleId?: string;
  dueDate: string;
  status: ActionStatus;
  issueId?: string;
}

export interface WorkspaceDecision {
  id: string;
  workspaceId: string;
  title: string;
  decisionMade: string;
  decidedBy: string;
  decidedAt: string;
  context: string;
  linkedIssueId?: string;
}

export interface WorkspaceAlert {
  id: string;
  workspaceId: string;
  title: string;
  severity: Priority;
  source: string;
  createdAt: string;
  status: AlertStatus;
}

// ─── Contenido y conocimiento ────────────────────────────────────────
export type DocumentKind =
  | "briefing"
  | "memo"
  | "crisis-note"
  | "analysis"
  | "client-report"
  | "positioning"
  | "talking-points";

export interface WorkspaceDocument {
  id: string;
  workspaceId: string;
  title: string;
  kind: DocumentKind;
  status: DocumentStatus;
  updatedAt: string;
  authorId: string;
  tags: string[];
  summary: string;
  relatedIssueIds: string[];
  wordCount?: number;
}

export type DatasetKind = "polling" | "media" | "legislative" | "actors" | "risk";

export interface WorkspaceDataset {
  id: string;
  workspaceId: string;
  name: string;
  kind: DatasetKind;
  updatedAt: string;
  rowCount: number;
  fields: string[];
  source?: string;
}

export interface WorkspaceResearchThread {
  id: string;
  workspaceId: string;
  title: string;
  query: string;
  updatedAt: string;
  status: ResearchStatus;
  sourceCount: number;
  citations: number;
  summary: string;
  linkedIssueIds: string[];
}

// ─── Proyectos y automatización ──────────────────────────────────────
export type ProjectKind = "campaign" | "lobby" | "analysis" | "crisis";

export interface WorkspaceProject {
  id: string;
  workspaceId: string;
  name: string;
  client: string;
  type: ProjectKind;
  status: ProjectStatus;
  progress: number; // 0-100
  riskLevel: Priority;
  dueDate?: string;
  membersIds: string[];
  linkedIssueIds: string[];
}

export interface WorkspaceAutomation {
  id: string;
  workspaceId: string;
  name: string;
  triggerLabel: string;
  actionLabel: string;
  status: AutomationStatus;
  lastRunAt?: string;
  runCount: number;
  category: "alerts" | "reports" | "ingest" | "agent";
}

// ─── Conocimiento y oportunidades ───────────────────────────────────
export type KnowledgeEntityType = "actor" | "law" | "event" | "narrative" | "project";

export interface WorkspaceKnowledgeItem {
  id: string;
  workspaceId: string;
  title: string;
  entityType: KnowledgeEntityType;
  updatedAt: string;
  confidence: number; // 0-1
  relatedIds: string[];
  summary: string;
  tags: string[];
}

export interface WorkspaceOpportunity {
  id: string;
  workspaceId: string;
  title: string;
  area: string;
  score: number; // 0-100
  windowStart: string;
  windowEnd: string;
  rationale: string;
  recommendedAction: string;
  relatedKnowledgeIds: string[];
}

// ─── Actividad y canvas ──────────────────────────────────────────────
export type ActivityType =
  | "issue"
  | "doc"
  | "decision"
  | "automation"
  | "research"
  | "alert"
  | "action";

export interface WorkspaceActivityEvent {
  id: string;
  workspaceId: string;
  type: ActivityType;
  title: string;
  createdAt: string;
  actorName?: string;
  meta?: string;
}

export interface WorkspaceCanvasSummary {
  id: string;
  workspaceId: string;
  title: string;
  objectCount: number;
  connectionCount: number;
  hypothesisCount: number;
  openHypotheses: number;
  updatedAt: string;
}

// ─── Shell (heredado de Sprint 0) ────────────────────────────────────
export type WorkspaceView =
  | "overview"
  | "inbox"
  | "docs"
  | "tables"
  | "canvas"
  | "research"
  | "projects"
  | "automations"
  | "knowledge"
  | "radar"
  | "simulator"
  | "slides"
  | "reporting"
  | "vigilancia"
  | "guardados"
  | "terminal";

export interface WorkspaceTab {
  id: string;
  label: string;
  view: WorkspaceView;
  href: string;
  closable?: boolean;
  pinned?: boolean;
}

export interface AgentContextItem {
  type: "document" | "issue" | "canvas" | "project" | "research" | "alert";
  id: string;
  title: string;
  meta?: string;
}

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  shortcut?: string[];
  group: "navigation" | "create" | "agent" | "workspace";
  href?: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Tipos compuestos de lectura ─────────────────────────────────────
export interface WorkspaceOverview {
  workspace: Workspace;
  members: WorkspaceMember[];
  issues: WorkspaceIssue[];
  criticalIssues: WorkspaceIssue[];
  actions: WorkspaceAction[];
  decisions: WorkspaceDecision[];
  alerts: WorkspaceAlert[];
  datasets: WorkspaceDataset[];
  documents: WorkspaceDocument[];
  research: WorkspaceResearchThread[];
  projects: WorkspaceProject[];
  automations: WorkspaceAutomation[];
  knowledge: WorkspaceKnowledgeItem[];
  opportunities: WorkspaceOpportunity[];
  activity: WorkspaceActivityEvent[];
  canvas: WorkspaceCanvasSummary | null;
}

export interface HookResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
}
