import type { Priority } from "./workspace";

export interface WorkspaceAgendaEvent {
  id: string;
  workspaceId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  type: "meeting" | "deadline" | "alert" | "publication";
  actorIds?: string[];
  location?: string;
}

export type AlertLevel = "normal" | "attention" | "crisis";

export interface MorningBrief {
  summary: string;
  highlights: string[];
  level: AlertLevel;
  generatedAt: string;
}
