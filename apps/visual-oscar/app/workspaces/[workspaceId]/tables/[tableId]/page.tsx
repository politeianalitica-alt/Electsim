"use client";

import { useState } from "react";
import Link from "next/link";
import { tableRepository } from "@/lib/tables/table-repository";
import { PoliteiTable } from "@/components/tables/politeia-table";
import { TableChartPanel } from "@/components/tables/table-chart-panel";

export default function TableEditorPage({
  params,
}: {
  params: { workspaceId: string; tableId: string };
}) {
  const table = tableRepository.getTableById(params.tableId, params.workspaceId);
  const [chartCol, setChartCol] = useState<string | null>(null);

  if (!table) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-lg font-semibold text-[#1d1d1f] mb-2">Dataset no encontrado</p>
        <Link href={`/workspaces/${params.workspaceId}/tables`} className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Volver a Tables
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <Link
            href={`/workspaces/${params.workspaceId}/tables`}
            className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]"
          >
            ← Tables
          </Link>
          <h1 className="text-lg font-bold text-[#1d1d1f] mt-1">{table.name}</h1>
          <p className="text-xs text-[#6e6e73]">
            {table.rows.length} filas · {table.columns.length} columnas
          </p>
        </div>
        <Link
          href={`/workspaces/${params.workspaceId}/tables/${table.id}/analysis`}
          className="rounded-lg border border-[#e8e8ed] px-3 py-1.5 text-xs text-[#3a3a3d] hover:text-[#1d1d1f] transition-colors"
        >
          Análisis profundo
        </Link>
      </div>

      <div className="flex-1 min-h-[400px]">
        <PoliteiTable
          table={table}
          onColumnSelect={setChartCol}
        />
      </div>

      {chartCol && (
        <TableChartPanel
          table={table}
          columnId={chartCol}
          onClose={() => setChartCol(null)}
        />
      )}
    </div>
  );
}
