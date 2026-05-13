export type ProjectType =
  | "electoral_campaign"
  | "legislative_process"
  | "crisis_management"
  | "consultation"
  | "coalition_building"
  | "communication_strategy"
  | "research_project"
  | "event_management";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "blocked";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type MilestoneType = "deadline" | "vote" | "event" | "publication" | "meeting" | "decision";

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  date: string;
  type: MilestoneType;
  description?: string;
  linkedTaskIds: string[];
  achieved: boolean;
}

export interface TaskDependency {
  taskId: string;
  type: "finish_to_start" | "start_to_start" | "finish_to_finish";
}

export interface ProjectTask {
  id: string;
  projectId: string;
  phaseId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
  progress: number;
  assigneeActorIds: string[];
  linkedIssueIds: string[];
  linkedDocIds: string[];
  dependencies: TaskDependency[];
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
  blockerReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  title: string;
  color: string;
  startDate: string;
  endDate: string;
  order: number;
  taskIds: string[];
}

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTaskCount: number;
  completionPercentage: number;
  daysRemaining: number;
  milestonesAchieved: number;
  totalMilestones: number;
}

export interface Project {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  linkedActorIds: string[];
  linkedIssueIds: string[];
  linkedCanvasIds: string[];
  linkedDocIds: string[];
  tags: string[];
  color: string;
  metrics?: ProjectMetrics;
  createdAt: string;
  updatedAt: string;
}

export type GanttViewMode = "day" | "week" | "month" | "quarter";

export interface GanttConfig {
  viewMode: GanttViewMode;
  startDate: Date;
  endDate: Date;
  columnWidth: number;
  rowHeight: number;
  showDependencies: boolean;
  showMilestones: boolean;
  showPhases: boolean;
}
