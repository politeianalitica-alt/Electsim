export type ColumnType =
  | "text"
  | "number"
  | "percentage"
  | "seats"
  | "actor"
  | "date"
  | "status"
  | "severity"
  | "trend"
  | "tag"
  | "url"
  | "boolean"
  | "formula";

export type TableView = "table" | "kanban" | "gallery" | "pivot";
export type AggregationType = "sum" | "avg" | "count" | "min" | "max" | "none";

export type DatasetKind =
  | "polling"
  | "electoral"
  | "legislative"
  | "actors"
  | "media"
  | "risk"
  | "budget"
  | "custom";

export interface TableColumnDef {
  id: string;
  key: string;
  label: string;
  type: ColumnType;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  aggregation?: AggregationType;
  formulaExpr?: string;
  pinned?: "left" | "right";
  hidden?: boolean;
  meta?: Record<string, unknown>;
}

export interface TableRow {
  id: string;
  [key: string]: unknown;
}

export interface PoliteiTable {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  kind: DatasetKind;
  columns: TableColumnDef[];
  rows: TableRow[];
  view: TableView;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  relatedIssueIds: string[];
  pinnedChartColumnId?: string;
}

export interface TableFilter {
  columnId: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "in";
  value: unknown;
}

export interface TableSort {
  columnId: string;
  direction: "asc" | "desc";
}

export interface TableAnalysis {
  columnId: string;
  type: "distribution" | "trend" | "top_n" | "correlation";
  result: unknown;
}
