"use client";

import Link from "next/link";
import { tableRepository } from "@/lib/tables/table-repository";

export default function TableAnalysisPage({
  params,
}: {
  params: { workspaceId: string; tableId: string };
}) {
  const table = tableRepository.getTableById(params.tableId, params.workspaceId);

  if (!table) {
    return (
 <div className="flex h-full flex-col items-center justify-center">
 <p className="text-lg font-semibold text-[#1d1d1f]">Dataset no encontrado</p>
 </div>
    );
  }

  const tbl = table;
  const numericCols = tbl.columns.filter(c =>
    c.type === "number" || c.type === "percentage" || c.type === "seats" || c.type === "trend"
  );

  function stats(key: string) {
    const values = tbl.rows.map(r => Number(r[key] ?? 0)).filter(v => !isNaN(v));
    if (values.length === 0) return { min: 0, max: 0, avg: 0, count: 0 };
    const sum = values.reduce((s, v) => s + v, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      count: values.length,
    };
  }

  return (
 <div>
 <div className="mb-4">
 <Link
          href={`/workspaces/${params.workspaceId}/tables/${table.id}`}
          className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]"
        >
          ← Volver a la tabla
 </Link>
 <h1 className="text-lg font-bold text-[#1d1d1f] mt-1">Análisis · {table.name}</h1>
 </div>

 <div className="grid grid-cols-2 gap-3">
        {numericCols.map(col => {
          const s = stats(col.key);
          return (
 <div key={col.id} className="rounded-xl border border-[#e8e8ed] bg-white p-4">
 <p className="text-[10px] font-bold uppercase tracking-wider text-[#6e6e73] mb-3">
                {col.label}
 </p>
 <div className="grid grid-cols-4 gap-2">
 <Stat label="Min" value={s.min.toFixed(1)} />
 <Stat label="Max" value={s.max.toFixed(1)} />
 <Stat label="Avg" value={s.avg.toFixed(1)} />
 <Stat label="Count" value={s.count.toString()} />
 </div>
 </div>
          );
        })}
        {numericCols.length === 0 && (
 <p className="col-span-2 text-sm text-[#6e6e73]">
            Esta tabla no tiene columnas numéricas analizables.
 </p>
        )}
 </div>
 </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
 <div>
 <p className="text-base font-bold text-[#1d1d1f]">{value}</p>
 <p className="text-[9px] font-semibold uppercase tracking-wider text-[#6e6e73]">{label}</p>
 </div>
  );
}
