"use client";

import Link from "next/link";
import { docRepository } from "@/lib/docs/doc-repository";
import { blocksToPlainText } from "@/lib/docs/pdf-generator";

export default function DocPreviewPage({
  params,
}: {
  params: { workspaceId: string; docId: string };
}) {
  const doc = docRepository.getDocWithBlocks(params.docId, params.workspaceId);

  if (!doc) {
    return (
 <div className="flex h-full flex-col items-center justify-center">
 <p className="text-lg font-semibold text-[#1d1d1f]">Documento no encontrado</p>
 </div>
    );
  }

  const text = blocksToPlainText(doc, doc.blocks);

  return (
 <div className="mx-auto max-w-[760px] px-8 py-10">
 <div className="mb-6">
 <Link
          href={`/workspaces/${params.workspaceId}/docs/${doc.id}`}
          className="text-xs text-[#6e6e73] hover:text-[#3a3a3d]"
        >
          ← Volver al editor
 </Link>
 </div>
 <h1 className="text-3xl font-bold text-[#1d1d1f] mb-2">{doc.title}</h1>
 <p className="text-xs text-[#6e6e73] mb-8 uppercase tracking-wider">
        {doc.kind} · {new Date(doc.updatedAt).toLocaleDateString("es-ES")}
 </p>
 <pre className="whitespace-pre-wrap text-sm text-[#1d1d1f] leading-relaxed font-sans">
        {text}
 </pre>
 </div>
  );
}
