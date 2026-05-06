import { Crown } from "lucide-react";
import type { KingmakerParty, PartyProjection } from "@/lib/types/electoral";

export function KingmakerPanel({
  kingmakers,
  parties,
}: {
  kingmakers: KingmakerParty[];
  parties: PartyProjection[];
}) {
  if (kingmakers.length === 0) {
    return (
      <p className="text-sm text-muted py-4">
        No se detectan partidos pivotales
      </p>
    );
  }

  const partyMap = new Map(parties.map((p) => [p.code, p]));

  return (
    <div className="space-y-3">
      {kingmakers.map((km) => {
        const party = partyMap.get(km.code);
        const color = km.color || party?.color || "#94A3B8";
        const leveragePct = Math.min(km.leverage_score, 100);

        return (
          <div
            key={km.code}
            className="border border-border1 rounded-lg p-3 space-y-2"
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-amber1 shrink-0" />
              <span
                className="font-bold text-sm"
                style={{ color }}
              >
                {km.name}
              </span>
              <span className="badge badge-cyan text-[10px] ml-auto">
                {km.seats} esc.
              </span>
            </div>

            {/* Leverage bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted">Influencia</span>
                <span className="text-[10px] text-text2">
                  {km.leverage_score}/100
                </span>
              </div>
              <div className="w-full h-1.5 bg-bg3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber1"
                  style={{ width: `${leveragePct}%` }}
                />
              </div>
            </div>

            {/* Key demands */}
            {km.key_demands.length > 0 && (
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                  Demandas clave
                </p>
                <ul className="space-y-0.5">
                  {km.key_demands.map((d, i) => (
                    <li key={i} className="text-xs text-text2 flex gap-1.5">
                      <span className="shrink-0 mt-0.5">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compatible blocs */}
            {km.compatible_blocs.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {km.compatible_blocs.map((bloc) => (
                  <span key={bloc} className="badge badge-blue text-[10px]">
                    {bloc}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
