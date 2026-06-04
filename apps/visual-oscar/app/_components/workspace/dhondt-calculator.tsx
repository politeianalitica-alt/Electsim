"use client";

import { useState } from "react";

interface Party {
  name: string;
  votes: number;
}

const DEFAULT_PARTIES: Party[] = [
  { name: "PP", votes: 340000 },
  { name: "PSOE", votes: 295000 },
  { name: "Vox", votes: 120000 },
  { name: "Sumar", votes: 95000 },
  { name: "Otros", votes: 50000 },
];

function dhondt(parties: Party[], seats: number, thresholdPct: number) {
  const totalVotes = parties.reduce((s, p) => s + (p.votes || 0), 0);
  const minVotes = (totalVotes * thresholdPct) / 100;
  const won = parties.map(() => 0);
  const eligible = parties.map((p) => p.votes >= minVotes && p.votes > 0);
  if (totalVotes > 0 && seats > 0) {
    for (let s = 0; s < seats; s++) {
      let best = -1;
      let bestQ = -1;
      parties.forEach((p, i) => {
        if (!eligible[i]) return;
        const q = p.votes / (won[i] + 1);
        if (q > bestQ) {
          bestQ = q;
          best = i;
        }
      });
      if (best >= 0) won[best]++;
      else break;
    }
  }
  return parties.map((p, i) => ({
    name: p.name,
    votes: p.votes,
    pct: totalVotes ? (p.votes / totalVotes) * 100 : 0,
    seats: won[i],
    eligible: eligible[i],
  }));
}

export function DHondtCalculator() {
  const [parties, setParties] = useState<Party[]>(DEFAULT_PARTIES);
  const [seats, setSeats] = useState(7);
  const [threshold, setThreshold] = useState(3);

  const results = dhondt(parties, seats, threshold);
  const assignedSeats = results.reduce((s, r) => s + r.seats, 0);
  const maxSeats = Math.max(1, ...results.map((r) => r.seats));

  const update = (i: number, patch: Partial<Party>) =>
    setParties((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addRow = () => setParties((p) => [...p, { name: "", votes: 0 }]);
  const removeRow = (i: number) => setParties((p) => p.filter((_, idx) => idx !== i));

  const COLORS = ["#1565C0", "#E53935", "#43A047", "#8E24AA", "#FB8C00", "#00897B", "#5E35B1", "#6e6e73"];

  return (
    <div className="rounded-xl border border-[#e8e8ed] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[#1d1d1f]">Calculadora D'Hondt</h3>
          <p className="text-[11px] text-[#6e6e73]">Reparto de escaños a partir de votos por partido</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px] text-[#6e6e73]">
            Escaños
            <input type="number" min={1} max={350} value={seats}
              onChange={(e) => setSeats(Math.max(1, Math.min(350, Number(e.target.value) || 1)))}
              className="w-14 rounded-md border border-[#e8e8ed] px-2 py-1 text-xs text-[#1d1d1f]" />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-[#6e6e73]">
            Barrera %
            <input type="number" min={0} max={20} step={0.5} value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
              className="w-14 rounded-md border border-[#e8e8ed] px-2 py-1 text-xs text-[#1d1d1f]" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_120px_64px_32px] gap-2 items-center text-[10px] uppercase tracking-wider text-[#6e6e73] px-1 mb-1">
        <span>Partido</span><span className="text-right">Votos</span><span className="text-right">% · escaños</span><span />
      </div>

      <div className="space-y-1.5">
        {results.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_64px_32px] gap-2 items-center">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full flex-none" style={{ background: COLORS[i % COLORS.length] }} />
              <input value={parties[i].name} placeholder="Partido"
                onChange={(e) => update(i, { name: e.target.value })}
                className="w-full rounded-md border border-transparent hover:border-[#e8e8ed] focus:border-indigo-400 px-1.5 py-1 text-xs text-[#1d1d1f] outline-none" />
            </div>
            <input type="number" min={0} value={parties[i].votes}
              onChange={(e) => update(i, { votes: Math.max(0, Number(e.target.value) || 0) })}
              className="w-full rounded-md border border-[#e8e8ed] px-2 py-1 text-xs text-right text-[#1d1d1f]" />
            <div className="text-right text-[11px]">
              <span className="text-[#6e6e73]">{r.pct.toFixed(1)}%</span>{" "}
              <span className={`font-bold ${r.seats > 0 ? "text-[#1d1d1f]" : "text-[#c7c7cc]"}`}>{r.seats}</span>
            </div>
            <button onClick={() => removeRow(i)} title="Quitar"
              className="text-[#c7c7cc] hover:text-[#e53935] text-sm leading-none">×</button>
          </div>
        ))}
      </div>

      {/* Barras de escaños */}
      <div className="mt-3 space-y-1">
        {results.filter((r) => r.seats > 0).map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-20 truncate text-[10px] text-[#6e6e73]">{r.name}</span>
            <div className="flex-1 h-3 rounded bg-[#f5f5f7] overflow-hidden">
              <div className="h-full rounded" style={{ width: `${(r.seats / maxSeats) * 100}%`, background: COLORS[results.indexOf(r) % COLORS.length] }} />
            </div>
            <span className="w-6 text-right text-[11px] font-semibold text-[#1d1d1f]">{r.seats}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button onClick={addRow} className="text-[11px] font-medium text-indigo-500 hover:text-indigo-600">+ Añadir partido</button>
        <span className="text-[11px] text-[#6e6e73]">{assignedSeats} / {seats} escaños repartidos</span>
      </div>
    </div>
  );
}
