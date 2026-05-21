"use client";

import { useState, useMemo } from "react";
import type { PoliteiTable, TableColumnDef, TableRow } from "@/types/tables";
import {
  CellPercentage,
  CellSeats,
  CellActor,
  CellTrend,
  CellSeverity,
  CellStatus,
  CellTag,
  CellDate,
} from "./cells";

interface PoliteiTableProps {
  table: PoliteiTable;
  onRowClick?: (row: TableRow) => void;
  onColumnSelect?: (columnId: string) => void;
}

function renderCell(col: TableColumnDef, value: unknown) {
  switch (col.type) {
    case "percentage": return <CellPercentage value={Number(value) || 0} />;
    case "seats":      return <CellSeats value={Number(value) || 0} />;
    case "actor":      return <CellActor value={String(value ?? "")} />;
    case "trend":      return <CellTrend value={Number(value) || 0} />;
    case "severity":   return <CellSeverity value={String(value ?? "")} />;
    case "status":     return <CellStatus value={String(value ?? "")} />;
    case "tag":        return <CellTag value={value as string | string[]} />;
    case "date":       return <CellDate value={String(value ?? "")} />;
    case "number":     return <span className="text-xs tabular-nums text-slate-200">{Number(value) || 0}</span>;
    case "boolean":    return <span className="text-xs">{value ? "Sí" : "No"}</span>;
    default:           return <span className="text-xs text-slate-200">{String(value ?? "")}</span>;
  }
}

export function PoliteiTable({ table, onRowClick, onColumnSelect }: PoliteiTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = q
      ? table.rows.filter(r =>
          table.columns.some(c => String(r[c.key] ?? "").toLowerCase().includes(q))
        )
      : table.rows;
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        const as = String(av ?? "");
        const bs = String(bv ?? "");
        return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
      });
    }
    return rows;
  }, [table.rows, table.columns, sortKey, sortDir, search]);

  function handleSort(col: TableColumnDef) {
    if (sortKey === col.key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  return (
 <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900">
      {/* Toolbar */}
 <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
 <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar…"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
        />
 <span className="text-[11px] text-slate-500">
          {filtered.length} / {table.rows.length} filas
 </span>
 </div>

      {/* Table */}
 <div className="flex-1 overflow-auto">
 <table className="w-full">
 <thead className="sticky top-0 bg-slate-900 z-10">
 <tr className="border-b border-slate-800">
              {table.columns.map(col => (
 <th
                  key={col.id}
                  onClick={() => {
                    handleSort(col);
                    if (col.type === "percentage" || col.type === "number" || col.type === "seats" || col.type === "trend") {
                      onColumnSelect?.(col.id);
                    }
                  }}
                  className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-slate-200"
                  style={{ width: col.width }}
                >
 <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
 </span>
 </th>
              ))}
 </tr>
 </thead>
 <tbody>
            {filtered.map(row => (
 <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                {table.columns.map(col => (
 <td key={col.id} className="px-3 py-2 align-middle">
                    {renderCell(col, row[col.key])}
 </td>
                ))}
 </tr>
            ))}
            {filtered.length === 0 && (
 <tr>
 <td colSpan={table.columns.length} className="p-6 text-center text-sm text-slate-400">
                  Sin filas para esta búsqueda.
 </td>
 </tr>
            )}
 </tbody>
 </table>
 </div>
 </div>
  );
}
