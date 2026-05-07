// Actor and Party types — mirrors the shape from apps/web/app/actores/page.tsx
export interface Actor {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  role: string;
  bio: string;
  exposure: number;
  approval: number;
  sentiment: "up" | "down" | "stable";
}

export interface Party {
  code: string;
  color: string;
}
