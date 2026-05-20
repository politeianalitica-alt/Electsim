import type { PoliticalActor } from "@/types/crm";

const T = "2026-05-01T00:00:00Z";

function make(
  id: string,
  first: string,
  last: string,
  party: PoliticalActor["party"],
  role: string,
  type: PoliticalActor["type"],
  priority: PoliticalActor["priority"],
  influence: number
): PoliticalActor {
  const initials = `${first[0]}${last[0]}`.toUpperCase();
  return {
    id,
    workspaceId: "ws_espana_2026",
    type,
    firstName: first,
    lastName: last,
    displayName: `${first} ${last}`,
    party,
    role,
    institution: "Congreso de los Diputados",
    avatarInitials: initials,
    avatarColor: "#6366f1",
    tags: [],
    positions: [],
    interactions: [],
    relationships: [],
    influenceScore: {
      actorId: id,
      overall: influence,
      mediaVisibility: influence * 0.95,
      institutionalWeight: influence * 1.0,
      networkConnections: influence * 0.85,
      workspaceAlignment: influence * 0.9,
      calculatedAt: T,
    },
    linkedCanvasObjectIds: [],
    linkedDocIds: [],
    priority,
    createdAt: T,
    updatedAt: T,
  };
}

export const actorsMockData: PoliticalActor[] = [
  // PP (4)
  make("actor_001", "Carmen", "Villanueva", "PP", "Portavoz Economía", "politician", "critical", 0.88),
  make("actor_002", "Roberto", "Cuesta", "PP", "Vicesecretario", "party_official", "high",     0.76),
  make("actor_003", "Elsa", "Carrera", "PP", "Comisión Sanidad", "politician", "medium",   0.55),
  make("actor_004", "Iván", "Aguirre", "PP", "Diputado Andalucía", "politician", "medium",   0.48),

  // PSOE (3)
  make("actor_005", "Pedro", "Marín", "PSOE", "Comisión Vivienda", "politician", "critical", 0.92),
  make("actor_006", "Lucía", "Belmonte", "PSOE", "Portavoz Comunicación", "politician", "high",     0.80),
  make("actor_007", "Iván", "Berzal", "PSOE", "Comisión Industria", "politician", "medium",   0.70),

  // Junts (1)
  make("actor_008", "Aitana", "Rius", "Junts", "Constitucional", "politician", "critical", 0.71),

  // Sumar (1)
  make("actor_009", "Sergi", "Vinyets", "Sumar", "Comisión Trabajo", "politician", "high",     0.65),

  // Vox (1)
  make("actor_010", "Luis", "Arnedo", "Vox", "Comisión Interior", "politician", "medium",   0.58),

  // PNV (1)
  make("actor_011", "Andoni", "Esnaola", "PNV", "Comisión Defensa", "politician", "medium",   0.64),

  // Periodista / Asesor / Lobista (extras de tipo)
  make("actor_012", "Marisa", "Conde", "independent", "Editora política", "journalist", "high",     0.74),
];

// Posiciones cruzadas para la matriz actores × issues
const ISSUES = [
  { id: "iss_001", title: "Bulos financiación PSOE" },
  { id: "iss_002", title: "Ley Vivienda – Junts" },
  { id: "iss_003", title: "Presupuestos CC.AA." },
  { id: "iss_005", title: "Reforma fiscal Sumar" },
];

const POSITIONS_MATRIX: Record<string, Record<string, PoliticalActor["positions"][number]["stance"]>> = {
  actor_001: { iss_001: "strongly_against", iss_002: "against", iss_003: "neutral", iss_005: "against" },
  actor_002: { iss_001: "against",           iss_002: "against", iss_003: "against", iss_005: "against" },
  actor_005: { iss_001: "strongly_for",     iss_002: "strongly_for", iss_003: "for", iss_005: "neutral" },
  actor_006: { iss_001: "strongly_for",     iss_002: "for",          iss_003: "neutral", iss_005: "neutral" },
  actor_008: { iss_001: "neutral",          iss_002: "neutral", iss_003: "for", iss_005: "unknown" },
  actor_009: { iss_001: "for",              iss_002: "strongly_for", iss_003: "for", iss_005: "strongly_for" },
  actor_010: { iss_001: "neutral",          iss_002: "strongly_against", iss_003: "against", iss_005: "strongly_against" },
  actor_011: { iss_001: "neutral",          iss_002: "neutral", iss_003: "for", iss_005: "neutral" },
};

for (const actor of actorsMockData) {
  const positions = POSITIONS_MATRIX[actor.id];
  if (!positions) continue;
  for (const issue of ISSUES) {
    const stance = positions[issue.id];
    if (!stance) continue;
    actor.positions.push({
      id: `pos_${actor.id}_${issue.id}`,
      actorId: actor.id,
      issueId: issue.id,
      issueTitle: issue.title,
      stance,
      confidence: 0.85,
      recordedAt: T,
      updatedAt: T,
      history: [{ stance, date: "2026-05-01" }],
    });
  }
}

// 4 interacciones
actorsMockData[0].interactions.push({
  id: "int_001", actorId: "actor_001", type: "meeting",
  date: "2026-05-05T16:00:00Z",
  title: "Reunión bilateral sobre estrategia presupuestaria",
  notes: "Mostró apertura a negociar enmiendas parciales.",
  sentiment: "positive", outcome: "Acordar próxima reunión técnica",
  linkedIssueIds: ["iss_003"], createdBy: "u1",
});
actorsMockData[4].interactions.push({
  id: "int_002", actorId: "actor_005", type: "call",
  date: "2026-05-09T10:30:00Z", title: "Coordinación Q&A vivienda",
  sentiment: "neutral", linkedIssueIds: ["iss_002"], createdBy: "u1",
});
actorsMockData[7].interactions.push({
  id: "int_003", actorId: "actor_008", type: "intermediary",
  date: "2026-05-11T18:00:00Z", title: "Contacto vía intermediario sobre amnistía",
  sentiment: "neutral", linkedIssueIds: [], createdBy: "u1",
});
actorsMockData[11].interactions.push({
  id: "int_004", actorId: "actor_012", type: "public_statement",
  date: "2026-05-12T08:00:00Z", title: "Editorial sobre coyuntura política",
  sentiment: "negative", linkedIssueIds: ["iss_001"], createdBy: "u3",
});

// 4 relaciones cruzadas
actorsMockData[0].relationships.push({
  id: "rel_001", sourceActorId: "actor_001", targetActorId: "actor_002",
  type: "ally", strength: 0.9, verified: true,
});
actorsMockData[4].relationships.push({
  id: "rel_002", sourceActorId: "actor_005", targetActorId: "actor_006",
  type: "coalition_partner", strength: 0.95, verified: true,
});
actorsMockData[7].relationships.push({
  id: "rel_003", sourceActorId: "actor_008", targetActorId: "actor_005",
  type: "neutral", strength: 0.5, verified: false,
});
actorsMockData[1].relationships.push({
  id: "rel_004", sourceActorId: "actor_002", targetActorId: "actor_005",
  type: "adversary", strength: 0.85, verified: true,
});

export { ISSUES as crmIssues };
