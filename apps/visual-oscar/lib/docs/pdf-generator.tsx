"use client";

import type { DocBlock, DocMeta } from "@/types/docs";

/**
 * Generador de PDF.
 *
 * El paquete @react-pdf/renderer se importa de forma diferida para evitar
 * que su tree-shaking incluya el bundle pesado en client por defecto.
 * En el componente DocExportPanel se usa dynamic import con ssr:false.
 */
export interface DocPDFInput {
  doc: DocMeta;
  blocks: DocBlock[];
}

export async function downloadDocAsTextFile({ doc, blocks }: DocPDFInput) {
  const text = blocksToPlainText(doc, blocks);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(doc.title)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Convierte el documento a Markdown (encabezados, listas, citas, callouts…). */
export function blocksToMarkdown(doc: DocMeta, blocks: DocBlock[]): string {
  const out: string[] = [];
  out.push(`# ${doc.title}`);
  out.push("");
  out.push(`*${doc.kind} · ${new Date(doc.updatedAt).toLocaleDateString("es-ES")}*`);
  out.push("");
  let numIdx = 0;
  for (const b of blocks) {
    const content = String(b.content ?? "");
    const lvl = Math.min(6, Math.max(1, Number((b.props as { level?: number } | undefined)?.level ?? 2)));
    switch (b.type) {
      case "heading":
        out.push("", `${"#".repeat(lvl)} ${content}`, ""); numIdx = 0; break;
      case "bullet":
        out.push(`- ${content}`); numIdx = 0; break;
      case "numbered":
        numIdx += 1; out.push(`${numIdx}. ${content}`); break;
      case "quote":
        out.push(`> ${content}`); numIdx = 0; break;
      case "callout":
        out.push("> [!NOTE]", `> ${content}`, ""); numIdx = 0; break;
      case "divider":
        out.push("", "---", ""); numIdx = 0; break;
      case "code":
        out.push("```", content, "```"); numIdx = 0; break;
      default:
        if (content.trim()) out.push(content, ""); numIdx = 0;
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export async function downloadDocAsMarkdown({ doc, blocks }: DocPDFInput) {
  const md = blocksToMarkdown(doc, blocks);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(doc.title)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function blocksToPlainText(doc: DocMeta, blocks: DocBlock[]): string {
  const lines: string[] = [];
  lines.push(`${doc.title.toUpperCase()}`);
  lines.push(`${doc.kind.toUpperCase()} · ${new Date(doc.updatedAt).toLocaleDateString("es-ES")}`);
  lines.push("");
  for (const b of blocks) {
    if (b.type === "heading") {
      lines.push("");
      lines.push(String(b.content));
      lines.push("");
    } else if (b.type === "bullet") {
      lines.push(`- ${String(b.content)}`);
    } else if (b.type === "numbered") {
      lines.push(`> ${String(b.content)}`);
    } else if (b.type === "callout") {
      lines.push(`[!] ${String(b.content)}`);
    } else {
      lines.push(String(b.content ?? ""));
    }
  }
  lines.push("");
  lines.push(`— Politeia OS · Confidencial`);
  return lines.join("\n");
}

function slug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

export async function downloadDocAsPdf(input: DocPDFInput) {
  // Carga diferida de @react-pdf/renderer.
  try {
    const reactPdf: any = await import("@react-pdf/renderer");
    const { pdf, Document, Page, Text, StyleSheet } = reactPdf;
    const styles = StyleSheet.create({
      page:   { padding: 48, fontFamily: "Helvetica", fontSize: 11, color: "#1e293b" },
      title:  { fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#0f172a" },
      h2:     { fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 6, color: "#1e293b" },
      p:      { lineHeight: 1.6, marginBottom: 8, color: "#334155" },
      meta:   { fontSize: 9, color: "#94a3b8", marginBottom: 24 },
      footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: "#94a3b8", textAlign: "center" },
    });
    const docEl = (
 <Document title={input.doc.title} author="Politeia">
 <Page size="A4" style={styles.page}>
 <Text style={styles.meta}>
            {input.doc.kind.toUpperCase()} · {new Date(input.doc.updatedAt).toLocaleDateString("es-ES")}
 </Text>
 <Text style={styles.title}>{input.doc.title}</Text>
          {input.blocks.map(block => {
            if (block.type === "heading") return <Text key={block.id} style={styles.h2}>{String(block.content)}</Text>;
            return <Text key={block.id} style={styles.p}>{String(block.content ?? "")}</Text>;
          })}
 <Text style={styles.footer} fixed>
            Politeia OS · {input.doc.title} · Confidencial
 </Text>
 </Page>
 </Document>
    );
    const blob = await pdf(docEl).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(input.doc.title)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    // Fallback: descarga como txt si @react-pdf/renderer no está disponible.
    await downloadDocAsTextFile(input);
  }
}
