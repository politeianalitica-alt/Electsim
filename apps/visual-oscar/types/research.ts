export type SourceType =
  | "url"
  | "pdf"
  | "rss_item"
  | "manual"
  | "clipboard"
  | "doc_extract"
  | "agent_finding";

export type ResearchItemStatus = "raw" | "processing" | "processed" | "archived";

export type SynthesisType =
  | "summary"
  | "key_points"
  | "entities"
  | "timeline"
  | "contradictions"
  | "full_analysis";

export interface ResearchSource {
  id: string;
  type: SourceType;
  url?: string;
  title: string;
  content: string;
  rawText?: string;
  publishedAt?: string;
  author?: string;
  domain?: string;
  tags: string[];
  relevanceScore?: number;
  addedAt: string;
}

export interface ExtractedEntity {
  id: string;
  label: string;
  type: "person" | "organization" | "place" | "event" | "concept" | "law";
  relevance: number;
  mentions: number;
  canvasObjectId?: string;
}

export interface ResearchSynthesis {
  id: string;
  sourceIds: string[];
  type: SynthesisType;
  content: string;
  entities: ExtractedEntity[];
  generatedAt: string;
  model: string;
  tokenCount?: number;
}

export interface ResearchThread {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  query: string;
  sources: ResearchSource[];
  syntheses: ResearchSynthesis[];
  status: "active" | "paused" | "concluded";
  tags: string[];
  relatedIssueIds: string[];
  relatedCanvasId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RssFeed {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  category: "prensa" | "legislativo" | "europa" | "economia" | "custom";
  active: boolean;
  lastFetchedAt?: string;
  itemCount?: number;
  relevanceFilter?: string[];
}

export interface RssItem {
  id: string;
  feedId: string;
  title: string;
  link: string;
  content?: string;
  snippet: string;
  publishedAt: string;
  author?: string;
  categories: string[];
  relevanceScore: number;
  read: boolean;
  saved: boolean;
}

export interface KnowledgeItem {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  sourceType: SourceType;
  tags: string[];
  entities: ExtractedEntity[];
  linkedCanvasObjectIds: string[];
  linkedDocIds: string[];
  linkedTableIds: string[];
  createdAt: string;
}
