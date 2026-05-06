"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";

interface Props {
  briefingId: string | null;
  briefingTitle?: string;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(filename: string, base64: string) {
  const byteChars = atob(base64);
  const byteArr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArr], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel({ briefingId, briefingTitle }: Props) {
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const mdMutation = useMutation({
    mutationFn: () => endpoints.briefingMarkdown(briefingId!),
    onSuccess: (data) => {
      downloadText(data.filename, data.markdown);
      setExportMsg("Markdown descargado.");
    },
    onError: () => setExportMsg("Error al exportar Markdown."),
  });

  const pdfMutation = useMutation({
    mutationFn: () => endpoints.briefingPdfV2(briefingId!),
    onSuccess: (data) => {
      if (data.mode === "real" && data.bytes_b64 && data.filename) {
        downloadPdf(data.filename, data.bytes_b64);
        setExportMsg("PDF descargado.");
      } else if (data.markdown && data.message) {
        // PDF not available — fallback to markdown
        const filename = `briefing-${briefingId}.md`;
        downloadText(filename, data.markdown);
        setExportMsg(`PDF no disponible. ${data.message} Descargando Markdown.`);
      }
    },
    onError: () => setExportMsg("Error al exportar PDF."),
  });

  if (!briefingId) return null;

  // briefingTitle is accepted but not rendered to keep panel minimal
  void briefingTitle;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => mdMutation.mutate()}
          disabled={mdMutation.isPending}
          className="px-3 py-1.5 rounded text-xs border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {mdMutation.isPending ? "Exportando..." : "Descargar Markdown"}
        </button>
        <button
          onClick={() => pdfMutation.mutate()}
          disabled={pdfMutation.isPending}
          className="px-3 py-1.5 rounded text-xs border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {pdfMutation.isPending ? "Exportando..." : "Exportar PDF"}
        </button>
      </div>
      {exportMsg && <p className="text-xs text-zinc-500">{exportMsg}</p>}
    </div>
  );
}
