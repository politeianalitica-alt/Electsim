import type { CanvasObjectType, HypothesisStatus, ConnectionType } from "@/types/canvas";

export const OBJECT_TYPE_CONFIG: Record<
  CanvasObjectType,
  { label: string; mark: string; color: string }
> = {
  actor:        { label: "Actor",         mark: "AC", color: "#6366f1" },
  event:        { label: "Evento",        mark: "EV", color: "#f59e0b" },
  concept:      { label: "Concepto",      mark: "CN", color: "#22d3ee" },
  document:     { label: "Documento",     mark: "DC", color: "#94a3b8" },
  law:          { label: "Ley",           mark: "LY", color: "#10b981" },
  narrative:    { label: "Narrativa",     mark: "NR", color: "#f43f5e" },
  organization: { label: "Organización",  mark: "OR", color: "#8b5cf6" },
  place:        { label: "Lugar",         mark: "PL", color: "#06b6d4" },
  media_item:   { label: "Media",         mark: "MD", color: "#84cc16" },
  note:         { label: "Nota",          mark: "NT", color: "#f59e0b" },
};

export const HYPOTHESIS_STATUS_CONFIG: Record<
  HypothesisStatus,
  { label: string; color: string }
> = {
  proposed:      { label: "Propuesta",    color: "#94a3b8" },
  investigating: { label: "Investigando", color: "#f59e0b" },
  supported:     { label: "Confirmada",   color: "#10b981" },
  refuted:       { label: "Refutada",     color: "#f43f5e" },
  inconclusive:  { label: "Inconclusa",   color: "#6366f1" },
};

export const CONNECTION_TYPE_CONFIG: Record<
  ConnectionType,
  { label: string; color: string; dashed: boolean }
> = {
  related_to:  { label: "Relacionado con", color: "#6366f1", dashed: false },
  caused_by:   { label: "Causado por",     color: "#f59e0b", dashed: false },
  supports:    { label: "Apoya",           color: "#10b981", dashed: false },
  contradicts: { label: "Contradice",      color: "#f43f5e", dashed: true },
  part_of:     { label: "Parte de",        color: "#22d3ee", dashed: false },
  influences:  { label: "Influye en",      color: "#8b5cf6", dashed: false },
  financed_by: { label: "Financiado por",  color: "#f43f5e", dashed: true },
  member_of:   { label: "Miembro de",      color: "#06b6d4", dashed: false },
  opposes:     { label: "Se opone a",      color: "#f43f5e", dashed: true },
};
