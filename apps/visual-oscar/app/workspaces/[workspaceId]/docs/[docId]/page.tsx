"use client";

import Link from "next/link";
import { useDocEditor } from "@/hooks/workspace/use-doc-editor";
import { PoliteiBlockEditor } from "@/components/editor/dynamic-editor";
import { DocContextPanel } from "@/app/_components/docs/doc-context-panel";
import { BadgeStatus } from "@/app/_components/workspace/badges";

export default function DocEditorPage({
  params,
}: {
  params: { workspaceId: string; docId: string };
}) {
  const { doc, updateDoc, isSaving, lastSavedAt } = useDocEditor(
    params.docId,
    params.workspaceId
  );

  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-lg font-semibold text-slate-200 mb-2">Documento no encontrado</p>
        <Link
          href={`/workspaces/${params.workspaceId}/docs`}
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Volver a Docs
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full -mx-7 -my-6">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Doc topbar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/workspaces/${params.workspaceId}/docs`}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              ← Docs
            </Link>
            <span className="text-slate-700">/</span>
            <BadgeStatus value={doc.status} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {isSaving ? (
              <span className="text-amber-400">Guardando…</span>
            ) : lastSavedAt ? (
              <span>Guardado · {new Date(lastSavedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
            ) : (
              <span>Sin cambios</span>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[860px] px-8 py-12">
            <input
              type="text"
              value={doc.title}
              onChange={e => updateDoc({ title: e.target.value })}
              className="w-full bg-transparent text-3xl font-bold text-slate-100 outline-none placeholder-slate-700 mb-8"
              placeholder="Título del documento…"
            />
            <PoliteiBlockEditor
              initialBlocks={doc.blocks}
              onChange={blocks => updateDoc({ blocks })}
            />
          </div>
        </div>
      </div>

      <DocContextPanel doc={doc} workspaceId={params.workspaceId} />
    </div>
  );
}
