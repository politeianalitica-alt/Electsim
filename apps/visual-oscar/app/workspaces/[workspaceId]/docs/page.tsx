"use client";

import { useState } from "react";
import Link from "next/link";
import { docRepository } from "@/lib/docs/doc-repository";
import { WorkspaceViewHeader } from "@/app/_components/workspace/workspace-view-header";
import { WorkspaceEmptyState } from "@/app/_components/workspace/workspace-empty-state";
import { BadgeStatus } from "@/app/_components/workspace/badges";

const KIND_FILTERS = [
  { id: "all",           label: "Todos" },
  { id: "briefing",      label: "Briefings" },
  { id: "analysis",      label: "Análisis" },
  { id: "crisis-note",   label: "Crisis" },
  { id: "client-report", label: "Cliente" },
  { id: "positioning",   label: "Posicionamiento" },
  { id: "talking-points",label: "Talking points" },
];

const STATUS_FILTERS = [
  { id: "all",       label: "Cualquiera" },
  { id: "draft",     label: "Borrador" },
  { id: "review",    label: "Revisión" },
  { id: "published", label: "Publicado" },
];

export default function DocsPage({ params }: { params: { workspaceId: string } }) {
  const allDocs = docRepository.getDocs(params.workspaceId);
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = allDocs.filter(d =>
    (kind === "all" || d.kind === kind) &&
    (status === "all" || d.status === status)
  );

  if (allDocs.length === 0) {
    return (
      <WorkspaceEmptyState
        view="docs"
        title="Aún no hay documentos"
        description="Crea tu primer documento desde una plantilla o desde cero."
        cta="+ Nuevo documento"
      />
    );
  }

  return (
    <div>
      <WorkspaceViewHeader
        view="docs"
        title="Docs"
        description="Documentos del workspace con plantillas y bloques de contexto"
        badge={`${allDocs.length} docs`}
        actions={
          <Link
            href={`/workspaces/${params.workspaceId}/docs/new`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            + Nuevo documento
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <FilterChips label="Tipo" options={KIND_FILTERS} value={kind} onChange={setKind} />
        <FilterChips label="Estado" options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {filtered.map((doc, i) => (
          <Link
            key={doc.id}
            href={`/workspaces/${params.workspaceId}/docs/${doc.id}`}
            className={`flex items-center gap-4 px-4 py-3 hover:bg-slate-800/60 transition-colors ${
              i > 0 ? "border-t border-slate-800" : ""
            }`}
          >
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              {doc.kind.slice(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{doc.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {doc.kind} · {new Date(doc.updatedAt).toLocaleDateString("es-ES")} · {doc.wordCount ?? 0} palabras
              </p>
            </div>
            <BadgeStatus value={doc.status} />
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">
            Sin documentos para estos filtros.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex gap-1">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              value === opt.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
