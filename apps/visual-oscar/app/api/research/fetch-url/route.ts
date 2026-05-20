import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Fetch URL: descarga el contenido de una URL y devuelve título + texto extraído.
 * En Sprint 7 baseline: extracción simple de title + body via regex. En sprints
 * futuros se puede sustituir por una librería de readability.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { url } = body ?? {};
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    const res = await fetch(url, {
      headers: {
 "User-Agent": "Mozilla/5.0 (compatible; Politeia/1.0)",
 "Accept": "text/html,application/xhtml+xml",
      },
      // 8s timeout vía AbortController
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({
        title: `Fuente web: ${parsed.hostname}`,
        content: `No se pudo leer el contenido (HTTP ${res.status}).`,
        domain: parsed.hostname,
      });
    }

    const html = await res.text();
    const title = extractTitle(html) ?? parsed.hostname;
    const content = extractText(html);

    return NextResponse.json({
      title,
      content: content.slice(0, 20000),
      domain: parsed.hostname,
    });
  } catch (err) {
    const parsed = (() => { try { return new URL(url); } catch { return null; } })();
    return NextResponse.json({
      title: parsed ? `Fuente web: ${parsed.hostname}` : "Fuente web",
      content: `[Error al recuperar la URL: ${(err as Error).message}]`,
      domain: parsed?.hostname ?? "",
    });
  }
}

function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return m ? m[1].trim() : null;
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
