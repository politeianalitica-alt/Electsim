export type ActorType =
  | "politician"
  | "civil_servant"
  | "journalist"
  | "business_leader"
  | "lobbyist"
  | "academic"
  | "ngo_leader"
  | "advisor"
  | "party_official"
  | "international";

export type ActorParty =
  | "PP" | "PSOE" | "Vox" | "Sumar" | "Junts" | "ERC" | "PNV" | "Bildu" | "CC" | "Cs" | "independent" | "other";

export type PositionStance =
  | "strongly_for" | "for" | "neutral" | "against" | "strongly_against" | "unknown";

export type InteractionType =
  | "meeting" | "call" | "email" | "public_statement" | "social_media" | "event" | "document" | "intermediary";

export type RelationshipType =
  | "ally" | "adversary" | "neutral" | "subordinate" | "superior" | "coalition_partner" | "media_contact" | "client" | "advisor";

export interface ActorPosition {
  id: string;
  actorId: string;
  issueId: string;
  issueTitle: string;
  stance: PositionStance;
  confidence: number;
  evidence?: string;
  source?: string;
  recordedAt: string;
  updatedAt: string;
  history: { stance: PositionStance; date: string; reason?: string }[];
}

export interface ActorInteraction {
  id: string;
  actorId: string;
  type: InteractionType;
  date: string;
  title: string;
  notes?: string;
  sentiment?: "positive" | "neutral" | "negative";
  outcome?: string;
  linkedDocId?: string;
  linkedIssueIds: string[];
  createdBy: string;
}

export interface ActorRelationship {
  id: string;
  sourceActorId: string;
  targetActorId: string;
  type: RelationshipType;
  strength: number;
  notes?: string;
  since?: string;
  verified: boolean;
}

export interface InfluenceScore {
  actorId: string;
  overall: number;
  mediaVisibility: number;
  institutionalWeight: number;
  networkConnections: number;
  workspaceAlignment: number;
  calculatedAt: string;
}

export interface PoliticalActor {
  id: string;
  workspaceId: string;
  type: ActorType;
  firstName: string;
  lastName: string;
  displayName: string;
  party?: ActorParty;
  role: string;
  institution: string;
  bio?: string;
  avatarInitials: string;
  avatarColor: string;
  tags: string[];
  email?: string;
  twitter?: string;
  phone?: string;
  positions: ActorPosition[];
  interactions: ActorInteraction[];
  relationships: ActorRelationship[];
  influenceScore?: InfluenceScore;
  linkedCanvasObjectIds: string[];
  linkedDocIds: string[];
  notes?: string;
  priority: "critical" | "high" | "medium" | "low";
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmFilter {
  party?: ActorParty[];
  type?: ActorType[];
  priority?: string[];
  tags?: string[];
  issueId?: string;
  stance?: PositionStance;
}
