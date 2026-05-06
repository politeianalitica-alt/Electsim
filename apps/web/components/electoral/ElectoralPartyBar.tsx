import type { PartyProjection } from "@/lib/types/electoral";

const TOTAL_SEATS = 350;
const MAJORITY = 176;
const MAJORITY_PCT = (MAJORITY / TOTAL_SEATS) * 100;

export function ElectoralPartyBar({
  parties,
  majority,
  isLoading,
}: {
  parties: PartyProjection[];
  majority: number;
  isLoading?: boolean;
}) {
  const effectiveMajority = majority || MAJORITY;
  const majorityPct = (effectiveMajority / TOTAL_SEATS) * 100;

  const governing = parties.filter((p) => p.is_governing);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="w-full h-8 rounded-lg bg-border1/20 animate-pulse" />
      </div>
    );
  }

  if (parties.length === 0) {
    return (
      <div className="text-sm text-muted py-2">
        No hay datos de partidos disponibles
      </div>
    );
  }

  const sorted = [...parties].sort((a, b) => b.seats - a.seats);
  const totalDisplayed = sorted.reduce((s, p) => s + p.seats, 0);

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="relative w-full">
        <div className="w-full h-8 rounded-lg overflow-hidden flex">
          {sorted.map((p) => {
            const widthPct = (p.seats / Math.max(totalDisplayed, TOTAL_SEATS)) * 100;
            return (
              <div
                key={p.code}
                className="h-full transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: p.color,
                  minWidth: p.seats > 0 ? "1px" : "0",
                }}
                title={`${p.code}: ${p.seats} escaños`}
              />
            );
          })}
        </div>
        {/* Majority line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/70 pointer-events-none"
          style={{ left: `${majorityPct}%` }}
          title={`Mayoría: ${effectiveMajority} escaños`}
        />
        {/* Majority label */}
        <div
          className="absolute -top-5 text-[10px] text-text2"
          style={{
            left: `${majorityPct}%`,
            transform: "translateX(-50%)",
          }}
        >
          {effectiveMajority}
        </div>
      </div>

      {/* Governing legend */}
      {governing.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {governing.map((p) => (
            <div key={p.code} className="flex items-center gap-1 text-[11px] text-text2">
              <span>⭐</span>
              <span
                className="font-medium"
                style={{ color: p.color }}
              >
                {p.code}
              </span>
              <span className="text-muted">{p.seats}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
