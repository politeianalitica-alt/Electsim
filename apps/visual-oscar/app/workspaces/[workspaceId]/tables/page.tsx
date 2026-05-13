"use client";

import Link from "next/link";
import { tableRepository } from "@/lib/tables/table-repository";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { WorkspaceEmptyState } from "@/app/_components/workspace/workspace-empty-state";

const KIND_LABEL: Record<string, string> = {
  polling:     "Sondeos",
  electoral:   "Electoral",
  legislative: "Legislativo",
  actors:      "Actores",
  media:       "Medios",
  risk:        "Riesgo",
  budget:      "Presupuesto",
  custom:      "Custom",
};

export default function TablesPage({ params }: { params: { workspaceId: string } }) {
  const datasets = tableRepository.list(params.workspaceId);

  if (datasets.length === 0) {
    return (
      <WorkspaceEmptyState
        view="tables"
        title="Sin datasets conectados"
        description="Importa datos desde CSV, una API o desde conectores del workspace."
        cta="+ Nueva tabla"
      />
    );
  }

  return (
    <div>
      <WorkspaceViewHeader
        view="tables"
        title="Tables"
        description="Datasets y análisis tabular del workspace"
        badge={`${datasets.length} datasets`}
        actions={
          <Link
            href={`/workspaces/${params.workspaceId}/tables/new`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            + Nueva tabla
          </Link>
        }
      />

      <div className="space-y-2">
        {datasets.map(ds => (
          <Link
            key={ds.id}
            href={`/workspaces/${params.workspaceId}/tables/${ds.id}`}
            className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-slate-800 text-[10px] font-bold tracking-wider text-slate-400">
              {KIND_LABEL[ds.kind]?.slice(0, 3).toUpperCase() ?? "DAT"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{ds.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {ds.rows.length.toLocaleString("es")} filas · {ds.columns.length} columnas · {KIND_LABEL[ds.kind]}
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              {new Date(ds.updatedAt).toLocaleDateString("es-ES")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
