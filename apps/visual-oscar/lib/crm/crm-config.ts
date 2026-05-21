import type { ActorParty, ActorType, PositionStance, InteractionType, RelationshipType } from "@/types/crm";

export const PARTY_CONFIG: Record<ActorParty, { color: string; fullName: string }> = {
  PP:          { color: "#3b82f6", fullName: "Partido Popular" },
  PSOE:        { color: "#ef4444", fullName: "Partido Socialista Obrero Español" },
  Vox:         { color: "#16a34a", fullName: "Vox" },
  Sumar:       { color: "#8b5cf6", fullName: "Sumar" },
  Junts:       { color: "#0891b2", fullName: "Junts per Catalunya" },
  ERC:         { color: "#f59e0b", fullName: "Esquerra Republicana de Catalunya" },
  PNV:         { color: "#065f46", fullName: "Partido Nacionalista Vasco" },
  Bildu:       { color: "#84cc16", fullName: "EH Bildu" },
  CC:          { color: "#f97316", fullName: "Coalición Canaria" },
  Cs:          { color: "#f59e0b", fullName: "Ciudadanos" },
  independent: { color: "#94a3b8", fullName: "Independiente" },
  other:       { color: "#64748b", fullName: "Otro" },
};

export const ACTOR_TYPE_CONFIG: Record<ActorType, { label: string; mark: string }> = {
  politician:      { label: "Político",          mark: "POL" },
  civil_servant:   { label: "Alto cargo",         mark: "CRG" },
  journalist:      { label: "Periodista",         mark: "PER" },
  business_leader: { label: "Empresario",         mark: "EMP" },
  lobbyist:        { label: "Lobista",            mark: "LOB" },
  academic:        { label: "Académico",          mark: "ACA" },
  ngo_leader:      { label: "Tercer sector",      mark: "NGO" },
  advisor:         { label: "Asesor",             mark: "ASE" },
  party_official:  { label: "Dirigente partido",  mark: "DPT" },
  international:   { label: "Internacional",      mark: "INT" },
};

export const STANCE_CONFIG: Record<PositionStance, { label: string; color: string; short: string }> = {
  strongly_for:     { label: "Muy a favor",   color: "#10b981", short: "++" },
  for:              { label: "A favor",        color: "#34d399", short: "+" },
  neutral:          { label: "Neutral",        color: "#94a3b8", short: "·" },
  against:          { label: "En contra",      color: "#f87171", short: "-" },
  strongly_against: { label: "Muy en contra", color: "#ef4444", short: "--" },
  unknown:          { label: "Desconocida",    color: "#64748b", short: "?" },
};

export const PRIORITY_CONFIG = {
  critical: { label: "Crítico", color: "#ef4444" },
  high:     { label: "Alto",    color: "#f59e0b" },
  medium:   { label: "Medio",   color: "#6366f1" },
  low:      { label: "Bajo",    color: "#475569" },
};

export const INTERACTION_TYPE_CONFIG: Record<InteractionType, { label: string }> = {
  meeting:          { label: "Reunión" },
  call:             { label: "Llamada" },
  email:            { label: "Email" },
  public_statement: { label: "Declaración pública" },
  social_media:     { label: "Redes sociales" },
  event:            { label: "Evento" },
  document:         { label: "Documento" },
  intermediary:     { label: "Intermediario" },
};

export const RELATIONSHIP_TYPE_CONFIG: Record<RelationshipType, { label: string; color: string }> = {
  ally:             { label: "Aliado",          color: "#10b981" },
  adversary:        { label: "Adversario",       color: "#ef4444" },
  neutral:          { label: "Neutral",          color: "#94a3b8" },
  subordinate:      { label: "Subordinado",      color: "#6366f1" },
  superior:         { label: "Superior",         color: "#8b5cf6" },
  coalition_partner:{ label: "Socio coalición",  color: "#10b981" },
  media_contact:    { label: "Contacto medios",  color: "#06b6d4" },
  client:           { label: "Cliente",          color: "#f59e0b" },
  advisor:          { label: "Asesor",           color: "#a78bfa" },
};
