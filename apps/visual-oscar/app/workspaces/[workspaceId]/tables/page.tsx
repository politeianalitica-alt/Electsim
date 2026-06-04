"use client";

import Link from "next/link";
import { tableRepository } from "@/lib/tables/table-repository";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { WorkspaceEmptyState } from "@/app/_components/workspace/workspace-empty-state";
import { DHondtCalculator } from "@/app/_components/workspace/dhondt-calculator";

const KIND_LABEL: Record<string, string> = {
  polling: "Sondeos",
  electoral: "Electoral",
  legislative: "Legislativo",
  actors: "Actores",
  media: "Medios",
  risk: "Riesgo",
  budget: "Presupuesto",
  custom: "Custom",
};

export default function TablesPage({ params }: { params: { workspaceId: string } }) {
  const datasets = tableRepository.list(params.workspaceId);

  if (datasets.length === 0) {
    return (
 <WorkspaceEmptyState
        view="tables"
        eyebrow="Workspace · Tablas"
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
            className="flex items-center gap-4 rounded-xl border border-[#e8e8ed] bg-white px-4 py-3 hover:border-indigo-500/40 hover:bg-[#f5f5f7]/60 transition-colors"
          >
 <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-[#f5f5f7] text-[10px] font-bold tracking-wider text-[#6e6e73]">
              {KIND_LABEL[ds.kind]?.slice(0, 3).toUpperCase() ?? "DAT"}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-[#1d1d1f] truncate">{ds.name}</p>
 <p className="text-xs text-[#6e6e73] mt-0.5">
                {ds.rows.length.toLocaleString("es")} filas · {ds.columns.length} columnas · {KIND_LABEL[ds.kind]}
 </p>
 </div>
 <span className="text-[11px] text-[#6e6e73]">
              {new Date(ds.updatedAt).toLocaleDateString("es-ES")}
 </span>
 </Link>
        ))}
 </div>

 <div className="mt-7">
 <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6e6e73]">Herramientas electorales</div>
 <DHondtCalculator />
 </div>
 </div>
  );
}
