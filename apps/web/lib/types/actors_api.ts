// apps/web/lib/types/actors_api.ts
import type { DataMode } from "./status";

export interface ActorItem {
  id: string;
  name: string;
  party: string;
  party_color: string;
  role: string;
  bio: string;
  exposure: number;
  approval: number;
  sentiment: "up" | "down" | "stable";
}

export interface ActorsResponse {
  actors: ActorItem[];
  total: number;
  mode: DataMode;
}
