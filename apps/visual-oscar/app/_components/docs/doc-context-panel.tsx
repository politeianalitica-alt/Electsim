"use client";

import Link from "next/link";
import type { DocWithBlocks } from "@/types/docs";
import { docRepository } from "@/lib/docs/doc-repository";
import { downloadDocAsPdf, downloadDocAsTextFile } from "@/lib/docs/pdf-generator";

interface DocContextPanelProps {
  doc: DocWithBlocks;
  workspaceId: string;
}

const AGENT_ACTIONS = [
  { id: "continue",      label: "Continuar redactando",            prompt: "Continúa el documento manteniendo el tono y el contexto del workspace." },
  { id: "summarize",     label: "Resumir en 3 puntos",              prompt: "Genera un resumen ejecutivo de este documento en exactamente 3 puntos clave." },
  { id: "adapt_tone",    label: "Adaptar para cliente",             prompt: "Reescribe este documento con tono formal orientado a cliente externo." },
  { id: "fill_context",  label: "Rellenar con contexto",            prompt: "Rellena los marcadores de posición vacíos usando datos actuales del workspace." },
  { id: "extract",       label: "Extraer acciones del texto",       prompt: "Lee el documento y genera una lista de acciones derivadas." },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  review: "En revisión",
  published: "Publicado",
  archived: "Archivado",
};

export function DocContextPanel({ doc, workspaceId }: DocContextPanelProps) {
  const versions = docRepository.getVersionsMock(doc.id);

  function handleCopy() {
    const text = doc.blocks.map(b => String(b.content ?? "")).join("\n\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  return (
    <aside className="flex w-72 flex-none flex-col overflow-y-auto border-l border-slate-800 bg-slate-900">
      <Section title="Metadata">
        <Row label="Tipo">{doc.kind}</Row>
        <Row label="Estado">{STATUS_LABEL[doc.status]}</Row>
        <Row label="Autor">{doc.authorId}</Row>
        <Row label="Actualizado">{new Date(doc.updatedAt).toLocaleString("es-ES")}</Row>
        {doc.wordCount !== undefined && <Row label="Palabras">{doc.wordCount.toLocaleString("es")}</Row>}
      </Section>

      <Section title={`Issues relacionados (${doc.relatedIssueIds.length})`}>
        {doc.relatedIssueIds.length === 0 ? (
          <p className="text-[11px] text-slate-500">Sin issues vinculados.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {doc.relatedIssueIds.map(id => (
              <Link
                key={id}
                href={`/workspaces/${workspaceId}/overview`}
                className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:text-slate-100 transition-colors"
              >
                {id}
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Versiones">
        <ul className="space-y-1.5">
          {versions.map(v => (
            <li key={v.id} className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{v.label}</span>
              <span className="text-slate-600">{new Date(v.savedAt).toLocaleDateString("es-ES")}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Exportar">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => downloadDocAsPdf({ doc, blocks: doc.blocks })}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors"
          >
            PDF
          </button>
          <button
            onClick={() => downloadDocAsTextFile({ doc, blocks: doc.blocks })}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors"
          >
            Texto
          </button>
          <button
            onClick={handleCopy}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors"
          >
            Copiar
          </button>
          <Link
            href={`/workspaces/${workspaceId}/docs/${doc.id}/preview`}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-[11px] text-slate-300 hover:text-slate-100 transition-colors text-center"
          >
            Preview
          </Link>
        </div>
      </Section>

      <Section title="Agente">
        <div className="space-y-1">
          {AGENT_ACTIONS.map(a => (
            <button
              key={a.id}
              className="block w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-left text-[11px] text-slate-300 hover:text-slate-100 transition-colors"
              title={a.prompt}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-800 p-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between text-[11px] mb-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 truncate ml-2 capitalize">{children}</span>
    </div>
  );
}
