import { NextRequest, NextResponse } from "next/server";
import { renderPdf, type PdfDocSpec } from "@/lib/render/pdf-renderer";
import { getLogger } from "@/lib/observability/logger";

export const runtime  = "nodejs";
export const maxDuration = 60;

const log = getLogger("render.pdf");

/**
 * POST /api/render/pdf
 *
 * Body: PdfDocSpec
 * Response: application/pdf binary
 *
 * Para descargar desde cliente:
 *   const r = await fetch("/api/render/pdf", { method:"POST", body: JSON.stringify(spec)});
 *   const blob = await r.blob();
 *   const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "doc.pdf"; a.click();
 */
export async function POST(req: NextRequest) {
  let spec: PdfDocSpec;
  try {
    spec = await req.json() as PdfDocSpec;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!spec?.title || !Array.isArray(spec?.blocks)) {
    return NextResponse.json({ error: "missing_title_or_blocks" }, { status: 400 });
  }

  try {
    const buf = await renderPdf(spec);
    const filename = (spec.title || "document").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").slice(0, 60) + ".pdf";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    log.error("pdf render failed", { err: (err as Error).message });
    return NextResponse.json({ error: "render_failed", message: (err as Error).message }, { status: 500 });
  }
}
