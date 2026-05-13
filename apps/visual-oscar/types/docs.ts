export type DocKind =
  | "briefing"
  | "crisis-note"
  | "analysis"
  | "legislative"
  | "client-report"
  | "positioning"
  | "talking-points"
  | "war-room-brief"
  | "memo"
  | "free";

export type DocStatus = "draft" | "review" | "published" | "archived";

export interface DocBlock {
  id: string;
  type: string;
  content: unknown;
  props?: Record<string, unknown>;
}

export interface DocMeta {
  id: string;
  workspaceId: string;
  title: string;
  kind: DocKind;
  status: DocStatus;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  relatedIssueIds: string[];
  relatedCanvasId?: string;
  relatedProjectId?: string;
  summary?: string;
  clientVisible: boolean;
  wordCount?: number;
}

export interface DocVersion {
  id: string;
  docId: string;
  savedAt: string;
  savedBy: string;
  blocks: DocBlock[];
  label?: string;
}

export interface DocComment {
  id: string;
  docId: string;
  blockId?: string;
  authorId: string;
  content: string;
  createdAt: string;
  resolved: boolean;
}

export interface DocTemplate {
  id: string;
  kind: DocKind;
  name: string;
  description: string;
  blocks: DocBlock[];
  tags: string[];
  estimatedMinutes: number;
}

export type DocWithBlocks = DocMeta & { blocks: DocBlock[] };
