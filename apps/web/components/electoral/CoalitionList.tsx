import type { CoalitionScenarioRich, PartyProjection } from "@/lib/types/electoral";
import { CoalitionCard } from "./CoalitionCard";

export function CoalitionList({
  coalitions,
  parties,
  isLoading,
}: {
  coalitions: CoalitionScenarioRich[];
  parties: PartyProjection[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted py-4">Cargando coaliciones...</p>
    );
  }

  if (coalitions.length === 0) {
    return (
      <p className="text-sm text-muted py-4">
        No hay datos de coalición disponibles
      </p>
    );
  }

  const sorted = [...coalitions].sort((a, b) => b.probability - a.probability);

  return (
    <div className="space-y-2">
      {sorted.map((c) => (
        <CoalitionCard key={c.id} coalition={c} parties={parties} />
      ))}
    </div>
  );
}
