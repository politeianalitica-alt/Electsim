"use client";

import { useState } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import type { PartyProjection, SwingSimInput, SwingSimResult } from "@/lib/types/electoral";

export function SwingSimulator({
  parties,
  onSimulate,
}: {
  parties: PartyProjection[];
  onSimulate: (swings: SwingSimInput[]) => Promise<SwingSimResult>;
}) {
  const [swings, setSwings] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SwingSimResult | null>(null);
  const [loading, setLoading] = useState(false);

  const majorParties = parties.filter((p) => p.seats > 5);

  function setSwing(code: string, delta: number) {
    setSwings((prev) => ({ ...prev, [code]: delta }));
  }

  async function handleSimulate() {
    const payload: SwingSimInput[] = Object.entries(swings)
      .filter(([, v]) => v !== 0)
      .map(([party_code, delta_pct]) => ({ party_code, delta_pct }));
    if (payload.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await onSimulate(payload);
      setResult(res);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setSwings({});
    setResult(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-cyan1" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-text1">
          Simulador de voto
        </h3>
      </div>
      <p className="text-xs text-text2">
        Ajusta la variación de voto (pp) de cada partido para simular el
        impacto en escaños.
      </p>

      {/* Party sliders */}
      <div className="space-y-3">
        {majorParties.map((p) => {
          const delta = swings[p.code] ?? 0;
          return (
            <div key={p.code} className="flex items-center gap-3">
              {/* Color dot + name */}
              <div className="flex items-center gap-1.5 w-24 shrink-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-xs text-text1 font-medium truncate">
                  {p.code}
                </span>
              </div>
              <span className="text-[10px] text-muted w-8 text-right shrink-0">
                {p.seats}
              </span>
              {/* Range slider */}
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={delta}
                onChange={(e) => setSwing(p.code, parseFloat(e.target.value))}
                className="flex-1 accent-cyan-400"
              />
              {/* Delta display */}
              <span
                className={`text-[11px] font-bold w-12 text-right shrink-0 ${
                  delta > 0
                    ? "text-green1"
                    : delta < 0
                    ? "text-red1"
                    : "text-muted"
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}pp
              </span>
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSimulate}
          disabled={
            loading ||
            Object.values(swings).every((v) => v === 0)
          }
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan1 text-bg1 text-sm font-bold hover:bg-cyan1/80 transition disabled:opacity-50"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Simular
        </button>
        <button
          onClick={handleClear}
          className="px-4 py-2 rounded border border-border1 text-text2 text-sm hover:border-cyan1/40 hover:text-cyan1 transition"
        >
          Limpiar
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="p-4 rounded-lg border border-cyan1/20 bg-cyan1/5 space-y-3">
          <p className="text-xs font-bold text-text1 uppercase tracking-wider">
            Resultado de la simulación
          </p>
          {/* Seat changes */}
          <div className="space-y-1">
            {Object.entries(result.seat_changes)
              .filter(([, delta]) => delta !== 0)
              .map(([code, delta]) => {
                const party = parties.find((p) => p.code === code);
                const prev = party?.seats ?? 0;
                const next = prev + delta;
                return (
                  <div key={code} className="flex items-center gap-2 text-xs">
                    <span className="text-text1 font-medium w-12">{code}</span>
                    <span className="text-text2">
                      {prev} → {next}
                    </span>
                    <span
                      className={
                        delta > 0 ? "text-green1 font-bold" : "text-red1 font-bold"
                      }
                    >
                      ({delta > 0 ? "+" : ""}
                      {delta})
                    </span>
                  </div>
                );
              })}
          </div>
          {/* Coalition impact */}
          {result.coalition_impact.length > 0 && (
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
                Impacto en coaliciones
              </p>
              <ul className="space-y-0.5">
                {result.coalition_impact.map((msg, i) => (
                  <li key={i} className="text-xs text-text2">
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
