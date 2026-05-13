"use client";

import { useState } from "react";
import type { PoliteiTable, TableColumnDef } from "@/types/tables";

interface TableChartPanelProps {
  table: PoliteiTable;
  columnId: string;
  onClose: () => void;
}

type ChartMode = "bar" | "line";

export function TableChartPanel({ table, columnId, onClose }: TableChartPanelProps) {
  const [mode, setMode] = useState<ChartMode>("bar");
  const col = table.columns.find(c => c.id === columnId);
  const labelCol = table.columns.find(c => c.type === "actor" || c.type === "text") ?? table.columns[0];

  if (!col || !labelCol) return null;

  const data = table.rows.map(r => ({
    label: String(r[labelCol.key] ?? ""),
    value: Number(r[col.key] ?? 0),
  }));

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="border-t border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-200">{col.label}</span>
          <div className="flex gap-1">
            {(["bar", "line"] as ChartMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                  mode === m ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-[11px] text-slate-500 hover:text-slate-300">
          Cerrar
        </button>
      </div>

      <div className="h-[200px] relative flex items-end justify-around gap-2 px-2">
        {data.map((d, idx) => {
          const heightPct = (d.value / maxValue) * 90;
          return (
            <div key={idx} className="flex flex-1 flex-col items-center gap-1.5 h-full">
              {mode === "bar" ? (
                <div className="flex flex-1 items-end w-full justify-center">
                  <div
                    className="w-3/4 rounded-t bg-indigo-500/70 hover:bg-indigo-400 transition-colors"
                    style={{ height: `${heightPct}%` }}
                    title={`${d.label}: ${d.value}`}
                  />
                </div>
              ) : (
                <div className="flex flex-1 items-end w-full justify-center">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                    style={{ marginBottom: `${heightPct}%` }}
                    title={`${d.label}: ${d.value}`}
                  />
                </div>
              )}
              <span className="text-[9px] text-slate-500 truncate max-w-full">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
