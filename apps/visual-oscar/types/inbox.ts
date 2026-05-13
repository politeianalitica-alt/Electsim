/** Tipos para Politeia Inbox (M8). */

export type InboxSource =
  | "rss"
  | "boe"
  | "google_alerts"
  | "twitter"
  | "newsletter"
  | "agent"
  | "manual";

export type InboxStatus = "unread" | "read" | "archived" | "actioned";

export interface InboxEntity {
  type: "actor" | "party" | "law" | "sector" | "event";
  id:   string;
  name: string;
}

export interface InboxItem {
  id:           string;
  workspaceId:  string;
  source:       InboxSource;
  /** Origen humano (ej. "El País", "BOE núm. 113", "X · @periodista"). */
  origin:       string;
  title:        string;
  excerpt:      string;
  /** URL original opcional. */
  url?:         string;
  /** Score 0-100 de relevancia para el workspace activo. */
  score:        number;
  status:       InboxStatus;
  entities:     InboxEntity[];
  tags:         string[];
  receivedAt:   string;
}
