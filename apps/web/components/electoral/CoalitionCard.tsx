"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CoalitionScenarioRich, PartyProjection } from "@/lib/types/electoral";

const MAJORITY = 176;
const TOTAL_SEATS = 350;

function seatsBarColor(hasM: boolean, seats: number): string {
  if (hasM) return "bg-green1";
  if (MAJORITY - seats < 10) return "bg-amber1";
  return "bg-red1";
}

function probabilityBadge(prob: number) {
  if (prob >= 0.6) return "badge badge-green";
  if (prob >= 0.3) return "badge badge-amber";
  return "badge badge-red";
}

export function CoalitionCard({
  coalition,
  parties,
}: {
  coalition: CoalitionScenarioRich;
  parties: PartyProjection[];
}) {
  const [expanded, setExpanded] = useState(false);

  const partyMap = new Map(parties.map((p) => [p.code, p]));
  const seatsPct = Math.min((coalition.total_seats / TOTAL_SEATS) * 100, 100);
  const majorityPct = (MAJORITY / TOTAL_SEATS) * 100;
  const barColor = seatsBarColor(coalition.has_majority, coalition.total_seats);

  const hasConflictsOrEnablers =
    coalition.conflicts.length > 0 || coalition.enablers.length > 0;

  return (
    <div className="border border-border1 rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm text-text1 truncate">
          {coalition.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={probabilityBadge(coalition.probability)}>
            {Math.round(coalition.probability * 100)}%
          </span>
          {coalition.has_majority && (
            <span className="badge badge-green text-[10px]">✓ Mayoría</span>
          )}
        </div>
      </div>

      {/* Seats bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted">
            {coalition.total_seats} / {MAJORITY} escaños
          </span>
          <span className="text-[10px] text-muted">
            {coalition.seats_above_majority >= 0
              ? `+${coalition.seats_above_majority}`
              : coalition.seats_above_majority}{" "}
            sobre mayoría
          </span>
        </div>
        <div className="relative w-full h-2 bg-bg3 rounded-full overflow-visible">
          <div
            className={`h-full rounded-full ${barColor} transition-all`}
            style={{ width: `${seatsPct}%` }}
          />
          {/* Majority line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-text2/60"
            style={{ left: `${majorityPct}%` }}
          />
        </div>
      </div>

      {/* Member party chips */}
      <div className="flex flex-wrap gap-1">
        {coalition.members.map((code) => {
          const p = partyMap.get(code);
          return (
            <span
              key={code}
              className="badge text-[10px] px-1.5 py-0.5"
              style={
                p
                  ? {
                      backgroundColor: p.color + "22",
                      color: p.color,
                      border: `1px solid ${p.color}44`,
                    }
                  : undefined
              }
            >
              {code}
            </span>
          );
        })}
      </div>

      {/* Stability score */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted">Estabilidad</span>
          <span className="text-[10px] text-text2">
            {coalition.stability_score}/100
          </span>
        </div>
        <div className="w-full h-1.5 bg-bg3 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue1 rounded-full"
            style={{ width: `${coalition.stability_score}%` }}
          />
        </div>
      </div>

      {/* Expandable conflicts/enablers */}
      {hasConflictsOrEnablers && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-text2 hover:text-text1 transition"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Tensiones &amp; facilitadores
          </button>

          {expanded && (
            <div className="mt-1.5 space-y-1.5 pl-4">
              {coalition.conflicts.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">
                    Conflictos
                  </p>
                  <ul className="space-y-0.5">
                    {coalition.conflicts.map((c, i) => (
                      <li key={i} className="text-[11px] text-amber1 flex gap-1.5">
                        <span className="shrink-0">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {coalition.enablers.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">
                    Facilitadores
                  </p>
                  <ul className="space-y-0.5">
                    {coalition.enablers.map((e, i) => (
                      <li key={i} className="text-[11px] text-green1 flex gap-1.5">
                        <span className="shrink-0">•</span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
