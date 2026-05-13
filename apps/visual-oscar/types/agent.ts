import type { AgentContextItem } from "./workspace";

export type AgentMode = "ask" | "do" | "analyze";

export type AgentMessageRole = "user" | "assistant" | "system";

export type AgentCardType =
  | "issue"
  | "document"
  | "action"
  | "canvas"
  | "research"
  | "decision"
  | "opportunity"
  | "text"
  | "error"
  | "thinking";

export interface AgentCardAction {
  id: string;
  label: string;
  type: "navigate" | "create" | "insert" | "dismiss";
  payload?: Record<string, unknown>;
  href?: string;
}

export interface AgentCard {
  type: AgentCardType;
  id?: string;
  title: string;
  summary?: string;
  actions: AgentCardAction[];
  meta?: Record<string, string>;
}

export interface AgentToolCall {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: "pending" | "running" | "done" | "error";
}

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  content: string;
  createdAt: string;
  mode?: AgentMode;
  cards?: AgentCard[];
  toolCalls?: AgentToolCall[];
  isStreaming?: boolean;
}

export interface AgentConversation {
  id: string;
  workspaceId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
}

export interface AgentContextSnapshot {
  workspaceId: string;
  activeView?: string;
  openDocumentId?: string;
  openIssueId?: string;
  openCanvasId?: string;
  openProjectId?: string;
  recentItems: AgentContextItem[];
}
