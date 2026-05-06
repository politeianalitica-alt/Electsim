import type { HemicycleSeat, PartyProjection } from "@/lib/types/electoral";

export function ElectoralHemicycle({
  seats,
  parties,
  totalSeats = 350,
  majority = 176,
}: {
  seats: HemicycleSeat[];
  parties: PartyProjection[];
  totalSeats?: number;
  majority?: number;
}) {
  if (seats.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted text-sm">
        No hay datos de hemiciclo disponibles
      </div>
    );
  }

  const visibleParties = parties
    .filter((p) => p.seats > 0)
    .sort((a, b) => b.seats - a.seats);

  return (
    <div className="space-y-3">
      <svg
        viewBox="0 0 500 270"
        className="w-full"
        aria-label={`Hemiciclo: ${totalSeats} escaños, mayoría ${majority}`}
      >
        {seats.map((s) => (
          <circle
            key={s.idx}
            cx={s.x}
            cy={s.y}
            r="4.5"
            fill={s.color}
            stroke="#0D1320"
            strokeWidth="0.8"
          />
        ))}
        {/* Majority line indicator */}
        <line
          x1="250"
          y1="250"
          x2="250"
          y2="40"
          stroke="#94A3B8"
          strokeWidth="0.6"
          strokeDasharray="4 3"
          opacity="0.5"
        />
        <text x="252" y="38" fill="#94A3B8" fontSize="8" opacity="0.7">
          Mayoría {majority}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {visibleParties.map((p) => (
          <div key={p.code} className="flex items-center gap-1.5 text-[11px] text-text2">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="font-medium text-text1">{p.code}</span>
            <span className="text-muted">{p.seats}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
