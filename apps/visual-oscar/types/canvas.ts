export type CanvasObjectType =
  | "actor"
  | "event"
  | "concept"
  | "document"
  | "law"
  | "narrative"
  | "organization"
  | "place"
  | "media_item"
  | "note";

export type ConnectionType =
  | "related_to"
  | "caused_by"
  | "supports"
  | "contradicts"
  | "part_of"
  | "influences"
  | "financed_by"
  | "member_of"
  | "opposes";

export type HypothesisStatus =
  | "proposed"
  | "investigating"
  | "supported"
  | "refuted"
  | "inconclusive";

export interface CanvasObject {
  id: string;
  canvasId: string;
  type: CanvasObjectType;
  label: string;
  description?: string;
  position: { x: number; y: number };
  metadata?: Record<string, unknown>;
  tags: string[];
  confidence?: number;
  sourceIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CanvasConnection {
  id: string;
  canvasId: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  label?: string;
  weight: number;
  bidirectional: boolean;
  evidence?: string;
  confidence: number;
  createdAt: string;
}

export interface CanvasHypothesis {
  id: string;
  canvasId: string;
  title: string;
  statement: string;
  status: HypothesisStatus;
  confidence: number;
  supportingObjectIds: string[];
  refutingObjectIds: string[];
  createdAt: string;
  updatedAt: string;
  investigatorNotes?: string;
}

export interface CanvasTimelineEvent {
  id: string;
  canvasId: string;
  date: string;
  title: string;
  description?: string;
  linkedObjectIds: string[];
  significance: "low" | "medium" | "high" | "critical";
}

export interface CanvasCluster {
  id: string;
  canvasId: string;
  label: string;
  objectIds: string[];
  color: string;
}

export interface InvestigationCanvas {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  objects: CanvasObject[];
  connections: CanvasConnection[];
  hypotheses: CanvasHypothesis[];
  timeline: CanvasTimelineEvent[];
  clusters: CanvasCluster[];
  createdAt: string;
  updatedAt: string;
  viewport?: { x: number; y: number; zoom: number };
}
